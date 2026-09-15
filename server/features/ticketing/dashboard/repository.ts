import type Database from 'better-sqlite3';
import type {
  TicketingDashboardDto,
  TicketingDashboardQuery
} from '../../../../shared/features/ticketing/dashboard';

export class TicketingDashboardRepository {
  constructor(private readonly sqlite: Database.Database) {}

  getDashboardSummary(query: TicketingDashboardQuery = {}): TicketingDashboardDto {
    const fromDate = query.dateFrom ? `${query.dateFrom} 00:00:00` : '1970-01-01 00:00:00';
    const toDate = query.dateTo ? `${query.dateTo} 23:59:59` : '9999-12-31 23:59:59';
    const kpiSummary = this.sqlite
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM passenger_tickets WHERE created_at >= @fromDate AND created_at <= @toDate) AS totalPassengerTickets,
           (SELECT COUNT(*) FROM cargo_bookings WHERE created_at >= @fromDate AND created_at <= @toDate) AS totalCargoBookings,
           (SELECT COUNT(*) FROM passenger_tickets WHERE check_in_status = 'CHECKED_IN' AND created_at >= @fromDate AND created_at <= @toDate) AS checkedInCount,
           (SELECT COUNT(*) FROM cargo_bookings WHERE status = 'DELIVERED' AND created_at >= @fromDate AND created_at <= @toDate) AS deliveredCargoCount,
           (SELECT COUNT(*) FROM ticketing_refund_requests WHERE status = 'REQUESTED' AND created_at >= @fromDate AND created_at <= @toDate) AS pendingRefundCount,
           (SELECT COUNT(*) FROM passenger_tickets WHERE payment_status = 'UNPAID' AND created_at >= @fromDate AND created_at <= @toDate) AS unpaidTicketCount,
           (SELECT COUNT(*) FROM cargo_bookings WHERE payment_status = 'UNPAID' AND created_at >= @fromDate AND created_at <= @toDate) AS unpaidCargoCount`
      )
      .get({ fromDate, toDate }) as {
      totalPassengerTickets: number;
      totalCargoBookings: number;
      checkedInCount: number;
      deliveredCargoCount: number;
      pendingRefundCount: number;
      unpaidTicketCount: number;
      unpaidCargoCount: number;
    };

    const revenueByCurrencyRows = this.sqlite
      .prepare(
        `SELECT
           currency_code AS currencyCode,
           SUM(CASE WHEN type = 'PASSENGER' THEN amount ELSE 0 END) AS passengerRevenue,
           SUM(CASE WHEN type = 'CARGO' THEN amount ELSE 0 END) AS cargoRevenue
         FROM (
           SELECT flight.currency_code, 'PASSENGER' AS type, ticket.total_amount AS amount
           FROM passenger_tickets ticket
           JOIN flight_operations flight ON flight.id = ticket.flight_operation_id
           WHERE ticket.payment_status = 'PAID' AND ticket.created_at >= @fromDate AND ticket.created_at <= @toDate
           UNION ALL
           SELECT flight.currency_code, 'CARGO' AS type, booking.total_amount AS amount
           FROM cargo_bookings booking
           JOIN flight_operations flight ON flight.id = booking.flight_operation_id
           WHERE booking.payment_status = 'PAID' AND booking.created_at >= @fromDate AND booking.created_at <= @toDate
         ) combined_revenue
         GROUP BY currency_code
         ORDER BY currencyCode`
      )
      .all({ fromDate, toDate }) as Array<{
      currencyCode: string;
      passengerRevenue: number;
      cargoRevenue: number;
    }>;

    const recentTransactionsRows = this.sqlite
      .prepare(
        `SELECT * FROM (
           SELECT
             ticket.id,
             'PASSENGER' AS type,
             ticket.id AS referenceNumber,
             flight.flight_number AS flightNumber,
             origin.station_code || ' -> ' || destination.station_code AS routeLabel,
             ticket.passenger_name AS customerName,
             ticket.total_amount AS amount,
             flight.currency_code AS currencyCode,
             ticket.payment_status AS paymentStatus,
             ticket.created_at AS createdAt
           FROM passenger_tickets ticket
           JOIN flight_operations flight ON flight.id = ticket.flight_operation_id
           JOIN routes route ON route.id = flight.route_id
           JOIN stations origin ON origin.id = route.origin_station_id
           JOIN stations destination ON destination.id = route.destination_station_id
           WHERE ticket.created_at >= @fromDate AND ticket.created_at <= @toDate
           UNION ALL
           SELECT
             booking.id,
             'CARGO' AS type,
             booking.id AS referenceNumber,
             flight.flight_number AS flightNumber,
             origin.station_code || ' -> ' || destination.station_code AS routeLabel,
             booking.sender_name || ' / ' || booking.receiver_name AS customerName,
             booking.total_amount AS amount,
             flight.currency_code AS currencyCode,
             booking.payment_status AS paymentStatus,
             booking.created_at AS createdAt
           FROM cargo_bookings booking
           JOIN flight_operations flight ON flight.id = booking.flight_operation_id
           JOIN routes route ON route.id = flight.route_id
           JOIN stations origin ON origin.id = route.origin_station_id
           JOIN stations destination ON destination.id = route.destination_station_id
           WHERE booking.created_at >= @fromDate AND booking.created_at <= @toDate
         ) combined
         ORDER BY createdAt DESC
         LIMIT 10`
      )
      .all({ fromDate, toDate }) as TicketingDashboardDto['recentTransactions'];

    const salesByRouteRows = this.sqlite
      .prepare(
        `SELECT
           routeLabel,
           currencyCode,
           SUM(passengerCount) AS passengerCount,
           SUM(cargoCount) AS cargoCount,
           SUM(revenue) AS totalRevenue
         FROM (
           SELECT
             origin.station_code || ' -> ' || destination.station_code AS routeLabel,
             flight.currency_code AS currencyCode,
             1 AS passengerCount,
             0 AS cargoCount,
             ticket.total_amount AS revenue
           FROM passenger_tickets ticket
           JOIN flight_operations flight ON flight.id = ticket.flight_operation_id
           JOIN routes route ON route.id = flight.route_id
           JOIN stations origin ON origin.id = route.origin_station_id
           JOIN stations destination ON destination.id = route.destination_station_id
           WHERE ticket.payment_status = 'PAID' AND ticket.created_at >= @fromDate AND ticket.created_at <= @toDate
           UNION ALL
           SELECT
             origin.station_code || ' -> ' || destination.station_code AS routeLabel,
             flight.currency_code AS currencyCode,
             0 AS passengerCount,
             1 AS cargoCount,
             booking.total_amount AS revenue
           FROM cargo_bookings booking
           JOIN flight_operations flight ON flight.id = booking.flight_operation_id
           JOIN routes route ON route.id = flight.route_id
           JOIN stations origin ON origin.id = route.origin_station_id
           JOIN stations destination ON destination.id = route.destination_station_id
           WHERE booking.payment_status = 'PAID' AND booking.created_at >= @fromDate AND booking.created_at <= @toDate
         ) route_sales
         GROUP BY routeLabel, currencyCode
         ORDER BY totalRevenue DESC
         LIMIT 15`
      )
      .all({ fromDate, toDate }) as TicketingDashboardDto['salesByRoute'];

    return {
      ...kpiSummary,
      revenueByCurrency: revenueByCurrencyRows.map((r) => ({
        ...r,
        totalRevenue: r.passengerRevenue + r.cargoRevenue
      })),
      recentTransactions: recentTransactionsRows,
      salesByRoute: salesByRouteRows
    };
  }
}
