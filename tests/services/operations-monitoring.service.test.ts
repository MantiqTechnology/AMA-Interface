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
});
