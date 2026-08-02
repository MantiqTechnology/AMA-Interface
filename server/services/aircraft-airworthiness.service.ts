import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type {
  AircraftAirworthinessDto,
  AircraftDefectInput,
  AircraftDefermentInput,
  AircraftDto,
  AircraftMaintenanceReleaseInput,
  AircraftMaintenanceRequirementInput,
  AircraftOperationalStatus,
  AircraftOperationalTransition
} from '../../shared/features/operations/aircraft';
import { getApplicationNow } from '../utils/time';
import { DomainError } from '../utils/errors';
import type { FlightOperationsVerificationService } from './flight-operations-verification.service';

type SqlRow = Record<string, string | number | bigint | Buffer | null>;
type AircraftActor = { userId: string; role: string };
type AircraftReleaseWriteOptions = {
  complyDueRequirements?: boolean;
  maintenanceRequirementIds?: string[];
  signerAuthorizationSnapshot?: Record<string, unknown> | null;
};
type AircraftReleaseWriteResult = {
  releaseId: string;
};

const terminalFlightStatuses = ['CANCELLED', 'CLOSED'];
const operationalTransitions: Record<AircraftOperationalStatus, AircraftOperationalStatus[]> = {
  ACTIVE: ['SUSPENDED', 'RETIRED'],
  SUSPENDED: ['ACTIVE', 'RETIRED'],
  RETIRED: []
};

function now() {
  return getApplicationNow();
}

