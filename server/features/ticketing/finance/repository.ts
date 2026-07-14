import type Database from 'better-sqlite3';
import type {
  TicketingLedgerDto,
  TicketingLedgerEntryDto
} from '../../../../shared/features/ticketing/finance';

export class TicketingFinanceRepository {
  constructor(private readonly sqlite: Database.Database) {}

  ledger(): TicketingLedgerDto {
    const entries = this.sqlite
      .prepare(
        `SELECT * FROM (
           SELECT
             ticket.id,
             'PASSENGER' AS entryType,
             ticket.id AS referenceNumber,
             flight.flight_number AS flightNumber,
             origin.station_code || ' -> ' || destination.station_code AS routeLabel,
             ticket.passenger_name AS customerName,
             agent.agent_name AS agentName,
             ticket.total_amount AS amount,
             flight.currency_code AS currencyCode,
             ticket.payment_status AS paymentStatus,
             COALESCE(ticket.paid_at, ticket.created_at) AS occurredAt
           FROM passenger_tickets ticket
           JOIN flight_operations flight ON flight.id = ticket.flight_operation_id
           JOIN routes route ON route.id = flight.route_id
           JOIN stations origin ON origin.id = route.origin_station_id
           JOIN stations destination ON destination.id = route.destination_station_id
           LEFT JOIN agents agent ON agent.id = ticket.agent_id
           UNION ALL
           SELECT
             booking.id,
             'CARGO' AS entryType,
             booking.id AS referenceNumber,
             flight.flight_number AS flightNumber,
             origin.station_code || ' -> ' || destination.station_code AS routeLabel,
             booking.sender_name || ' / ' || booking.receiver_name AS customerName,
             agent.agent_name AS agentName,
             booking.total_amount AS amount,
             flight.currency_code AS currencyCode,
             booking.payment_status AS paymentStatus,
             COALESCE(booking.paid_at, booking.created_at) AS occurredAt
           FROM cargo_bookings booking
           JOIN flight_operations flight ON flight.id = booking.flight_operation_id
           JOIN routes route ON route.id = flight.route_id
           JOIN stations origin ON origin.id = route.origin_station_id
           JOIN stations destination ON destination.id = route.destination_station_id
           LEFT JOIN agents agent ON agent.id = booking.agent_id
           UNION ALL
           SELECT
             refund.id,
             CASE refund.subject_type
               WHEN 'PASSENGER' THEN 'PASSENGER_REFUND'
               ELSE 'CARGO_REFUND'
             END AS entryType,
             COALESCE(ticket.id, booking.id) AS referenceNumber,
             flight.flight_number AS flightNumber,
             origin.station_code || ' -> ' || destination.station_code AS routeLabel,
             COALESCE(ticket.passenger_name, booking.sender_name || ' / ' || booking.receiver_name) AS customerName,
             agent.agent_name AS agentName,
             -refund.amount AS amount,
             refund.currency_code AS currencyCode,
             'REFUNDED' AS paymentStatus,
             refund.decided_at AS occurredAt
           FROM ticketing_refund_requests refund
           LEFT JOIN passenger_tickets ticket ON ticket.id = refund.passenger_ticket_id
           LEFT JOIN cargo_bookings booking ON booking.id = refund.cargo_booking_id
           JOIN flight_operations flight ON flight.id = refund.flight_operation_id
           JOIN routes route ON route.id = flight.route_id
           JOIN stations origin ON origin.id = route.origin_station_id
           JOIN stations destination ON destination.id = route.destination_station_id
           LEFT JOIN agents agent ON agent.id = COALESCE(ticket.agent_id, booking.agent_id)
           WHERE refund.status = 'APPROVED'
         ) ledger
         ORDER BY occurredAt DESC`
      )
      .all() as TicketingLedgerEntryDto[];
    const totalsByCurrency = new Map<
      string,
      {
        currencyCode: string;
        passengerRevenue: number;
        cargoRevenue: number;
        refunds: number;
      }
    >();
    for (const entry of entries.filter((record) => record.paymentStatus !== 'UNPAID')) {
      const total = totalsByCurrency.get(entry.currencyCode) ?? {
        currencyCode: entry.currencyCode,
        passengerRevenue: 0,
        cargoRevenue: 0,
        refunds: 0
      };
      if (entry.entryType === 'PASSENGER' || entry.entryType === 'PASSENGER_REFUND') {
        total.passengerRevenue += entry.amount;
      } else {
        total.cargoRevenue += entry.amount;
      }
      if (entry.paymentStatus === 'REFUNDED') total.refunds += Math.abs(entry.amount);
      totalsByCurrency.set(entry.currencyCode, total);
    }
    return {
      totals: [...totalsByCurrency.values()]
        .map((total) => ({
          ...total,
          totalRevenue: total.passengerRevenue + total.cargoRevenue
        }))
        .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode)),
      unpaidCount: entries.filter((entry) => entry.paymentStatus === 'UNPAID').length,
      entries
    };
  }
}
