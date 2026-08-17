import { describe, expect, it } from 'vitest';
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
});
