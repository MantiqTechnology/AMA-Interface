import type Database from 'better-sqlite3';
import type {
  PassengerTicketDto,
  PassengerTicketListQuery
} from '../../../../shared/features/ticketing/passenger';

type PassengerTicketRow = Omit<PassengerTicketDto, 'refundRequest'> & {
  refundRequestId: string | null;
  refundStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED' | null;
  refundReason: string | null;
  refundRequestedAt: string | null;
  refundDecidedAt: string | null;
  refundDecisionNote: string | null;
};

function toPassengerTicketDto(row: PassengerTicketRow): PassengerTicketDto {
  const {
    refundRequestId,
    refundStatus,
    refundReason,
    refundRequestedAt,
    refundDecidedAt,
    refundDecisionNote,
    ...ticket
  } = row;
  return {
    ...ticket,
    refundRequest:
      refundRequestId && refundStatus && refundReason && refundRequestedAt
        ? {
            id: refundRequestId,
            status: refundStatus,
            reason: refundReason,
            requestedAt: refundRequestedAt,
            decidedAt: refundDecidedAt,
            decisionNote: refundDecisionNote
          }
        : null
  };
}

type PassengerTicketInsert = {
  id: string;
  flightOrderId: string;
  flightOperationId: string;
  passengerName: string;
  documentType: string;
  documentNumber: string;
  seatNumber: string;
  passengerWeightKg: number;
  baggageWeightKg: number;
  ticketPrice: number;
  loyaltyMemberId: string | null;
  agentId: string | null;
  timestamp: string;
};

export type PassengerRescheduleContext = {
  id: string;
  flightOrderId: string;
  routeId: string;
  originStationId: string;
  destinationStationId: string;
  ticketStatus: 'ACTIVE' | 'REFUNDED';
  paymentStatus: 'UNPAID' | 'PAID';
  checkInStatus: 'PENDING' | 'CHECKED_IN';
  refundStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED' | null;
};

type PassengerRescheduleInput = {
  id: string;
  ticketId: string;
  sourceFlightOrderId: string;
  targetFlightOrderId: string;
  targetFlightOperationId: string;
  routeId: string;
  seatNumber: string;
  actorId: string;
  timestamp: string;
};

type PassengerManifestSnapshot = {
  passengerName: string;
  documentType: string;
  documentNumber: string;
  passengerWeightKg: number;
  baggageWeightKg: number;
  seatNumber: string;
};

const passengerTicketSelect = `
  SELECT
    ticket.id,
    ticket.flight_order_id AS flightOrderId,
    flight.flight_number AS flightNumber,
    origin.station_code AS originCode,
    destination.station_code AS destinationCode,
    flight.scheduled_departure AS scheduledDeparture,
    ticket.passenger_name AS passengerName,
    ticket.document_type AS documentType,
    ticket.document_number AS documentNumber,
    ticket.seat_number AS seatNumber,
    ticket.passenger_weight_kg AS passengerWeightKg,
    ticket.baggage_weight_kg AS baggageWeightKg,
    ticket.ticket_price AS ticketPrice,
    flight.currency AS currencyCode,
    ticket.ticket_status AS ticketStatus,
    ticket.payment_status AS paymentStatus,
    ticket.payment_method AS paymentMethod,
    ticket.paid_at AS paidAt,
    ticket.check_in_status AS checkInStatus,
    ticket.checked_in_at AS checkedInAt,
    ticket.loyalty_member_id AS loyaltyMemberId,
    ticket.agent_id AS agentId,
    agent.agent_name AS agentName,
    refund.id AS refundRequestId,
    refund.status AS refundStatus,
    refund.reason AS refundReason,
    refund.requested_at AS refundRequestedAt,
    refund.decided_at AS refundDecidedAt,
    refund.decision_note AS refundDecisionNote,
    ticket.created_at AS createdAt,
    ticket.updated_at AS updatedAt
  FROM passenger_tickets ticket
  JOIN flight_orders flight ON flight.id = ticket.flight_order_id
  JOIN routes route ON route.id = flight.route_id
  JOIN stations origin ON origin.id = route.origin_station_id
  JOIN stations destination ON destination.id = route.destination_station_id
  LEFT JOIN agents agent ON agent.id = ticket.agent_id
  LEFT JOIN ticketing_refund_requests refund ON refund.id = (
    SELECT latest.id
    FROM ticketing_refund_requests latest
    WHERE latest.passenger_ticket_id = ticket.id
    ORDER BY latest.requested_at DESC
    LIMIT 1
  )
`;

