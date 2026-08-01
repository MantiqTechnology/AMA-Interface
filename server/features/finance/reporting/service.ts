import type Database from 'better-sqlite3';
import type {
  FinanceActionDto,
  FinanceBusinessLineDto,
  FinanceDashboardDto,
  FinanceMetricDto,
  FinanceProfitabilityDto,
  FinanceReportingPeriodDto,
  FinanceReportingQuery,
  FinanceRouteRevenueDto,
  FinanceTrialBalanceDto,
  TrialBalanceAccountDto
} from '../../../../shared/features/finance/reporting';
import { DomainError } from '../../../utils/errors';
import { getApplicationNow } from '../../../utils/time';

type SqlRow = Record<string, unknown>;

const amount = (value: unknown) => Math.trunc(Number(value ?? 0));

function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function direction(change: number | null): FinanceMetricDto['direction'] {
  if (change === null) return 'NOT_AVAILABLE';
  if (change > 0) return 'UP';
  if (change < 0) return 'DOWN';
  return 'FLAT';
}

function grossMargin(revenue: number, cost: number) {
  if (revenue === 0) return null;
  return Math.round(((revenue - cost) / revenue) * 1000) / 10;
}

function allocateMinor(total: number, weights: number[]) {
  const zero = BigInt(0);
  const safeTotal = BigInt(Math.max(0, Math.trunc(total)));
  const safeWeights = weights.map((value) => BigInt(Math.max(0, Math.trunc(value))));
  const weightTotal = safeWeights.reduce((sum, value) => sum + value, zero);
  if (safeTotal === zero || weightTotal === zero) return weights.map(() => 0);

  const shares = safeWeights.map((weight) => (safeTotal * weight) / weightTotal);
  const allocated = shares.reduce((sum, value) => sum + value, zero);
  const remainder = safeTotal - allocated;
  const largestIndex = safeWeights.reduce(
    (best, value, index) => (value > (safeWeights[best] ?? zero) ? index : best),
    0
  );
  shares[largestIndex] = (shares[largestIndex] ?? zero) + remainder;
  return shares.map(Number);
}

export class FinanceReportingService {
  constructor(
    private readonly sqlite: Database.Database,
    private readonly now: () => string = getApplicationNow
  ) {}

  listPeriods(): FinanceReportingPeriodDto[] {
    return this.sqlite
      .prepare(
        `SELECT period_code AS code, period_name AS name, start_date AS startDate,
                end_date AS endDate, status
         FROM accounting_periods
         ORDER BY CASE
                    WHEN start_date <= @date AND end_date >= @date THEN 0
                    WHEN end_date < @date THEN 1
                    ELSE 2
                  END,
                  CASE WHEN end_date < @date THEN start_date END DESC,
                  start_date`
      )
      .all({ date: this.now().slice(0, 10) }) as FinanceReportingPeriodDto[];
  }

