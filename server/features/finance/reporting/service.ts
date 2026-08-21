import type Database from 'better-sqlite3';
import type {
  AviationProfitabilityDto,
  AviationProfitabilityEvidenceDto,
  AviationProfitabilityUnitDto,
  BalanceSheetDto,
  FinanceActionDto,
  FinanceBusinessLineDto,
  FinanceDashboardDto,
  FinanceMetricDto,
  FinanceProfitabilityDto,
  FinanceReportingPeriodDto,
  FinanceReportingQuery,
  FinanceRouteRevenueDto,
  FinanceTrialBalanceDto,
  FinancialStatementAccountDto,
  ProfitAndLossDto,
  TrialBalanceAccountDto
} from '../../../../shared/features/finance/reporting';
import { DomainError } from '../../../utils/errors';
import { getApplicationNow } from '../../../utils/time';

type SqlRow = Record<string, unknown>;

const amount = (value: unknown) => Math.trunc(Number(value ?? 0));

function grossMargin(revenue: number, cost: number) {
  if (revenue === 0) return null;
  return Math.round(((revenue - cost) / revenue) * 1000) / 10;
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

  profitAndLoss(query: FinanceReportingQuery): ProfitAndLossDto {
    const period = this.resolvePeriod(query.period);
    const rows = this.sqlite
      .prepare(
        `SELECT account.account_code, account.account_name,
        account.account_type, SUM(line.base_debit_idr) AS debit_minor,
        SUM(line.base_credit_idr) AS credit_minor
      FROM journal_lines line
      JOIN journal_entries journal ON journal.id = line.journal_entry_id
      JOIN chart_of_accounts account ON account.id = line.account_id
      WHERE journal.status = 'POSTED'
        AND journal.posting_date BETWEEN @startDate AND @endDate
        AND account.account_type IN ('REVENUE', 'EXPENSE')
      GROUP BY account.id ORDER BY account.account_code`
      )
      .all({
        startDate: period.startDate,
        endDate: `${period.endDate}T23:59:59.999Z`
      }) as SqlRow[];
    const lines: FinancialStatementAccountDto[] = rows.map((row) => ({
      accountCode: String(row.account_code),
      accountName: String(row.account_name),
      accountType: this.accountType(row.account_type),
      amountMinor:
        row.account_type === 'REVENUE'
          ? amount(row.credit_minor) - amount(row.debit_minor)
          : amount(row.debit_minor) - amount(row.credit_minor),
      source: 'POSTED_GL'
    }));
    const revenueMinor = lines
      .filter((line) => line.accountType === 'REVENUE')
      .reduce((sum, line) => sum + line.amountMinor, 0);
    const directOperatingExpense = lines
      .filter((line) => line.accountType === 'EXPENSE' && /^5[1-5]/u.test(line.accountCode))
      .reduce((sum, line) => sum + line.amountMinor, 0);
    const otherOperatingExpense = lines
      .filter((line) => line.accountType === 'EXPENSE' && !/^5[1-5]/u.test(line.accountCode))
      .reduce((sum, line) => sum + line.amountMinor, 0);
    const expenseMinor = directOperatingExpense + otherOperatingExpense;
    return {
      period,
      currencyCode: 'IDR',
      lines,
      sections: [
        { code: 'REVENUE', label: 'Revenue', amountMinor: revenueMinor },
        {
          code: 'DIRECT_OPERATING_EXPENSE',
          label: 'Direct Operating Expense',
          amountMinor: directOperatingExpense
        },
        {
          code: 'OTHER_OPERATING_EXPENSE',
          label: 'Other Operating Expense',
          amountMinor: otherOperatingExpense
        }
      ],
      totals: { revenueMinor, expenseMinor, profitLossMinor: revenueMinor - expenseMinor },
      asOf: this.now()
    };
  }

  balanceSheet(query: FinanceReportingQuery): BalanceSheetDto {
    const period = this.resolvePeriod(query.period);
    const rows = this.sqlite
      .prepare(
        `SELECT account.account_code, account.account_name,
        account.account_type, SUM(line.base_debit_idr) AS debit_minor,
        SUM(line.base_credit_idr) AS credit_minor
      FROM journal_lines line
      JOIN journal_entries journal ON journal.id = line.journal_entry_id
      JOIN chart_of_accounts account ON account.id = line.account_id
      WHERE journal.status = 'POSTED' AND journal.posting_date <= @endDate
      GROUP BY account.id ORDER BY account.account_code`
      )
      .all({
        endDate: `${period.endDate}T23:59:59.999Z`
      }) as SqlRow[];
    const statementRows = rows.filter((row) =>
      ['ASSET', 'LIABILITY', 'EQUITY'].includes(String(row.account_type))
    );
    const accounts: FinancialStatementAccountDto[] = statementRows.map((row) => ({
      accountCode: String(row.account_code),
      accountName: String(row.account_name),
      accountType: this.accountType(row.account_type),
      amountMinor:
        row.account_type === 'ASSET'
          ? amount(row.debit_minor) - amount(row.credit_minor)
          : amount(row.credit_minor) - amount(row.debit_minor),
      source: 'POSTED_GL'
    }));
    const currentEarningsMinor =
      rows
        .filter((row) => row.account_type === 'REVENUE')
        .reduce((sum, row) => sum + amount(row.credit_minor) - amount(row.debit_minor), 0) -
      rows
        .filter((row) => row.account_type === 'EXPENSE')
        .reduce((sum, row) => sum + amount(row.debit_minor) - amount(row.credit_minor), 0);
    const assets = accounts.filter((line) => line.accountType === 'ASSET');
    const liabilities = accounts.filter((line) => line.accountType === 'LIABILITY');
    const equityAccounts = accounts.filter((line) => line.accountType === 'EQUITY');
    const assetsMinor = assets.reduce((sum, line) => sum + line.amountMinor, 0);
    const liabilitiesMinor = liabilities.reduce((sum, line) => sum + line.amountMinor, 0);
    const equityMinor =
      equityAccounts.reduce((sum, line) => sum + line.amountMinor, 0) + currentEarningsMinor;
    const differenceMinor = assetsMinor - liabilitiesMinor - equityMinor;
    return {
      period,
      currencyCode: 'IDR',
      currentEarningsMinor,
      sections: [
        { code: 'ASSETS', label: 'Assets', amountMinor: assetsMinor, accounts: assets },
        {
          code: 'LIABILITIES',
          label: 'Liabilities',
          amountMinor: liabilitiesMinor,
          accounts: liabilities
        },
        { code: 'EQUITY', label: 'Equity', amountMinor: equityMinor, accounts: equityAccounts }
      ],
      totals: {
        assetsMinor,
        liabilitiesMinor,
        equityMinor,
        differenceMinor,
        balanced: differenceMinor === 0
      },
      asOf: this.now()
    };
  }

  aviationProfitability(query: FinanceReportingQuery): AviationProfitabilityDto {
    const period = this.resolvePeriod(query.period);
    const conditions = [
      "journal.status = 'POSTED'",
      'journal.posting_date BETWEEN @startDate AND @endDate',
      "account.account_type IN ('REVENUE', 'EXPENSE')",
      'line.flight_id IS NOT NULL'
    ];
    const params: Record<string, unknown> = {
      startDate: period.startDate,
      endDate: `${period.endDate}T23:59:59.999Z`
    };
    for (const [key, column] of [
      ['flightId', 'line.flight_id'],
      ['aircraftId', 'line.aircraft_id'],
      ['stationId', 'line.station_id'],
      ['routeId', 'flight.route_id']
    ] as const) {
      if (query[key]) {
        conditions.push(`${column} = @${key}`);
        params[key] = query[key];
      }
    }
    const rows = this.sqlite
      .prepare(
        `SELECT line.id AS journal_line_id, line.flight_id,
        line.station_id, line.aircraft_id, line.base_debit_idr, line.base_credit_idr,
        account.account_code, account.account_name, account.account_type,
        journal.id AS journal_id, journal.journal_number,
        event.id AS accounting_event_id, event.event_type, event.source_type, event.source_id,
        flight.flight_number, flight.route_id,
        origin.station_code || ' - ' || destination.station_code AS route_label,
        COALESCE(station.station_code, line.station_id) AS station_label
      FROM journal_lines line
      JOIN journal_entries journal ON journal.id = line.journal_entry_id
      JOIN accounting_events event ON event.id = journal.accounting_event_id
      JOIN chart_of_accounts account ON account.id = line.account_id
      LEFT JOIN flight_operations flight ON flight.id = line.flight_id
      LEFT JOIN routes route ON route.id = flight.route_id
      LEFT JOIN stations origin ON origin.id = route.origin_station_id
      LEFT JOIN stations destination ON destination.id = route.destination_station_id
      LEFT JOIN stations station ON station.id = line.station_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY flight.flight_number, account.account_code, journal.journal_number`
      )
      .all(params) as SqlRow[];

    const aggregate = (key: (row: SqlRow) => string, label: (row: SqlRow) => string) => {
      const grouped = new Map<string, AviationProfitabilityUnitDto>();
      for (const row of rows) {
        const id = key(row);
        if (!id) continue;
        let unit = grouped.get(id);
        if (!unit) {
          unit = {
            id,
            label: label(row),
            revenueMinor: 0,
            costMinor: 0,
            marginMinor: 0,
            marginPercent: null,
            costs: {
              fuelMinor: 0,
              handlingMinor: 0,
              airportStationMinor: 0,
              maintenanceMinor: 0,
              otherDirectMinor: 0
            },
            flightIds: [],
            evidence: []
          };
          grouped.set(id, unit);
        }
        const accountType = String(row.account_type);
        const value =
          accountType === 'REVENUE'
            ? amount(row.base_credit_idr) - amount(row.base_debit_idr)
            : amount(row.base_debit_idr) - amount(row.base_credit_idr);
        if (accountType === 'REVENUE') unit.revenueMinor += value;
        else {
          unit.costMinor += value;
          const code = String(row.account_code);
          if (code === '5100') unit.costs.fuelMinor += value;
          else if (code === '5200') unit.costs.handlingMinor += value;
          else if (code === '5300' || code === '5500') unit.costs.airportStationMinor += value;
          else if (code === '5400') unit.costs.maintenanceMinor += value;
          else unit.costs.otherDirectMinor += value;
        }
        const flightId = String(row.flight_id);
        if (!unit.flightIds.includes(flightId)) unit.flightIds.push(flightId);
        unit.evidence.push(this.profitabilityEvidence(row, value));
      }
      for (const unit of grouped.values()) {
        unit.marginMinor = unit.revenueMinor - unit.costMinor;
        unit.marginPercent = grossMargin(unit.revenueMinor, unit.costMinor);
      }
      return [...grouped.values()].sort(
        (a, b) => b.marginMinor - a.marginMinor || a.label.localeCompare(b.label)
      );
    };
    const flights = aggregate(
      (row) => String(row.flight_id),
      (row) => String(row.flight_number ?? row.flight_id)
    );
    const routes = aggregate(
      (row) => String(row.route_id ?? ''),
      (row) => String(row.route_label ?? row.route_id ?? 'Unattributed route')
    );
    const stations = aggregate(
      (row) => String(row.station_id ?? ''),
      (row) => String(row.station_label ?? row.station_id ?? 'Unattributed station')
    );
    const revenueMinor = flights.reduce((sum, unit) => sum + unit.revenueMinor, 0);
    const costMinor = flights.reduce((sum, unit) => sum + unit.costMinor, 0);
    return {
      period,
      currencyCode: 'IDR',
      attributionMethod: 'POSTED_GL_DIMENSIONS',
      flights,
      routes,
      stations,
      totals: {
        revenueMinor,
        costMinor,
        marginMinor: revenueMinor - costMinor,
        marginPercent: grossMargin(revenueMinor, costMinor)
      },
      asOf: this.now()
    };
  }

  trialBalance(query: FinanceReportingQuery): FinanceTrialBalanceDto {
    const period = this.resolvePeriod(query.period);
    const rows = this.sqlite
      .prepare(
        `SELECT account.id, account.account_code AS code, account.account_name AS name,
                account.is_active AS isActive,
                account.account_type AS accountType, account.normal_balance AS normalBalance,
                COALESCE(balance.openingDebitMinor, 0) AS openingDebitMinor,
                COALESCE(balance.openingCreditMinor, 0) AS openingCreditMinor,
                COALESCE(balance.periodDebitMinor, 0) AS periodDebitMinor,
                COALESCE(balance.periodCreditMinor, 0) AS periodCreditMinor,
                COALESCE(balance.debitMinor, 0) AS debitMinor,
                COALESCE(balance.creditMinor, 0) AS creditMinor
         FROM chart_of_accounts account
         LEFT JOIN (
           SELECT line.account_id,
                  SUM(CASE WHEN entry.posting_date < @startDate
                           THEN line.base_debit_idr ELSE 0 END) AS openingDebitMinor,
                  SUM(CASE WHEN entry.posting_date < @startDate
                           THEN line.base_credit_idr ELSE 0 END) AS openingCreditMinor,
                  SUM(CASE WHEN entry.posting_date >= @startDate
                            AND entry.posting_date <= @endDate
                           THEN line.base_debit_idr ELSE 0 END) AS periodDebitMinor,
                  SUM(CASE WHEN entry.posting_date >= @startDate
                            AND entry.posting_date <= @endDate
                           THEN line.base_credit_idr ELSE 0 END) AS periodCreditMinor,
                  SUM(line.base_debit_idr) AS debitMinor,
                  SUM(line.base_credit_idr) AS creditMinor
           FROM journal_lines line
           JOIN journal_entries entry ON entry.id = line.journal_entry_id
           WHERE entry.status = 'POSTED' AND entry.posting_date <= @endDate
           GROUP BY line.account_id
         ) balance ON balance.account_id = account.id
         WHERE account.is_active = 1
            OR COALESCE(balance.openingDebitMinor, 0) <> 0
            OR COALESCE(balance.openingCreditMinor, 0) <> 0
            OR COALESCE(balance.periodDebitMinor, 0) <> 0
            OR COALESCE(balance.periodCreditMinor, 0) <> 0
            OR COALESCE(balance.debitMinor, 0) <> COALESCE(balance.creditMinor, 0)
         ORDER BY account.account_code`
      )
      .all({
        startDate: period.startDate,
        endDate: `${period.endDate}T23:59:59.999Z`
      }) as SqlRow[];

    const accounts: TrialBalanceAccountDto[] = rows.map((row) => {
      const normalBalance = String(row.normalBalance) === 'CREDIT' ? 'CREDIT' : 'DEBIT';
      const openingDebitMinor = amount(row.openingDebitMinor);
      const openingCreditMinor = amount(row.openingCreditMinor);
      const periodDebitMinor = amount(row.periodDebitMinor);
      const periodCreditMinor = amount(row.periodCreditMinor);
      const debitMinor = amount(row.debitMinor);
      const creditMinor = amount(row.creditMinor);
      const openingBalanceMinor =
        normalBalance === 'DEBIT'
          ? openingDebitMinor - openingCreditMinor
          : openingCreditMinor - openingDebitMinor;
      const balanceMinor =
        normalBalance === 'DEBIT' ? debitMinor - creditMinor : creditMinor - debitMinor;
      const name = String(row.name);
      const isCash = String(row.code).startsWith('10') || name.toLowerCase().includes('cash');
      return {
        id: String(row.id),
        code: String(row.code),
        name,
        isActive: Boolean(row.isActive),
        accountType: this.accountType(row.accountType),
        normalBalance,
        openingDebitMinor,
        openingCreditMinor,
        openingBalanceMinor,
        periodDebitMinor,
        periodCreditMinor,
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
        `SELECT type.code AS business_line,
        COALESCE(SUM(CASE WHEN account.account_type = 'REVENUE'
          THEN line.base_credit_idr-line.base_debit_idr ELSE 0 END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN account.account_code = '5100'
          THEN line.base_debit_idr-line.base_credit_idr ELSE 0 END), 0) AS fuel,
        COALESCE(SUM(CASE WHEN account.account_code IN ('5200','5300','5500')
          THEN line.base_debit_idr-line.base_credit_idr ELSE 0 END), 0) AS station,
        COALESCE(SUM(CASE WHEN account.account_code = '5400'
          THEN line.base_debit_idr-line.base_credit_idr ELSE 0 END), 0) AS maintenance
      FROM journal_lines line
      JOIN journal_entries journal ON journal.id=line.journal_entry_id
      JOIN chart_of_accounts account ON account.id=line.account_id
      JOIN flight_operations flight ON flight.id=line.flight_id
      JOIN flight_types type ON type.id=flight.flight_type_id
      WHERE journal.status='POSTED' AND journal.posting_date BETWEEN @startDate AND @endDate
        AND account.account_type IN ('REVENUE','EXPENSE')
      GROUP BY type.code`
      )
      .all({ startDate: period.startDate, endDate: `${period.endDate}T23:59:59.999Z` }) as SqlRow[];
    const ids = ['CHARTER', 'PASSENGER', 'CARGO'] as const;
    const labels = { CHARTER: 'Charter', PASSENGER: 'Passenger', CARGO: 'Cargo' } as const;
    const lines: FinanceBusinessLineDto[] = ids.map((id) => {
      const row = rows.find((item) => item.business_line === id);
      const revenueMinor = amount(row?.revenue);
      const cost = {
        fuelMinor: amount(row?.fuel),
        stationMinor: amount(row?.station),
        maintenanceMinor: amount(row?.maintenance)
      };
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
      allocationMethod: 'POSTED_GL_DIMENSIONS',
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
    const arOutstanding = this.controlAccountBalance('1100', period.endDate);
    const apOutstanding = this.controlAccountBalance('2000', period.endDate);
    const metrics: FinanceMetricDto[] = [
      {
        key: 'REVENUE',
        label: 'Revenue',
        valueMinor: currentActivity.revenue,
        changePercent: this.changePercent(currentActivity.revenue, previousActivity.revenue),
        direction: this.direction(currentActivity.revenue, previousActivity.revenue),
        tone: 'SUCCESS',
        caption: 'Posted revenue GL activity for the selected period.'
      },
      {
        key: 'EXPENSE',
        label: 'Operating Expense',
        valueMinor: currentActivity.expense,
        changePercent: this.changePercent(currentActivity.expense, previousActivity.expense),
        direction: this.direction(currentActivity.expense, previousActivity.expense),
        tone: 'WARNING',
        caption: 'Posted expense GL activity for the selected period.'
      },
      {
        key: 'NET_INCOME',
        label: 'Profit / Loss',
        valueMinor: currentActivity.revenue - currentActivity.expense,
        changePercent: null,
        direction: 'NOT_AVAILABLE',
        tone: currentActivity.revenue - currentActivity.expense >= 0 ? 'SUCCESS' : 'DANGER',
        caption: 'Revenue less expense from the same posted GL source.'
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
        key: 'AR',
        label: 'AR Outstanding',
        valueMinor: arOutstanding,
        changePercent: null,
        direction: 'NOT_AVAILABLE',
        tone: arOutstanding > 0 ? 'WARNING' : 'SUCCESS',
        caption: 'Posted Accounts Receivable control-account balance.'
      },
      {
        key: 'AP',
        label: 'AP Outstanding',
        valueMinor: apOutstanding,
        changePercent: null,
        direction: 'NOT_AVAILABLE',
        tone: apOutstanding > 0 ? 'WARNING' : 'SUCCESS',
        caption: 'Posted Accounts Payable control-account balance.'
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
        label: 'Unposted journals',
        value: String(this.unpostedJournalCount()),
        status: this.unpostedJournalCount() > 0 ? ('WARNING' as const) : ('SUCCESS' as const),
        route: '/finance/accounting?tab=general-journal'
      },
      {
        label: 'Handoff exceptions',
        value: String(this.handoffExceptionCount()),
        status: this.handoffExceptionCount() > 0 ? ('WARNING' as const) : ('SUCCESS' as const),
        route: '/finance/handoffs?status=EXCEPTION'
      },
      {
        label: 'Finance handoff pending',
        value: String(this.handoffPendingCount()),
        status: this.handoffPendingCount() > 0 ? ('WARNING' as const) : ('SUCCESS' as const),
        route: '/finance/handoffs'
      },
      {
        label: 'Bank reconciliation',
        value: this.bankReconciliationStatus(period),
        status:
          this.bankReconciliationStatus(period) === 'Reconciled'
            ? ('SUCCESS' as const)
            : ('WARNING' as const),
        route: '/finance/reconciliation'
      },
      {
        label: 'Open accounting exceptions',
        value: String(this.openExceptionCount()),
        status: this.openExceptionCount() > 0 ? ('WARNING' as const) : ('SUCCESS' as const),
        route: '/finance/accounting?tab=exceptions'
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

  private profitabilityEvidence(row: SqlRow, value: number): AviationProfitabilityEvidenceDto {
    const sourceType = String(row.source_type);
    const sourceId = String(row.source_id);
    const flightId = String(row.flight_id);
    let sourceRoute: string | null = null;
    if (sourceType === 'INVOICE') sourceRoute = `/invoices/${sourceId}`;
    else if (sourceType === 'STATION_COST') sourceRoute = `/flights/${flightId}?tab=station`;
    else if (['FUEL_COST', 'MAINTENANCE_COST', 'MAINTENANCE_PART_ISSUE'].includes(sourceType)) {
      sourceRoute = `/flights/${flightId}`;
    }
    return {
      journalLineId: String(row.journal_line_id),
      journalId: String(row.journal_id),
      journalNumber: String(row.journal_number),
      accountingEventId: String(row.accounting_event_id),
      eventType: String(row.event_type),
      sourceType,
      sourceId,
      accountCode: String(row.account_code),
      accountName: String(row.account_name),
      amountMinor: value,
      sourceRoute
    };
  }

  private changePercent(current: number, previous: number) {
    if (previous === 0) return null;
    return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  }

  private direction(current: number, previous: number): FinanceMetricDto['direction'] {
    if (previous === 0) return 'NOT_AVAILABLE';
    if (current > previous) return 'UP';
    if (current < previous) return 'DOWN';
    return 'FLAT';
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
        startDate: period.startDate,
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
           SELECT invoice_id, SUM(amount_minor) AS paid
           FROM ar_allocations
           WHERE status = 'POSTED'
           GROUP BY invoice_id
         ) payment ON payment.invoice_id = invoice.id
         WHERE invoice.currency = 'IDR'
           AND invoice.recognition_mode = 'AR_ON_ISSUE'
           AND invoice.status NOT IN ('void', 'draft')
           AND invoice.due_at IS NOT NULL
           AND invoice.due_at <= ?`
      )
      .get(`${endDate}T23:59:59.999Z`) as { count: number; balance: number };
  }

  private controlAccountBalance(accountCode: string, endDate: string) {
    const row = this.sqlite
      .prepare(
        `SELECT COALESCE(SUM(
        CASE WHEN account.normal_balance = 'DEBIT'
          THEN line.base_debit_idr - line.base_credit_idr
          ELSE line.base_credit_idr - line.base_debit_idr END
      ), 0) AS balance
      FROM journal_lines line
      JOIN journal_entries journal ON journal.id = line.journal_entry_id
      JOIN chart_of_accounts account ON account.id = line.account_id
      WHERE journal.status = 'POSTED' AND journal.posting_date <= ? AND account.account_code = ?`
      )
      .get(`${endDate}T23:59:59.999Z`, accountCode) as { balance: number };
    return amount(row.balance);
  }

  private unpostedJournalCount() {
    return amount(
      (
        this.sqlite
          .prepare(
            "SELECT COUNT(*) AS count FROM journal_entries WHERE status <> 'POSTED' AND status <> 'REVERSED'"
          )
          .get() as { count: number }
      ).count
    );
  }

  private handoffExceptionCount() {
    return amount(
      (
        this.sqlite
          .prepare("SELECT COUNT(*) AS count FROM finance_handoffs WHERE status = 'EXCEPTION'")
          .get() as { count: number }
      ).count
    );
  }

  private handoffPendingCount() {
    return amount(
      (
        this.sqlite
          .prepare(
            "SELECT COUNT(*) AS count FROM finance_handoffs WHERE status NOT IN ('POSTED', 'REJECTED', 'EXCEPTION')"
          )
          .get() as { count: number }
      ).count
    );
  }

  private bankReconciliationStatus(period: FinanceReportingPeriodDto) {
    const row = this.sqlite
      .prepare(
        `SELECT COUNT(*) AS statements,
        SUM(CASE WHEN status = 'RECONCILED' THEN 1 ELSE 0 END) AS reconciled
      FROM bank_statements WHERE period_start <= ? AND period_end >= ?`
      )
      .get(period.endDate, period.startDate) as { statements: number; reconciled: number | null };
    if (!row.statements) return 'Not imported';
    return row.statements === amount(row.reconciled) ? 'Reconciled' : 'Review required';
  }

  private routeRevenue(period: FinanceReportingPeriodDto): FinanceRouteRevenueDto[] {
    return this.aviationProfitability({ period: period.code }).routes.map((row, index) => ({
      rank: index + 1,
      route: row.label,
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
