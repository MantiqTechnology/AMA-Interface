import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type {
  AircraftAirworthinessDto,
  AircraftDefectInput,
  AircraftDefermentInput,
  AircraftDto,
  AircraftMaintenanceReleaseInput,
  AircraftMaintenanceRequirementInput,
  AircraftTechnicalEligibilityBlockerDto,
  AircraftTechnicalEligibilityDto,
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
  exemptCanonicalDueStatusIds?: string[];
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

function addTechnicalBlocker(
  blockers: AircraftTechnicalEligibilityBlockerDto[],
  input: AircraftTechnicalEligibilityBlockerDto
) {
  blockers.push(input);
}

export function evaluateAircraftTechnicalEligibility(
  sqlite: Database.Database,
  aircraftId: string,
  options: { at?: string } = {}
): AircraftTechnicalEligibilityDto {
  const evaluatedAt = options.at ?? now();
  const blockers: AircraftTechnicalEligibilityBlockerDto[] = [];
  const warnings: AircraftTechnicalEligibilityBlockerDto[] = [];
  const sourceReferences: AircraftTechnicalEligibilityDto['sourceReferences'] = [];
  const aircraft = sqlite.prepare('SELECT * FROM aircraft WHERE id = ?').get(aircraftId) as
    SqlRow | undefined;

  if (!aircraft) {
    addTechnicalBlocker(blockers, {
      code: 'TECHNICAL_STATUS_UNKNOWN',
      category: 'TECHNICAL_STATUS',
      sourceEntityType: 'AIRCRAFT',
      sourceEntityId: aircraftId,
      reason: 'Aircraft technical status could not be evaluated.',
      remediation: 'Refresh aircraft master data before flight release.',
      isBlocking: true
    });
    return {
      aircraftId,
      status: 'UNKNOWN',
      eligible: false,
      evaluatedAt,
      blockers,
      restrictions: [],
      warnings,
      sourceReferences
    };
  }

  const serviceabilityStatus = String(aircraft.serviceability_status);
  const operationalStatus = String(aircraft.operational_status);
  sourceReferences.push({
    sourceType: 'AIRCRAFT',
    sourceId: aircraftId,
    label: `Aircraft ${String(aircraft.registration_number)}`
  });

  if (operationalStatus !== 'ACTIVE') {
    addTechnicalBlocker(blockers, {
      code: 'AIRCRAFT_NOT_ACTIVE',
      category: 'AIRCRAFT',
      sourceEntityType: 'AIRCRAFT',
      sourceEntityId: aircraftId,
      reason: `Aircraft operational status is ${operationalStatus}.`,
      remediation: 'Resolve aircraft operational status before flight release.',
      isBlocking: true
    });
  }

  if (serviceabilityStatus === 'UNSERVICEABLE') {
    addTechnicalBlocker(blockers, {
      code: 'AIRCRAFT_UNSERVICEABLE',
      category: 'AIRCRAFT',
      sourceEntityType: 'AIRCRAFT',
      sourceEntityId: aircraftId,
      reason: String(aircraft.serviceability_note ?? 'Aircraft is marked unserviceable.'),
      remediation: 'Complete maintenance control and issue a valid technical release.',
      isBlocking: true
    });
  }

  const latestRelease = sqlite
    .prepare(
      `SELECT id, release_number FROM aircraft_maintenance_releases
       WHERE aircraft_id = ? ORDER BY released_at DESC LIMIT 1`
    )
    .get(aircraftId) as SqlRow | undefined;
  if (!latestRelease) {
    addTechnicalBlocker(blockers, {
      code: 'TECHNICAL_STATUS_UNKNOWN',
      category: 'TECHNICAL_STATUS',
      sourceEntityType: 'AIRCRAFT',
      sourceEntityId: aircraftId,
      reason: 'Aircraft has no recorded technical release.',
      remediation: 'Record or issue a technical release before flight release.',
      isBlocking: true
    });
  } else {
    sourceReferences.push({
      sourceType: 'MAINTENANCE_RELEASE',
      sourceId: String(latestRelease.id),
      label: String(latestRelease.release_number)
    });
  }

  const defectRows = sqlite
    .prepare(
      `SELECT defect.id, defect.defect_number, defect.title, assessment.assessment_decision
       FROM aircraft_defects defect
       LEFT JOIN maintenance_defect_assessments assessment ON assessment.defect_id = defect.id
       WHERE defect.aircraft_id = ? AND defect.status = 'OPEN'
       ORDER BY defect.detected_at DESC`
    )
    .all(aircraftId) as SqlRow[];
  for (const defect of defectRows) {
    const grounded = String(defect.assessment_decision ?? '') === 'GROUND';
    addTechnicalBlocker(blockers, {
      code: grounded ? 'NO_GO_DEFECT' : 'DEFECT_PENDING_ASSESSMENT',
      category: 'DEFECT',
      sourceEntityType: 'AIRCRAFT_DEFECT',
      sourceEntityId: String(defect.id),
      reason: grounded
        ? `NO-GO defect ${String(defect.defect_number)} remains open.`
        : `Defect ${String(defect.defect_number)} is still awaiting controlled maintenance disposition.`,
      remediation: grounded
        ? 'Complete rectification and issue Technical Release.'
        : 'Complete maintenance assessment before flight release.',
      isBlocking: true
    });
    sourceReferences.push({
      sourceType: 'AIRCRAFT_DEFECT',
      sourceId: String(defect.id),
      label: String(defect.defect_number)
    });
  }

  const defermentRows = sqlite
    .prepare(
      `SELECT deferment.*, defect.defect_number, defect.title
       FROM aircraft_deferments deferment
       LEFT JOIN aircraft_defects defect ON defect.id = deferment.defect_id
       WHERE deferment.aircraft_id = ? AND deferment.status IN ('ACTIVE', 'EXPIRED')
       ORDER BY deferment.effective_at DESC`
    )
    .all(aircraftId) as SqlRow[];
  const restrictions = defermentRows
    .filter(
      (row) =>
        String(row.status) === 'ACTIVE' &&
        String(row.effective_at) <= evaluatedAt &&
        String(row.expires_at) > evaluatedAt
    )
    .map((row) => ({
      sourceType: 'DEFERRED_DEFECT' as const,
      sourceId: String(row.id),
      defectId: String(row.defect_id),
      title: `${String(row.reference_code)} - ${String(row.defect_number ?? 'Deferred defect')}`,
      restriction: String(row.operational_limitations),
      validUntil: String(row.expires_at),
      status: 'ACTIVE' as const
    }));
  for (const row of defermentRows) {
    const expired = String(row.status) === 'EXPIRED' || String(row.expires_at) <= evaluatedAt;
    if (expired) {
      addTechnicalBlocker(blockers, {
        code: 'DEFERMENT_EXPIRED',
        category: 'DEFERMENT',
        sourceEntityType: 'AIRCRAFT_DEFERMENT',
        sourceEntityId: String(row.id),
        reason: `Deferred defect ${String(row.reference_code)} has expired.`,
        remediation: 'Rectify or re-control the deferred condition before flight release.',
        isBlocking: true
      });
    }
    sourceReferences.push({
      sourceType: 'AIRCRAFT_DEFERMENT',
      sourceId: String(row.id),
      label: String(row.reference_code)
    });
  }
  if (serviceabilityStatus === 'SERVICEABLE_WITH_RESTRICTIONS' && restrictions.length === 0) {
    addTechnicalBlocker(blockers, {
      code: 'DEFERMENT_CONTROL_MISSING',
      category: 'DEFERMENT',
      sourceEntityType: 'AIRCRAFT',
      sourceEntityId: aircraftId,
      reason: 'Aircraft is restricted but no active controlled deferment is valid.',
      remediation: 'Record a valid deferment or issue unrestricted Technical Release.',
      isBlocking: true
    });
  }

  const legacyDueRows = sqlite
    .prepare(
      `SELECT id, requirement_code FROM aircraft_maintenance_requirements
       WHERE aircraft_id = ? AND status = 'ACTIVE'
         AND ((due_at IS NOT NULL AND due_at <= ?)
           OR (due_airframe_hours IS NOT NULL AND due_airframe_hours <= ?)
           OR (due_airframe_cycles IS NOT NULL AND due_airframe_cycles <= ?))`
    )
    .all(
      aircraftId,
      evaluatedAt.slice(0, 10),
      number(aircraft.airframe_hours),
      number(aircraft.airframe_cycles)
    ) as SqlRow[];
  const legacyDueCodes = new Set(legacyDueRows.map((row) => String(row.requirement_code)));
  let dueBlockerCount = 0;
  for (const row of legacyDueRows) {
    dueBlockerCount += 1;
    addTechnicalBlocker(blockers, {
      code: 'MANDATORY_MAINTENANCE_OVERDUE',
      category: 'DUE_CONTROL',
      sourceEntityType: 'AIRCRAFT_MAINTENANCE_REQUIREMENT',
      sourceEntityId: String(row.id),
      reason: `Maintenance requirement ${String(row.requirement_code)} is due.`,
      remediation: 'Plan, complete, and technically release the maintenance requirement.',
      isBlocking: true
    });
    sourceReferences.push({
      sourceType: 'AIRCRAFT_MAINTENANCE_REQUIREMENT',
      sourceId: String(row.id),
      label: String(row.requirement_code)
    });
  }

  const canonicalDueRows = sqlite
    .prepare(
      `SELECT status.id, requirement.code
       FROM maintenance_aircraft_requirement_statuses status
       JOIN maintenance_due_requirements requirement ON requirement.id = status.requirement_id
       WHERE status.aircraft_id = ?
         AND requirement.active = 1
         AND requirement.mandatory = 1
         AND (
           (status.next_due_at IS NOT NULL AND status.next_due_at <= ?)
           OR (status.next_due_flight_hours IS NOT NULL AND status.next_due_flight_hours <= ?)
           OR (status.next_due_flight_cycles IS NOT NULL AND status.next_due_flight_cycles <= ?)
         )`
    )
    .all(
      aircraftId,
      evaluatedAt,
      number(aircraft.airframe_hours),
      number(aircraft.airframe_cycles)
    ) as SqlRow[];
  for (const row of canonicalDueRows.filter((item) => !legacyDueCodes.has(String(item.code)))) {
    dueBlockerCount += 1;
    addTechnicalBlocker(blockers, {
      code: 'MANDATORY_MAINTENANCE_OVERDUE',
      category: 'DUE_CONTROL',
      sourceEntityType: 'MAINTENANCE_DUE_STATUS',
      sourceEntityId: String(row.id),
      reason: `Mandatory maintenance requirement ${String(row.code)} is overdue or due.`,
      remediation: 'Complete the linked Work Package and issue Technical Release.',
      isBlocking: true
    });
    sourceReferences.push({
      sourceType: 'MAINTENANCE_DUE_STATUS',
      sourceId: String(row.id),
      label: String(row.code)
    });
  }
  const nextMaintenanceDueAt = text(aircraft.next_maintenance_due_at);
  if (
    dueBlockerCount === 0 &&
    nextMaintenanceDueAt &&
    nextMaintenanceDueAt <= evaluatedAt.slice(0, 10)
  ) {
    addTechnicalBlocker(blockers, {
      code: 'MANDATORY_MAINTENANCE_OVERDUE',
      category: 'DUE_CONTROL',
      sourceEntityType: 'AIRCRAFT',
      sourceEntityId: aircraftId,
      reason: `Aircraft maintenance is due on ${nextMaintenanceDueAt}.`,
      remediation: 'Plan, complete, and technically release the maintenance requirement.',
      isBlocking: true
    });
    sourceReferences.push({
      sourceType: 'AIRCRAFT',
      sourceId: aircraftId,
      label: `Maintenance due ${nextMaintenanceDueAt}`
    });
  }

  const activeWorkRows = sqlite
    .prepare(
      `SELECT id, package_number, status
       FROM maintenance_work_packages
       WHERE aircraft_id = ?
         AND status IN ('IN_PROGRESS', 'READY_FOR_RELEASE')
         AND release_id IS NULL`
    )
    .all(aircraftId) as SqlRow[];
  for (const row of activeWorkRows) {
    addTechnicalBlocker(blockers, {
      code: 'MAINTENANCE_RELEASE_REQUIRED',
      category: 'MAINTENANCE_RELEASE',
      sourceEntityType: 'WORK_PACKAGE',
      sourceEntityId: String(row.id),
      reason: `Work Package ${String(row.package_number)} is ${String(row.status)} and still requires Technical Release.`,
      remediation: 'Complete release eligibility and issue Technical Release for the Work Package.',
      isBlocking: true
    });
    sourceReferences.push({
      sourceType: 'WORK_PACKAGE',
      sourceId: String(row.id),
      label: String(row.package_number)
    });
  }

  const status = blockers.length
    ? 'BLOCKED'
    : restrictions.length
      ? 'ELIGIBLE_WITH_RESTRICTIONS'
      : 'ELIGIBLE';

  return {
    aircraftId,
    status,
    eligible: status !== 'BLOCKED',
    evaluatedAt,
    blockers,
    restrictions,
    warnings,
    sourceReferences
  };
}

export class AircraftAirworthinessService {
  constructor(
    private readonly sqlite: Database.Database,
    private readonly flights: FlightOperationsVerificationService
  ) {}

  evaluateAircraftTechnicalEligibility(
    aircraftId: string,
    options: { at?: string } = {}
  ): AircraftTechnicalEligibilityDto {
    return evaluateAircraftTechnicalEligibility(this.sqlite, aircraftId, options);
  }

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
      reporterObservation: String(row.reporter_observation ?? 'UNKNOWN'),
      initialSeverity: String(row.initial_severity ?? 'UNKNOWN'),
      operationalImpact: text(row.operational_impact),
      flightPhase: text(row.flight_phase),
      stationId: text(row.station_id),
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
      maintenanceProcedure: text(row.maintenance_procedure),
      operationsProcedure: text(row.operations_procedure),
      targetRectificationAt: text(row.target_rectification_at),
      assessmentId: text(row.assessment_id),
      followUpWorkPackageId: text(row.follow_up_work_package_id),
      closedAt: text(row.closed_at),
      closedByUserId: text(row.closed_by_user_id),
      closureNote: text(row.closure_note),
      applicableRouteIds: jsonArray(row.applicable_route_ids),
      applicableServiceTypeCodes: jsonArray(row.applicable_service_type_codes),
      effectiveAt: String(row.effective_at),
      expiresAt: String(row.expires_at),
      status: (String(row.status) === 'ACTIVE' && String(row.expires_at) <= now()
        ? 'EXPIRED'
        : String(row.status)) as AircraftAirworthinessDto['deferments'][number]['status']
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
            detected_by_user_id, reporter_observation, initial_severity, operational_impact,
            flight_phase, station_id, source_reference, evidence_references, status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`
        )
        .run(
          defectId,
          aircraftId,
          defectNumber,
          body.title,
          body.description,
          body.detectedAt,
          actor.userId,
          body.reporterObservation ?? 'UNKNOWN',
          body.initialSeverity ?? 'UNKNOWN',
          body.operationalImpact ?? null,
          body.flightPhase ?? null,
          body.stationId ?? null,
          body.sourceReference,
          JSON.stringify(body.evidenceReferences ?? []),
          timestamp,
          timestamp
        );
      const touched = this.sqlite
        .prepare(
          'UPDATE aircraft SET version = version + 1, updated_at = ? WHERE id = ? AND version = ?'
        )
        .run(timestamp, aircraftId, body.expectedVersion);
      if (!touched.changes) {
        throw new DomainError('STALE_VERSION', 'Aircraft changed. Refresh and retry.', 409);
      }
      this.appendHistory(
        aircraftId,
        'TECHNICAL',
        String(aircraft.serviceability_status),
        String(aircraft.serviceability_status),
        `Defect reported for maintenance assessment: ${body.title}`,
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
    const assessment = this.sqlite
      .prepare(
        `SELECT id FROM maintenance_defect_assessments
         WHERE defect_id = ? AND assessment_decision = 'DEFER'
         LIMIT 1`
      )
      .get(body.defectId) as { id: string } | undefined;
    if (!assessment) {
      throw new DomainError(
        'AIRCRAFT_DEFECT_ASSESSMENT_REQUIRED',
        'Defect must be assessed as deferred before deferment control can be recorded.',
        422
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
            target_rectification_at, effective_at, expires_at, assessment_id,
            authorized_by_user_id, authorization_reference, applicable_route_ids,
            applicable_service_type_codes, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`
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
          body.targetRectificationAt ?? null,
          body.effectiveAt,
          body.expiresAt,
          assessment.id,
          actor.userId,
          body.authorizationReference,
          JSON.stringify(body.applicableRouteIds ?? []),
          JSON.stringify(body.applicableServiceTypeCodes ?? []),
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
      exemptCanonicalDueStatusIds?: string[];
      signerAuthorizationSnapshot: Record<string, unknown>;
    }
  ): AircraftReleaseWriteResult {
    return this.issueReleaseInOpenTransaction(aircraftId, body, actor, {
      complyDueRequirements: false,
      maintenanceRequirementIds: options.maintenanceRequirementIds,
      exemptCanonicalDueStatusIds: options.exemptCanonicalDueStatusIds,
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
    const remaining = this.technicalBlockers(
      aircraftId,
      now(),
      options.exemptCanonicalDueStatusIds ?? []
    );
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
    const eligibility = this.evaluateAircraftTechnicalEligibility(id);
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
      imageUrl: text(row.image_url),
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
        eligibility.status === 'ELIGIBLE_WITH_RESTRICTIONS'
          ? 'RESTRICTED'
          : eligibility.status === 'ELIGIBLE'
            ? 'ELIGIBLE'
            : 'BLOCKED',
      openDefectCount,
      activeRestrictionCount,
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private technicalBlockers(
    aircraftId: string,
    at: string,
    exemptCanonicalDueStatusIds: string[] = []
  ) {
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
    const legacyDueCodes = new Set(dueRequirements.map((row) => row.requirement_code));
    blockers.push(
      ...dueRequirements.map((row) => `Maintenance requirement ${row.requirement_code} is due`)
    );
    const canonicalDueRequirements = this.sqlite
      .prepare(
        `SELECT status.id, requirement.code
         FROM maintenance_aircraft_requirement_statuses status
         JOIN maintenance_due_requirements requirement ON requirement.id = status.requirement_id
         WHERE status.aircraft_id = ?
           AND requirement.active = 1
           AND requirement.mandatory = 1
           AND (
             (status.next_due_at IS NOT NULL AND status.next_due_at <= ?)
             OR (status.next_due_flight_hours IS NOT NULL AND status.next_due_flight_hours <= ?)
             OR (status.next_due_flight_cycles IS NOT NULL AND status.next_due_flight_cycles <= ?)
           )`
      )
      .all(
        aircraftId,
        at,
        number(aircraft.airframe_hours),
        number(aircraft.airframe_cycles)
      ) as Array<{ id: string; code: string }>;
    blockers.push(
      ...canonicalDueRequirements
        .filter(
          (row) => !legacyDueCodes.has(row.code) && !exemptCanonicalDueStatusIds.includes(row.id)
        )
        .map((row) => `Maintenance requirement ${row.code} is due`)
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
