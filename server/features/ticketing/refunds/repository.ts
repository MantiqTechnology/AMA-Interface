import type Database from 'better-sqlite3';
import type {
  TicketRefundListQuery,
  TicketRefundRequestDto
} from '../../../../shared/features/ticketing/refunds';

type PassengerRefundSubject = {
  id: string;
  flightOperationId: string;
  paymentStatus: 'UNPAID' | 'PAID';
  checkInStatus: 'PENDING' | 'CHECKED_IN';
  amount: number;
  currencyCode: string;
};

type CargoRefundSubject = {
  id: string;
  flightOperationId: string;
  paymentStatus: 'UNPAID' | 'PAID';
  bookingStatus: 'BOOKED' | 'DELIVERED';
  amount: number;
  currencyCode: string;
};

const refundSelect = `
  SELECT
    refund.id,
    refund.subject_type AS subjectType,
    COALESCE(refund.passenger_ticket_id, refund.cargo_booking_id) AS subjectId,
    refund.flight_operation_id AS flightOperationId,
    COALESCE(ticket.id, booking.id) AS referenceNumber,
    flight.flight_number AS flightNumber,
    origin.station_code || ' -> ' || destination.station_code AS routeLabel,
    COALESCE(ticket.passenger_name, booking.sender_name || ' / ' || booking.receiver_name) AS customerName,
    refund.amount,
    refund.currency_code AS currencyCode,
    refund.reason,
    refund.status,
    refund.requested_by_user_id AS requestedByUserId,
    refund.requested_at AS requestedAt,
    refund.decided_by_user_id AS decidedByUserId,
    refund.decided_at AS decidedAt,
    refund.decision_note AS decisionNote
  FROM ticketing_refund_requests refund
  LEFT JOIN passenger_tickets ticket ON ticket.id = refund.passenger_ticket_id
  LEFT JOIN cargo_bookings booking ON booking.id = refund.cargo_booking_id
  JOIN flight_operations flight ON flight.id = refund.flight_operation_id
  JOIN routes route ON route.id = flight.route_id
  JOIN stations origin ON origin.id = route.origin_station_id
  JOIN stations destination ON destination.id = route.destination_station_id
`;

export class TicketRefundRepository {
  constructor(private readonly sqlite: Database.Database) {}