export class PassengerTicketRepository {
  constructor(private readonly sqlite: Database.Database) {}

  list(query: PassengerTicketListQuery): PassengerTicketDto[] {
    const conditions: string[] = [];
    const parameters: string[] = [];
    if (query.search) {
      conditions.push(
        '(ticket.id LIKE ? OR ticket.passenger_name LIKE ? OR ticket.document_number LIKE ?)'
      );
      const term = `%${query.search}%`;
      parameters.push(term, term, term);
    }
    if (query.flightOrderId) {
      conditions.push('ticket.flight_order_id = ?');
      parameters.push(query.flightOrderId);
    }
    if (query.paymentStatus) {
      conditions.push('ticket.payment_status = ?');
      parameters.push(query.paymentStatus);
    }
    if (query.checkInStatus) {
      conditions.push('ticket.check_in_status = ?');
      parameters.push(query.checkInStatus);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.sqlite
      .prepare(`${passengerTicketSelect} ${where} ORDER BY ticket.created_at DESC`)
      .all(...parameters) as PassengerTicketRow[];
    return rows.map(toPassengerTicketDto);
  }

  get(id: string): PassengerTicketDto | null {
    const row = this.sqlite.prepare(`${passengerTicketSelect} WHERE ticket.id = ?`).get(id) as
      PassengerTicketRow | undefined;
    return row ? toPassengerTicketDto(row) : null;
  }

  occupiedSeats(flightOrderId: string): string[] {
    return (
      this.sqlite
        .prepare(
          `SELECT seatNumber FROM (
             SELECT seat_number AS seatNumber
             FROM passenger_tickets
             WHERE flight_order_id = ? AND ticket_status = 'ACTIVE'
             UNION
             SELECT passenger.seat_number AS seatNumber
             FROM ticketing_sales sale
             JOIN flight_manifests manifest
               ON manifest.flight_id = sale.flight_operation_id
              AND manifest.manifest_type_id = 'manifest-type-passenger'
             JOIN flight_manifest_passengers passenger ON passenger.manifest_id = manifest.id
             WHERE sale.flight_order_id = ? AND passenger.seat_number IS NOT NULL
           )
           ORDER BY seatNumber`
        )
        .all(flightOrderId, flightOrderId) as Array<{ seatNumber: string }>
    ).map((row) => row.seatNumber);
  }

  rescheduleContext(id: string): PassengerRescheduleContext | null {
    return (
      (this.sqlite
        .prepare(
          `SELECT
             ticket.id,
             ticket.flight_order_id AS flightOrderId,
             flight.route_id AS routeId,
             route.origin_station_id AS originStationId,
             route.destination_station_id AS destinationStationId,
             ticket.ticket_status AS ticketStatus,
             ticket.payment_status AS paymentStatus,
             ticket.check_in_status AS checkInStatus,
             refund.status AS refundStatus
           FROM passenger_tickets ticket
           JOIN flight_orders flight ON flight.id = ticket.flight_order_id
           JOIN routes route ON route.id = flight.route_id
           LEFT JOIN ticketing_refund_requests refund ON refund.id = (
             SELECT latest.id
             FROM ticketing_refund_requests latest
             WHERE latest.passenger_ticket_id = ticket.id
             ORDER BY latest.requested_at DESC
             LIMIT 1
           )
           WHERE ticket.id = ?`
        )
        .get(id) as PassengerRescheduleContext | undefined) ?? null
    );
  }

  rescheduleAndSync(input: PassengerRescheduleInput) {
    const reschedule = this.sqlite.transaction(() => {
      const context = this.rescheduleContext(input.ticketId);
      if (
        !context ||
        context.flightOrderId !== input.sourceFlightOrderId ||
        context.routeId !== input.routeId ||
        context.ticketStatus !== 'ACTIVE' ||
        context.paymentStatus !== 'PAID' ||
        context.checkInStatus !== 'PENDING' ||
        context.refundStatus === 'REQUESTED' ||
        context.refundStatus === 'APPROVED'
      ) {
        throw new Error('TICKETING_RESCHEDULE_SUBJECT_CHANGED');
      }

      const target = this.sqlite
        .prepare(
          `SELECT sale.flight_operation_id AS flightOperationId
           FROM ticketing_sales sale
           JOIN flight_orders flight ON flight.id = sale.flight_order_id
           JOIN flight_operations operation ON operation.id = sale.flight_operation_id
           JOIN flight_operation_statuses status ON status.id = operation.current_status_id
           WHERE sale.flight_order_id = ?
             AND sale.flight_operation_id = ?
             AND sale.service_type = 'PASSENGER'
             AND flight.route_id = ?
             AND flight.status IN ('scheduled', 'ready')
             AND status.code IN ('SCHEDULED', 'CHECK_IN_OPEN')
             AND julianday(flight.scheduled_departure) > julianday('now')`
        )
        .get(input.targetFlightOrderId, input.targetFlightOperationId, input.routeId) as
        { flightOperationId: string } | undefined;
      if (!target) throw new Error('TICKETING_RESCHEDULE_TARGET_CHANGED');

      const passenger = this.sqlite
        .prepare(
          `SELECT passenger_name AS passengerName, document_type AS documentType,
                  document_number AS documentNumber, passenger_weight_kg AS passengerWeightKg,
                  baggage_weight_kg AS baggageWeightKg, seat_number AS seatNumber
           FROM passenger_tickets
           WHERE id = ?`
        )
        .get(input.ticketId) as PassengerManifestSnapshot;
      const sourceManifest = this.sqlite
        .prepare(
          `SELECT manifest.id, manifest.locked_at AS lockedAt
           FROM flight_manifest_passengers manifest_passenger
           JOIN flight_manifests manifest ON manifest.id = manifest_passenger.manifest_id
           WHERE manifest_passenger.id = ?`
        )
        .get(`ticket-sync-${input.ticketId}`) as
        { id: string; lockedAt: string | null } | undefined;
      if (sourceManifest?.lockedAt) throw new Error('TICKETING_MANIFEST_LOCKED');

      const fallbackManifestId = `${input.targetFlightOperationId}-manifest-pax`;
      this.sqlite
        .prepare(
          `INSERT OR IGNORE INTO flight_manifests (
             id, flight_id, manifest_type_id, status_id, created_at, updated_at
           ) VALUES (?, ?, 'manifest-type-passenger', 'manifest-status-draft', ?, ?)`
        )
        .run(fallbackManifestId, input.targetFlightOperationId, input.timestamp, input.timestamp);
      const targetManifest = this.sqlite
        .prepare(
          `SELECT id, locked_at AS lockedAt
           FROM flight_manifests
           WHERE flight_id = ? AND manifest_type_id = 'manifest-type-passenger'`
        )
        .get(input.targetFlightOperationId) as { id: string; lockedAt: string | null } | undefined;
      if (!targetManifest) throw new Error('TICKETING_MANIFEST_NOT_FOUND');
      if (targetManifest.lockedAt) throw new Error('TICKETING_MANIFEST_LOCKED');

      this.sqlite
        .prepare(
          `UPDATE passenger_tickets
           SET flight_order_id = ?, seat_number = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(input.targetFlightOrderId, input.seatNumber, input.timestamp, input.ticketId);
      this.sqlite
        .prepare('DELETE FROM flight_manifest_passengers WHERE id = ?')
        .run(`ticket-sync-${input.ticketId}`);
      if (sourceManifest) this.returnManifestToDraft(sourceManifest.id, input.timestamp);
      this.returnManifestToDraft(targetManifest.id, input.timestamp);
      this.sqlite
        .prepare(
          `INSERT INTO flight_manifest_passengers (
             id, manifest_id, full_name, identity_type, identity_number, weight_kg, seat_number,
             baggage_weight_kg, remarks, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `ticket-sync-${input.ticketId}`,
          targetManifest.id,
          passenger.passengerName,
          passenger.documentType,
          passenger.documentNumber,
          passenger.passengerWeightKg,
          input.seatNumber,
          passenger.baggageWeightKg,
          `Ticket ${input.ticketId}`,
          input.timestamp,
          input.timestamp
        );
      this.sqlite
        .prepare(
          `INSERT INTO passenger_ticket_reschedules (
             id, passenger_ticket_id, previous_flight_order_id, new_flight_order_id,
             previous_seat_number, new_seat_number, rescheduled_by_user_id, rescheduled_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.id,
          input.ticketId,
          input.sourceFlightOrderId,
          input.targetFlightOrderId,
          passenger.seatNumber,
          input.seatNumber,
          input.actorId,
          input.timestamp
        );
    });
    reschedule.immediate();
  }

  createAndSync(input: PassengerTicketInsert) {
    const create = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO passenger_tickets (
             id, flight_order_id, passenger_name, document_type, document_number, seat_number,
             passenger_weight_kg, baggage_weight_kg, ticket_price, ticket_status, payment_status,
             check_in_status, loyalty_member_id, agent_id, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'UNPAID', 'PENDING', ?, ?, ?, ?)`
        )
        .run(
          input.id,
          input.flightOrderId,
          input.passengerName,
          input.documentType,
          input.documentNumber,
          input.seatNumber,
          input.passengerWeightKg,
          input.baggageWeightKg,
          input.ticketPrice,
          input.loyaltyMemberId,
          input.agentId,
          input.timestamp,
          input.timestamp
        );

      const fallbackManifestId = `${input.flightOperationId}-manifest-pax`;
      this.sqlite
        .prepare(
          `INSERT OR IGNORE INTO flight_manifests (
             id, flight_id, manifest_type_id, status_id, created_at, updated_at
           ) VALUES (?, ?, 'manifest-type-passenger', 'manifest-status-draft', ?, ?)`
        )
        .run(fallbackManifestId, input.flightOperationId, input.timestamp, input.timestamp);
      const ownedManifest = this.sqlite
        .prepare(
          `SELECT id, locked_at AS lockedAt
           FROM flight_manifests
           WHERE flight_id = ? AND manifest_type_id = 'manifest-type-passenger'`
        )
        .get(input.flightOperationId) as { id: string; lockedAt: string | null } | undefined;
      if (!ownedManifest) throw new Error('TICKETING_MANIFEST_NOT_FOUND');
      if (ownedManifest.lockedAt) throw new Error('TICKETING_MANIFEST_LOCKED');
      const manifestId = ownedManifest.id;
      this.sqlite
        .prepare(
          `UPDATE flight_manifests
           SET status_id = 'manifest-status-draft', approved_by_user_id = NULL, approved_at = NULL,
               updated_at = ?
           WHERE id = ?`
        )
        .run(input.timestamp, manifestId);
      this.sqlite
        .prepare(
          `INSERT INTO flight_manifest_passengers (
             id, manifest_id, full_name, identity_type, identity_number, weight_kg, seat_number,
             baggage_weight_kg, remarks, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `ticket-sync-${input.id}`,
          manifestId,
          input.passengerName,
          input.documentType,
          input.documentNumber,
          input.passengerWeightKg,
          input.seatNumber,
          input.baggageWeightKg,
          `Ticket ${input.id}`,
          input.timestamp,
          input.timestamp
        );
    });
    create.immediate();
  }

  markPaid(id: string, paymentMethod: string, timestamp: string) {
    this.sqlite
      .prepare(
        `UPDATE passenger_tickets
         SET payment_status = 'PAID', payment_method = ?, paid_at = COALESCE(paid_at, ?),
             updated_at = ?
         WHERE id = ?`
      )
      .run(paymentMethod, timestamp, timestamp, id);
  }

  checkIn(id: string, timestamp: string) {
    this.sqlite
      .prepare(
        `UPDATE passenger_tickets
         SET check_in_status = 'CHECKED_IN', checked_in_at = COALESCE(checked_in_at, ?),
             updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, timestamp, id);
  }

  private returnManifestToDraft(manifestId: string, timestamp: string) {
    this.sqlite
      .prepare(
        `UPDATE flight_manifests
         SET status_id = 'manifest-status-draft', approved_by_user_id = NULL,
             approved_at = NULL, updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, manifestId);
  }
}
