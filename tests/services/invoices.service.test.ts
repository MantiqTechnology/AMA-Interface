import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

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

    services.invoices.listInvoices({ limit: 20, offset: 0 });

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

    services.invoices.processReadyHandoffs();
    services.invoices.processReadyHandoffs();

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

  it('marks an invoice paid once payments cover the total', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = services.invoices.getInvoiceDetail('inv-closed-djj-wmx');

    services.invoices.recordPayment('inv-closed-djj-wmx', {
      amount: before.total,
      currency: before.currency,
      paidAt: '2026-07-04T13:00:00.000+07:00',
      method: 'bank_transfer',
      reference: 'TEST-PAID-001'
    });

    const after = services.invoices.getInvoiceDetail('inv-closed-djj-wmx');
    expect(after.status).toBe('paid');
    expect(after.balanceDue).toBe(0);

    sqlite.close();
  });
});
