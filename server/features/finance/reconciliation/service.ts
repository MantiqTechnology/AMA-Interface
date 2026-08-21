import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';
import type {
  BankStatementDto,
  CashBookTransactionDto
} from '../../../../shared/features/finance/reconciliation';
import { DomainError } from '../../../utils/errors';
import { FinanceAuditService } from '../audit/service';

type SqlRow = Record<string, unknown>;
const num = (value: unknown) => Number(value ?? 0);
const str = (value: unknown) => (value === null || value === undefined ? null : String(value));

export class BankReconciliationService {
  private readonly audit: FinanceAuditService;

  constructor(
    private readonly sqlite: Database.Database,
    private readonly now: () => string
  ) {
    this.audit = new FinanceAuditService(sqlite, now);
  }

  listBookTransactions(cashBankAccountId: string): CashBookTransactionDto[] {
    return this.sqlite
      .prepare(
        `SELECT line.id AS journalLineId, journal.id AS journalEntryId,
                journal.journal_number AS journalNumber, journal.posting_date AS postingDate,
                line.debit_minor - line.credit_minor AS amountMinor,
                journal.source_type AS sourceType, journal.source_id AS sourceId,
                COALESCE(
                  json_extract(event.payload_json, '$.receiptId'),
                  json_extract(event.payload_json, '$.reference'),
                  journal.source_id
                ) AS sourceReference,
                line.description,
                CASE WHEN match.id IS NULL THEN 0 ELSE 1 END AS reconciled
         FROM journal_lines line
         JOIN journal_entries journal ON journal.id = line.journal_entry_id AND journal.status = 'POSTED'
         JOIN accounting_events event ON event.id = journal.accounting_event_id
         JOIN cash_bank_accounts account ON account.gl_account_id = line.account_id
         LEFT JOIN bank_reconciliation_matches match
           ON match.journal_line_id = line.id AND match.status = 'RECONCILED'
         WHERE account.id = ?
           AND json_extract(event.payload_json, '$.cashBankAccountId') = account.id
         ORDER BY journal.posting_date DESC, journal.journal_number DESC, line.line_number`
      )
      .all(cashBankAccountId)
      .map((row) => {
        const value = row as SqlRow;
        return {
          journalLineId: String(value.journalLineId),
          journalEntryId: String(value.journalEntryId),
          journalNumber: String(value.journalNumber),
          postingDate: String(value.postingDate),
          amountMinor: num(value.amountMinor),
          sourceType: String(value.sourceType),
          sourceId: String(value.sourceId),
          sourceReference: String(value.sourceReference),
          description: String(value.description),
          reconciled: Boolean(value.reconciled)
        };
      });
  }

