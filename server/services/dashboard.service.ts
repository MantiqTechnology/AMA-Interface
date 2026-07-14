import type Database from 'better-sqlite3';
import type {
  DashboardDto,
  OperationsMonitoringQuery
} from '../../shared/contracts/operations-monitoring';
import { OperationsMonitoringService } from './operations-monitoring.service';

export class DashboardService {
  private readonly monitoring: OperationsMonitoringService;

  constructor(private readonly sqlite: Database.Database) {
    this.monitoring = new OperationsMonitoringService(sqlite);
  }

  getDashboard(query: OperationsMonitoringQuery): DashboardDto {
    const overview = this.monitoring.operationsOverview(query);
    const finance = this.sqlite
      .prepare(
        `SELECT
           COALESCE((SELECT SUM(estimated_revenue) FROM flight_operations), 0) AS estimatedRevenue,
           COALESCE((SELECT SUM(COALESCE(total_cost, 0)) FROM flight_fuel_requests), 0)
             + COALESCE((SELECT SUM(amount) FROM flight_station_costs), 0)
             + COALESCE((SELECT SUM(maintenance_cost) FROM flight_maintenance_handoffs), 0)
             AS operationalCost,
           COALESCE((SELECT SUM(total) FROM invoices WHERE status != 'void'), 0) AS invoiced,
           COALESCE((SELECT SUM(amount) FROM payments), 0) AS paid`
      )
      .get() as {
      estimatedRevenue: number;
      operationalCost: number;
      invoiced: number;
      paid: number;
    };
    const ticketing = this.sqlite
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM passenger_tickets WHERE ticket_status = 'ACTIVE') AS passengerTickets,
           (SELECT COUNT(*) FROM cargo_bookings) AS cargoBookings,
           (SELECT COUNT(*) FROM passenger_tickets WHERE payment_status = 'UNPAID')
             + (SELECT COUNT(*) FROM cargo_bookings WHERE payment_status = 'UNPAID') AS unpaidItems`
      )
      .get() as DashboardDto['ticketing'];
    return {
      ...overview,
      finance: { ...finance, currencyCode: 'IDR' },
      ticketing
    };
  }
}
