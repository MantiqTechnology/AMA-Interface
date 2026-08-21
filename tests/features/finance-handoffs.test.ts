import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

describe('Canonical Finance handoff', () => {
  it('bridges source-owned inventory records without mutating their lifecycle', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = sqlite
      .prepare(
        `SELECT id, integration_status FROM inventory_accounting_events
         ORDER BY created_at, id`
      )
      .all();

    const summary = services.financeHandoffs.bridgePendingSources();
    const handoffs = services.financeHandoffs.list({
      sourceModule: 'INVENTORY',
      status: 'RECEIVED',
      limit: 100,
      offset: 0
    });

    expect(summary.received).toBeGreaterThan(0);
    expect(handoffs.length).toBeGreaterThan(0);
    expect(
      sqlite
        .prepare(
          `SELECT id, integration_status FROM inventory_accounting_events
           ORDER BY created_at, id`
        )
        .all()
    ).toEqual(before);
    expect(handoffs[0]).toMatchObject({
      sourceModule: 'INVENTORY',
      sourceType: 'INVENTORY_ACCOUNTING_EVENT',
      status: 'RECEIVED'
    });
    const modules = services.financeHandoffs
      .list({ limit: 250, offset: 0 })
      .map((item) => item.sourceModule);
    expect(modules).toEqual(
      expect.arrayContaining([
        'FLIGHT_OPERATIONS',
        'TICKETING',
        'INVENTORY',
        'PROCUREMENT',
        'FUEL',
        'MRO'
      ])
    );

    sqlite.close();
  });

  it('accepts an inventory handoff through AccountingService and retries idempotently', async () => {
    const { services, sqlite } = await createSeededTestServices();
    services.financeHandoffs.bridgePendingSources();
    const [handoff] = services.financeHandoffs.list({
      sourceModule: 'INVENTORY',
      status: 'RECEIVED',
      limit: 100,
      offset: 0
    });
    expect(handoff).toBeDefined();
    const journalsBefore = sqlite
      .prepare('SELECT COUNT(*) AS count FROM journal_entries')
      .get() as { count: number };

    const accepted = services.financeHandoffs.accept(handoff.id, 'USR-FINANCE-REVIEWER');
    const retried = services.financeHandoffs.retry(handoff.id, 'USR-FINANCE-REVIEWER');
    const journalsAfter = sqlite.prepare('SELECT COUNT(*) AS count FROM journal_entries').get() as {
      count: number;
    };

    expect(accepted.status).toBe('JOURNAL_CREATED');
    expect(accepted.accountingEventId).toEqual(expect.any(String));
    expect(accepted.journalId).toEqual(expect.any(String));
    expect(retried.journalId).toBe(accepted.journalId);
    expect(journalsAfter.count - journalsBefore.count).toBe(1);
    expect(
      sqlite
        .prepare(
          `SELECT to_status FROM finance_handoff_status_history
           WHERE handoff_id = ? ORDER BY rowid`
        )
        .all(handoff.id)
        .map((row) => (row as { to_status: string }).to_status)
    ).toEqual([
      'RECEIVED',
      'VALIDATING',
      'VALIDATED',
      'ACCEPTED',
      'ACCOUNTING_EVENT_CREATED',
      'JOURNAL_CREATED'
    ]);

    sqlite.close();
  });

  it('records a visible exception when validation rejects an invalid amount', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const handoff = services.financeHandoffs.receive({
      sourceModule: 'MRO',
      sourceType: 'MAINTENANCE_COST',
      sourceId: 'mro-cost-invalid-001',
      sourceEventId: 'mro-cost-invalid-001',
      transactionDate: '2026-07-10T10:00:00.000Z',
      currencyCode: 'IDR',
      amountMinor: 0,
      dimensions: { WORK_PACKAGE: 'WP-INVALID-001' },
      payload: {},
      createdBy: 'SYSTEM-MRO'
    });

    const validated = services.financeHandoffs.validate(handoff.id, 'USR-FINANCE-REVIEWER');

    expect(validated).toMatchObject({
      status: 'EXCEPTION',
      errorCode: 'INVALID_AMOUNT'
    });
    expect(
      sqlite
        .prepare(
          `SELECT to_status, error_code FROM finance_handoff_status_history
           WHERE handoff_id = ? ORDER BY created_at DESC LIMIT 1`
        )
        .get(handoff.id)
    ).toEqual({ to_status: 'EXCEPTION', error_code: 'INVALID_AMOUNT' });

    sqlite.close();
  });
});