  trialBalance(query: FinanceReportingQuery): FinanceTrialBalanceDto {
    const period = this.resolvePeriod(query.period);
    const rows = this.sqlite
      .prepare(
        `SELECT account.id, account.account_code AS code, account.account_name AS name,
                account.account_type AS accountType, account.normal_balance AS normalBalance,
                COALESCE(balance.debitMinor, 0) AS debitMinor,
                COALESCE(balance.creditMinor, 0) AS creditMinor
         FROM chart_of_accounts account
         LEFT JOIN (
           SELECT line.account_id,
                  SUM(line.base_debit_idr) AS debitMinor,
                  SUM(line.base_credit_idr) AS creditMinor
           FROM journal_lines line
           JOIN journal_entries entry ON entry.id = line.journal_entry_id
           WHERE entry.status = 'POSTED' AND entry.posting_date <= @endDate
           GROUP BY line.account_id
         ) balance ON balance.account_id = account.id
         WHERE account.is_active = 1
         ORDER BY account.account_code`
      )
      .all({ endDate: `${period.endDate}T23:59:59.999Z` }) as SqlRow[];

    const accounts: TrialBalanceAccountDto[] = rows.map((row) => {
      const normalBalance = String(row.normalBalance) === 'CREDIT' ? 'CREDIT' : 'DEBIT';
      const debitMinor = amount(row.debitMinor);
      const creditMinor = amount(row.creditMinor);
      const balanceMinor =
        normalBalance === 'DEBIT' ? debitMinor - creditMinor : creditMinor - debitMinor;
      const name = String(row.name);
      const isCash = String(row.code).startsWith('10') || name.toLowerCase().includes('cash');
      return {
        id: String(row.id),
        code: String(row.code),
        name,
        accountType: this.accountType(row.accountType),
        normalBalance,
        debitMinor,
        creditMinor,
        balanceMinor,
        abnormal: balanceMinor < 0,
        negativeCash: isCash && balanceMinor < 0
      };
    });
    const debitMinor = accounts.reduce((sum, row) => sum + row.debitMinor, 0);
    const creditMinor = accounts.reduce((sum, row) => sum + row.creditMinor, 0);
    const differenceMinor = debitMinor - creditMinor;

    return {
      period,
      currencyCode: 'IDR',
      accounts,
      totals: {
        debitMinor,
        creditMinor,
        differenceMinor,
        balanced: differenceMinor === 0,
        abnormalAccountCount: accounts.filter((row) => row.abnormal).length,
        negativeCashCount: accounts.filter((row) => row.negativeCash).length
      },
      asOf: this.now()
    };
  }

  profitability(query: FinanceReportingQuery): FinanceProfitabilityDto {
    const period = this.resolvePeriod(query.period);
    const rows = this.sqlite
      .prepare(
        `SELECT snapshot.ticket_revenue AS passengerRevenue,
                snapshot.cargo_revenue AS cargoRevenue,
                snapshot.charter_revenue AS charterRevenue,
                snapshot.fuel_cost AS fuelCost,
                snapshot.station_cost AS stationCost,
                snapshot.maintenance_cost AS maintenanceCost
         FROM invoice_finance_snapshots snapshot
         JOIN flight_operations flight ON flight.id = snapshot.flight_operation_id
         WHERE snapshot.currency_code = 'IDR'
           AND flight.flight_date BETWEEN @startDate AND @endDate`
      )
      .all(period) as SqlRow[];

    const ids = ['CHARTER', 'PASSENGER', 'CARGO'] as const;
    const revenueKeys = ['charterRevenue', 'passengerRevenue', 'cargoRevenue'] as const;
    const costs = ids.map(() => ({ fuelMinor: 0, stationMinor: 0, maintenanceMinor: 0 }));
    const revenue = ids.map(() => 0);

    for (const row of rows) {
      const weights = revenueKeys.map((key) => amount(row[key]));
      weights.forEach((value, index) => {
        revenue[index] = (revenue[index] ?? 0) + value;
      });
      const fuel = allocateMinor(amount(row.fuelCost), weights);
      const station = allocateMinor(amount(row.stationCost), weights);
      const maintenance = allocateMinor(amount(row.maintenanceCost), weights);
      costs.forEach((entry, index) => {
        entry.fuelMinor += fuel[index] ?? 0;
        entry.stationMinor += station[index] ?? 0;
        entry.maintenanceMinor += maintenance[index] ?? 0;
      });
    }

    const labels = { CHARTER: 'Charter', PASSENGER: 'Passenger', CARGO: 'Cargo' } as const;
    const lines: FinanceBusinessLineDto[] = ids.map((id, index) => {
      const revenueMinor = revenue[index] ?? 0;
      const cost = costs[index] ?? { fuelMinor: 0, stationMinor: 0, maintenanceMinor: 0 };
      const costMinor = cost.fuelMinor + cost.stationMinor + cost.maintenanceMinor;
      return {
        id,
        label: labels[id],
        revenueMinor,
        costMinor,
        grossProfitMinor: revenueMinor - costMinor,
        grossMarginPercent: grossMargin(revenueMinor, costMinor),
        costs: cost
      };
    });
    const revenueMinor = lines.reduce((sum, line) => sum + line.revenueMinor, 0);
    const costMinor = lines.reduce((sum, line) => sum + line.costMinor, 0);

    return {
      period,
      currencyCode: 'IDR',
      allocationMethod: 'REVENUE_SHARE_PER_FLIGHT',
      lines,
      totals: {
        revenueMinor,
        costMinor,
        grossProfitMinor: revenueMinor - costMinor,
        grossMarginPercent: grossMargin(revenueMinor, costMinor)
      },
      asOf: this.now()
    };
  }

