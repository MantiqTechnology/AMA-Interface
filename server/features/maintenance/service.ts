import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import type {
  CreateMaintenanceJobCardInput,
  CreateMaintenanceWorkPackageInput,
  MaintenanceActor,
  MaintenanceAircraftStatusSummaryDto,
  MaintenanceAuditListQuery,
  MaintenanceAuditRecordDto,
  MaintenanceCompanyAuthorizationAction,
  MaintenanceCompanyAuthorizationDto,
  MaintenanceCommandCenterDto,
  MaintenanceDefectSummaryDto,
  MaintenanceDomainBlockerDto,
  MaintenanceDefectAssessmentInput,
  MaintenanceIndependentInspectionInput,
  MaintenanceInspectionAttemptDto,
  MaintenanceJobCardDto,
  MaintenanceJobCardStatus,
  MaintenanceJobCardWorkSignoffInput,
  MaintenanceListQuery,
  MaintenanceOperationalAttentionDto,
  MaintenanceReleaseInput,
  MaintenanceRequirementScopeDto,
  MaintenanceReworkActionDto,
  MaintenanceReworkSignoffInput,
  MaintenanceSelectorDataDto,
  MaintenanceTechnicalReleaseSummaryDto,
  MaintenanceVersionCommand,
  MaintenanceWorkPackageDto,
  MaintenanceWorkPackageStatus
} from '../../../shared/features/maintenance';
import { demoRolePermissions, type DemoRole } from '../../../shared/types/roles';
import type { AircraftAirworthinessService } from '../../services/aircraft-airworthiness.service';
import { DomainError } from '../../utils/errors';
import { getApplicationNow } from '../../utils/time';

type SqlRow = Record<string, string | number | bigint | Buffer | null>;
type MaintenanceDomainErrorMetadata = {
  impact: string;
  requiredAction: string;
  referenceId?: string | null;
  correlationId?: string | null;
  [key: string]: unknown;
};
type SignerAuthorizationSnapshot = {
  basis: string;
  actorUserId: string;
  actorRole: string;
  personnelId: string;
  personnelName: string;
  licenseId: string;
  licenseType: string;
  licenseNumber: string;
  licenseStatus: string;
  licenseExpiryDate: string | null;
  releasedAt: string;
  aircraftId: string;
  aircraftRegistrationNumber: string;
  aircraftType: string;
  aircraftModel: string;
  companyAuthorizationValidated: boolean;
  companyAuthorizationId: string | null;
  companyAuthorizationNumber: string | null;
  permittedAction: MaintenanceCompanyAuthorizationAction | null;
  companyAuthorizationStatus: string | null;
  companyAuthorizationValidFrom: string | null;
  companyAuthorizationValidUntil: string | null;
  companyAuthorizationBlocker: string | null;
  authorizationEvaluationAt: string;
  commandCorrelationId: string | null;
  aircraftScope: {
    registryAvailable: boolean;
    enforced: boolean;
    matchedQualificationId: string | null;
    reason: string;
  };
};
type ReleaseIdempotencyRow = {
  work_package_id: string;
  release_id: string | null;
  request_hash: string;
};
type InspectionIdempotencyRow = {
  job_card_id: string;
  inspection_attempt_id: string | null;
  request_hash: string;
};

const mroReleaseCommandType = 'MRO_TECHNICAL_RELEASE';
const mroInspectionCommandType = 'MRO_INDEPENDENT_INSPECTION';
const companyAuthorizationVerified = 'Licence and PT AMA authorization verified.';

function now() {
  return getApplicationNow();
}

function nullableText(value: unknown) {
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

function isDemoRole(role: string): role is DemoRole {
  return Object.prototype.hasOwnProperty.call(demoRolePermissions, role);
}

function dateOnly(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw maintenanceError(
      'MAINTENANCE_RELEASE_TIME_INVALID',
      'Release timestamp is invalid.',
      422,
      {
        impact: 'Technical release was not issued.',
        requiredAction: 'Refresh the release form and submit a valid release timestamp.'
      }
    );
  }
  return value.slice(0, 10);
}

function maintenanceError(
  code: string,
  message: string,
  statusCode: number,
  metadata: MaintenanceDomainErrorMetadata
) {
  return new DomainError(code, message, statusCode, {
    correlationId: metadata.correlationId ?? null,
    referenceId: metadata.referenceId ?? null,
    ...metadata
  });
}

export class MaintenanceService {
  constructor(
    private readonly sqlite: Database.Database,
    private readonly airworthiness: AircraftAirworthinessService
  ) {}

