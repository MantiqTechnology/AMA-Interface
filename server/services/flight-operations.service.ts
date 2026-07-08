import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';
import type {
  ActionNoteBody,
  ActualTimeBody,
  CreateCargoBody,
  CreateFlightOperationBody,
  CreateFuelRequestBody,
  CreateMaintenanceHandoffBody,
  CreatePassengerBody,
  CreateStationCostBody,
  CreateStationServiceBody,
  FlightFinanceHandoffDto,
  FlightFuelRequestDto,
  FlightMaintenanceHandoffDto,
  FlightManifestCargoDto,
  FlightManifestDto,
  FlightOperationDetailDto,
  FlightOperationLookupsDto,
  FlightOperationOverviewDto,
  FlightOperationRecord,
  FlightOperationStatus,
  FlightReasonActionBody,
  FlightStationCostDto,
  FlightStationServiceDto,
  FlightStatusHistoryDto,
  ListFlightOperationsQuery
} from '../../shared/contracts/flight-operations';
import { flightOperationStatuses } from '../../shared/contracts/flight-operations';
import { DomainError, notFound } from '../utils/errors';

type SqlValue = string | number | boolean | null;
type SqlRow = Record<string, SqlValue>;

const readinessDefinitions = [
  ['AIRCRAFT_SERVICEABILITY', 'Aircraft serviceability'],
  ['CREW_AVAILABILITY', 'Crew availability'],
  ['CREW_LICENSE_MEDICAL', 'Crew license and medical'],
  ['MANIFEST_APPROVED', 'Manifest approved'],
  ['DG_ACCEPTANCE', 'Dangerous goods acceptance'],
  ['FUEL_CONFIRMED', 'Fuel confirmed'],
  ['HANDLING_CONFIRMED', 'Handling confirmed'],
  ['SEPARATION_OF_DUTIES', 'Separation of duties']
] as const;

const normalTransitions: Partial<Record<FlightOperationStatus, FlightOperationStatus[]>> = {
  DRAFT: ['PENDING_READINESS'],
  PENDING_READINESS: ['BLOCKED', 'READY_FOR_APPROVAL'],
  BLOCKED: ['READY_FOR_APPROVAL'],
  READY_FOR_APPROVAL: ['APPROVED'],
  APPROVED: ['SCHEDULED'],
  SCHEDULED: ['CHECK_IN_OPEN'],
  CHECK_IN_OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['LANDED', 'DIVERTED'],
  LANDED: ['PENDING_CLOSURE'],
  PENDING_CLOSURE: ['CLOSED'],
  CLOSED: ['REOPENED_FOR_CORRECTION'],
  REOPENED_FOR_CORRECTION: ['PENDING_CLOSURE']
};

function bool(value: SqlValue) {
  return Boolean(value);
}

function str(value: SqlValue) {
  return typeof value === 'string' ? value : null;
}

function num(value: SqlValue) {
  return typeof value === 'number' ? value : 0;
}

function nullableNum(value: SqlValue) {
  return typeof value === 'number' ? value : null;
}

function timestamp() {
  return new Date().toISOString();
}