  dashboard(query: FinanceReportingQuery): FinanceDashboardDto {
    const period = this.resolvePeriod(query.period);
    const previous = this.previousPeriod(period);
    const currentActivity = this.periodActivity(period);
    const previousActivity = previous ? this.periodActivity(previous) : { revenue: 0, expense: 0 };
    const trialBalance = this.trialBalance({ period: period.code });
    const profitability = this.profitability({ period: period.code });
    const cash = trialBalance.accounts
      .filter((row) => row.code.startsWith('10') || row.name.toLowerCase().includes('cash'))
      .reduce((sum, row) => sum + row.balanceMinor, 0);
    const overdue = this.overdueReceivables(period.endDate);
    const revenueChange = percentChange(currentActivity.revenue, previousActivity.revenue);
    const expenseChange = percentChange(currentActivity.expense, previousActivity.expense);
    const netIncome = currentActivity.revenue - currentActivity.expense;
    const previousNetIncome = previousActivity.revenue - previousActivity.expense;
    const netChange = percentChange(netIncome, previousNetIncome);
    const metrics: FinanceMetricDto[] = [
      {
        key: 'REVENUE',
        label: 'Recognized Revenue',
        valueMinor: currentActivity.revenue,
        changePercent: revenueChange,
        direction: direction(revenueChange),
        tone: 'SUCCESS',
        caption: 'Posted revenue accounts for the selected period.'
      },
      {
        key: 'EXPENSE',
        label: 'Operating Expense',
        valueMinor: currentActivity.expense,
        changePercent: expenseChange,
        direction: direction(expenseChange),
        tone: expenseChange !== null && expenseChange > 0 ? 'WARNING' : 'NEUTRAL',
        caption: 'Posted expense accounts for the selected period.'
      },
      {
        key: 'NET_INCOME',
        label: 'Net Result',
        valueMinor: netIncome,
        changePercent: netChange,
        direction: direction(netChange),
        tone: netIncome >= 0 ? 'SUCCESS' : 'DANGER',
        caption: 'Recognized revenue less posted expenses.'
      },
      {
        key: 'CASH',
        label: 'Cash Position',
        valueMinor: cash,
        changePercent: null,
        direction: 'NOT_AVAILABLE',
        tone: cash >= 0 ? 'SUCCESS' : 'DANGER',
        caption: `Posted cash balance as of ${period.endDate}.`
      },
      {
        key: 'OVERDUE_AR',
        label: 'Overdue Receivables',
        valueMinor: overdue.balance,
        changePercent: null,
        direction: 'NOT_AVAILABLE',
        tone: overdue.balance > 0 ? 'WARNING' : 'SUCCESS',
        caption: `${overdue.count} issued invoices past due.`
      }
    ];

    const routes = this.routeRevenue(period);
    const actions = this.actions(period, overdue);
    const controls = [
      {
        label: 'Trial balance',
        value: trialBalance.totals.balanced ? 'Balanced' : 'Out of balance',
        status: trialBalance.totals.balanced ? ('SUCCESS' as const) : ('DANGER' as const),
        route: `/finance/trial-balance?period=${period.code}`
      },
      {
        label: 'Open exceptions',
        value: String(this.openExceptionCount()),
        status: this.openExceptionCount() > 0 ? ('WARNING' as const) : ('SUCCESS' as const),
        route: '/finance/accounting?tab=exceptions'
      },
      {
        label: 'Period status',
        value: period.status,
        status: period.status === 'OPEN' ? ('NEUTRAL' as const) : ('WARNING' as const),
        route: null
      },
      {
        label: 'Posted journals',
        value: String(this.postedJournalCount(period)),
        status: 'NEUTRAL' as const,
        route: '/finance/accounting?tab=general-journal'
      }
    ];

    return {
      period,
      currencyCode: 'IDR',
      metrics,
      controls,
      profitability: profitability.lines,
      busiestRoutes: routes.slice(0, 5).map((row, index) => ({ ...row, rank: index + 1 })),
      quietestRoutes:
        routes.length > 1
          ? [...routes]
              .reverse()
              .slice(0, 5)
              .map((row, index) => ({ ...row, rank: index + 1 }))
          : [],
      actions,
      asOf: this.now()
    };
  }

