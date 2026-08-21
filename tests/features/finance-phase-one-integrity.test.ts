import { describe, expect, it } from 'vitest';
import { createScenarioTestServices } from '../helpers/demo-db';

describe('Finance Phase 1 global integrity', () => {
  it('reconciles AR/AP subledgers to the posted GL with no duplicate or unbalanced posting', async () => {
    const { sqlite } = await createScenarioTestServices();
    const scalar = (sql: string) => Number((sqlite.prepare(sql).get() as { value: number }).value);

    expect(
      scalar(`SELECT COUNT(*) AS value FROM (
      SELECT journal.id FROM journal_entries journal
      JOIN journal_lines line ON line.journal_entry_id = journal.id
      WHERE journal.status = 'POSTED' GROUP BY journal.id
      HAVING SUM(line.debit_minor) <> SUM(line.credit_minor)
    )`)
    ).toBe(0);
    expect(
      scalar(`SELECT COUNT(*) AS value FROM (
      SELECT idempotency_key FROM accounting_events GROUP BY idempotency_key HAVING COUNT(*) > 1
    )`)
    ).toBe(0);
    expect(
      scalar(`SELECT COUNT(*) AS value FROM journal_entries journal
      JOIN accounting_events event ON event.id = journal.accounting_event_id
      WHERE journal.status = 'POSTED' AND event.posting_status <> 'POSTED'`)
    ).toBe(0);

    const arGl = scalar(
      "SELECT COALESCE(SUM(debit_minor-credit_minor), 0) AS value FROM general_ledger WHERE account_code = '1100'"
    );
    const arSubledger =
      scalar(`SELECT COALESCE(SUM(MAX(invoice.total-COALESCE(allocation.amount, 0), 0)), 0) AS value
      FROM invoices invoice LEFT JOIN (
        SELECT invoice_id, SUM(amount_minor) AS amount FROM ar_allocations
        WHERE status = 'POSTED' GROUP BY invoice_id
      ) allocation ON allocation.invoice_id = invoice.id
      WHERE invoice.recognition_mode = 'AR_ON_ISSUE' AND invoice.status NOT IN ('draft', 'void')`);
    expect(arSubledger).toBe(arGl);

    const apGl = scalar(
      "SELECT COALESCE(SUM(credit_minor-debit_minor), 0) AS value FROM general_ledger WHERE account_code = '2000'"
    );
    const apSubledger =
      scalar(`SELECT COALESCE(SUM(MAX(invoice.total_minor-COALESCE(payment.amount, 0), 0)), 0) AS value
      FROM supplier_invoices invoice LEFT JOIN (
        SELECT supplier_invoice_id, SUM(amount_minor) AS amount FROM supplier_payment_requests
        WHERE status = 'EXECUTED' AND reversal_journal_id IS NULL GROUP BY supplier_invoice_id
      ) payment ON payment.supplier_invoice_id = invoice.id
      WHERE invoice.lifecycle_status = 'AP_OPEN'`);
    expect(apSubledger).toBe(apGl);
    sqlite.close();
  });
});