  listCashBankAccounts() {
    return (
      this.sqlite
        .prepare(
          `SELECT account.id, account.account_code AS accountCode, account.account_name AS accountName,
                account.account_type AS accountType, account.currency_code AS currencyCode,
                coa.account_code AS glAccountCode,
                COALESCE(SUM(CASE WHEN journal.status = 'POSTED'
                  THEN line.debit_minor - line.credit_minor ELSE 0 END), 0) AS balanceMinor
         FROM cash_bank_accounts account
         JOIN chart_of_accounts coa ON coa.id = account.gl_account_id
         LEFT JOIN journal_lines line ON line.account_id = account.gl_account_id
         LEFT JOIN journal_entries journal ON journal.id = line.journal_entry_id
         WHERE account.is_active = 1
         GROUP BY account.id ORDER BY account.account_code`
        )
        .all() as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      accountCode: String(row.accountCode),
      accountName: String(row.accountName),
      accountType: String(row.accountType),
      currencyCode: String(row.currencyCode),
      glAccountCode: String(row.glAccountCode),
      balanceMinor: num(row.balanceMinor)
    }));
  }

  listStatements(limit = 100): BankStatementDto[] {
    return (
      this.sqlite
        .prepare(
          'SELECT id FROM bank_statements ORDER BY period_end DESC, statement_number DESC LIMIT ?'
        )
        .all(limit) as Array<{ id: string }>
    ).map((row) => this.getStatement(row.id));
  }

  createStatement(input: {
    cashBankAccountId: string;
    statementNumber: string;
    periodStart: string;
    periodEnd: string;
    openingBalanceMinor: number;
    closingBalanceMinor: number;
    importedBy: string;
    lines: Array<{
      bookingDate: string;
      valueDate: string | null;
      reference: string | null;
      description: string;
      amountMinor: number;
      balanceMinor: number | null;
    }>;
  }): BankStatementDto {
    const create = () => {
      const account = this.sqlite
        .prepare('SELECT id FROM cash_bank_accounts WHERE id = ? AND is_active = 1')
        .get(input.cashBankAccountId);
      if (!account)
        throw new DomainError(
          'CASH_BANK_ACCOUNT_NOT_FOUND',
          'Cash/bank account was not found.',
          404
        );
      if (!input.lines.length)
        throw new DomainError(
          'BANK_STATEMENT_EMPTY',
          'Bank statement needs at least one line.',
          422
        );
      const id = `bank-statement-${nanoid(12)}`;
      const timestamp = this.now();
      this.sqlite
        .prepare(
          `INSERT INTO bank_statements (
          id, cash_bank_account_id, statement_number, period_start, period_end,
          opening_balance_minor, closing_balance_minor, status, imported_by, imported_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'IMPORTED', ?, ?, ?)`
        )
        .run(
          id,
          input.cashBankAccountId,
          input.statementNumber,
          input.periodStart,
          input.periodEnd,
          input.openingBalanceMinor,
          input.closingBalanceMinor,
          input.importedBy,
          timestamp,
          timestamp
        );
      const insert = this.sqlite.prepare(
        `INSERT INTO bank_statement_lines (
          id, statement_id, line_number, booking_date, value_date, reference,
          description, amount_minor, balance_minor, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNMATCHED', ?)`
      );
      input.lines.forEach((line, index) =>
        insert.run(
          `bank-line-${nanoid(12)}`,
          id,
          index + 1,
          line.bookingDate,
          line.valueDate,
          line.reference,
          line.description,
          line.amountMinor,
          line.balanceMinor,
          timestamp
        )
      );
      this.audit.record({
        actorId: input.importedBy,
        action: 'BANK_STATEMENT_IMPORTED',
        entityType: 'BANK_STATEMENT',
        entityId: id,
        sourceReference: input.statementNumber,
        after: { lineCount: input.lines.length }
      });
      return this.getStatement(id);
    };
    return this.sqlite.transaction(create).immediate();
  }

  autoMatch(statementId: string, actorId: string) {
    const match = () => {
      const statement = this.statementRow(statementId);
      const book = this.listBookTransactions(String(statement.cash_bank_account_id)).filter(
        (item) => !item.reconciled
      );
      const lines = this.sqlite
        .prepare(
          "SELECT * FROM bank_statement_lines WHERE statement_id = ? AND status = 'UNMATCHED' ORDER BY line_number"
        )
        .all(statementId) as SqlRow[];
      let matched = 0;
      for (const line of lines) {
        const bookingDate = String(line.booking_date);
        const candidates = book.filter(
          (item) =>
            item.amountMinor === num(line.amount_minor) &&
            Math.abs(Date.parse(item.postingDate) - Date.parse(bookingDate)) <= 3 * 86_400_000
        );
        const reference = str(line.reference);
        const candidate =
          candidates.find((item) => reference && item.sourceReference === reference) ??
          (candidates.length === 1 ? candidates[0] : undefined);
        if (!candidate) continue;
        const timestamp = this.now();
        this.sqlite
          .prepare(
            `INSERT INTO bank_reconciliation_matches (
            id, statement_line_id, journal_line_id, matched_amount_minor,
            match_method, status, matched_by, matched_at
          ) VALUES (?, ?, ?, ?, 'AUTO', 'RECONCILED', ?, ?)`
          )
          .run(
            `bank-match-${nanoid(12)}`,
            line.id,
            candidate.journalLineId,
            Math.abs(candidate.amountMinor),
            actorId,
            timestamp
          );
        this.sqlite
          .prepare("UPDATE bank_statement_lines SET status = 'RECONCILED' WHERE id = ?")
          .run(line.id);
        book.splice(book.indexOf(candidate), 1);
        matched += 1;
      }
      const unmatched = lines.length - matched;
      this.sqlite
        .prepare('UPDATE bank_statements SET status = ?, updated_at = ? WHERE id = ?')
        .run(unmatched === 0 ? 'RECONCILED' : 'IN_PROGRESS', this.now(), statementId);
      this.audit.record({
        actorId,
        action: 'BANK_RECONCILIATION_MATCHED',
        entityType: 'BANK_STATEMENT',
        entityId: statementId,
        after: { matched, unmatched }
      });
      return { matched, unmatched };
    };
    return this.sqlite.transaction(match).immediate();
  }

  getStatement(id: string): BankStatementDto {
    const row = this.statementRow(id);
    const lines = this.sqlite
      .prepare(
        `SELECT line.*, match.journal_line_id
       FROM bank_statement_lines line
       LEFT JOIN bank_reconciliation_matches match ON match.statement_line_id = line.id
       WHERE line.statement_id = ? ORDER BY line.line_number`
      )
      .all(id) as SqlRow[];
    const reconciledLines = lines.filter((line) => line.status === 'RECONCILED').length;
    return {
      id: String(row.id),
      cashBankAccountId: String(row.cash_bank_account_id),
      statementNumber: String(row.statement_number),
      periodStart: String(row.period_start),
      periodEnd: String(row.period_end),
      openingBalanceMinor: num(row.opening_balance_minor),
      closingBalanceMinor: num(row.closing_balance_minor),
      status: String(row.status),
      summary: {
        totalLines: lines.length,
        reconciledLines,
        unmatchedLines: lines.length - reconciledLines
      },
      lines: lines.map((line) => ({
        id: String(line.id),
        bookingDate: String(line.booking_date),
        valueDate: str(line.value_date),
        reference: str(line.reference),
        description: String(line.description),
        amountMinor: num(line.amount_minor),
        balanceMinor: line.balance_minor === null ? null : num(line.balance_minor),
        status: String(line.status),
        journalLineId: str(line.journal_line_id)
      }))
    };
  }

  private statementRow(id: string) {
    const row = this.sqlite.prepare('SELECT * FROM bank_statements WHERE id = ?').get(id) as
      SqlRow | undefined;
    if (!row) throw new DomainError('NOT_FOUND', `Bank statement ${id} was not found.`, 404);
    return row;
  }
}