  private resolvePeriod(code?: string) {
    const row = code
      ? (this.sqlite
          .prepare(
            `SELECT period_code AS code, period_name AS name, start_date AS startDate,
                    end_date AS endDate, status
             FROM accounting_periods WHERE period_code = ?`
          )
          .get(code) as FinanceReportingPeriodDto | undefined)
      : (this.sqlite
          .prepare(
            `SELECT period_code AS code, period_name AS name, start_date AS startDate,
                    end_date AS endDate, status
             FROM accounting_periods
             ORDER BY CASE WHEN start_date <= @date AND end_date >= @date THEN 0 ELSE 1 END,
                      start_date DESC
             LIMIT 1`
          )
          .get({ date: this.now().slice(0, 10) }) as FinanceReportingPeriodDto | undefined);
    if (!row) {
      throw new DomainError(
        'FINANCE_PERIOD_NOT_FOUND',
        code ? `Accounting period ${code} was not found.` : 'No accounting period is available.',
        404
      );
    }
    return row;
  }

  private previousPeriod(period: FinanceReportingPeriodDto) {
    return this.sqlite
      .prepare(
        `SELECT period_code AS code, period_name AS name, start_date AS startDate,
                end_date AS endDate, status
         FROM accounting_periods
         WHERE end_date < ?
         ORDER BY end_date DESC
         LIMIT 1`
      )
      .get(period.startDate) as FinanceReportingPeriodDto | undefined;
  }

  private periodActivity(period: FinanceReportingPeriodDto) {
    const rows = this.sqlite
      .prepare(
        `SELECT account.account_type AS accountType,
                SUM(line.base_debit_idr) AS debitMinor,
                SUM(line.base_credit_idr) AS creditMinor
         FROM journal_lines line
         JOIN journal_entries entry ON entry.id = line.journal_entry_id
         JOIN chart_of_accounts account ON account.id = line.account_id
         WHERE entry.status = 'POSTED'
           AND entry.posting_date BETWEEN @startDate AND @endDateTime
           AND account.account_type IN ('REVENUE', 'EXPENSE')
         GROUP BY account.account_type`
      )
      .all({
        startDate: `${period.startDate}T00:00:00.000Z`,
        endDateTime: `${period.endDate}T23:59:59.999Z`
      }) as SqlRow[];
    const row = (type: string) => rows.find((item) => item.accountType === type);
    const revenue = row('REVENUE');
    const expense = row('EXPENSE');
    return {
      revenue: amount(revenue?.creditMinor) - amount(revenue?.debitMinor),
      expense: amount(expense?.debitMinor) - amount(expense?.creditMinor)
    };
  }