function parseMetadata(value: SqlValue): Record<string, unknown> | null {
  if (typeof value !== 'string' || !value) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function mapFlight(row: SqlRow): FlightOperationRecord {
  const required = Number(row.required_checks ?? 0);
  const passed = Number(row.pass_checks ?? 0);
  const notApplicable = Number(row.na_checks ?? 0);
  const readinessPercent =
    required > 0 ? Math.round(((passed + notApplicable) / required) * 100) : 0;

  return {
    id: String(row.id),
    flightNumber: String(row.flight_number),
    flightDate: String(row.flight_date),
    flightType: String(row.flight_type) as FlightOperationRecord['flightType'],
    routeId: String(row.route_id),
    routeCode: String(row.route_code ?? '-'),
    originStationId: String(row.origin_station_id),
    originStationCode: String(row.origin_station_code ?? '-'),
    destinationStationId: String(row.destination_station_id),
    destinationStationCode: String(row.destination_station_code ?? '-'),
    customerId: str(row.customer_id),
    customerName: str(row.customer_name),
    aircraftId: str(row.aircraft_id),
    aircraftRegistration: str(row.aircraft_registration),
    aircraftServiceability: str(row.aircraft_serviceability),
    pilotInCommandId: str(row.pilot_in_command_id),
    pilotInCommandName: str(row.pic_name),
    coPilotId: str(row.co_pilot_id),
    coPilotName: str(row.copilot_name),
    scheduledDepartureAt: str(row.scheduled_departure_at),
    scheduledArrivalAt: str(row.scheduled_arrival_at),
    actualDepartureAt: str(row.actual_departure_at),
    actualArrivalAt: str(row.actual_arrival_at),
    currentStatus: String(row.current_status) as FlightOperationStatus,
    createdByUserId: str(row.created_by_user_id),
    approvedByUserId: str(row.approved_by_user_id),
    remarks: str(row.remarks),
    isLocked: bool(row.is_locked),
    readinessPercent,
    readinessSummary: `${passed + notApplicable}/${required || readinessDefinitions.length} ready`,
    blockingReason: str(row.blocking_reason),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function actionTypeForStatus(status: FlightOperationStatus) {
  const actions: Partial<Record<FlightOperationStatus, string>> = {
    APPROVED: 'APPROVE',
    SCHEDULED: 'SCHEDULE',
    CHECK_IN_OPEN: 'OPEN_CHECK_IN',
    IN_PROGRESS: 'DEPART',
    LANDED: 'LAND',
    PENDING_CLOSURE: 'MARK_PENDING_CLOSURE',
    CLOSED: 'CLOSE',
    CANCELLED: 'CANCEL',
    DIVERTED: 'DIVERT',
    REOPENED_FOR_CORRECTION: 'REOPEN'
  };
  return actions[status] ?? 'READINESS_EVALUATED';
}

export class FlightOperationsService {
  constructor(private readonly sqlite: Database.Database) {}

  list(query: ListFlightOperationsQuery): FlightOperationOverviewDto {
    const rows = this.queryFlights(query);
    const summary = Object.fromEntries(
      flightOperationStatuses.map((status) => [status, 0])
    ) as Record<FlightOperationStatus, number>;

    const summaryRows = this.sqlite
      .prepare(
        'SELECT current_status, COUNT(*) as count FROM flight_operations GROUP BY current_status'
      )
      .all() as SqlRow[];

    for (const row of summaryRows) {
      const status = String(row.current_status) as FlightOperationStatus;
      if (status in summary) summary[status] = Number(row.count);
    }

    return {
      summary,
      flights: rows.map(mapFlight)
    };
  }

  detail(id: string): FlightOperationDetailDto {
    const row = this.queryFlightById(id);
    if (!row) throw notFound('Flight', id);
    const flight = mapFlight(row);

    return {
      ...flight,
      crewAssignments: (
        this.sqlite
          .prepare(
            `SELECT a.*, c.full_name, c.employee_code, c.license_expiry_date, c.medical_expiry_date
         FROM flight_crew_assignments a
         JOIN ref_crews c ON c.id = a.crew_id
         WHERE a.flight_id = ?
         ORDER BY a.assignment_role`
          )
          .all(id) as SqlRow[]
      ).map((item) => ({
        id: String(item.id),
        flightId: String(item.flight_id),
        crewId: String(item.crew_id),
        crewName: String(item.full_name),
        employeeCode: String(item.employee_code),
        assignmentRole: String(
          item.assignment_role
        ) as FlightOperationDetailDto['crewAssignments'][number]['assignmentRole'],
        isPrimary: bool(item.is_primary),
        licenseExpiryDate: str(item.license_expiry_date),
        medicalExpiryDate: str(item.medical_expiry_date)
      })),
      readinessChecks: (
        this.sqlite
          .prepare(`SELECT * FROM flight_readiness_checks WHERE flight_id = ? ORDER BY check_code`)
          .all(id) as SqlRow[]
      ).map((item) => ({
        id: String(item.id),
        flightId: String(item.flight_id),
        checkCode: String(item.check_code),
        checkName: String(item.check_name),
        status: String(
          item.status
        ) as FlightOperationDetailDto['readinessChecks'][number]['status'],
        isRequired: bool(item.is_required),
        evaluatedAt: str(item.evaluated_at),
        evaluatedByUserId: str(item.evaluated_by_user_id),
        resultNote: str(item.result_note),
        sourceReference: str(item.source_reference)
      })),
      histories: (
        this.sqlite
          .prepare(
            `SELECT h.*, r.reason_code, r.description
         FROM flight_status_histories h
         LEFT JOIN ref_flight_reasons r ON r.id = h.reason_id
         WHERE h.flight_id = ?
         ORDER BY h.changed_at DESC`
          )
          .all(id) as SqlRow[]
      ).map((item): FlightStatusHistoryDto => ({
        id: String(item.id),
        flightId: String(item.flight_id),
        fromStatus: str(item.from_status) as FlightOperationStatus | null,
        toStatus: String(item.to_status) as FlightOperationStatus,
        actionType: String(item.action_type) as FlightStatusHistoryDto['actionType'],
        reasonId: str(item.reason_id),
        reasonLabel: str(item.reason_code) ?? str(item.description),
        reasonNote: str(item.reason_note),
        changedByUserId: str(item.changed_by_user_id),
        changedAt: String(item.changed_at),
        metadata: parseMetadata(item.metadata_json)
      })),
      manifests: this.listManifests(id),
      passengers: this.listPassengers(id),
      cargoItems: this.listCargo(id),
      fuelRequests: this.listFuel({ flightId: id }),
      stationServices: this.listStationServices({ flightId: id }),
      stationCosts: this.listStationCosts({ flightId: id }),
      maintenanceHandoffs: this.listMaintenance({ flightId: id }),
      financeHandoffs: this.listFinanceHandoffs(id)
    };
  }

  lookups(): FlightOperationLookupsDto {
    return {
      routes: (
        this.sqlite
          .prepare(
            `SELECT r.id, r.route_code, r.origin_station_id, r.destination_station_id,
                o.station_code as origin_code, d.station_code as destination_code
         FROM ref_routes r
         JOIN ref_stations o ON o.id = r.origin_station_id
         JOIN ref_stations d ON d.id = r.destination_station_id
         WHERE r.is_active = 1
         ORDER BY r.route_code`
          )
          .all() as SqlRow[]
      ).map((row) => ({
        value: String(row.id),
        title: `${String(row.route_code)} (${String(row.origin_code)} -> ${String(row.destination_code)})`,
        originStationId: String(row.origin_station_id),
        destinationStationId: String(row.destination_station_id)
      })),
      aircraft: (
        this.sqlite
          .prepare(
            `SELECT id, registration_number, aircraft_type, serviceability_status, fuel_type
         FROM ref_aircraft WHERE is_active = 1 ORDER BY registration_number`
          )
          .all() as SqlRow[]
      ).map((row) => ({
        value: String(row.id),
        title: `${String(row.registration_number)} - ${String(row.aircraft_type)}`,
        serviceabilityStatus: String(row.serviceability_status),
        fuelType: String(row.fuel_type)
      })),
      crews: (
        this.sqlite
          .prepare(
            `SELECT id, employee_code, full_name, crew_role, license_expiry_date, medical_expiry_date
         FROM ref_crews WHERE is_active = 1 ORDER BY full_name`
          )
          .all() as SqlRow[]
      ).map((row) => ({
        value: String(row.id),
        title: `${String(row.full_name)} (${String(row.crew_role)})`,
        crewRole: String(row.crew_role),
        licenseExpiryDate: str(row.license_expiry_date),
        medicalExpiryDate: str(row.medical_expiry_date)
      })),
      customers: this.lookup('ref_customers', 'account_name'),
      stations: this.lookup('ref_stations', 'station_code', 'station_name'),
      fuelSuppliers: (
        this.sqlite
          .prepare(
            `SELECT id, supplier_name, fuel_type, reference_price_per_litre
         FROM ref_fuel_suppliers WHERE is_active = 1 ORDER BY supplier_name`
          )
          .all() as SqlRow[]
      ).map((row) => ({
        value: String(row.id),
        title: String(row.supplier_name),
        fuelType: String(row.fuel_type),
        referencePricePerLitre: num(row.reference_price_per_litre)
      })),
      serviceSuppliers: (
        this.sqlite
          .prepare(
            `SELECT id, supplier_name, service_type, reference_rate
         FROM ref_station_service_suppliers WHERE is_active = 1 ORDER BY supplier_name`
          )
          .all() as SqlRow[]
      ).map((row) => ({
        value: String(row.id),
        title: String(row.supplier_name),
        serviceType: String(row.service_type),
        referenceRate: nullableNum(row.reference_rate)
      })),
      vendors: this.lookup('ref_vendors', 'vendor_name'),
      costCategories: this.lookup('ref_cost_categories', 'category_name'),
      currencies: this.lookup('ref_currencies', 'currency_code', 'currency_name'),
      dgCategories: this.lookup('ref_dg_categories', 'dg_code', 'description'),
      flightReasons: (
        this.sqlite
          .prepare(
            `SELECT id, reason_code, description, reason_type, requires_note
         FROM ref_flight_reasons WHERE is_active = 1 ORDER BY reason_code`
          )
          .all() as SqlRow[]
      ).map((row) => ({
        value: String(row.id),
        title: `${String(row.reason_code)} - ${String(row.description)}`,
        reasonType: String(row.reason_type),
        requiresNote: bool(row.requires_note)
      }))
    };
  }

  create(input: CreateFlightOperationBody) {
    const route = this.requireRow(
      `SELECT * FROM ref_routes WHERE id = ? AND is_active = 1`,
      input.routeId,
      'Route'
    );
    this.validateSchedule(input.scheduledDepartureAt ?? null, input.scheduledArrivalAt ?? null);

    const now = timestamp();
    const flightNumber = this.nextFlightNumber(input.flightDate);
    const id = `fop-${nanoid(12)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_operations (
          id, flight_number, flight_date, flight_type, route_id, origin_station_id,
          destination_station_id, customer_id, aircraft_id, pilot_in_command_id, co_pilot_id,
          scheduled_departure_at, scheduled_arrival_at, current_status, created_by_user_id,
          approved_by_user_id, remarks, is_locked, blocking_reason, created_at, updated_at
        ) VALUES (
          @id, @flightNumber, @flightDate, @flightType, @routeId, @originStationId,
          @destinationStationId, @customerId, @aircraftId, @pilotInCommandId, @coPilotId,
          @scheduledDepartureAt, @scheduledArrivalAt, 'DRAFT', 'USR-001',
          NULL, @remarks, 0, NULL, @createdAt, @updatedAt
        )`
      )
      .run({
        id,
        flightNumber,
        flightDate: input.flightDate,
        flightType: input.flightType,
        routeId: input.routeId,
        originStationId: route.origin_station_id,
        destinationStationId: route.destination_station_id,
        customerId: input.customerId ?? null,
        aircraftId: input.aircraftId ?? null,
        pilotInCommandId: input.pilotInCommandId ?? null,
        coPilotId: input.coPilotId ?? null,
        scheduledDepartureAt: input.scheduledDepartureAt ?? null,
        scheduledArrivalAt: input.scheduledArrivalAt ?? null,
        remarks: input.remarks ?? null,
        createdAt: now,
        updatedAt: now
      });

    this.ensureCrewAssignments(id, input.pilotInCommandId ?? null, input.coPilotId ?? null);
    this.ensureManifests(id);
    this.appendHistory(id, null, 'DRAFT', 'CREATE');
    this.evaluateReadiness(id, false);
    return this.detail(id);
  }

  update(id: string, input: CreateFlightOperationBody) {
    const flight = this.requireFlight(id);
    if (flight.currentStatus !== 'DRAFT' && flight.currentStatus !== 'REOPENED_FOR_CORRECTION') {
      throw new DomainError(
        'FLIGHT_LOCKED_FOR_EDIT',
        'Only draft or reopened flights can be edited.',
        409
      );
    }

    const route = this.requireRow(
      `SELECT * FROM ref_routes WHERE id = ? AND is_active = 1`,
      input.routeId,
      'Route'
    );
    this.validateSchedule(input.scheduledDepartureAt ?? null, input.scheduledArrivalAt ?? null);

    this.sqlite
      .prepare(
        `UPDATE flight_operations
         SET flight_date = @flightDate,
             flight_type = @flightType,
             route_id = @routeId,
             origin_station_id = @originStationId,
             destination_station_id = @destinationStationId,
             customer_id = @customerId,
             aircraft_id = @aircraftId,
             pilot_in_command_id = @pilotInCommandId,
             co_pilot_id = @coPilotId,
             scheduled_departure_at = @scheduledDepartureAt,
             scheduled_arrival_at = @scheduledArrivalAt,
             remarks = @remarks,
             updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({
        id,
        flightDate: input.flightDate,
        flightType: input.flightType,
        routeId: input.routeId,
        originStationId: route.origin_station_id,
        destinationStationId: route.destination_station_id,
        customerId: input.customerId ?? null,
        aircraftId: input.aircraftId ?? null,
        pilotInCommandId: input.pilotInCommandId ?? null,
        coPilotId: input.coPilotId ?? null,
        scheduledDepartureAt: input.scheduledDepartureAt ?? null,
        scheduledArrivalAt: input.scheduledArrivalAt ?? null,
        remarks: input.remarks ?? null,
        updatedAt: timestamp()
      });

    this.sqlite.prepare('DELETE FROM flight_crew_assignments WHERE flight_id = ?').run(id);
    this.ensureCrewAssignments(id, input.pilotInCommandId ?? null, input.coPilotId ?? null);
    this.evaluateReadiness(id, false);
    return this.detail(id);
  }

  submit(id: string) {
    const flight = this.requireFlight(id);
    if (flight.currentStatus !== 'DRAFT' && flight.currentStatus !== 'REOPENED_FOR_CORRECTION') {
      throw new DomainError(
        'INVALID_TRANSITION',
        'Only draft or reopened flights can be submitted.',
        409
      );
    }
    if (!flight.aircraftId || !flight.pilotInCommandId) {
      throw new DomainError(
        'FLIGHT_SUBMIT_INCOMPLETE',
        'Submit requires aircraft and PIC assignment.',
        422
      );
    }

    this.transition(id, 'PENDING_READINESS');
    return this.evaluateReadiness(id, true);
  }

  evaluate(id: string) {
    return this.evaluateReadiness(id, true);
  }

  approve(id: string, body: ActionNoteBody = {}) {
    const flight = this.requireFlight(id);
    if (flight.currentStatus !== 'READY_FOR_APPROVAL') {
      throw new DomainError('READINESS_NOT_APPROVABLE', 'Flight must be ready for approval.', 409);
    }
    if (flight.createdByUserId === 'USR-DEMO-ADMIN') {
      throw new DomainError(
        'SELF_APPROVAL_BLOCKED',
        'Creator cannot approve their own flight.',
        409
      );
    }

    this.sqlite
      .prepare(
        `UPDATE flight_operations
         SET approved_by_user_id = 'USR-DEMO-ADMIN', updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp(), id);
    this.transition(id, 'APPROVED', { note: body.note });
    return this.detail(id);
  }

  transition(id: string, toStatus: FlightOperationStatus, options: { note?: string } = {}) {
    const flight = this.requireFlight(id);
    const allowed = normalTransitions[flight.currentStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new DomainError(
        'INVALID_TRANSITION',
        `${flight.currentStatus} cannot move to ${toStatus}.`,
        409
      );
    }

    this.sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status = ?, is_locked = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(toStatus, toStatus === 'CLOSED' ? 1 : 0, timestamp(), id);
    this.appendHistory(id, flight.currentStatus, toStatus, actionTypeForStatus(toStatus), {
      reasonNote: options.note
    });

    if (toStatus === 'CLOSED') {
      this.upsertFinanceHandoff(
        id,
        'flight',
        id,
        'FLIGHT_CLOSED_ELIGIBLE_FOR_INVOICE',
        'READY',
        'Closed flight is eligible for finance invoice workflow.',
        null,
        null
      );
    }

    return this.detail(id);
  }

  depart(id: string, body: ActualTimeBody) {
    this.sqlite
      .prepare('UPDATE flight_operations SET actual_departure_at = ?, updated_at = ? WHERE id = ?')
      .run(body.actualAt, timestamp(), id);
    return this.transition(id, 'IN_PROGRESS');
  }

  land(id: string, body: ActualTimeBody) {
    this.sqlite
      .prepare('UPDATE flight_operations SET actual_arrival_at = ?, updated_at = ? WHERE id = ?')
      .run(body.actualAt, timestamp(), id);
    return this.transition(id, 'LANDED');
  }

  cancel(id: string, body: FlightReasonActionBody) {
    const flight = this.requireFlight(id);
    if (flight.currentStatus === 'CLOSED') {
      throw new DomainError(
        'CLOSED_FLIGHT_LOCKED',
        'Closed flight must be reopened before cancellation.',
        409
      );
    }
    this.validateReason(body);
    this.sqlite
      .prepare(
        `UPDATE flight_operations SET current_status = 'CANCELLED', is_locked = 1, updated_at = ? WHERE id = ?`
      )
      .run(timestamp(), id);
    this.appendHistory(id, flight.currentStatus, 'CANCELLED', 'CANCEL', {
      reasonId: body.reasonId,
      reasonNote: body.reasonNote
    });
    this.upsertFinanceHandoff(
      id,
      'flight',
      id,
      'FLIGHT_CANCELLED_VOID_REQUEST',
      'VOID',
      'Cancellation marks related finance drafts as void.',
      null,
      null
    );
    return this.detail(id);
  }

  divert(id: string, body: FlightReasonActionBody) {
    const flight = this.requireFlight(id);
    if (!body.diversionStationId) {
      throw new DomainError('DIVERSION_STATION_REQUIRED', 'Diversion station is required.', 422);
    }
    this.validateReason(body);
    this.sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status = 'DIVERTED', destination_station_id = ?, actual_arrival_at = COALESCE(actual_arrival_at, ?), updated_at = ?
         WHERE id = ?`
      )
      .run(body.diversionStationId, timestamp(), timestamp(), id);
    this.appendHistory(id, flight.currentStatus, 'DIVERTED', 'DIVERT', {
      reasonId: body.reasonId,
      reasonNote: body.reasonNote,
      metadata: { diversionStationId: body.diversionStationId }
    });
    return this.detail(id);
  }

  reopen(id: string, body: FlightReasonActionBody) {
    const flight = this.requireFlight(id);
    if (flight.currentStatus !== 'CLOSED') {
      throw new DomainError('REOPEN_ONLY_CLOSED', 'Only closed flights can be reopened.', 409);
    }
    this.validateReason(body);
    this.sqlite
      .prepare(
        `UPDATE flight_operations SET current_status = 'REOPENED_FOR_CORRECTION', is_locked = 0, updated_at = ? WHERE id = ?`
      )
      .run(timestamp(), id);
    this.appendHistory(id, 'CLOSED', 'REOPENED_FOR_CORRECTION', 'REOPEN', {
      reasonId: body.reasonId,
      reasonNote: body.reasonNote
    });
    return this.detail(id);
  }

  createPassenger(body: CreatePassengerBody) {
    this.requireManifest(body.manifestId);
    this.sqlite
      .prepare(
        `INSERT INTO flight_manifest_passengers (
          id, manifest_id, full_name, identity_type, identity_number, weight_kg, seat_number,
          baggage_weight_kg, remarks, created_at, updated_at
        ) VALUES (@id, @manifestId, @fullName, @identityType, @identityNumber, @weightKg, @seatNumber,
          @baggageWeightKg, @remarks, @createdAt, @updatedAt)`
      )
      .run({ id: nanoid(), createdAt: timestamp(), updatedAt: timestamp(), ...body });
    return this.detail(String(this.manifestFlightId(body.manifestId)));
  }

  createCargo(body: CreateCargoBody) {
    this.requireManifest(body.manifestId);
    this.sqlite
      .prepare(
        `INSERT INTO flight_manifest_cargo_items (
          id, manifest_id, description, sender_name, receiver_name, actual_weight_kg,
          volume_weight_kg, chargeable_weight_kg, dg_category_id, dg_acceptance_status,
          remarks, created_at, updated_at
        ) VALUES (@id, @manifestId, @description, @senderName, @receiverName, @actualWeightKg,
          @volumeWeightKg, @chargeableWeightKg, @dgCategoryId, @dgAcceptanceStatus, @remarks,
          @createdAt, @updatedAt)`
      )
      .run({ id: nanoid(), createdAt: timestamp(), updatedAt: timestamp(), ...body });
    const flightId = String(this.manifestFlightId(body.manifestId));
    this.evaluateReadiness(flightId, false);
    return this.detail(flightId);
  }

  createFuel(body: CreateFuelRequestBody) {
    const flight = this.requireFlight(body.flightId);
    const supplier = this.requireRow(
      `SELECT * FROM ref_fuel_suppliers WHERE id = ? AND is_active = 1`,
      body.fuelSupplierId,
      'Fuel supplier'
    );
    if (
      flight.aircraftServiceability &&
      supplier.fuel_type &&
      body.fuelType !== supplier.fuel_type
    ) {
      throw new DomainError('FUEL_TYPE_MISMATCH', 'Fuel type must match selected supplier.', 422);
    }
    const id = `fuel-${nanoid(10)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_fuel_requests (
          id, flight_id, fuel_supplier_id, fuel_type, requested_quantity_litre,
          approved_quantity_litre, actual_uplift_litre, reference_price_per_litre,
          actual_price_per_litre, tax_code_id, tax_amount, total_cost, status,
          requested_by_user_id, created_at, updated_at
        ) VALUES (@id, @flightId, @fuelSupplierId, @fuelType, @requestedQuantityLitre,
          NULL, NULL, @referencePricePerLitre, NULL, NULL, NULL, NULL, 'REQUESTED',
          'USR-DEMO-ADMIN', @createdAt, @updatedAt)`
      )
      .run({ id, createdAt: timestamp(), updatedAt: timestamp(), ...body });
    this.evaluateReadiness(body.flightId, false);
    return this.detail(body.flightId);
  }

  fuelAction(
    id: string,
    action: 'approve' | 'uplift' | 'post' | 'reject',
    body: Record<string, unknown>
  ) {
    const request = this.requireRow(
      `SELECT * FROM flight_fuel_requests WHERE id = ?`,
      id,
      'Fuel request'
    );
    const now = timestamp();
    if (action === 'approve') {
      this.sqlite
        .prepare(
          `UPDATE flight_fuel_requests SET status = 'APPROVED', approved_quantity_litre = ?, approved_by_user_id = 'USR-DEMO-ADMIN', updated_at = ? WHERE id = ?`
        )
        .run(Number(body.approvedQuantityLitre ?? request.requested_quantity_litre), now, id);
    } else if (action === 'uplift') {
      const actual = Number(body.actualUpliftLitre ?? 0);
      const price = Number(body.actualPricePerLitre ?? request.reference_price_per_litre ?? 0);
      const total = Math.round(actual * price);
      this.sqlite
        .prepare(
          `UPDATE flight_fuel_requests SET status = 'UPLIFTED', actual_uplift_litre = ?, actual_price_per_litre = ?, total_cost = ?, tax_amount = 0, uplift_recorded_by_user_id = 'USR-DEMO-ADMIN', variance_note = ?, updated_at = ? WHERE id = ?`
        )
        .run(actual, price, total, String(body.varianceNote ?? ''), now, id);
    } else if (action === 'post') {
      this.sqlite
        .prepare(`UPDATE flight_fuel_requests SET status = 'POSTED', updated_at = ? WHERE id = ?`)
        .run(now, id);
      const latest = this.requireRow(
        `SELECT * FROM flight_fuel_requests WHERE id = ?`,
        id,
        'Fuel request'
      );
      this.upsertFinanceHandoff(
        String(latest.flight_id),
        'fuel',
        id,
        'FUEL_COST_DRAFT',
        'READY',
        'Fuel uplift cost posted to finance handoff preview.',
        nullableNum(latest.total_cost),
        null
      );
    } else {
      this.sqlite
        .prepare(
          `UPDATE flight_fuel_requests SET status = 'REJECTED', rejection_reason = ?, updated_at = ? WHERE id = ?`
        )
        .run(String(body.rejectionReason ?? 'Rejected in demo workflow.'), now, id);
    }
    const flightId = String(request.flight_id);
    this.evaluateReadiness(flightId, false);
    return this.detail(flightId);
  }

  createStationService(body: CreateStationServiceBody) {
    const id = `station-service-${nanoid(10)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_station_service_requests (
          id, flight_id, station_id, service_supplier_id, service_type, status,
          reference_rate, created_at, updated_at
        ) VALUES (@id, @flightId, @stationId, @serviceSupplierId, @serviceType, 'REQUESTED',
          @referenceRate, @createdAt, @updatedAt)`
      )
      .run({ id, createdAt: timestamp(), updatedAt: timestamp(), ...body });
    this.evaluateReadiness(body.flightId, false);
    return this.detail(body.flightId);
  }

  confirmStationService(id: string) {
    const row = this.requireRow(
      `SELECT * FROM flight_station_service_requests WHERE id = ?`,
      id,
      'Station service'
    );
    this.sqlite
      .prepare(
        `UPDATE flight_station_service_requests SET status = 'CONFIRMED', confirmed_at = ?, confirmed_by_user_id = 'USR-DEMO-ADMIN', updated_at = ? WHERE id = ?`
      )
      .run(timestamp(), timestamp(), id);
    this.evaluateReadiness(String(row.flight_id), false);
    return this.detail(String(row.flight_id));
  }

  createStationCost(body: CreateStationCostBody) {
    const id = `station-cost-${nanoid(10)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_station_costs (
          id, flight_id, station_id, vendor_id, cost_category_id, amount, currency_id,
          description, status, submitted_by_user_id, created_at, updated_at
        ) VALUES (@id, @flightId, @stationId, @vendorId, @costCategoryId, @amount, @currencyId,
          @description, 'DRAFT', 'USR-DEMO-ADMIN', @createdAt, @updatedAt)`
      )
      .run({ id, createdAt: timestamp(), updatedAt: timestamp(), ...body });
    return body.flightId ? this.detail(body.flightId) : this.listStationCosts();
  }

  approveStationCost(id: string) {
    const row = this.requireRow(
      `SELECT * FROM flight_station_costs WHERE id = ?`,
      id,
      'Station cost'
    );
    this.sqlite
      .prepare(
        `UPDATE flight_station_costs SET status = 'APPROVED', approved_by_user_id = 'USR-DEMO-ADMIN', approved_at = ?, updated_at = ? WHERE id = ?`
      )
      .run(timestamp(), timestamp(), id);
    if (row.flight_id) {
      this.upsertFinanceHandoff(
        String(row.flight_id),
        'station_cost',
        id,
        'STATION_COST_DRAFT',
        'READY',
        'Approved station cost ready for finance handoff.',
        nullableNum(row.amount),
        str(row.currency_id)
      );
      return this.detail(String(row.flight_id));
    }
    return row;
  }

  createMaintenance(body: CreateMaintenanceHandoffBody) {
    const id = `maintenance-${nanoid(10)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_maintenance_handoffs (
          id, flight_id, aircraft_id, serviceability_status, work_order_reference,
          maintenance_note, spare_part_reference, maintenance_cost, currency_id, status,
          recorded_by_user_id, created_at, updated_at
        ) VALUES (@id, @flightId, @aircraftId, @serviceabilityStatus, @workOrderReference,
          @maintenanceNote, @sparePartReference, @maintenanceCost, @currencyId, 'DRAFT',
          'USR-DEMO-ADMIN', @createdAt, @updatedAt)`
      )
      .run({ id, createdAt: timestamp(), updatedAt: timestamp(), ...body });
    return body.flightId ? this.detail(body.flightId) : this.listMaintenance({});
  }

  approveMaintenance(id: string) {
    const row = this.requireRow(
      `SELECT * FROM flight_maintenance_handoffs WHERE id = ?`,
      id,
      'Maintenance handoff'
    );
    this.sqlite
      .prepare(
        `UPDATE flight_maintenance_handoffs SET status = 'APPROVED', approved_by_user_id = 'USR-DEMO-ADMIN', approved_at = ?, updated_at = ? WHERE id = ?`
      )
      .run(timestamp(), timestamp(), id);
    if (row.flight_id) {
      this.upsertFinanceHandoff(
        String(row.flight_id),
        'maintenance',
        id,
        'MAINTENANCE_EXPENSE_DRAFT',
        'READY',
        'Approved maintenance handoff ready for finance preview.',
        nullableNum(row.maintenance_cost),
        str(row.currency_id)
      );
      return this.detail(String(row.flight_id));
    }
    return row;
  }

  listFuel(params: { flightId?: string } = {}): FlightFuelRequestDto[] {
    const where = params.flightId ? 'WHERE f.id = @flightId' : '';
    return (
      this.sqlite
        .prepare(
          `SELECT r.*, f.flight_number, s.supplier_name
       FROM flight_fuel_requests r
       JOIN flight_operations f ON f.id = r.flight_id
       JOIN ref_fuel_suppliers s ON s.id = r.fuel_supplier_id
       ${where}
       ORDER BY r.updated_at DESC`
        )
        .all(params) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: String(row.flight_id),
      flightNumber: String(row.flight_number),
      fuelSupplierId: String(row.fuel_supplier_id),
      supplierName: String(row.supplier_name),
      fuelType: String(row.fuel_type),
      requestedQuantityLitre: num(row.requested_quantity_litre),
      approvedQuantityLitre: nullableNum(row.approved_quantity_litre),
      actualUpliftLitre: nullableNum(row.actual_uplift_litre),
      referencePricePerLitre: nullableNum(row.reference_price_per_litre),
      actualPricePerLitre: nullableNum(row.actual_price_per_litre),
      taxAmount: nullableNum(row.tax_amount),
      totalCost: nullableNum(row.total_cost),
      status: String(row.status) as FlightFuelRequestDto['status'],
      varianceNote: str(row.variance_note)
    }));
  }

  listStationServices(params: { flightId?: string } = {}): FlightStationServiceDto[] {
    const where = params.flightId ? 'WHERE f.id = @flightId' : '';
    return (
      this.sqlite
        .prepare(
          `SELECT r.*, f.flight_number, s.station_code, p.supplier_name
       FROM flight_station_service_requests r
       JOIN flight_operations f ON f.id = r.flight_id
       JOIN ref_stations s ON s.id = r.station_id
       JOIN ref_station_service_suppliers p ON p.id = r.service_supplier_id
       ${where}
       ORDER BY r.updated_at DESC`
        )
        .all(params) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: String(row.flight_id),
      flightNumber: String(row.flight_number),
      stationId: String(row.station_id),
      stationCode: String(row.station_code),
      serviceSupplierId: String(row.service_supplier_id),
      supplierName: String(row.supplier_name),
      serviceType: String(row.service_type) as FlightStationServiceDto['serviceType'],
      status: String(row.status) as FlightStationServiceDto['status'],
      referenceRate: nullableNum(row.reference_rate)
    }));
  }

  listStationCosts(params: { flightId?: string } = {}): FlightStationCostDto[] {
    const where = params.flightId ? 'WHERE f.id = @flightId' : '';
    return (
      this.sqlite
        .prepare(
          `SELECT c.*, f.flight_number, s.station_code, v.vendor_name, cc.category_name, cur.currency_code
       FROM flight_station_costs c
       LEFT JOIN flight_operations f ON f.id = c.flight_id
       JOIN ref_stations s ON s.id = c.station_id
       LEFT JOIN ref_vendors v ON v.id = c.vendor_id
       JOIN ref_cost_categories cc ON cc.id = c.cost_category_id
       JOIN ref_currencies cur ON cur.id = c.currency_id
       ${where}
       ORDER BY c.updated_at DESC`
        )
        .all(params) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: str(row.flight_id),
      flightNumber: str(row.flight_number),
      stationId: String(row.station_id),
      stationCode: String(row.station_code),
      vendorId: str(row.vendor_id),
      vendorName: str(row.vendor_name),
      costCategoryId: String(row.cost_category_id),
      costCategoryName: String(row.category_name),
      amount: num(row.amount),
      currencyId: String(row.currency_id),
      currencyCode: String(row.currency_code),
      description: String(row.description),
      status: String(row.status) as FlightStationCostDto['status']
    }));
  }

  listMaintenance(params: { flightId?: string } = {}): FlightMaintenanceHandoffDto[] {
    const where = params.flightId ? 'WHERE f.id = @flightId' : '';
    return (
      this.sqlite
        .prepare(
          `SELECT m.*, f.flight_number, a.registration_number, cur.currency_code
       FROM flight_maintenance_handoffs m
       LEFT JOIN flight_operations f ON f.id = m.flight_id
       JOIN ref_aircraft a ON a.id = m.aircraft_id
       JOIN ref_currencies cur ON cur.id = m.currency_id
       ${where}
       ORDER BY m.updated_at DESC`
        )
        .all(params) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: str(row.flight_id),
      flightNumber: str(row.flight_number),
      aircraftId: String(row.aircraft_id),
      aircraftRegistration: String(row.registration_number),
      serviceabilityStatus: String(row.serviceability_status),
      workOrderReference: str(row.work_order_reference),
      maintenanceNote: str(row.maintenance_note),
      sparePartReference: str(row.spare_part_reference),
      maintenanceCost: num(row.maintenance_cost),
      currencyId: String(row.currency_id),
      currencyCode: String(row.currency_code),
      status: String(row.status) as FlightMaintenanceHandoffDto['status']
    }));
  }

  private queryFlights(query: ListFlightOperationsQuery) {
    const conditions: string[] = [];
    const params: Record<string, SqlValue> = {
      search: `%${query.search ?? ''}%`,
      limit: query.limit,
      offset: query.offset
    };

    if (query.search) {
      conditions.push(
        '(f.flight_number LIKE @search OR c.account_name LIKE @search OR r.route_code LIKE @search)'
      );
    }
    for (const [key, column] of [
      ['status', 'f.current_status'],
      ['flightType', 'f.flight_type'],
      ['routeId', 'f.route_id'],
      ['originStationId', 'f.origin_station_id'],
      ['destinationStationId', 'f.destination_station_id'],
      ['aircraftId', 'f.aircraft_id'],
      ['customerId', 'f.customer_id']
    ] as const) {
      const value = query[key];
      if (value) {
        conditions.push(`${column} = @${key}`);
        params[key] = value;
      }
    }
    if (query.dateFrom) {
      conditions.push('f.flight_date >= @dateFrom');
      params.dateFrom = query.dateFrom;
    }
    if (query.dateTo) {
      conditions.push('f.flight_date <= @dateTo');
      params.dateTo = query.dateTo;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return this.sqlite
      .prepare(
        `${this.flightSelectSql()} ${where} ORDER BY f.flight_date DESC, f.flight_number DESC LIMIT @limit OFFSET @offset`
      )
      .all(params) as SqlRow[];
  }

  private queryFlightById(id: string) {
    return this.sqlite.prepare(`${this.flightSelectSql()} WHERE f.id = ?`).get(id) as
      SqlRow | undefined;
  }

  private flightSelectSql() {
    return `SELECT f.*,
        r.route_code,
        o.station_code as origin_station_code,
        d.station_code as destination_station_code,
        c.account_name as customer_name,
        a.registration_number as aircraft_registration,
        a.serviceability_status as aircraft_serviceability,
        pic.full_name as pic_name,
        cop.full_name as copilot_name,
        (SELECT COUNT(*) FROM flight_readiness_checks chk WHERE chk.flight_id = f.id AND chk.is_required = 1) as required_checks,
        (SELECT COUNT(*) FROM flight_readiness_checks chk WHERE chk.flight_id = f.id AND chk.status = 'PASS') as pass_checks,
        (SELECT COUNT(*) FROM flight_readiness_checks chk WHERE chk.flight_id = f.id AND chk.status = 'NOT_APPLICABLE') as na_checks
      FROM flight_operations f
      JOIN ref_routes r ON r.id = f.route_id
      JOIN ref_stations o ON o.id = f.origin_station_id
      JOIN ref_stations d ON d.id = f.destination_station_id
      LEFT JOIN ref_customers c ON c.id = f.customer_id
      LEFT JOIN ref_aircraft a ON a.id = f.aircraft_id
      LEFT JOIN ref_crews pic ON pic.id = f.pilot_in_command_id
      LEFT JOIN ref_crews cop ON cop.id = f.co_pilot_id`;
  }

  private lookup(table: string, labelColumn: string, subtitleColumn?: string) {
    const rows = this.sqlite
      .prepare(
        `SELECT id, ${labelColumn} as label${subtitleColumn ? `, ${subtitleColumn} as subtitle` : ''}
       FROM ${table}
       WHERE is_active = 1
       ORDER BY ${labelColumn}`
      )
      .all() as SqlRow[];

    return rows.map((row) => ({
      value: String(row.id),
      title: subtitleColumn ? `${String(row.label)} - ${String(row.subtitle)}` : String(row.label)
    }));
  }

  private requireFlight(id: string) {
    const row = this.queryFlightById(id);
    if (!row) throw notFound('Flight', id);
    return mapFlight(row);
  }

  private requireRow(sql: string, id: string, entity: string) {
    const row = this.sqlite.prepare(sql).get(id) as SqlRow | undefined;
    if (!row) throw notFound(entity, id);
    return row;
  }

  private requireManifest(id: string) {
    return this.requireRow(`SELECT * FROM flight_manifests WHERE id = ?`, id, 'Manifest');
  }

  private manifestFlightId(manifestId: string) {
    return this.requireManifest(manifestId).flight_id;
  }

  private validateSchedule(departure: string | null, arrival: string | null) {
    if (departure && arrival && arrival < departure) {
      throw new DomainError(
        'INVALID_SCHEDULE',
        'Scheduled arrival cannot be before departure.',
        422
      );
    }
  }

  private validateReason(body: FlightReasonActionBody) {
    const reason = this.requireRow(
      `SELECT * FROM ref_flight_reasons WHERE id = ? AND is_active = 1`,
      body.reasonId,
      'Flight reason'
    );
    if (bool(reason.requires_note) && !body.reasonNote?.trim()) {
      throw new DomainError('REASON_NOTE_REQUIRED', 'This flight reason requires a note.', 422);
    }
  }

  private nextFlightNumber(date: string) {
    const compact = date.replaceAll('-', '');
    const count = this.sqlite
      .prepare(`SELECT COUNT(*) as count FROM flight_operations WHERE flight_number LIKE ?`)
      .get(`AMA-${compact}-%`) as SqlRow;
    return `AMA-${compact}-${String(Number(count.count) + 1).padStart(3, '0')}`;
  }

  private ensureCrewAssignments(flightId: string, picId: string | null, coPilotId: string | null) {
    if (picId && coPilotId && picId === coPilotId) {
      throw new DomainError(
        'DUPLICATE_CREW_ASSIGNMENT',
        'PIC and co-pilot cannot be the same crew.',
        422
      );
    }
    const now = timestamp();
    if (picId) {
      this.requireRow(`SELECT * FROM ref_crews WHERE id = ? AND is_active = 1`, picId, 'PIC');
      this.sqlite
        .prepare(
          `INSERT INTO flight_crew_assignments VALUES (?, ?, ?, 'PILOT_IN_COMMAND', 1, ?, ?)`
        )
        .run(`crew-${nanoid(10)}`, flightId, picId, now, now);
    }
    if (coPilotId) {
      this.requireRow(
        `SELECT * FROM ref_crews WHERE id = ? AND is_active = 1`,
        coPilotId,
        'Co-pilot'
      );
      this.sqlite
        .prepare(`INSERT INTO flight_crew_assignments VALUES (?, ?, ?, 'CO_PILOT', 1, ?, ?)`)
        .run(`crew-${nanoid(10)}`, flightId, coPilotId, now, now);
    }
  }

  private ensureManifests(flightId: string) {
    const now = timestamp();
    for (const type of ['PASSENGER', 'CARGO']) {
      this.sqlite
        .prepare(
          `INSERT OR IGNORE INTO flight_manifests
           VALUES (?, ?, ?, 'DRAFT', NULL, NULL, NULL, ?, ?)`
        )
        .run(`manifest-${flightId}-${type.toLowerCase()}`, flightId, type, now, now);
    }
  }

  private appendHistory(
    flightId: string,
    fromStatus: FlightOperationStatus | null,
    toStatus: FlightOperationStatus,
    actionType: string,
    options: {
      reasonId?: string;
      reasonNote?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO flight_status_histories
         VALUES (?, ?, ?, ?, ?, ?, ?, 'USR-DEMO-ADMIN', ?, ?)`
      )
      .run(
        `hist-${nanoid(12)}`,
        flightId,
        fromStatus,
        toStatus,
        actionType,
        options.reasonId ?? null,
        options.reasonNote ?? null,
        timestamp(),
        options.metadata ? JSON.stringify(options.metadata) : null
      );
  }

  private evaluateReadiness(id: string, updateStatus: boolean) {
    const flight = this.requireFlight(id);
    const now = timestamp();
    const results = this.calculateReadiness(id, flight);

    for (const result of results) {
      this.sqlite
        .prepare(
          `INSERT INTO flight_readiness_checks (
            id, flight_id, check_code, check_name, status, is_required, evaluated_at,
            evaluated_by_user_id, result_note, source_reference, created_at, updated_at
          ) VALUES (
            @id, @flightId, @checkCode, @checkName, @status, @isRequired, @evaluatedAt,
            'USR-DEMO-ADMIN', @resultNote, @sourceReference, @createdAt, @updatedAt
          )
          ON CONFLICT(flight_id, check_code) DO UPDATE SET
            status = excluded.status,
            evaluated_at = excluded.evaluated_at,
            evaluated_by_user_id = excluded.evaluated_by_user_id,
            result_note = excluded.result_note,
            source_reference = excluded.source_reference,
            updated_at = excluded.updated_at`
        )
        .run({
          id: `check-${id}-${result.checkCode.toLowerCase().replaceAll('_', '-')}`,
          flightId: id,
          checkCode: result.checkCode,
          checkName: result.checkName,
          status: result.status,
          isRequired: 1,
          evaluatedAt: now,
          resultNote: result.resultNote,
          sourceReference: result.sourceReference,
          createdAt: now,
          updatedAt: now
        });
    }

    const fail = results.find((result) => result.status === 'FAIL');
    const pending = results.find((result) => result.status === 'PENDING');
    const nextStatus: FlightOperationStatus = fail
      ? 'BLOCKED'
      : pending
        ? 'PENDING_READINESS'
        : 'READY_FOR_APPROVAL';

    if (
      updateStatus &&
      ['PENDING_READINESS', 'BLOCKED', 'READY_FOR_APPROVAL', 'DRAFT'].includes(flight.currentStatus)
    ) {
      this.sqlite
        .prepare(
          `UPDATE flight_operations SET current_status = ?, blocking_reason = ?, updated_at = ? WHERE id = ?`
        )
        .run(nextStatus, fail?.resultNote ?? null, now, id);
      if (nextStatus !== flight.currentStatus) {
        this.appendHistory(
          id,
          flight.currentStatus,
          nextStatus,
          nextStatus === 'BLOCKED' ? 'BLOCK' : 'READINESS_EVALUATED'
        );
      }
    }

    return this.detail(id);
  }

  private calculateReadiness(id: string, flight: FlightOperationRecord) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = {
      passengerManifest: this.sqlite
        .prepare(
          `SELECT * FROM flight_manifests WHERE flight_id = ? AND manifest_type = 'PASSENGER'`
        )
        .get(id) as SqlRow | undefined,
      cargoManifest: this.sqlite
        .prepare(`SELECT * FROM flight_manifests WHERE flight_id = ? AND manifest_type = 'CARGO'`)
        .get(id) as SqlRow | undefined,
      dgPending: this.sqlite
        .prepare(
          `SELECT COUNT(*) as count
         FROM flight_manifest_cargo_items i
         JOIN flight_manifests m ON m.id = i.manifest_id
         WHERE m.flight_id = ? AND i.dg_category_id IS NOT NULL AND i.dg_acceptance_status <> 'ACCEPTED'`
        )
        .get(id) as SqlRow,
      fuelPosted: this.sqlite
        .prepare(
          `SELECT COUNT(*) as count FROM flight_fuel_requests WHERE flight_id = ? AND status IN ('POSTED', 'UPLIFTED')`
        )
        .get(id) as SqlRow,
      handlingConfirmed: this.sqlite
        .prepare(
          `SELECT COUNT(*) as count FROM flight_station_service_requests WHERE flight_id = ? AND status = 'CONFIRMED'`
        )
        .get(id) as SqlRow,
      crew: this.sqlite
        .prepare(
          `SELECT c.* FROM flight_crew_assignments a JOIN ref_crews c ON c.id = a.crew_id WHERE a.flight_id = ?`
        )
        .all(id) as SqlRow[]
    };

    const aircraftPass = flight.aircraftServiceability === 'SERVICEABLE';
    const crewExpiry = rows.crew.find((crew) => {
      const licence = str(crew.license_expiry_date);
      const medical = str(crew.medical_expiry_date);
      return (licence && licence < today) || (medical && medical < today);
    });
    const manifestApproved =
      rows.passengerManifest?.status === 'APPROVED' && rows.cargoManifest?.status === 'APPROVED';
    const dgAccepted = Number(rows.dgPending.count) === 0;
    const fuelConfirmed = Number(rows.fuelPosted.count) > 0;
    const handlingConfirmed = Number(rows.handlingConfirmed.count) > 0;

    return [
      {
        checkCode: 'AIRCRAFT_SERVICEABILITY',
        checkName: 'Aircraft serviceability',
        status: aircraftPass ? 'PASS' : 'FAIL',
        resultNote: aircraftPass ? 'Aircraft is serviceable.' : 'Aircraft is not serviceable.',
        sourceReference: flight.aircraftRegistration ?? 'aircraft'
      },
      {
        checkCode: 'CREW_AVAILABILITY',
        checkName: 'Crew availability',
        status: rows.crew.length > 0 ? 'PASS' : 'PENDING',
        resultNote:
          rows.crew.length > 0
            ? 'Crew assigned for demo schedule window.'
            : 'Crew assignment is pending.',
        sourceReference: 'flight_crew_assignments'
      },
      {
        checkCode: 'CREW_LICENSE_MEDICAL',
        checkName: 'Crew license and medical',
        status: crewExpiry ? 'FAIL' : rows.crew.length > 0 ? 'PASS' : 'PENDING',
        resultNote: crewExpiry
          ? `${String(crewExpiry.full_name)} has expired licence or medical document.`
          : 'Crew licence and medical dates are valid.',
        sourceReference: 'ref_crews'
      },
      {
        checkCode: 'MANIFEST_APPROVED',
        checkName: 'Manifest approved',
        status: manifestApproved ? 'PASS' : 'PENDING',
        resultNote: manifestApproved
          ? 'Passenger and cargo manifests approved.'
          : 'Manifest approval is pending.',
        sourceReference: 'flight_manifests'
      },
      {
        checkCode: 'DG_ACCEPTANCE',
        checkName: 'Dangerous goods acceptance',
        status: dgAccepted ? 'NOT_APPLICABLE' : 'PENDING',
        resultNote: dgAccepted ? 'No pending DG cargo.' : 'DG cargo requires acceptance.',
        sourceReference: 'flight_manifest_cargo_items'
      },
      {
        checkCode: 'FUEL_CONFIRMED',
        checkName: 'Fuel confirmed',
        status: fuelConfirmed ? 'PASS' : 'PENDING',
        resultNote: fuelConfirmed ? 'Fuel uplift or post exists.' : 'Fuel confirmation is pending.',
        sourceReference: 'flight_fuel_requests'
      },
      {
        checkCode: 'HANDLING_CONFIRMED',
        checkName: 'Handling confirmed',
        status: handlingConfirmed ? 'PASS' : 'PENDING',
        resultNote: handlingConfirmed
          ? 'Station service confirmed.'
          : 'Handling or parking confirmation pending.',
        sourceReference: 'flight_station_service_requests'
      },
      {
        checkCode: 'SEPARATION_OF_DUTIES',
        checkName: 'Separation of duties',
        status: flight.createdByUserId === 'USR-DEMO-ADMIN' ? 'FAIL' : 'PASS',
        resultNote:
          flight.createdByUserId === 'USR-DEMO-ADMIN'
            ? 'Creator cannot approve their own flight.'
            : 'Creator and approver can be separated.',
        sourceReference: 'demo-rbac'
      }
    ] as Array<{
      checkCode: string;
      checkName: string;
      status: 'PENDING' | 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
      resultNote: string;
      sourceReference: string;
    }>;
  }

  private listManifests(id: string): FlightManifestDto[] {
    return (
      this.sqlite
        .prepare(
          `SELECT m.*,
         (SELECT COUNT(*) FROM flight_manifest_passengers p WHERE p.manifest_id = m.id) as passenger_count,
         (SELECT COALESCE(SUM(COALESCE(p.weight_kg, 0) + COALESCE(p.baggage_weight_kg, 0)), 0) FROM flight_manifest_passengers p WHERE p.manifest_id = m.id) as passenger_weight_kg,
         (SELECT COUNT(*) FROM flight_manifest_cargo_items c WHERE c.manifest_id = m.id) as cargo_count,
         (SELECT COALESCE(SUM(c.actual_weight_kg), 0) FROM flight_manifest_cargo_items c WHERE c.manifest_id = m.id) as cargo_actual_weight_kg,
         (SELECT COUNT(*) FROM flight_manifest_cargo_items c WHERE c.manifest_id = m.id AND c.dg_acceptance_status = 'PENDING') as dg_pending_count,
         (SELECT COUNT(*) FROM flight_manifest_cargo_items c WHERE c.manifest_id = m.id AND c.dg_acceptance_status = 'REJECTED') as dg_rejected_count
       FROM flight_manifests m WHERE m.flight_id = ? ORDER BY m.manifest_type`
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: String(row.flight_id),
      manifestType: String(row.manifest_type) as FlightManifestDto['manifestType'],
      status: String(row.status) as FlightManifestDto['status'],
      passengerCount: num(row.passenger_count),
      passengerWeightKg: num(row.passenger_weight_kg),
      cargoCount: num(row.cargo_count),
      cargoActualWeightKg: num(row.cargo_actual_weight_kg),
      dgPendingCount: num(row.dg_pending_count),
      dgRejectedCount: num(row.dg_rejected_count)
    }));
  }

  private listPassengers(id: string) {
    return (
      this.sqlite
        .prepare(
          `SELECT p.* FROM flight_manifest_passengers p
       JOIN flight_manifests m ON m.id = p.manifest_id
       WHERE m.flight_id = ?
       ORDER BY p.seat_number, p.full_name`
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      manifestId: String(row.manifest_id),
      fullName: String(row.full_name),
      identityType: str(row.identity_type),
      identityNumber: str(row.identity_number),
      weightKg: nullableNum(row.weight_kg),
      seatNumber: str(row.seat_number),
      baggageWeightKg: nullableNum(row.baggage_weight_kg),
      remarks: str(row.remarks)
    }));
  }

  private listCargo(id: string): FlightManifestCargoDto[] {
    return (
      this.sqlite
        .prepare(
          `SELECT c.*, dg.dg_code, dg.description as dg_description
       FROM flight_manifest_cargo_items c
       JOIN flight_manifests m ON m.id = c.manifest_id
       LEFT JOIN ref_dg_categories dg ON dg.id = c.dg_category_id
       WHERE m.flight_id = ?
       ORDER BY c.description`
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      manifestId: String(row.manifest_id),
      description: String(row.description),
      senderName: str(row.sender_name),
      receiverName: str(row.receiver_name),
      actualWeightKg: num(row.actual_weight_kg),
      volumeWeightKg: nullableNum(row.volume_weight_kg),
      chargeableWeightKg: nullableNum(row.chargeable_weight_kg),
      dgCategoryId: str(row.dg_category_id),
      dgCategoryLabel: row.dg_code
        ? `${String(row.dg_code)} - ${String(row.dg_description)}`
        : null,
      dgAcceptanceStatus: String(
        row.dg_acceptance_status
      ) as FlightManifestCargoDto['dgAcceptanceStatus'],
      remarks: str(row.remarks)
    }));
  }

  private listFinanceHandoffs(id: string): FlightFinanceHandoffDto[] {
    return (
      this.sqlite
        .prepare(
          `SELECT h.*, c.currency_code
       FROM flight_finance_handoffs h
       LEFT JOIN ref_currencies c ON c.id = h.currency_id
       WHERE h.flight_id = ?
       ORDER BY h.created_at DESC`
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: String(row.flight_id),
      sourceType: String(row.source_type),
      sourceId: str(row.source_id),
      eventType: String(row.event_type) as FlightFinanceHandoffDto['eventType'],
      status: String(row.status) as FlightFinanceHandoffDto['status'],
      summary: String(row.summary),
      amount: nullableNum(row.amount),
      currencyId: str(row.currency_id),
      currencyCode: str(row.currency_code),
      createdAt: String(row.created_at)
    }));
  }

  private upsertFinanceHandoff(
    flightId: string,
    sourceType: string,
    sourceId: string | null,
    eventType: string,
    status: string,
    summary: string,
    amount: number | null,
    currencyId: string | null
  ) {
    const existing = this.sqlite
      .prepare(
        `SELECT id FROM flight_finance_handoffs WHERE flight_id = ? AND source_type = ? AND source_id IS ? AND event_type = ?`
      )
      .get(flightId, sourceType, sourceId, eventType) as SqlRow | undefined;
    if (existing) {
      this.sqlite
        .prepare(
          `UPDATE flight_finance_handoffs SET status = ?, summary = ?, amount = ?, currency_id = ?, updated_at = ? WHERE id = ?`
        )
        .run(status, summary, amount, currencyId, timestamp(), existing.id);
      return;
    }
    this.sqlite
      .prepare(
        `INSERT INTO flight_finance_handoffs (
          id, flight_id, source_type, source_id, event_type, status, summary, amount,
          currency_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `handoff-${nanoid(10)}`,
        flightId,
        sourceType,
        sourceId,
        eventType,
        status,
        summary,
        amount,
        currencyId,
        timestamp(),
        timestamp()
      );
  }
}