function text(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function number(value: unknown) {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function jsonArray(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export class AircraftAirworthinessService {
  constructor(
    private readonly sqlite: Database.Database,
    private readonly flights: FlightOperationsVerificationService
  ) {}

  detail(id: string): AircraftAirworthinessDto {
    this.requireAircraft(id);
    const aircraft = this.toAircraftDto(id);
    const defects = (
      this.sqlite
        .prepare('SELECT * FROM aircraft_defects WHERE aircraft_id = ? ORDER BY detected_at DESC')
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      defectNumber: String(row.defect_number),
      title: String(row.title),
      description: String(row.description),
      detectedAt: String(row.detected_at),
      sourceReference: text(row.source_reference),
      evidenceReferences: jsonArray(row.evidence_references),
      status: String(row.status) as AircraftAirworthinessDto['defects'][number]['status'],
      rectificationNote: text(row.rectification_note),
      version: number(row.version)
    }));
    const deferments = (
      this.sqlite
        .prepare(
          'SELECT * FROM aircraft_deferments WHERE aircraft_id = ? ORDER BY effective_at DESC'
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      defectId: String(row.defect_id),
      defermentType: String(
        row.deferment_type
      ) as AircraftAirworthinessDto['deferments'][number]['defermentType'],
      referenceCode: String(row.reference_code),
      category: text(row.category),
      operationalLimitations: String(row.operational_limitations),
      applicableRouteIds: jsonArray(row.applicable_route_ids),
      applicableServiceTypeCodes: jsonArray(row.applicable_service_type_codes),
      effectiveAt: String(row.effective_at),
      expiresAt: String(row.expires_at),
      status: String(row.status) as AircraftAirworthinessDto['deferments'][number]['status']
    }));
    const releases = (
      this.sqlite
        .prepare(
          'SELECT * FROM aircraft_maintenance_releases WHERE aircraft_id = ? ORDER BY released_at DESC'
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      releaseNumber: String(row.release_number),
      resultingStatus: String(
        row.resulting_status
      ) as AircraftAirworthinessDto['releases'][number]['resultingStatus'],
      workOrderReference: String(row.work_order_reference),
      releaseStatement: String(row.release_statement),
      certifyingUserId: String(row.certifying_user_id),
      certifyingLicenseNumber: String(row.certifying_license_number),
      releasedAt: String(row.released_at),
      evidenceReferences: jsonArray(row.evidence_references),
      defectIds: jsonArray(row.defect_ids),
      signerAuthorizationSnapshot: jsonObject(row.signer_authorization_snapshot_json)
    }));
    const requirements = (
      this.sqlite
        .prepare(
          `SELECT * FROM aircraft_maintenance_requirements
         WHERE aircraft_id = ? ORDER BY status, due_at, requirement_code`
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      requirementCode: String(row.requirement_code),
      title: String(row.title),
      dueAt: text(row.due_at),
      dueAirframeHours: row.due_airframe_hours === null ? null : number(row.due_airframe_hours),
      dueAirframeCycles: row.due_airframe_cycles === null ? null : number(row.due_airframe_cycles),
      sourceReference: String(row.source_reference),
      status: String(row.status) as AircraftAirworthinessDto['requirements'][number]['status'],
      compliedAt: text(row.complied_at)
    }));
    const history = (
      this.sqlite
        .prepare(
          'SELECT * FROM aircraft_status_history WHERE aircraft_id = ? ORDER BY occurred_at DESC'
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      statusDimension: String(
        row.status_dimension
      ) as AircraftAirworthinessDto['history'][number]['statusDimension'],
      fromStatus: text(row.from_status),
      toStatus: String(row.to_status),
      reason: String(row.reason),
      sourceType: String(row.source_type),
      sourceId: text(row.source_id),
      actorUserId: String(row.actor_user_id),
      actorRole: String(row.actor_role),
      occurredAt: String(row.occurred_at)
    }));
    return {
      aircraft,
      defects,
      deferments,
      requirements,
      releases,
      history,
      affectedFlightIds: this.affectedFlightIds(id)
    };
  }

  transitionOperational(
    aircraftId: string,
    body: AircraftOperationalTransition,
    actor: AircraftActor
  ) {
    const aircraft = this.requireAircraft(aircraftId);
    this.assertVersion(aircraft, body.expectedVersion);
    const from = String(aircraft.operational_status) as AircraftOperationalStatus;
    if (!operationalTransitions[from]?.includes(body.toStatus)) {
      throw new DomainError(
        'AIRCRAFT_OPERATIONAL_TRANSITION_INVALID',
        `${from} cannot move to ${body.toStatus}.`,
        409
      );
    }
    if (body.toStatus === 'ACTIVE') {
      const eligibility = this.toAircraftDto(aircraftId);
      if (eligibility.technicalEligibility === 'BLOCKED') {
        throw new DomainError(
          'AIRCRAFT_ACTIVATION_BLOCKED',
          'Aircraft must have valid technical eligibility before activation.',
          422,
          { dueReasons: eligibility.dueReasons, openDefectCount: eligibility.openDefectCount }
        );
      }
    }
    if (body.toStatus === 'RETIRED') {
      const affectedFlightIds = this.affectedFlightIds(aircraftId);
      if (affectedFlightIds.length) {
        throw new DomainError(
          'AIRCRAFT_RETIREMENT_BLOCKED',
          'Aircraft still has active or upcoming flight assignments.',
          422,
          { affectedFlightIds }
        );
      }
      const openWork = this.sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM aircraft_defects
           WHERE aircraft_id = ? AND status IN ('OPEN', 'DEFERRED')`
        )
        .get(aircraftId) as { count: number };
      if (openWork.count) {
        throw new DomainError(
          'AIRCRAFT_RETIREMENT_BLOCKED',
          'Aircraft still has unresolved technical records.',
          422
        );
      }
    }
    this.sqlite.transaction(() => {
      this.updateAircraftStatus(
        aircraftId,
        'operational_status',
        body.toStatus,
        body.expectedVersion
      );
      this.appendHistory(
        aircraftId,
        'OPERATIONAL',
        from,
        body.toStatus,
        body.reason,
        'OPERATIONAL_TRANSITION',
        null,
        actor
      );
    })();
    this.recalculateAffectedFlights(aircraftId, actor.userId);
    return this.detail(aircraftId);
  }

  reportDefect(aircraftId: string, body: AircraftDefectInput, actor: AircraftActor) {
    const aircraft = this.requireAircraft(aircraftId);
    this.assertVersion(aircraft, body.expectedVersion);
    const defectId = `adefect-${nanoid(12)}`;
    const defectNumber = `DEF-${new Date(body.detectedAt).toISOString().slice(0, 10).replaceAll('-', '')}-${nanoid(5).toUpperCase()}`;
    const timestamp = now();
    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO aircraft_defects (
            id, aircraft_id, defect_number, title, description, detected_at,
            detected_by_user_id, source_reference, evidence_references, status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`
        )
        .run(
          defectId,
          aircraftId,
          defectNumber,
          body.title,
          body.description,
          body.detectedAt,
          actor.userId,
          body.sourceReference,
          JSON.stringify(body.evidenceReferences),
          timestamp,
          timestamp
        );
      this.updateAircraftStatus(
        aircraftId,
        'serviceability_status',
        'UNSERVICEABLE',
        body.expectedVersion,
        body.description
      );
      this.appendHistory(
        aircraftId,
        'TECHNICAL',
        String(aircraft.serviceability_status),
        'UNSERVICEABLE',
        body.description,
        'DEFECT',
        defectId,
        actor
      );
    })();
    this.recalculateAffectedFlights(aircraftId, actor.userId);
    return this.detail(aircraftId);
  }

  deferDefect(aircraftId: string, body: AircraftDefermentInput, actor: AircraftActor) {
    const aircraft = this.requireAircraft(aircraftId);
    this.assertVersion(aircraft, body.expectedVersion);
    const defect = this.sqlite
      .prepare('SELECT * FROM aircraft_defects WHERE id = ? AND aircraft_id = ?')
      .get(body.defectId, aircraftId) as SqlRow | undefined;
    if (!defect) throw new DomainError('AIRCRAFT_DEFECT_NOT_FOUND', 'Defect was not found.', 404);
    if (String(defect.status) !== 'OPEN') {
      throw new DomainError(
        'AIRCRAFT_DEFECT_NOT_DEFERABLE',
        'Only an open defect can be deferred.',
        409
      );
    }
    const defermentId = `adefer-${nanoid(12)}`;
    const timestamp = now();
    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO aircraft_deferments (
            id, aircraft_id, defect_id, deferment_type, reference_code, category,
            operational_limitations, maintenance_procedure, operations_procedure,
            effective_at, expires_at, authorized_by_user_id, authorization_reference,
            applicable_route_ids, applicable_service_type_codes, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`
        )
        .run(
          defermentId,
          aircraftId,
          body.defectId,
          body.defermentType,
          body.referenceCode,
          body.category,
          body.operationalLimitations,
          body.maintenanceProcedure,
          body.operationsProcedure,
          body.effectiveAt,
          body.expiresAt,
          actor.userId,
          body.authorizationReference,
          JSON.stringify(body.applicableRouteIds),
          JSON.stringify(body.applicableServiceTypeCodes),
          timestamp,
          timestamp
        );
      this.sqlite
        .prepare(
          `UPDATE aircraft_defects SET status = 'DEFERRED', version = version + 1, updated_at = ?
           WHERE id = ?`
        )
        .run(timestamp, body.defectId);
      const touched = this.sqlite
        .prepare(
          `UPDATE aircraft SET serviceability_note = ?, version = version + 1, updated_at = ?
           WHERE id = ? AND version = ?`
        )
        .run(
          `Pending restricted maintenance release: ${body.defermentType} ${body.referenceCode}.`,
          timestamp,
          aircraftId,
          body.expectedVersion
        );
      if (!touched.changes) {
        throw new DomainError('STALE_VERSION', 'Aircraft changed. Refresh and retry.', 409);
      }
    })();
    this.recalculateAffectedFlights(aircraftId, actor.userId);
    return this.detail(aircraftId);
  }

  issueRelease(aircraftId: string, body: AircraftMaintenanceReleaseInput, actor: AircraftActor) {
    this.sqlite.transaction(() => {
      this.issueReleaseInOpenTransaction(aircraftId, body, actor, {
        complyDueRequirements: true
      });
    })();
    this.recalculateAffectedFlights(aircraftId, actor.userId);
    return this.detail(aircraftId);
  }

  issueMaintenanceScopedReleaseInOpenTransaction(
    aircraftId: string,
    body: AircraftMaintenanceReleaseInput,
    actor: AircraftActor,
    options: {
      maintenanceRequirementIds: string[];
      signerAuthorizationSnapshot: Record<string, unknown>;
    }
  ): AircraftReleaseWriteResult {
    return this.issueReleaseInOpenTransaction(aircraftId, body, actor, {
      complyDueRequirements: false,
      maintenanceRequirementIds: options.maintenanceRequirementIds,
      signerAuthorizationSnapshot: options.signerAuthorizationSnapshot
    });
  }

  recalculateAfterMaintenanceRelease(aircraftId: string, actorUserId: string) {
    this.recalculateAffectedFlights(aircraftId, actorUserId);
  }

  private issueReleaseInOpenTransaction(
    aircraftId: string,
    body: AircraftMaintenanceReleaseInput,
    actor: AircraftActor,
    options: AircraftReleaseWriteOptions
  ): AircraftReleaseWriteResult {
    const aircraft = this.requireAircraft(aircraftId);
    this.assertVersion(aircraft, body.expectedVersion);
    if (body.releasedAt > now()) {
      throw new DomainError(
        'AIRCRAFT_RELEASE_TIME_INVALID',
        'Maintenance release cannot be future-dated.',
        422
      );
    }
    const uniqueDefectIds = [...new Set(body.defectIds)];
    if (uniqueDefectIds.length) {
      const placeholders = uniqueDefectIds.map(() => '?').join(',');
      const eligibleStatuses =
        body.resultingStatus === 'SERVICEABLE_WITH_RESTRICTIONS'
          ? "('DEFERRED')"
          : "('OPEN', 'DEFERRED')";
      const count = (
        this.sqlite
          .prepare(
            `SELECT COUNT(*) AS count FROM aircraft_defects
             WHERE aircraft_id = ? AND id IN (${placeholders}) AND status IN ${eligibleStatuses}`
          )
          .get(aircraftId, ...uniqueDefectIds) as { count: number }
      ).count;
      if (count !== uniqueDefectIds.length) {
        throw new DomainError(
          'AIRCRAFT_RELEASE_DEFECT_INVALID',
          'Release contains a defect that is not open for this aircraft.',
          422
        );
      }
    }
    const releaseId = `arelease-${nanoid(12)}`;
    const timestamp = now();
    if (uniqueDefectIds.length && body.resultingStatus === 'SERVICEABLE') {
      const placeholders = uniqueDefectIds.map(() => '?').join(',');
      this.sqlite
        .prepare(
          `UPDATE aircraft_defects
           SET status = 'RECTIFIED', rectification_note = ?, rectified_at = ?,
               rectified_by_user_id = ?, version = version + 1, updated_at = ?
           WHERE aircraft_id = ? AND id IN (${placeholders})`
        )
        .run(
          body.releaseStatement,
          body.releasedAt,
          actor.userId,
          timestamp,
          aircraftId,
          ...uniqueDefectIds
        );
      this.sqlite
        .prepare(
          `UPDATE aircraft_deferments SET status = 'CLOSED', updated_at = ?
           WHERE aircraft_id = ? AND defect_id IN (${placeholders}) AND status = 'ACTIVE'`
        )
        .run(timestamp, aircraftId, ...uniqueDefectIds);
    }
    this.sqlite
      .prepare(
        `INSERT INTO aircraft_maintenance_releases (
          id, aircraft_id, release_number, resulting_status, work_order_reference,
          release_statement, certifying_user_id, certifying_license_number,
          released_at, evidence_references, defect_ids, signer_authorization_snapshot_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        releaseId,
        aircraftId,
        body.releaseNumber,
        body.resultingStatus,
        body.workOrderReference,
        body.releaseStatement,
        actor.userId,
        body.certifyingLicenseNumber,
        body.releasedAt,
        JSON.stringify(body.evidenceReferences),
        JSON.stringify(uniqueDefectIds),
        options.signerAuthorizationSnapshot
          ? JSON.stringify(options.signerAuthorizationSnapshot)
          : null,
        timestamp
      );
    if (options.complyDueRequirements ?? true) {
      this.sqlite
        .prepare(
          `UPDATE aircraft_maintenance_requirements
           SET status = 'COMPLIED', complied_at = ?, release_id = ?, updated_at = ?
           WHERE aircraft_id = ? AND status = 'ACTIVE'
             AND ((due_at IS NOT NULL AND due_at <= ?)
               OR (due_airframe_hours IS NOT NULL AND due_airframe_hours <= ?)
               OR (due_airframe_cycles IS NOT NULL AND due_airframe_cycles <= ?))`
        )
        .run(
          body.releasedAt,
          releaseId,
          timestamp,
          aircraftId,
          body.releasedAt.slice(0, 10),
          number(aircraft.airframe_hours),
          number(aircraft.airframe_cycles)
        );
    } else {
      const scopedRequirementIds = [...new Set(options.maintenanceRequirementIds ?? [])];
      if (scopedRequirementIds.length) {
        const placeholders = scopedRequirementIds.map(() => '?').join(',');
        const updated = this.sqlite
          .prepare(
            `UPDATE aircraft_maintenance_requirements
	             SET status = 'COMPLIED', complied_at = ?, release_id = ?, updated_at = ?
	             WHERE aircraft_id = ? AND status = 'ACTIVE' AND id IN (${placeholders})`
          )
          .run(body.releasedAt, releaseId, timestamp, aircraftId, ...scopedRequirementIds);
        if (updated.changes !== scopedRequirementIds.length) {
          throw new DomainError(
            'AIRCRAFT_RELEASE_REQUIREMENT_SCOPE_INVALID',
            'Scoped maintenance release could not comply every linked active requirement.',
            422,
            {
              impact:
                'Technical release was not issued and the release transaction was rolled back.',
              requiredAction:
                'Refresh the work package and ensure every linked requirement is still active and belongs to this aircraft.',
              requirementIds: scopedRequirementIds
            }
          );
        }
      }
    }
    const remaining = this.technicalBlockers(aircraftId, now());
    if (body.resultingStatus === 'SERVICEABLE' && remaining.length) {
      throw new DomainError(
        'AIRCRAFT_RELEASE_BLOCKED',
        'Aircraft still has unresolved technical blockers.',
        422,
        { blockers: remaining }
      );
    }
    if (
      body.resultingStatus === 'SERVICEABLE_WITH_RESTRICTIONS' &&
      !this.hasActiveDeferment(aircraftId, body.releasedAt)
    ) {
      throw new DomainError(
        'AIRCRAFT_RELEASE_RESTRICTION_REQUIRED',
        'Restricted release requires at least one active MEL/CDL deferment.',
        422
      );
    }
    this.updateAircraftStatus(
      aircraftId,
      'serviceability_status',
      body.resultingStatus,
      body.expectedVersion,
      body.releaseStatement
    );
    this.appendHistory(
      aircraftId,
      'TECHNICAL',
      String(aircraft.serviceability_status),
      body.resultingStatus,
      body.releaseStatement,
      'MAINTENANCE_RELEASE',
      releaseId,
      actor
    );
    return { releaseId };
  }

  addMaintenanceRequirement(
    aircraftId: string,
    body: AircraftMaintenanceRequirementInput,
    actor: AircraftActor
  ) {
    const aircraft = this.requireAircraft(aircraftId);
    this.assertVersion(aircraft, body.expectedVersion);
    const timestamp = now();
    try {
      this.sqlite.transaction(() => {
        this.sqlite
          .prepare(
            `INSERT INTO aircraft_maintenance_requirements (
              id, aircraft_id, requirement_code, title, due_at, due_airframe_hours,
              due_airframe_cycles, source_reference, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`
          )
          .run(
            `areq-${nanoid(12)}`,
            aircraftId,
            body.requirementCode,
            body.title,
            body.dueAt,
            body.dueAirframeHours,
            body.dueAirframeCycles,
            body.sourceReference,
            timestamp,
            timestamp
          );
        const touched = this.sqlite
          .prepare(
            `UPDATE aircraft SET version = version + 1, updated_at = ?
             WHERE id = ? AND version = ?`
          )
          .run(timestamp, aircraftId, body.expectedVersion);
        if (!touched.changes) {
          throw new DomainError('STALE_VERSION', 'Aircraft changed. Refresh and retry.', 409);
        }
      })();
    } catch (error) {
      if (error instanceof DomainError) throw error;
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new DomainError(
          'AIRCRAFT_REQUIREMENT_DUPLICATE',
          'An active maintenance requirement with this code already exists.',
          409
        );
      }
      throw error;
    }
    this.recalculateAffectedFlights(aircraftId, actor.userId);
    return this.detail(aircraftId);
  }

  sweep(actorUserId = 'SYSTEM_AIRWORTHINESS_SWEEP') {
    const expired = this.sqlite
      .prepare(
        `SELECT DISTINCT aircraft_id FROM aircraft_deferments
         WHERE status = 'ACTIVE' AND expires_at <= ?`
      )
      .all(now()) as Array<{ aircraft_id: string }>;
    for (const { aircraft_id: aircraftId } of expired) {
      this.sqlite.transaction(() => {
        this.sqlite
          .prepare(
            `UPDATE aircraft_deferments SET status = 'EXPIRED', updated_at = ?
             WHERE aircraft_id = ? AND status = 'ACTIVE' AND expires_at <= ?`
          )
          .run(now(), aircraftId, now());
        const aircraft = this.requireAircraft(aircraftId);
        this.sqlite
          .prepare(
            `UPDATE aircraft SET serviceability_status = 'UNSERVICEABLE',
             serviceability_note = 'MEL/CDL deferment expired.',
             version = version + 1, updated_at = ? WHERE id = ?`
          )
          .run(now(), aircraftId);
        this.appendHistory(
          aircraftId,
          'TECHNICAL',
          String(aircraft.serviceability_status),
          'UNSERVICEABLE',
          'MEL/CDL deferment expired.',
          'EXPIRY_SWEEP',
          null,
          { userId: actorUserId, role: 'SYSTEM' }
        );
      })();
      this.recalculateAffectedFlights(aircraftId, actorUserId);
    }
    return { expiredAircraftIds: expired.map((row) => row.aircraft_id) };
  }

  private toAircraftDto(id: string): AircraftDto {
    const row = this.requireAircraft(id);
    const blockers = this.technicalBlockers(id, now());
    const openDefectCount = number(
      (
        this.sqlite
          .prepare(
            `SELECT COUNT(*) AS count FROM aircraft_defects
             WHERE aircraft_id = ? AND status IN ('OPEN', 'DEFERRED')`
          )
          .get(id) as SqlRow
      ).count
    );
    const activeRestrictionCount = number(
      (
        this.sqlite
          .prepare(
            `SELECT COUNT(*) AS count FROM aircraft_deferments
             WHERE aircraft_id = ? AND status = 'ACTIVE' AND effective_at <= ? AND expires_at > ?`
          )
          .get(id, now(), now()) as SqlRow
      ).count
    );
    const maintenanceDue = blockers.some((item) => item.startsWith('Maintenance requirement'));
    const serviceabilityStatus = String(
      row.serviceability_status
    ) as AircraftDto['serviceabilityStatus'];
    return {
      id: String(row.id),
      registrationNumber: String(row.registration_number),
      serialNumber: text(row.serial_number),
      aircraftType: String(row.aircraft_type),
      manufacturer: String(row.manufacturer),
      model: String(row.model),
      fleetCode: text(row.fleet_code),
      passengerCapacity: number(row.passenger_capacity),
      cargoCapacityKg: number(row.cargo_capacity_kg),
      fuelType: String(row.fuel_type),
      engineCategory: String(row.engine_category),
      usableFuelCapacityLitre:
        row.usable_fuel_capacity_litre === null ? null : number(row.usable_fuel_capacity_litre),
      fuelCapacityBasis: String(row.fuel_capacity_basis),
      cruiseFuelBurnLitrePerHour:
        row.cruise_fuel_burn_litre_per_hour === null
          ? null
          : number(row.cruise_fuel_burn_litre_per_hour),
      holdingFuelBurnLitrePerHour:
        row.holding_fuel_burn_litre_per_hour === null
          ? null
          : number(row.holding_fuel_burn_litre_per_hour),
      taxiFuelBurnLitrePerHour:
        row.taxi_fuel_burn_litre_per_hour === null
          ? null
          : number(row.taxi_fuel_burn_litre_per_hour),
      fuelProfileSource: String(row.fuel_profile_source),
      fuelProfileReference: text(row.fuel_profile_reference),
      fuelProfileEffectiveFrom: text(row.fuel_profile_effective_from),
      fuelProfileAdvisoryOnly: Boolean(row.fuel_profile_advisory_only),
      defaultCapacityProfileId: text(row.default_capacity_profile_id),
      operationalStatus: String(row.operational_status) as AircraftDto['operationalStatus'],
      serviceabilityStatus,
      baseStationId: text(row.base_station_id),
      currentStationId: text(row.current_station_id),
      lastMaintenanceCheckAt: text(row.last_maintenance_check_at),
      nextMaintenanceDueAt: text(row.next_maintenance_due_at),
      serviceabilityNote: text(row.serviceability_note),
      airframeHours: number(row.airframe_hours),
      airframeCycles: number(row.airframe_cycles),
      version: number(row.version),
      maintenanceDue,
      dueReasons: blockers.filter((item) => item.startsWith('Maintenance requirement')),
      technicalEligibility:
        serviceabilityStatus === 'UNSERVICEABLE' || blockers.length
          ? 'BLOCKED'
          : activeRestrictionCount
            ? 'RESTRICTED'
            : 'ELIGIBLE',
      openDefectCount,
      activeRestrictionCount,
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private technicalBlockers(aircraftId: string, at: string) {
    const aircraft = this.requireAircraft(aircraftId);
    const blockers: string[] = [];
    const openDefects = this.sqlite
      .prepare(
        `SELECT defect_number FROM aircraft_defects
         WHERE aircraft_id = ? AND status = 'OPEN'`
      )
      .all(aircraftId) as Array<{ defect_number: string }>;
    blockers.push(...openDefects.map((row) => `Open defect ${row.defect_number}`));
    const dueRequirements = this.sqlite
      .prepare(
        `SELECT requirement_code FROM aircraft_maintenance_requirements
         WHERE aircraft_id = ? AND status = 'ACTIVE'
           AND ((due_at IS NOT NULL AND due_at <= ?)
             OR (due_airframe_hours IS NOT NULL AND due_airframe_hours <= ?)
             OR (due_airframe_cycles IS NOT NULL AND due_airframe_cycles <= ?))`
      )
      .all(
        aircraftId,
        at.slice(0, 10),
        number(aircraft.airframe_hours),
        number(aircraft.airframe_cycles)
      ) as Array<{ requirement_code: string }>;
    blockers.push(
      ...dueRequirements.map((row) => `Maintenance requirement ${row.requirement_code} is due`)
    );
    return blockers;
  }

  private hasActiveDeferment(aircraftId: string, at: string) {
    return Boolean(
      this.sqlite
        .prepare(
          `SELECT 1 FROM aircraft_deferments
           WHERE aircraft_id = ? AND status = 'ACTIVE' AND effective_at <= ? AND expires_at > ?
           LIMIT 1`
        )
        .get(aircraftId, at, at)
    );
  }

  private requireAircraft(id: string) {
    const row = this.sqlite.prepare('SELECT * FROM aircraft WHERE id = ?').get(id) as
      SqlRow | undefined;
    if (!row) throw new DomainError('AIRCRAFT_NOT_FOUND', 'Aircraft was not found.', 404);
    return row;
  }

  private assertVersion(row: SqlRow, expectedVersion: number) {
    if (number(row.version) !== expectedVersion) {
      throw new DomainError('STALE_VERSION', 'Aircraft changed. Refresh and retry.', 409, {
        currentVersion: number(row.version),
        expectedVersion
      });
    }
  }

  private updateAircraftStatus(
    aircraftId: string,
    column: 'operational_status' | 'serviceability_status',
    value: string,
    expectedVersion: number,
    note?: string
  ) {
    const result = this.sqlite
      .prepare(
        `UPDATE aircraft SET ${column} = ?, serviceability_note = COALESCE(?, serviceability_note),
         version = version + 1, updated_at = ? WHERE id = ? AND version = ?`
      )
      .run(value, note ?? null, now(), aircraftId, expectedVersion);
    if (!result.changes) {
      throw new DomainError('STALE_VERSION', 'Aircraft changed. Refresh and retry.', 409);
    }
  }

  private appendHistory(
    aircraftId: string,
    dimension: 'OPERATIONAL' | 'TECHNICAL',
    fromStatus: string | null,
    toStatus: string,
    reason: string,
    sourceType: string,
    sourceId: string | null,
    actor: AircraftActor
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO aircraft_status_history (
          id, aircraft_id, status_dimension, from_status, to_status, reason,
          source_type, source_id, actor_user_id, actor_role, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `ahist-${nanoid(12)}`,
        aircraftId,
        dimension,
        fromStatus,
        toStatus,
        reason,
        sourceType,
        sourceId,
        actor.userId,
        actor.role,
        now()
      );
  }

  private affectedFlightIds(aircraftId: string) {
    const placeholders = terminalFlightStatuses.map(() => '?').join(',');
    return (
      this.sqlite
        .prepare(
          `SELECT flight.id FROM flight_operations flight
           JOIN flight_operation_statuses status ON status.id = flight.current_status_id
           WHERE flight.aircraft_id = ? AND status.code NOT IN (${placeholders})
           ORDER BY flight.scheduled_departure_at`
        )
        .all(aircraftId, ...terminalFlightStatuses) as Array<{ id: string }>
    ).map((row) => row.id);
  }

  private recalculateAffectedFlights(aircraftId: string, actorUserId: string) {
    for (const flightId of this.affectedFlightIds(aircraftId)) {
      this.flights.evaluate(flightId, actorUserId);
    }
  }
}