  private overdueReceivables(endDate: string) {
    return this.sqlite
      .prepare(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(MAX(invoice.total - COALESCE(payment.paid, 0), 0)), 0) AS balance
         FROM invoices invoice
         LEFT JOIN (
           SELECT invoice_id, SUM(amount) AS paid
           FROM payments
           GROUP BY invoice_id
         ) payment ON payment.invoice_id = invoice.id
         WHERE invoice.currency = 'IDR'
           AND invoice.status NOT IN ('paid', 'void', 'draft')
           AND invoice.due_at IS NOT NULL
           AND invoice.due_at <= ?`
      )
      .get(`${endDate}T23:59:59.999Z`) as { count: number; balance: number };
  }

  private routeRevenue(period: FinanceReportingPeriodDto): FinanceRouteRevenueDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT origin.station_code || ' - ' || destination.station_code AS route,
                SUM(snapshot.total_revenue) AS revenueMinor
         FROM invoice_finance_snapshots snapshot
         JOIN flight_operations flight ON flight.id = snapshot.flight_operation_id
         JOIN stations origin ON origin.id = flight.origin_station_id
         JOIN stations destination ON destination.id = flight.destination_station_id
         WHERE snapshot.currency_code = 'IDR'
           AND flight.flight_date BETWEEN @startDate AND @endDate
         GROUP BY origin.station_code, destination.station_code
         ORDER BY revenueMinor DESC, route`
      )
      .all(period) as Array<{ route: string; revenueMinor: number }>;
    return rows.map((row, index) => ({
      rank: index + 1,
      route: row.route,
      revenueMinor: amount(row.revenueMinor)
    }));
  }

  private openExceptionCount() {
    return amount(
      (
        this.sqlite
          .prepare("SELECT COUNT(*) AS count FROM accounting_exceptions WHERE status = 'OPEN'")
          .get() as { count: number }
      ).count
    );
  }

  private postedJournalCount(period: FinanceReportingPeriodDto) {
    return amount(
      (
        this.sqlite
          .prepare(
            `SELECT COUNT(*) AS count
             FROM journal_entries entry
             JOIN accounting_periods period ON period.id = entry.period_id
             WHERE entry.status = 'POSTED' AND period.period_code = ?`
          )
          .get(period.code) as { count: number }
      ).count
    );
  }

  private actions(
    period: FinanceReportingPeriodDto,
    overdue: { count: number; balance: number }
  ): FinanceActionDto[] {
    const actions: FinanceActionDto[] = [];
    if (overdue.balance > 0) {
      actions.push({
        id: 'overdue-ar',
        title: 'Overdue receivables',
        detail: `${overdue.count} issued invoices are past due.`,
        value: String(amount(overdue.balance)),
        tone: 'WARNING',
        route: '/invoices?due=overdue'
      });
    }
    const exceptions = this.openExceptionCount();
    if (exceptions > 0) {
      actions.push({
        id: 'accounting-exceptions',
        title: 'Accounting exceptions',
        detail: 'Policy or context issues require Finance review.',
        value: `${exceptions} open`,
        tone: 'DANGER',
        route: '/finance/accounting?tab=exceptions'
      });
    }
    const subsidy = this.sqlite
      .prepare(
        `SELECT COUNT(*) AS count
         FROM contract_subsidy_programs program
         LEFT JOIN (
           SELECT program_id, SUM(amount_minor) AS consumed
           FROM contract_subsidy_consumptions
           WHERE status = 'RECOGNIZED'
           GROUP BY program_id
         ) consumption ON consumption.program_id = program.id
         WHERE program.lifecycle_status = 'ACTIVE'
           AND program.currency_code = 'IDR'
           AND program.allocated_budget_minor > 0
           AND COALESCE(consumption.consumed, 0) * 100 >= program.allocated_budget_minor * 80`
      )
      .get() as { count: number };
    if (subsidy.count > 0) {
      actions.push({
        id: 'subsidy-absorption',
        title: 'Contract and subsidy absorption',
        detail: 'Programs at or above 80% require commercial review.',
        value: `${subsidy.count} programs`,
        tone: 'WARNING',
        route: '/marketing/contracts-subsidies?tab=absorption'
      });
    }
    if (period.status !== 'OPEN') {
      actions.push({
        id: 'period-status',
        title: 'Reporting period is not open',
        detail: 'Posting is restricted by the accounting period lifecycle.',
        value: period.status,
        tone: 'WARNING',
        route: '/finance/accounting'
      });
    }
    return actions;
  }

  private accountType(value: unknown): TrialBalanceAccountDto['accountType'] {
    const type = String(value);
    if (['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].includes(type)) {
      return type as TrialBalanceAccountDto['accountType'];
    }
    throw new DomainError('FINANCE_ACCOUNT_TYPE_INVALID', `Unsupported account type ${type}.`, 500);
  }
}
