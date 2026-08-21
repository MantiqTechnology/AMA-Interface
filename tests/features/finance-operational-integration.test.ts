import { describe, expect, it } from 'vitest';
import { createScenarioTestServices, createSeededTestServices } from '../helpers/demo-db';

function postDraftJournal(
  services: Awaited<ReturnType<typeof createScenarioTestServices>>['services'],
  journalId: string
) {
  services.accounting.submitJournal(journalId, 'USR-FINANCE-MAKER');
  services.accounting.approveJournal(journalId, 'USR-DIRECTOR');
  services.accounting.postJournal(journalId, 'USR-FINANCE-REVIEWER');
}

describe('Finance Phase 2 operational integration', () => {
  it('reconciles one real flight revenue, fuel, handling, and MRO sources to dimensioned posted GL', async () => {
    const { services, sqlite } = await createScenarioTestServices();
    const flightId = 'fop-closed-djj-wmx';
    services.financeHandoffs.bridgePendingSources();
    const handoffs = services.financeHandoffs
      .list({ limit: 250, offset: 0 })
      .filter((item) => item.dimensions.FLIGHT === flightId);
    expect(handoffs.map((item) => item.sourceModule)).toEqual(
      expect.arrayContaining(['FUEL', 'FLIGHT_OPERATIONS', 'MRO'])
    );

    for (const handoff of handoffs) {
      const accepted = services.financeHandoffs.accept(handoff.id, 'USR-FINANCE-REVIEWER');
      if (accepted.status === 'JOURNAL_CREATED' && accepted.journalId) {
        postDraftJournal(services, accepted.journalId);
        expect(services.financeHandoffs.retry(handoff.id, 'USR-FINANCE-REVIEWER').status).toBe(
          'POSTED'
        );
      } else {
        expect(accepted.status).toBe('POSTED');
      }
    }

    const components = sqlite
      .prepare(
        `SELECT account.account_code, event.event_type,
        event.source_type, event.source_id, line.debit_minor, line.credit_minor,
        line.flight_id, line.aircraft_id, line.station_id
      FROM journal_lines line
      JOIN journal_entries journal ON journal.id = line.journal_entry_id AND journal.status = 'POSTED'
      JOIN accounting_events event ON event.id = journal.accounting_event_id
      JOIN chart_of_accounts account ON account.id = line.account_id
      WHERE line.flight_id = ? AND account.account_code IN ('4100', '5100', '5200', '5400')
      ORDER BY account.account_code`
      )
      .all(flightId) as Array<Record<string, unknown>>;
    expect(components.map((row) => row.account_code)).toEqual(
      expect.arrayContaining(['4100', '5100', '5200', '5400'])
    );
    expect(components.every((row) => row.source_id && row.flight_id === flightId)).toBe(true);
    expect(
      components.filter((row) => row.account_code !== '4100').every((row) => row.aircraft_id)
    ).toBe(true);
    expect(
      components
        .filter((row) => ['5100', '5200'].includes(String(row.account_code)))
        .every((row) => row.station_id)
    ).toBe(true);

    const accruedLiabilities = sqlite
      .prepare(
        `SELECT event.event_type, line.credit_minor
      FROM journal_lines line
      JOIN journal_entries journal ON journal.id = line.journal_entry_id AND journal.status = 'POSTED'
      JOIN accounting_events event ON event.id = journal.accounting_event_id
      JOIN chart_of_accounts account ON account.id = line.account_id
      WHERE line.flight_id = ? AND account.account_code = '2500'
      ORDER BY event.event_type`
      )
      .all(flightId);
    expect(accruedLiabilities).toEqual([
      { event_type: 'FUEL_COST_POSTED', credit_minor: 9_250_000 },
      { event_type: 'MRO_COST_APPROVED', credit_minor: 650_000 },
      { event_type: 'STATION_HANDLING_COST_APPROVED', credit_minor: 2_750_000 }
    ]);

    const apGl = Number(
      (
        sqlite
          .prepare(
            "SELECT COALESCE(SUM(credit_minor-debit_minor), 0) amount FROM general_ledger WHERE account_code = '2000'"
          )
          .get() as { amount: number }
      ).amount
    );
    const apSubledger = Number(
      (
        sqlite
          .prepare(
            `SELECT COALESCE(SUM(MAX(invoice.total_minor-COALESCE(payment.amount, 0), 0)), 0) amount
      FROM supplier_invoices invoice LEFT JOIN (
        SELECT supplier_invoice_id, SUM(amount_minor) amount FROM supplier_payment_requests
        WHERE status = 'EXECUTED' GROUP BY supplier_invoice_id
      ) payment ON payment.supplier_invoice_id = invoice.id
      WHERE invoice.lifecycle_status = 'AP_OPEN'`
          )
          .get() as { amount: number }
      ).amount
    );
    expect(apGl).toBe(apSubledger);

    const before = Number(
      (sqlite.prepare('SELECT COUNT(*) AS count FROM journal_entries').get() as { count: number })
        .count
    );
    for (const handoff of handoffs)
      services.financeHandoffs.retry(handoff.id, 'USR-FINANCE-REVIEWER');
    const after = Number(
      (sqlite.prepare('SELECT COUNT(*) AS count FROM journal_entries').get() as { count: number })
        .count
    );
    expect(after).toBe(before);
    sqlite.close();
  });

  it('keeps PO receipt inventory recognition separate from supplier invoice GRNI settlement', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const gr = sqlite
      .prepare(
        `SELECT id, purchase_order_id, total_base_value_idr
      FROM inventory_goods_receipts WHERE status = 'POSTED' ORDER BY created_at, id LIMIT 1`
      )
      .get() as {
      id: string;
      purchase_order_id: string;
      total_base_value_idr: number;
    };
    const source = sqlite
      .prepare(
        "SELECT id FROM inventory_accounting_events WHERE source_type = 'GOODS_RECEIPT' AND source_id = ?"
      )
      .get(gr.id) as { id: string };
    const receipt = services.accounting.processInventoryEvent(source.id, 'USR-FINANCE-MAKER');
    postDraftJournal(services, receipt.journalEntryId!);
    const created = services.financeTransactions.createSupplierInvoice({
      supplierId: 'vendor-maintenance',
      invoiceNumber: 'SUP-P2-GRNI-001',
      invoiceDate: '2026-08-21T10:00:00.000Z',
      dueDate: '2026-09-21',
      currencyCode: 'IDR',
      subtotalMinor: gr.total_base_value_idr,
      taxMinor: 0,
      totalMinor: gr.total_base_value_idr,
      sourceType: 'PURCHASE_ORDER',
      purchaseOrderId: gr.purchase_order_id,
      goodsReceiptId: gr.id,
      expenseAccountId: null,
      createdBy: 'USR-FINANCE-MAKER'
    });
    services.financeTransactions.postSupplierInvoice(created.id, 'USR-FINANCE-MAKER');
    const poInvoice = { id: created.id, goods_receipt_id: gr.id };
    const invoiceAccounts = sqlite
      .prepare(
        `SELECT account.account_code
      FROM accounting_events event JOIN journal_entries journal ON journal.accounting_event_id = event.id
      JOIN journal_lines line ON line.journal_entry_id = journal.id
      JOIN chart_of_accounts account ON account.id = line.account_id
      WHERE event.event_type = 'PO_SUPPLIER_INVOICE_POSTED' AND event.source_id = ?
      ORDER BY line.line_number`
      )
      .all(poInvoice.id)
      .map((row) => (row as { account_code: string }).account_code);
    const receiptAccounts = sqlite
      .prepare(
        `SELECT account.account_code
      FROM inventory_goods_receipts receipt
      JOIN inventory_accounting_events source ON source.source_id = receipt.id
      JOIN accounting_events event ON event.source_id = source.source_id AND event.event_type = 'INVENTORY_RECEIVED'
      JOIN journal_entries journal ON journal.accounting_event_id = event.id
      JOIN journal_lines line ON line.journal_entry_id = journal.id
      JOIN chart_of_accounts account ON account.id = line.account_id
      WHERE receipt.id = ? ORDER BY line.line_number`
      )
      .all(poInvoice.goods_receipt_id)
      .map((row) => (row as { account_code: string }).account_code);
    expect(receiptAccounts).toEqual(['1200', '2400']);
    expect(invoiceAccounts).toEqual(['2400', '2000']);
    expect(
      sqlite
        .prepare(
          `SELECT idempotency_key FROM accounting_events
      GROUP BY idempotency_key HAVING COUNT(*) > 1`
        )
        .all()
    ).toEqual([]);
    sqlite.close();
  });

  it('stages approved payroll in Finance without recognizing an unreviewed accounting split', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const run = services.hris.createPayrollRun({
      periodMonth: 8,
      periodYear: 2026,
      notes: 'Phase 2 payroll bridge'
    });
    services.hris.calculatePayrollRun(run.id);
    services.hris.approvePayrollRun(run.id, 'emp-004');
    const result = services.hris.postPayrollJournal(run.id);

    expect(result).toMatchObject({
      success: true,
      handoffId: expect.any(String),
      journalId: null,
      status: 'RECEIVED',
      limitationCode: 'PAYROLL_POSTING_POLICY_NOT_CONFIGURED'
    });
    expect(services.hris.getPayrollRun(run.id).status).toBe('APPROVED');
    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM accounting_events WHERE event_type = 'PAYROLL_APPROVED' AND source_id = ?"
        )
        .get(run.id)
    ).toEqual({ count: 0 });
    const repeated = services.hris.postPayrollJournal(run.id);
    expect(repeated).toMatchObject({
      handoffId: result.handoffId,
      journalId: null,
      status: 'RECEIVED'
    });
    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM finance_handoffs WHERE source_module='HRIS' AND source_event_id = ?"
        )
        .get(run.id)
    ).toEqual({ count: 1 });
    sqlite.close();
  });
});
