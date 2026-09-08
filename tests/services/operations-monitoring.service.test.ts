import { describe, expect, it } from 'vitest';
import { aviationManagementDashboardQuerySchema } from '../../shared/contracts/aviation-dashboard';
import { createSeededTestServices } from '../helpers/demo-db';

describe('OperationsMonitoringService', () => {
  it('builds the operational overview and flight following from canonical operations', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const operationCount = (
      sqlite.prepare('SELECT COUNT(*) AS count FROM flight_operations').get() as { count: number }
    ).count;

    const following = services.operationsMonitoring.flightFollowing({});
    const overview = services.operationsMonitoring.operationsOverview({});

    expect(following).toHaveLength(operationCount);
    expect(overview.kpis.totalFlights).toBe(operationCount);
    expect(overview.flights.map((flight) => flight.id)).toContain('fop-closed-djj-wmx');
    expect(overview.alerts).toContainEqual(
      expect.objectContaining({
        flightOperationId: 'fop-blocked-crew-expired',
        severity: 'critical'
      })
    );
    expect(following.find((flight) => flight.id === 'fop-in-progress')).toMatchObject({
      delayMinutes: 6,
      urgency: 'warning',
      nextAction: 'Record landing / diversion',
      plannedDestinationCode: 'OKS',
      actualArrivalStationCode: null,
      stationScopeMatch: true
    });

    sqlite.close();
  });

  it('calculates dashboard ticketing and finance values from persisted rows', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const dashboard = services.dashboard.getDashboard({});
    const expectedTicketCount = (
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM passenger_tickets WHERE ticket_status = 'ACTIVE'")
        .get() as { count: number }
    ).count;
    const expectedPaid = (
      sqlite.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM payments').get() as {
        total: number;
      }
    ).total;

    expect(dashboard.ticketing.passengerTickets).toBe(expectedTicketCount);
    expect(dashboard.finance.paid).toBe(expectedPaid);
    expect(dashboard.flights).toHaveLength(dashboard.kpis.totalFlights);

    sqlite.close();
  });

  it('does not collapse multiple invoice currencies into a misleading total', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = 'flight-operation-status-closed', is_locked = 1
         WHERE id = 'fop-ticketing-passenger'`
      )
      .run();
    const invoice = services.invoices.finalizeClosedFlight('fop-ticketing-passenger', 'USR-ADMIN');
    sqlite.prepare("UPDATE invoices SET currency = 'USD' WHERE id = ?").run(invoice.id);
    sqlite
      .prepare("UPDATE invoice_finance_snapshots SET currency_code = 'USD' WHERE invoice_id = ?")
      .run(invoice.id);

    const dashboard = services.dashboard.getDashboard({});

    expect(dashboard.finance.isMixedCurrency).toBe(true);
    expect(dashboard.finance.revenue).toBe(0);
    expect(dashboard.finance.currencyBreakdown.map((item) => item.currencyCode)).toEqual([
      'IDR',
      'USD'
    ]);

    sqlite.close();
  });

  it('builds source-linked Ops and Flight Control dashboards from the full canonical cohort', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const anchorDate = (
      sqlite
        .prepare("SELECT flight_date AS date FROM flight_operations WHERE id = 'fop-in-progress'")
        .get() as {
        date: string;
      }
    ).date;

    const ops = services.operationalDashboards.opsDashboard({ period: 'TODAY', anchorDate }, [
      'ALL'
    ]);
    const control = services.operationalDashboards.flightControlDashboard(
      { period: 'TODAY', anchorDate },
      ['ALL']
    );
    const expectedFlights = (
      sqlite
        .prepare('SELECT COUNT(*) AS count FROM flight_operations WHERE flight_date = ?')
        .get(anchorDate) as {
        count: number;
      }
    ).count;

    expect(ops.meta).toMatchObject({
      dateFrom: anchorDate,
      dateTo: anchorDate,
      timeZone: 'Asia/Jayapura'
    });
    expect(ops.metrics.find((metric) => metric.key === 'TOTAL_FLIGHTS')?.value).toBe(
      expectedFlights
    );
    expect(ops.routeTraffic.data.every((point) => point.href.includes('/flights?'))).toBe(true);
    expect(ops.trackingHealth.data.map((point) => point.key)).toEqual([
      'LIVE',
      'STALE',
      'UNTRACKED'
    ]);
    expect(control.metrics.find((metric) => metric.key === 'OTP')?.detail).toContain('15 menit');
    expect(control.lifecycle.data.reduce((total, point) => total + point.value, 0)).toBe(
      expectedFlights
    );
    expect(control.readiness.data.reduce((total, point) => total + point.value, 0)).toBe(
      expectedFlights
    );
    expect(control.manifestWorkflow.description).toContain('Jumlah flight');
    for (const point of control.readiness.data) {
      const source = services.flightOperations.list({
        search: '',
        limit: 100,
        offset: 0,
        dateFrom: anchorDate,
        dateTo: anchorDate,
        readinessBand: point.key as 'READY' | 'NEEDS_ACTION' | 'BLOCKED' | 'NOT_EVALUATED'
      });
      expect(source.flights, `readiness ${point.key}`).toHaveLength(point.value);
    }
    for (const point of control.onTimePerformance.data.points) {
      const source = services.flightOperations.list({
        search: '',
        limit: 100,
        offset: 0,
        dateFrom: anchorDate,
        dateTo: anchorDate,
        departurePerformance: point.key as 'ON_TIME' | 'DELAYED'
      });
      expect(source.flights, `OTP ${point.key}`).toHaveLength(point.value);
    }
    for (const point of control.queueAging.data.approvals) {
      const source = services.flightOperations.list({
        search: '',
        limit: 100,
        offset: 0,
        dateFrom: anchorDate,
        dateTo: anchorDate,
        approvalAge: point.key as 'UNDER_2H' | '2_TO_6H' | 'OVER_6H'
      });
      expect(source.flights, `approval age ${point.key}`).toHaveLength(point.value);
    }

    sqlite.close();
  });

  it('uses calendar periods and enforces the active role station scope before aggregation', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const week = services.operationalDashboards.opsDashboard(
      { period: 'THIS_WEEK', anchorDate: '2026-08-19' },
      ['DJJ']
    );
    const month = services.operationalDashboards.flightControlDashboard(
      { period: 'THIS_MONTH', anchorDate: '2026-08-19' },
      ['DJJ']
    );

    expect(week.meta).toMatchObject({ dateFrom: '2026-08-17', dateTo: '2026-08-23' });
    expect(month.meta).toMatchObject({ dateFrom: '2026-08-01', dateTo: '2026-08-31' });
    expect(week.stationOptions.map((station) => station.code)).toEqual(['DJJ']);
    expect(() =>
      services.operationalDashboards.opsDashboard(
        { period: 'TODAY', anchorDate: '2026-08-19', stationId: 'st-wmx' },
        ['DJJ']
      )
    ).toThrowError('Station tidak tersedia dalam scope role aktif.');

    sqlite.close();
  });

  it('builds a network station dashboard with posted financials and pending cost exposure', async () => {
    const { services, sqlite } = await createSeededTestServices();
    services.accounting.postDemoEvents({ source: 'all' }, 'USR-FINANCE-REVIEWER');

    const dashboard = services.operationalDashboards.stationNetworkDashboard({
      period: 'THIS_MONTH',
      anchorDate: '2026-07-15'
    });
    const posted = sqlite
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN account.account_type = 'REVENUE'
             THEN line.base_credit_idr - line.base_debit_idr ELSE 0 END), 0) AS revenue,
           COALESCE(SUM(CASE WHEN account.account_type = 'EXPENSE'
             THEN line.base_debit_idr - line.base_credit_idr ELSE 0 END), 0) AS cost
         FROM journal_lines line
         JOIN journal_entries journal ON journal.id = line.journal_entry_id
         JOIN chart_of_accounts account ON account.id = line.account_id
         WHERE journal.status = 'POSTED'
           AND line.flight_id IS NOT NULL
           AND journal.posting_date BETWEEN '2026-07-01' AND '2026-07-31T23:59:59.999Z'`
      )
      .get() as { revenue: number; cost: number };
    const pendingExposure = sqlite
      .prepare(
        `SELECT COALESCE(SUM(cost.amount), 0) AS amount
         FROM flight_station_costs cost
         JOIN station_cost_statuses status ON status.id = cost.status_id
         JOIN currencies currency ON currency.id = cost.currency_id
         JOIN flight_operations flight ON flight.id = cost.flight_id
         WHERE status.code IN ('DRAFT', 'SUBMITTED')
           AND currency.currency_code = 'IDR'
           AND flight.flight_date BETWEEN '2026-07-01' AND '2026-07-31'`
      )
      .get() as { amount: number };

    expect(dashboard.meta).toMatchObject({
      period: 'THIS_MONTH',
      anchorDate: '2026-07-15',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31'
    });
    expect(dashboard.metrics.map((metric) => metric.key)).toEqual([
      'TOTAL_FLIGHTS',
      'ON_TIME_PERFORMANCE',
      'FLIGHTS_AT_RISK',
      'PENDING_VERIFICATION',
      'PENDING_SERVICES',
      'POSTED_MARGIN'
    ]);
    expect(dashboard.financial.actual).toMatchObject({
      revenueMinor: posted.revenue,
      costMinor: posted.cost,
      marginMinor: posted.revenue - posted.cost,
      currencyCode: 'IDR',
      attributionMethod: 'POSTED_GL_DIMENSIONS'
    });
    expect(dashboard.financial.pendingCostExposureMinor).toBe(pendingExposure.amount);
    expect(dashboard.financial.pendingCostExposureByCurrency).toContainEqual(
      expect.objectContaining({ currencyCode: 'IDR', includedInIdrTotal: true })
    );
    expect(
      dashboard.performance.stations.every((station) => station.href.includes('stationCode='))
    ).toBe(true);

    sqlite.close();
  });

  it('preserves station and cohort filters in activity drill-downs and enforces list scope', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const selected = sqlite
      .prepare(
        `SELECT f.flight_date AS flightDate, f.origin_station_id AS stationId
         FROM flight_operations f
         JOIN stations station ON station.id = f.origin_station_id
         WHERE station.station_code = 'DJJ'
         LIMIT 1`
      )
      .get() as { flightDate: string; stationId: string };

    const dashboard = services.operationalDashboards.opsDashboard(
      { period: 'TODAY', anchorDate: selected.flightDate, stationId: selected.stationId },
      ['DJJ']
    );
    const pointHref = dashboard.activity.data[0]?.points[0]?.href ?? '';
    expect(pointHref).toContain(`stationId=${selected.stationId}`);
    expect(pointHref).toContain('cohort=PLANNED');

    const scoped = services.flightOperations.list(
      { search: '', limit: 100, offset: 0, stationId: selected.stationId },
      ['DJJ']
    );
    expect(scoped.flights.length).toBeGreaterThan(0);
    expect(
      scoped.flights.every(
        (flight) =>
          flight.originStationCode === 'DJJ' ||
          flight.destinationStationCode === 'DJJ' ||
          flight.actualArrivalStationCode === 'DJJ'
      )
    ).toBe(true);
    expect(() =>
      services.flightOperations.list({ search: '', limit: 100, offset: 0, stationId: 'st-wmx' }, [
        'DJJ'
      ])
    ).toThrowError('outside the active role scope');

    const firstPage = services.flightOperations.list({ search: '', limit: 1, offset: 0 });
    expect(firstPage.flights).toHaveLength(1);
    expect(firstPage.pagination).toMatchObject({ limit: 1, offset: 0, hasMore: true });

    sqlite.close();
  });

  it('builds the unified operations control dashboard from role-scoped canonical records', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const selected = sqlite
      .prepare(
        `SELECT flight_date AS date FROM flight_operations
         WHERE id = 'fop-blocked-crew-expired'`
      )
      .get() as { date: string };
    const actor = { userId: 'USR-DEMO-ADMIN', role: 'Demo Admin', stationCodes: ['ALL'] };

    const dashboard = services.aviationDashboard.operations(
      {
        operationDate: selected.date,
        operationType: 'ALL',
        selectedFlightId: 'fop-blocked-crew-expired'
      },
      actor
    );
    const expectedFlights = (
      sqlite
        .prepare('SELECT COUNT(*) AS count FROM flight_operations WHERE flight_date = ?')
        .get(selected.date) as { count: number }
    ).count;

    expect(dashboard.meta).toMatchObject({
      dateFrom: selected.date,
      dateTo: selected.date,
      timeZone: 'Asia/Jayapura'
    });
    expect(dashboard.metrics.find((metric) => metric.key === 'FLIGHTS')?.value).toBe(
      expectedFlights
    );
    expect(dashboard.readiness.points.reduce((sum, point) => sum + point.value, 0)).toBe(
      expectedFlights
    );
    expect(dashboard.selectedFlight?.id).toBe('fop-blocked-crew-expired');
    expect(dashboard.attention.items?.length).toBeLessThanOrEqual(3);
    expect(dashboard.attention.items?.[0]).toEqual(
      expect.objectContaining({
        currentState: expect.any(String),
        requiredAction: expect.any(String),
        actionLabel: expect.any(String)
      })
    );
    expect(dashboard.readinessVerdict).toEqual(
      expect.objectContaining({
        releaseState: 'BLOCKED',
        operationalRisk: 'CRITICAL',
        completionPercent: expect.any(Number)
      })
    );
    expect(dashboard.readinessDomains).toContainEqual(
      expect.objectContaining({ key: 'WEATHER', state: 'NOT_AVAILABLE', value: 'No feed' })
    );
    expect(dashboard.freshness).toContainEqual(
      expect.objectContaining({
        key: 'WEATHER',
        state: 'NOT_CONNECTED',
        dataState: 'DISCONNECTED',
        updatedAt: null
      })
    );
    expect(dashboard.blockerItems?.[0]).toEqual(
      expect.objectContaining({
        flightNumber: expect.any(String),
        owner: expect.any(String),
        requiredAction: expect.any(String),
        actionLabel: expect.any(String)
      })
    );
    expect(dashboard.flightBoard.flatMap((lane) => lane.flights)).toHaveLength(expectedFlights);
    expect(dashboard.flightBoard.find((lane) => lane.key === 'EXCEPTION')).toBeDefined();
    expect(
      dashboard.flightBoard
        .find((lane) => lane.key === 'CLOSED')
        ?.flights.every((flight) => flight.currentStatus === 'CLOSED')
    ).toBe(true);
    expect(dashboard.fleet.every((aircraft) => aircraft.nextAvailability === null)).toBe(true);
    expect(dashboard.fleet.every((aircraft) => 'estimatedReturnToServiceAt' in aircraft)).toBe(
      true
    );

    sqlite.close();
  });

  it('builds management performance with equal-length comparison periods and canonical finance', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const range = sqlite
      .prepare(
        `SELECT MIN(flight_date) AS dateFrom, MAX(flight_date) AS dateTo FROM flight_operations`
      )
      .get() as { dateFrom: string; dateTo: string };
    const dashboard = services.aviationDashboard.management(
      {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        operationType: 'ALL',
        comparison: 'PREVIOUS_PERIOD'
      },
      ['ALL']
    );
    const expectedRevenue = Number(
      (
        sqlite
          .prepare(
            `SELECT COALESCE(SUM(snapshot.total_revenue), 0) AS value
             FROM invoice_finance_snapshots snapshot
             JOIN flight_operations flight ON flight.id = snapshot.flight_operation_id
             WHERE flight.flight_date BETWEEN ? AND ?`
          )
          .get(range.dateFrom, range.dateTo) as { value: number }
      ).value
    );
    const revenueMetric = dashboard.metricGroups
      .find((group) => group.key === 'finance')
      ?.metrics.find((metric) => metric.key === 'REVENUE');
    const currentDays =
      Math.round(
        (new Date(`${range.dateTo}T00:00:00Z`).getTime() -
          new Date(`${range.dateFrom}T00:00:00Z`).getTime()) /
          86_400_000
      ) + 1;
    const comparisonDays =
      Math.round(
        (new Date(`${dashboard.meta.comparisonDateTo}T00:00:00Z`).getTime() -
          new Date(`${dashboard.meta.comparisonDateFrom}T00:00:00Z`).getTime()) /
          86_400_000
      ) + 1;

    expect(dashboard.trend).toHaveLength(currentDays);
    expect(comparisonDays).toBe(currentDays);
    expect(revenueMetric?.value).toBe(expectedRevenue);
    expect(dashboard.revenueComposition.every((point) => point.value > 0)).toBe(true);
    expect(dashboard.safety.map((metric) => metric.key)).toEqual([
      'OPEN_REPORTS',
      'OCCURRENCES',
      'HIGH_RISK_FRAT',
      'OPEN_CAPA',
      'OVERDUE_CAPA'
    ]);
    expect(dashboard.metricGroups.map((group) => group.key)).toEqual([
      'operations',
      'fleet',
      'safety',
      'finance'
    ]);
    expect(dashboard.routes.every((route) => 'averageDelayMinutes' in route)).toBe(true);
    expect(dashboard.stations.every((station) => 'onTimePercent' in station)).toBe(true);
    expect(dashboard.aircraftUtilization.every((row) => 'technicalState' in row)).toBe(true);
    expect(
      dashboard.aircraftUtilization.every(
        (row) =>
          row.availabilityPercent === null ||
          row.availabilityPercent === 0 ||
          row.availabilityPercent === 100
      )
    ).toBe(true);

    sqlite.close();
  });

  it('keeps the demo management finance KPI current with a usable previous-period baseline', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const currentDate = (
      sqlite
        .prepare(`SELECT flight_date AS value FROM flight_operations WHERE id = ?`)
        .get('fop-closed-today-revenue') as { value: string }
    ).value;
    const dateFrom = new Date(`${currentDate}T00:00:00Z`);
    dateFrom.setUTCDate(dateFrom.getUTCDate() - 6);
    const dashboard = services.aviationDashboard.management(
      {
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: currentDate,
        operationType: 'ALL',
        comparison: 'PREVIOUS_PERIOD'
      },
      ['ALL']
    );
    const revenue = dashboard.metricGroups
      .find((group) => group.key === 'finance')
      ?.metrics.find((metric) => metric.key === 'REVENUE');

    expect(revenue).toMatchObject({
      dataState: 'FRESH',
      direction: 'DOWN',
      comparisonUnit: 'PERCENT'
    });
    expect(typeof revenue?.value).toBe('number');
    expect(revenue?.previousValue).toBeTypeOf('number');
    expect(revenue?.comparisonValue).toBeLessThan(0);

    sqlite.close();
  });

  it('presents lifecycle timestamp conflicts as reconciliation work instead of an extreme delay', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flight = sqlite
      .prepare(
        `SELECT id, flight_date AS date FROM flight_operations
         WHERE scheduled_arrival_at IS NOT NULL LIMIT 1`
      )
      .get() as { id: string; date: string };
    sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = (
               SELECT id FROM flight_operation_statuses WHERE code = 'SCHEDULED'
             ),
             actual_departure_at = NULL,
             actual_arrival_at = datetime(scheduled_arrival_at, '+2 days'),
             blocking_reason = NULL
         WHERE id = ?`
      )
      .run(flight.id);

    const dashboard = services.aviationDashboard.operations(
      { operationDate: flight.date, operationType: 'ALL' },
      { userId: 'USR-DEMO-ADMIN', role: 'Demo Admin', stationCodes: ['ALL'] }
    );
    const issue = dashboard.attention.items?.find((item) => item.id === flight.id);

    expect(issue).toEqual(
      expect.objectContaining({
        issue: expect.stringContaining('conflicts with the current SCHEDULED state'),
        impact: 'Operational record requires reconciliation',
        actionLabel: 'Review flight state'
      })
    );
    expect(issue?.issue).not.toContain('minutes outside schedule');

    sqlite.close();
  });

  it('presents an unresolved historical schedule as lifecycle reconciliation instead of a huge delay', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flight = sqlite
      .prepare(`SELECT id FROM flight_operations WHERE scheduled_departure_at IS NOT NULL LIMIT 1`)
      .get() as { id: string };
    sqlite
      .prepare(
        `UPDATE flight_operations
         SET flight_date = '2026-01-01',
             scheduled_departure_at = '2026-01-01T08:00:00.000Z',
             scheduled_arrival_at = '2026-01-01T09:00:00.000Z',
             actual_departure_at = NULL,
             actual_arrival_at = NULL,
             current_status_id = (
               SELECT id FROM flight_operation_statuses WHERE code = 'SCHEDULED'
             ),
             blocking_reason = NULL
         WHERE id = ?`
      )
      .run(flight.id);

    const dashboard = services.aviationDashboard.operations(
      { operationDate: '2026-01-01', operationType: 'ALL' },
      { userId: 'USR-DEMO-ADMIN', role: 'Demo Admin', stationCodes: ['ALL'] }
    );
    const issue = dashboard.attention.items?.find((item) => item.id === flight.id);

    expect(issue).toEqual(
      expect.objectContaining({
        issue: expect.stringContaining('after its operating date'),
        impact: 'Operational record requires reconciliation',
        actionLabel: 'Review flight state'
      })
    );
    expect(issue?.issue).not.toMatch(/\d{4,}\s+minutes/);
    expect(dashboard.metrics.find((metric) => metric.key === 'DELAYED')?.value).toBe(0);

    sqlite.close();
  });

  it('prevents the unified dashboard from selecting a station outside role scope', async () => {
    const { services, sqlite } = await createSeededTestServices();
    expect(() =>
      services.aviationDashboard.operations(
        { operationDate: '2026-08-19', stationId: 'st-wmx', operationType: 'ALL' },
        { userId: 'USR-STATION-DJJ', role: 'Station Admin', stationCodes: ['DJJ'] }
      )
    ).toThrowError('Station is not available in the active role scope.');
    sqlite.close();
  });

  it('uses the latest operation date inside the active station scope', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const expected = sqlite
      .prepare(
        `SELECT station.station_code AS code, MAX(flight.flight_date) AS date
         FROM stations station
         JOIN flight_operations flight
           ON flight.origin_station_id = station.id OR flight.destination_station_id = station.id
         GROUP BY station.id
         ORDER BY date ASC
         LIMIT 1`
      )
      .get() as { code: string; date: string };

    const dashboard = services.aviationDashboard.operations(
      { operationType: 'ALL' },
      { userId: 'USR-STATION-SCOPED', role: 'Station Admin', stationCodes: [expected.code] }
    );

    expect(dashboard.meta.dateFrom).toBe(expected.date);
    expect(dashboard.stationOptions.map((station) => station.code)).toEqual([expected.code]);
    sqlite.close();
  });

  it('suppresses cross-currency management totals instead of presenting false sums', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const range = sqlite
      .prepare(
        'SELECT MIN(flight_date) AS dateFrom, MAX(flight_date) AS dateTo FROM flight_operations'
      )
      .get() as { dateFrom: string; dateTo: string };
    sqlite
      .prepare(
        `UPDATE invoice_finance_snapshots SET currency_code = 'USD'
         WHERE id = (SELECT id FROM invoice_finance_snapshots ORDER BY id LIMIT 1)`
      )
      .run();

    const dashboard = services.aviationDashboard.management(
      { ...range, operationType: 'ALL', comparison: 'NONE' },
      ['ALL']
    );
    const financeMetrics = dashboard.metricGroups.find((group) => group.key === 'finance')!.metrics;

    expect(dashboard.isMixedCurrency).toBe(true);
    expect(financeMetrics.every((metric) => metric.value === 'Multiple currencies')).toBe(true);
    expect(
      dashboard.trend.every(
        (point) =>
          point.revenue === 0 && point.operationalCost === 0 && point.marginPercent === null
      )
    ).toBe(true);
    expect(dashboard.revenueComposition).toEqual([]);
    expect(dashboard.routes.every((route) => route.revenue === 0)).toBe(true);
    sqlite.close();
  });

  it('distinguishes unavailable financial data from a genuine zero value', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const dashboard = services.aviationDashboard.management(
      {
        dateFrom: '2099-01-01',
        dateTo: '2099-01-07',
        operationType: 'ALL',
        comparison: 'NONE'
      },
      ['ALL']
    );
    const financeMetrics = dashboard.metricGroups.find((group) => group.key === 'finance')!.metrics;

    expect(dashboard.financeDataState).toBe('NO_DATA');
    expect(financeMetrics.every((metric) => metric.value === 'Data unavailable')).toBe(true);
    expect(financeMetrics.every((metric) => metric.dataState === 'NO_DATA')).toBe(true);
    expect(dashboard.trend.every((point) => point.financialDataAvailable === false)).toBe(true);

    sqlite.close();
  });

  it('bounds management reporting dates and rejects impossible calendar dates', () => {
    expect(
      aviationManagementDashboardQuerySchema.safeParse({
        dateFrom: '2026-02-30',
        dateTo: '2026-03-01'
      }).success
    ).toBe(false);
    expect(
      aviationManagementDashboardQuerySchema.safeParse({
        dateFrom: '2025-01-01',
        dateTo: '2026-09-06'
      }).success
    ).toBe(false);
  });
});