  list(query: TicketRefundListQuery): TicketRefundRequestDto[] {
    const conditions: string[] = [];
    const parameters: string[] = [];
    if (query.subjectType) {
      conditions.push('refund.subject_type = ?');
      parameters.push(query.subjectType);
    }
    if (query.status) {
      conditions.push('refund.status = ?');
      parameters.push(query.status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return this.sqlite
      .prepare(`${refundSelect} ${where} ORDER BY refund.requested_at DESC`)
      .all(...parameters) as TicketRefundRequestDto[];
  }

  get(id: string): TicketRefundRequestDto | null {
    return (
      (this.sqlite.prepare(`${refundSelect} WHERE refund.id = ?`).get(id) as
        TicketRefundRequestDto | undefined) ?? null
    );
  }

  passengerSubject(id: string): PassengerRefundSubject | null {
    return (
      (this.sqlite
        .prepare(
          `SELECT ticket.id, ticket.flight_operation_id AS flightOperationId,
                  ticket.payment_status AS paymentStatus,
                  ticket.check_in_status AS checkInStatus, ticket.total_amount AS amount,
                  flight.currency_code AS currencyCode
           FROM passenger_tickets ticket
           JOIN flight_operations flight ON flight.id = ticket.flight_operation_id
           WHERE ticket.id = ?`
        )
        .get(id) as PassengerRefundSubject | undefined) ?? null
    );
  }

  cargoSubject(id: string): CargoRefundSubject | null {
    return (
      (this.sqlite
        .prepare(
          `SELECT booking.id, booking.flight_operation_id AS flightOperationId,
                  booking.payment_status AS paymentStatus,
                  booking.status AS bookingStatus, booking.total_amount AS amount,
                  flight.currency_code AS currencyCode
           FROM cargo_bookings booking
           JOIN flight_operations flight ON flight.id = booking.flight_operation_id
           WHERE booking.id = ?`
        )
        .get(id) as CargoRefundSubject | undefined) ?? null
    );
  }

  latestPassengerRequest(id: string): TicketRefundRequestDto | null {
    return (
      (this.sqlite
        .prepare(
          `${refundSelect}
           WHERE refund.passenger_ticket_id = ?
           ORDER BY refund.requested_at DESC
           LIMIT 1`
        )
        .get(id) as TicketRefundRequestDto | undefined) ?? null
    );
  }

  latestCargoRequest(id: string): TicketRefundRequestDto | null {
    return (
      (this.sqlite
        .prepare(
          `${refundSelect}
           WHERE refund.cargo_booking_id = ?
           ORDER BY refund.requested_at DESC
           LIMIT 1`
        )
        .get(id) as TicketRefundRequestDto | undefined) ?? null
    );
  }

  createPassenger(
    id: string,
    passengerTicketId: string,
    flightOperationId: string,
    reason: string,
    amount: number,
    currencyCode: string,
    actorId: string,
    timestamp: string
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO ticketing_refund_requests (
           id, flight_operation_id, subject_type, passenger_ticket_id, reason, status, amount, currency_code,
           requested_by_user_id, requested_at, created_at, updated_at
         ) VALUES (?, ?, 'PASSENGER', ?, ?, 'REQUESTED', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        flightOperationId,
        passengerTicketId,
        reason,
        amount,
        currencyCode,
        actorId,
        timestamp,
        timestamp,
        timestamp
      );
  }

  createCargo(
    id: string,
    cargoBookingId: string,
    flightOperationId: string,
    reason: string,
    amount: number,
    currencyCode: string,
    actorId: string,
    timestamp: string
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO ticketing_refund_requests (
           id, flight_operation_id, subject_type, cargo_booking_id, reason, status, amount, currency_code,
           requested_by_user_id, requested_at, created_at, updated_at
         ) VALUES (?, ?, 'CARGO', ?, ?, 'REQUESTED', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        flightOperationId,
        cargoBookingId,
        reason,
        amount,
        currencyCode,
        actorId,
        timestamp,
        timestamp,
        timestamp
      );
  }

  decide(
    id: string,
    decision: 'APPROVE' | 'REJECT',
    note: string,
    actorId: string,
    timestamp: string
  ) {
    const decide = this.sqlite.transaction(() => {
      const request = this.get(id);
      if (!request) throw new Error('TICKETING_REFUND_NOT_FOUND');
      if (request.status !== 'REQUESTED') return request;

      if (decision === 'APPROVE') {
        if (request.subjectType === 'PASSENGER') {
          this.approvePassenger(request.subjectId, request.flightOperationId, timestamp);
        } else {
          this.approveCargo(request.subjectId, request.flightOperationId, timestamp);
        }
      }

      this.sqlite
        .prepare(
          `UPDATE ticketing_refund_requests
           SET status = ?, decided_by_user_id = ?, decided_at = ?, decision_note = ?,
               updated_at = ?
           WHERE id = ? AND status = 'REQUESTED'`
        )
        .run(
          decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          actorId,
          timestamp,
          note,
          timestamp,
          id
        );
      return this.get(id)!;
    });
    return decide.immediate();
  }

  private approvePassenger(ticketId: string, flightOperationId: string, timestamp: string) {
    const subject = this.passengerSubject(ticketId);
    if (
      !subject ||
      subject.flightOperationId !== flightOperationId ||
      subject.paymentStatus !== 'PAID' ||
      subject.checkInStatus !== 'PENDING'
    ) {
      throw new Error('TICKETING_REFUND_SUBJECT_CHANGED');
    }
    const manifest = this.sqlite
      .prepare(
        `SELECT manifest.id, manifest.locked_at AS lockedAt
         FROM flight_manifest_passengers passenger
         JOIN flight_manifests manifest ON manifest.id = passenger.manifest_id
         WHERE passenger.passenger_ticket_id = ?`
      )
      .get(ticketId) as { id: string; lockedAt: string | null } | undefined;
    if (manifest?.lockedAt) throw new Error('TICKETING_MANIFEST_LOCKED');
    this.sqlite
      .prepare('DELETE FROM flight_manifest_passengers WHERE id = ?')
      .run(`ticket-sync-${ticketId}`);
    this.sqlite
      .prepare(
        `UPDATE passenger_tickets
         SET ticket_status = 'REFUNDED', updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, ticketId);
    if (manifest) this.returnManifestToDraft(manifest.id, timestamp);
  }

  private approveCargo(bookingId: string, flightOperationId: string, timestamp: string) {
    const subject = this.cargoSubject(bookingId);
    if (
      !subject ||
      subject.flightOperationId !== flightOperationId ||
      subject.paymentStatus !== 'PAID' ||
      subject.bookingStatus !== 'BOOKED'
    ) {
      throw new Error('TICKETING_REFUND_SUBJECT_CHANGED');
    }
    const manifest = this.sqlite
      .prepare(
        `SELECT manifest.id, manifest.locked_at AS lockedAt
         FROM flight_manifest_cargo_items item
         JOIN flight_manifests manifest ON manifest.id = item.manifest_id
         WHERE item.cargo_booking_id = ?`
      )
      .get(bookingId) as { id: string; lockedAt: string | null } | undefined;
    if (manifest?.lockedAt) throw new Error('TICKETING_MANIFEST_LOCKED');
    this.sqlite
      .prepare('DELETE FROM flight_manifest_cargo_items WHERE id = ?')
      .run(`ticket-sync-${bookingId}`);
    if (manifest) this.returnManifestToDraft(manifest.id, timestamp);
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
