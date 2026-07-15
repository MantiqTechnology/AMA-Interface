import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

const adminActor = 'USR-DEMO-ADMIN';
const financeReviewerActor = 'USR-FINANCE-REVIEWER';

function markFlightClosed(
  sqlite: Awaited<ReturnType<typeof createSeededTestServices>>['sqlite'],
  id: string
) {
  sqlite
    .prepare(
      `UPDATE flight_operations
       SET current_status_id = 'flight-operation-status-closed', is_locked = 1
       WHERE id = ?`
    )
    .run(id);
}

describe('InvoicesService', () => {
  it('keeps invoice reads free of handoff side effects', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite.prepare('DELETE FROM payments WHERE invoice_id = ?').run('inv-closed-djj-wmx');
    sqlite.prepare('DELETE FROM invoices WHERE id = ?').run('inv-closed-djj-wmx');
    sqlite
      .prepare(
        `UPDATE flight_finance_handoffs
         SET status_id = 'finance-handoff-status-ready'
         WHERE id = 'fop-closed-djj-wmx-handoff-invoice'`
      )
      .run();

    services.invoices.list({ limit: 20, offset: 0, due: 'all' });

    expect(
      sqlite
        .prepare('SELECT COUNT(*) AS count FROM invoices WHERE flight_operation_id = ?')
        .get('fop-closed-djj-wmx')
    ).toEqual({ count: 0 });
    expect(
      sqlite
        .prepare(
          `SELECT status_id FROM flight_finance_handoffs
           WHERE id = 'fop-closed-djj-wmx-handoff-invoice'`
        )
        .get()
    ).toEqual({ status_id: 'finance-handoff-status-ready' });

    sqlite.close();
  });

  it('consumes a closed-flight handoff exactly once', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite.prepare('DELETE FROM payments WHERE invoice_id = ?').run('inv-closed-djj-wmx');
    sqlite.prepare('DELETE FROM invoices WHERE id = ?').run('inv-closed-djj-wmx');
    sqlite
      .prepare(
        `UPDATE flight_finance_handoffs
         SET status_id = 'finance-handoff-status-ready'
         WHERE id = 'fop-closed-djj-wmx-handoff-invoice'`
      )
      .run();

    const [invoice] = services.invoices.processReadyHandoffs();
    expect(services.invoices.processReadyHandoffs()).toEqual([]);

    expect(invoice.lineItems).toHaveLength(1);
    expect(invoice.lineItems[0]).toMatchObject({
      sourceType: 'CHARTER',
      taxCodeId: 'tax-ppn-demo',
      taxRateBasisPoints: 1100,
      taxAmount: 3_080_000,
      total: 31_080_000
    });
    expect(invoice.finance).toMatchObject({
      charterRevenue: 28_000_000,
      fuelCost: 9_250_000,
      stationCost: 2_750_000,
      maintenanceCost: 0,
      totalOperationalCost: 12_000_000,
      taxAmount: 3_080_000,
      grossMargin: 16_000_000
    });

    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM invoices
           WHERE flight_operation_id = 'fop-closed-djj-wmx'`
        )
        .get()
    ).toEqual({ count: 1 });
    expect(
      sqlite
        .prepare(
          `SELECT status_id FROM flight_finance_handoffs
           WHERE id = 'fop-closed-djj-wmx-handoff-invoice'`
        )
        .get()
    ).toEqual({ status_id: 'finance-handoff-status-posted' });

    sqlite.close();
  });

  it('creates passenger revenue only from active paid tickets', async () => {
    const { services, sqlite } = await createSeededTestServices();
    markFlightClosed(sqlite, 'fop-ticketing-passenger');

    const invoice = services.invoices.finalizeClosedFlight('fop-ticketing-passenger', adminActor);

    expect(invoice.status).toBe('draft');
    expect(invoice.lineItems.map((line) => line.sourceId)).toEqual(
      expect.arrayContaining(['TKT-DEMO12', 'TKT-RESCHEDULE'])
    );
    expect(invoice.lineItems.map((line) => line.sourceId)).not.toContain('TKT-DEMO34');
    expect(invoice.lineItems.every((line) => line.sourceType === 'PASSENGER_TICKET')).toBe(true);
    expect(invoice.finance).toMatchObject({
      ticketRevenue: 3_600_000,
      cargoRevenue: 0,
      charterRevenue: 0,
      taxAmount: 0,
      invoiceTotal: 3_600_000
    });
    expect(invoice.lineItems[0]).toMatchObject({
      taxCode: 'NON_TAX',
      taxRateBasisPoints: 0,
      taxAmount: 0
    });

    sqlite.close();
  });

  it('creates cargo revenue from paid bookings with persisted tax snapshot', async () => {
    const { services, sqlite } = await createSeededTestServices();
    markFlightClosed(sqlite, 'fop-ticketing-cargo');
    sqlite
      .prepare(
        `UPDATE flight_maintenance_handoffs
         SET status_id = 'maintenance-handoff-status-posted'
         WHERE id = 'fop-ticketing-cargo-maintenance-approved'`
      )
      .run();

    const invoice = services.invoices.finalizeClosedFlight('fop-ticketing-cargo', adminActor);

    expect(invoice.lineItems).toHaveLength(1);
    expect(invoice.lineItems[0]).toMatchObject({
      sourceType: 'CARGO_BOOKING',
      sourceId: 'AWB-100200',
      quantity: 45,
      unitPrice: 32_000,
      subtotal: 1_440_000,
      taxCode: 'PPN_DEMO',
      taxRateBasisPoints: 1100,
      taxAmount: 158_400,
      total: 1_598_400
    });
    expect(invoice.finance).toMatchObject({
      cargoRevenue: 1_440_000,
      maintenanceCost: 1_750_000,
      totalOperationalCost: 1_750_000,
      taxAmount: 158_400,
      invoiceTotal: 1_598_400,
      grossMargin: -310_000
    });

    sqlite
      .prepare('UPDATE cargo_bookings SET total_tariff = 1, total_amount = 1 WHERE id = ?')
      .run('AWB-100200');
    expect(services.invoices.get(invoice.id).finance.invoiceTotal).toBe(1_598_400);

    sqlite.close();
  });

  it('rejects an inconsistent persisted booking tax snapshot', async () => {
    const { services, sqlite } = await createSeededTestServices();
    markFlightClosed(sqlite, 'fop-ticketing-cargo');
    sqlite
      .prepare('UPDATE cargo_bookings SET tax_amount = 123, total_amount = 1440123 WHERE id = ?')
      .run('AWB-100200');

    expect(() =>
      services.invoices.finalizeClosedFlight('fop-ticketing-cargo', adminActor)
    ).toThrowError(expect.objectContaining({ code: 'FINANCE_PRICING_SNAPSHOT_INVALID' }));
    expect(
      sqlite
        .prepare('SELECT COUNT(*) AS count FROM invoices WHERE flight_operation_id = ?')
        .get('fop-ticketing-cargo')
    ).toEqual({ count: 0 });

    sqlite.close();
  });

  it('excludes an approved refund before finalization', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO ticketing_refund_requests (
           id, flight_operation_id, subject_type, passenger_ticket_id, reason, status,
           amount, currency_code, requested_by_user_id, requested_at, decided_by_user_id,
           decided_at, decision_note, created_at, updated_at
         ) VALUES (?, ?, 'PASSENGER', ?, ?, 'APPROVED', ?, 'IDR', ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'refund-before-invoice',
        'fop-ticketing-passenger',
        'TKT-DEMO12',
        'Customer cancellation',
        1_800_000,
        adminActor,
        now,
        financeReviewerActor,
        now,
        'Approved before closure',
        now,
        now
      );
    markFlightClosed(sqlite, 'fop-ticketing-passenger');

    const invoice = services.invoices.finalizeClosedFlight('fop-ticketing-passenger', adminActor);

    expect(invoice.lineItems.map((line) => line.sourceId)).toEqual(['TKT-RESCHEDULE']);
    expect(invoice.finance.ticketRevenue).toBe(1_800_000);

    sqlite.close();
  });

  it('rejects persisted booking currency that differs from the flight', async () => {
    const { services, sqlite } = await createSeededTestServices();
    markFlightClosed(sqlite, 'fop-ticketing-passenger');
    sqlite
      .prepare("UPDATE passenger_tickets SET currency_code = 'USD' WHERE id = 'TKT-DEMO12'")
      .run();

    expect(() =>
      services.invoices.finalizeClosedFlight('fop-ticketing-passenger', adminActor)
    ).toThrowError(expect.objectContaining({ code: 'FINANCE_CURRENCY_MISMATCH' }));
    expect(
      sqlite
        .prepare('SELECT COUNT(*) AS count FROM invoices WHERE flight_operation_id = ?')
        .get('fop-ticketing-passenger')
    ).toEqual({ count: 0 });

    sqlite.close();
  });

  it('approves a draft with separation of duties and customer payment terms', async () => {
    const { services, sqlite } = await createSeededTestServices();
    markFlightClosed(sqlite, 'fop-ticketing-cargo');
    const draft = services.invoices.finalizeClosedFlight('fop-ticketing-cargo', adminActor);

    expect(() => services.invoices.approve(draft.id, adminActor)).toThrowError(
      expect.objectContaining({ code: 'INVOICE_SELF_APPROVAL_FORBIDDEN' })
    );
    const issued = services.invoices.approve(draft.id, financeReviewerActor);

    expect(issued.status).toBe('issued');
    expect(issued.approvedByUserId).toBe(financeReviewerActor);
    expect(issued.issuedAt).not.toBeNull();
    expect(issued.dueAt).not.toBeNull();
    expect(
      Math.round((Date.parse(issued.dueAt!) - Date.parse(issued.issuedAt!)) / 86_400_000)
    ).toBe(7);

    sqlite.close();
  });

  it('marks an invoice paid once payments cover the total', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = services.invoices.get('inv-closed-djj-wmx');

    services.invoices.recordPayment('inv-closed-djj-wmx', {
      amount: before.balanceDue,
      currency: before.currency,
      paidAt: '2026-07-04T13:00:00.000+07:00',
      method: 'bank_transfer',
      reference: 'TEST-PAID-001'
    });

    const after = services.invoices.get('inv-closed-djj-wmx');
    expect(after.status).toBe('paid');
    expect(after.balanceDue).toBe(0);

    sqlite.close();
  });

  it('requires an issued invoice, matching currency, and an amount within balance', async () => {
    const { services, sqlite } = await createSeededTestServices();
    markFlightClosed(sqlite, 'fop-ticketing-cargo');
    const draft = services.invoices.finalizeClosedFlight('fop-ticketing-cargo', adminActor);
    const payment = {
      amount: 100_000,
      currency: 'IDR',
      paidAt: '2026-07-16T13:00:00.000+09:00',
      method: 'bank_transfer' as const,
      reference: 'TEST-PAYMENT-GUARD'
    };

    expect(() => services.invoices.recordPayment(draft.id, payment)).toThrowError(
      expect.objectContaining({ code: 'INVOICE_NOT_PAYABLE' })
    );
    services.invoices.approve(draft.id, financeReviewerActor);
    expect(() =>
      services.invoices.recordPayment(draft.id, { ...payment, currency: 'USD' })
    ).toThrowError(expect.objectContaining({ code: 'FINANCE_CURRENCY_MISMATCH' }));
    expect(() =>
      services.invoices.recordPayment(draft.id, { ...payment, amount: draft.total + 1 })
    ).toThrowError(expect.objectContaining({ code: 'INVOICE_PAYMENT_EXCEEDS_BALANCE' }));
    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM payments WHERE invoice_id = ?').get(draft.id)
    ).toEqual({ count: 0 });

    sqlite.close();
  });
});
