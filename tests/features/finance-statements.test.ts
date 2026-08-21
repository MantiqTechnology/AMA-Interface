import { describe, expect, it } from 'vitest';
import { createScenarioTestServices } from '../helpers/demo-db';

type Scenario = Awaited<ReturnType<typeof createScenarioTestServices>>;

function postJournal(context: Scenario, journalId: string) {
  context.services.accounting.submitJournal(journalId, 'USR-FINANCE-MAKER');
  context.services.accounting.approveJournal(journalId, 'USR-DIRECTOR');
  context.services.accounting.postJournal(journalId, 'USR-FINANCE-REVIEWER');
}

async function reportingScenario() {
  const context = await createScenarioTestServices();
  context.services.financeHandoffs.bridgePendingSources();
  const flightId = 'fop-closed-djj-wmx';
  const handoffs = context.services.financeHandoffs
    .list({ limit: 250, offset: 0 })
    .filter((item) => item.dimensions.FLIGHT === flightId);
  for (const item of handoffs) {
    const accepted = context.services.financeHandoffs.accept(item.id, 'USR-FINANCE-REVIEWER');
    if (accepted.status === 'JOURNAL_CREATED' && accepted.journalId) {
      postJournal(context, accepted.journalId);
      context.services.financeHandoffs.retry(item.id, 'USR-FINANCE-REVIEWER');
    }
  }
  return context;
}

