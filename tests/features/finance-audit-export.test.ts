import { describe, expect, it } from 'vitest';
import { createFinanceGovernanceService } from '../../server/features/finance/governance';
import { createAccountingService } from '../../server/features/finance/accounting';
import { createFinanceTransactionsService } from '../../server/features/finance/transactions';
import { createScenarioTestServices } from '../helpers/demo-db';

async function preparedScenario() {
  const context = await createScenarioTestServices();
  context.services.financeHandoffs.bridgePendingSources();
  const handoff = context.services.financeHandoffs
    .list({ sourceModule: 'MRO', limit: 250, offset: 0 })
    .find((item) => item.dimensions.FLIGHT === 'fop-closed-djj-wmx')!;
  const accepted = context.services.financeHandoffs.accept(handoff.id, 'USR-FINANCE-REVIEWER');
  return { ...context, handoff: accepted };
}

describe('Finance Phase 2 audit, export, and traceability', () => {
  it('records canonical audit events for Finance handoff and journal posting', async () => {
    const { sqlite, handoff } = await preparedScenario();
    const audit = sqlite
      .prepare(
        `SELECT action, entity_type, entity_id, actor_id
      FROM financial_audit_logs WHERE entity_id IN (?, ?) ORDER BY occurred_at, rowid`
      )
      .all(handoff.id, handoff.journalId) as Array<Record<string, unknown>>;
    expect(audit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'FINANCE_HANDOFF_POSTED',
          entity_type: 'FINANCE_HANDOFF',
          entity_id: handoff.id
        }),
        expect.objectContaining({
          action: 'JOURNAL_POSTED',
          entity_type: 'JOURNAL_ENTRY',
          entity_id: handoff.journalId
        })
      ])
    );
    expect(audit.every((item) => item.actor_id)).toBe(true);
    sqlite.close();
  });

  it('authorizes, timestamps, and audits controlled financial CSV exports', async () => {
    const { services, sqlite } = await preparedScenario();
    const governance = createFinanceGovernanceService(
      sqlite,
      services.financeReporting,
      () => '2026-08-21T12:00:00.000Z'
    );
    expect(() =>
      governance.exportReport(
        'PROFIT_LOSS',
        { period: '2026-07' },
        {
          actorId: 'USR-STAFF',
          actorRole: 'HR Staff'
        }
      )
    ).toThrow(/authorized/iu);

    const exported = governance.exportReport(
      'PROFIT_LOSS',
      { period: '2026-07' },
      {
        actorId: 'USR-FINANCE-REVIEWER',
        actorRole: 'Finance Reviewer'
      }
    );
    expect(exported).toMatchObject({
      format: 'CSV',
      filename: expect.stringContaining('profit-loss-2026-07'),
      rowCount: expect.any(Number)
    });
    expect(exported.content).toContain('Account Code,Account Name,Account Type,Amount IDR');
    expect(
      sqlite
        .prepare('SELECT report_type, requested_by, row_count FROM financial_exports WHERE id = ?')
        .get(exported.id)
    ).toEqual({
      report_type: 'PROFIT_LOSS',
      requested_by: 'USR-FINANCE-REVIEWER',
      row_count: exported.rowCount
    });
    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM financial_audit_logs WHERE action = 'FINANCIAL_EXPORT_CREATED' AND entity_id = ?"
        )
        .get(exported.id)
    ).toEqual({ count: 1 });

    const journalExport = governance.exportReport(
      'JOURNAL',
      { period: '2026-07' },
      {
        actorId: 'USR-FINANCE-REVIEWER',
        actorRole: 'Finance Reviewer'
      }
    );
    const expectedJournalRows = Number(
      (
        sqlite
          .prepare(
            `SELECT COUNT(*) AS count
      FROM journal_entries journal JOIN accounting_periods period ON period.id=journal.period_id
      WHERE period.period_code='2026-07'`
          )
          .get() as { count: number }
      ).count
    );
    expect(journalExport.rowCount).toBe(expectedJournalRows);
    sqlite.close();
  });

  it('provides matching forward and reverse source-accounting-report lineage', async () => {
    const { services, sqlite, handoff } = await preparedScenario();
    const governance = createFinanceGovernanceService(
      sqlite,
      services.financeReporting,
      () => '2026-08-21T12:00:00.000Z'
    );
    const forward = governance.traceSource('MAINTENANCE_COST', handoff.sourceId);
    const reverse = governance.traceJournal(handoff.journalId!);
    expect(forward).toMatchObject({
      source: { type: 'MAINTENANCE_COST', id: handoff.sourceId },
      handoff: { id: handoff.id },
      accountingEvent: { id: handoff.accountingEventId },
      journal: { id: handoff.journalId, status: 'POSTED' }
    });
    expect(forward.journalLines.length).toBe(2);
    expect(forward.reportLinks).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/finance/statements'),
        expect.stringContaining('/finance/hpp')
      ])
    );
    expect(reverse.source).toEqual(forward.source);
    expect(reverse.handoff?.id).toBe(forward.handoff?.id);
    expect(reverse.accountingEvent?.id).toBe(forward.accountingEvent?.id);
    const journalNumber = (
      sqlite
        .prepare('SELECT journal_number FROM journal_entries WHERE id = ?')
        .get(handoff.journalId) as { journal_number: string }
    ).journal_number;
    expect(governance.traceJournal(journalNumber)).toEqual(reverse);
    sqlite.close();
  });

  it('lists recent controlled export metadata without returning CSV content', async () => {
    const { services, sqlite } = await preparedScenario();
    const governance = createFinanceGovernanceService(
      sqlite,
      services.financeReporting,
      () => '2026-08-21T12:00:00.000Z'
    );
    const exported = governance.exportReport(
      'GENERAL_LEDGER',
      { period: '2026-07' },
      {
        actorId: 'USR-FINANCE-REVIEWER',
        actorRole: 'Finance Reviewer'
      }
    );

    expect(governance.listExports(1)).toEqual([
      expect.objectContaining({
        id: exported.id,
        reportType: 'GENERAL_LEDGER',
        requestedBy: 'USR-FINANCE-REVIEWER',
        filename: exported.filename,
        rowCount: exported.rowCount
      })
    ]);
    expect(governance.listExports(1)[0]).not.toHaveProperty('content');
    sqlite.close();
  });

  it('seeds a playable reconciled statement and audited controlled export', async () => {
    const { sqlite } = await createScenarioTestServices();
    expect(
      sqlite.prepare("SELECT COUNT(*) count FROM bank_statements WHERE status='RECONCILED'").get()
    ).toEqual({ count: 1 });
    expect(
      sqlite
        .prepare("SELECT COUNT(*) count FROM bank_reconciliation_matches WHERE status='RECONCILED'")
        .get()
    ).toEqual({ count: 1 });
    expect(
      sqlite
        .prepare("SELECT COUNT(*) count FROM financial_exports WHERE report_type='GENERAL_LEDGER'")
        .get()
    ).toEqual({ count: 1 });
    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) count FROM financial_audit_logs WHERE action='FINANCIAL_EXPORT_CREATED'"
        )
        .get()
    ).toEqual({ count: 1 });
    sqlite.close();
  });

  it('cuts AR and AP settlement amounts off at the exported period end', async () => {
    const { services, sqlite } = await preparedScenario();
    const governance = createFinanceGovernanceService(
      sqlite,
      services.financeReporting,
      () => '2026-08-21T12:00:00.000Z'
    );
    const futureAccounting = createAccountingService(sqlite, () => '2026-08-21T12:00:00.000Z');
    const futureTransactions = createFinanceTransactionsService(
      sqlite,
      futureAccounting,
      services.approvalAuthority,
      () => '2026-08-21T12:00:00.000Z'
    );
    const ar = services.invoices.get('inv-closed-djj-wmx');
    const receipt = futureTransactions.createReceipt({
      customerId: ar.customer.id,
      receiptDate: '2026-08-15T10:00:00.000Z',
      currencyCode: 'IDR',
      amountMinor: 100,
      paymentMethod: 'BANK_TRANSFER',
      cashBankAccountId: 'cash-bank-main',
      reference: 'AR-HISTORICAL-CUTOFF',
      createdBy: 'USR-FINANCE-MAKER'
    });
    const futureAllocation = futureTransactions.allocateReceipt(
      receipt.id,
      ar.id,
      100,
      'USR-FINANCE-MAKER'
    );
    const arAllocatedAtJuly = Number(
      (
        sqlite
          .prepare(
            `SELECT COALESCE(SUM(allocation.amount_minor),0) amount
      FROM ar_allocations allocation JOIN journal_entries journal ON journal.id=allocation.journal_id
      WHERE allocation.invoice_id=? AND allocation.status='POSTED' AND journal.status='POSTED'
        AND journal.posting_date <= '2026-07-31T23:59:59.999Z'`
          )
          .get(ar.id) as { amount: number }
      ).amount
    );

    const ap = futureTransactions.createSupplierInvoice({
      supplierId: 'vendor-maintenance',
      invoiceNumber: 'SUP-HISTORICAL-CUTOFF',
      invoiceDate: '2026-07-20T10:00:00.000Z',
      dueDate: '2026-08-20',
      currencyCode: 'IDR',
      subtotalMinor: 1_000,
      taxMinor: 0,
      totalMinor: 1_000,
      sourceType: 'NON_PO',
      purchaseOrderId: null,
      goodsReceiptId: null,
      expenseAccountId: 'coa-5400',
      createdBy: 'USR-FINANCE-MAKER'
    });
    futureTransactions.postSupplierInvoice(ap.id, 'USR-FINANCE-MAKER');
    const payment = futureTransactions.createPaymentRequest({
      supplierInvoiceId: ap.id,
      amountMinor: 1_000,
      currencyCode: 'IDR',
      cashBankAccountId: 'cash-bank-main',
      createdBy: 'USR-FINANCE-MAKER'
    });
    futureTransactions.submitPaymentRequest(payment.id, 'USR-FINANCE-MAKER');
    futureTransactions.approvePaymentRequest(
      payment.id,
      'USR-FINANCE-REVIEWER',
      'Finance Reviewer',
      1_000_000
    );
    futureTransactions.executePaymentRequest(payment.id, 'USR-FINANCE-MAKER');
    const executedPayment = futureTransactions.getPaymentRequest(payment.id);

    const arExport = governance.exportReport(
      'AR',
      { period: '2026-07' },
      {
        actorId: 'USR-FINANCE-REVIEWER',
        actorRole: 'Finance Reviewer'
      }
    );
    const apExport = governance.exportReport(
      'AP',
      { period: '2026-07' },
      {
        actorId: 'USR-FINANCE-REVIEWER',
        actorRole: 'Finance Reviewer'
      }
    );
    const arRow = arExport.content
      .split('\r\n')
      .find((line) => line.startsWith(`${ar.invoiceNumber},`))!;
    const apRow = apExport.content
      .split('\r\n')
      .find((line) => line.startsWith(`${ap.invoiceNumber},`))!;
    expect(arRow.split(',').slice(-2)).toEqual([
      String(arAllocatedAtJuly),
      String(ar.total - arAllocatedAtJuly)
    ]);
    expect(apRow.split(',').slice(-2)).toEqual(['0', String(ap.totalMinor)]);

    futureAccounting.reverseJournal(
      futureAllocation.journalEntryId!,
      {
        reason: 'Historical export reversal test',
        postingDate: '2026-08-21'
      },
      'USR-FINANCE-REVIEWER'
    );
    futureAccounting.reverseJournal(
      executedPayment.journalId!,
      {
        reason: 'Historical export reversal test',
        postingDate: '2026-08-21'
      },
      'USR-FINANCE-REVIEWER'
    );
    const arExportAfterReversal = governance.exportReport(
      'AR',
      { period: '2026-08' },
      {
        actorId: 'USR-FINANCE-REVIEWER',
        actorRole: 'Finance Reviewer'
      }
    );
    const apExportAfterReversal = governance.exportReport(
      'AP',
      { period: '2026-08' },
      {
        actorId: 'USR-FINANCE-REVIEWER',
        actorRole: 'Finance Reviewer'
      }
    );
    const arAfter = arExportAfterReversal.content
      .split('\r\n')
      .find((line) => line.startsWith(`${ar.invoiceNumber},`))!;
    const apAfter = apExportAfterReversal.content
      .split('\r\n')
      .find((line) => line.startsWith(`${ap.invoiceNumber},`))!;
    expect(arAfter.split(',').slice(-2)).toEqual([
      String(arAllocatedAtJuly),
      String(ar.total - arAllocatedAtJuly)
    ]);
    expect(apAfter.split(',').slice(-2)).toEqual(['0', String(ap.totalMinor)]);
    sqlite.close();
  });

  it('excludes unrecognized draft AR and AP source documents from controlled exports', async () => {
    const { services, sqlite } = await preparedScenario();
    const governance = createFinanceGovernanceService(
      sqlite,
      services.financeReporting,
      () => '2026-08-21T12:00:00.000Z'
    );
    const draftAr = sqlite
      .prepare('SELECT id, invoice_number FROM invoices ORDER BY created_at LIMIT 1')
      .get() as { id: string; invoice_number: string };
    expect(draftAr).toBeTruthy();
    sqlite
      .prepare("UPDATE invoices SET recognition_mode='AR_ON_ISSUE', status='draft' WHERE id=?")
      .run(draftAr.id);
    const draftAp = services.financeTransactions.createSupplierInvoice({
      supplierId: 'vendor-maintenance',
      invoiceNumber: 'SUP-DRAFT-EXPORT',
      invoiceDate: '2026-07-20',
      dueDate: '2026-08-20',
      currencyCode: 'IDR',
      subtotalMinor: 1_000,
      taxMinor: 0,
      totalMinor: 1_000,
      sourceType: 'NON_PO',
      purchaseOrderId: null,
      goodsReceiptId: null,
      expenseAccountId: 'coa-5400',
      createdBy: 'USR-FINANCE-MAKER'
    });
    const arExport = governance.exportReport(
      'AR',
      { period: '2026-07' },
      {
        actorId: 'USR-FINANCE-REVIEWER',
        actorRole: 'Finance Reviewer'
      }
    );
    const apExport = governance.exportReport(
      'AP',
      { period: '2026-07' },
      {
        actorId: 'USR-FINANCE-REVIEWER',
        actorRole: 'Finance Reviewer'
      }
    );
    expect(arExport.content).not.toContain(draftAr.invoice_number);
    expect(apExport.content).not.toContain(draftAp.invoiceNumber);
    sqlite.close();
  });
});
