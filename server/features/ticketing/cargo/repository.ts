import type Database from 'better-sqlite3';
import type {
  CargoBookingDto,
  CargoBookingListQuery
} from '../../../../shared/features/ticketing/cargo';

type CargoBookingRow = Omit<CargoBookingDto, 'isDangerous' | 'refundRequest'> & {
  isDangerous: number;
  refundRequestId: string | null;
  refundStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED' | null;
  refundReason: string | null;
  refundRequestedAt: string | null;
  refundDecidedAt: string | null;
  refundDecisionNote: string | null;
};

function toCargoBookingDto(row: CargoBookingRow): CargoBookingDto {
  const {
    refundRequestId,
    refundStatus,
    refundReason,
    refundRequestedAt,
    refundDecidedAt,
    refundDecisionNote,
    ...booking
  } = row;
  return {
    ...booking,
    isDangerous: booking.isDangerous === 1,
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

type CargoBookingInsert = {
  id: string;
  flightOperationId: string;
  senderName: string;
  receiverName: string;
  description: string;
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeWeightKg: number;
  chargeableWeightKg: number;
  isDangerous: boolean;
  dgCategoryId: string | null;
  dgAcceptanceStatus: 'NOT_APPLICABLE' | 'PENDING';
  paymentMethod: string;
  agentId: string | null;
  tariffRate: number;
  totalTariff: number;
  rateCardId: string;
  taxCodeId: string | null;
  taxCode: string | null;
  taxRateBasisPoints: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode: string;
  cargoCapacityKg: number;
  timestamp: string;
};

export class CargoCapacityExceededError extends Error {
  constructor(readonly projectedWeightKg: number) {
    super('Ticketing cargo capacity exceeded.');
    this.name = 'CargoCapacityExceededError';
  }
}

const cargoBookingSelect = `
  SELECT
    booking.id,
    booking.flight_operation_id AS flightOperationId,
    flight.flight_number AS flightNumber,
    origin.station_code AS originCode,
    destination.station_code AS destinationCode,
    flight.scheduled_departure_at AS scheduledDeparture,
    booking.sender_name AS senderName,
    booking.receiver_name AS receiverName,
    booking.description,
    booking.actual_weight_kg AS actualWeightKg,
    booking.length_cm AS lengthCm,
    booking.width_cm AS widthCm,
    booking.height_cm AS heightCm,
    booking.volume_weight_kg AS volumeWeightKg,
    booking.chargeable_weight_kg AS chargeableWeightKg,
    booking.is_dangerous AS isDangerous,
    booking.dg_category_id AS dgCategoryId,
    dg.dg_code AS dgCategoryCode,
    booking.dg_acceptance_status AS dgAcceptanceStatus,
    booking.payment_method AS paymentMethod,
    booking.payment_status AS paymentStatus,
    booking.paid_at AS paidAt,
    booking.agent_id AS agentId,
    agent.agent_name AS agentName,
    booking.tariff_rate AS tariffRate,
    booking.total_tariff AS totalTariff,
    booking.rate_card_id AS rateCardId,
    booking.tax_code_id AS taxCodeId,
    booking.tax_code AS taxCode,
    booking.tax_rate_basis_points AS taxRateBasisPoints,
    booking.tax_amount AS taxAmount,
    booking.total_amount AS totalAmount,
    booking.currency_code AS currencyCode,
    booking.status,
    booking.delivered_to AS deliveredTo,
    booking.delivered_at AS deliveredAt,
    refund.id AS refundRequestId,
    refund.status AS refundStatus,
    refund.reason AS refundReason,
    refund.requested_at AS refundRequestedAt,
    refund.decided_at AS refundDecidedAt,
    refund.decision_note AS refundDecisionNote,
    booking.created_at AS createdAt,
    booking.updated_at AS updatedAt
  FROM cargo_bookings booking
  JOIN flight_operations flight ON flight.id = booking.flight_operation_id
  JOIN routes route ON route.id = flight.route_id
  JOIN stations origin ON origin.id = route.origin_station_id
  JOIN stations destination ON destination.id = route.destination_station_id
  LEFT JOIN dg_categories dg ON dg.id = booking.dg_category_id
  LEFT JOIN agents agent ON agent.id = booking.agent_id
  LEFT JOIN ticketing_refund_requests refund ON refund.id = (
    SELECT latest.id
    FROM ticketing_refund_requests latest
    WHERE latest.cargo_booking_id = booking.id
    ORDER BY latest.requested_at DESC
    LIMIT 1
  )
`;

export class CargoBookingRepository {
  constructor(private readonly sqlite: Database.Database) {}

  list(query: CargoBookingListQuery): CargoBookingDto[] {
    const conditions: string[] = [];
    const parameters: string[] = [];
    if (query.search) {
      conditions.push(
        '(booking.id LIKE ? OR booking.sender_name LIKE ? OR booking.receiver_name LIKE ?)'
      );
      const term = `%${query.search}%`;
      parameters.push(term, term, term);
    }
    if (query.flightOperationId) {
      conditions.push('booking.flight_operation_id = ?');
      parameters.push(query.flightOperationId);
    }
    if (query.paymentStatus) {
      conditions.push('booking.payment_status = ?');
      parameters.push(query.paymentStatus);
    }
    if (query.status) {
      conditions.push('booking.status = ?');
      parameters.push(query.status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.sqlite
      .prepare(`${cargoBookingSelect} ${where} ORDER BY booking.created_at DESC`)
      .all(...parameters) as CargoBookingRow[];
    return rows.map(toCargoBookingDto);
  }

  get(id: string): CargoBookingDto | null {
    const row = this.sqlite.prepare(`${cargoBookingSelect} WHERE booking.id = ?`).get(id) as
      CargoBookingRow | undefined;
    return row ? toCargoBookingDto(row) : null;
  }

  bookedWeight(flightOperationId: string) {
    const row = this.sqlite
      .prepare(
        `SELECT COALESCE(SUM(item.chargeable_weight_kg), 0) AS total
         FROM ticketing_sales sale
         JOIN flight_manifests manifest
           ON manifest.flight_operation_id = sale.flight_operation_id
          AND manifest.manifest_type_id = 'manifest-type-cargo'
         LEFT JOIN flight_manifest_cargo_items item ON item.manifest_id = manifest.id
         WHERE sale.flight_operation_id = ?`
      )
      .get(flightOperationId) as { total: number };
    return Number(row.total);
  }

  createAndSync(input: CargoBookingInsert) {
    const create = this.sqlite.transaction(() => {
      const projectedWeightKg =
        this.bookedWeight(input.flightOperationId) + input.chargeableWeightKg;
      if (projectedWeightKg > input.cargoCapacityKg) {
        throw new CargoCapacityExceededError(projectedWeightKg);
      }
      this.sqlite
        .prepare(
          `INSERT INTO cargo_bookings (
             id, flight_operation_id, sender_name, receiver_name, description, actual_weight_kg,
             length_cm, width_cm, height_cm, volume_weight_kg, chargeable_weight_kg,
             is_dangerous, dg_category_id, dg_acceptance_status, payment_method, payment_status,
             agent_id, tariff_rate, total_tariff, rate_card_id, tax_code_id, tax_code,
             tax_rate_basis_points, tax_amount, total_amount, currency_code, status, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNPAID', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BOOKED', ?, ?)`
        )
        .run(
          input.id,
          input.flightOperationId,
          input.senderName,
          input.receiverName,
          input.description,
          input.actualWeightKg,
          input.lengthCm,
          input.widthCm,
          input.heightCm,
          input.volumeWeightKg,
          input.chargeableWeightKg,
          input.isDangerous ? 1 : 0,
          input.dgCategoryId,
          input.dgAcceptanceStatus,
          input.paymentMethod,
          input.agentId,
          input.tariffRate,
          input.totalTariff,
          input.rateCardId,
          input.taxCodeId,
          input.taxCode,
          input.taxRateBasisPoints,
          input.taxAmount,
          input.totalAmount,
          input.currencyCode,
          input.timestamp,
          input.timestamp
        );

      const fallbackManifestId = `${input.flightOperationId}-manifest-cargo`;
      this.sqlite
        .prepare(
          `INSERT OR IGNORE INTO flight_manifests (
             id, flight_operation_id, manifest_type_id, status_id, created_at, updated_at
           ) VALUES (?, ?, 'manifest-type-cargo', 'manifest-status-draft', ?, ?)`
        )
        .run(fallbackManifestId, input.flightOperationId, input.timestamp, input.timestamp);
      const ownedManifest = this.sqlite
        .prepare(
          `SELECT id, locked_at AS lockedAt
           FROM flight_manifests
           WHERE flight_operation_id = ? AND manifest_type_id = 'manifest-type-cargo'`
        )
        .get(input.flightOperationId) as { id: string; lockedAt: string | null } | undefined;
      if (!ownedManifest) throw new Error('TICKETING_MANIFEST_NOT_FOUND');
      if (ownedManifest.lockedAt) throw new Error('TICKETING_MANIFEST_LOCKED');
      const manifestId = ownedManifest.id;
      this.sqlite
        .prepare(
          `UPDATE flight_manifests
           SET status_id = 'manifest-status-draft', approved_by_user_id = NULL, approved_at = NULL,
               submitted_by_user_id = NULL, submitted_at = NULL, rejection_reason = NULL,
               version = version + 1, updated_at = ?
           WHERE id = ?`
        )
        .run(input.timestamp, manifestId);
      const dgAcceptanceStatusId =
        input.dgAcceptanceStatus === 'PENDING'
          ? 'dg-acceptance-status-pending'
          : 'dg-acceptance-status-not-applicable';
      this.sqlite
        .prepare(
          `INSERT INTO flight_manifest_cargo_items (
             id, manifest_id, cargo_booking_id, description, sender_name, receiver_name, actual_weight_kg,
             volume_weight_kg, chargeable_weight_kg, dg_category_id, dg_acceptance_status_id,
             remarks, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `ticket-sync-${input.id}`,
          manifestId,
          input.id,
          input.description,
          input.senderName,
          input.receiverName,
          input.actualWeightKg,
          input.volumeWeightKg,
          input.chargeableWeightKg,
          input.dgCategoryId,
          dgAcceptanceStatusId,
          `Ticketing ${input.id}`,
          input.timestamp,
          input.timestamp
        );
    });
    create.immediate();
  }

  markPaid(id: string, paymentMethod: string, timestamp: string) {
    this.sqlite
      .prepare(
        `UPDATE cargo_bookings
         SET payment_status = 'PAID', payment_method = ?, paid_at = COALESCE(paid_at, ?),
             updated_at = ?
         WHERE id = ?`
      )
      .run(paymentMethod, timestamp, timestamp, id);
  }

  deliver(id: string, deliveredTo: string, timestamp: string) {
    this.sqlite
      .prepare(
        `UPDATE cargo_bookings
         SET status = 'DELIVERED', delivered_to = ?, delivered_at = COALESCE(delivered_at, ?),
             updated_at = ?
         WHERE id = ?`
      )
      .run(deliveredTo, timestamp, timestamp, id);
  }
}
