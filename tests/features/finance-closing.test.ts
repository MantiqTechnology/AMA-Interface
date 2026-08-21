import { describe, expect, it } from 'vitest';
import { createFinanceClosingService } from '../../server/features/finance/closing';
import { createAccountingService } from '../../server/features/finance/accounting';
import { createScenarioTestServices, createSeededTestServices } from '../helpers/demo-db';

const now = () => '2026-08-21T10:00:00.000Z';

function closingService(
  sqlite: Awaited<ReturnType<typeof createSeededTestServices>>['sqlite'],
  clock: () => string = now
) {
  return createFinanceClosingService(sqlite, createAccountingService(sqlite, clock), clock);
}

function periodCode(sqlite: Awaited<ReturnType<typeof createSeededTestServices>>['sqlite']) {
  return String(
    (
      sqlite
        .prepare(
          "SELECT period_code FROM accounting_periods WHERE status = 'OPEN' AND start_date <= '2026-08-21' AND end_date >= '2026-08-21' LIMIT 1"
        )
        .get() as { period_code: string }
    ).period_code
  );
}

function insertUnpostedJournal(
  sqlite: Awaited<ReturnType<typeof createSeededTestServices>>['sqlite'],
  code: string
) {
  sqlite
    .prepare(
      `INSERT INTO accounting_events (
    id, event_number, event_type, source_type, source_id, idempotency_key,
    accounting_date, transaction_date, amount_minor, currency_code,
    exchange_rate_to_idr_micros, base_amount_idr, posting_status, payload_json,
    created_at, updated_at
  ) VALUES (
    'acct-event-closing-blocker', 'AE-CLOSING-BLOCKER', 'TEST_EVENT', 'TEST_SOURCE',
    'CLOSING-BLOCKER', 'TEST_EVENT:TEST_SOURCE:CLOSING-BLOCKER', '2026-08-21',
    '2026-08-21T00:00:00.000Z', 1000, 'IDR', 1000000, 1000, 'DRAFT', '{}', ?, ?
  )`
    )
    .run(now(), now());
  sqlite
    .prepare(
      `INSERT INTO journal_entries (
    id, journal_number, accounting_event_id, period_id, status, source_type,
    source_id, transaction_date, currency_code, exchange_rate_to_idr_micros,
    policy_code, policy_version, created_by_user_id, memo, created_at, updated_at
  ) VALUES (
    'journal-closing-blocker', 'GJ-CLOSING-BLOCKER', 'acct-event-closing-blocker',
    (SELECT id FROM accounting_periods WHERE period_code = ?), 'DRAFT', 'TEST_SOURCE',
    'CLOSING-BLOCKER', '2026-08-21T00:00:00.000Z', 'IDR', 1000000,
    'TEST_POLICY', 1, 'USR-MAKER', 'Closing blocker test', ?, ?
  )`
    )
    .run(code, now(), now());
}

