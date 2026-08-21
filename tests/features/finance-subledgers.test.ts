import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

const maker = 'USR-ADMIN';
const approver = 'USR-FINANCE-REVIEWER';

function accountBalance(
  sqlite: Awaited<ReturnType<typeof createSeededTestServices>>['sqlite'],
  accountCode: string,
  sourceIds: string[]
) {
  const placeholders = sourceIds.map(() => '?').join(', ');
  const row = sqlite
    .prepare(
      `SELECT COALESCE(SUM(line.debit_minor - line.credit_minor), 0) AS balance
       FROM general_ledger line
       WHERE line.account_code = ? AND line.source_id IN (${placeholders})`
    )
    .get(accountCode, ...sourceIds) as { balance: number };
  return row.balance;
}

describe('Finance AR and AP subledgers', () => {
  it('keeps an unallocated receipt out of AR settlement and the GL', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = services.invoices.get('inv-closed-djj-wmx');
    const receipt = services.financeTransactions.createReceipt({
      customerId: before.customer.id,
      receiptDate: '2026-07-20T08:00:00.000Z',
      currencyCode: 'IDR',
      amountMinor: 50_000,
      paymentMethod: 'BANK_TRANSFER',
      cashBankAccountId: 'cash-bank-main',
      reference: 'AR-UNALLOCATED-001',
      createdBy: maker
    });
    expect(receipt).toMatchObject({
      status: 'UNALLOCATED',
      allocatedAmount: 0,
      unallocatedAmount: 50_000
    });
    expect(services.invoices.get(before.id).outstandingAmount).toBe(before.outstandingAmount);
    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM accounting_events WHERE source_type = 'AR_ALLOCATION' AND json_extract(payload_json, '$.receiptId') = ?"
        )
        .get(receipt.id)
    ).toEqual({ count: 0 });
    sqlite.close();
  });

  it('does not reduce outstanding when receipt accounting hits a locked period', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = services.invoices.get('inv-closed-djj-wmx');
    sqlite
      .prepare("UPDATE accounting_periods SET status = 'LOCKED' WHERE period_code = '2026-07'")
      .run();
    const receipt = services.financeTransactions.createReceipt({
      customerId: before.customer.id,
      receiptDate: '2026-07-20T08:00:00.000Z',
      currencyCode: 'IDR',
      amountMinor: 75_000,
      paymentMethod: 'BANK_TRANSFER',
      cashBankAccountId: 'cash-bank-main',
      reference: 'AR-LOCKED-001',
      createdBy: maker
    });
    const allocation = services.financeTransactions.allocateReceipt(
      receipt.id,
      before.id,
      75_000,
      maker
    );
    expect(allocation).toMatchObject({ status: 'EXCEPTION', exceptionCode: 'CLOSED_PERIOD' });
    expect(services.invoices.get(before.id).outstandingAmount).toBe(before.outstandingAmount);
    expect(services.financeTransactions.getReceipt(receipt.id).status).toBe('EXCEPTION');
    sqlite.close();
  });

  it('reopens AR atomically when a posted receipt allocation journal is reversed', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const invoice = services.invoices.get('inv-closed-djj-wmx');
    const receipt = services.financeTransactions.createReceipt({
      customerId: invoice.customer.id,
      receiptDate: '2026-07-17T08:00:00.000Z',
      currencyCode: 'IDR',
      amountMinor: 100_000,
      paymentMethod: 'BANK_TRANSFER',
      cashBankAccountId: 'cash-bank-main',
      reference: 'AR-REVERSAL-001',
      createdBy: maker
    });
    const allocation = services.financeTransactions.allocateReceipt(
      receipt.id,
      invoice.id,
      100_000,
      maker
    );
    expect(services.invoices.get(invoice.id).outstandingAmount).toBe(
      invoice.outstandingAmount - 100_000
    );
    const reversal = services.accounting.reverseJournal(
      allocation.journalEntryId!,
      {
        reason: 'Customer transfer returned',
        postingDate: '2026-07-17'
      },
      approver
    );
    expect(services.invoices.get(invoice.id).outstandingAmount).toBe(invoice.outstandingAmount);
    expect(services.financeTransactions.getReceipt(receipt.id).status).toBe('UNALLOCATED');
    expect(
      sqlite.prepare('SELECT status FROM ar_allocations WHERE id = ?').get(allocation.id)
    ).toEqual({ status: 'REVERSED' });
    expect(
      Number(
        (
          sqlite
            .prepare(
              `SELECT COALESCE(SUM(line.debit_minor-line.credit_minor),0) amount
      FROM journal_lines line JOIN chart_of_accounts account ON account.id=line.account_id
      WHERE account.account_code='1100' AND line.journal_entry_id IN (?, ?)`
            )
            .get(allocation.journalEntryId, reversal.id) as { amount: number }
        ).amount
      )
    ).toBe(0);
    sqlite.close();
  });

  it('voids AR recognition atomically and blocks it while posted allocations remain', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite.prepare("DELETE FROM payments WHERE invoice_id = 'inv-closed-djj-wmx'").run();
    sqlite.prepare("DELETE FROM invoices WHERE id = 'inv-closed-djj-wmx'").run();
    sqlite
      .prepare("UPDATE rate_cards SET tax_code_id = NULL WHERE id = 'rate-charter-djj-wmx'")
      .run();
    const invoice = services.invoices.finalizeClosedFlight('fop-closed-djj-wmx', maker);
    const issued = services.invoices.approve(invoice.id, approver);
    const journal = sqlite
      .prepare(
        `SELECT journal.id, journal.posting_date
      FROM journal_entries journal JOIN accounting_events event ON event.id=journal.accounting_event_id
      WHERE event.source_type='INVOICE' AND event.source_id=? AND journal.status='POSTED'`
      )
      .get(invoice.id) as { id: string; posting_date: string };
    const receipt = services.financeTransactions.createReceipt({
      customerId: issued.customer.id,
      receiptDate: journal.posting_date,
      currencyCode: 'IDR',
      amountMinor: 100,
      paymentMethod: 'BANK_TRANSFER',
      cashBankAccountId: 'cash-bank-main',
      reference: 'AR-RECOGNITION-REVERSAL',
      createdBy: maker
    });
    const allocation = services.financeTransactions.allocateReceipt(
      receipt.id,
      invoice.id,
      100,
      maker
    );

    expect(() =>
      services.accounting.reverseJournal(
        journal.id,
        {
          reason: 'Cancel customer invoice',
          postingDate: journal.posting_date
        },
        approver
      )
    ).toThrowError(expect.objectContaining({ code: 'INVOICE_REVERSAL_BLOCKED' }));
    services.accounting.reverseJournal(
      allocation.journalEntryId!,
      {
        reason: 'Reverse receipt before invoice cancellation',
        postingDate: journal.posting_date
      },
      approver
    );
    services.accounting.reverseJournal(
      journal.id,
      {
        reason: 'Cancel customer invoice',
        postingDate: journal.posting_date
      },
      approver
    );

    expect(services.invoices.get(invoice.id)).toMatchObject({
      status: 'void',
      settlementStatus: 'NOT_APPLICABLE',
      outstandingAmount: 0,
      balanceDue: 0
    });
    expect(accountBalance(sqlite, '1100', [invoice.id, journal.id])).toBe(0);
    sqlite.close();
  });

  it('keeps the legacy invoice payment adapter exception visible after accounting fails', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = services.invoices.get('inv-closed-djj-wmx');
    const exceptionCountBefore = sqlite
      .prepare("SELECT COUNT(*) AS count FROM ar_allocations WHERE status = 'EXCEPTION'")
      .get() as { count: number };
    sqlite
      .prepare("UPDATE accounting_periods SET status = 'LOCKED' WHERE period_code = '2026-07'")
      .run();

    expect(() =>
      services.invoices.recordPayment(before.id, {
        amount: 75_000,
        currency: before.currency,
        paidAt: '2026-07-20T08:00:00.000Z',
        method: 'bank_transfer',
        reference: 'LEGACY-AR-LOCKED-001'
      })
    ).toThrowError(expect.objectContaining({ code: 'RECEIPT_ACCOUNTING_FAILED' }));

    const exceptionCountAfter = sqlite
      .prepare("SELECT COUNT(*) AS count FROM ar_allocations WHERE status = 'EXCEPTION'")
      .get() as { count: number };
    expect(exceptionCountAfter.count).toBe(exceptionCountBefore.count + 1);
    expect(services.invoices.get(before.id).outstandingAmount).toBe(before.outstandingAmount);
    expect(
      sqlite
        .prepare("SELECT status FROM customer_receipts WHERE reference = 'LEGACY-AR-LOCKED-001'")
        .get()
    ).toEqual({ status: 'EXCEPTION' });
    sqlite.close();
  });

  it('settles a charter invoice through two accounted receipt allocations', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite.prepare("DELETE FROM payments WHERE invoice_id = 'inv-closed-djj-wmx'").run();
    sqlite.prepare("DELETE FROM invoices WHERE id = 'inv-closed-djj-wmx'").run();
    const invoice = services.invoices.finalizeClosedFlight('fop-closed-djj-wmx', maker);
    const issued = services.invoices.approve(invoice.id, approver);
    expect(issued.settlementStatus).toBe('OPEN');

    const first = services.financeTransactions.createReceipt({
      customerId: issued.customer.id,
      receiptDate: '2026-07-20T09:00:00.000Z',
      currencyCode: issued.currency,
      amountMinor: 600_000,
      paymentMethod: 'BANK_TRANSFER',
      cashBankAccountId: 'cash-bank-main',
      reference: 'AR-PARTIAL-001',
      createdBy: maker
    });
    const firstAllocation = services.financeTransactions.allocateReceipt(
      first.id,
      issued.id,
      600_000,
      maker
    );
    expect(services.invoices.get(issued.id)).toMatchObject({
      outstandingAmount: issued.total - 600_000,
      settlementStatus: 'PARTIALLY_SETTLED'
    });

    const finalAmount = issued.total - 600_000;
    const second = services.financeTransactions.createReceipt({
      customerId: issued.customer.id,
      receiptDate: '2026-07-21T09:00:00.000Z',
      currencyCode: issued.currency,
      amountMinor: finalAmount,
      paymentMethod: 'BANK_TRANSFER',
      cashBankAccountId: 'cash-bank-main',
      reference: 'AR-FINAL-001',
      createdBy: maker
    });
    const finalAllocation = services.financeTransactions.allocateReceipt(
      second.id,
      issued.id,
      finalAmount,
      maker
    );
    const settled = services.invoices.get(issued.id);

    expect(settled).toMatchObject({ outstandingAmount: 0, settlementStatus: 'SETTLED' });
    expect(
      accountBalance(sqlite, '1100', [issued.id, firstAllocation.id, finalAllocation.id])
    ).toBe(0);
    expect(() =>
      services.financeTransactions.allocateReceipt(second.id, issued.id, 1, maker)
    ).toThrowError(expect.objectContaining({ code: 'RECEIPT_AMOUNT_EXCEEDED' }));

    sqlite.close();
  });

  it('keeps prepaid ticket billing from recognizing AR or revenue twice', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite
      .prepare(
        `UPDATE flight_operations SET current_status_id = 'flight-operation-status-closed', is_locked = 1
         WHERE id = 'fop-ticketing-passenger'`
      )
      .run();
    const invoice = services.invoices.finalizeClosedFlight('fop-ticketing-passenger', maker);
    services.invoices.approve(invoice.id, approver);

    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM accounting_events WHERE source_type = 'INVOICE' AND source_id = ?"
        )
        .get(invoice.id)
    ).toEqual({ count: 0 });
    expect(services.invoices.get(invoice.id).recognitionMode).toBe('BILLING_ONLY');
    sqlite.close();
  });

  it('clears GRNI for a matched PO invoice and settles AP after controlled payment', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const gr = sqlite
      .prepare(
        `SELECT id, purchase_order_id, total_base_value_idr
         FROM inventory_goods_receipts receipt
         WHERE status = 'POSTED'
         ORDER BY created_at, id LIMIT 1`
      )
      .get() as { id: string; purchase_order_id: string; total_base_value_idr: number };
    const inventoryEvent = sqlite
      .prepare(
        "SELECT id FROM inventory_accounting_events WHERE source_type = 'GOODS_RECEIPT' AND source_id = ?"
      )
      .get(gr.id) as { id: string };
    const receiptPosting = services.accounting.processInventoryEvent(inventoryEvent.id, maker);
    services.accounting.submitJournal(receiptPosting.journalEntryId!, maker);
    services.accounting.approveJournal(receiptPosting.journalEntryId!, approver);
    services.accounting.postJournal(receiptPosting.journalEntryId!, maker);
    const supplierInvoice = services.financeTransactions.createSupplierInvoice({
      supplierId: 'vendor-maintenance',
      invoiceNumber: 'SUP-P1-001',
      invoiceDate: '2026-07-17T10:00:00.000Z',
      dueDate: '2026-08-01',
      currencyCode: 'IDR',
      subtotalMinor: gr.total_base_value_idr,
      taxMinor: 0,
      totalMinor: gr.total_base_value_idr,
      sourceType: 'PURCHASE_ORDER',
      purchaseOrderId: gr.purchase_order_id,
      goodsReceiptId: gr.id,
      expenseAccountId: null,
      createdBy: maker
    });
    expect(supplierInvoice.matchStatus).toBe('MATCHED');
    const posted = services.financeTransactions.postSupplierInvoice(supplierInvoice.id, maker);
    expect(posted).toMatchObject({
      settlementStatus: 'OPEN',
      outstandingAmount: gr.total_base_value_idr
    });

    const request = services.financeTransactions.createPaymentRequest({
      supplierInvoiceId: supplierInvoice.id,
      amountMinor: gr.total_base_value_idr,
      currencyCode: 'IDR',
      cashBankAccountId: 'cash-bank-main',
      createdBy: maker
    });
    expect(() =>
      services.financeTransactions.createPaymentRequest({
        supplierInvoiceId: supplierInvoice.id,
        amountMinor: 1,
        currencyCode: 'IDR',
        cashBankAccountId: 'cash-bank-main',
        createdBy: maker
      })
    ).toThrowError(expect.objectContaining({ code: 'PAYMENT_REQUEST_INVALID' }));
    services.financeTransactions.submitPaymentRequest(request.id, maker);
    expect(() =>
      services.financeTransactions.approvePaymentRequest(request.id, maker, 'Demo Admin', 1_000_000)
    ).toThrowError(expect.objectContaining({ code: 'SELF_APPROVAL_FORBIDDEN' }));
    services.financeTransactions.approvePaymentRequest(
      request.id,
      approver,
      'Finance Reviewer',
      1_000_000
    );
    const paid = services.financeTransactions.executePaymentRequest(request.id, maker);

    expect(paid.settlementStatus).toBe('SETTLED');
    expect(paid.outstandingAmount).toBe(0);
    expect(accountBalance(sqlite, '2000', [supplierInvoice.id, request.id])).toBe(0);
    expect(accountBalance(sqlite, '2400', [gr.id, supplierInvoice.id])).toBe(0);
    const executedRequest = services.financeTransactions.getPaymentRequest(request.id);
    const paymentPostingDate = String(
      (
        sqlite
          .prepare('SELECT posting_date FROM journal_entries WHERE id = ?')
          .get(executedRequest.journalId!) as { posting_date: string }
      ).posting_date
    );
    const reversal = services.accounting.reverseJournal(
      executedRequest.journalId!,
      {
        reason: 'Bank rejected supplier transfer',
        postingDate: paymentPostingDate
      },
      approver
    );
    const reopened = services.financeTransactions.getSupplierInvoice(supplierInvoice.id);
    expect(reopened).toMatchObject({
      paidAmount: 0,
      outstandingAmount: gr.total_base_value_idr,
      settlementStatus: 'OPEN'
    });
    expect(
      sqlite
        .prepare('SELECT reversal_journal_id FROM supplier_payment_requests WHERE id = ?')
        .get(request.id)
    ).toEqual({ reversal_journal_id: reversal.id });
    expect(
      Number(
        (
          sqlite
            .prepare(
              `SELECT COALESCE(SUM(line.credit_minor-line.debit_minor),0) amount
      FROM journal_lines line JOIN chart_of_accounts account ON account.id=line.account_id
      WHERE account.account_code='2000' AND line.journal_entry_id IN (?, ?, ?)`
            )
            .get(posted.journalId, executedRequest.journalId, reversal.id) as { amount: number }
        ).amount
      )
    ).toBe(gr.total_base_value_idr);

    services.accounting.reverseJournal(
      posted.journalId!,
      {
        reason: 'Cancel supplier invoice after payment reversal',
        postingDate: paymentPostingDate
      },
      approver
    );
    expect(services.financeTransactions.getSupplierInvoice(supplierInvoice.id)).toMatchObject({
      lifecycleStatus: 'VOID',
      paidAmount: 0,
      outstandingAmount: 0,
      settlementStatus: 'NOT_APPLICABLE'
    });
    expect(
      accountBalance(sqlite, '2000', [
        supplierInvoice.id,
        request.id,
        executedRequest.journalId!,
        posted.journalId!
      ])
    ).toBe(0);
    sqlite.close();
  });
});
