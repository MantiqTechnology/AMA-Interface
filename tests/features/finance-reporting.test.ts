import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

describe('Finance reporting read model', () => {
  it('orders the application-date accounting period first', async () => {
    const context = await createSeededTestServices();
    const periods = context.services.financeReporting.listPeriods();

    expect(periods[0]).toMatchObject({ code: '2026-07', status: 'OPEN' });
  });

  it('builds a balanced Trial Balance from posted journal lines only', async () => {
    const context = await createSeededTestServices();
    context.services.accounting.postDemoEvents({ source: 'all' }, 'USR-FINANCE-REVIEWER');

    const report = context.services.financeReporting.trialBalance({ period: '2026-07' });
    const postedTotals = context.sqlite
      .prepare(
        `SELECT COALESCE(SUM(line.base_debit_idr), 0) AS debit,
                COALESCE(SUM(line.base_credit_idr), 0) AS credit
         FROM journal_lines line
         JOIN journal_entries entry ON entry.id = line.journal_entry_id
         WHERE entry.status = 'POSTED'
           AND entry.posting_date <= '2026-07-31T23:59:59.999Z'`
      )
      .get() as { debit: number; credit: number };

    expect(report.totals).toMatchObject({
      debitMinor: postedTotals.debit,
      creditMinor: postedTotals.credit,
      differenceMinor: 0,
      balanced: true
    });
    expect(report.accounts).toContainEqual(
      expect.objectContaining({ code: '1000', normalBalance: 'DEBIT' })
    );
  });

  it('allocates immutable invoice snapshot cost without changing the total', async () => {
    const context = await createSeededTestServices();
    const report = context.services.financeReporting.profitability({ period: '2026-07' });
    const snapshot = context.sqlite
      .prepare(
        `SELECT COALESCE(SUM(snapshot.total_revenue), 0) AS revenue,
                COALESCE(SUM(snapshot.total_operational_cost), 0) AS cost
         FROM invoice_finance_snapshots snapshot
         JOIN flight_operations flight ON flight.id = snapshot.flight_operation_id
         WHERE snapshot.currency_code = 'IDR'
           AND flight.flight_date BETWEEN '2026-07-01' AND '2026-07-31'`
      )
      .get() as { revenue: number; cost: number };

    expect(report.allocationMethod).toBe('REVENUE_SHARE_PER_FLIGHT');
    expect(report.totals.revenueMinor).toBe(snapshot.revenue);
    expect(report.totals.costMinor).toBe(snapshot.cost);
    expect(report.lines.reduce((sum, line) => sum + line.costMinor, 0)).toBe(snapshot.cost);
  });

  it('returns dashboard controls and metrics without persisting a second balance', async () => {
    const context = await createSeededTestServices();
    context.services.accounting.postDemoEvents({ source: 'all' }, 'USR-FINANCE-REVIEWER');
    const before = context.sqlite
      .prepare('SELECT COUNT(*) AS count FROM journal_entries')
      .get() as { count: number };

    const dashboard = context.services.financeReporting.dashboard({ period: '2026-07' });
    const after = context.sqlite.prepare('SELECT COUNT(*) AS count FROM journal_entries').get() as {
      count: number;
    };

    expect(dashboard.metrics.map((metric) => metric.key)).toEqual([
      'REVENUE',
      'EXPENSE',
      'NET_INCOME',
      'CASH',
      'OVERDUE_AR'
    ]);
    expect(dashboard.controls).toContainEqual(
      expect.objectContaining({ label: 'Trial balance', value: 'Balanced' })
    );
    expect(after.count).toBe(before.count);
  });

  it('rejects an unknown reporting period', async () => {
    const context = await createSeededTestServices();

    expect(() => context.services.financeReporting.dashboard({ period: '2099-12' })).toThrowError(
      /Accounting period 2099-12 was not found/u
    );
  });
});
