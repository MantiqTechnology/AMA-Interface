import { describe, expect, it } from 'vitest';
import { AgentRepository } from '../../server/features/commercial/agents/repository';
import { PassengerTicketRepository } from '../../server/features/ticketing/passenger/repository';
import { PassengerTicketService } from '../../server/features/ticketing/passenger/service';
import { TicketingSalesRepository } from '../../server/features/ticketing/sales/repository';
import { createSeededTestServices } from '../helpers/demo-db';

type CountRow = { count: number };
type BalanceRow = { journal_entry_id: string; debit: number; credit: number };
type AccountRow = { account_code: string };

function passengerService(
  context: Awaited<ReturnType<typeof createSeededTestServices>>
): PassengerTicketService {
  return new PassengerTicketService(
    new PassengerTicketRepository(context.sqlite),
    new TicketingSalesRepository(context.sqlite),
    new AgentRepository(context.db),
    context.services.accounting
  );
}

function insertDraftJournal(
  sqlite: Awaited<ReturnType<typeof createSeededTestServices>>['sqlite']
) {
  const period = sqlite
    .prepare("SELECT id FROM accounting_periods WHERE status = 'OPEN' LIMIT 1")
    .get() as {
    id: string;
  };
  sqlite
    .prepare(
      `INSERT INTO accounting_events (
        id, event_number, event_type, source_type, source_id, idempotency_key,
        accounting_date, transaction_date, amount_minor, currency_code,
        exchange_rate_to_idr_micros, base_amount_idr, posting_status, payload_json,
        created_at, updated_at
      ) VALUES (
        'acct-event-draft-test', 'AE-DRAFT-TEST', 'TEST_EVENT', 'TEST_SOURCE',
        'TEST-1', 'TEST_EVENT:TEST_SOURCE:TEST-1', '2026-07-01',
        '2026-07-01T00:00:00.000Z', 1000, 'IDR', 1000000, 1000,
        'DRAFT', '{}', '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'
      )`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO journal_entries (
        id, journal_number, accounting_event_id, period_id, status, source_type,
        source_id, transaction_date, currency_code, exchange_rate_to_idr_micros,
        policy_code, policy_version, created_by_user_id, memo, created_at, updated_at
      ) VALUES (
        'journal-draft-test', 'GJ-DRAFT-TEST', 'acct-event-draft-test', ?, 'DRAFT',
        'TEST_SOURCE', 'TEST-1', '2026-07-01T00:00:00.000Z', 'IDR', 1000000,
        'TEST_POLICY', 1, 'USR-MAKER', 'Draft journal for workflow tests',
        '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'
      )`
    )
    .run(period.id);
  sqlite
    .prepare(
      `INSERT INTO journal_lines (
        id, journal_entry_id, line_number, account_id, debit_minor, credit_minor,
        base_debit_idr, base_credit_idr, description
      ) VALUES
        ('journal-line-draft-test-1', 'journal-draft-test', 1, 'coa-1000', 1000, 0, 1000, 0, 'Draft debit'),
        ('journal-line-draft-test-2', 'journal-draft-test', 2, 'coa-2000', 0, 1000, 0, 1000, 'Draft credit')`
    )
    .run();
}

describe('policy-driven accounting core', () => {
  it('builds journal detail from persisted snapshots, lines, and lifecycle data', async () => {
    const { services, sqlite } = await createSeededTestServices();
    services.accounting.postDemoEvents({ source: 'ticketing' }, 'USR-FINANCE-REVIEWER');
    const journal = sqlite
      .prepare(
        `SELECT journal.id, event.policy_id
         FROM journal_entries journal
         JOIN accounting_events event ON event.id = journal.accounting_event_id
         WHERE event.event_type = 'TICKET_PAYMENT_RECEIVED'
         ORDER BY journal.journal_number LIMIT 1`
      )
      .get() as { id: string; policy_id: string };

    const before = services.accounting.getJournalDetail(journal.id);
    expect(before.totals).toMatchObject({ balanced: true });
    expect(before.lines).toHaveLength(2);
    expect(before.policy).toMatchObject({
      treatment: 'DEFERRED_REVENUE',
      isHistoricalSnapshot: true
    });
    expect(before.matchedConditions.every((item) => item.field)).toBe(true);

    sqlite
      .prepare(
        `UPDATE accounting_policies
         SET policy_name = 'Changed live name', treatment = 'CHANGED_LIVE_TREATMENT', version = 99
         WHERE id = ?`
      )
      .run(journal.policy_id);
    const after = services.accounting.getJournalDetail(journal.id);
    expect(after.policy).toMatchObject({
      name: before.policy?.name,
      code: before.policy?.code,
      version: before.policy?.version,
      treatment: before.policy?.treatment
    });
    expect(after.auditTrail.map((item) => item.timestamp).filter(Boolean)).toEqual(
      [...after.auditTrail.map((item) => item.timestamp).filter(Boolean)].sort()
    );
  });

  it('posts idempotent policy-resolved journal entries and derives GL from posted lines', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const firstRun = services.accounting.postDemoEvents({ source: 'all' }, 'USR-FINANCE-REVIEWER');
    const secondRun = services.accounting.postDemoEvents({ source: 'all' }, 'USR-FINANCE-REVIEWER');

    expect(firstRun.eventsCreated).toBeGreaterThan(0);
    expect(firstRun.journalsPosted).toBeGreaterThan(0);
    expect(secondRun.eventsCreated).toBe(0);
    expect(secondRun.journalsPosted).toBe(0);
    expect(secondRun.skipped).toBeGreaterThanOrEqual(firstRun.eventsCreated);

    const unbalanced = sqlite
      .prepare(
        `SELECT journal_entry_id, SUM(debit_minor) AS debit, SUM(credit_minor) AS credit
         FROM journal_lines
         GROUP BY journal_entry_id
         HAVING debit <> credit`
      )
      .all() as BalanceRow[];
    expect(unbalanced).toEqual([]);

    const postedEvents = sqlite
      .prepare(
        `SELECT COUNT(*) AS count
         FROM accounting_events
         WHERE posting_status = 'POSTED' AND policy_code IS NOT NULL AND journal_entry_id IS NOT NULL`
      )
      .get() as CountRow;
    expect(postedEvents.count).toBe(firstRun.journalsPosted);

    const generalLedgerLines = services.accounting.generalLedger({ limit: 250, offset: 0 });
    expect(generalLedgerLines.length).toBe(firstRun.journalsPosted * 2);
    expect(generalLedgerLines.every((line) => line.policyCode)).toBe(true);

    const accounts = sqlite
      .prepare(
        `SELECT DISTINCT account.account_code
         FROM journal_lines line
         JOIN chart_of_accounts account ON account.id = line.account_id
         ORDER BY account.account_code`
      )
      .all() as AccountRow[];
    expect(accounts.map((row) => row.account_code)).toEqual(
      expect.arrayContaining(['1000', '1200', '2200', '2400'])
    );

    const posted = sqlite
      .prepare("SELECT id FROM journal_entries WHERE status = 'POSTED' LIMIT 1")
      .get() as { id: string } | undefined;
    expect(posted).toBeDefined();
    expect(() =>
      sqlite.prepare("UPDATE journal_entries SET memo = 'mutated' WHERE id = ?").run(posted?.id)
    ).toThrow(/posted journal entry is immutable/u);
  });

  it('reconciles posted journals, GL lineage, and canonical event uniqueness', async () => {
    const { services, sqlite } = await createSeededTestServices();
    services.accounting.postDemoEvents({ source: 'all' }, 'USR-FINANCE-REVIEWER');

    expect(
      sqlite
        .prepare(
          `SELECT entry.id AS journal_entry_id,
                  SUM(line.debit_minor) AS debit,
                  SUM(line.credit_minor) AS credit
           FROM journal_entries entry
           JOIN journal_lines line ON line.journal_entry_id = entry.id
           WHERE entry.status = 'POSTED'
           GROUP BY entry.id
           HAVING debit <> credit`
        )
        .all()
    ).toEqual([]);
    const postedLineCount = sqlite
      .prepare(
        `SELECT COUNT(*) AS count
         FROM journal_lines line
         JOIN journal_entries entry ON entry.id = line.journal_entry_id
         WHERE entry.status = 'POSTED'`
      )
      .get() as CountRow;
    expect(services.accounting.generalLedger({ limit: 250, offset: 0 })).toHaveLength(
      postedLineCount.count
    );
    expect(
      sqlite
        .prepare(
          `SELECT idempotency_key
           FROM accounting_events
           GROUP BY idempotency_key HAVING COUNT(*) > 1`
        )
        .all()
    ).toEqual([]);
    expect(
      sqlite
        .prepare(
          `SELECT event_type, source_type, source_id
           FROM accounting_events
           GROUP BY event_type, source_type, source_id HAVING COUNT(*) > 1`
        )
        .all()
    ).toEqual([]);
  });

  it('creates real accounting output when a passenger ticket payment succeeds', async () => {
    const context = await createSeededTestServices();
    const tickets = passengerService(context);

    const before = context.sqlite
      .prepare('SELECT COUNT(*) AS count FROM journal_entries')
      .get() as CountRow;
    tickets.pay('AMA-TKT-20260718-002', { paymentMethod: 'QRIS' });
    tickets.pay('AMA-TKT-20260718-002', { paymentMethod: 'QRIS' });

    const after = context.sqlite
      .prepare('SELECT COUNT(*) AS count FROM journal_entries')
      .get() as CountRow;
    expect(after.count - before.count).toBe(1);
    expect(
      context.services.accounting
        .generalLedger({ limit: 250, offset: 0 })
        .filter((line) => line.sourceId === 'AMA-TKT-20260718-002')
        .map((line) => line.accountCode)
    ).toEqual(expect.arrayContaining(['1000', '2200']));
  });

  it('persists resolver exceptions for no policy, ambiguous policy, and missing context', async () => {
    const noPolicy = await createSeededTestServices();
    noPolicy.sqlite
      .prepare(
        "UPDATE accounting_policies SET is_active = 0 WHERE event_type = 'TICKET_PAYMENT_RECEIVED' AND product_accounting_profile_id = 'pap-passenger-ticket'"
      )
      .run();
    passengerService(noPolicy).pay('AMA-TKT-20260718-002', { paymentMethod: 'QRIS' });
    expect(noPolicy.services.accounting.listExceptions({ limit: 10, offset: 0 })).toContainEqual(
      expect.objectContaining({ reasonCode: 'NO_MATCHING_POLICY' })
    );

    const ambiguous = await createSeededTestServices();
    ambiguous.sqlite
      .prepare(
        `INSERT INTO accounting_policies (
          id, policy_code, policy_name, event_type, product_accounting_profile_id,
          debit_account_id, credit_account_id, treatment, capitalization_candidate,
          required_dimensions_json, priority, effective_from, approval_status,
          version, is_active, created_at, updated_at
        ) VALUES (
          'policy-ticket-payment-ambiguous', 'TICKET_PAYMENT_AMBIGUOUS_V1',
          'Ambiguous payment policy', 'TICKET_PAYMENT_RECEIVED', 'pap-passenger-ticket',
          'coa-1000', 'coa-2200', 'DEFERRED_REVENUE', 0, '["flightId"]', 10,
          '2026-01-01', 'APPROVED', 1, 1, '2026-01-01T00:00:00.000Z',
          '2026-01-01T00:00:00.000Z'
        )`
      )
      .run();
    passengerService(ambiguous).pay('AMA-TKT-20260718-002', { paymentMethod: 'QRIS' });
    expect(ambiguous.services.accounting.listExceptions({ limit: 10, offset: 0 })).toContainEqual(
      expect.objectContaining({ reasonCode: 'AMBIGUOUS_POLICY' })
    );

    const missing = await createSeededTestServices();
    missing.sqlite
      .prepare(
        "UPDATE accounting_policies SET required_dimensions_json = '[\"workOrderReference\"]' WHERE id = 'policy-ticket-payment-deferred-v1'"
      )
      .run();
    passengerService(missing).pay('AMA-TKT-20260718-002', { paymentMethod: 'QRIS' });
    expect(missing.services.accounting.listExceptions({ limit: 10, offset: 0 })).toContainEqual(
      expect.objectContaining({ reasonCode: 'MISSING_CONTEXT' })
    );
    expect(
      missing.sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM accounting_exceptions exception
           JOIN journal_entries journal ON journal.accounting_event_id = exception.accounting_event_id
           WHERE journal.status = 'POSTED'`
        )
        .get()
    ).toEqual({ count: 0 });
  });

  it('supports maker-checker approval, posting, and one-time reversal', async () => {
    const { services, sqlite } = await createSeededTestServices();
    insertDraftJournal(sqlite);

    expect(services.accounting.generalLedger({ limit: 250, offset: 0 })).toEqual([]);
    services.accounting.submitJournal('journal-draft-test', 'USR-MAKER');
    expect(() => services.accounting.approveJournal('journal-draft-test', 'USR-MAKER')).toThrow(
      /Journal maker cannot approve/u
    );
    services.accounting.approveJournal('journal-draft-test', 'USR-CHECKER');
    services.accounting.postJournal('journal-draft-test', 'USR-POSTER');
    expect(services.accounting.generalLedger({ limit: 250, offset: 0 })).toHaveLength(2);

    const reversal = services.accounting.reverseJournal(
      'journal-draft-test',
      { reason: 'Correction', postingDate: '2026-07-01' },
      'USR-CHECKER'
    );
    expect(reversal.sourceType).toBe('JOURNAL_ENTRY');
    expect(services.accounting.getJournalDetail('journal-draft-test').reversal).toMatchObject({
      reversalJournalId: reversal.id,
      reversalJournalNumber: reversal.journalNumber
    });
    expect(services.accounting.getJournalDetail(reversal.id).reversal).toMatchObject({
      originalJournalId: 'journal-draft-test',
      originalJournalNumber: 'GJ-DRAFT-TEST'
    });
    expect(() =>
      services.accounting.reverseJournal(
        'journal-draft-test',
        { reason: 'Duplicate correction', postingDate: '2026-07-01' },
        'USR-CHECKER'
      )
    ).toThrow(/already has a reversal/u);
  });

  it('preserves foreign-currency base amounts in reversal lines', async () => {
    const { services, sqlite } = await createSeededTestServices();
    insertDraftJournal(sqlite);
    sqlite
      .prepare(
        `UPDATE journal_entries
         SET currency_code = 'USD', exchange_rate_to_idr_micros = 16000000000
         WHERE id = 'journal-draft-test'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE journal_lines
         SET base_debit_idr = CASE WHEN debit_minor > 0 THEN 16000000 ELSE 0 END,
             base_credit_idr = CASE WHEN credit_minor > 0 THEN 16000000 ELSE 0 END
         WHERE journal_entry_id = 'journal-draft-test'`
      )
      .run();

    services.accounting.submitJournal('journal-draft-test', 'USR-MAKER');
    services.accounting.approveJournal('journal-draft-test', 'USR-CHECKER');
    services.accounting.postJournal('journal-draft-test', 'USR-POSTER');
    const reversal = services.accounting.reverseJournal(
      'journal-draft-test',
      { reason: 'FX correction', postingDate: '2026-07-01' },
      'USR-CHECKER'
    );

    expect(
      sqlite
        .prepare(
          `SELECT debit_minor, credit_minor, base_debit_idr, base_credit_idr
           FROM journal_lines WHERE journal_entry_id = ? ORDER BY line_number`
        )
        .all(reversal.id)
    ).toEqual([
      { debit_minor: 0, credit_minor: 1000, base_debit_idr: 0, base_credit_idr: 16_000_000 },
      { debit_minor: 1000, credit_minor: 0, base_debit_idr: 16_000_000, base_credit_idr: 0 }
    ]);
    expect(
      sqlite
        .prepare('SELECT amount_minor, base_amount_idr FROM accounting_events WHERE id = ?')
        .get(reversal.accountingEventId)
    ).toEqual({ amount_minor: 1000, base_amount_idr: 16_000_000 });
  });

  it('rejects posting into a closed period', async () => {
    const { services, sqlite } = await createSeededTestServices();
    insertDraftJournal(sqlite);
    services.accounting.submitJournal('journal-draft-test', 'USR-MAKER');
    services.accounting.approveJournal('journal-draft-test', 'USR-CHECKER');
    sqlite.prepare("UPDATE accounting_periods SET status = 'LOCKED'").run();

    expect(() => services.accounting.postJournal('journal-draft-test', 'USR-POSTER')).toThrow(
      /No open accounting period/u
    );
  });
});