  listWorkPackages(query: MaintenanceListQuery) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (query.aircraftId) {
      where.push('wp.aircraft_id = ?');
      params.push(query.aircraftId);
    }
    if (query.status) {
      where.push('wp.status = ?');
      params.push(query.status);
    }
    if (query.search) {
      where.push(
        `(wp.package_number LIKE ? OR wp.title LIKE ? OR aircraft.registration_number LIKE ?)`
      );
      const search = `%${query.search}%`;
      params.push(search, search, search);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = this.sqlite
      .prepare(
        `SELECT wp.*, aircraft.registration_number AS aircraft_registration_number,
                aircraft.aircraft_type AS aircraft_type,
                aircraft.model AS aircraft_model,
                defect.defect_number AS primary_defect_number
         FROM maintenance_work_packages wp
         JOIN aircraft ON aircraft.id = wp.aircraft_id
         LEFT JOIN aircraft_defects defect ON defect.id = wp.primary_defect_id
         ${whereSql}
         ORDER BY wp.updated_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, query.limit, query.offset) as SqlRow[];
    const total = number(
      (
        this.sqlite
          .prepare(
            `SELECT COUNT(*) AS count
             FROM maintenance_work_packages wp
             JOIN aircraft ON aircraft.id = wp.aircraft_id
             LEFT JOIN aircraft_defects defect ON defect.id = wp.primary_defect_id
             ${whereSql}`
          )
          .get(...params) as SqlRow
      ).count
    );
    return {
      items: rows.map((row) => this.toWorkPackageDto(row, true)),
      total,
      limit: query.limit,
      offset: query.offset
    };
  }

  getWorkPackage(id: string) {
    return this.toWorkPackageDto(this.requireWorkPackage(id), true);
  }

  listAuditRecords(query: MaintenanceAuditListQuery) {
    const where: string[] = [];
    const params: unknown[] = [];
    const scope = this.auditScope(query);
    if (scope.empty) {
      return { items: [], total: 0, limit: query.limit, offset: query.offset };
    }
    if (scope.where) {
      where.push(scope.where);
      params.push(...scope.params);
    }
    if (query.entityType) {
      where.push('entity_type = ?');
      params.push(query.entityType);
    }
    if (query.action) {
      where.push('action = ?');
      params.push(query.action);
    }
    if (query.actorRole) {
      where.push('actor_role = ?');
      params.push(query.actorRole);
    }
    if (query.dateFrom) {
      where.push('occurred_at >= ?');
      params.push(query.dateFrom);
    }
    if (query.dateTo) {
      where.push('occurred_at <= ?');
      params.push(query.dateTo);
    }
    if (query.search) {
      where.push(
        `(id LIKE ? OR request_id LIKE ? OR action LIKE ? OR entity_type LIKE ? OR metadata_json LIKE ?)`
      );
      const search = `%${query.search}%`;
      params.push(search, search, search, search, search);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_audit_logs
         ${whereSql}
         ORDER BY occurred_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, query.limit, query.offset) as SqlRow[];
    const total = number(
      (
        this.sqlite
          .prepare(
            `SELECT COUNT(*) AS count
             FROM maintenance_audit_logs
             ${whereSql}`
          )
          .get(...params) as SqlRow
      ).count
    );
    return {
      items: rows.map((row) => this.toAuditRecordDto(row)),
      total,
      limit: query.limit,
      offset: query.offset
    };
  }

  commandCenter(): MaintenanceCommandCenterDto {
    const generatedAt = now();
    const workPackages = this.listWorkPackages({
      search: '',
      limit: 100,
      offset: 0
    }).items;
    const defects = this.defectSummaries({ onlyOpen: true });
    const fleet = this.fleetStatusSummaries();
    const jobCardsAwaitingExecution = this.jobCardOperationalRows([
      'READY',
      'IN_PROGRESS',
      'REJECTED_FOR_REWORK'
    ]);
    const inspectionsAwaitingAction = this.jobCardOperationalRows(['INSPECTION_REQUIRED']);
    const readyForRelease = workPackages.filter((item) => item.status === 'READY_FOR_RELEASE');
    const releaseBlockers = workPackages
      .filter((item) => item.status !== 'RELEASED' && item.status !== 'CANCELLED')
      .map((item) => ({
        workPackageId: item.id,
        packageNumber: item.packageNumber,
        aircraftRegistrationNumber: item.aircraftRegistrationNumber,
        blockers: this.releaseBlockersForPackage(item.id)
      }))
      .filter((item) => item.blockers.length > 0);
    const openGroundingDefects = defects.filter(
      (item) => item.assessmentDecision === 'GROUND'
    ).length;
    return {
      generatedAt,
      authorizationNotice: companyAuthorizationVerified,
      summary: {
        fleetTotal: fleet.length,
        serviceable: fleet.filter((item) => item.serviceabilityStatus === 'SERVICEABLE').length,
        restricted: fleet.filter(
          (item) => item.serviceabilityStatus === 'SERVICEABLE_WITH_RESTRICTIONS'
        ).length,
        unserviceable: fleet.filter((item) => item.serviceabilityStatus === 'UNSERVICEABLE').length,
        openGroundingDefects,
        activeWorkPackages: workPackages.filter((item) =>
          ['OPEN', 'IN_PROGRESS', 'READY_FOR_RELEASE'].includes(item.status)
        ).length,
        jobCardsAwaitingExecution: jobCardsAwaitingExecution.length,
        inspectionsAwaitingAction: inspectionsAwaitingAction.length,
        readyForRelease: readyForRelease.length
      },
      fleet,
      defects,
      workPackages,
      jobCardsAwaitingExecution,
      inspectionsAwaitingAction,
      readyForRelease,
      releaseBlockers,
      operationalAttention: this.operationalAttention(
        fleet,
        defects,
        workPackages,
        releaseBlockers
      ),
      recentAuditRecords: this.auditRecords(undefined, undefined, 20),
      technicalReleases: this.technicalReleaseSummaries(20)
    };
  }

  selectorData(actor: MaintenanceActor): MaintenanceSelectorDataDto {
    return {
      generatedAt: now(),
      authorizationNotice: companyAuthorizationVerified,
      aircraft: this.fleetStatusSummaries().map((item) => ({
        id: item.aircraftId,
        registrationNumber: item.registrationNumber,
        aircraftType: item.aircraftType,
        model: item.model,
        serviceabilityStatus: item.serviceabilityStatus,
        technicalEligibility: item.technicalEligibility,
        currentStationCode: item.currentStationCode,
        updatedAt: item.updatedAt
      })),
      eligibleDefects: this.defectSummaries({
        onlyOpen: true,
        onlyUnlinked: true,
        onlyPackageEligible: true
      }),
      vendors: this.vendorOptions(),
      signerLicenses: this.signerLicenseOptions(actor)
    };
  }

  listCompanyAuthorizations(personnelId?: string): MaintenanceCompanyAuthorizationDto[] {
    const params: unknown[] = [];
    const where = personnelId ? 'WHERE auth.personnel_id = ?' : '';
    if (personnelId) params.push(personnelId);
    const rows = this.sqlite
      .prepare(
        `SELECT auth.*, crew.full_name AS personnel_name, license.license_type AS license_type
         FROM maintenance_company_authorizations auth
         JOIN crews crew ON crew.id = auth.personnel_id
         JOIN personnel_licenses license ON license.id = auth.license_id
         ${where}
         ORDER BY auth.status = 'ACTIVE' DESC, crew.full_name, auth.authorization_number`
      )
      .all(...params) as SqlRow[];
    return rows.map((row) => this.toCompanyAuthorizationDto(row));
  }

  createWorkPackage(input: CreateMaintenanceWorkPackageInput, actor: MaintenanceActor) {
    const executionMode = input.executionMode ?? 'INTERNAL';
    this.assertWorkPackageCreationContext(input);

    const timestamp = now();
    const id = `mwp-${nanoid(12)}`;
    const packageNumber = `MWP-${timestamp.slice(0, 10).replaceAll('-', '')}-${nanoid(5).toUpperCase()}`;
    const initialJobCard = input.initialJobCard;
    const initialPackageVersion = initialJobCard ? 2 : 1;
    const initialPackageStatus: MaintenanceWorkPackageStatus = initialJobCard
      ? 'IN_PROGRESS'
      : 'OPEN';
    const initialJobCardId = initialJobCard ? `mjc-${nanoid(12)}` : null;
    const initialJobCardNumber = initialJobCard
      ? `${packageNumber}-JC-${nanoid(4).toUpperCase()}`
      : null;
    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_work_packages (
            id, package_number, aircraft_id, source_flight_id, primary_defect_id, title,
            priority, execution_mode, vendor_id, status, planning_note,
            version, created_by_user_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          packageNumber,
          input.aircraftId,
          input.sourceFlightId ?? null,
          input.primaryDefectId ?? null,
          input.title,
          input.priority ?? 'NORMAL',
          executionMode,
          input.vendorId ?? null,
          initialPackageStatus,
          input.planningNote ?? null,
          initialPackageVersion,
          actor.userId,
          timestamp,
          timestamp
        );
      this.audit('WORK_PACKAGE', id, 'CREATE', actor, null, initialPackageVersion, {
        packageNumber,
        aircraftId: input.aircraftId,
        primaryDefectId: input.primaryDefectId ?? null,
        executionMode
      });
      if (initialJobCard && initialJobCardId && initialJobCardNumber) {
        this.sqlite
          .prepare(
            `INSERT INTO maintenance_job_cards (
              id, work_package_id, card_number, title, task_type, maintenance_data_ref,
              maintenance_data_revision, mandatory_flag, requires_independent_inspection,
              status, created_by_user_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY', ?, ?, ?)`
          )
          .run(
            initialJobCardId,
            id,
            initialJobCardNumber,
            initialJobCard.title,
            initialJobCard.taskType,
            initialJobCard.maintenanceDataRef,
            initialJobCard.maintenanceDataRevision,
            initialJobCard.mandatoryFlag ? 1 : 0,
            initialJobCard.requiresIndependentInspection ? 1 : 0,
            actor.userId,
            timestamp,
            timestamp
          );
        this.audit('JOB_CARD', initialJobCardId, 'CREATE', actor, null, 1, {
          workPackageId: id,
          cardNumber: initialJobCardNumber,
          requiresIndependentInspection: initialJobCard.requiresIndependentInspection
        });
      }
    })();
    return this.getWorkPackage(id);
  }

  assessDefect(defectId: string, input: MaintenanceDefectAssessmentInput, actor: MaintenanceActor) {
    const defect = this.requireDefect(defectId);
    const timestamp = now();
    const id = `massess-${nanoid(12)}`;
    try {
      this.sqlite.transaction(() => {
        this.sqlite
          .prepare(
            `INSERT INTO maintenance_defect_assessments (
              id, defect_id, aircraft_id, assessment_decision, assessment_note,
              assessed_by_user_id, assessed_at, request_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            id,
            defectId,
            String(defect.aircraft_id),
            input.assessmentDecision,
            input.assessmentNote,
            actor.userId,
            timestamp,
            actor.requestId ?? null
          );
        this.audit('DEFECT', defectId, 'ASSESS', actor, null, null, input);
      })();
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new DomainError(
          'MAINTENANCE_DEFECT_ALREADY_ASSESSED',
          'Defect already has a maintenance assessment.',
          409
        );
      }
      throw error;
    }
    return {
      id,
      defectId,
      aircraftId: String(defect.aircraft_id),
      assessmentDecision: input.assessmentDecision,
      assessmentNote: input.assessmentNote,
      assessedByUserId: actor.userId,
      assessedAt: timestamp
    };
  }

  addJobCard(workPackageId: string, input: CreateMaintenanceJobCardInput, actor: MaintenanceActor) {
    const workPackage = this.requireWorkPackage(workPackageId);
    this.assertVersion(workPackage, input.expectedWorkPackageVersion);
    this.assertWorkPackageMutable(workPackage);

    const timestamp = now();
    const id = `mjc-${nanoid(12)}`;
    const cardNumber = `${String(workPackage.package_number)}-JC-${nanoid(4).toUpperCase()}`;
    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_job_cards (
            id, work_package_id, card_number, title, task_type, maintenance_data_ref,
            maintenance_data_revision, mandatory_flag, requires_independent_inspection,
            status, created_by_user_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY', ?, ?, ?)`
        )
        .run(
          id,
          workPackageId,
          cardNumber,
          input.title,
          input.taskType,
          input.maintenanceDataRef,
          input.maintenanceDataRevision,
          input.mandatoryFlag ? 1 : 0,
          input.requiresIndependentInspection ? 1 : 0,
          actor.userId,
          timestamp,
          timestamp
        );
      this.touchWorkPackage(workPackageId, input.expectedWorkPackageVersion, 'IN_PROGRESS');
      this.audit('JOB_CARD', id, 'CREATE', actor, null, 1, {
        workPackageId,
        cardNumber,
        requiresIndependentInspection: input.requiresIndependentInspection
      });
    })();
    return this.getWorkPackage(workPackageId);
  }

  linkRequirementToJobCard(
    workPackageId: string,
    requirementId: string,
    jobCardId: string,
    actor: MaintenanceActor
  ) {
    const workPackage = this.requireWorkPackage(workPackageId);
    this.assertWorkPackageMutable(workPackage);
    const requirement = this.sqlite
      .prepare('SELECT * FROM aircraft_maintenance_requirements WHERE id = ?')
      .get(requirementId) as SqlRow | undefined;
    if (!requirement) {
      throw maintenanceError(
        'MAINTENANCE_REQUIREMENT_NOT_FOUND',
        'Maintenance requirement was not found.',
        404,
        {
          impact: 'The work package scope was not changed.',
          requiredAction:
            'Refresh the aircraft technical profile and select an existing requirement.',
          referenceId: requirementId
        }
      );
    }
    if (String(requirement.aircraft_id) !== String(workPackage.aircraft_id)) {
      throw maintenanceError(
        'MAINTENANCE_REQUIREMENT_AIRCRAFT_MISMATCH',
        'Maintenance requirement belongs to a different aircraft.',
        422,
        {
          impact: 'The work package scope was not changed.',
          requiredAction: 'Select a requirement for the same aircraft as the work package.',
          referenceId: requirementId
        }
      );
    }
    const card = this.requireJobCard(jobCardId);
    if (String(card.work_package_id) !== workPackageId) {
      throw maintenanceError(
        'MAINTENANCE_REQUIREMENT_JOB_CARD_MISMATCH',
        'Requirement scope must be linked to a job card in the same work package.',
        422,
        {
          impact: 'The work package scope was not changed.',
          requiredAction: 'Select a job card from the same work package.',
          referenceId: jobCardId
        }
      );
    }

    const timestamp = now();
    try {
      this.sqlite.transaction(() => {
        this.sqlite
          .prepare(
            `INSERT INTO maintenance_work_package_requirement_links (
	              id, work_package_id, requirement_id, job_card_id, created_by_user_id, created_at
	            ) VALUES (?, ?, ?, ?, ?, ?)`
          )
          .run(
            `mwpreq-${nanoid(12)}`,
            workPackageId,
            requirementId,
            jobCardId,
            actor.userId,
            timestamp
          );
        this.touchWorkPackage(workPackageId, number(workPackage.version));
        this.audit(
          'WORK_PACKAGE',
          workPackageId,
          'LINK_REQUIREMENT',
          actor,
          number(workPackage.version),
          number(workPackage.version) + 1,
          { requirementId, jobCardId }
        );
      })();
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw maintenanceError(
          'MAINTENANCE_REQUIREMENT_ALREADY_LINKED',
          'Maintenance requirement is already linked to a work package scope.',
          409,
          {
            impact: 'The work package scope was not changed.',
            requiredAction: 'Refresh the work package scope before retrying.',
            referenceId: requirementId
          }
        );
      }
      throw error;
    }
    return this.getWorkPackage(workPackageId);
  }

  startJobCard(jobCardId: string, input: MaintenanceVersionCommand, actor: MaintenanceActor) {
    const card = this.requireJobCard(jobCardId);
    this.assertVersion(card, input.expectedVersion);
    if (String(card.status) !== 'READY' && String(card.status) !== 'REJECTED_FOR_REWORK') {
      throw new DomainError(
        'MAINTENANCE_JOB_CARD_START_INVALID',
        'Only ready or rework job cards can be started.',
        409
      );
    }
    this.sqlite.transaction(() => {
      this.updateJobCardStatus(jobCardId, input.expectedVersion, 'IN_PROGRESS');
      this.audit(
        'JOB_CARD',
        jobCardId,
        'START',
        actor,
        input.expectedVersion,
        input.expectedVersion + 1
      );
    })();
    return this.getWorkPackage(String(card.work_package_id));
  }

  signWork(jobCardId: string, input: MaintenanceJobCardWorkSignoffInput, actor: MaintenanceActor) {
    this.assertMaintenancePermission(actor, 'maintenance.jobcard.work.sign');
    const card = this.requireJobCard(jobCardId);
    this.assertVersion(card, input.expectedVersion);
    if (!['READY', 'IN_PROGRESS'].includes(String(card.status))) {
      throw new DomainError(
        'MAINTENANCE_JOB_CARD_SIGNOFF_INVALID',
        'Job card is not open for original mechanic sign-off.',
        409
      );
    }
    const nextStatus: MaintenanceJobCardStatus = number(card.requires_independent_inspection)
      ? 'INSPECTION_REQUIRED'
      : 'READY_FOR_RELEASE_REVIEW';
    try {
      this.sqlite.transaction(() => {
        const workPackage = this.requireWorkPackage(String(card.work_package_id));
        const authorizationSnapshot = this.evaluateControlledMaintenanceAuthorization(
          actor,
          String(workPackage.aircraft_id),
          input.certifyingLicenseNumber,
          now(),
          'MECHANIC_SIGN_OFF'
        );
        this.insertSignoff(
          jobCardId,
          'MECHANIC',
          'COMPLETED',
          input.statement,
          input.evidenceReferences,
          actor,
          input.certifyingLicenseNumber,
          authorizationSnapshot
        );
        this.updateJobCardStatus(jobCardId, input.expectedVersion, nextStatus);
        this.audit(
          'JOB_CARD',
          jobCardId,
          'MECHANIC_SIGNOFF',
          actor,
          input.expectedVersion,
          input.expectedVersion + 1,
          {
            companyAuthorizationNumber: authorizationSnapshot.companyAuthorizationNumber
          }
        );
      })();
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new DomainError(
          'MAINTENANCE_JOB_CARD_ALREADY_SIGNED',
          'Job card already has a mechanic sign-off.',
          409
        );
      }
      throw error;
    }
    return this.getWorkPackage(String(card.work_package_id));
  }

  inspectJobCard(
    jobCardId: string,
    input: MaintenanceIndependentInspectionInput,
    actor: MaintenanceActor
  ) {
    this.assertMaintenancePermission(actor, 'maintenance.jobcard.inspect');
    const requestHash = this.inspectionRequestHash(jobCardId, input);
    const replay = this.findInspectionIdempotency(input.idempotencyKey, actor.userId);
    if (replay) return this.handleInspectionIdempotencyReplay(replay, jobCardId, requestHash);

    const card = this.requireJobCard(jobCardId);
    this.assertVersion(card, input.expectedVersion);
    const workPackage = this.requireWorkPackage(String(card.work_package_id));
    if (!number(card.requires_independent_inspection)) {
      throw new DomainError(
        'MAINTENANCE_INSPECTION_NOT_REQUIRED',
        'This job card does not require independent inspection.',
        409
      );
    }
    if (String(card.status) !== 'INSPECTION_REQUIRED') {
      throw new DomainError(
        'MAINTENANCE_INSPECTION_STATE_INVALID',
        'Job card is not ready for independent inspection.',
        409
      );
    }
    const mechanic = this.sqlite
      .prepare(
        `SELECT actor_user_id FROM maintenance_job_card_signoffs
         WHERE job_card_id = ? AND signoff_type = 'MECHANIC'`
      )
      .get(jobCardId) as { actor_user_id: string } | undefined;
    if (!mechanic) {
      throw new DomainError(
        'MAINTENANCE_MECHANIC_SIGNOFF_REQUIRED',
        'Independent inspection requires a mechanic sign-off first.',
        422
      );
    }
    const openRework = this.openReworkActionForJobCard(jobCardId);
    const reworkMechanicId = nullableText(openRework?.mechanic_signoff_user_id);
    const independentFromUserId = reworkMechanicId ?? mechanic.actor_user_id;
    if (independentFromUserId === actor.userId) {
      throw new DomainError(
        'MAINTENANCE_INSPECTION_SELF_SIGNOFF',
        'Independent inspection cannot be performed by the person who signed the work or corrective work.',
        422
      );
    }
    if (openRework && String(openRework.status) !== 'AWAITING_REINSPECTION') {
      throw maintenanceError(
        'MAINTENANCE_REWORK_SIGNOFF_REQUIRED',
        'Corrective work must be signed before re-inspection.',
        409,
        {
          impact: 'Inspection was not recorded and technical release remains blocked.',
          requiredAction: 'Complete corrective work sign-off before re-inspection.',
          referenceId: String(openRework.id)
        }
      );
    }
    const nextStatus: MaintenanceJobCardStatus = 'READY_FOR_RELEASE_REVIEW';
    let attemptId = '';
    try {
      this.sqlite.transaction(() => {
        const inspectorSnapshot = this.evaluateControlledMaintenanceAuthorization(
          actor,
          String(workPackage.aircraft_id),
          input.certifyingLicenseNumber,
          input.inspectedAt,
          openRework ? 'INDEPENDENT_REINSPECTION' : 'INDEPENDENT_INSPECTION'
        );
        this.insertInspectionIdempotency(
          input.idempotencyKey,
          actor.userId,
          jobCardId,
          requestHash
        );
        const attemptNumbers = this.nextInspectionNumbers(jobCardId, openRework);
        attemptId = this.insertInspectionAttempt(
          card,
          workPackage,
          input,
          actor,
          inspectorSnapshot,
          attemptNumbers.attemptNumber,
          input.decision === 'FAILED' && openRework
            ? attemptNumbers.cycleNumber + 1
            : attemptNumbers.cycleNumber
        );
        if (input.decision === 'FAILED') {
          if (openRework) this.markReinspectionFailed(String(openRework.id), attemptId);
          const cycleNumber =
            input.decision === 'FAILED' && openRework
              ? attemptNumbers.cycleNumber + 1
              : attemptNumbers.cycleNumber;
          const reworkId = this.createReworkAction(
            workPackage,
            card,
            attemptId,
            cycleNumber,
            input
          );
          this.updateJobCardStatus(jobCardId, input.expectedVersion, 'REJECTED_FOR_REWORK');
          this.touchWorkPackage(String(card.work_package_id), number(workPackage.version));
          this.audit(
            'INSPECTION_ATTEMPT',
            attemptId,
            'INDEPENDENT_INSPECTION_FAILED',
            actor,
            null,
            null,
            {
              packageId: String(workPackage.id),
              packageNumber: String(workPackage.package_number),
              jobCardId,
              jobCardNumber: String(card.card_number),
              reworkActionId: reworkId,
              cycleNumber,
              companyAuthorizationNumber: inspectorSnapshot.companyAuthorizationNumber
            }
          );
          this.audit('REWORK_ACTION', reworkId, 'REWORK_REQUIRED', actor, null, null, {
            packageId: String(workPackage.id),
            packageNumber: String(workPackage.package_number),
            jobCardId,
            jobCardNumber: String(card.card_number),
            sourceInspectionAttemptId: attemptId
          });
        } else {
          if (openRework) this.markReinspectionPassed(String(openRework.id), attemptId);
          this.insertSignoff(
            jobCardId,
            'INDEPENDENT_INSPECTION',
            input.decision,
            input.statement,
            input.evidenceReferences,
            actor,
            input.certifyingLicenseNumber,
            inspectorSnapshot
          );
          this.updateJobCardStatus(jobCardId, input.expectedVersion, nextStatus);
          this.touchWorkPackage(String(card.work_package_id), number(workPackage.version));
          this.audit(
            'INSPECTION_ATTEMPT',
            attemptId,
            'INDEPENDENT_INSPECTION_PASSED',
            actor,
            null,
            null,
            {
              packageId: String(workPackage.id),
              packageNumber: String(workPackage.package_number),
              jobCardId,
              jobCardNumber: String(card.card_number),
              reworkActionId: openRework ? String(openRework.id) : null,
              companyAuthorizationNumber: inspectorSnapshot.companyAuthorizationNumber
            }
          );
        }
        this.audit(
          'JOB_CARD',
          jobCardId,
          `INDEPENDENT_INSPECTION_${input.decision}`,
          actor,
          input.expectedVersion,
          input.expectedVersion + 1
        );
        this.audit(
          'WORK_PACKAGE',
          String(workPackage.id),
          'READINESS_RECALCULATED',
          actor,
          number(workPackage.version),
          number(workPackage.version) + 1,
          { jobCardId, inspectionAttemptId: attemptId, decision: input.decision }
        );
        this.completeInspectionIdempotency(input.idempotencyKey, actor.userId, attemptId, now());
      })();
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new DomainError(
          'MAINTENANCE_JOB_CARD_ALREADY_INSPECTED',
          'Job card already has an independent inspection sign-off.',
          409
        );
      }
      throw error;
    }
    this.airworthiness.detail(String(workPackage.aircraft_id));
    return this.getWorkPackage(String(card.work_package_id));
  }

  signReworkAction(
    reworkActionId: string,
    input: MaintenanceReworkSignoffInput,
    actor: MaintenanceActor
  ) {
    this.assertMaintenancePermission(actor, 'maintenance.jobcard.work.sign');
    const rework = this.requireReworkAction(reworkActionId);
    if (!['REWORK_REQUIRED', 'CORRECTIVE_WORK_IN_PROGRESS'].includes(String(rework.status))) {
      throw maintenanceError(
        'MAINTENANCE_REWORK_SIGNOFF_STATE_INVALID',
        'Corrective work is not open for mechanic sign-off.',
        409,
        {
          impact: 'Corrective work sign-off was not recorded and release remains blocked.',
          requiredAction: 'Refresh the work package and open the active rework action.',
          referenceId: reworkActionId
        }
      );
    }
    const workPackage = this.requireWorkPackage(String(rework.work_package_id));
    this.assertVersion(workPackage, input.expectedVersion);
    const card = this.requireJobCard(String(rework.job_card_id));
    this.sqlite.transaction(() => {
      const authorizationSnapshot = this.evaluateControlledMaintenanceAuthorization(
        actor,
        String(workPackage.aircraft_id),
        input.certifyingLicenseNumber,
        now(),
        'REWORK_SIGN_OFF'
      );
      this.sqlite
        .prepare(
          `UPDATE maintenance_rework_actions
           SET corrective_action_description = ?,
               approved_data_ref = ?,
               assigned_mechanic_user_id = ?,
               status = 'AWAITING_REINSPECTION',
               mechanic_signoff_statement = ?,
               mechanic_signoff_user_id = ?,
               mechanic_signoff_role = ?,
               mechanic_license_number = ?,
               company_authorization_snapshot_json = ?,
               mechanic_signoff_at = ?,
               updated_at = ?
           WHERE id = ? AND status IN ('REWORK_REQUIRED', 'CORRECTIVE_WORK_IN_PROGRESS')`
        )
        .run(
          input.correctiveActionDescription,
          input.approvedDataRef,
          actor.userId,
          input.statement,
          actor.userId,
          actor.role,
          input.certifyingLicenseNumber,
          JSON.stringify(authorizationSnapshot),
          now(),
          now(),
          reworkActionId
        );
      this.updateJobCardStatus(String(card.id), number(card.version), 'INSPECTION_REQUIRED');
      this.touchWorkPackage(String(workPackage.id), input.expectedVersion);
      this.audit('REWORK_ACTION', reworkActionId, 'CORRECTIVE_WORK_SIGNED', actor, null, null, {
        packageId: String(workPackage.id),
        packageNumber: String(workPackage.package_number),
        jobCardId: String(card.id),
        jobCardNumber: String(card.card_number),
        approvedDataRef: input.approvedDataRef,
        companyAuthorizationNumber: authorizationSnapshot.companyAuthorizationNumber
      });
      this.audit(
        'JOB_CARD',
        String(card.id),
        'AWAITING_REINSPECTION',
        actor,
        number(card.version),
        number(card.version) + 1,
        { reworkActionId }
      );
      this.audit(
        'WORK_PACKAGE',
        String(workPackage.id),
        'READINESS_RECALCULATED',
        actor,
        number(workPackage.version),
        number(workPackage.version) + 1,
        { reworkActionId, status: 'AWAITING_REINSPECTION' }
      );
    })();
    this.airworthiness.detail(String(workPackage.aircraft_id));
    return this.getWorkPackage(String(workPackage.id));
  }

  requestRelease(workPackageId: string, input: MaintenanceVersionCommand, actor: MaintenanceActor) {
    const workPackage = this.requireWorkPackage(workPackageId);
    this.assertVersion(workPackage, input.expectedVersion);
    this.assertReleaseReady(workPackageId);
    this.sqlite.transaction(() => {
      this.updateWorkPackageStatus(workPackageId, input.expectedVersion, 'READY_FOR_RELEASE');
      this.audit(
        'WORK_PACKAGE',
        workPackageId,
        'REQUEST_RELEASE',
        actor,
        input.expectedVersion,
        input.expectedVersion + 1
      );
    })();
    return this.getWorkPackage(workPackageId);
  }

  releaseWorkPackage(
    workPackageId: string,
    input: MaintenanceReleaseInput,
    actor: MaintenanceActor
  ) {
    this.assertActorPermission(actor, 'maintenance.release.issue');
    const requestHash = this.releaseRequestHash(workPackageId, input);
    const idempotencyKey = input.idempotencyKey?.trim() || null;
    if (idempotencyKey) {
      const replay = this.findReleaseIdempotency(idempotencyKey, actor.userId);
      if (replay) return this.handleReleaseIdempotencyReplay(replay, workPackageId, requestHash);
    }

    let aircraftIdForRecalculation: string | null = null;
    try {
      const transactionResult = this.sqlite.transaction(() => {
        const workPackage = this.requireWorkPackage(workPackageId);
        this.assertVersion(workPackage, input.expectedVersion);
        if (String(workPackage.status) !== 'READY_FOR_RELEASE') {
          throw maintenanceError(
            'MAINTENANCE_PACKAGE_RELEASE_STATE_INVALID',
            'Work package must be ready for release before technical release.',
            409,
            {
              impact: 'Technical release was not issued and aircraft readiness was not changed.',
              requiredAction:
                'Request release only after the work package is ready for release review.',
              referenceId: workPackageId
            }
          );
        }
        this.assertReleaseReady(workPackageId);
        this.assertNoOpenReworkFindings(workPackageId);
        this.assertLinkedRestrictedReleaseCurrent(workPackage, input);
        const aircraft = this.requireAircraft(String(workPackage.aircraft_id));
        const signerSnapshot = this.validateSignerAuthorization(
          input,
          actor,
          String(workPackage.aircraft_id)
        );
        const requirementIds = this.releaseEligibleRequirementIds(workPackageId);
        if (idempotencyKey) {
          this.insertReleaseIdempotency(idempotencyKey, actor.userId, workPackageId, requestHash);
        }
        const defectIds = workPackage.primary_defect_id
          ? [String(workPackage.primary_defect_id)]
          : [];
        const release = this.airworthiness.issueMaintenanceScopedReleaseInOpenTransaction(
          String(workPackage.aircraft_id),
          {
            releaseNumber: input.releaseNumber,
            resultingStatus: input.resultingStatus,
            workOrderReference: String(workPackage.package_number),
            releaseStatement: input.releaseStatement,
            certifyingLicenseNumber: input.certifyingLicenseNumber,
            releasedAt: input.releasedAt,
            defectIds,
            evidenceReferences: input.evidenceReferences,
            expectedVersion: number(aircraft.version)
          },
          { userId: actor.userId, role: actor.role },
          {
            maintenanceRequirementIds: requirementIds,
            signerAuthorizationSnapshot: signerSnapshot
          }
        );
        const timestamp = now();
        const result = this.sqlite
          .prepare(
            `UPDATE maintenance_work_packages
	             SET status = 'RELEASED', release_id = ?, released_at = ?, financial_status = 'READY_FOR_HANDOFF',
	                 version = version + 1, updated_at = ?
	             WHERE id = ? AND version = ?`
          )
          .run(
            release.releaseId,
            input.releasedAt,
            timestamp,
            workPackageId,
            input.expectedVersion
          );
        if (!result.changes) {
          throw maintenanceError('STALE_VERSION', 'Work package changed. Refresh and retry.', 409, {
            impact:
              'Technical release transaction was rolled back and aircraft readiness was not changed.',
            requiredAction: 'Refresh the work package and submit release again.',
            referenceId: workPackageId
          });
        }
        if (idempotencyKey) {
          this.completeReleaseIdempotency(
            idempotencyKey,
            actor.userId,
            release.releaseId,
            timestamp
          );
        }
        this.audit(
          'WORK_PACKAGE',
          workPackageId,
          'TECHNICAL_RELEASE',
          actor,
          input.expectedVersion,
          input.expectedVersion + 1,
          {
            releaseNumber: input.releaseNumber,
            releaseId: release.releaseId,
            requirementIds,
            companyAuthorizationNumber: signerSnapshot.companyAuthorizationNumber,
            signerAuthorizationBasis: signerSnapshot.basis
          }
        );
        return { aircraftId: String(workPackage.aircraft_id) };
      })();
      aircraftIdForRecalculation = transactionResult.aircraftId;
    } catch (error) {
      if (error instanceof DomainError) {
        throw this.normalizeReleaseDomainError(error, workPackageId);
      }
      throw maintenanceError(
        'MAINTENANCE_RELEASE_TRANSACTION_FAILED',
        'Technical release could not be completed.',
        500,
        {
          impact:
            'All technical-state mutations in the release transaction were rolled back. Aircraft readiness was not changed.',
          requiredAction:
            'Retry after refreshing the work package. If the problem repeats, inspect the server logs with the request correlation ID.',
          referenceId: workPackageId
        }
      );
    }
    if (aircraftIdForRecalculation) {
      this.airworthiness.recalculateAfterMaintenanceRelease(
        aircraftIdForRecalculation,
        actor.userId
      );
    }
    return this.getWorkPackage(workPackageId);
  }

  claimFinancialSource(
    workPackageId: string,
    sourceType: 'INVENTORY_MOVEMENT' | 'VENDOR_INVOICE' | 'MANUAL_COST',
    sourceId: string,
    amountIdr: number,
    actor: MaintenanceActor
  ) {
    this.requireWorkPackage(workPackageId);
    const timestamp = now();
    const id = `mclaim-${nanoid(12)}`;
    try {
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_financial_claims (
            id, work_package_id, source_type, source_id, amount_idr, status,
            created_by_user_id, created_at
          ) VALUES (?, ?, ?, ?, ?, 'READY', ?, ?)`
        )
        .run(id, workPackageId, sourceType, sourceId, amountIdr, actor.userId, timestamp);
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new DomainError(
          'MAINTENANCE_FINANCIAL_SOURCE_ALREADY_CLAIMED',
          'Maintenance financial source has already been claimed.',
          409,
          { sourceType, sourceId }
        );
      }
      throw error;
    }
    return { id, workPackageId, sourceType, sourceId, amountIdr, status: 'READY' as const };
  }

  private assertActorPermission(actor: MaintenanceActor, permission: string) {
    const permissions = isDemoRole(actor.role) ? demoRolePermissions[actor.role] : [];
    if (!permissions.includes('*') && !permissions.includes(permission)) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_PERMISSION_REQUIRED',
        'Actor is not allowed to issue a maintenance technical release.',
        403,
        {
          impact: 'Technical release was not issued and aircraft readiness was not changed.',
          requiredAction: 'Use an authorized Certifying Staff account with release permission.',
          referenceId: actor.userId,
          permission
        }
      );
    }
  }

  private assertMaintenancePermission(actor: MaintenanceActor, permission: string) {
    const permissions = isDemoRole(actor.role) ? demoRolePermissions[actor.role] : [];
    if (!permissions.includes('*') && !permissions.includes(permission)) {
      throw maintenanceError(
        'MAINTENANCE_PERMISSION_REQUIRED',
        'Maintenance action is restricted.',
        403,
        {
          impact: 'The maintenance command was not applied.',
          requiredAction: 'Switch to an authorized maintenance role for this action.',
          referenceId: actor.userId,
          permission
        }
      );
    }
  }

  private releaseRequestHash(workPackageId: string, input: MaintenanceReleaseInput) {
    const canonical = {
      workPackageId,
      releaseNumber: input.releaseNumber,
      resultingStatus: input.resultingStatus,
      releaseStatement: input.releaseStatement,
      certifyingLicenseNumber: input.certifyingLicenseNumber,
      releasedAt: input.releasedAt,
      evidenceReferences: input.evidenceReferences
    };
    return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }

  private findReleaseIdempotency(idempotencyKey: string, actorUserId: string) {
    return this.sqlite
      .prepare(
        `SELECT work_package_id, release_id, request_hash
	         FROM maintenance_release_idempotency_keys
	         WHERE command_type = ? AND idempotency_key = ? AND actor_user_id = ?`
      )
      .get(mroReleaseCommandType, idempotencyKey, actorUserId) as ReleaseIdempotencyRow | undefined;
  }

  private handleReleaseIdempotencyReplay(
    row: ReleaseIdempotencyRow,
    workPackageId: string,
    requestHash: string
  ) {
    if (row.work_package_id !== workPackageId || row.request_hash !== requestHash) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_IDEMPOTENCY_CONFLICT',
        'This idempotency key was already used for a different maintenance release command.',
        409,
        {
          impact: 'Technical release was not issued and no aircraft state changed.',
          requiredAction:
            'Generate a new idempotency key for a materially different release request.',
          referenceId: workPackageId
        }
      );
    }
    if (!row.release_id) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_IN_PROGRESS',
        'This release idempotency key is already being processed.',
        409,
        {
          impact: 'Technical release was not issued again.',
          requiredAction: 'Wait for the original request result, then refresh the work package.',
          referenceId: workPackageId
        }
      );
    }
    return this.getWorkPackage(workPackageId);
  }

  private insertReleaseIdempotency(
    idempotencyKey: string,
    actorUserId: string,
    workPackageId: string,
    requestHash: string
  ) {
    const result = this.sqlite
      .prepare(
        `INSERT OR IGNORE INTO maintenance_release_idempotency_keys (
	          id, command_type, idempotency_key, work_package_id, request_hash, actor_user_id, created_at
	        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `mrelidem-${nanoid(12)}`,
        mroReleaseCommandType,
        idempotencyKey,
        workPackageId,
        requestHash,
        actorUserId,
        now()
      );
    if (!result.changes) {
      const replay = this.findReleaseIdempotency(idempotencyKey, actorUserId);
      if (replay) {
        this.handleReleaseIdempotencyReplay(replay, workPackageId, requestHash);
      }
      throw maintenanceError(
        'MAINTENANCE_RELEASE_IN_PROGRESS',
        'This release idempotency key is already being processed.',
        409,
        {
          impact: 'Technical release was not issued again.',
          requiredAction: 'Refresh the work package before retrying.',
          referenceId: workPackageId
        }
      );
    }
  }

  private completeReleaseIdempotency(
    idempotencyKey: string,
    actorUserId: string,
    releaseId: string,
    completedAt: string
  ) {
    this.sqlite
      .prepare(
        `UPDATE maintenance_release_idempotency_keys
	         SET release_id = ?, completed_at = ?
	         WHERE command_type = ? AND idempotency_key = ? AND actor_user_id = ?`
      )
      .run(releaseId, completedAt, mroReleaseCommandType, idempotencyKey, actorUserId);
  }

  private inspectionRequestHash(jobCardId: string, input: MaintenanceIndependentInspectionInput) {
    const canonical = {
      jobCardId,
      expectedVersion: input.expectedVersion,
      decision: input.decision,
      statement: input.statement,
      certifyingLicenseNumber: input.certifyingLicenseNumber,
      inspectedAt: input.inspectedAt,
      evidenceReferences: input.evidenceReferences
    };
    return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }

  private findInspectionIdempotency(idempotencyKey: string, actorUserId: string) {
    return this.sqlite
      .prepare(
        `SELECT job_card_id, inspection_attempt_id, request_hash
         FROM maintenance_inspection_idempotency_keys
         WHERE command_type = ? AND idempotency_key = ? AND actor_user_id = ?`
      )
      .get(mroInspectionCommandType, idempotencyKey, actorUserId) as
      InspectionIdempotencyRow | undefined;
  }

  private handleInspectionIdempotencyReplay(
    row: InspectionIdempotencyRow,
    jobCardId: string,
    requestHash: string
  ) {
    if (row.job_card_id !== jobCardId || row.request_hash !== requestHash) {
      throw maintenanceError(
        'MAINTENANCE_INSPECTION_IDEMPOTENCY_CONFLICT',
        'This idempotency key was already used for a different inspection command.',
        409,
        {
          impact: 'Inspection was not recorded again and release state was not changed.',
          requiredAction: 'Generate a new idempotency key for a different inspection command.',
          referenceId: jobCardId
        }
      );
    }
    if (!row.inspection_attempt_id) {
      throw maintenanceError(
        'MAINTENANCE_INSPECTION_IN_PROGRESS',
        'This inspection idempotency key is already being processed.',
        409,
        {
          impact: 'Inspection was not recorded again.',
          requiredAction: 'Wait for the original request result, then refresh the work package.',
          referenceId: jobCardId
        }
      );
    }
    const card = this.requireJobCard(jobCardId);
    return this.getWorkPackage(String(card.work_package_id));
  }

  private insertInspectionIdempotency(
    idempotencyKey: string,
    actorUserId: string,
    jobCardId: string,
    requestHash: string
  ) {
    const result = this.sqlite
      .prepare(
        `INSERT OR IGNORE INTO maintenance_inspection_idempotency_keys (
          id, command_type, idempotency_key, job_card_id, request_hash, actor_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `minspidem-${nanoid(12)}`,
        mroInspectionCommandType,
        idempotencyKey,
        jobCardId,
        requestHash,
        actorUserId,
        now()
      );
    if (!result.changes) {
      const replay = this.findInspectionIdempotency(idempotencyKey, actorUserId);
      if (replay) {
        this.handleInspectionIdempotencyReplay(replay, jobCardId, requestHash);
      }
      throw maintenanceError(
        'MAINTENANCE_INSPECTION_IN_PROGRESS',
        'This inspection idempotency key is already being processed.',
        409,
        {
          impact: 'Inspection was not recorded again.',
          requiredAction: 'Refresh the work package before retrying.',
          referenceId: jobCardId
        }
      );
    }
  }

  private completeInspectionIdempotency(
    idempotencyKey: string,
    actorUserId: string,
    attemptId: string,
    completedAt: string
  ) {
    this.sqlite
      .prepare(
        `UPDATE maintenance_inspection_idempotency_keys
         SET inspection_attempt_id = ?, completed_at = ?
         WHERE command_type = ? AND idempotency_key = ? AND actor_user_id = ?`
      )
      .run(attemptId, completedAt, mroInspectionCommandType, idempotencyKey, actorUserId);
  }

  private normalizeReleaseDomainError(error: DomainError, workPackageId: string) {
    const details =
      error.details && typeof error.details === 'object' && !Array.isArray(error.details)
        ? (error.details as Record<string, unknown>)
        : {};
    if (details.impact && details.requiredAction) return error;
    return new DomainError(error.code, error.message, error.statusCode, {
      correlationId: details.correlationId ?? null,
      referenceId: details.referenceId ?? workPackageId,
      ...details,
      impact: 'Technical release was not issued and aircraft readiness was not changed.',
      requiredAction:
        details.requiredAction ??
        'Refresh the work package, resolve the reported release blocker, and submit again.'
    });
  }

  private validateSignerAuthorization(
    input: MaintenanceReleaseInput,
    actor: MaintenanceActor,
    aircraftId: string
  ): SignerAuthorizationSnapshot {
    return this.evaluateControlledMaintenanceAuthorization(
      actor,
      aircraftId,
      input.certifyingLicenseNumber,
      input.releasedAt,
      'TECHNICAL_RELEASE'
    );
  }

  private evaluateControlledMaintenanceAuthorization(
    actor: MaintenanceActor,
    aircraftId: string,
    licenseNumber: string,
    effectiveAt: string,
    action: MaintenanceCompanyAuthorizationAction
  ): SignerAuthorizationSnapshot {
    const releasedDate = dateOnly(effectiveAt);
    const aircraft = this.requireAircraft(aircraftId);
    const authorizationError = (code: string, reason: string, requiredAction?: string) =>
      this.companyAuthorizationError(actor, aircraftId, code, reason, requiredAction);
    const personnel = this.sqlite
      .prepare(
        `SELECT * FROM crews
	         WHERE (id = ? OR employee_code = ?)
	           AND is_active = 1
	           AND lifecycle_status = 'ACTIVE'
	         LIMIT 1`
      )
      .get(actor.userId, actor.userId) as SqlRow | undefined;
    if (!personnel) {
      throw authorizationError(
        'COMPANY_AUTHORIZATION_REQUIRED',
        'No active personnel record maps to the maintenance actor.'
      );
    }
    const license = this.sqlite
      .prepare(
        `SELECT * FROM personnel_licenses
	         WHERE personnel_id = ? AND license_number = ?
	         LIMIT 1`
      )
      .get(String(personnel.id), licenseNumber) as SqlRow | undefined;
    if (!license) {
      throw authorizationError(
        'COMPANY_AUTHORIZATION_LICENCE_MISMATCH',
        'Selected licence was not found for this actor.',
        'Select a licence owned by the acting personnel record.'
      );
    }
    if (String(license.status) !== 'ACTIVE') {
      throw authorizationError(
        'COMPANY_AUTHORIZATION_LICENCE_MISMATCH',
        `Selected licence is ${String(license.status).toLowerCase()}.`,
        'Select an active licence for this maintenance action.'
      );
    }
    if (license.issue_date && String(license.issue_date) > releasedDate) {
      throw authorizationError(
        'COMPANY_AUTHORIZATION_LICENCE_MISMATCH',
        'Selected licence is not effective at the command timestamp.',
        'Select a licence that is valid on the action timestamp.'
      );
    }
    if (license.expiry_date && String(license.expiry_date) < releasedDate) {
      throw authorizationError(
        'COMPANY_AUTHORIZATION_LICENCE_MISMATCH',
        'Selected licence is expired at the command timestamp.',
        'Select an unexpired licence before retrying the maintenance command.'
      );
    }
    const aircraftScope = this.evaluateAircraftScope(
      String(personnel.id),
      aircraft,
      releasedDate,
      actor
    );
    const authorizations = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_company_authorizations
         WHERE personnel_id = ?
           AND license_id = ?
           AND license_number = ?
         ORDER BY status = 'ACTIVE' DESC, valid_until DESC, authorization_number`
      )
      .all(String(personnel.id), String(license.id), String(license.license_number)) as SqlRow[];
    if (!authorizations.length) {
      throw authorizationError(
        'COMPANY_AUTHORIZATION_REQUIRED',
        'This person has a valid licence but no PT AMA company authorization for this licence.'
      );
    }
    const actionMatches = authorizations.filter((authorization) =>
      jsonArray(authorization.permitted_actions_json).includes(action)
    );
    if (!actionMatches.length) {
      throw authorizationError(
        'COMPANY_AUTHORIZATION_ACTION_NOT_PERMITTED',
        'PT AMA authorization does not permit this maintenance action.',
        'Use a person with explicit PT AMA authorization for this action.'
      );
    }
    const activeMatches = actionMatches.filter(
      (authorization) => String(authorization.status) === 'ACTIVE'
    );
    if (!activeMatches.length) {
      throw authorizationError(
        'COMPANY_AUTHORIZATION_INACTIVE',
        'Matching PT AMA company authorization is inactive.',
        'Use an active PT AMA company authorization before retrying.'
      );
    }
    const timeMatches = activeMatches.filter(
      (authorization) =>
        String(authorization.valid_from) <= releasedDate &&
        String(authorization.valid_until) >= releasedDate
    );
    if (!timeMatches.length) {
      throw authorizationError(
        'COMPANY_AUTHORIZATION_EXPIRED',
        'Matching PT AMA company authorization is not valid at the action timestamp.',
        'Use an authorization whose validity covers the action timestamp.'
      );
    }
    const aircraftTargets = this.aircraftScopeTargets(aircraft);
    const matchedAuthorization = timeMatches.find((authorization) =>
      this.companyAuthorizationAircraftMatches(authorization, aircraftTargets)
    );
    if (!matchedAuthorization) {
      throw authorizationError(
        'COMPANY_AUTHORIZATION_AIRCRAFT_SCOPE_MISMATCH',
        'PT AMA authorization does not match this aircraft type or registration.',
        'Use a person authorized by PT AMA for the selected aircraft scope.'
      );
    }
    return {
      basis: companyAuthorizationVerified,
      actorUserId: actor.userId,
      actorRole: actor.role,
      personnelId: String(personnel.id),
      personnelName: String(personnel.full_name),
      licenseId: String(license.id),
      licenseType: String(license.license_type),
      licenseNumber: String(license.license_number),
      licenseStatus: String(license.status),
      licenseExpiryDate: nullableText(license.expiry_date),
      releasedAt: effectiveAt,
      aircraftId,
      aircraftRegistrationNumber: String(aircraft.registration_number),
      aircraftType: String(aircraft.aircraft_type),
      aircraftModel: String(aircraft.model),
      companyAuthorizationValidated: true,
      companyAuthorizationId: String(matchedAuthorization.id),
      companyAuthorizationNumber: String(matchedAuthorization.authorization_number),
      permittedAction: action,
      companyAuthorizationStatus: String(matchedAuthorization.status),
      companyAuthorizationValidFrom: String(matchedAuthorization.valid_from),
      companyAuthorizationValidUntil: String(matchedAuthorization.valid_until),
      companyAuthorizationBlocker: null,
      authorizationEvaluationAt: now(),
      commandCorrelationId: actor.requestId ?? null,
      aircraftScope
    };
  }

  private companyAuthorizationError(
    actor: MaintenanceActor,
    aircraftId: string,
    code: string,
    reason: string,
    requiredAction = 'Select a person, licence, and PT AMA authorization that match this maintenance action and aircraft.'
  ) {
    return maintenanceError(code, 'PT AMA authorization required', 422, {
      impact: 'The controlled maintenance action was not recorded.',
      requiredAction,
      referenceId: aircraftId,
      actorUserId: actor.userId,
      reason
    });
  }

  private evaluateAircraftScope(
    personnelId: string,
    aircraft: SqlRow,
    releasedDate: string,
    actor: MaintenanceActor
  ): SignerAuthorizationSnapshot['aircraftScope'] {
    const rows = this.sqlite
      .prepare(
        `SELECT * FROM personnel_qualifications
		         WHERE personnel_id = ?`
      )
      .all(personnelId) as SqlRow[];
    const scopedRows = rows.filter((row) =>
      this.isAircraftScopeQualification(
        String(row.qualification_type),
        nullableText(row.reference_type)
      )
    );
    if (!scopedRows.length) {
      return {
        registryAvailable: true,
        enforced: false,
        matchedQualificationId: null,
        reason: 'No aircraft/type/rating scope record exists for this personnel record.'
      };
    }
    const currentScopedRows = scopedRows.filter(
      (row) =>
        ['VALID', 'EXPIRING_SOON'].includes(String(row.status)) &&
        (!row.issued_at || String(row.issued_at) <= releasedDate) &&
        (!row.expires_at || String(row.expires_at) >= releasedDate)
    );
    if (!currentScopedRows.length) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_AIRCRAFT_SCOPE_INVALID',
        'Existing aircraft/type/rating scope is not valid at releasedAt.',
        422,
        {
          impact: 'Technical release was not issued and aircraft readiness was not changed.',
          requiredAction:
            'Refresh or reinstate the signer aircraft/type/rating qualification before release.',
          referenceId: String(aircraft.id),
          actorUserId: actor.userId
        }
      );
    }
    const aircraftTargets = [
      String(aircraft.id),
      String(aircraft.registration_number),
      String(aircraft.aircraft_type),
      String(aircraft.model),
      nullableText(aircraft.fleet_code)
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => this.normalizeScopeToken(value));
    const match = currentScopedRows.find((row) => {
      const referenceId = nullableText(row.reference_id);
      return referenceId ? aircraftTargets.includes(this.normalizeScopeToken(referenceId)) : false;
    });
    if (!match) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_AIRCRAFT_SCOPE_INVALID',
        'Certifying signer does not hold an active aircraft/type/rating scope for this aircraft.',
        422,
        {
          impact: 'Technical release was not issued and aircraft readiness was not changed.',
          requiredAction:
            'Use a signer whose personnel qualification scope matches this aircraft/type/rating.',
          referenceId: String(aircraft.id),
          actorUserId: actor.userId
        }
      );
    }
    return {
      registryAvailable: true,
      enforced: true,
      matchedQualificationId: String(match.id),
      reason: 'Existing personnel qualification scope matched the aircraft/type/rating.'
    };
  }

  private isAircraftScopeQualification(qualificationType: string, referenceType: string | null) {
    const type = this.normalizeScopeToken(qualificationType);
    const reference = referenceType ? this.normalizeScopeToken(referenceType) : '';
    const value = `${type}:${reference}`;
    return (
      value.includes('AIRCRAFT') ||
      value.includes('TYPE_RATING') ||
      value.includes('AIRFRAME') ||
      value.includes('MODEL') ||
      value.includes('FLEET')
    );
  }

  private normalizeScopeToken(value: string) {
    return value
      .trim()
      .toUpperCase()
      .replaceAll(/[^A-Z0-9]+/gu, '');
  }

  private aircraftScopeTargets(aircraft: SqlRow) {
    return [
      String(aircraft.id),
      String(aircraft.registration_number),
      String(aircraft.aircraft_type),
      String(aircraft.model),
      nullableText(aircraft.fleet_code)
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => this.normalizeScopeToken(value));
  }

  private companyAuthorizationAircraftMatches(authorization: SqlRow, aircraftTargets: string[]) {
    const registrationScope = jsonArray(authorization.aircraft_registration_scope_json).map(
      (item) => this.normalizeScopeToken(item)
    );
    if (registrationScope.length) {
      return registrationScope.some((item) => aircraftTargets.includes(item));
    }
    const typeScope = jsonArray(authorization.aircraft_type_scope_json).map((item) =>
      this.normalizeScopeToken(item)
    );
    return typeScope.length ? typeScope.some((item) => aircraftTargets.includes(item)) : false;
  }

  private assertNoOpenReworkFindings(workPackageId: string) {
    const rows = this.sqlite
      .prepare(
        `SELECT finding_number, status
	         FROM maintenance_non_routine_findings
	         WHERE work_package_id = ? AND status IN ('OPEN', 'ADDED_TO_SCOPE')`
      )
      .all(workPackageId) as Array<{ finding_number: string; status: string }>;
    if (rows.length) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_REWORK_OPEN',
        'Work package has open non-routine/rework findings.',
        422,
        {
          impact: 'Technical release was not issued and aircraft readiness was not changed.',
          requiredAction: 'Close or explicitly defer all rework findings before release.',
          referenceId: workPackageId,
          findings: rows
        }
      );
    }
  }

  private assertLinkedRestrictedReleaseCurrent(
    workPackage: SqlRow,
    input: MaintenanceReleaseInput
  ) {
    if (
      input.resultingStatus !== 'SERVICEABLE_WITH_RESTRICTIONS' ||
      !workPackage.primary_defect_id
    ) {
      return;
    }
    const active = this.sqlite
      .prepare(
        `SELECT 1 FROM aircraft_deferments
	         WHERE aircraft_id = ? AND defect_id = ? AND status = 'ACTIVE'
	           AND effective_at <= ? AND expires_at > ?
	         LIMIT 1`
      )
      .get(
        String(workPackage.aircraft_id),
        String(workPackage.primary_defect_id),
        input.releasedAt,
        input.releasedAt
      );
    if (!active) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_LINKED_DEFERMENT_EXPIRED',
        'Linked restricted release defect has no active deferment at releasedAt.',
        422,
        {
          impact: 'Technical release was not issued and aircraft readiness was not changed.',
          requiredAction:
            'Create or refresh the linked MEL/CDL deferment before restricted release.',
          referenceId: String(workPackage.primary_defect_id)
        }
      );
    }
  }

  private releaseEligibleRequirementIds(workPackageId: string) {
    const rows = this.sqlite
      .prepare(
        `SELECT link.requirement_id, requirement.aircraft_id AS requirement_aircraft_id,
		                requirement.status AS requirement_status,
		                package.aircraft_id AS package_aircraft_id, card.card_number,
		                card.mandatory_flag, card.requires_independent_inspection, card.status AS card_status
	         FROM maintenance_work_package_requirement_links link
	         JOIN maintenance_work_packages package ON package.id = link.work_package_id
	         JOIN aircraft_maintenance_requirements requirement ON requirement.id = link.requirement_id
	         JOIN maintenance_job_cards card ON card.id = link.job_card_id
	         WHERE link.work_package_id = ?`
      )
      .all(workPackageId) as Array<{
      requirement_id: string;
      requirement_aircraft_id: string;
      requirement_status: string;
      package_aircraft_id: string;
      card_number: string;
      mandatory_flag: number;
      requires_independent_inspection: number;
      card_status: string;
    }>;
    const invalid = rows.filter(
      (row) =>
        row.requirement_aircraft_id !== row.package_aircraft_id ||
        row.requirement_status !== 'ACTIVE' ||
        !number(row.mandatory_flag) ||
        row.card_status !== 'READY_FOR_RELEASE_REVIEW'
    );
    if (invalid.length) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_REQUIREMENT_SCOPE_INVALID',
        'Linked maintenance requirements must be active, belong to this aircraft, and completed through mandatory job cards.',
        422,
        {
          impact: 'Technical release was not issued and aircraft readiness was not changed.',
          requiredAction:
            'Link only active requirements to completed mandatory job cards in the same work package.',
          referenceId: workPackageId,
          requirementLinks: invalid
        }
      );
    }
    return [...new Set(rows.map((row) => row.requirement_id))];
  }

  private fleetStatusSummaries(): MaintenanceAircraftStatusSummaryDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT aircraft.*, station.station_code AS current_station_code,
                active_wp.id AS active_work_package_id,
                active_wp.package_number AS active_work_package_number
         FROM aircraft
         LEFT JOIN stations station ON station.id = aircraft.current_station_id
         LEFT JOIN maintenance_work_packages active_wp
           ON active_wp.aircraft_id = aircraft.id
          AND active_wp.status IN ('OPEN', 'IN_PROGRESS', 'READY_FOR_RELEASE')
         WHERE aircraft.is_active = 1
         ORDER BY aircraft.registration_number`
      )
      .all() as SqlRow[];
    return rows.map((row) => {
      const detail = this.airworthiness.detail(String(row.id)).aircraft;
      return {
        aircraftId: String(row.id),
        registrationNumber: String(row.registration_number),
        aircraftType: String(row.aircraft_type),
        model: String(row.model),
        currentStationCode: nullableText(row.current_station_code),
        operationalStatus: String(row.operational_status),
        serviceabilityStatus: String(detail.serviceabilityStatus),
        technicalEligibility: detail.technicalEligibility,
        maintenanceDue: detail.maintenanceDue,
        dueReasons: detail.dueReasons,
        openDefectCount: detail.openDefectCount,
        activeRestrictionCount: detail.activeRestrictionCount,
        activeWorkPackageId: nullableText(row.active_work_package_id),
        activeWorkPackageNumber: nullableText(row.active_work_package_number),
        updatedAt: String(row.updated_at)
      };
    });
  }

  private defectSummaries(
    options: {
      aircraftId?: string;
      onlyOpen?: boolean;
      onlyUnlinked?: boolean;
      onlyPackageEligible?: boolean;
    } = {}
  ): MaintenanceDefectSummaryDto[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (options.aircraftId) {
      where.push('defect.aircraft_id = ?');
      params.push(options.aircraftId);
    }
    if (options.onlyOpen) {
      where.push("defect.status IN ('OPEN', 'DEFERRED')");
    }
    if (options.onlyUnlinked) {
      where.push(`NOT EXISTS (
        SELECT 1 FROM maintenance_work_packages linked
        WHERE linked.primary_defect_id = defect.id
          AND linked.status <> 'CANCELLED'
      )`);
    }
    if (options.onlyPackageEligible) {
      where.push("assessment.assessment_decision IN ('GROUND', 'DEFER')");
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = this.sqlite
      .prepare(
        `SELECT defect.*, aircraft.registration_number AS aircraft_registration_number,
                assessment.assessment_decision, assessment.assessment_note,
                flight.id AS derived_source_flight_id,
                flight.flight_number AS derived_source_flight_number,
                active_wp.id AS active_work_package_id,
                active_wp.package_number AS active_work_package_number
         FROM aircraft_defects defect
         JOIN aircraft ON aircraft.id = defect.aircraft_id
         LEFT JOIN maintenance_defect_assessments assessment ON assessment.defect_id = defect.id
         LEFT JOIN flight_operations flight
           ON flight.id = defect.source_reference OR flight.flight_number = defect.source_reference
         LEFT JOIN maintenance_work_packages active_wp
           ON active_wp.primary_defect_id = defect.id
          AND active_wp.status IN ('OPEN', 'IN_PROGRESS', 'READY_FOR_RELEASE')
         ${whereSql}
         ORDER BY defect.updated_at DESC, defect.detected_at DESC`
      )
      .all(...params) as SqlRow[];
    return rows.map((row) => this.toDefectSummaryDto(row));
  }

  private toDefectSummaryDto(row: SqlRow): MaintenanceDefectSummaryDto {
    return {
      id: String(row.id),
      aircraftId: String(row.aircraft_id),
      aircraftRegistrationNumber: String(row.aircraft_registration_number),
      defectNumber: String(row.defect_number),
      title: String(row.title),
      description: String(row.description),
      status: String(row.status) as MaintenanceDefectSummaryDto['status'],
      detectedAt: String(row.detected_at),
      sourceReference: nullableText(row.source_reference),
      derivedSourceFlightId: nullableText(row.derived_source_flight_id),
      derivedSourceFlightNumber: nullableText(row.derived_source_flight_number),
      assessmentDecision: nullableText(
        row.assessment_decision
      ) as MaintenanceDefectSummaryDto['assessmentDecision'],
      assessmentNote: nullableText(row.assessment_note),
      activeWorkPackageId: nullableText(row.active_work_package_id),
      activeWorkPackageNumber: nullableText(row.active_work_package_number),
      updatedAt: String(row.updated_at)
    };
  }

  private technicalReleaseSummaries(limit = 50): MaintenanceTechnicalReleaseSummaryDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT release.*, aircraft.registration_number AS aircraft_registration_number
         FROM aircraft_maintenance_releases release
         JOIN aircraft ON aircraft.id = release.aircraft_id
         ORDER BY release.released_at DESC
         LIMIT ?`
      )
      .all(limit) as SqlRow[];
    return rows.map((row) => this.toTechnicalReleaseSummaryDto(row));
  }

  private toTechnicalReleaseSummaryDto(row: SqlRow): MaintenanceTechnicalReleaseSummaryDto {
    return {
      id: String(row.id),
      aircraftId: String(row.aircraft_id),
      aircraftRegistrationNumber: String(row.aircraft_registration_number),
      releaseNumber: String(row.release_number),
      resultingStatus: String(
        row.resulting_status
      ) as MaintenanceTechnicalReleaseSummaryDto['resultingStatus'],
      workOrderReference: String(row.work_order_reference),
      certifyingUserId: String(row.certifying_user_id),
      certifyingLicenseNumber: String(row.certifying_license_number),
      releasedAt: String(row.released_at),
      evidenceReferences: jsonArray(row.evidence_references),
      defectIds: jsonArray(row.defect_ids),
      signerAuthorizationSnapshot: jsonObject(row.signer_authorization_snapshot_json)
    };
  }

  private toCompanyAuthorizationDto(row: SqlRow): MaintenanceCompanyAuthorizationDto {
    return {
      id: String(row.id),
      authorizationNumber: String(row.authorization_number),
      personnelId: String(row.personnel_id),
      personnelName: String(row.personnel_name),
      actorUserId: nullableText(row.actor_user_id),
      licenseId: String(row.license_id),
      licenseNumber: String(row.license_number),
      licenseType: String(row.license_type),
      status: String(row.status) as MaintenanceCompanyAuthorizationDto['status'],
      validFrom: String(row.valid_from),
      validUntil: String(row.valid_until),
      permittedActions: jsonArray(
        row.permitted_actions_json
      ) as MaintenanceCompanyAuthorizationDto['permittedActions'],
      aircraftTypeScope: jsonArray(row.aircraft_type_scope_json),
      aircraftRegistrationScope: jsonArray(row.aircraft_registration_scope_json),
      notes: nullableText(row.notes),
      issuedBy: nullableText(row.issued_by),
      version: number(row.version),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private requirementScope(workPackageId: string): MaintenanceRequirementScopeDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT requirement.id AS requirement_id, requirement.requirement_code,
                requirement.title, requirement.status, requirement.due_at,
                requirement.due_airframe_hours, requirement.due_airframe_cycles,
                card.id AS job_card_id, card.card_number
         FROM maintenance_work_package_requirement_links link
         JOIN aircraft_maintenance_requirements requirement ON requirement.id = link.requirement_id
         JOIN maintenance_job_cards card ON card.id = link.job_card_id
         WHERE link.work_package_id = ?
         ORDER BY requirement.due_at, requirement.requirement_code`
      )
      .all(workPackageId) as SqlRow[];
    return rows.map((row) => ({
      requirementId: String(row.requirement_id),
      requirementCode: String(row.requirement_code),
      title: String(row.title),
      status: String(row.status) as MaintenanceRequirementScopeDto['status'],
      dueAt: nullableText(row.due_at),
      dueAirframeHours: row.due_airframe_hours === null ? null : number(row.due_airframe_hours),
      dueAirframeCycles: row.due_airframe_cycles === null ? null : number(row.due_airframe_cycles),
      jobCardId: String(row.job_card_id),
      jobCardNumber: String(row.card_number)
    }));
  }

  private auditRecords(
    entityType?: string,
    entityId?: string,
    limit = 20
  ): MaintenanceAuditRecordDto[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (entityType) {
      where.push('entity_type = ?');
      params.push(entityType);
    }
    if (entityId) {
      where.push('entity_id = ?');
      params.push(entityId);
    }
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_audit_logs
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY occurred_at DESC
         LIMIT ?`
      )
      .all(...params, limit) as SqlRow[];
    return rows.map((row) => this.toAuditRecordDto(row));
  }

  private toAuditRecordDto(row: SqlRow): MaintenanceAuditRecordDto {
    return {
      id: String(row.id),
      entityType: String(row.entity_type),
      entityId: String(row.entity_id),
      action: String(row.action),
      actorUserId: String(row.actor_user_id),
      actorRole: String(row.actor_role),
      requestId: nullableText(row.request_id),
      beforeVersion: row.before_version === null ? null : number(row.before_version),
      afterVersion: row.after_version === null ? null : number(row.after_version),
      metadata: jsonObject(row.metadata_json) ?? {},
      occurredAt: String(row.occurred_at)
    };
  }

  private auditScope(query: MaintenanceAuditListQuery): {
    empty: boolean;
    where: string;
    params: unknown[];
  } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (query.package) {
      const workPackage = this.sqlite
        .prepare(
          `SELECT id, aircraft_id, primary_defect_id
           FROM maintenance_work_packages
           WHERE id = ? OR package_number = ?
           LIMIT 1`
        )
        .get(query.package, query.package) as SqlRow | undefined;
      if (!workPackage) return { empty: true, where: '', params: [] };
      const packageId = String(workPackage.id);
      const packageClauses = ['(entity_type = ? AND entity_id = ?)'];
      params.push('WORK_PACKAGE', packageId);
      const jobCardIds = this.sqlite
        .prepare('SELECT id FROM maintenance_job_cards WHERE work_package_id = ?')
        .all(packageId) as Array<{ id: string }>;
      if (jobCardIds.length) {
        packageClauses.push(
          `(entity_type = 'JOB_CARD' AND entity_id IN (${jobCardIds.map(() => '?').join(',')}))`
        );
        params.push(...jobCardIds.map((row) => row.id));
        const attemptIds = this.sqlite
          .prepare(
            `SELECT id FROM maintenance_inspection_attempts
             WHERE job_card_id IN (${jobCardIds.map(() => '?').join(',')})`
          )
          .all(...jobCardIds.map((row) => row.id)) as Array<{ id: string }>;
        if (attemptIds.length) {
          packageClauses.push(
            `(entity_type = 'INSPECTION_ATTEMPT' AND entity_id IN (${attemptIds.map(() => '?').join(',')}))`
          );
          params.push(...attemptIds.map((row) => row.id));
        }
        const reworkIds = this.sqlite
          .prepare(
            `SELECT id FROM maintenance_rework_actions
             WHERE job_card_id IN (${jobCardIds.map(() => '?').join(',')})`
          )
          .all(...jobCardIds.map((row) => row.id)) as Array<{ id: string }>;
        if (reworkIds.length) {
          packageClauses.push(
            `(entity_type = 'REWORK_ACTION' AND entity_id IN (${reworkIds.map(() => '?').join(',')}))`
          );
          params.push(...reworkIds.map((row) => row.id));
        }
      }
      const defectId = nullableText(workPackage.primary_defect_id);
      if (defectId) {
        packageClauses.push("(entity_type = 'DEFECT' AND entity_id = ?)");
        params.push(defectId);
      }
      clauses.push(`(${packageClauses.join(' OR ')})`);
    }
    if (query.aircraft) {
      const aircraft = this.sqlite
        .prepare(
          `SELECT id
           FROM aircraft
           WHERE id = ? OR registration_number = ?
           LIMIT 1`
        )
        .get(query.aircraft, query.aircraft) as SqlRow | undefined;
      if (!aircraft) return { empty: true, where: '', params: [] };
      const entityRefs = this.auditEntityReferencesForAircraft(String(aircraft.id));
      if (!entityRefs.length) return { empty: true, where: '', params: [] };
      clauses.push(`(${entityRefs.map(() => '(entity_type = ? AND entity_id = ?)').join(' OR ')})`);
      for (const ref of entityRefs) params.push(ref.entityType, ref.entityId);
    }
    return {
      empty: false,
      where: clauses.join(' AND '),
      params
    };
  }

  private auditEntityReferencesForAircraft(aircraftId: string) {
    const refs: Array<{ entityType: string; entityId: string }> = [];
    const workPackages = this.sqlite
      .prepare(
        `SELECT id, primary_defect_id
         FROM maintenance_work_packages
         WHERE aircraft_id = ?`
      )
      .all(aircraftId) as SqlRow[];
    for (const row of workPackages) {
      refs.push({ entityType: 'WORK_PACKAGE', entityId: String(row.id) });
      const defectId = nullableText(row.primary_defect_id);
      if (defectId) refs.push({ entityType: 'DEFECT', entityId: defectId });
    }
    const defects = this.sqlite
      .prepare('SELECT id FROM aircraft_defects WHERE aircraft_id = ?')
      .all(aircraftId) as SqlRow[];
    for (const row of defects) refs.push({ entityType: 'DEFECT', entityId: String(row.id) });
    const jobCards = this.sqlite
      .prepare(
        `SELECT card.id
         FROM maintenance_job_cards card
         JOIN maintenance_work_packages wp ON wp.id = card.work_package_id
         WHERE wp.aircraft_id = ?`
      )
      .all(aircraftId) as SqlRow[];
    for (const row of jobCards) refs.push({ entityType: 'JOB_CARD', entityId: String(row.id) });
    const attempts = this.sqlite
      .prepare(
        `SELECT attempt.id
         FROM maintenance_inspection_attempts attempt
         JOIN maintenance_work_packages wp ON wp.id = attempt.work_package_id
         WHERE wp.aircraft_id = ?`
      )
      .all(aircraftId) as SqlRow[];
    for (const row of attempts)
      refs.push({ entityType: 'INSPECTION_ATTEMPT', entityId: String(row.id) });
    const reworkActions = this.sqlite
      .prepare(
        `SELECT rework.id
         FROM maintenance_rework_actions rework
         JOIN maintenance_work_packages wp ON wp.id = rework.work_package_id
         WHERE wp.aircraft_id = ?`
      )
      .all(aircraftId) as SqlRow[];
    for (const row of reworkActions)
      refs.push({ entityType: 'REWORK_ACTION', entityId: String(row.id) });
    return refs.filter(
      (ref, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.entityType === ref.entityType && candidate.entityId === ref.entityId
        ) === index
    );
  }

  private releaseBlockersForPackage(workPackageId: string): MaintenanceDomainBlockerDto[] {
    const blockers: MaintenanceDomainBlockerDto[] = [];
    const scope = this.requirementScope(workPackageId);
    const mandatoryRows = this.sqlite
      .prepare(
        `SELECT card.*, mechanic.id AS mechanic_signoff_id,
                mechanic.evidence_references AS mechanic_evidence,
                inspection.id AS inspection_signoff_id,
                inspection.evidence_references AS inspection_evidence
         FROM maintenance_job_cards card
         LEFT JOIN maintenance_job_card_signoffs mechanic
           ON mechanic.job_card_id = card.id
          AND mechanic.signoff_type = 'MECHANIC'
          AND mechanic.decision = 'COMPLETED'
         LEFT JOIN maintenance_job_card_signoffs inspection
           ON inspection.job_card_id = card.id
          AND inspection.signoff_type = 'INDEPENDENT_INSPECTION'
          AND inspection.decision = 'PASSED'
         WHERE card.work_package_id = ? AND card.mandatory_flag = 1`
      )
      .all(workPackageId) as SqlRow[];
    if (!mandatoryRows.length) {
      blockers.push(this.blocker('MAINTENANCE_RELEASE_JOB_CARD_REQUIRED', workPackageId));
    }
    for (const row of mandatoryRows) {
      if (
        !String(row.maintenance_data_ref).trim() ||
        !String(row.maintenance_data_revision).trim()
      ) {
        blockers.push(this.blocker('MAINTENANCE_RELEASE_APPROVED_DATA_REQUIRED', String(row.id)));
      }
      if (String(row.status) !== 'READY_FOR_RELEASE_REVIEW') {
        blockers.push(this.blocker('MAINTENANCE_RELEASE_INCOMPLETE_JOB_CARDS', String(row.id)));
      }
      if (!row.mechanic_signoff_id || !jsonArray(row.mechanic_evidence).length) {
        blockers.push(
          this.blocker('MAINTENANCE_RELEASE_MECHANIC_EVIDENCE_REQUIRED', String(row.id))
        );
      }
      if (
        number(row.requires_independent_inspection) &&
        (!row.inspection_signoff_id || !jsonArray(row.inspection_evidence).length)
      ) {
        blockers.push(this.blocker('MAINTENANCE_RELEASE_INSPECTION_REQUIRED', String(row.id)));
      }
    }
    const reworkRows = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_rework_actions
         WHERE work_package_id = ?
           AND status NOT IN ('REINSPECTION_PASSED', 'REINSPECTION_FAILED', 'CANCELLED')`
      )
      .all(workPackageId) as SqlRow[];
    for (const row of reworkRows) {
      if (String(row.status) === 'REWORK_REQUIRED') {
        blockers.push(this.blocker('MAINTENANCE_RELEASE_REWORK_REQUIRED', String(row.id)));
      }
      if (String(row.status) === 'CORRECTIVE_WORK_IN_PROGRESS') {
        blockers.push(this.blocker('MAINTENANCE_RELEASE_REWORK_SIGNOFF_REQUIRED', String(row.id)));
      }
      if (!nullableText(row.mechanic_signoff_at)) {
        blockers.push(this.blocker('MAINTENANCE_RELEASE_REWORK_UNSIGNED', String(row.id)));
      }
      if (!String(row.approved_data_ref ?? '').trim()) {
        blockers.push(
          this.blocker('MAINTENANCE_RELEASE_REWORK_APPROVED_DATA_REQUIRED', String(row.id))
        );
      }
      if (String(row.status) === 'AWAITING_REINSPECTION') {
        blockers.push(this.blocker('MAINTENANCE_RELEASE_REINSPECTION_REQUIRED', String(row.id)));
      }
    }
    for (const requirement of scope) {
      if (requirement.status !== 'ACTIVE') {
        blockers.push(
          this.blocker('MAINTENANCE_RELEASE_REQUIREMENT_SCOPE_INVALID', requirement.requirementId)
        );
      }
    }
    return blockers;
  }

  private blocker(code: string, referenceId: string): MaintenanceDomainBlockerDto {
    const catalog: Record<string, Omit<MaintenanceDomainBlockerDto, 'code' | 'referenceId'>> = {
      MAINTENANCE_RELEASE_JOB_CARD_REQUIRED: {
        message: 'At least one mandatory job card is required.',
        impact: 'Technical release cannot proceed.',
        requiredAction: 'Add a mandatory job card with approved maintenance data.'
      },
      MAINTENANCE_RELEASE_APPROVED_DATA_REQUIRED: {
        message: 'Approved maintenance data reference is missing.',
        impact: 'Technical release cannot proceed.',
        requiredAction: 'Record the approved data reference and revision snapshot.'
      },
      MAINTENANCE_RELEASE_INCOMPLETE_JOB_CARDS: {
        message: 'Mandatory job card is not ready for release review.',
        impact: 'Technical release cannot proceed.',
        requiredAction: 'Complete the mechanic work and required inspection.'
      },
      MAINTENANCE_RELEASE_MECHANIC_EVIDENCE_REQUIRED: {
        message: 'Mechanic sign-off evidence is missing.',
        impact: 'Technical release cannot proceed.',
        requiredAction: 'Attach immutable evidence to the mechanic sign-off.'
      },
      MAINTENANCE_RELEASE_INSPECTION_REQUIRED: {
        message: 'Independent inspection is required.',
        impact: 'Technical release cannot proceed.',
        requiredAction: 'Complete independent inspection with evidence.'
      },
      MAINTENANCE_RELEASE_REQUIREMENT_SCOPE_INVALID: {
        message: 'Linked maintenance requirement is no longer active.',
        impact: 'Technical release cannot comply this scoped requirement.',
        requiredAction: 'Refresh the package scope and select only active linked requirements.'
      },
      MAINTENANCE_RELEASE_REWORK_REQUIRED: {
        message: 'Failed inspection created a rework action.',
        impact: 'Technical release is blocked.',
        requiredAction: 'Complete corrective work and submit the required re-inspection.'
      },
      MAINTENANCE_RELEASE_REWORK_SIGNOFF_REQUIRED: {
        message: 'Corrective work is still in progress.',
        impact: 'Technical release is blocked.',
        requiredAction: 'Complete corrective work sign-off with approved data.'
      },
      MAINTENANCE_RELEASE_REWORK_UNSIGNED: {
        message: 'Corrective work is not signed.',
        impact: 'Technical release is blocked.',
        requiredAction: 'Record mechanic sign-off for the corrective work.'
      },
      MAINTENANCE_RELEASE_REWORK_APPROVED_DATA_REQUIRED: {
        message: 'Corrective-work approved data reference is missing.',
        impact: 'Technical release is blocked.',
        requiredAction: 'Record the approved data reference used for corrective work.'
      },
      MAINTENANCE_RELEASE_REINSPECTION_REQUIRED: {
        message: 'Required re-inspection has not passed.',
        impact: 'Technical release is blocked.',
        requiredAction: 'Complete independent re-inspection after corrective work sign-off.'
      }
    };
    const entry = catalog[code] ?? {
      message: 'Release prerequisite is not satisfied.',
      impact: 'Technical release cannot proceed.',
      requiredAction: 'Refresh the work package and resolve the blocker.'
    };
    return { code, referenceId, ...entry };
  }

  private releaseChecklist(workPackageId: string): MaintenanceWorkPackageDto['releaseChecklist'] {
    const blockers = this.releaseBlockersForPackage(workPackageId);
    return {
      mandatoryWorkComplete: !blockers.some((item) =>
        [
          'MAINTENANCE_RELEASE_JOB_CARD_REQUIRED',
          'MAINTENANCE_RELEASE_INCOMPLETE_JOB_CARDS'
        ].includes(item.code)
      ),
      independentInspectionsComplete: !blockers.some(
        (item) =>
          item.code === 'MAINTENANCE_RELEASE_INSPECTION_REQUIRED' ||
          item.code === 'MAINTENANCE_RELEASE_REINSPECTION_REQUIRED'
      ),
      approvedDataAvailable: !blockers.some(
        (item) =>
          item.code === 'MAINTENANCE_RELEASE_APPROVED_DATA_REQUIRED' ||
          item.code === 'MAINTENANCE_RELEASE_REWORK_APPROVED_DATA_REQUIRED'
      ),
      mechanicEvidenceComplete: !blockers.some(
        (item) =>
          item.code === 'MAINTENANCE_RELEASE_MECHANIC_EVIDENCE_REQUIRED' ||
          item.code === 'MAINTENANCE_RELEASE_REWORK_UNSIGNED' ||
          item.code === 'MAINTENANCE_RELEASE_REWORK_SIGNOFF_REQUIRED'
      ),
      requirementScopeValid: !blockers.some(
        (item) => item.code === 'MAINTENANCE_RELEASE_REQUIREMENT_SCOPE_INVALID'
      ),
      blockers
    };
  }

  private jobCardOperationalRows(statuses: MaintenanceJobCardStatus[]) {
    const placeholders = statuses.map(() => '?').join(',');
    const rows = this.sqlite
      .prepare(
        `SELECT card.*, wp.package_number, wp.title AS work_package_title,
                aircraft.registration_number AS aircraft_registration_number
         FROM maintenance_job_cards card
         JOIN maintenance_work_packages wp ON wp.id = card.work_package_id
         JOIN aircraft ON aircraft.id = wp.aircraft_id
         WHERE card.status IN (${placeholders})
           AND wp.status IN ('OPEN', 'IN_PROGRESS', 'READY_FOR_RELEASE')
         ORDER BY card.updated_at DESC`
      )
      .all(...statuses) as SqlRow[];
    return rows.map((row) => ({
      ...this.toJobCardDto(row),
      packageNumber: String(row.package_number),
      workPackageTitle: String(row.work_package_title),
      aircraftRegistrationNumber: String(row.aircraft_registration_number)
    }));
  }

  private operationalAttention(
    fleet: MaintenanceAircraftStatusSummaryDto[],
    defects: MaintenanceDefectSummaryDto[],
    workPackages: MaintenanceWorkPackageDto[],
    releaseBlockers: MaintenanceCommandCenterDto['releaseBlockers']
  ): MaintenanceOperationalAttentionDto[] {
    const byAircraft = new Map(workPackages.map((item) => [item.aircraftId, item]));
    const blockerByPackage = new Map(
      releaseBlockers.map((item) => [item.workPackageId, item.blockers[0]?.message ?? ''])
    );
    return fleet
      .filter(
        (aircraft) =>
          aircraft.technicalEligibility !== 'ELIGIBLE' ||
          aircraft.activeWorkPackageId ||
          aircraft.openDefectCount > 0 ||
          aircraft.maintenanceDue
      )
      .map((aircraft) => {
        const defect = defects.find((item) => item.aircraftId === aircraft.aircraftId);
        const activePackage = aircraft.activeWorkPackageId
          ? byAircraft.get(aircraft.aircraftId)
          : undefined;
        const dueItem = aircraft.dueReasons[0] ?? null;
        const blocker =
          (activePackage ? blockerByPackage.get(activePackage.id) : null) ??
          defect?.assessmentDecision ??
          dueItem ??
          'Review technical state';
        return {
          aircraftId: aircraft.aircraftId,
          aircraftRegistrationNumber: aircraft.registrationNumber,
          technicalState: aircraft.serviceabilityStatus,
          defectOrDueItem: defect?.title ?? dueItem ?? 'Technical status review',
          activePackageId: activePackage?.id ?? aircraft.activeWorkPackageId,
          activePackageNumber: activePackage?.packageNumber ?? aircraft.activeWorkPackageNumber,
          currentStage: activePackage?.status.replaceAll('_', ' ') ?? 'Aircraft technical profile',
          blocker,
          requiredAction: activePackage
            ? 'Open the package and complete the next maintenance control action.'
            : 'Review aircraft technical profile and create or update maintenance control record.',
          owner: activePackage
            ? activePackage.status === 'READY_FOR_RELEASE'
              ? 'Certifying Staff'
              : 'Maintenance Control'
            : 'Maintenance Control',
          updatedAt: activePackage?.updatedAt ?? defect?.updatedAt ?? aircraft.updatedAt
        };
      });
  }

  private vendorOptions() {
    const rows = this.sqlite
      .prepare(
        `SELECT id, vendor_code, vendor_name
         FROM vendors
         WHERE is_active = 1
         ORDER BY vendor_name`
      )
      .all() as SqlRow[];
    return rows.map((row) => ({
      id: String(row.id),
      vendorCode: String(row.vendor_code),
      vendorName: String(row.vendor_name)
    }));
  }

  private signerLicenseOptions(
    actor: MaintenanceActor
  ): MaintenanceSelectorDataDto['signerLicenses'] {
    const personnel = this.sqlite
      .prepare(
        `SELECT *
         FROM crews
         WHERE (id = ? OR employee_code = ?)
           AND is_active = 1
           AND lifecycle_status = 'ACTIVE'
         LIMIT 1`
      )
      .get(actor.userId, actor.userId) as SqlRow | undefined;
    if (!personnel) return [];
    const today = dateOnly(now());
    const licenses = this.sqlite
      .prepare(
        `SELECT *
         FROM personnel_licenses
         WHERE personnel_id = ?
         ORDER BY status = 'ACTIVE' DESC, expiry_date DESC`
      )
      .all(String(personnel.id)) as SqlRow[];
    const scopeRows = this.sqlite
      .prepare(
        `SELECT *
         FROM personnel_qualifications
         WHERE personnel_id = ? AND qualification_type = 'AIRCRAFT_TYPE'
         ORDER BY reference_id`
      )
      .all(String(personnel.id)) as SqlRow[];
    const scopeSummary = scopeRows.length
      ? scopeRows
          .map((row) => `${String(row.reference_id ?? 'unspecified')} · ${String(row.status)}`)
          .join(', ')
      : 'No aircraft/type/rating scope record exists.';
    return licenses.map((row) => ({
      personnelId: String(personnel.id),
      personnelName: String(personnel.full_name),
      licenseId: String(row.id),
      licenseType: String(row.license_type),
      licenseNumber: String(row.license_number),
      status: String(row.status),
      issueDate: nullableText(row.issue_date),
      expiryDate: nullableText(row.expiry_date),
      isUsableNow:
        String(row.status) === 'ACTIVE' &&
        (!row.issue_date || String(row.issue_date) <= today) &&
        (!row.expiry_date || String(row.expiry_date) >= today),
      scopeSummary
    }));
  }

  private assertWorkPackageCreationContext(input: CreateMaintenanceWorkPackageInput) {
    const executionMode = input.executionMode ?? 'INTERNAL';
    this.requireAircraft(input.aircraftId);
    if (executionMode === 'INTERNAL' && input.vendorId) {
      throw maintenanceError(
        'MAINTENANCE_PACKAGE_VENDOR_NOT_ALLOWED_FOR_INTERNAL',
        'Internal maintenance execution cannot retain a maintenance provider.',
        422,
        {
          impact: 'Work package was not created.',
          requiredAction: 'Switch to external AMO/vendor execution or clear the selected provider.',
          referenceId: input.vendorId
        }
      );
    }
    if (executionMode === 'EXTERNAL_AMO_VENDOR' && !input.vendorId) {
      throw maintenanceError(
        'MAINTENANCE_PACKAGE_VENDOR_REQUIRED',
        'External AMO/vendor execution requires a maintenance provider.',
        422,
        {
          impact: 'Work package was not created.',
          requiredAction: 'Select an active maintenance provider or switch to internal execution.',
          referenceId: input.aircraftId
        }
      );
    }
    if (input.vendorId) this.requireVendor(input.vendorId);

    const sourceFlight = input.sourceFlightId ? this.requireFlight(input.sourceFlightId) : null;
    if (!input.primaryDefectId) return;

    const defect = this.requireDefect(input.primaryDefectId, input.aircraftId);
    if (!['OPEN', 'DEFERRED'].includes(String(defect.status))) {
      throw maintenanceError(
        'MAINTENANCE_PACKAGE_DEFECT_NOT_ELIGIBLE',
        'Selected defect is not open for work-package planning.',
        422,
        {
          impact: 'Work package was not created.',
          requiredAction: 'Select an open or deferred defect from the authoritative selector.',
          referenceId: input.primaryDefectId
        }
      );
    }

    const assessment = this.sqlite
      .prepare(
        `SELECT assessment_decision
         FROM maintenance_defect_assessments
         WHERE defect_id = ?
         LIMIT 1`
      )
      .get(input.primaryDefectId) as { assessment_decision: string } | undefined;
    if (!assessment) {
      throw maintenanceError(
        'MAINTENANCE_PACKAGE_DEFECT_ASSESSMENT_REQUIRED',
        'Selected defect must be assessed before work-package creation.',
        422,
        {
          impact: 'Work package was not created.',
          requiredAction: 'Maintenance Control/PPC must assess the defect before planning work.',
          referenceId: input.primaryDefectId
        }
      );
    }
    if (!['GROUND', 'DEFER'].includes(String(assessment.assessment_decision))) {
      throw maintenanceError(
        'MAINTENANCE_PACKAGE_DEFECT_NOT_ELIGIBLE',
        'Selected defect assessment does not require MRO package planning.',
        422,
        {
          impact: 'Work package was not created.',
          requiredAction: 'Select an assessed grounding or deferred defect.',
          referenceId: input.primaryDefectId
        }
      );
    }

    const existingPackage = this.sqlite
      .prepare(
        `SELECT id
         FROM maintenance_work_packages
         WHERE primary_defect_id = ?
           AND status <> 'CANCELLED'
         LIMIT 1`
      )
      .get(input.primaryDefectId) as { id: string } | undefined;
    if (existingPackage) {
      throw maintenanceError(
        'MAINTENANCE_PACKAGE_DEFECT_ALREADY_SCOPED',
        'Selected defect is already linked to an active work package.',
        409,
        {
          impact: 'Work package was not created.',
          requiredAction:
            'Open the existing package for this defect or cancel it before replanning.',
          referenceId: existingPackage.id
        }
      );
    }

    if (sourceFlight) {
      const sourceReference = nullableText(defect.source_reference);
      if (
        sourceReference !== input.sourceFlightId &&
        sourceReference !== String(sourceFlight.flight_number)
      ) {
        throw maintenanceError(
          'MAINTENANCE_PACKAGE_SOURCE_FLIGHT_MISMATCH',
          'Source flight must be derived from the selected defect.',
          422,
          {
            impact: 'Work package was not created.',
            requiredAction:
              'Refresh selector data and use the read-only source flight shown for the defect.',
            referenceId: input.primaryDefectId
          }
        );
      }
    }
  }

  private openReworkActionForJobCard(jobCardId: string) {
    return this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_rework_actions
         WHERE job_card_id = ?
           AND status IN ('REWORK_REQUIRED', 'CORRECTIVE_WORK_IN_PROGRESS', 'AWAITING_REINSPECTION')
         ORDER BY cycle_number DESC, created_at DESC
         LIMIT 1`
      )
      .get(jobCardId) as SqlRow | undefined;
  }

  private nextInspectionNumbers(jobCardId: string, openRework?: SqlRow) {
    const row = this.sqlite
      .prepare(
        `SELECT COALESCE(MAX(attempt_number), 0) AS attempt_number,
                COALESCE(MAX(cycle_number), 0) AS cycle_number
         FROM maintenance_inspection_attempts
         WHERE job_card_id = ?`
      )
      .get(jobCardId) as SqlRow;
    return {
      attemptNumber: number(row.attempt_number) + 1,
      cycleNumber: openRework
        ? number(openRework.cycle_number)
        : Math.max(1, number(row.cycle_number) + 1)
    };
  }

  private insertInspectionAttempt(
    card: SqlRow,
    workPackage: SqlRow,
    input: MaintenanceIndependentInspectionInput,
    actor: MaintenanceActor,
    authorizationSnapshot: SignerAuthorizationSnapshot,
    attemptNumber: number,
    cycleNumber: number
  ) {
    const id = `minsp-${nanoid(12)}`;
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_inspection_attempts (
          id, job_card_id, work_package_id, attempt_number, cycle_number, result, finding,
          inspector_user_id, inspector_role, inspector_license_number,
          inspector_license_snapshot_json, company_authorization_snapshot_json, package_version,
          inspected_at, idempotency_key, request_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        String(card.id),
        String(card.work_package_id),
        attemptNumber,
        cycleNumber,
        input.decision,
        input.statement,
        actor.userId,
        actor.role,
        input.certifyingLicenseNumber,
        JSON.stringify(authorizationSnapshot),
        JSON.stringify(authorizationSnapshot),
        number(workPackage.version),
        input.inspectedAt,
        input.idempotencyKey,
        actor.requestId ?? null,
        now()
      );
    return id;
  }

  private createReworkAction(
    workPackage: SqlRow,
    card: SqlRow,
    sourceInspectionAttemptId: string,
    cycleNumber: number,
    input: MaintenanceIndependentInspectionInput
  ) {
    const id = `mrework-${nanoid(12)}`;
    const reworkNumber = `${String(workPackage.package_number)}-RWK-${String(cycleNumber).padStart(2, '0')}`;
    const timestamp = now();
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_rework_actions (
          id, rework_number, work_package_id, job_card_id, source_inspection_attempt_id,
          cycle_number, finding, status, request_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'REWORK_REQUIRED', ?, ?, ?)`
      )
      .run(
        id,
        reworkNumber,
        String(workPackage.id),
        String(card.id),
        sourceInspectionAttemptId,
        cycleNumber,
        input.statement,
        input.idempotencyKey,
        timestamp,
        timestamp
      );
    return id;
  }

  private markReinspectionFailed(reworkActionId: string, attemptId: string) {
    this.sqlite
      .prepare(
        `UPDATE maintenance_rework_actions
         SET status = 'REINSPECTION_FAILED',
             reinspection_attempt_id = ?,
             updated_at = ?
         WHERE id = ? AND status = 'AWAITING_REINSPECTION'`
      )
      .run(attemptId, now(), reworkActionId);
  }

  private markReinspectionPassed(reworkActionId: string, attemptId: string) {
    this.sqlite
      .prepare(
        `UPDATE maintenance_rework_actions
         SET status = 'REINSPECTION_PASSED',
             reinspection_attempt_id = ?,
             updated_at = ?
         WHERE id = ? AND status = 'AWAITING_REINSPECTION'`
      )
      .run(attemptId, now(), reworkActionId);
  }

  private requireAircraft(id: string) {
    const row = this.sqlite.prepare('SELECT * FROM aircraft WHERE id = ?').get(id) as
      SqlRow | undefined;
    if (!row) throw new DomainError('AIRCRAFT_NOT_FOUND', 'Aircraft was not found.', 404);
    return row;
  }

  private requireFlight(id: string) {
    const row = this.sqlite
      .prepare('SELECT id, flight_number FROM flight_operations WHERE id = ?')
      .get(id) as { id: string; flight_number: string } | undefined;
    if (!row) throw new DomainError('FLIGHT_NOT_FOUND', 'Flight was not found.', 404);
    return row;
  }

  private requireVendor(id: string) {
    const row = this.sqlite.prepare('SELECT id FROM vendors WHERE id = ?').get(id);
    if (!row) throw new DomainError('VENDOR_NOT_FOUND', 'Vendor was not found.', 404);
  }

  private requireDefect(id: string, aircraftId?: string) {
    const row = this.sqlite
      .prepare(
        `SELECT * FROM aircraft_defects
         WHERE id = ? ${aircraftId ? 'AND aircraft_id = ?' : ''}`
      )
      .get(...(aircraftId ? [id, aircraftId] : [id])) as SqlRow | undefined;
    if (!row) throw new DomainError('AIRCRAFT_DEFECT_NOT_FOUND', 'Defect was not found.', 404);
    return row;
  }

  private requireWorkPackage(id: string) {
    const row = this.sqlite
      .prepare(
        `SELECT wp.*, aircraft.registration_number AS aircraft_registration_number,
                aircraft.aircraft_type AS aircraft_type,
                aircraft.model AS aircraft_model,
                defect.defect_number AS primary_defect_number
         FROM maintenance_work_packages wp
         JOIN aircraft ON aircraft.id = wp.aircraft_id
         LEFT JOIN aircraft_defects defect ON defect.id = wp.primary_defect_id
         WHERE wp.id = ?`
      )
      .get(id) as SqlRow | undefined;
    if (!row)
      throw new DomainError('MAINTENANCE_PACKAGE_NOT_FOUND', 'Work package was not found.', 404);
    return row;
  }

  private requireJobCard(id: string) {
    const row = this.sqlite.prepare('SELECT * FROM maintenance_job_cards WHERE id = ?').get(id) as
      SqlRow | undefined;
    if (!row)
      throw new DomainError('MAINTENANCE_JOB_CARD_NOT_FOUND', 'Job card was not found.', 404);
    return row;
  }

  private requireReworkAction(id: string) {
    const row = this.sqlite
      .prepare('SELECT * FROM maintenance_rework_actions WHERE id = ?')
      .get(id) as SqlRow | undefined;
    if (!row)
      throw new DomainError(
        'MAINTENANCE_REWORK_ACTION_NOT_FOUND',
        'Rework action was not found.',
        404
      );
    return row;
  }

  private assertVersion(row: SqlRow, expectedVersion: number) {
    const currentVersion = number(row.version);
    if (currentVersion !== expectedVersion) {
      throw new DomainError('STALE_VERSION', 'Record changed. Refresh and retry.', 409, {
        currentVersion,
        expectedVersion,
        impact: 'The command was not applied.',
        requiredAction: 'Refresh the record and retry with the current version.'
      });
    }
  }

  private assertWorkPackageMutable(row: SqlRow) {
    if (['RELEASED', 'CANCELLED'].includes(String(row.status))) {
      throw new DomainError(
        'MAINTENANCE_PACKAGE_LOCKED',
        'Released or cancelled work packages cannot be changed.',
        409
      );
    }
  }

  private assertReleaseReady(workPackageId: string) {
    const count = number(
      (
        this.sqlite
          .prepare(
            `SELECT COUNT(*) AS count FROM maintenance_job_cards
             WHERE work_package_id = ? AND mandatory_flag = 1`
          )
          .get(workPackageId) as SqlRow
      ).count
    );
    if (!count) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_JOB_CARD_REQUIRED',
        'At least one mandatory job card is required before release.',
        422,
        {
          impact: 'Technical release cannot proceed.',
          requiredAction: 'Add at least one mandatory job card to the work package.',
          referenceId: workPackageId
        }
      );
    }
    const missingApprovedData = this.sqlite
      .prepare(
        `SELECT card_number
	         FROM maintenance_job_cards
	         WHERE work_package_id = ? AND mandatory_flag = 1
	           AND (
	             TRIM(COALESCE(maintenance_data_ref, '')) = ''
	             OR TRIM(COALESCE(maintenance_data_revision, '')) = ''
	           )`
      )
      .all(workPackageId) as Array<{ card_number: string }>;
    if (missingApprovedData.length) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_APPROVED_DATA_REQUIRED',
        'Mandatory job cards must reference approved maintenance data and revision.',
        422,
        {
          impact: 'Technical release cannot proceed.',
          requiredAction:
            'Add the maintenance data reference and revision snapshot for every mandatory job card.',
          referenceId: workPackageId,
          jobCards: missingApprovedData
        }
      );
    }
    const incomplete = this.sqlite
      .prepare(
        `SELECT card_number, status FROM maintenance_job_cards
	         WHERE work_package_id = ? AND mandatory_flag = 1
           AND status <> 'READY_FOR_RELEASE_REVIEW'`
      )
      .all(workPackageId) as Array<{ card_number: string; status: string }>;
    if (incomplete.length) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_INCOMPLETE_JOB_CARDS',
        'Mandatory job cards are not ready for release review.',
        422,
        {
          impact: 'Technical release cannot proceed.',
          requiredAction:
            'Complete every mandatory job card, required sign-off, and inspection before release.',
          referenceId: workPackageId,
          jobCards: incomplete
        }
      );
    }
    const mechanicMissingEvidence = this.sqlite
      .prepare(
        `SELECT card.card_number
	         FROM maintenance_job_cards card
	         LEFT JOIN maintenance_job_card_signoffs mechanic
	           ON mechanic.job_card_id = card.id
	          AND mechanic.signoff_type = 'MECHANIC'
	          AND mechanic.decision = 'COMPLETED'
	         WHERE card.work_package_id = ?
	           AND card.mandatory_flag = 1
	           AND (
	             mechanic.id IS NULL
	             OR TRIM(COALESCE(mechanic.evidence_references, '[]')) = '[]'
	           )`
      )
      .all(workPackageId) as Array<{ card_number: string }>;
    if (mechanicMissingEvidence.length) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_MECHANIC_EVIDENCE_REQUIRED',
        'Mandatory job cards require immutable mechanic sign-off evidence.',
        422,
        {
          impact: 'Technical release cannot proceed.',
          requiredAction: 'Attach evidence to every mandatory mechanic sign-off.',
          referenceId: workPackageId,
          jobCards: mechanicMissingEvidence
        }
      );
    }
    const inspectionMissing = this.sqlite
      .prepare(
        `SELECT card.card_number
	         FROM maintenance_job_cards card
         LEFT JOIN maintenance_job_card_signoffs inspection
           ON inspection.job_card_id = card.id
          AND inspection.signoff_type = 'INDEPENDENT_INSPECTION'
          AND inspection.decision = 'PASSED'
         WHERE card.work_package_id = ?
           AND card.mandatory_flag = 1
           AND card.requires_independent_inspection = 1
           AND inspection.id IS NULL`
      )
      .all(workPackageId) as Array<{ card_number: string }>;
    if (inspectionMissing.length) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_INSPECTION_REQUIRED',
        'A mandatory independent inspection is missing.',
        422,
        {
          impact: 'Technical release cannot proceed.',
          requiredAction: 'Complete every mandatory independent inspection before release.',
          referenceId: workPackageId,
          jobCards: inspectionMissing
        }
      );
    }
    const inspectionMissingEvidence = this.sqlite
      .prepare(
        `SELECT card.card_number
	         FROM maintenance_job_cards card
	         JOIN maintenance_job_card_signoffs inspection
	           ON inspection.job_card_id = card.id
	          AND inspection.signoff_type = 'INDEPENDENT_INSPECTION'
	          AND inspection.decision = 'PASSED'
	         WHERE card.work_package_id = ?
	           AND card.mandatory_flag = 1
	           AND card.requires_independent_inspection = 1
	           AND TRIM(COALESCE(inspection.evidence_references, '[]')) = '[]'`
      )
      .all(workPackageId) as Array<{ card_number: string }>;
    if (inspectionMissingEvidence.length) {
      throw maintenanceError(
        'MAINTENANCE_RELEASE_INSPECTION_EVIDENCE_REQUIRED',
        'Mandatory independent inspections require immutable evidence.',
        422,
        {
          impact: 'Technical release cannot proceed.',
          requiredAction: 'Attach evidence to every mandatory independent inspection sign-off.',
          referenceId: workPackageId,
          jobCards: inspectionMissingEvidence
        }
      );
    }
    const unresolvedRework = this.sqlite
      .prepare(
        `SELECT rework_number, status, approved_data_ref, mechanic_signoff_at
         FROM maintenance_rework_actions
         WHERE work_package_id = ?
           AND status NOT IN ('REINSPECTION_PASSED', 'REINSPECTION_FAILED', 'CANCELLED')`
      )
      .all(workPackageId) as Array<{
      rework_number: string;
      status: string;
      approved_data_ref: string | null;
      mechanic_signoff_at: string | null;
    }>;
    if (unresolvedRework.length) {
      const missingApprovedData = unresolvedRework.filter(
        (row) => !String(row.approved_data_ref ?? '').trim()
      );
      if (missingApprovedData.length) {
        throw maintenanceError(
          'MAINTENANCE_RELEASE_REWORK_APPROVED_DATA_REQUIRED',
          'Corrective-work approved data reference is missing.',
          422,
          {
            impact: 'Technical release cannot proceed.',
            requiredAction: 'Record approved data for every open corrective work action.',
            referenceId: workPackageId,
            reworkActions: missingApprovedData
          }
        );
      }
      const unsigned = unresolvedRework.filter((row) => !row.mechanic_signoff_at);
      if (unsigned.length) {
        throw maintenanceError(
          'MAINTENANCE_RELEASE_REWORK_UNSIGNED',
          'Corrective work is not signed.',
          422,
          {
            impact: 'Technical release cannot proceed.',
            requiredAction: 'Complete mechanic sign-off for every open corrective work action.',
            referenceId: workPackageId,
            reworkActions: unsigned
          }
        );
      }
      throw maintenanceError(
        'MAINTENANCE_RELEASE_REINSPECTION_REQUIRED',
        'Required re-inspection has not passed.',
        422,
        {
          impact: 'Technical release cannot proceed.',
          requiredAction:
            'Complete independent re-inspection for every open corrective work action.',
          referenceId: workPackageId,
          reworkActions: unresolvedRework
        }
      );
    }
  }

  private touchWorkPackage(
    id: string,
    expectedVersion: number,
    status?: MaintenanceWorkPackageStatus
  ) {
    const result = this.sqlite
      .prepare(
        `UPDATE maintenance_work_packages
         SET status = COALESCE(?, status), version = version + 1, updated_at = ?
         WHERE id = ? AND version = ?`
      )
      .run(status ?? null, now(), id, expectedVersion);
    if (!result.changes) {
      throw maintenanceError('STALE_VERSION', 'Work package changed. Refresh and retry.', 409, {
        impact: 'The work package command was not applied.',
        requiredAction: 'Refresh the work package and retry with the current version.',
        referenceId: id
      });
    }
  }

  private updateWorkPackageStatus(
    id: string,
    expectedVersion: number,
    status: MaintenanceWorkPackageStatus
  ) {
    this.touchWorkPackage(id, expectedVersion, status);
  }

  private updateJobCardStatus(
    id: string,
    expectedVersion: number,
    status: MaintenanceJobCardStatus
  ) {
    const result = this.sqlite
      .prepare(
        `UPDATE maintenance_job_cards
         SET status = ?, version = version + 1, updated_at = ?
         WHERE id = ? AND version = ?`
      )
      .run(status, now(), id, expectedVersion);
    if (!result.changes) {
      throw maintenanceError('STALE_VERSION', 'Job card changed. Refresh and retry.', 409, {
        impact: 'The job card command was not applied.',
        requiredAction: 'Refresh the job card and retry with the current version.',
        referenceId: id
      });
    }
  }

  private insertSignoff(
    jobCardId: string,
    signoffType: 'MECHANIC' | 'INDEPENDENT_INSPECTION',
    decision: 'COMPLETED' | 'PASSED' | 'FAILED',
    statement: string,
    evidenceReferences: string[],
    actor: MaintenanceActor,
    certifyingLicenseNumber: string | null = null,
    authorizationSnapshot: SignerAuthorizationSnapshot | null = null
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_job_card_signoffs (
          id, job_card_id, signoff_type, decision, statement, evidence_references,
          certifying_license_number, company_authorization_snapshot_json,
          actor_user_id, actor_role, signed_at, request_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `msign-${nanoid(12)}`,
        jobCardId,
        signoffType,
        decision,
        statement,
        JSON.stringify(evidenceReferences),
        certifyingLicenseNumber,
        authorizationSnapshot ? JSON.stringify(authorizationSnapshot) : null,
        actor.userId,
        actor.role,
        now(),
        actor.requestId ?? null
      );
  }

  private audit(
    entityType: string,
    entityId: string,
    action: string,
    actor: MaintenanceActor,
    beforeVersion: number | null,
    afterVersion: number | null,
    metadata: unknown = {}
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_audit_logs (
          id, entity_type, entity_id, action, actor_user_id, actor_role, request_id,
          before_version, after_version, metadata_json, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `maudit-${nanoid(12)}`,
        entityType,
        entityId,
        action,
        actor.userId,
        actor.role,
        actor.requestId ?? null,
        beforeVersion,
        afterVersion,
        JSON.stringify(metadata),
        now()
      );
  }

  private toWorkPackageDto(row: SqlRow, includeJobCards: boolean): MaintenanceWorkPackageDto {
    const id = String(row.id);
    const aircraftDetail = includeJobCards
      ? this.airworthiness.detail(String(row.aircraft_id)).aircraft
      : null;
    const release =
      includeJobCards && row.release_id ? this.releaseById(String(row.release_id)) : null;
    return {
      id,
      packageNumber: String(row.package_number),
      aircraftId: String(row.aircraft_id),
      aircraftRegistrationNumber: String(row.aircraft_registration_number),
      aircraftType: nullableText(row.aircraft_type) ?? undefined,
      aircraftModel: nullableText(row.aircraft_model) ?? undefined,
      sourceFlightId: nullableText(row.source_flight_id),
      primaryDefectId: nullableText(row.primary_defect_id),
      primaryDefectNumber: nullableText(row.primary_defect_number),
      title: String(row.title),
      priority: String(row.priority) as MaintenanceWorkPackageDto['priority'],
      executionMode: String(row.execution_mode) as MaintenanceWorkPackageDto['executionMode'],
      vendorId: nullableText(row.vendor_id),
      status: String(row.status) as MaintenanceWorkPackageStatus,
      planningNote: nullableText(row.planning_note),
      releaseId: nullableText(row.release_id),
      releasedAt: nullableText(row.released_at),
      financialStatus: String(row.financial_status) as MaintenanceWorkPackageDto['financialStatus'],
      version: number(row.version),
      createdByUserId: String(row.created_by_user_id),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      jobCards: includeJobCards ? this.jobCards(id) : [],
      ...(includeJobCards
        ? {
            aircraftTechnicalState: aircraftDetail?.serviceabilityStatus,
            aircraftTechnicalEligibility: aircraftDetail?.technicalEligibility,
            primaryDefect: row.primary_defect_id
              ? (this.defectSummaries({ aircraftId: String(row.aircraft_id) }).find(
                  (defect) => defect.id === String(row.primary_defect_id)
                ) ?? null)
              : null,
            sourceFlight: row.source_flight_id
              ? this.sourceFlight(String(row.source_flight_id))
              : null,
            vendorName: row.vendor_id ? this.vendorName(String(row.vendor_id)) : null,
            requirementScope: this.requirementScope(id),
            release,
            releaseChecklist: this.releaseChecklist(id),
            auditRecords: this.listAuditRecords({
              package: id,
              limit: 30,
              offset: 0
            } as MaintenanceAuditListQuery).items
          }
        : {})
    };
  }

  private sourceFlight(id: string) {
    const row = this.sqlite
      .prepare(
        `SELECT id, flight_number, current_status
         FROM flight_operations
         WHERE id = ?`
      )
      .get(id) as SqlRow | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      flightNumber: String(row.flight_number),
      currentStatus: String(row.current_status)
    };
  }

  private vendorName(id: string) {
    const row = this.sqlite.prepare('SELECT vendor_name FROM vendors WHERE id = ?').get(id) as
      SqlRow | undefined;
    return row ? String(row.vendor_name) : null;
  }

  private releaseById(id: string) {
    const row = this.sqlite
      .prepare(
        `SELECT release.*, aircraft.registration_number AS aircraft_registration_number
         FROM aircraft_maintenance_releases release
         JOIN aircraft ON aircraft.id = release.aircraft_id
         WHERE release.id = ?`
      )
      .get(id) as SqlRow | undefined;
    return row ? this.toTechnicalReleaseSummaryDto(row) : null;
  }

  private jobCards(workPackageId: string): MaintenanceJobCardDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_job_cards
         WHERE work_package_id = ?
         ORDER BY created_at, card_number`
      )
      .all(workPackageId) as SqlRow[];
    return rows.map((row) => this.toJobCardDto(row));
  }

  private toJobCardDto(row: SqlRow): MaintenanceJobCardDto {
    return {
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      cardNumber: String(row.card_number),
      title: String(row.title),
      taskType: String(row.task_type),
      maintenanceDataRef: String(row.maintenance_data_ref),
      maintenanceDataRevision: String(row.maintenance_data_revision),
      mandatoryFlag: Boolean(row.mandatory_flag),
      requiresIndependentInspection: Boolean(row.requires_independent_inspection),
      status: String(row.status) as MaintenanceJobCardStatus,
      version: number(row.version),
      createdByUserId: String(row.created_by_user_id),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      signoffs: this.signoffs(String(row.id)),
      inspectionAttempts: this.inspectionAttempts(String(row.id)),
      reworkActions: this.reworkActions(String(row.id))
    };
  }

  private signoffs(jobCardId: string): MaintenanceJobCardDto['signoffs'] {
    const rows = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_job_card_signoffs
         WHERE job_card_id = ?
         ORDER BY signed_at`
      )
      .all(jobCardId) as SqlRow[];
    return rows.map((row) => ({
      id: String(row.id),
      jobCardId: String(row.job_card_id),
      signoffType: String(row.signoff_type) as 'MECHANIC' | 'INDEPENDENT_INSPECTION',
      decision: String(row.decision) as 'COMPLETED' | 'PASSED' | 'FAILED',
      statement: String(row.statement),
      evidenceReferences: jsonArray(row.evidence_references),
      certifyingLicenseNumber: nullableText(row.certifying_license_number),
      companyAuthorizationSnapshot: jsonObject(row.company_authorization_snapshot_json),
      actorUserId: String(row.actor_user_id),
      actorRole: String(row.actor_role),
      signedAt: String(row.signed_at)
    }));
  }

  private inspectionAttempts(jobCardId: string): MaintenanceInspectionAttemptDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_inspection_attempts
         WHERE job_card_id = ?
         ORDER BY attempt_number`
      )
      .all(jobCardId) as SqlRow[];
    return rows.map((row) => ({
      id: String(row.id),
      jobCardId: String(row.job_card_id),
      workPackageId: String(row.work_package_id),
      attemptNumber: number(row.attempt_number),
      cycleNumber: number(row.cycle_number),
      result: String(row.result) as 'PASSED' | 'FAILED',
      finding: String(row.finding),
      inspectorUserId: String(row.inspector_user_id),
      inspectorRole: String(row.inspector_role),
      inspectorLicenseNumber: String(row.inspector_license_number),
      inspectorLicenseSnapshot: jsonObject(row.inspector_license_snapshot_json),
      companyAuthorizationSnapshot: jsonObject(row.company_authorization_snapshot_json),
      packageVersion: number(row.package_version),
      inspectedAt: String(row.inspected_at),
      requestId: nullableText(row.request_id),
      createdAt: String(row.created_at)
    }));
  }

  private reworkActions(jobCardId: string): MaintenanceReworkActionDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_rework_actions
         WHERE job_card_id = ?
         ORDER BY cycle_number, created_at`
      )
      .all(jobCardId) as SqlRow[];
    return rows.map((row) => ({
      id: String(row.id),
      reworkNumber: String(row.rework_number),
      workPackageId: String(row.work_package_id),
      jobCardId: String(row.job_card_id),
      sourceInspectionAttemptId: String(row.source_inspection_attempt_id),
      cycleNumber: number(row.cycle_number),
      finding: String(row.finding),
      correctiveActionDescription: String(row.corrective_action_description),
      approvedDataRef: String(row.approved_data_ref),
      assignedMechanicUserId: nullableText(row.assigned_mechanic_user_id),
      status: String(row.status) as MaintenanceReworkActionDto['status'],
      mechanicSignoffStatement: nullableText(row.mechanic_signoff_statement),
      mechanicSignoffUserId: nullableText(row.mechanic_signoff_user_id),
      mechanicSignoffRole: nullableText(row.mechanic_signoff_role),
      mechanicLicenseNumber: nullableText(row.mechanic_license_number),
      companyAuthorizationSnapshot: jsonObject(row.company_authorization_snapshot_json),
      mechanicSignoffAt: nullableText(row.mechanic_signoff_at),
      reinspectionAttemptId: nullableText(row.reinspection_attempt_id),
      requestId: nullableText(row.request_id),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }
}
