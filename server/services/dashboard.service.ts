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
    const currencyBreakdown = this.sqlite
      .prepare(
        `SELECT
           snapshot.currency_code AS currencyCode,
           SUM(snapshot.total_revenue) AS revenue,
           SUM(snapshot.total_operational_cost) AS operationalCost,
           SUM(snapshot.gross_margin) AS grossMargin,
           COALESCE((
             SELECT SUM(invoice.total) FROM invoices invoice
             WHERE invoice.status != 'void' AND invoice.currency = snapshot.currency_code
           ), 0) AS invoiced,
           COALESCE((
             SELECT SUM(payment.amount) FROM payments payment
             WHERE payment.currency = snapshot.currency_code
           ), 0) AS paid
         FROM invoice_finance_snapshots snapshot
         GROUP BY snapshot.currency_code
         ORDER BY snapshot.currency_code`
      )
      .all() as Array<{
      currencyCode: string;
      revenue: number;
      operationalCost: number;
      grossMargin: number;
      invoiced: number;
      paid: number;
    }>;
    const isMixedCurrency = currencyBreakdown.length > 1;
    const singleCurrency = currencyBreakdown[0];
    const finance = isMixedCurrency
      ? {
          revenue: 0,
          operationalCost: 0,
          grossMargin: 0,
          invoiced: 0,
          paid: 0,
          currencyCode: 'IDR'
        }
      : {
          revenue: singleCurrency?.revenue ?? 0,
          operationalCost: singleCurrency?.operationalCost ?? 0,
          grossMargin: singleCurrency?.grossMargin ?? 0,
          invoiced: singleCurrency?.invoiced ?? 0,
          paid: singleCurrency?.paid ?? 0,
          currencyCode: singleCurrency?.currencyCode ?? 'IDR'
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
      finance: { ...finance, isMixedCurrency, currencyBreakdown },
      ticketing
    };
  }
}