describe('Finance Phase 2 closing and adjustments', () => {
  it('posts and reverses an accrual through the canonical accounting engine', async () => {
    const { sqlite } = await createSeededTestServices();
    const closing = closingService(sqlite);
    const accrual = closing.createAccrual({
      accountingDate: '2026-08-21',
      amountMinor: 750_000,
      currencyCode: 'IDR',
      description: 'Unbilled airport handling service',
      evidenceReference: 'OPS-HANDLING-0821',
      stationId: 'st-djj',
      flightId: null,
      costCenterId: 'st-djj',
      createdBy: 'USR-FINANCE-MAKER'
    });

    const posted = closing.postAccrual(accrual.id, 'USR-FINANCE-REVIEWER');
    expect(posted).toMatchObject({ status: 'POSTED', journalId: expect.any(String) });
    expect(
      sqlite
        .prepare(
          `SELECT account.account_code, line.debit_minor, line.credit_minor
        FROM journal_lines line JOIN chart_of_accounts account ON account.id = line.account_id
        WHERE line.journal_entry_id = ? ORDER BY line.line_number`
        )
        .all(posted.journalId)
    ).toEqual([
      { account_code: '5500', debit_minor: 750_000, credit_minor: 0 },
      { account_code: '2500', debit_minor: 0, credit_minor: 750_000 }
    ]);

    const reversed = closing.reverseAccrual(accrual.id, {
      reason: 'Supplier invoice received in the following period',
      actorId: 'USR-FINANCE-REVIEWER',
      postingDate: '2026-08-21'
    });
    expect(reversed).toMatchObject({ status: 'REVERSED', reversalJournalId: expect.any(String) });
    expect(() =>
      closing.reverseAccrual(accrual.id, {
        reason: 'Duplicate reversal',
        actorId: 'USR-FINANCE-REVIEWER',
        postingDate: '2026-08-21'
      })
    ).toThrow(/already.*reversed/iu);
    sqlite.close();
  });

  it('posts prepayment and recognizes schedule lines without settling on accounting failure', async () => {
    const { sqlite } = await createSeededTestServices();
    const closing = closingService(sqlite);
    const prepayment = closing.createPrepayment({
      paymentDate: '2026-08-21',
      amountMinor: 1_200_000,
      currencyCode: 'IDR',
      description: 'Annual hangar insurance',
      cashBankAccountId: 'cash-bank-main',
      recognitionStartDate: '2026-08-21',
      recognitionPeriods: 2,
      evidenceReference: 'INS-2026-001',
      costCenterId: 'st-djj',
      createdBy: 'USR-FINANCE-MAKER'
    });
    expect(closing.postPrepayment(prepayment.id, 'USR-FINANCE-REVIEWER').status).toBe('POSTED');

    const recognized = closing.recognizePrepayment(
      prepayment.schedule[0]!.id,
      'USR-FINANCE-REVIEWER'
    );
    expect(recognized).toMatchObject({ status: 'POSTED', amountMinor: 600_000 });
    expect(closing.recognizePrepayment(prepayment.schedule[0]!.id, 'USR-FINANCE-REVIEWER')).toEqual(
      recognized
    );

    sqlite
      .prepare(
        "UPDATE accounting_periods SET status = 'CLOSED' WHERE start_date <= '2026-09-01' AND end_date >= '2026-09-01'"
      )
      .run();
    const failed = closing.recognizePrepayment(prepayment.schedule[1]!.id, 'USR-FINANCE-REVIEWER');
    expect(failed.status).toBe('EXCEPTION');
    expect(closing.getPrepayment(prepayment.id).recognizedMinor).toBe(600_000);
    sqlite.close();
  });

  it('posts a depreciation schedule once and preserves its asset lineage', async () => {
    const { sqlite } = await createScenarioTestServices();

    const schedule = sqlite
      .prepare(
        `SELECT period.period_code FROM depreciation_schedules schedule
      JOIN accounting_periods period ON period.id = schedule.period_id
      WHERE schedule.status = 'SCHEDULED' ORDER BY period.start_date LIMIT 1`
      )
      .get() as { period_code: string };
    const closing = closingService(sqlite, () => `${schedule.period_code}-15T10:00:00.000Z`);
    const first = closing.runDepreciation(schedule.period_code, 'USR-FINANCE-REVIEWER');
    const second = closing.runDepreciation(schedule.period_code, 'USR-FINANCE-REVIEWER');

    expect(first.posted).toBeGreaterThan(0);
    expect(second).toMatchObject({ posted: 0, skipped: first.posted });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM depreciation_schedules schedule
      JOIN journal_entries journal ON journal.id = schedule.journal_entry_id
      WHERE schedule.status = 'POSTED' AND journal.status = 'POSTED'`
        )
        .get()
    ).toEqual({ count: first.posted });
    sqlite.close();
  });

  it('blocks closing until required controls are reviewed and rejects backdated posting after close', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const closing = closingService(sqlite);
    const code = periodCode(sqlite);
    insertUnpostedJournal(sqlite, code);
    const bankStatement = services.bankReconciliation.createStatement({
      cashBankAccountId: 'cash-bank-main',
      statementNumber: 'STMT-CLOSING-BLOCKER',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      openingBalanceMinor: 0,
      closingBalanceMinor: 10_000,
      importedBy: 'USR-FINANCE-MANAGER',
      lines: [
        {
          bookingDate: '2026-08-21',
          valueDate: null,
          reference: 'UNMATCHED-CLOSE',
          description: 'Unmatched closing item',
          amountMinor: 10_000,
          balanceMinor: 10_000
        }
      ]
    });
    const accountingException = services.accounting.postCanonicalEvent(
      {
        eventType: 'NO_POLICY_CLOSING_TEST',
        sourceType: 'TEST_SOURCE',
        sourceId: 'closing-exception',
        productAccountingProfileId: null,
        accountingDate: '2026-08-21',
        transactionDate: '2026-08-21',
        documentDate: null,
        serviceDate: null,
        amountMinor: 100,
        currencyId: 'cur-idr',
        currencyCode: 'IDR',
        exchangeRateToIdrMicros: 1_000_000,
        baseAmountIdr: 100,
        stationId: null,
        aircraftId: null,
        flightId: null,
        workOrderReference: null,
        costCenterId: null,
        payload: {},
        memo: 'Closing exception'
      },
      'USR-FINANCE-REVIEWER'
    );
    expect(accountingException.exceptionCode).toBe('NO_MATCHING_POLICY');
    const run = closing.startClosing(code, 'USR-FINANCE-MANAGER');
    expect(() => closing.closePeriod(run.id, 'USR-FINANCE-MANAGER')).toThrow(/checklist|blocker/iu);

    const unposted = closing
      .getClosingRun(run.id)
      .items.find((item) => item.code === 'UNPOSTED_JOURNALS');
    expect(unposted?.status).toBe('BLOCKED');
    expect(() =>
      closing.reviewChecklistItem(run.id, 'UNPOSTED_JOURNALS', {
        status: 'CLEARED',
        note: 'Attempted manual override',
        actorId: 'USR-FINANCE-MANAGER'
      })
    ).toThrow(/still.*block/iu);
    expect(closing.getClosingRun(run.id).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'BANK_RECONCILIATION', status: 'BLOCKED' }),
        expect.objectContaining({ code: 'ACCOUNTING_EXCEPTIONS', status: 'BLOCKED' })
      ])
    );
    expect(() =>
      closing.reviewChecklistItem(run.id, 'BANK_RECONCILIATION', {
        status: 'CLEARED',
        note: 'Attempted manual override',
        actorId: 'USR-FINANCE-MANAGER'
      })
    ).toThrow(/still.*block/iu);
    sqlite
      .prepare(
        `DELETE FROM journal_entries WHERE period_id = (
      SELECT id FROM accounting_periods WHERE period_code = ?
    ) AND status NOT IN ('POSTED', 'REVERSED')`
      )
      .run(code);
    sqlite
      .prepare("UPDATE bank_statement_lines SET status = 'RECONCILED' WHERE statement_id = ?")
      .run(bankStatement.id);
    sqlite
      .prepare("UPDATE bank_statements SET status = 'RECONCILED' WHERE id = ?")
      .run(bankStatement.id);
    sqlite
      .prepare("UPDATE accounting_exceptions SET status = 'RESOLVED' WHERE accounting_event_id = ?")
      .run(accountingException.accountingEventId);

    for (const item of closing.getClosingRun(run.id).items) {
      closing.reviewChecklistItem(run.id, item.code, {
        status: 'CLEARED',
        note: 'Reviewed for functional demo close',
        actorId: 'USR-FINANCE-MANAGER'
      });
    }
    const closed = closing.closePeriod(run.id, 'USR-FINANCE-MANAGER');
    expect(closed.periodStatus).toBe('CLOSED');

    const rejected = services.accounting.postCanonicalEvent(
      {
        eventType: 'ACCRUAL_POSTED',
        sourceType: 'ACCRUAL',
        sourceId: 'closed-period-test',
        productAccountingProfileId: null,
        accountingDate: '2026-08-21',
        transactionDate: '2026-08-21',
        documentDate: null,
        serviceDate: null,
        amountMinor: 100,
        currencyId: 'cur-idr',
        currencyCode: 'IDR',
        exchangeRateToIdrMicros: 1_000_000,
        baseAmountIdr: 100,
        stationId: 'st-djj',
        aircraftId: null,
        flightId: null,
        workOrderReference: null,
        costCenterId: 'st-djj',
        payload: {},
        memo: 'Closed period test'
      },
      'USR-FINANCE-REVIEWER'
    );
    expect(rejected).toMatchObject({ journalEntryId: null, exceptionCode: 'CLOSED_PERIOD' });
    sqlite.close();
  });

  it('retries a corrected accounting exception without creating a duplicate event', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const code = periodCode(sqlite);
    const event = {
      eventType: 'ACCRUAL_POSTED',
      sourceType: 'ACCRUAL',
      sourceId: 'retry-closed-period',
      productAccountingProfileId: null,
      accountingDate: '2026-08-21',
      transactionDate: '2026-08-21',
      documentDate: null,
      serviceDate: null,
      amountMinor: 250_000,
      currencyId: 'cur-idr',
      currencyCode: 'IDR',
      exchangeRateToIdrMicros: 1_000_000,
      baseAmountIdr: 250_000,
      stationId: 'st-djj',
      aircraftId: null,
      flightId: null,
      workOrderReference: null,
      costCenterId: 'st-djj',
      payload: {},
      memo: 'Retry accrual'
    };
    sqlite
      .prepare("UPDATE accounting_periods SET status = 'CLOSED' WHERE period_code = ?")
      .run(code);
    const failed = services.accounting.postCanonicalEvent(event, 'USR-FINANCE-REVIEWER');
    expect(failed).toMatchObject({ journalEntryId: null, exceptionCode: 'CLOSED_PERIOD' });
    sqlite.prepare("UPDATE accounting_periods SET status = 'OPEN' WHERE period_code = ?").run(code);
    const retried = services.accounting.postCanonicalEvent(event, 'USR-FINANCE-REVIEWER');
    expect(retried).toMatchObject({
      accountingEventId: failed.accountingEventId,
      journalStatus: 'POSTED'
    });
    expect(
      sqlite
        .prepare('SELECT COUNT(*) AS count FROM accounting_events WHERE source_id = ?')
        .get(event.sourceId)
    ).toEqual({ count: 1 });
    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM accounting_exceptions WHERE accounting_event_id = ? AND status = 'OPEN'"
        )
        .get(failed.accountingEventId)
    ).toEqual({ count: 0 });
    sqlite.close();
  });

  it('blocks closing when an active bank account lacks full-period reconciled statement coverage', async () => {
    const { sqlite } = await createSeededTestServices();
    const closing = closingService(sqlite);
    const code = periodCode(sqlite);
    const run = closing.startClosing(code, 'USR-FINANCE-MANAGER');
    expect(closing.getClosingRun(run.id).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'BANK_RECONCILIATION',
          status: 'BLOCKED',
          blocker: expect.stringMatching(/coverage/iu)
        })
      ])
    );
    sqlite.close();
  });

  it('requires maker-checker and authorization for controlled reopening', async () => {
    const { sqlite } = await createSeededTestServices();
    const closing = closingService(sqlite);
    const code = periodCode(sqlite);
    sqlite
      .prepare("UPDATE accounting_periods SET status = 'CLOSED' WHERE period_code = ?")
      .run(code);
    const request = closing.requestReopen(code, {
      reason: 'Approved correction after close',
      requesterId: 'USR-FINANCE-MANAGER'
    });
    expect(closing.listReopenRequests(code)).toEqual([
      expect.objectContaining({ id: request.id, periodCode: code, status: 'REQUESTED' })
    ]);

    expect(() =>
      closing.approveReopen(request.id, {
        approverId: 'USR-FINANCE-MANAGER',
        approverRole: 'Finance Manager'
      })
    ).toThrow(/maker|own request/iu);
    expect(() =>
      closing.approveReopen(request.id, {
        approverId: 'USR-STAFF',
        approverRole: 'Finance Staff'
      })
    ).toThrow(/authorized/iu);
    const approved = closing.approveReopen(request.id, {
      approverId: 'USR-DIRECTOR',
      approverRole: 'Director'
    });
    expect(approved).toMatchObject({ status: 'APPROVED', periodStatus: 'OPEN' });
    expect(closing.listReopenRequests(code)[0]).toMatchObject({
      status: 'APPROVED',
      approverId: 'USR-DIRECTOR',
      periodStatus: 'OPEN'
    });
    sqlite.close();
  });

  it('rejects a stale reopen request after the period is no longer closed', async () => {
    const { sqlite } = await createSeededTestServices();
    const closing = closingService(sqlite);
    const code = periodCode(sqlite);
    sqlite
      .prepare("UPDATE accounting_periods SET status = 'CLOSED' WHERE period_code = ?")
      .run(code);
    const request = closing.requestReopen(code, {
      reason: 'Request created in an earlier close cycle',
      requesterId: 'USR-FINANCE-MANAGER'
    });
    sqlite.prepare("UPDATE accounting_periods SET status = 'OPEN' WHERE period_code = ?").run(code);
    expect(() =>
      closing.approveReopen(request.id, {
        approverId: 'USR-DIRECTOR',
        approverRole: 'Director'
      })
    ).toThrow(/period.*closed|no longer/iu);
    expect(closing.listReopenRequests(code)[0]?.status).toBe('REQUESTED');
    sqlite.close();
  });
});
