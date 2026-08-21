import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

describe('Cash/bank GL projection and reconciliation', () => {
  it('matches an external statement line without mutating the posted journal', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite.prepare("DELETE FROM payments WHERE invoice_id = 'inv-closed-djj-wmx'").run();
    sqlite.prepare("DELETE FROM ar_allocations WHERE invoice_id = 'inv-closed-djj-wmx'").run();
    sqlite
      .prepare("DELETE FROM customer_receipts WHERE customer_id = 'cust-papua-logistics'")
      .run();

    const receipt = services.financeTransactions.createReceipt({
      customerId: 'cust-papua-logistics',
      receiptDate: '2026-07-22T09:00:00.000Z',
      currencyCode: 'IDR',
      amountMinor: 1_250_000,
      paymentMethod: 'BANK_TRANSFER',
      cashBankAccountId: 'cash-bank-main',
      reference: 'BANK-STMT-MATCH-001',
      createdBy: 'USR-ADMIN'
    });
    const allocation = services.financeTransactions.allocateReceipt(
      receipt.id,
      'inv-closed-djj-wmx',
      1_250_000,
      'USR-ADMIN'
    );
    const before = sqlite
      .prepare('SELECT status, posting_date, updated_at FROM journal_entries WHERE id = ?')
      .get(allocation.journalEntryId);
    const linesBefore = sqlite
      .prepare(
        'SELECT account_id, debit_minor, credit_minor FROM journal_lines WHERE journal_entry_id = ? ORDER BY line_number'
      )
      .all(allocation.journalEntryId);

    const statement = services.bankReconciliation.createStatement({
      cashBankAccountId: 'cash-bank-main',
      statementNumber: 'STMT-P1-001',
      periodStart: '2026-07-22',
      periodEnd: '2026-07-22',
      openingBalanceMinor: 0,
      closingBalanceMinor: 1_250_000,
      importedBy: 'USR-ADMIN',
      lines: [
        {
          bookingDate: '2026-07-22',
          valueDate: '2026-07-22',
          reference: receipt.id,
          description: 'Customer transfer',
          amountMinor: 1_250_000,
          balanceMinor: 1_250_000
        },
        {
          bookingDate: '2026-07-22',
          valueDate: null,
          reference: 'UNKNOWN-BANK-FEE',
          description: 'Unidentified bank fee',
          amountMinor: -25_000,
          balanceMinor: 1_225_000
        }
      ]
    });
    const result = services.bankReconciliation.autoMatch(statement.id, 'USR-FINANCE-REVIEWER');

    expect(result).toMatchObject({ matched: 1, unmatched: 1 });
    expect(services.bankReconciliation.getStatement(statement.id).summary).toMatchObject({
      reconciledLines: 1,
      unmatchedLines: 1
    });
    expect(
      services.bankReconciliation
        .listBookTransactions('cash-bank-main')
        .find(
          (item) =>
            item.journalLineId === allocation.journalEntryId ||
            item.journalEntryId === allocation.journalEntryId
        )
    ).toMatchObject({ amountMinor: 1_250_000, sourceReference: receipt.id });
    expect(
      sqlite
        .prepare('SELECT status, posting_date, updated_at FROM journal_entries WHERE id = ?')
        .get(allocation.journalEntryId)
    ).toEqual(before);
    expect(
      sqlite
        .prepare(
          'SELECT account_id, debit_minor, credit_minor FROM journal_lines WHERE journal_entry_id = ? ORDER BY line_number'
        )
        .all(allocation.journalEntryId)
    ).toEqual(linesBefore);
    sqlite.close();
  });
});