describe('Finance Phase 2 GL-backed reporting', () => {
  it('reconciles Profit and Loss to posted revenue and expense GL activity', async () => {
    const { services, sqlite } = await reportingScenario();
    const report = services.financeReporting.profitAndLoss({ period: '2026-07' });
    const gl = sqlite
      .prepare(
        `SELECT account.account_type,
        COALESCE(SUM(line.base_debit_idr), 0) debit, COALESCE(SUM(line.base_credit_idr), 0) credit
      FROM journal_lines line JOIN journal_entries journal ON journal.id = line.journal_entry_id
      JOIN chart_of_accounts account ON account.id = line.account_id
      WHERE journal.status = 'POSTED' AND journal.posting_date BETWEEN '2026-07-01' AND '2026-07-31T23:59:59.999Z'
        AND account.account_type IN ('REVENUE', 'EXPENSE') GROUP BY account.account_type`
      )
      .all() as Array<{ account_type: string; debit: number; credit: number }>;
    const revenue = gl.find((row) => row.account_type === 'REVENUE');
    const expense = gl.find((row) => row.account_type === 'EXPENSE');
    expect(report.totals).toMatchObject({
      revenueMinor: (revenue?.credit ?? 0) - (revenue?.debit ?? 0),
      expenseMinor: (expense?.debit ?? 0) - (expense?.credit ?? 0)
    });
    expect(report.totals.profitLossMinor).toBe(
      report.totals.revenueMinor - report.totals.expenseMinor
    );
    expect(report.lines.every((line) => line.source === 'POSTED_GL')).toBe(true);
    sqlite.close();
  });

  it('reconciles Balance Sheet to cumulative GL and balances with current earnings', async () => {
    const { services, sqlite } = await reportingScenario();
    const report = services.financeReporting.balanceSheet({ period: '2026-07' });
    expect(report.totals.assetsMinor).toBe(
      report.totals.liabilitiesMinor + report.totals.equityMinor
    );
    expect(report.totals.differenceMinor).toBe(0);
    expect(
      report.sections
        .flatMap((section) => section.accounts)
        .every((line) => line.source === 'POSTED_GL')
    ).toBe(true);
    const cumulative = sqlite
      .prepare(
        `SELECT
      COALESCE(SUM(CASE WHEN account.account_type = 'ASSET' THEN line.base_debit_idr-line.base_credit_idr ELSE 0 END), 0) assets,
      COALESCE(SUM(CASE WHEN account.account_type = 'LIABILITY' THEN line.base_credit_idr-line.base_debit_idr ELSE 0 END), 0) liabilities
      FROM journal_lines line JOIN journal_entries journal ON journal.id=line.journal_entry_id
      JOIN chart_of_accounts account ON account.id=line.account_id
      WHERE journal.status='POSTED' AND journal.posting_date <= '2026-07-31T23:59:59.999Z'`
      )
      .get() as { assets: number; liabilities: number };
    expect(report.totals.assetsMinor).toBe(cumulative.assets);
    expect(report.totals.liabilitiesMinor).toBe(cumulative.liabilities);
    sqlite.close();
  });

  it('serves dashboard revenue, expense, and profit from the same statement backend', async () => {
    const { services, sqlite } = await reportingScenario();
    const firstDay = services.accounting.postCanonicalEvent(
      {
        eventType: 'ACCRUAL_POSTED',
        sourceType: 'ACCRUAL',
        sourceId: 'first-day-reporting',
        productAccountingProfileId: null,
        accountingDate: '2026-07-01',
        transactionDate: '2026-07-01',
        documentDate: null,
        serviceDate: null,
        amountMinor: 123_456,
        currencyId: 'cur-idr',
        currencyCode: 'IDR',
        exchangeRateToIdrMicros: 1_000_000,
        baseAmountIdr: 123_456,
        stationId: 'st-djj',
        aircraftId: null,
        flightId: null,
        workOrderReference: null,
        costCenterId: 'st-djj',
        payload: {},
        memo: 'First day activity'
      },
      'USR-FINANCE-REVIEWER'
    );
    expect(firstDay.journalStatus).toBe('POSTED');
    const statement = services.financeReporting.profitAndLoss({ period: '2026-07' });
    const dashboard = services.financeReporting.dashboard({ period: '2026-07' });
    const metrics = Object.fromEntries(
      dashboard.metrics.map((metric) => [metric.key, metric.valueMinor])
    );
    expect(metrics).toMatchObject({
      REVENUE: statement.totals.revenueMinor,
      EXPENSE: statement.totals.expenseMinor,
      NET_INCOME: statement.totals.profitLossMinor
    });
    const controlBalance = (accountCode: string) =>
      Number(
        (
          sqlite
            .prepare(
              `SELECT COALESCE(SUM(
      CASE WHEN account.normal_balance = 'DEBIT' THEN line.base_debit_idr-line.base_credit_idr
           ELSE line.base_credit_idr-line.base_debit_idr END), 0) amount
      FROM journal_lines line JOIN journal_entries journal ON journal.id=line.journal_entry_id
      JOIN chart_of_accounts account ON account.id=line.account_id
      WHERE journal.status='POSTED' AND journal.posting_date <= '2026-07-31T23:59:59.999Z'
        AND account.account_code = ?`
            )
            .get(accountCode) as { amount: number }
        ).amount
      );
    expect(metrics.AR).toBe(controlBalance('1100'));
    expect(metrics.AP).toBe(controlBalance('2000'));
    expect(dashboard.controls.map((control) => control.label)).toEqual(
      expect.arrayContaining(['Finance handoff pending', 'Bank reconciliation'])
    );
    sqlite.close();
  });

  it('builds flight, route, and station profitability only from attributed posted GL lines', async () => {
    const { services, sqlite } = await reportingScenario();
    const report = services.financeReporting.aviationProfitability({ period: '2026-07' });
    const flight = report.flights.find((item) => item.id === 'fop-closed-djj-wmx');
    expect(report.attributionMethod).toBe('POSTED_GL_DIMENSIONS');
    expect(flight).toMatchObject({
      revenueMinor: 28_000_000,
      costs: { fuelMinor: 9_250_000, handlingMinor: 2_750_000, maintenanceMinor: 650_000 },
      costMinor: 12_650_000,
      marginMinor: 15_350_000
    });
    expect(flight?.evidence.map((item) => item.accountCode)).toEqual(
      expect.arrayContaining(['4100', '5100', '5200', '5400'])
    );
    expect(
      flight?.evidence.every((item) => item.journalId && item.accountingEventId && item.sourceId)
    ).toBe(true);
    expect(report.routes.some((item) => item.flightIds.includes('fop-closed-djj-wmx'))).toBe(true);
    expect(report.stations.some((item) => item.flightIds.includes('fop-closed-djj-wmx'))).toBe(
      true
    );

    const glAttributed = Number(
      (
        sqlite
          .prepare(
            `SELECT COALESCE(SUM(CASE
        WHEN account.account_type='REVENUE' THEN line.base_credit_idr-line.base_debit_idr
        WHEN account.account_type='EXPENSE' THEN -(line.base_debit_idr-line.base_credit_idr) ELSE 0 END), 0) amount
      FROM journal_lines line JOIN journal_entries journal ON journal.id=line.journal_entry_id
      JOIN chart_of_accounts account ON account.id=line.account_id
      WHERE journal.status='POSTED' AND journal.posting_date BETWEEN '2026-07-01' AND '2026-07-31T23:59:59.999Z'
        AND line.flight_id IS NOT NULL`
          )
          .get() as { amount: number }
      ).amount
    );
    expect(report.totals.marginMinor).toBe(glAttributed);
    sqlite.close();
  });
});
