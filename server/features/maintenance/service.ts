import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import type {
  AssessNonRoutineFindingInput,
  AcknowledgeMaintenanceShiftHandoverInput,
  AddMaintenanceShiftRosterInput,
  AllocateMaintenanceGseInput,
  CloseNonRoutineFindingInput,
  CreateCorrectiveJobCardFromFindingInput,
  CreateMaintenanceFacilityShiftInput,
  CreateMaintenanceGseRequirementInput,
  CreateMaintenanceJobCardInput,
  CreateMaintenanceSlotInput,
  CreateMaintenanceWorkPackageInput,
  CreateWorkPackageFromDueInput,
  CreateNonRoutineFindingInput,
  CancelMaintenanceSlotInput,
  MaintenanceActor,
  MaintenanceAircraftStatusSummaryDto,
  MaintenanceAircraftCustodyDto,
  MaintenanceApprovedDataDocumentDto,
  MaintenanceAuditPackDto,
  MaintenanceAuditListQuery,
  MaintenanceAuditRecordDto,
  MaintenanceCompanyAuthorizationAction,
  MaintenanceCompanyAuthorizationDto,
  MaintenanceCommandCenterDto,
  MaintenanceDefectSummaryDto,
  MaintenanceDomainBlockerDto,
  MaintenanceDefectAssessmentInput,
  MaintenanceDeferredCloseInput,
  MaintenanceDueStatusDto,
  MaintenanceFacilityCommandInput,
  MaintenanceEligibilityBlockerDto,
  MaintenanceFacilityDto,
  MaintenanceFacilityOperationsDto,
  MaintenanceFacilityOccupancyDto,
  MaintenanceFacilityOccupancyQuery,
  MaintenanceFacilityResourceStagingDto,
  MaintenanceFacilityShiftDto,
  MaintenanceGseAllocationDto,
  MaintenanceGseCandidateDto,
  MaintenanceGseRequirementDto,
  MaintenanceIndependentInspectionInput,
  MaintenanceInspectionAttemptDto,
  MaintenanceJobCardDto,
  MaintenanceJobCardStatus,
  MaintenanceJobCardWorkSignoffInput,
  MaintenanceListQuery,
  MaintenanceOperationalAttentionDto,
  MaintenanceNonRoutineFindingDto,
  MaintenanceQualityFindingDto,
  MaintenanceReadinessPanelDto,
  MaintenanceReleaseInput,
  MaintenanceOperationalAvailabilityDto,
  MaintenanceReleaseEligibilityDto,
  MaintenanceRequirementScopeDto,
  MaintenanceShiftHandoverDto,
  MaintenanceSlotReadinessDto,
  MaintenanceReworkActionDto,
  MaintenanceReworkSignoffInput,
  MaintenanceSlotAvailabilityDto,
  MaintenanceSlotAvailabilityInput,
  MaintenanceSlotConflictDto,
  MaintenanceSlotDto,
  MaintenanceTechnicalRecordPackageDto,
  RescheduleMaintenanceSlotInput,
  ResolveNonRoutineFindingInput,
  MaintenanceSelectorDataDto,
  MaintenanceTechnicalReleaseSummaryDto,
  MaintenanceVersionCommand,
  PrepareMaintenanceShiftHandoverInput,
  ReleaseMaintenanceResourceStagingInput,
  MaintenanceWorkPackageDto,
  MaintenanceWorkPackageStatus,
  StageMaintenanceResourceInput
} from '../../../shared/features/maintenance';
import { demoRolePermissions, type DemoRole } from '../../../shared/types/roles';
import type { AircraftAirworthinessService } from '../../services/aircraft-airworthiness.service';
import {
  evaluateMaintenanceOperationalAvailability,
  toMaintenanceAircraftCustodyDto
} from '../../services/maintenance-facility-operations.service';
import { ResourceV21Service } from '../../services/resource-v21.service';
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
const demoAuditPackDisclaimer =
  'Dokumen ini dihasilkan dari lingkungan demo dengan data fiktif. Dokumen ini bukan Certificate of Release to Service, bukan electronic maintenance record yang disetujui regulator, dan tidak boleh digunakan untuk pekerjaan maintenance nyata.';

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

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
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
                aircraft.image_url AS aircraft_image_url,
                aircraft.aircraft_type AS aircraft_type,
                aircraft.model AS aircraft_model,
                defect.defect_number AS primary_defect_number,
                due_requirement.code AS source_due_requirement_code,
                due_requirement.title AS source_due_requirement_title
         FROM maintenance_work_packages wp
         JOIN aircraft ON aircraft.id = wp.aircraft_id
         LEFT JOIN aircraft_defects defect ON defect.id = wp.primary_defect_id
         LEFT JOIN maintenance_due_requirements due_requirement
           ON due_requirement.id = wp.source_due_requirement_id
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
    const eligibilities = workPackages
      .filter((item) => item.status !== 'RELEASED' && item.status !== 'CANCELLED')
      .map((item) => ({
        workPackage: item,
        eligibility: this.evaluateReleaseEligibility(item.id)
      }));
    const releaseBlockers = eligibilities
      .filter((item) => item.eligibility.blockers.length > 0)
      .map((item) => ({
        workPackageId: item.workPackage.id,
        packageNumber: item.workPackage.packageNumber,
        aircraftRegistrationNumber: item.workPackage.aircraftRegistrationNumber,
        aircraftImageUrl: item.workPackage.aircraftImageUrl,
        blockers: item.eligibility.blockers.map((blocker) =>
          this.domainBlockerFromEligibility(blocker)
        )
      }));
    const legacyReleaseBlockers = workPackages
      .filter((item) => item.status !== 'RELEASED' && item.status !== 'CANCELLED')
      .map((item) => ({
        workPackageId: item.id,
        packageNumber: item.packageNumber,
        aircraftRegistrationNumber: item.aircraftRegistrationNumber,
        aircraftImageUrl: item.aircraftImageUrl,
        blockers: this.releaseBlockersForPackage(item.id)
      }))
      .filter((item) => item.blockers.length > 0);
    for (const legacy of legacyReleaseBlockers) {
      if (!releaseBlockers.some((item) => item.workPackageId === legacy.workPackageId)) {
        releaseBlockers.push(legacy);
      }
    }
    const openGroundingDefects = defects.filter(
      (item) => item.assessmentDecision === 'GROUND'
    ).length;
    const dueControl = this.listDueControl();
    const allEligibilityBlockers = eligibilities.flatMap((item) => item.eligibility.blockers);
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
        readyForRelease: readyForRelease.length,
        maintenanceHold: fleet.filter((item) => item.serviceabilityStatus !== 'SERVICEABLE').length,
        demoBlocked: fleet.filter((item) => item.technicalEligibility === 'BLOCKED').length,
        dueSoon: dueControl.filter((item) => item.status === 'DUE_SOON').length,
        overdue: dueControl.filter((item) => item.status === 'OVERDUE').length,
        partsBlockers: allEligibilityBlockers.filter((item) => item.category === 'MATERIAL').length,
        toolingBlockers: allEligibilityBlockers.filter((item) => item.category === 'TOOLING')
          .length,
        authorizationBlockers: allEligibilityBlockers.filter(
          (item) => item.category === 'AUTHORIZATION'
        ).length,
        approvedDataBlockers: allEligibilityBlockers.filter(
          (item) => item.category === 'APPROVED_DATA'
        ).length,
        reworkRequired: allEligibilityBlockers.filter((item) => item.category === 'REWORK').length
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
      technicalReleases: this.technicalReleaseSummaries(20),
      dueControl
    };
  }

  listApprovedData(): MaintenanceApprovedDataDocumentDto[] {
    const documents = this.sqlite
      .prepare(
        `SELECT doc.*,
                (SELECT COUNT(*)
                 FROM maintenance_job_card_approved_data_links link
                 JOIN maintenance_approved_data_revisions rev ON rev.id = link.approved_data_revision_id
                 WHERE rev.document_id = doc.id) AS job_card_usage_count
         FROM maintenance_approved_data_documents doc
         ORDER BY doc.document_type, doc.document_number`
      )
      .all() as SqlRow[];
    return documents.map((document) => {
      const revisions = this.sqlite
        .prepare(
          `SELECT *
           FROM maintenance_approved_data_revisions
           WHERE document_id = ?
           ORDER BY effective_date DESC, revision DESC`
        )
        .all(String(document.id)) as SqlRow[];
      const revisionDtos = revisions.map((row) => this.toApprovedDataRevisionDto(row));
      return {
        id: String(document.id),
        documentType: String(
          document.document_type
        ) as MaintenanceApprovedDataDocumentDto['documentType'],
        documentNumber: String(document.document_number),
        title: String(document.title),
        sourceIssuer: String(document.source_issuer),
        applicability: String(document.applicability),
        status: String(document.status) as MaintenanceApprovedDataDocumentDto['status'],
        fictionalDemo: Boolean(document.fictional_demo),
        createdAt: String(document.created_at),
        updatedAt: String(document.updated_at),
        revisions: revisionDtos,
        activeRevision: revisionDtos.find((revision) => revision.status === 'ACTIVE') ?? null,
        jobCardUsageCount: number(document.job_card_usage_count)
      };
    });
  }

  listDueControl(): MaintenanceDueStatusDto[] {
    const generatedAt = now();
    const rows = this.sqlite
      .prepare(
        `SELECT status.*, requirement.code, requirement.title, requirement.mandatory,
                requirement.recurring, requirement.active, requirement.fictional_demo,
                requirement.source_approved_data_revision_id,
                requirement.interval_calendar_days, requirement.interval_flight_hours,
                requirement.interval_flight_cycles,
                aircraft.registration_number AS aircraft_registration_number,
                aircraft.image_url AS aircraft_image_url,
                aircraft.airframe_hours, aircraft.airframe_cycles, aircraft.updated_at AS aircraft_updated_at,
                planned_wp.id AS planned_work_package_id,
                planned_wp.package_number AS planned_work_package_number,
                planned_wp.status AS planned_work_package_status,
                compliance.id AS compliance_record_id
         FROM maintenance_aircraft_requirement_statuses status
         JOIN maintenance_due_requirements requirement ON requirement.id = status.requirement_id
         JOIN aircraft ON aircraft.id = status.aircraft_id
         LEFT JOIN maintenance_work_packages planned_wp
           ON planned_wp.id = status.planned_work_package_id
          AND planned_wp.status <> 'CANCELLED'
         LEFT JOIN maintenance_due_compliance_records compliance
           ON compliance.id = status.last_compliance_record_id
         ORDER BY aircraft.registration_number, status.status = 'OVERDUE' DESC,
                  status.next_due_at, requirement.code`
      )
      .all() as SqlRow[];
    return rows.map((row) => this.toDueStatusDto(row, generatedAt));
  }

  evaluateReleaseEligibility(workPackageId: string): MaintenanceReleaseEligibilityDto {
    const workPackage = this.requireWorkPackage(workPackageId);
    const evaluatedAt = now();
    const blockers: MaintenanceEligibilityBlockerDto[] = [];
    const warnings: MaintenanceEligibilityBlockerDto[] = [];

    for (const legacy of this.releaseBlockersForPackage(workPackageId)) {
      blockers.push(this.eligibilityBlockerFromLegacy(legacy));
    }
    blockers.push(...this.approvedDataEligibility(workPackageId, true));
    warnings.push(...this.approvedDataEligibility(workPackageId, false));
    blockers.push(...this.dueControlEligibility(workPackage));
    blockers.push(...this.materialEligibility(workPackageId));
    blockers.push(...this.amoScopeEligibility(workPackage, evaluatedAt));
    blockers.push(...this.configurationEligibility(String(workPackage.aircraft_id)));
    warnings.push(...this.releaseResourceContextWarnings(workPackageId));

    const uniqueBlockers = this.uniqueEligibilityItems(blockers);
    const uniqueWarnings = this.uniqueEligibilityItems(warnings).filter(
      (warning) => !uniqueBlockers.some((blocker) => blocker.code === warning.code)
    );
    return {
      workPackageId,
      aircraftId: String(workPackage.aircraft_id),
      evaluatedAt,
      eligible: uniqueBlockers.length === 0,
      blockers: uniqueBlockers,
      warnings: uniqueWarnings
    };
  }

  getReadinessPanel(workPackageId: string): MaintenanceReadinessPanelDto {
    const eligibility = this.evaluateReleaseEligibility(workPackageId);
    const sectionMap = [
      ['PERSONNEL', 'Personel', ['AUTHORIZATION', 'AMO_SCOPE']],
      ['MATERIAL', 'Material', ['MATERIAL']],
      ['TOOLING', 'Peralatan', ['TOOLING']],
      ['APPROVED_DATA', 'Data Perawatan', ['APPROVED_DATA']],
      ['DUE_CONTROL', 'Jatuh Tempo', ['DUE_CONTROL']],
      ['INSPECTION', 'Pemeriksaan', ['WORK', 'INSPECTION', 'REWORK']],
      ['RELEASE', 'Rilis Teknis', ['DEFERMENT', 'AIRCRAFT_CONFIGURATION', 'RECORD']]
    ] as const;
    return {
      evaluatedAt: eligibility.evaluatedAt,
      sections: sectionMap.map(([key, label, categories]) => {
        const blockers = eligibility.blockers.filter((item) =>
          categories.includes(item.category as never)
        );
        const warnings = eligibility.warnings.filter((item) =>
          categories.includes(item.category as never)
        );
        return {
          key,
          label,
          status: blockers.length ? 'TERBLOKIR' : warnings.length ? 'PERLU_TINDAKAN' : 'SIAP',
          blockers,
          warnings
        };
      })
    };
  }

  getAuditPack(workPackageId: string, actor: MaintenanceActor): MaintenanceAuditPackDto {
    this.assertMaintenancePermission(actor, 'maintenance.audit_pack.export');
    const existing = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_audit_packs
         WHERE work_package_id = ?
         ORDER BY generated_at DESC
         LIMIT 1`
      )
      .get(workPackageId) as SqlRow | undefined;
    if (existing) return this.toAuditPackDto(existing);

    const workPackage = this.getWorkPackage(workPackageId);
    const eligibility = this.evaluateReleaseEligibility(workPackageId);
    const generatedAt = now();
    const manifest = this.auditPackManifest(workPackage, eligibility, generatedAt);
    const manifestHash = createHash('sha256').update(stableJson(manifest)).digest('hex');
    const id = `mauditpack-${nanoid(12)}`;
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_audit_packs (
          id, work_package_id, release_id, generated_at, manifest_json, manifest_hash,
          disclaimer, created_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        workPackageId,
        workPackage.releaseId,
        generatedAt,
        JSON.stringify(manifest),
        manifestHash,
        demoAuditPackDisclaimer,
        actor.userId,
        generatedAt
      );
    this.audit('WORK_PACKAGE', workPackageId, 'AUDIT_PACK_GENERATED', actor, null, null, {
      auditPackId: id,
      manifestHash,
      releaseId: workPackage.releaseId
    });
    return this.toAuditPackDto(
      this.sqlite.prepare('SELECT * FROM maintenance_audit_packs WHERE id = ?').get(id) as SqlRow
    );
  }

  getTechnicalRecordPackage(workPackageId: string): MaintenanceTechnicalRecordPackageDto {
    const workPackage = this.getWorkPackage(workPackageId);
    const generatedAt = now();
    return {
      workPackageId,
      releaseId: workPackage.releaseId,
      generatedAt,
      disclaimer: demoAuditPackDisclaimer,
      currentWorkPackage: workPackage,
      releaseEligibility: this.evaluateReleaseEligibility(workPackageId),
      releaseSnapshot: this.latestReleaseEligibilitySnapshot(workPackageId),
      evidence: {
        source: {
          sourceFlightId: workPackage.sourceFlightId,
          primaryDefectId: workPackage.primaryDefectId,
          primaryDefectNumber: workPackage.primaryDefectNumber,
          sourceDueRequirementId: workPackage.sourceDueRequirementId,
          sourceDueStatusId: workPackage.sourceDueStatusId,
          sourceDueRequirementCode: workPackage.sourceDueRequirementCode,
          sourceDueRequirementTitle: workPackage.sourceDueRequirementTitle
        },
        jobCards: workPackage.jobCards,
        nonRoutineFindings: workPackage.nonRoutineFindings ?? [],
        materialTraceability: this.materialTechnicalRecordEvidence(workPackageId),
        personnelEvidence: this.personnelTechnicalRecordEvidence(workPackageId),
        toolEvidence: this.toolTechnicalRecordEvidence(workPackageId),
        approvedDataReferences: this.approvedDataTechnicalRecordEvidence(workPackageId),
        facilityContext: workPackage.currentMaintenanceSlot ?? null,
        technicalRelease: workPackage.release ?? null,
        auditTimeline: workPackage.auditRecords ?? []
      }
    };
  }

  listQualityFindings(): MaintenanceQualityFindingDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_quality_findings
         ORDER BY status IN ('OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED') DESC, updated_at DESC`
      )
      .all() as SqlRow[];
    return rows.map((row) => this.toQualityFindingDto(row));
  }

  selectorData(actor: MaintenanceActor): MaintenanceSelectorDataDto {
    return {
      generatedAt: now(),
      authorizationNotice: companyAuthorizationVerified,
      aircraft: this.fleetStatusSummaries().map((item) => ({
        id: item.aircraftId,
        registrationNumber: item.registrationNumber,
        imageUrl: item.imageUrl,
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

  listMaintenanceFacilities(): MaintenanceFacilityDto[] {
    const facilities = this.sqlite
      .prepare(
        `SELECT facility.*, station.station_code, station.station_name,
                COALESCE(NULLIF(facility.timezone, ''), station.timezone) AS effective_timezone
         FROM maintenance_facilities facility
         JOIN stations station ON station.id = facility.station_id
         ORDER BY station.station_code, facility.code`
      )
      .all() as SqlRow[];
    const areas = this.sqlite
      .prepare('SELECT * FROM maintenance_facility_areas ORDER BY code')
      .all() as SqlRow[];
    const bays = this.sqlite
      .prepare('SELECT * FROM maintenance_facility_bays ORDER BY code')
      .all() as SqlRow[];

    return facilities.map((facility) => ({
      id: String(facility.id),
      stationId: String(facility.station_id),
      stationCode: String(facility.station_code),
      stationName: String(facility.station_name),
      timezone: String(facility.effective_timezone),
      code: String(facility.code),
      name: String(facility.name),
      facilityType: String(facility.facility_type) as MaintenanceFacilityDto['facilityType'],
      active: Boolean(facility.active),
      notes: nullableText(facility.notes),
      areas: areas
        .filter((area) => String(area.facility_id) === String(facility.id))
        .map((area) => ({
          id: String(area.id),
          facilityId: String(area.facility_id),
          code: String(area.code),
          name: String(area.name),
          areaType: String(area.area_type) as MaintenanceFacilityDto['areas'][number]['areaType'],
          active: Boolean(area.active),
          notes: nullableText(area.notes),
          bays: bays
            .filter((bay) => String(bay.area_id) === String(area.id))
            .map((bay) => ({
              id: String(bay.id),
              areaId: String(bay.area_id),
              code: String(bay.code),
              name: String(bay.name),
              active: Boolean(bay.active),
              capacity: 1,
              notes: nullableText(bay.notes)
            }))
        }))
    }));
  }

  previewMaintenanceSlotAvailability(
    workPackageId: string,
    input: MaintenanceSlotAvailabilityInput,
    actor: MaintenanceActor
  ): MaintenanceSlotAvailabilityDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.read');
    return this.evaluateMaintenanceSlotAvailability(workPackageId, input);
  }

  bookMaintenanceSlot(
    workPackageId: string,
    input: CreateMaintenanceSlotInput,
    actor: MaintenanceActor
  ): MaintenanceSlotDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    let slotId = '';
    this.runImmediateMaintenanceTransaction(() => {
      const timestamp = now();
      const idempotencyKey = input.idempotencyKey?.trim() || null;
      if (idempotencyKey) {
        const replay = this.sqlite
          .prepare(
            `SELECT id FROM maintenance_slots
             WHERE work_package_id = ? AND create_idempotency_key = ?
             LIMIT 1`
          )
          .get(workPackageId, idempotencyKey) as SqlRow | undefined;
        if (replay) {
          slotId = String(replay.id);
          return;
        }
      }
      const availability = this.evaluateMaintenanceSlotAvailability(workPackageId, input);
      if (availability.conflicts.some((conflict) => conflict.conflictType === 'WORK_PACKAGE')) {
        throw maintenanceError(
          'WORK_PACKAGE_ALREADY_SCHEDULED',
          'Work Package already has an active maintenance slot.',
          409,
          {
            impact: 'Slot maintenance tidak dibuat ulang.',
            requiredAction: 'Gunakan tindakan jadwal ulang pada slot aktif Work Package ini.',
            referenceId: workPackageId,
            conflicts: availability.conflicts
          }
        );
      }
      this.assertMaintenanceSlotAvailable(availability, workPackageId);
      slotId = `mslot-${nanoid(12)}`;
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_slots (
            id, work_package_id, aircraft_id, station_id, facility_id, area_id, bay_id,
            planned_start_at, planned_end_at, status, create_idempotency_key,
            created_by_user_id, created_at, updated_by_user_id, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'BOOKED', ?, ?, ?, ?, ?)`
        )
        .run(
          slotId,
          workPackageId,
          availability.aircraftId,
          availability.stationId,
          input.facilityId,
          input.areaId,
          input.bayId,
          availability.plannedStartAt,
          availability.plannedEndAt,
          idempotencyKey,
          actor.userId,
          timestamp,
          actor.userId,
          timestamp
        );
      this.recordMaintenanceSlotEvent(slotId, 'BOOKED', actor, timestamp, {
        workPackageId,
        aircraftId: availability.aircraftId,
        newFacilityId: input.facilityId,
        newAreaId: input.areaId,
        newBayId: input.bayId,
        newPlannedStartAt: availability.plannedStartAt,
        newPlannedEndAt: availability.plannedEndAt,
        reason: null
      });
      this.audit('MAINTENANCE_SLOT', slotId, 'FACILITY_SLOT_BOOKED', actor, null, null, {
        workPackageId,
        aircraftId: availability.aircraftId,
        facilityId: input.facilityId,
        areaId: input.areaId,
        bayId: input.bayId,
        plannedStartAt: availability.plannedStartAt,
        plannedEndAt: availability.plannedEndAt
      });
    });
    return this.requireMaintenanceSlot(slotId);
  }

  rescheduleMaintenanceSlot(
    slotId: string,
    input: RescheduleMaintenanceSlotInput,
    actor: MaintenanceActor
  ): MaintenanceSlotDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    this.runImmediateMaintenanceTransaction(() => {
      const timestamp = now();
      const before = this.requireMaintenanceSlotRow(slotId);
      if (String(before.status) !== 'BOOKED') {
        throw maintenanceError(
          'FACILITY_SLOT_IMMUTABLE',
          'Only booked maintenance slots can be rescheduled.',
          409,
          {
            impact: 'Slot maintenance tidak diubah.',
            requiredAction: 'Pilih slot berstatus BOOKED untuk jadwal ulang normal.',
            referenceId: slotId
          }
        );
      }
      const availability = this.evaluateMaintenanceSlotAvailability(
        String(before.work_package_id),
        input,
        slotId
      );
      this.assertMaintenanceSlotAvailable(availability, String(before.work_package_id));
      this.sqlite
        .prepare(
          `UPDATE maintenance_slots
           SET station_id = ?, facility_id = ?, area_id = ?, bay_id = ?,
               planned_start_at = ?, planned_end_at = ?,
               updated_by_user_id = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          availability.stationId,
          input.facilityId,
          input.areaId,
          input.bayId,
          availability.plannedStartAt,
          availability.plannedEndAt,
          actor.userId,
          timestamp,
          slotId
        );
      this.recordMaintenanceSlotEvent(slotId, 'RESCHEDULED', actor, timestamp, {
        workPackageId: String(before.work_package_id),
        aircraftId: String(before.aircraft_id),
        oldFacilityId: String(before.facility_id),
        oldAreaId: String(before.area_id),
        oldBayId: String(before.bay_id),
        oldPlannedStartAt: String(before.planned_start_at),
        oldPlannedEndAt: String(before.planned_end_at),
        newFacilityId: input.facilityId,
        newAreaId: input.areaId,
        newBayId: input.bayId,
        newPlannedStartAt: availability.plannedStartAt,
        newPlannedEndAt: availability.plannedEndAt,
        reason: input.reason
      });
      this.audit('MAINTENANCE_SLOT', slotId, 'FACILITY_SLOT_RESCHEDULED', actor, null, null, {
        workPackageId: String(before.work_package_id),
        oldBayId: String(before.bay_id),
        newBayId: input.bayId,
        oldPlannedStartAt: String(before.planned_start_at),
        oldPlannedEndAt: String(before.planned_end_at),
        newPlannedStartAt: availability.plannedStartAt,
        newPlannedEndAt: availability.plannedEndAt,
        reason: input.reason
      });
    });
    return this.requireMaintenanceSlot(slotId);
  }

  cancelMaintenanceSlot(
    slotId: string,
    input: CancelMaintenanceSlotInput,
    actor: MaintenanceActor
  ): MaintenanceSlotDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    this.runImmediateMaintenanceTransaction(() => {
      const timestamp = now();
      const before = this.requireMaintenanceSlotRow(slotId);
      if (String(before.status) !== 'BOOKED') {
        throw maintenanceError(
          'FACILITY_SLOT_IMMUTABLE',
          'Only booked maintenance slots can be cancelled by planner action.',
          409,
          {
            impact: 'Slot maintenance tidak dibatalkan.',
            requiredAction: 'Pilih slot berstatus BOOKED untuk pembatalan normal.',
            referenceId: slotId
          }
        );
      }
      this.sqlite
        .prepare(
          `UPDATE maintenance_slots
           SET status = 'CANCELLED', cancelled_by_user_id = ?, cancelled_at = ?,
               cancellation_reason = ?, updated_by_user_id = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(actor.userId, timestamp, input.reason, actor.userId, timestamp, slotId);
      this.recordMaintenanceSlotEvent(slotId, 'CANCELLED', actor, timestamp, {
        workPackageId: String(before.work_package_id),
        aircraftId: String(before.aircraft_id),
        oldFacilityId: String(before.facility_id),
        oldAreaId: String(before.area_id),
        oldBayId: String(before.bay_id),
        oldPlannedStartAt: String(before.planned_start_at),
        oldPlannedEndAt: String(before.planned_end_at),
        reason: input.reason
      });
      this.audit('MAINTENANCE_SLOT', slotId, 'FACILITY_SLOT_CANCELLED', actor, null, null, {
        workPackageId: String(before.work_package_id),
        aircraftId: String(before.aircraft_id),
        bayId: String(before.bay_id),
        plannedStartAt: String(before.planned_start_at),
        plannedEndAt: String(before.planned_end_at),
        reason: input.reason
      });
    });
    return this.requireMaintenanceSlot(slotId);
  }

  listMaintenanceOccupancy(
    query: MaintenanceFacilityOccupancyQuery,
    actor: MaintenanceActor
  ): MaintenanceFacilityOccupancyDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.read');
    const dateFrom = query.dateFrom ? this.toCanonicalSlotTimestamp(query.dateFrom) : now();
    const dateTo = query.dateTo
      ? this.toCanonicalSlotTimestamp(query.dateTo)
      : this.addDaysIso(dateFrom, 7);
    const where = ['slot.planned_start_at < ?', 'slot.planned_end_at > ?'];
    const params: unknown[] = [dateTo, dateFrom];
    if (query.stationId) {
      where.push('slot.station_id = ?');
      params.push(query.stationId);
    }
    if (query.facilityId) {
      where.push('slot.facility_id = ?');
      params.push(query.facilityId);
    }
    if (query.aircraftId) {
      where.push('slot.aircraft_id = ?');
      params.push(query.aircraftId);
    }
    if (query.status) {
      where.push('slot.status = ?');
      params.push(query.status);
    } else {
      where.push("slot.status IN ('BOOKED', 'IN_PROGRESS')");
    }
    const rows = this.sqlite
      .prepare(
        `${this.maintenanceSlotSelectSql()} WHERE ${where.join(' AND ')}
        ORDER BY station.station_code, facility.code, area.code, bay.code, slot.planned_start_at`
      )
      .all(...params) as SqlRow[];
    return {
      generatedAt: now(),
      dateFrom,
      dateTo,
      slots: rows.map((row) => this.toMaintenanceSlotDto(row)),
      actualOccupancies: this.listAircraftCustodies({ dateFrom, dateTo }),
      operationalConflicts: this.listOperationalOccupancyConflicts(dateFrom, dateTo)
    };
  }

  createGseRequirement(
    workPackageId: string,
    input: CreateMaintenanceGseRequirementInput,
    actor: MaintenanceActor
  ): MaintenanceGseRequirementDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    this.requireWorkPackage(workPackageId);
    const id = `mgser-${nanoid(12)}`;
    const timestamp = now();
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_gse_requirements (
          id, work_package_id, job_card_id, equipment_type, quantity, mandatory, status,
          notes, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?)`
      )
      .run(
        id,
        workPackageId,
        input.jobCardId ?? null,
        input.equipmentType,
        input.quantity,
        input.mandatory ? 1 : 0,
        input.notes ?? null,
        actor.userId,
        timestamp,
        timestamp
      );
    this.audit('GSE_REQUIREMENT', id, 'GSE_REQUIREMENT_CREATED', actor, null, null, {
      workPackageId,
      equipmentType: input.equipmentType,
      quantity: input.quantity
    });
    return this.requireGseRequirement(id);
  }

  listGseRequirements(workPackageId: string): MaintenanceGseRequirementDto[] {
    this.requireWorkPackage(workPackageId);
    const rows = this.sqlite
      .prepare(
        `SELECT req.*,
                (SELECT COUNT(*) FROM maintenance_gse_allocations alloc
                 WHERE alloc.requirement_id = req.id
                   AND alloc.status IN ('ALLOCATED', 'STAGED', 'IN_USE')) AS allocated_count,
                (SELECT COUNT(*) FROM maintenance_gse_allocations alloc
                 JOIN maintenance_facility_resource_staging staging
                   ON staging.resource_type = 'GSE' AND staging.allocation_id = alloc.id
                  AND staging.status IN ('STAGED', 'IN_USE')
                 WHERE alloc.requirement_id = req.id
                   AND alloc.status IN ('ALLOCATED', 'STAGED', 'IN_USE')) AS staged_count
         FROM maintenance_gse_requirements req
         WHERE req.work_package_id = ?
         ORDER BY req.created_at`
      )
      .all(workPackageId) as SqlRow[];
    return rows.map((row) => this.toGseRequirementDto(row));
  }

  listGseCandidates(workPackageId: string, requirementId: string): MaintenanceGseCandidateDto[] {
    const requirement = this.requireGseRequirementRow(requirementId);
    if (String(requirement.work_package_id) !== workPackageId) {
      throw maintenanceError(
        'GSE_REQUIREMENT_PACKAGE_MISMATCH',
        'GSE requirement does not belong to this Work Package.',
        409,
        {
          impact: 'GSE candidate list was not produced.',
          requiredAction: 'Refresh the Work Package resource panel.',
          referenceId: requirementId
        }
      );
    }
    const slot = this.currentMaintenanceSlot(workPackageId);
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM managed_assets
         WHERE category = 'GSE'
         ORDER BY lifecycle_status = 'ACTIVE' DESC, condition_status = 'SERVICEABLE' DESC, asset_code`
      )
      .all() as SqlRow[];
    return rows.map((asset) => this.evaluateGseCandidate(asset, requirement, slot));
  }

  allocateGse(
    workPackageId: string,
    input: AllocateMaintenanceGseInput,
    actor: MaintenanceActor
  ): MaintenanceGseAllocationDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    let allocationId: string | null = null;
    this.runImmediateMaintenanceTransaction(() => {
      if (input.idempotencyKey) {
        const existing = this.sqlite
          .prepare(
            `SELECT id FROM maintenance_gse_allocations WHERE work_package_id = ? AND idempotency_key = ?`
          )
          .get(workPackageId, input.idempotencyKey) as SqlRow | undefined;
        if (existing) {
          allocationId = String(existing.id);
          return;
        }
      }
      const requirement = this.requireGseRequirementRow(input.requirementId);
      if (String(requirement.work_package_id) !== workPackageId) {
        throw maintenanceError(
          'GSE_REQUIREMENT_PACKAGE_MISMATCH',
          'GSE requirement does not belong to this Work Package.',
          409,
          {
            impact: 'GSE tidak dialokasikan.',
            requiredAction: 'Pilih requirement GSE dari Work Package yang sama.',
            referenceId: input.requirementId
          }
        );
      }
      const slot = this.currentMaintenanceSlot(workPackageId);
      const asset = this.requireGseAsset(input.assetId);
      const candidate = this.evaluateGseCandidate(asset, requirement, slot);
      if (!candidate.eligible) {
        throw maintenanceError(
          candidate.reasons[0] ?? 'GSE_NOT_AVAILABLE',
          'GSE asset is not eligible for this maintenance slot.',
          409,
          {
            impact: 'GSE tidak dialokasikan.',
            requiredAction:
              'Pilih GSE yang serviceable, aktif, sesuai tipe, dan tidak bentrok jadwal.',
            referenceId: input.assetId,
            reasons: candidate.reasons
          }
        );
      }
      const allocatedCount = this.activeGseAllocationCount(input.requirementId);
      if (allocatedCount >= number(requirement.quantity)) {
        throw maintenanceError(
          'GSE_REQUIREMENT_SATISFIED',
          'GSE requirement is already satisfied.',
          409,
          {
            impact: 'GSE tidak dialokasikan ganda.',
            requiredAction: 'Gunakan allocation yang sudah ada atau ubah requirement.',
            referenceId: input.requirementId
          }
        );
      }
      const timestamp = now();
      allocationId = `mgsea-${nanoid(12)}`;
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_gse_allocations (
            id, requirement_id, work_package_id, slot_id, asset_id, status, idempotency_key,
            allocated_by_user_id, allocated_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'ALLOCATED', ?, ?, ?, ?)`
        )
        .run(
          allocationId,
          input.requirementId,
          workPackageId,
          slot?.id ?? null,
          input.assetId,
          input.idempotencyKey ?? null,
          actor.userId,
          timestamp,
          timestamp
        );
      this.audit('GSE_ALLOCATION', allocationId, 'GSE_ALLOCATED', actor, null, null, {
        workPackageId,
        requirementId: input.requirementId,
        assetId: input.assetId,
        slotId: slot?.id ?? null
      });
    });
    return this.requireGseAllocation(allocationId!);
  }

  stageGse(
    slotId: string,
    input: StageMaintenanceResourceInput,
    actor: MaintenanceActor
  ): MaintenanceFacilityResourceStagingDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    return this.stageResource('GSE', slotId, input, actor);
  }

  stageTool(
    slotId: string,
    input: StageMaintenanceResourceInput,
    actor: MaintenanceActor
  ): MaintenanceFacilityResourceStagingDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    return this.stageResource('TOOL', slotId, input, actor);
  }

  releaseResourceStaging(
    stagingId: string,
    input: ReleaseMaintenanceResourceStagingInput,
    actor: MaintenanceActor
  ): MaintenanceFacilityResourceStagingDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    const row = this.requireResourceStagingRow(stagingId);
    if (!['STAGED', 'IN_USE'].includes(String(row.status))) {
      return this.toResourceStagingDto(row);
    }
    const timestamp = now();
    this.sqlite
      .prepare(
        `UPDATE maintenance_facility_resource_staging
         SET status = 'RELEASED', released_by_user_id = ?, released_at = ?, note = COALESCE(?, note),
             updated_at = ?
         WHERE id = ?`
      )
      .run(actor.userId, timestamp, input.note ?? null, timestamp, stagingId);
    this.audit(
      'FACILITY_RESOURCE_STAGING',
      stagingId,
      'FACILITY_RESOURCE_RELEASED',
      actor,
      null,
      null,
      {
        resourceType: String(row.resource_type),
        allocationId: String(row.allocation_id),
        note: input.note ?? null
      }
    );
    return this.requireResourceStaging(stagingId);
  }

  evaluateMaintenanceSlotReadiness(slotId: string): MaintenanceSlotReadinessDto {
    const slot = this.requireMaintenanceSlot(slotId);
    const resourceReadiness = new ResourceV21Service(this.sqlite).getResourceReadiness(
      slot.workPackageId
    );
    const gseRequirements = this.listGseRequirements(slot.workPackageId).filter(
      (item) => item.status !== 'CANCELLED'
    );
    const staging = this.listResourceStaging(slotId);
    const gseMandatory = gseRequirements.filter((item) => item.mandatory);
    const gseReady = gseMandatory.every((item) => item.stagedQuantity >= item.quantity);
    const toolRequired = resourceReadiness.tools.totalRequired > 0;
    const toolReady =
      !toolRequired ||
      (resourceReadiness.tools.ready &&
        staging.filter(
          (item) => item.resourceType === 'TOOL' && ['STAGED', 'IN_USE'].includes(item.status)
        ).length >= resourceReadiness.tools.totalAllocated);
    const facilityReady = slot.status === 'BOOKED' || slot.status === 'IN_PROGRESS';
    const dimensions: MaintenanceSlotReadinessDto['dimensions'] = {
      facility: this.readinessDimension(
        facilityReady ? 'READY' : 'BLOCKED',
        facilityReady ? 'Slot/facility/bay booking is active.' : 'Maintenance slot is not active.',
        facilityReady
          ? []
          : [
              this.facilityBlocker(
                'FACILITY_SLOT_NOT_ACTIVE',
                slot.id,
                'Maintenance slot is not active.'
              )
            ]
      ),
      material: this.readinessDimension(
        resourceReadiness.material.ready ? 'READY' : 'BLOCKED',
        `${resourceReadiness.material.totalReserved}/${resourceReadiness.material.totalRequired} material reserved or satisfied.`,
        resourceReadiness.material.blockers.map((item) => this.fromResourceBlocker(item))
      ),
      personnel: this.readinessDimension(
        resourceReadiness.personnel.ready ? 'READY' : 'BLOCKED',
        `${resourceReadiness.personnel.totalEligible}/${resourceReadiness.personnel.totalRequired} confirmed eligible personnel.`,
        resourceReadiness.personnel.blockers.map((item) => this.fromResourceBlocker(item))
      ),
      tools: this.readinessDimension(
        toolReady ? (toolRequired ? 'READY' : 'NOT_REQUIRED') : 'BLOCKED',
        toolRequired
          ? `${resourceReadiness.tools.totalAllocated}/${resourceReadiness.tools.totalRequired} tools allocated and staged.`
          : 'No mandatory tool requirement declared.',
        toolReady
          ? []
          : [
              this.facilityBlocker(
                'TOOL_NOT_STAGED',
                slot.id,
                'Required allocated tools are not staged at this bay.'
              )
            ]
      ),
      gse: this.readinessDimension(
        gseMandatory.length === 0 ? 'NOT_REQUIRED' : gseReady ? 'READY' : 'BLOCKED',
        gseMandatory.length === 0
          ? 'No mandatory GSE requirement declared.'
          : `${gseMandatory.reduce((sum, item) => sum + item.stagedQuantity, 0)}/${gseMandatory.reduce((sum, item) => sum + item.quantity, 0)} mandatory GSE staged.`,
        gseReady
          ? []
          : [
              this.facilityBlocker(
                'GSE_NOT_STAGED',
                slot.id,
                'Mandatory GSE has not been staged at the bay.'
              )
            ]
      )
    };
    const blockers = Object.values(dimensions).flatMap((dimension) => dimension.blockers);
    return {
      slotId: slot.id,
      workPackageId: slot.workPackageId,
      aircraftId: slot.aircraftId,
      status: blockers.length === 0 ? 'READY' : 'BLOCKED',
      evaluatedAt: now(),
      dimensions,
      manpowerCapacity: resourceReadiness.personnel.requirements.map((requirement) => {
        const assigned = resourceReadiness.personnel.assignments.filter(
          (assignment) =>
            assignment.personnelRequirementId === requirement.id &&
            assignment.status === 'CONFIRMED' &&
            assignment.eligibilityStatus === 'ELIGIBLE'
        );
        return {
          roleType: requirement.roleType,
          required: requirement.requiredCount,
          availableEligible: Math.max(assigned.length, 0),
          assigned: assigned.length,
          status: assigned.length >= requirement.requiredCount ? 'READY' : 'BLOCKED'
        };
      })
    };
  }

  evaluateMaintenanceOperationalAvailability(
    aircraftId: string
  ): MaintenanceOperationalAvailabilityDto {
    return evaluateMaintenanceOperationalAvailability(this.sqlite, aircraftId);
  }

  requestAircraftMoveIn(
    slotId: string,
    input: MaintenanceFacilityCommandInput,
    actor: MaintenanceActor
  ): MaintenanceAircraftCustodyDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    let custodyId: string | null = null;
    this.runImmediateMaintenanceTransaction(() => {
      if (input.idempotencyKey) {
        const existing = this.sqlite
          .prepare(
            `SELECT id FROM maintenance_aircraft_custodies WHERE slot_id = ? AND request_idempotency_key = ?`
          )
          .get(slotId, input.idempotencyKey) as SqlRow | undefined;
        if (existing) {
          custodyId = String(existing.id);
          return;
        }
      }
      const slot = this.requireMaintenanceSlot(slotId);
      if (slot.status !== 'BOOKED') {
        throw maintenanceError(
          'MAINTENANCE_SLOT_NOT_BOOKED',
          'Only booked slots can receive aircraft move-in.',
          409,
          {
            impact: 'Aircraft tidak dipindahkan ke custody Maintenance.',
            requiredAction: 'Gunakan slot berstatus BOOKED.',
            referenceId: slotId
          }
        );
      }
      const readiness = this.evaluateMaintenanceSlotReadiness(slotId);
      if (readiness.status !== 'READY') {
        throw maintenanceError(
          'FACILITY_NOT_READY',
          'Maintenance slot is not ready to receive aircraft.',
          409,
          {
            impact: 'Aircraft belum dapat masuk ke fasilitas maintenance.',
            requiredAction: 'Selesaikan blocker facility readiness terlebih dahulu.',
            referenceId: slotId,
            blockers: readiness.dimensions
          }
        );
      }
      this.assertNoActiveBayOccupancy(slot.bayId, slotId);
      this.assertNoActiveAircraftCustody(slot.aircraftId, slotId);
      const timestamp = now();
      custodyId = `mcust-${nanoid(12)}`;
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_aircraft_custodies (
            id, slot_id, work_package_id, aircraft_id, facility_id, area_id, bay_id, status,
            request_idempotency_key, actual_start_at, note, created_by_user_id, created_at,
            updated_by_user_id, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'MOVING_IN', ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          custodyId,
          slot.id,
          slot.workPackageId,
          slot.aircraftId,
          slot.facilityId,
          slot.areaId,
          slot.bayId,
          input.idempotencyKey ?? null,
          timestamp,
          input.note ?? null,
          actor.userId,
          timestamp,
          actor.userId,
          timestamp
        );
      this.sqlite
        .prepare(
          `UPDATE maintenance_slots
           SET status = 'IN_PROGRESS', actual_start_at = COALESCE(actual_start_at, ?),
               updated_by_user_id = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(timestamp, actor.userId, timestamp, slot.id);
      this.recordCustodyEvent(
        custodyId,
        slot,
        null,
        'MOVING_IN',
        'AIRCRAFT_MOVE_IN_REQUESTED',
        actor,
        input.note ?? null,
        timestamp
      );
      this.audit(
        'MAINTENANCE_CUSTODY',
        custodyId,
        'AIRCRAFT_MOVE_IN_REQUESTED',
        actor,
        null,
        null,
        {
          slotId,
          workPackageId: slot.workPackageId,
          aircraftId: slot.aircraftId,
          bayId: slot.bayId
        }
      );
    });
    return this.requireAircraftCustody(custodyId!);
  }

  confirmAircraftInBay(
    slotId: string,
    input: MaintenanceFacilityCommandInput,
    actor: MaintenanceActor
  ): MaintenanceAircraftCustodyDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    const custody = this.requireActiveCustodyForSlot(slotId);
    if (custody.status !== 'MOVING_IN') {
      return custody;
    }
    this.assertNoActiveBayOccupancy(custody.bayId, slotId, custody.id);
    const timestamp = now();
    this.sqlite
      .prepare(
        `UPDATE maintenance_aircraft_custodies
         SET status = 'IN_BAY', in_bay_at = COALESCE(in_bay_at, ?), note = COALESCE(?, note),
             updated_by_user_id = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, input.note ?? null, actor.userId, timestamp, custody.id);
    const slot = this.requireMaintenanceSlot(slotId);
    this.recordCustodyEvent(
      custody.id,
      slot,
      'MOVING_IN',
      'IN_BAY',
      'AIRCRAFT_ENTERED_BAY',
      actor,
      input.note ?? null,
      timestamp
    );
    this.audit('MAINTENANCE_CUSTODY', custody.id, 'AIRCRAFT_ENTERED_BAY', actor, null, null, {
      slotId,
      bayId: custody.bayId
    });
    return this.requireAircraftCustody(custody.id);
  }

  markAircraftReadyForMoveOut(
    slotId: string,
    input: MaintenanceFacilityCommandInput,
    actor: MaintenanceActor
  ): MaintenanceAircraftCustodyDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    const custody = this.requireActiveCustodyForSlot(slotId);
    if (custody.status !== 'IN_BAY') {
      return custody;
    }
    const workPackage = this.requireWorkPackage(custody.workPackageId);
    if (!nullableText(workPackage.release_id)) {
      throw maintenanceError(
        'AIRCRAFT_NOT_RELEASED_FOR_MOVE_OUT',
        'Technical Release must be completed before move-out.',
        409,
        {
          impact: 'Aircraft tetap berada dalam custody Maintenance.',
          requiredAction: 'Selesaikan Technical Release terlebih dahulu.',
          referenceId: custody.workPackageId
        }
      );
    }
    const timestamp = now();
    this.sqlite
      .prepare(
        `UPDATE maintenance_aircraft_custodies
         SET status = 'READY_FOR_MOVE_OUT', ready_for_move_out_at = ?, note = COALESCE(?, note),
             updated_by_user_id = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, input.note ?? null, actor.userId, timestamp, custody.id);
    const slot = this.requireMaintenanceSlot(slotId);
    this.recordCustodyEvent(
      custody.id,
      slot,
      'IN_BAY',
      'READY_FOR_MOVE_OUT',
      'AIRCRAFT_READY_FOR_MOVE_OUT',
      actor,
      input.note ?? null,
      timestamp
    );
    this.audit(
      'MAINTENANCE_CUSTODY',
      custody.id,
      'AIRCRAFT_READY_FOR_MOVE_OUT',
      actor,
      null,
      null,
      {
        slotId,
        releaseId: nullableText(workPackage.release_id)
      }
    );
    return this.requireAircraftCustody(custody.id);
  }

  moveAircraftOut(
    slotId: string,
    input: MaintenanceFacilityCommandInput,
    actor: MaintenanceActor
  ): MaintenanceAircraftCustodyDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    const custody = this.requireActiveCustodyForSlot(slotId);
    if (!['READY_FOR_MOVE_OUT', 'MOVING_OUT'].includes(custody.status)) {
      throw maintenanceError(
        'AIRCRAFT_NOT_RELEASED_FOR_MOVE_OUT',
        'Aircraft is not ready for move-out.',
        409,
        {
          impact: 'Aircraft tidak dipindahkan keluar.',
          requiredAction: 'Tandai ready for move-out setelah Technical Release.',
          referenceId: custody.id
        }
      );
    }
    if (custody.status === 'MOVING_OUT') return custody;
    const timestamp = now();
    this.sqlite
      .prepare(
        `UPDATE maintenance_aircraft_custodies
         SET status = 'MOVING_OUT', moving_out_at = ?, note = COALESCE(?, note),
             updated_by_user_id = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, input.note ?? null, actor.userId, timestamp, custody.id);
    const slot = this.requireMaintenanceSlot(slotId);
    this.recordCustodyEvent(
      custody.id,
      slot,
      'READY_FOR_MOVE_OUT',
      'MOVING_OUT',
      'AIRCRAFT_MOVED_OUT',
      actor,
      input.note ?? null,
      timestamp
    );
    this.audit('MAINTENANCE_CUSTODY', custody.id, 'AIRCRAFT_MOVED_OUT', actor, null, null, {
      slotId
    });
    return this.requireAircraftCustody(custody.id);
  }

  handbackAircraft(
    slotId: string,
    input: MaintenanceFacilityCommandInput,
    actor: MaintenanceActor
  ): MaintenanceAircraftCustodyDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    let custodyId: string | null = null;
    this.runImmediateMaintenanceTransaction(() => {
      if (input.idempotencyKey) {
        const existing = this.sqlite
          .prepare(
            `SELECT id FROM maintenance_aircraft_custodies WHERE slot_id = ? AND handback_idempotency_key = ?`
          )
          .get(slotId, input.idempotencyKey) as SqlRow | undefined;
        if (existing) {
          custodyId = String(existing.id);
          return;
        }
      }
      const custody = this.requireActiveCustodyForSlot(slotId);
      if (!['MOVING_OUT', 'HANDBACK_PENDING'].includes(custody.status)) {
        throw maintenanceError(
          'HANDBACK_NOT_ALLOWED',
          'Aircraft is not ready for operational handback.',
          409,
          {
            impact: 'Custody Maintenance belum ditutup.',
            requiredAction: 'Lakukan move-out setelah Technical Release sebelum handback.',
            referenceId: custody.id
          }
        );
      }
      const timestamp = now();
      this.sqlite
        .prepare(
          `UPDATE maintenance_aircraft_custodies
           SET status = 'HANDED_BACK', handback_idempotency_key = COALESCE(?, handback_idempotency_key),
               handed_back_at = ?, handed_back_by_user_id = ?, note = COALESCE(?, note),
               updated_by_user_id = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          input.idempotencyKey ?? null,
          timestamp,
          actor.userId,
          input.note ?? null,
          actor.userId,
          timestamp,
          custody.id
        );
      this.sqlite
        .prepare(
          `UPDATE maintenance_slots
           SET status = 'COMPLETED', actual_end_at = COALESCE(actual_end_at, ?),
               updated_by_user_id = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(timestamp, actor.userId, timestamp, slotId);
      const slot = this.requireMaintenanceSlot(slotId);
      this.recordCustodyEvent(
        custody.id,
        slot,
        custody.status,
        'HANDED_BACK',
        'MAINTENANCE_HANDBACK_COMPLETED',
        actor,
        input.note ?? null,
        timestamp
      );
      this.audit(
        'MAINTENANCE_CUSTODY',
        custody.id,
        'MAINTENANCE_HANDBACK_COMPLETED',
        actor,
        null,
        null,
        {
          slotId,
          workPackageId: custody.workPackageId,
          aircraftId: custody.aircraftId
        }
      );
      custodyId = custody.id;
    });
    return this.requireAircraftCustody(custodyId!);
  }

  createFacilityShift(
    input: CreateMaintenanceFacilityShiftInput,
    actor: MaintenanceActor
  ): MaintenanceFacilityShiftDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    const hierarchy = this.requireFacilityHierarchy({
      facilityId: input.facilityId,
      areaId: this.firstAreaForFacility(input.facilityId),
      bayId: this.firstBayForFacility(input.facilityId),
      plannedStartAt: input.startAt,
      plannedEndAt: input.endAt
    });
    const id = `mshift-${nanoid(12)}`;
    const timestamp = now();
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_facility_shifts (
          id, facility_id, shift_date, name, start_at, end_at, status, supervisor_personnel_id,
          created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'PLANNED', ?, ?, ?, ?)`
      )
      .run(
        id,
        input.facilityId,
        input.shiftDate,
        input.name,
        this.toCanonicalSlotTimestamp(input.startAt),
        this.toCanonicalSlotTimestamp(input.endAt),
        input.supervisorPersonnelId ?? null,
        actor.userId,
        timestamp,
        timestamp
      );
    this.audit('MAINTENANCE_SHIFT', id, 'MAINTENANCE_SHIFT_CREATED', actor, null, null, {
      facilityId: String(hierarchy.facility_id)
    });
    return this.requireFacilityShift(id);
  }

  addShiftRoster(shiftId: string, input: AddMaintenanceShiftRosterInput, actor: MaintenanceActor) {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    const shift = this.requireFacilityShift(shiftId);
    const timestamp = now();
    const id = `mroster-${nanoid(12)}`;
    this.sqlite
      .prepare(
        `INSERT OR IGNORE INTO maintenance_facility_shift_roster (
          id, shift_id, personnel_id, role_type, active, created_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?)`
      )
      .run(id, shift.id, input.personnelId, input.roleType, actor.userId, timestamp);
    this.audit(
      'MAINTENANCE_SHIFT',
      shiftId,
      'MAINTENANCE_SHIFT_ROSTERED',
      actor,
      null,
      null,
      input
    );
    return this.requireFacilityShift(shiftId);
  }

  prepareShiftHandover(
    slotId: string,
    input: PrepareMaintenanceShiftHandoverInput,
    actor: MaintenanceActor
  ): MaintenanceShiftHandoverDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    const slot = this.requireMaintenanceSlot(slotId);
    const outgoing = this.requireFacilityShift(input.outgoingShiftId);
    const incoming = this.requireFacilityShift(input.incomingShiftId);
    if (outgoing.id === incoming.id) {
      throw maintenanceError(
        'SHIFT_HANDOVER_INVALID',
        'Outgoing and incoming shift must be different.',
        422,
        {
          impact: 'Handover tidak dibuat.',
          requiredAction: 'Pilih shift penerima yang berbeda.',
          referenceId: slotId
        }
      );
    }
    const timestamp = now();
    const id = `mhand-${nanoid(12)}`;
    const outstanding = this.outstandingWorkReferences(slot.workPackageId);
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_shift_handovers (
          id, slot_id, work_package_id, aircraft_id, outgoing_shift_id, incoming_shift_id,
          status, notes, safety_notes_json, outstanding_refs_json, prepared_by_user_id,
          prepared_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'PREPARED', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        slot.id,
        slot.workPackageId,
        slot.aircraftId,
        outgoing.id,
        incoming.id,
        input.notes,
        JSON.stringify(input.safetyNotes),
        JSON.stringify(outstanding),
        actor.userId,
        timestamp,
        timestamp
      );
    this.audit('SHIFT_HANDOVER', id, 'SHIFT_HANDOVER_PREPARED', actor, null, null, {
      slotId,
      outstanding
    });
    return this.requireShiftHandover(id);
  }

  acknowledgeShiftHandover(
    handoverId: string,
    input: AcknowledgeMaintenanceShiftHandoverInput,
    actor: MaintenanceActor
  ): MaintenanceShiftHandoverDto {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    const handover = this.requireShiftHandover(handoverId);
    if (handover.status === 'ACKNOWLEDGED') return handover;
    const timestamp = now();
    this.sqlite
      .prepare(
        `UPDATE maintenance_shift_handovers
         SET status = 'ACKNOWLEDGED', acknowledged_by_user_id = ?, acknowledged_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(actor.userId, timestamp, timestamp, handoverId);
    this.audit('SHIFT_HANDOVER', handoverId, 'SHIFT_HANDOVER_ACKNOWLEDGED', actor, null, null, {
      note: input.note ?? null
    });
    return this.requireShiftHandover(handoverId);
  }

  getFacilityOperations(
    query: MaintenanceFacilityOccupancyQuery,
    actor: MaintenanceActor
  ): MaintenanceFacilityOperationsDto {
    const activeOccupancy = this.listMaintenanceOccupancy(query, actor);
    const completedOccupancy = query.status
      ? null
      : this.listMaintenanceOccupancy({ ...query, status: 'COMPLETED' }, actor);
    const occupancy = completedOccupancy
      ? {
          ...activeOccupancy,
          slots: [...activeOccupancy.slots, ...completedOccupancy.slots].filter(
            (slot, index, all) => all.findIndex((candidate) => candidate.id === slot.id) === index
          )
        }
      : activeOccupancy;
    const readiness = occupancy.slots.map((slot) => this.evaluateMaintenanceSlotReadiness(slot.id));
    return {
      generatedAt: now(),
      facilities: this.listMaintenanceFacilities(),
      occupancy,
      readiness,
      custodies: this.listAircraftCustodies({
        dateFrom: occupancy.dateFrom,
        dateTo: occupancy.dateTo
      }),
      gseRequirements: occupancy.slots.flatMap((slot) =>
        this.listGseRequirements(slot.workPackageId)
      ),
      gseAllocations: occupancy.slots.flatMap((slot) =>
        this.listGseAllocations(slot.workPackageId)
      ),
      staging: occupancy.slots.flatMap((slot) => this.listResourceStaging(slot.id)),
      shifts: this.listFacilityShifts(query.facilityId),
      handovers: occupancy.slots.flatMap((slot) => this.listShiftHandovers(slot.id))
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
            id, package_number, aircraft_id, source_flight_id, primary_defect_id,
            source_due_requirement_id, source_due_status_id, title,
            priority, execution_mode, vendor_id, status, planning_note,
            version, created_by_user_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          packageNumber,
          input.aircraftId,
          input.sourceFlightId ?? null,
          input.primaryDefectId ?? null,
          null,
          null,
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
      if (input.primaryDefectId) {
        this.sqlite
          .prepare(
            `UPDATE aircraft_deferments
             SET follow_up_work_package_id = COALESCE(follow_up_work_package_id, ?),
                 updated_at = ?
             WHERE defect_id = ? AND aircraft_id = ? AND status IN ('ACTIVE', 'EXPIRED')`
          )
          .run(id, timestamp, input.primaryDefectId, input.aircraftId);
      }
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
        if (initialJobCard.approvedDataRevisionId) {
          this.linkApprovedDataRevisionToJobCard(
            initialJobCardId,
            initialJobCard.approvedDataRevisionId,
            'Initial job-card controlled approved-data snapshot'
          );
        }
      }
    })();
    return this.getWorkPackage(id);
  }

  createWorkPackageFromDueStatus(
    dueStatusId: string,
    input: CreateWorkPackageFromDueInput,
    actor: MaintenanceActor
  ) {
    this.assertMaintenancePermission(actor, 'maintenance.package.plan');
    const timestamp = now();
    let workPackageId = '';
    this.sqlite.transaction(() => {
      const due = this.sqlite
        .prepare(
          `SELECT status.*, requirement.code, requirement.title, requirement.mandatory,
                  requirement.active, requirement.recurring, requirement.interval_calendar_days,
                  requirement.interval_flight_hours, requirement.interval_flight_cycles,
                  aircraft.registration_number AS aircraft_registration_number,
                  aircraft.airframe_hours, aircraft.airframe_cycles
           FROM maintenance_aircraft_requirement_statuses status
           JOIN maintenance_due_requirements requirement ON requirement.id = status.requirement_id
           JOIN aircraft ON aircraft.id = status.aircraft_id
           WHERE status.id = ?`
        )
        .get(dueStatusId) as SqlRow | undefined;
      if (!due) {
        throw maintenanceError(
          'MAINTENANCE_REQUIREMENT_NOT_FOUND',
          'Maintenance due item was not found.',
          404,
          {
            impact: 'Work Package tidak dibuat.',
            requiredAction: 'Refresh Due Control dan pilih item maintenance yang valid.',
            referenceId: dueStatusId
          }
        );
      }
      if (!Boolean(due.active) || String(due.status) === 'INACTIVE') {
        throw maintenanceError(
          'MAINTENANCE_REQUIREMENT_INACTIVE',
          'Maintenance due item is inactive.',
          422,
          {
            impact: 'Work Package tidak dibuat.',
            requiredAction: 'Pilih requirement aktif yang masih berlaku untuk aircraft.',
            referenceId: dueStatusId
          }
        );
      }
      const existing = nullableText(due.planned_work_package_id)
        ? (this.sqlite
            .prepare(
              `SELECT id, status
               FROM maintenance_work_packages
               WHERE id = ? AND status <> 'CANCELLED'
               LIMIT 1`
            )
            .get(String(due.planned_work_package_id)) as SqlRow | undefined)
        : undefined;
      if (existing) {
        workPackageId = String(existing.id);
        return;
      }

      workPackageId = `mwp-${nanoid(12)}`;
      const packageNumber = `MWP-${timestamp.slice(0, 10).replaceAll('-', '')}-${nanoid(5).toUpperCase()}`;
      const planningNote = this.duePlanningNote(due, input);
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_work_packages (
            id, package_number, aircraft_id, source_flight_id, primary_defect_id,
            source_due_requirement_id, source_due_status_id, title,
            priority, execution_mode, vendor_id, status, planning_note,
            version, created_by_user_id, created_at, updated_at
          ) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, 'INTERNAL', NULL, 'OPEN', ?, 1, ?, ?, ?)`
        )
        .run(
          workPackageId,
          packageNumber,
          String(due.aircraft_id),
          String(due.requirement_id),
          dueStatusId,
          `Planned maintenance - ${String(due.code)} ${String(due.title)}`,
          String(due.status) === 'OVERDUE' ? 'HIGH' : 'NORMAL',
          planningNote,
          actor.userId,
          timestamp,
          timestamp
        );
      this.sqlite
        .prepare(
          `UPDATE maintenance_aircraft_requirement_statuses
           SET planned_work_package_id = ?, calculated_at = ?
           WHERE id = ? AND planned_work_package_id IS NULL`
        )
        .run(workPackageId, timestamp, dueStatusId);
      const statusAfterUpdate = this.sqlite
        .prepare(
          'SELECT planned_work_package_id FROM maintenance_aircraft_requirement_statuses WHERE id = ?'
        )
        .get(dueStatusId) as SqlRow | undefined;
      if (nullableText(statusAfterUpdate?.planned_work_package_id) !== workPackageId) {
        const concurrent = this.sqlite
          .prepare(
            `SELECT id
             FROM maintenance_work_packages
             WHERE id = ? AND status <> 'CANCELLED'
             LIMIT 1`
          )
          .get(nullableText(statusAfterUpdate?.planned_work_package_id) ?? '') as
          SqlRow | undefined;
        if (concurrent) {
          workPackageId = String(concurrent.id);
          return;
        }
        throw maintenanceError(
          'WORK_PACKAGE_ALREADY_PLANNED',
          'Maintenance due item already has an active Work Package.',
          409,
          {
            impact: 'Work Package tidak dibuat ulang.',
            requiredAction: 'Buka Work Package aktif yang sudah direncanakan untuk item ini.',
            referenceId: dueStatusId
          }
        );
      }
      this.audit('WORK_PACKAGE', workPackageId, 'CREATE_FROM_DUE_REQUIREMENT', actor, null, 1, {
        packageNumber,
        dueStatusId,
        requirementId: String(due.requirement_id),
        requirementCode: String(due.code),
        aircraftId: String(due.aircraft_id)
      });
      this.audit(
        'DUE_REQUIREMENT',
        String(due.requirement_id),
        'WP_CREATED_FROM_REQUIREMENT',
        actor,
        null,
        null,
        {
          dueStatusId,
          workPackageId,
          packageNumber,
          statusAtPlanning: String(due.status)
        }
      );
    })();
    return this.getWorkPackage(workPackageId);
  }

  assessDefect(defectId: string, input: MaintenanceDefectAssessmentInput, actor: MaintenanceActor) {
    this.assertMaintenancePermission(actor, 'maintenance.defect.assess');
    const defect = this.requireDefect(defectId);
    if (!['OPEN', 'DEFERRED'].includes(String(defect.status))) {
      throw maintenanceError(
        'MAINTENANCE_DEFECT_NOT_ASSESSABLE',
        'Defect is not open for maintenance assessment.',
        422,
        {
          impact: 'Assessment was not recorded.',
          requiredAction: 'Select an open defect that still requires maintenance decision.',
          referenceId: defectId
        }
      );
    }
    const timestamp = now();
    const id = `massess-${nanoid(12)}`;
    const aircraft = this.sqlite
      .prepare('SELECT serviceability_status FROM aircraft WHERE id = ?')
      .get(String(defect.aircraft_id)) as { serviceability_status: string } | undefined;
    if (!aircraft) throw new DomainError('AIRCRAFT_NOT_FOUND', 'Aircraft was not found.', 404);
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
        if (input.assessmentDecision === 'GROUND') {
          this.sqlite
            .prepare(
              `UPDATE aircraft
               SET serviceability_status = 'UNSERVICEABLE',
                   serviceability_note = ?,
                   version = version + 1,
                   updated_at = ?
               WHERE id = ?`
            )
            .run(
              `NO-GO assessment: ${input.assessmentNote}`,
              timestamp,
              String(defect.aircraft_id)
            );
          this.recordAircraftHistory(
            String(defect.aircraft_id),
            aircraft.serviceability_status,
            'UNSERVICEABLE',
            `NO-GO maintenance assessment for defect ${String(defect.defect_number)}`,
            'DEFECT_ASSESSMENT',
            id,
            actor
          );
          this.audit('AIRCRAFT', String(defect.aircraft_id), 'DEFECT_NO_GO', actor, null, null, {
            defectId,
            assessmentId: id,
            defectNumber: String(defect.defect_number)
          });
        } else if (input.assessmentDecision === 'DEFER') {
          const deferment = input.deferment;
          if (!deferment) {
            throw maintenanceError(
              'MAINTENANCE_DEFERMENT_DETAILS_REQUIRED',
              'Deferred assessment requires deferment control details.',
              422,
              {
                impact: 'Assessment was not recorded.',
                requiredAction: 'Provide restriction, target, expiry, and deferment reference.',
                referenceId: defectId
              }
            );
          }
          const defermentId = `adefer-${nanoid(12)}`;
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
              String(defect.aircraft_id),
              defectId,
              deferment.defermentType ?? 'MEL',
              deferment.referenceCode,
              deferment.category ?? null,
              deferment.operationalLimitations,
              deferment.maintenanceProcedure ?? null,
              deferment.operationsProcedure ?? null,
              deferment.targetRectificationAt ?? null,
              deferment.effectiveAt,
              deferment.expiresAt,
              id,
              actor.userId,
              deferment.authorizationReference,
              JSON.stringify(deferment.applicableRouteIds ?? []),
              JSON.stringify(deferment.applicableServiceTypeCodes ?? []),
              timestamp,
              timestamp
            );
          this.sqlite
            .prepare(
              `UPDATE aircraft_defects
               SET status = 'DEFERRED', version = version + 1, updated_at = ?
               WHERE id = ?`
            )
            .run(timestamp, defectId);
          this.sqlite
            .prepare(
              `UPDATE aircraft
               SET serviceability_note = ?, version = version + 1, updated_at = ?
               WHERE id = ?`
            )
            .run(
              `Deferred defect ${String(defect.defect_number)}: ${deferment.operationalLimitations}`,
              timestamp,
              String(defect.aircraft_id)
            );
          this.recordAircraftHistory(
            String(defect.aircraft_id),
            aircraft.serviceability_status,
            aircraft.serviceability_status,
            `Deferred defect ${String(defect.defect_number)} recorded with operational limitation.`,
            'DEFECT_DEFERMENT',
            defermentId,
            actor
          );
          this.audit('DEFERMENT', defermentId, 'CREATE', actor, null, null, {
            defectId,
            assessmentId: id,
            referenceCode: deferment.referenceCode,
            expiresAt: deferment.expiresAt,
            targetRectificationAt: deferment.targetRectificationAt
          });
        } else {
          this.sqlite
            .prepare(
              `UPDATE aircraft_defects
               SET status = 'CLOSED', rectification_note = ?, rectified_at = ?,
                   rectified_by_user_id = ?, version = version + 1, updated_at = ?
               WHERE id = ?`
            )
            .run(input.assessmentNote, timestamp, actor.userId, timestamp, defectId);
          this.audit('DEFECT', defectId, 'NO_IMPACT_CLOSED', actor, null, null, {
            assessmentId: id
          });
        }
      })();
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        const code = String(error).includes('aircraft_deferments.defect_id')
          ? 'DEFERMENT_ALREADY_ACTIVE'
          : 'MAINTENANCE_DEFECT_ALREADY_ASSESSED';
        throw new DomainError(
          code,
          code === 'DEFERMENT_ALREADY_ACTIVE'
            ? 'Defect already has an active deferment record.'
            : 'Defect already has a maintenance assessment.',
          409
        );
      }
      throw error;
    }
    this.airworthiness.recalculateAfterMaintenanceRelease(String(defect.aircraft_id), actor.userId);
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

  closeDeferredDefect(
    defectId: string,
    input: MaintenanceDeferredCloseInput,
    actor: MaintenanceActor
  ) {
    this.assertMaintenancePermission(actor, 'maintenance.defect.assess');
    const timestamp = now();
    const defect = this.requireDefect(defectId);
    const deferment = this.sqlite
      .prepare(
        `SELECT *
         FROM aircraft_deferments
         WHERE defect_id = ? AND status IN ('ACTIVE', 'EXPIRED')
         LIMIT 1`
      )
      .get(defectId) as SqlRow | undefined;
    if (!deferment) {
      throw maintenanceError('DEFERMENT_NOT_FOUND', 'Active deferred defect was not found.', 404, {
        impact: 'Deferred defect was not closed.',
        requiredAction: 'Refresh the defect list and select an active deferred defect.',
        referenceId: defectId
      });
    }
    const releasedPackage = this.sqlite
      .prepare(
        `SELECT id, package_number
         FROM maintenance_work_packages
         WHERE primary_defect_id = ? AND status = 'RELEASED'
         ORDER BY released_at DESC
         LIMIT 1`
      )
      .get(defectId) as { id: string; package_number: string } | undefined;
    if (!releasedPackage || String(defect.status) !== 'RECTIFIED') {
      throw maintenanceError(
        'RECTIFICATION_REQUIRED',
        'Defect cannot be closed before rectification is released.',
        422,
        {
          impact: 'Deferred defect remains active.',
          requiredAction: 'Complete and release the linked rectification Work Package first.',
          referenceId: defectId
        }
      );
    }

    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `UPDATE aircraft_deferments
           SET status = 'CLOSED', follow_up_work_package_id = COALESCE(follow_up_work_package_id, ?),
               closed_at = ?, closed_by_user_id = ?, closure_note = ?, updated_at = ?
           WHERE id = ? AND status IN ('ACTIVE', 'EXPIRED')`
        )
        .run(
          releasedPackage.id,
          timestamp,
          actor.userId,
          input.closureNote,
          timestamp,
          String(deferment.id)
        );
      this.sqlite
        .prepare(
          `UPDATE aircraft_defects
           SET status = 'CLOSED', rectification_note = ?, version = version + 1, updated_at = ?
           WHERE id = ?`
        )
        .run(input.closureNote, timestamp, defectId);
      this.audit('DEFERMENT', String(deferment.id), 'CLOSE', actor, null, null, {
        defectId,
        releasedWorkPackageId: releasedPackage.id,
        releasedPackageNumber: releasedPackage.package_number,
        evidenceReferences: input.evidenceReferences
      });
      this.audit('DEFECT', defectId, 'CLOSE_DEFERRED', actor, null, null, {
        defermentId: String(deferment.id),
        releasedWorkPackageId: releasedPackage.id
      });
    })();
    this.airworthiness.recalculateAfterMaintenanceRelease(String(defect.aircraft_id), actor.userId);
    return this.defectSummaries({ aircraftId: String(defect.aircraft_id) }).find(
      (item) => item.id === defectId
    );
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
      if (input.approvedDataRevisionId) {
        this.linkApprovedDataRevisionToJobCard(
          id,
          input.approvedDataRevisionId,
          'Job-card controlled approved-data snapshot'
        );
      }
    })();
    return this.getWorkPackage(workPackageId);
  }

  createNonRoutineFinding(
    workPackageId: string,
    input: CreateNonRoutineFindingInput,
    actor: MaintenanceActor
  ) {
    this.assertMaintenancePermission(actor, 'maintenance.jobcard.work.sign');
    const workPackage = this.requireWorkPackage(workPackageId);
    this.assertWorkPackageMutable(workPackage);
    const sourceCard = this.requireJobCard(input.sourceJobCardId);
    if (String(sourceCard.work_package_id) !== workPackageId) {
      throw maintenanceError(
        'INVALID_SOURCE_JOB_CARD',
        'Source job card does not belong to this work package.',
        422,
        {
          impact: 'Temuan non-routine tidak dibuat.',
          requiredAction: 'Pilih Job Card aktif dari Work Package yang sama.',
          referenceId: input.sourceJobCardId
        }
      );
    }
    if (String(sourceCard.status) !== 'IN_PROGRESS') {
      throw maintenanceError(
        'INVALID_SOURCE_JOB_CARD',
        'Non-routine findings can only be created from an active job card.',
        409,
        {
          impact: 'Temuan non-routine tidak dibuat.',
          requiredAction: 'Start Job Card terlebih dahulu sebelum mencatat temuan.',
          referenceId: input.sourceJobCardId
        }
      );
    }
    if (nullableText(sourceCard.source_non_routine_finding_id)) {
      throw maintenanceError(
        'INVALID_SOURCE_JOB_CARD',
        'Corrective non-routine job cards cannot be used as the source for a new finding.',
        409,
        {
          impact: 'Temuan non-routine tidak dibuat.',
          requiredAction: 'Catat temuan dari Job Card planned/originating, bukan corrective card.',
          referenceId: input.sourceJobCardId
        }
      );
    }

    const existing = input.idempotencyKey
      ? (this.sqlite
          .prepare(
            `SELECT * FROM maintenance_non_routine_findings
             WHERE create_idempotency_key = ?`
          )
          .get(input.idempotencyKey) as SqlRow | undefined)
      : null;
    if (existing) return this.getWorkPackage(String(existing.work_package_id));

    const timestamp = now();
    const id = `nr-${nanoid(12)}`;
    const findingNumber = `${String(workPackage.package_number)}-NR-${nanoid(4).toUpperCase()}`;
    try {
      this.sqlite.transaction(() => {
        this.sqlite
          .prepare(
            `INSERT INTO maintenance_non_routine_findings (
              id, work_package_id, aircraft_id, job_card_id, finding_number, title,
              description, severity, location, ata_chapter, immediate_safety_concern,
              evidence_references_json, status, created_by_user_id, created_at, updated_at,
              create_idempotency_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?)`
          )
          .run(
            id,
            workPackageId,
            String(workPackage.aircraft_id),
            input.sourceJobCardId,
            findingNumber,
            input.title,
            input.description,
            input.severity,
            input.location ?? null,
            input.ataChapter ?? null,
            input.immediateSafetyConcern ? 1 : 0,
            JSON.stringify(input.evidenceReferences),
            actor.userId,
            timestamp,
            timestamp,
            input.idempotencyKey ?? null
          );
        this.touchWorkPackage(workPackageId, number(workPackage.version));
        this.audit('NON_ROUTINE_FINDING', id, 'NR_CREATED', actor, null, 1, {
          workPackageId,
          sourceJobCardId: input.sourceJobCardId,
          findingNumber,
          severity: input.severity
        });
      })();
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw maintenanceError(
          'NON_ROUTINE_DUPLICATE_COMMAND',
          'Non-routine finding command was already processed.',
          409,
          {
            impact: 'Temuan non-routine tidak dibuat ulang.',
            requiredAction: 'Refresh Work Package dan lihat temuan yang sudah tercatat.',
            referenceId: workPackageId
          }
        );
      }
      throw error;
    }
    return this.getWorkPackage(workPackageId);
  }

  assessNonRoutineFinding(
    findingId: string,
    input: AssessNonRoutineFindingInput,
    actor: MaintenanceActor
  ) {
    this.assertMaintenancePermission(actor, 'maintenance.defect.assess');
    const finding = this.requireNonRoutineFinding(findingId);
    if (String(finding.status) === 'CLOSED') {
      throw maintenanceError(
        'NON_ROUTINE_ALREADY_CLOSED',
        'Non-routine finding is already closed.',
        409,
        {
          impact: 'Assessment tidak diubah.',
          requiredAction: 'Review history temuan yang sudah ditutup.',
          referenceId: findingId
        }
      );
    }
    if (nullableText(finding.disposition)) {
      throw maintenanceError(
        'NON_ROUTINE_ALREADY_ASSESSED',
        'Non-routine finding has already been assessed.',
        409,
        {
          impact: 'Assessment tidak ditimpa.',
          requiredAction: 'Gunakan proses perubahan terkendali bila assessment perlu direvisi.',
          referenceId: findingId
        }
      );
    }
    const workPackage = this.requireWorkPackage(String(finding.work_package_id));
    this.assertWorkPackageMutable(workPackage);
    const timestamp = now();
    const resolved = input.disposition === 'NO_ACTION';
    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `UPDATE maintenance_non_routine_findings
           SET status = ?, disposition = ?, assessment_note = ?, severity = ?,
               assessed_by_user_id = ?, assessed_at = ?, requires_independent_inspection = ?,
               approved_data_ref = ?, resolved_at = ?, resolved_by_user_id = ?,
               resolution_note = ?, version = version + 1, updated_at = ?
           WHERE id = ? AND disposition IS NULL AND status = 'OPEN'`
        )
        .run(
          resolved ? 'OPEN' : 'ADDED_TO_SCOPE',
          input.disposition,
          input.assessmentNote,
          input.priority,
          actor.userId,
          timestamp,
          input.requiresIndependentInspection ? 1 : 0,
          input.approvedDataRef ?? null,
          resolved ? timestamp : null,
          resolved ? actor.userId : null,
          resolved ? input.assessmentNote : null,
          timestamp,
          findingId
        );
      this.touchWorkPackage(String(workPackage.id), number(workPackage.version));
      this.audit('NON_ROUTINE_FINDING', findingId, 'NR_ASSESSED', actor, null, null, {
        disposition: input.disposition,
        requiresIndependentInspection: input.requiresIndependentInspection,
        approvedDataRef: input.approvedDataRef ?? null
      });
    })();
    return this.getWorkPackage(String(workPackage.id));
  }

  createCorrectiveJobCardForFinding(
    findingId: string,
    input: CreateCorrectiveJobCardFromFindingInput,
    actor: MaintenanceActor
  ) {
    this.assertMaintenancePermission(actor, 'maintenance.jobcard.manage');
    const finding = this.requireNonRoutineFinding(findingId);
    if (String(finding.disposition) !== 'CORRECTIVE_WORK_REQUIRED') {
      throw maintenanceError(
        'NON_ROUTINE_CORRECTIVE_WORK_NOT_REQUIRED',
        'Corrective work is not required for this finding.',
        409,
        {
          impact: 'Corrective Job Card tidak dibuat.',
          requiredAction: 'Review assessment temuan sebelum membuat pekerjaan korektif.',
          referenceId: findingId
        }
      );
    }
    if (nullableText(finding.corrective_job_card_id)) {
      throw maintenanceError(
        'CORRECTIVE_WORK_ALREADY_EXISTS',
        'Corrective job card already exists for this finding.',
        409,
        {
          impact: 'Pekerjaan korektif tidak dibuat ulang.',
          requiredAction: 'Lanjutkan Job Card korektif yang sudah terhubung.',
          referenceId: findingId
        }
      );
    }
    const workPackage = this.requireWorkPackage(String(finding.work_package_id));
    this.assertVersion(workPackage, input.expectedWorkPackageVersion);
    this.assertWorkPackageMutable(workPackage);
    const timestamp = now();
    const jobCardId = `mjc-${nanoid(12)}`;
    const cardNumber = `${String(workPackage.package_number)}-NRJC-${nanoid(4).toUpperCase()}`;
    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_job_cards (
            id, work_package_id, source_non_routine_finding_id, card_number, title, task_type,
            maintenance_data_ref, maintenance_data_revision, mandatory_flag,
            requires_independent_inspection, status, created_by_user_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'NON_ROUTINE', ?, ?, ?, ?, 'READY', ?, ?, ?)`
        )
        .run(
          jobCardId,
          String(workPackage.id),
          findingId,
          cardNumber,
          input.title,
          input.maintenanceDataRef,
          input.maintenanceDataRevision,
          input.mandatoryFlag ? 1 : 0,
          input.requiresIndependentInspection ? 1 : 0,
          actor.userId,
          timestamp,
          timestamp
        );
      this.sqlite
        .prepare(
          `UPDATE maintenance_non_routine_findings
           SET corrective_job_card_id = ?, requires_independent_inspection = ?,
               approved_data_ref = COALESCE(?, approved_data_ref),
               version = version + 1, updated_at = ?
           WHERE id = ? AND corrective_job_card_id IS NULL`
        )
        .run(
          jobCardId,
          input.requiresIndependentInspection ? 1 : 0,
          input.maintenanceDataRef,
          timestamp,
          findingId
        );
      this.touchWorkPackage(
        String(workPackage.id),
        input.expectedWorkPackageVersion,
        'IN_PROGRESS'
      );
      this.audit('JOB_CARD', jobCardId, 'CREATE_NON_ROUTINE_CORRECTIVE', actor, null, 1, {
        workPackageId: String(workPackage.id),
        findingId,
        findingNumber: String(finding.finding_number)
      });
      this.audit(
        'NON_ROUTINE_FINDING',
        findingId,
        'CORRECTIVE_JOB_CARD_CREATED',
        actor,
        null,
        null,
        {
          workPackageId: String(workPackage.id),
          jobCardId,
          cardNumber
        }
      );
      if (input.approvedDataRevisionId) {
        this.linkApprovedDataRevisionToJobCard(
          jobCardId,
          input.approvedDataRevisionId,
          'Non-routine corrective job-card approved-data snapshot'
        );
      }
    })();
    return this.getWorkPackage(String(workPackage.id));
  }

  resolveNonRoutineFinding(
    findingId: string,
    input: ResolveNonRoutineFindingInput,
    actor: MaintenanceActor
  ) {
    this.assertMaintenancePermission(actor, 'maintenance.defect.assess');
    const finding = this.requireNonRoutineFinding(findingId);
    if (String(finding.status) === 'CLOSED') {
      throw maintenanceError(
        'NON_ROUTINE_ALREADY_CLOSED',
        'Closed findings cannot be resolved again.',
        409,
        {
          impact: 'Resolusi tidak diubah.',
          requiredAction: 'Review history temuan yang sudah ditutup.',
          referenceId: findingId
        }
      );
    }
    if (nullableText(finding.resolved_at))
      return this.getWorkPackage(String(finding.work_package_id));
    this.assertNonRoutineResolutionReady(finding);
    const timestamp = now();
    const evidence = [
      ...new Set([...jsonArray(finding.evidence_references_json), ...input.evidenceReferences])
    ];
    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `UPDATE maintenance_non_routine_findings
           SET resolved_at = ?, resolved_by_user_id = ?, resolution_note = ?,
               evidence_references_json = ?, version = version + 1, updated_at = ?
           WHERE id = ? AND resolved_at IS NULL`
        )
        .run(
          timestamp,
          actor.userId,
          input.resolutionNote,
          JSON.stringify(evidence),
          timestamp,
          findingId
        );
      this.audit('NON_ROUTINE_FINDING', findingId, 'NR_RESOLVED', actor, null, null, {
        workPackageId: String(finding.work_package_id),
        correctiveJobCardId: nullableText(finding.corrective_job_card_id)
      });
    })();
    return this.getWorkPackage(String(finding.work_package_id));
  }

  closeNonRoutineFinding(
    findingId: string,
    input: CloseNonRoutineFindingInput,
    actor: MaintenanceActor
  ) {
    this.assertMaintenancePermission(actor, 'maintenance.defect.assess');
    const finding = this.requireNonRoutineFinding(findingId);
    if (String(finding.status) === 'CLOSED')
      return this.getWorkPackage(String(finding.work_package_id));
    if (!nullableText(finding.resolved_at)) {
      throw maintenanceError(
        'NON_ROUTINE_NOT_RESOLVED',
        'Non-routine finding cannot be closed before corrective requirements are resolved.',
        409,
        {
          impact: 'Temuan tetap terbuka dan release tetap diblokir.',
          requiredAction:
            'Selesaikan pekerjaan korektif, inspeksi, rework, dan material wajib terlebih dahulu.',
          referenceId: findingId
        }
      );
    }
    const timestamp = now();
    const evidence = [
      ...new Set([...jsonArray(finding.evidence_references_json), ...input.evidenceReferences])
    ];
    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `UPDATE maintenance_non_routine_findings
           SET status = 'CLOSED', closed_at = ?, closed_by_user_id = ?, closure_note = ?,
               evidence_references_json = ?, version = version + 1, updated_at = ?
           WHERE id = ? AND status <> 'CLOSED'`
        )
        .run(
          timestamp,
          actor.userId,
          input.closureNote,
          JSON.stringify(evidence),
          timestamp,
          findingId
        );
      this.audit('NON_ROUTINE_FINDING', findingId, 'NR_CLOSED', actor, null, null, {
        workPackageId: String(finding.work_package_id),
        correctiveJobCardId: nullableText(finding.corrective_job_card_id)
      });
    })();
    return this.getWorkPackage(String(finding.work_package_id));
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
        const inspectedAt = now();
        const inspectorSnapshot = this.evaluateControlledMaintenanceAuthorization(
          actor,
          String(workPackage.aircraft_id),
          input.certifyingLicenseNumber,
          inspectedAt,
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
          inspectedAt,
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
          const findingId = this.createQualityFindingForFailedInspection(
            workPackage,
            card,
            attemptId,
            reworkId,
            input.statement
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
              qualityFindingId: findingId,
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
      const signedAt = now();
      const authorizationSnapshot = this.evaluateControlledMaintenanceAuthorization(
        actor,
        String(workPackage.aircraft_id),
        input.certifyingLicenseNumber,
        signedAt,
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
          signedAt,
          signedAt,
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
    const eligibility = this.evaluateReleaseEligibility(workPackageId);
    this.assertEligibilityPassed(eligibility);
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
        const serverReleasedAt = now();
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
        const eligibility = this.evaluateReleaseEligibility(workPackageId);
        this.assertEligibilityPassed(eligibility);
        this.assertNoOpenReworkFindings(workPackageId);
        this.assertLinkedRestrictedReleaseCurrent(workPackage, {
          ...input,
          releasedAt: serverReleasedAt
        });
        const aircraft = this.requireAircraft(String(workPackage.aircraft_id));
        const signerSnapshot = this.validateSignerAuthorization(
          { ...input, releasedAt: serverReleasedAt },
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
        const canonicalDueStatusIds = this.canonicalDueStatusIdsForWorkPackage(workPackage);
        const release = this.airworthiness.issueMaintenanceScopedReleaseInOpenTransaction(
          String(workPackage.aircraft_id),
          {
            releaseNumber: input.releaseNumber,
            resultingStatus: input.resultingStatus,
            workOrderReference: String(workPackage.package_number),
            releaseStatement: input.releaseStatement,
            certifyingLicenseNumber: input.certifyingLicenseNumber,
            releasedAt: serverReleasedAt,
            defectIds,
            evidenceReferences: input.evidenceReferences,
            expectedVersion: number(aircraft.version)
          },
          { userId: actor.userId, role: actor.role },
          {
            maintenanceRequirementIds: requirementIds,
            exemptCanonicalDueStatusIds: canonicalDueStatusIds,
            signerAuthorizationSnapshot: signerSnapshot
          }
        );
        this.applyCanonicalDueComplianceForRelease(
          workPackage,
          release.releaseId,
          serverReleasedAt,
          actor
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
            serverReleasedAt,
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
        this.insertReleaseEligibilitySnapshot(
          workPackageId,
          release.releaseId,
          { ...eligibility, evaluatedAt: serverReleasedAt, eligible: true },
          {
            requirementIds,
            clientReleasedAt: input.releasedAt,
            serverReleasedAt,
            releaseNumber: input.releaseNumber
          }
        );
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
	         WHERE work_package_id = ?
             AND status IN ('OPEN', 'ADDED_TO_SCOPE')
             AND resolved_at IS NULL`
      )
      .all(workPackageId) as Array<{ finding_number: string; status: string }>;
    if (rows.length) {
      throw maintenanceError(
        'NON_ROUTINE_FINDING_OPEN',
        'Work package has open non-routine/rework findings.',
        422,
        {
          impact: 'Technical release was not issued and aircraft readiness was not changed.',
          requiredAction: 'Resolve and close all blocking non-routine findings before release.',
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

  private applyCanonicalDueComplianceForRelease(
    workPackage: SqlRow,
    releaseId: string,
    releasedAt: string,
    actor: MaintenanceActor
  ) {
    const statuses = this.sqlite
      .prepare(
        `SELECT status.*, requirement.code, requirement.title, requirement.recurring,
                requirement.interval_calendar_days, requirement.interval_flight_hours,
                requirement.interval_flight_cycles,
                aircraft.airframe_hours, aircraft.airframe_cycles
         FROM maintenance_aircraft_requirement_statuses status
         JOIN maintenance_due_requirements requirement ON requirement.id = status.requirement_id
         JOIN aircraft ON aircraft.id = status.aircraft_id
         WHERE status.aircraft_id = ?
           AND (
             status.planned_work_package_id = ?
             OR status.source_work_package_id = ?
             OR status.id = ?
           )`
      )
      .all(
        String(workPackage.aircraft_id),
        String(workPackage.id),
        String(workPackage.id),
        nullableText(workPackage.source_due_status_id) ?? ''
      ) as SqlRow[];

    for (const status of statuses) {
      const existing = this.sqlite
        .prepare(
          `SELECT id
           FROM maintenance_due_compliance_records
           WHERE status_id = ? AND release_id = ?
           LIMIT 1`
        )
        .get(String(status.id), releaseId) as SqlRow | undefined;
      if (existing) continue;

      const actualFlightHours = number(status.airframe_hours);
      const actualFlightCycles = number(status.airframe_cycles);
      const recurring = Boolean(status.recurring);
      const intervalCalendarDays =
        status.interval_calendar_days === null ? null : number(status.interval_calendar_days);
      const intervalFlightHours =
        status.interval_flight_hours === null ? null : number(status.interval_flight_hours);
      const intervalFlightCycles =
        status.interval_flight_cycles === null ? null : number(status.interval_flight_cycles);

      if (
        recurring &&
        intervalCalendarDays === null &&
        intervalFlightHours === null &&
        intervalFlightCycles === null
      ) {
        throw maintenanceError(
          'INVALID_DUE_BASIS',
          'Maintenance due basis is not valid for recurrence.',
          422,
          {
            impact: 'Technical release was not issued and requirement compliance was not recorded.',
            requiredAction: 'Fix the maintenance requirement interval before release.',
            referenceId: String(status.requirement_id)
          }
        );
      }

      const nextDueAt =
        recurring && intervalCalendarDays !== null
          ? this.addCalendarDays(releasedAt, intervalCalendarDays)
          : null;
      const nextDueFlightHours =
        recurring && intervalFlightHours !== null
          ? Number((actualFlightHours + intervalFlightHours).toFixed(2))
          : null;
      const nextDueFlightCycles =
        recurring && intervalFlightCycles !== null
          ? actualFlightCycles + intervalFlightCycles
          : null;
      const complianceId = `mdue-comp-${nanoid(12)}`;
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_due_compliance_records (
            id, requirement_id, aircraft_id, status_id, work_package_id, release_id,
            complied_at, complied_by_user_id, complied_flight_hours, complied_flight_cycles,
            previous_next_due_at, previous_next_due_flight_hours, previous_next_due_flight_cycles,
            next_due_at, next_due_flight_hours, next_due_flight_cycles, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          complianceId,
          String(status.requirement_id),
          String(status.aircraft_id),
          String(status.id),
          String(workPackage.id),
          releaseId,
          releasedAt,
          actor.userId,
          actualFlightHours,
          actualFlightCycles,
          nullableText(status.next_due_at),
          status.next_due_flight_hours === null ? null : number(status.next_due_flight_hours),
          status.next_due_flight_cycles === null ? null : number(status.next_due_flight_cycles),
          nextDueAt,
          nextDueFlightHours,
          nextDueFlightCycles,
          releasedAt
        );
      this.sqlite
        .prepare(
          `UPDATE maintenance_aircraft_requirement_statuses
           SET last_completed_at = ?,
               last_completed_flight_hours = ?,
               last_completed_flight_cycles = ?,
               next_due_at = ?,
               next_due_flight_hours = ?,
               next_due_flight_cycles = ?,
               status = ?,
               source_work_package_id = ?,
               source_job_card_id = NULL,
               last_compliance_record_id = ?,
               calculated_at = ?
           WHERE id = ?`
        )
        .run(
          releasedAt,
          actualFlightHours,
          actualFlightCycles,
          nextDueAt,
          nextDueFlightHours,
          nextDueFlightCycles,
          recurring ? 'NOT_DUE' : 'COMPLETED',
          String(workPackage.id),
          complianceId,
          releasedAt,
          String(status.id)
        );
      this.audit(
        'DUE_REQUIREMENT',
        String(status.requirement_id),
        'REQUIREMENT_COMPLIED',
        actor,
        null,
        null,
        {
          dueStatusId: String(status.id),
          workPackageId: String(workPackage.id),
          releaseId,
          complianceId,
          actualFlightHours,
          actualFlightCycles,
          previousNextDueAt: nullableText(status.next_due_at),
          previousNextDueFlightHours:
            status.next_due_flight_hours === null ? null : number(status.next_due_flight_hours),
          previousNextDueFlightCycles:
            status.next_due_flight_cycles === null ? null : number(status.next_due_flight_cycles),
          nextDueAt,
          nextDueFlightHours,
          nextDueFlightCycles
        }
      );
      this.audit(
        'DUE_REQUIREMENT',
        String(status.requirement_id),
        'NEXT_DUE_UPDATED',
        actor,
        null,
        null,
        {
          dueStatusId: String(status.id),
          complianceId,
          recurring,
          nextDueAt,
          nextDueFlightHours,
          nextDueFlightCycles
        }
      );
    }
  }

  private canonicalDueStatusIdsForWorkPackage(workPackage: SqlRow) {
    const rows = this.sqlite
      .prepare(
        `SELECT id
         FROM maintenance_aircraft_requirement_statuses
         WHERE aircraft_id = ?
           AND (
             planned_work_package_id = ?
             OR source_work_package_id = ?
             OR id = ?
           )`
      )
      .all(
        String(workPackage.aircraft_id),
        String(workPackage.id),
        String(workPackage.id),
        nullableText(workPackage.source_due_status_id) ?? ''
      ) as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  private addCalendarDays(dateTime: string, days: number) {
    const date = new Date(dateTime);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
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
        imageUrl: nullableText(row.image_url),
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
      where.push(
        `(defect.status IN ('OPEN', 'DEFERRED')
          OR (
            defect.status = 'RECTIFIED'
            AND EXISTS (
              SELECT 1 FROM aircraft_deferments open_deferment
              WHERE open_deferment.defect_id = defect.id
                AND open_deferment.status IN ('ACTIVE', 'EXPIRED')
            )
          ))`
      );
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
                aircraft.image_url AS aircraft_image_url,
                assessment.assessment_decision, assessment.assessment_note,
                deferment.id AS deferment_id,
                deferment.status AS deferment_status,
                deferment.effective_at AS deferment_effective_at,
                deferment.expires_at AS deferment_expires_at,
                deferment.target_rectification_at AS deferment_target_rectification_at,
                deferment.reference_code AS deferment_reference_code,
                deferment.operational_limitations AS deferment_operational_limitations,
                flight.id AS derived_source_flight_id,
                flight.flight_number AS derived_source_flight_number,
                active_wp.id AS active_work_package_id,
                active_wp.package_number AS active_work_package_number
         FROM aircraft_defects defect
         JOIN aircraft ON aircraft.id = defect.aircraft_id
         LEFT JOIN maintenance_defect_assessments assessment ON assessment.defect_id = defect.id
         LEFT JOIN aircraft_deferments deferment ON deferment.defect_id = defect.id
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
      aircraftImageUrl: nullableText(row.aircraft_image_url),
      defectNumber: String(row.defect_number),
      title: String(row.title),
      description: String(row.description),
      status: String(row.status) as MaintenanceDefectSummaryDto['status'],
      detectedAt: String(row.detected_at),
      reporterObservation: String(row.reporter_observation ?? 'UNKNOWN'),
      initialSeverity: String(row.initial_severity ?? 'UNKNOWN'),
      operationalImpact: nullableText(row.operational_impact),
      flightPhase: nullableText(row.flight_phase),
      stationId: nullableText(row.station_id),
      sourceReference: nullableText(row.source_reference),
      derivedSourceFlightId: nullableText(row.derived_source_flight_id),
      derivedSourceFlightNumber: nullableText(row.derived_source_flight_number),
      assessmentDecision: nullableText(
        row.assessment_decision
      ) as MaintenanceDefectSummaryDto['assessmentDecision'],
      assessmentNote: nullableText(row.assessment_note),
      defermentId: nullableText(row.deferment_id),
      defermentStatus: (row.deferment_status &&
      String(row.deferment_status) === 'ACTIVE' &&
      row.deferment_expires_at &&
      String(row.deferment_expires_at) <= now()
        ? 'EXPIRED'
        : nullableText(row.deferment_status)) as MaintenanceDefectSummaryDto['defermentStatus'],
      defermentEffectiveAt: nullableText(row.deferment_effective_at),
      defermentExpiresAt: nullableText(row.deferment_expires_at),
      defermentTargetRectificationAt: nullableText(row.deferment_target_rectification_at),
      defermentReferenceCode: nullableText(row.deferment_reference_code),
      defermentOperationalLimitations: nullableText(row.deferment_operational_limitations),
      activeWorkPackageId: nullableText(row.active_work_package_id),
      activeWorkPackageNumber: nullableText(row.active_work_package_number),
      updatedAt: String(row.updated_at)
    };
  }

  private technicalReleaseSummaries(limit = 50): MaintenanceTechnicalReleaseSummaryDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT release.*, aircraft.registration_number AS aircraft_registration_number,
                aircraft.image_url AS aircraft_image_url
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
      aircraftImageUrl: nullableText(row.aircraft_image_url),
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

  private toApprovedDataRevisionDto(row: SqlRow) {
    return {
      id: String(row.id),
      documentId: String(row.document_id),
      revision: String(row.revision),
      effectiveDate: String(row.effective_date),
      status: String(
        row.status
      ) as MaintenanceApprovedDataDocumentDto['revisions'][number]['status'],
      supersededByRevisionId: nullableText(row.superseded_by_revision_id),
      fictionalDemo: Boolean(row.fictional_demo),
      notes: nullableText(row.notes)
    };
  }

  private linkApprovedDataRevisionToJobCard(
    jobCardId: string,
    approvedDataRevisionId: string,
    usageNote: string
  ) {
    const revision = this.sqlite
      .prepare(
        `SELECT rev.*, doc.document_number
         FROM maintenance_approved_data_revisions rev
         JOIN maintenance_approved_data_documents doc ON doc.id = rev.document_id
         WHERE rev.id = ?`
      )
      .get(approvedDataRevisionId) as SqlRow | undefined;
    if (!revision) {
      throw maintenanceError(
        'APPROVED_DATA_MISSING',
        'Approved maintenance data revision was not found.',
        422,
        {
          impact: 'Job card was not created.',
          requiredAction: 'Select an existing active revision from Data Perawatan Terkendali.',
          referenceId: approvedDataRevisionId
        }
      );
    }
    if (String(revision.status) !== 'ACTIVE') {
      throw maintenanceError(
        'APPROVED_DATA_REVISION_INACTIVE',
        'Approved maintenance data revision is not active.',
        422,
        {
          impact: 'Job card was not created.',
          requiredAction: 'Select an active revision for new Demo-v2 job cards.',
          referenceId: approvedDataRevisionId
        }
      );
    }
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_job_card_approved_data_links (
          id, job_card_id, approved_data_revision_id, usage_note, snapshot_document_number,
          snapshot_revision, snapshot_effective_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `mdata-link-${nanoid(12)}`,
        jobCardId,
        approvedDataRevisionId,
        usageNote,
        String(revision.document_number),
        String(revision.revision),
        String(revision.effective_date),
        now()
      );
  }

  private toDueStatusDto(row: SqlRow, generatedAt: string): MaintenanceDueStatusDto {
    const nextDueAt = nullableText(row.next_due_at);
    const currentHours = number(row.airframe_hours);
    const currentCycles = number(row.airframe_cycles);
    const dueHours = row.next_due_flight_hours === null ? null : number(row.next_due_flight_hours);
    const dueCycles =
      row.next_due_flight_cycles === null ? null : number(row.next_due_flight_cycles);
    const calendarRemainingDays = nextDueAt
      ? Math.ceil((new Date(nextDueAt).getTime() - new Date(generatedAt).getTime()) / 86400000)
      : null;
    const flightHoursRemaining =
      dueHours === null ? null : Number((dueHours - currentHours).toFixed(2));
    const flightCyclesRemaining = dueCycles === null ? null : dueCycles - currentCycles;
    const status = this.calculatedDueStatus(
      String(row.status),
      calendarRemainingDays,
      flightHoursRemaining,
      flightCyclesRemaining,
      Boolean(row.mandatory),
      Boolean(row.active)
    );
    const basisValues = [
      { basis: 'CALENDAR' as const, value: calendarRemainingDays },
      { basis: 'FH' as const, value: flightHoursRemaining },
      { basis: 'FC' as const, value: flightCyclesRemaining }
    ].filter(
      (item): item is { basis: 'CALENDAR' | 'FH' | 'FC'; value: number } => item.value !== null
    );
    const nearestBasis = basisValues.length
      ? basisValues.sort((a, b) => a.value - b.value)[0]!.basis
      : 'NONE';
    const planningStatus = this.duePlanningStatus(
      status,
      nullableText(row.planned_work_package_id),
      nullableText(row.planned_work_package_status),
      nullableText(row.compliance_record_id),
      Boolean(row.active)
    );
    const forecastHorizonDays =
      nearestBasis === 'CALENDAR' ? this.forecastHorizon(calendarRemainingDays) : null;
    return {
      id: String(row.id),
      requirementId: String(row.requirement_id),
      aircraftId: String(row.aircraft_id),
      aircraftRegistrationNumber: String(row.aircraft_registration_number),
      aircraftImageUrl: nullableText(row.aircraft_image_url),
      code: String(row.code),
      title: String(row.title),
      mandatory: Boolean(row.mandatory),
      recurring: Boolean(row.recurring),
      active: Boolean(row.active),
      fictionalDemo: Boolean(row.fictional_demo),
      status,
      planningStatus,
      nearestBasis,
      currentFlightHours: currentHours,
      currentFlightCycles: currentCycles,
      utilizationAsOf: nullableText(row.aircraft_updated_at),
      lastCompletedAt: nullableText(row.last_completed_at),
      lastCompletedFlightHours:
        row.last_completed_flight_hours === null ? null : number(row.last_completed_flight_hours),
      lastCompletedFlightCycles:
        row.last_completed_flight_cycles === null ? null : number(row.last_completed_flight_cycles),
      intervalCalendarDays:
        row.interval_calendar_days === null ? null : number(row.interval_calendar_days),
      intervalFlightHours:
        row.interval_flight_hours === null ? null : number(row.interval_flight_hours),
      intervalFlightCycles:
        row.interval_flight_cycles === null ? null : number(row.interval_flight_cycles),
      calendarRemainingDays,
      flightHoursRemaining,
      flightCyclesRemaining,
      nextDueAt,
      nextDueFlightHours: dueHours,
      nextDueFlightCycles: dueCycles,
      forecastHorizonDays,
      sourceApprovedDataRevisionId: nullableText(row.source_approved_data_revision_id),
      sourceWorkPackageId: nullableText(row.source_work_package_id),
      sourceJobCardId: nullableText(row.source_job_card_id),
      plannedWorkPackageId: nullableText(row.planned_work_package_id),
      plannedWorkPackageNumber: nullableText(row.planned_work_package_number),
      complianceRecordId: nullableText(row.compliance_record_id),
      calculationExplanation: this.dueCalculationExplanation({
        nearestBasis,
        calendarRemainingDays,
        flightHoursRemaining,
        flightCyclesRemaining,
        nextDueAt,
        dueHours,
        dueCycles,
        currentHours,
        currentCycles
      }),
      actionLabel: nullableText(row.planned_work_package_id)
        ? 'Lihat Work Package'
        : 'Buat Work Package',
      calculatedAt: generatedAt,
      dataFreshness: `Kalkulasi UTC ${generatedAt}; utilisasi pesawat ${nullableText(row.aircraft_updated_at) ?? 'tidak tersedia'}`
    };
  }

  private calculatedDueStatus(
    storedStatus: string,
    calendarRemainingDays: number | null,
    flightHoursRemaining: number | null,
    flightCyclesRemaining: number | null,
    mandatory: boolean,
    active: boolean
  ): MaintenanceDueStatusDto['status'] {
    if (!active) return 'INACTIVE';
    if (storedStatus === 'COMPLETED') return 'COMPLETED';
    const usageValues = [flightHoursRemaining, flightCyclesRemaining].filter(
      (value): value is number => value !== null
    );
    if (
      (calendarRemainingDays !== null && calendarRemainingDays < 0) ||
      usageValues.some((value) => value < 0)
    ) {
      return 'OVERDUE';
    }
    if (
      (calendarRemainingDays !== null && calendarRemainingDays === 0) ||
      usageValues.some((value) => value === 0)
    ) {
      return 'DUE';
    }
    if (calendarRemainingDays !== null && calendarRemainingDays <= (mandatory ? 30 : 15)) {
      return 'DUE_SOON';
    }
    const hasAnyBasis = calendarRemainingDays !== null || usageValues.length > 0;
    if (!hasAnyBasis) return storedStatus as MaintenanceDueStatusDto['status'];
    return 'NOT_DUE';
  }

  private duePlanningStatus(
    status: MaintenanceDueStatusDto['status'],
    plannedWorkPackageId: string | null,
    plannedWorkPackageStatus: string | null,
    complianceRecordId: string | null,
    active: boolean
  ): MaintenanceDueStatusDto['planningStatus'] {
    if (!active || status === 'INACTIVE') return 'INACTIVE';
    if (complianceRecordId && status !== 'OVERDUE' && status !== 'DUE') return 'COMPLIED';
    if (!plannedWorkPackageId) return 'UNPLANNED';
    if (plannedWorkPackageStatus === 'RELEASED') return 'COMPLIED';
    if (
      plannedWorkPackageStatus === 'IN_PROGRESS' ||
      plannedWorkPackageStatus === 'READY_FOR_RELEASE'
    ) {
      return 'IN_PROGRESS';
    }
    return 'PLANNED';
  }

  private dueCalculationExplanation(input: {
    nearestBasis: 'CALENDAR' | 'FH' | 'FC' | 'NONE';
    calendarRemainingDays: number | null;
    flightHoursRemaining: number | null;
    flightCyclesRemaining: number | null;
    nextDueAt: string | null;
    dueHours: number | null;
    dueCycles: number | null;
    currentHours: number;
    currentCycles: number;
  }) {
    if (input.nearestBasis === 'FH' && input.dueHours !== null) {
      return `Next Due ${input.dueHours} FH; Current ${input.currentHours} FH; Remaining ${input.flightHoursRemaining} FH.`;
    }
    if (input.nearestBasis === 'FC' && input.dueCycles !== null) {
      return `Next Due ${input.dueCycles} FC; Current ${input.currentCycles} FC; Remaining ${input.flightCyclesRemaining} FC.`;
    }
    if (input.nearestBasis === 'CALENDAR' && input.nextDueAt) {
      return `Next Due ${input.nextDueAt.slice(0, 10)}; Remaining ${input.calendarRemainingDays} days.`;
    }
    return 'Due basis belum tersedia untuk kalkulasi.';
  }

  private duePlanningNote(row: SqlRow, input: CreateWorkPackageFromDueInput) {
    const snapshot = [
      `Source: Maintenance Requirement ${String(row.code)} - ${String(row.title)}`,
      `Aircraft: ${String(row.aircraft_registration_number)}`,
      `Status at planning: ${String(row.status)}`,
      row.next_due_at ? `Due date: ${String(row.next_due_at).slice(0, 10)}` : null,
      row.next_due_flight_hours !== null ? `Due FH: ${number(row.next_due_flight_hours)}` : null,
      row.next_due_flight_cycles !== null ? `Due FC: ${number(row.next_due_flight_cycles)}` : null,
      `Current FH: ${number(row.airframe_hours)}`,
      `Current FC: ${number(row.airframe_cycles)}`,
      input.plannedStartAt ? `Planned start: ${input.plannedStartAt}` : null,
      input.stationId ? `Station: ${input.stationId}` : null,
      input.planningNote ? `Planner note: ${input.planningNote}` : null
    ].filter(Boolean);
    return snapshot.join('\n');
  }

  private forecastHorizon(days: number | null): 30 | 60 | 90 | 180 | null {
    if (days === null || days < 0) return null;
    if (days <= 30) return 30;
    if (days <= 60) return 60;
    if (days <= 90) return 90;
    if (days <= 180) return 180;
    return null;
  }

  private eligibilityItem(
    code: string,
    category: MaintenanceEligibilityBlockerDto['category'],
    severity: MaintenanceEligibilityBlockerDto['severity'],
    sourceType: string,
    sourceId: string,
    override: Partial<MaintenanceEligibilityBlockerDto> = {}
  ): MaintenanceEligibilityBlockerDto {
    const catalog: Record<
      string,
      Pick<MaintenanceEligibilityBlockerDto, 'title' | 'message' | 'nextAction'>
    > = {
      MANDATORY_JOB_CARD_INCOMPLETE: {
        title: 'Kartu kerja wajib belum selesai',
        message: 'Kartu kerja wajib belum berada pada status siap untuk review rilis.',
        nextAction: 'Selesaikan pekerjaan teknisi, bukti, dan pemeriksaan yang diwajibkan.'
      },
      REQUIRED_SIGNOFF_MISSING: {
        title: 'Pengesahan teknisi belum lengkap',
        message: 'Pengesahan teknisi atau bukti pendukung belum tersedia.',
        nextAction: 'Minta teknisi yang berwenang menyelesaikan sign-off dengan evidence.'
      },
      INDEPENDENT_INSPECTION_REQUIRED: {
        title: 'Pemeriksaan independen diperlukan',
        message: 'Kartu kerja memerlukan pemeriksaan independen yang lulus.',
        nextAction: 'Tugaskan inspector independen yang scope-nya sesuai.'
      },
      REWORK_INCOMPLETE: {
        title: 'Perbaikan ulang belum selesai',
        message: 'Failed inspection masih memiliki corrective work yang belum lengkap.',
        nextAction: 'Selesaikan corrective sign-off dan pemeriksaan ulang.'
      },
      REINSPECTION_REQUIRED: {
        title: 'Pemeriksaan ulang belum lulus',
        message: 'Rework sudah dibuat tetapi belum memiliki re-inspection lulus.',
        nextAction: 'Lakukan re-inspection oleh inspector independen.'
      },
      NON_ROUTINE_FINDING_OPEN: {
        title: 'Temuan non-routine belum selesai',
        message: 'Work Package masih memiliki temuan non-routine yang belum resolved/closed.',
        nextAction: 'Assessment, selesaikan corrective work, lalu close temuan non-routine.'
      },
      RELEASE_REQUEST_NOT_READY: {
        title: 'Pengajuan rilis belum siap',
        message: 'Paket belum memenuhi seluruh gate sebelum Technical Release.',
        nextAction: 'Selesaikan blocker pada panel Kesiapan Pekerjaan.'
      },
      APPROVED_DATA_MISSING: {
        title: 'Data perawatan terkendali belum dipilih',
        message: 'Kartu kerja Demo-v2 harus memakai revisi Data Perawatan Terkendali yang aktif.',
        nextAction: 'Pilih revisi aktif dari Data Perawatan Terkendali.'
      },
      APPROVED_DATA_REVISION_INACTIVE: {
        title: 'Revisi data perawatan tidak aktif',
        message: 'Revisi yang ditautkan ke kartu kerja sudah digantikan atau ditarik.',
        nextAction:
          'Review impact, buat scope change terkendali, atau pilih revisi aktif untuk pekerjaan baru.'
      },
      MANDATORY_MAINTENANCE_OVERDUE: {
        title: 'Maintenance wajib overdue',
        message: 'Requirement wajib sudah melewati batas jatuh tempo demo.',
        nextAction:
          'Rencanakan requirement tersebut atau pastikan package ini memang menyelesaikannya.'
      },
      MATERIAL_NOT_RESERVED: {
        title: 'Material belum di-reserve',
        message: 'Material required belum dialokasikan untuk paket pekerjaan.',
        nextAction: 'Reserve material serviceable dari inventory untuk work package ini.'
      },
      MATERIAL_NOT_SERVICEABLE: {
        title: 'Material tidak serviceable',
        message: 'Material yang dipilih tidak berada pada kondisi serviceable.',
        nextAction: 'Pilih material lain yang serviceable atau selesaikan proses quarantine/repair.'
      },
      MATERIAL_CERTIFICATE_MISSING: {
        title: 'Evidence material belum lengkap',
        message:
          'Material certificate-controlled belum memiliki certificate/evidence terverifikasi.',
        nextAction: 'Lengkapi release certificate/evidence demo sebelum material dipakai.'
      },
      MATERIAL_SHELF_LIFE_EXPIRED: {
        title: 'Shelf-life material kedaluwarsa',
        message: 'Material yang dialokasikan melewati batas shelf-life demo.',
        nextAction: 'Pilih batch/serial lain yang masih valid.'
      },
      MATERIAL_NOT_INSTALLED: {
        title: 'Material belum terpasang',
        message: 'Material mandatory belum memiliki catatan installation yang valid.',
        nextAction: 'Issue lalu install material melalui tab Material sebelum rilis.'
      },
      TOOL_NOT_ALLOCATED: {
        title: 'Peralatan belum dialokasikan',
        message: 'Peralatan required belum dialokasikan ke paket pekerjaan.',
        nextAction: 'Allocate tool yang tersedia dan sesuai.'
      },
      TOOL_CALIBRATION_EXPIRED: {
        title: 'Kalibrasi peralatan telah kedaluwarsa',
        message: 'Peralatan required tidak memiliki kalibrasi valid pada waktu evaluasi.',
        nextAction: 'Pilih peralatan lain yang masih valid atau perbarui data kalibrasi demo.'
      },
      AIRCRAFT_CONFIGURATION_CONFLICT: {
        title: 'Konfigurasi pesawat bermasalah',
        message: 'Ada conflict konfigurasi terbuka pada pesawat.',
        nextAction: 'Selesaikan conflict konfigurasi sebelum rilis.'
      },
      AMO_SCOPE_MISMATCH: {
        title: 'Scope AMO demo tidak sesuai',
        message: 'Record scope organisasi demo tidak mencakup aircraft/action ini.',
        nextAction: 'Review capability scope demo sebelum melanjutkan.'
      },
      RELEASE_RECORD_INCOMPLETE: {
        title: 'Catatan rilis belum lengkap',
        message: 'Snapshot/evidence rilis demo belum lengkap.',
        nextAction: 'Muat ulang package dan periksa audit pack.'
      }
    };
    const entry = catalog[code] ?? {
      title: code.replaceAll('_', ' ').toLowerCase(),
      message: 'Gate rilis teknis demo belum terpenuhi.',
      nextAction: 'Review data sumber dan selesaikan blocker.'
    };
    return { code, category, severity, sourceType, sourceId, ...entry, ...override };
  }

  private eligibilityBlockerFromLegacy(
    blocker: MaintenanceDomainBlockerDto
  ): MaintenanceEligibilityBlockerDto {
    const codeMap: Record<string, string> = {
      MAINTENANCE_RELEASE_JOB_CARD_REQUIRED: 'MANDATORY_JOB_CARD_INCOMPLETE',
      MAINTENANCE_RELEASE_APPROVED_DATA_REQUIRED: 'APPROVED_DATA_MISSING',
      MAINTENANCE_RELEASE_INCOMPLETE_JOB_CARDS: 'MANDATORY_JOB_CARD_INCOMPLETE',
      MAINTENANCE_RELEASE_MECHANIC_EVIDENCE_REQUIRED: 'REQUIRED_SIGNOFF_MISSING',
      MAINTENANCE_RELEASE_INSPECTION_REQUIRED: 'INDEPENDENT_INSPECTION_REQUIRED',
      MAINTENANCE_RELEASE_REWORK_REQUIRED: 'REWORK_INCOMPLETE',
      MAINTENANCE_RELEASE_REWORK_SIGNOFF_REQUIRED: 'REWORK_INCOMPLETE',
      MAINTENANCE_RELEASE_REWORK_UNSIGNED: 'REWORK_INCOMPLETE',
      MAINTENANCE_RELEASE_REWORK_APPROVED_DATA_REQUIRED: 'REWORK_INCOMPLETE',
      MAINTENANCE_RELEASE_REINSPECTION_REQUIRED: 'REINSPECTION_REQUIRED',
      NON_ROUTINE_FINDING_OPEN: 'NON_ROUTINE_FINDING_OPEN'
    };
    const code = codeMap[blocker.code] ?? blocker.code;
    const category =
      code.includes('NON_ROUTINE') || code.includes('REWORK') || code.includes('REINSPECTION')
        ? 'REWORK'
        : code.includes('INSPECTION')
          ? 'INSPECTION'
          : code.includes('APPROVED_DATA')
            ? 'APPROVED_DATA'
            : 'WORK';
    return this.eligibilityItem(
      code,
      category,
      'BLOCKING',
      'LEGACY_RELEASE_CHECK',
      blocker.referenceId ?? '',
      {
        title: blocker.message,
        message: blocker.impact,
        nextAction: blocker.requiredAction
      }
    );
  }

  private domainBlockerFromEligibility(
    blocker: MaintenanceEligibilityBlockerDto
  ): MaintenanceDomainBlockerDto {
    return {
      code: blocker.code,
      message: blocker.title,
      impact: blocker.message,
      requiredAction: blocker.nextAction ?? 'Selesaikan blocker sebelum rilis teknis.',
      referenceId: blocker.sourceId ?? null
    };
  }

  private approvedDataEligibility(workPackageId: string, blocking: boolean) {
    const cards = this.sqlite
      .prepare(
        `SELECT card.*, link.approved_data_revision_id, rev.status AS revision_status,
                rev.revision, doc.document_number
         FROM maintenance_job_cards card
         LEFT JOIN maintenance_job_card_approved_data_links link ON link.job_card_id = card.id
         LEFT JOIN maintenance_approved_data_revisions rev ON rev.id = link.approved_data_revision_id
         LEFT JOIN maintenance_approved_data_documents doc ON doc.id = rev.document_id
         WHERE card.work_package_id = ? AND card.mandatory_flag = 1`
      )
      .all(workPackageId) as SqlRow[];
    const items: MaintenanceEligibilityBlockerDto[] = [];
    for (const card of cards) {
      const hasLink = Boolean(card.approved_data_revision_id);
      const legacyRef = String(card.maintenance_data_ref ?? '').trim();
      const controlledByName = legacyRef.startsWith('AMA-MROV2-');
      if (blocking) {
        if ((controlledByName || hasLink) && !hasLink) {
          items.push(
            this.eligibilityItem(
              'APPROVED_DATA_MISSING',
              'APPROVED_DATA',
              'BLOCKING',
              'JOB_CARD',
              String(card.id)
            )
          );
        }
        if (hasLink && String(card.revision_status) !== 'ACTIVE') {
          items.push(
            this.eligibilityItem(
              'APPROVED_DATA_REVISION_INACTIVE',
              'APPROVED_DATA',
              'BLOCKING',
              'APPROVED_DATA_REVISION',
              String(card.approved_data_revision_id),
              {
                message: `${String(card.document_number)} ${String(card.revision)} tidak aktif untuk ${String(card.card_number)}.`
              }
            )
          );
        }
      } else if (!hasLink && legacyRef) {
        items.push(
          this.eligibilityItem(
            'APPROVED_DATA_MISSING',
            'APPROVED_DATA',
            'WARNING',
            'JOB_CARD',
            String(card.id),
            {
              title: 'Referensi approved data masih legacy',
              message: `${String(card.card_number)} memakai referensi teks legacy: ${legacyRef}.`,
              nextAction: 'Untuk Demo-v2, tautkan kartu kerja baru ke Data Perawatan Terkendali.'
            }
          )
        );
      }
    }
    return items;
  }

  private dueControlEligibility(workPackage: SqlRow) {
    return this.listDueControl()
      .filter(
        (item) =>
          item.aircraftId === String(workPackage.aircraft_id) &&
          item.mandatory &&
          item.active &&
          item.status === 'OVERDUE' &&
          item.sourceWorkPackageId !== String(workPackage.id) &&
          item.plannedWorkPackageId !== String(workPackage.id) &&
          item.id !== nullableText(workPackage.source_due_status_id)
      )
      .map((item) =>
        this.eligibilityItem(
          'MANDATORY_MAINTENANCE_OVERDUE',
          'DUE_CONTROL',
          'BLOCKING',
          'MAINTENANCE_REQUIREMENT',
          item.requirementId,
          { message: `${item.code} overdue untuk ${item.aircraftRegistrationNumber}.` }
        )
      );
  }

  private materialEligibility(workPackageId: string, jobCardId?: string) {
    const params = jobCardId ? [workPackageId, jobCardId] : [workPackageId];
    const requirements = this.sqlite
      .prepare(
        `SELECT req.*, part.part_number, part.part_name, part.certificate_required,
                serial.serial_number, serial.condition AS serial_condition,
                serial.certificate_reference AS serial_certificate_reference,
                serial.certificate_verified AS serial_certificate_verified,
                lot.expires_at AS serial_lot_expires_at
         FROM maintenance_work_package_material_requirements req
         LEFT JOIN inventory_parts part ON part.id = req.part_id
         LEFT JOIN inventory_serialized_parts serial ON serial.id = req.serialized_part_id
         LEFT JOIN inventory_lots lot ON lot.id = serial.lot_id
         WHERE req.work_package_id = ? AND req.required = 1
           ${jobCardId ? 'AND req.job_card_id = ?' : ''}`
      )
      .all(...params) as SqlRow[];
    const blockers: MaintenanceEligibilityBlockerDto[] = [];
    for (const requirement of requirements) {
      const totals = this.sqlite
        .prepare(
          `SELECT
	             COALESCE(SUM(CASE
	               WHEN status IN ('ACTIVE', 'PARTIALLY_ISSUED') THEN quantity
	               WHEN status = 'ISSUED' THEN COALESCE(issued_quantity, quantity)
	               ELSE 0
	             END), 0) AS reserved_or_issued,
	             COALESCE(SUM(CASE
	               WHEN status = 'ISSUED' THEN COALESCE(issued_quantity, quantity)
	               ELSE 0
	             END), 0) AS issued
	           FROM maintenance_inventory_reservations
	           WHERE material_requirement_id = ?`
        )
        .get(String(requirement.id)) as SqlRow;
      const installed = this.sqlite
        .prepare(
          `SELECT COALESCE(SUM(quantity), 0) AS quantity
	           FROM maintenance_material_installations
	           WHERE material_requirement_id = ? AND status = 'INSTALLED'`
        )
        .get(String(requirement.id)) as SqlRow;
      if (number(totals.reserved_or_issued) < number(requirement.required_quantity)) {
        blockers.push(
          this.eligibilityItem(
            'MATERIAL_NOT_RESERVED',
            'MATERIAL',
            'BLOCKING',
            'MATERIAL_REQUIREMENT',
            String(requirement.id)
          )
        );
        continue;
      }
      if (number(totals.issued) < number(requirement.required_quantity)) {
        blockers.push(
          this.eligibilityItem(
            'MATERIAL_NOT_ISSUED',
            'MATERIAL',
            'BLOCKING',
            'MATERIAL_REQUIREMENT',
            String(requirement.id)
          )
        );
        continue;
      }
      if (number(installed.quantity) < number(requirement.required_quantity)) {
        blockers.push(
          this.eligibilityItem(
            'MATERIAL_NOT_INSTALLED',
            'MATERIAL',
            'BLOCKING',
            'MATERIAL_REQUIREMENT',
            String(requirement.id),
            {
              message: 'Material mandatory sudah harus tercatat installed sebelum release.'
            }
          )
        );
        continue;
      }
      if (requirement.serialized_part_id) {
        if (String(requirement.serial_condition) !== 'SERVICEABLE') {
          blockers.push(
            this.eligibilityItem(
              'MATERIAL_NOT_SERVICEABLE',
              'MATERIAL',
              'BLOCKING',
              'SERIALIZED_PART',
              String(requirement.serialized_part_id)
            )
          );
        }
        if (
          number(requirement.certificate_required) &&
          (!requirement.serial_certificate_reference ||
            !number(requirement.serial_certificate_verified))
        ) {
          blockers.push(
            this.eligibilityItem(
              'MATERIAL_CERTIFICATE_MISSING',
              'MATERIAL',
              'BLOCKING',
              'SERIALIZED_PART',
              String(requirement.serialized_part_id)
            )
          );
        }
        if (
          requirement.serial_lot_expires_at &&
          String(requirement.serial_lot_expires_at) < now()
        ) {
          blockers.push(
            this.eligibilityItem(
              'MATERIAL_SHELF_LIFE_EXPIRED',
              'MATERIAL',
              'BLOCKING',
              'SERIALIZED_PART',
              String(requirement.serialized_part_id)
            )
          );
        }
      }
    }
    return blockers;
  }

  private availablePartQuantity(partId: string) {
    const row = this.sqlite
      .prepare(
        `SELECT COALESCE(SUM(balance.on_hand_quantity), 0) AS quantity
         FROM inventory_stock_balances balance
         LEFT JOIN inventory_lots lot ON lot.id = balance.lot_id
         WHERE balance.part_id = ?
           AND balance.condition = 'SERVICEABLE'
           AND (lot.expires_at IS NULL OR lot.expires_at >= ?)`
      )
      .get(partId, now()) as SqlRow;
    return number(row.quantity);
  }

  private toolingEligibility(workPackageId: string, evaluatedAt: string) {
    const allocations = this.sqlite
      .prepare(
        `SELECT allocation.*, tool.tool_code, tool.name, tool.status, tool.calibration_required,
                cal.expires_at AS calibration_expires_at, cal.status AS calibration_status
         FROM maintenance_work_package_tool_allocations allocation
         JOIN maintenance_tool_masters tool ON tool.id = allocation.tool_id
         LEFT JOIN maintenance_tool_calibration_records cal ON cal.id = (
           SELECT latest.id FROM maintenance_tool_calibration_records latest
           WHERE latest.tool_id = tool.id
           ORDER BY latest.expires_at DESC LIMIT 1
         )
         WHERE allocation.work_package_id = ? AND allocation.required = 1 AND allocation.returned_at IS NULL`
      )
      .all(workPackageId) as SqlRow[];
    const blockers: MaintenanceEligibilityBlockerDto[] = [];
    for (const allocation of allocations) {
      if (String(allocation.status) === 'OUT_OF_SERVICE') {
        blockers.push(
          this.eligibilityItem(
            'TOOL_NOT_ALLOCATED',
            'TOOLING',
            'BLOCKING',
            'TOOL',
            String(allocation.tool_id),
            {
              message: `${String(allocation.tool_code)} sedang out of service.`
            }
          )
        );
      }
      if (
        number(allocation.calibration_required) &&
        (!allocation.calibration_expires_at ||
          String(allocation.calibration_status) !== 'CURRENT' ||
          String(allocation.calibration_expires_at) < evaluatedAt)
      ) {
        blockers.push(
          this.eligibilityItem(
            'TOOL_CALIBRATION_EXPIRED',
            'TOOLING',
            'BLOCKING',
            'TOOL',
            String(allocation.tool_id),
            {
              message: `Peralatan ${String(allocation.tool_code)} tidak memiliki kalibrasi valid pada ${evaluatedAt}.`
            }
          )
        );
      }
      const duplicate = this.sqlite
        .prepare(
          `SELECT other.work_package_id
           FROM maintenance_work_package_tool_allocations other
           WHERE other.tool_id = ? AND other.returned_at IS NULL AND other.work_package_id <> ?
           LIMIT 1`
        )
        .get(String(allocation.tool_id), workPackageId) as SqlRow | undefined;
      if (duplicate) {
        blockers.push(
          this.eligibilityItem(
            'TOOL_NOT_ALLOCATED',
            'TOOLING',
            'BLOCKING',
            'TOOL',
            String(allocation.tool_id),
            {
              message: `${String(allocation.tool_code)} masih dialokasikan ke work package lain.`
            }
          )
        );
      }
    }
    return blockers;
  }

  private amoScopeEligibility(workPackage: SqlRow, evaluatedAt: string) {
    const scopeCount = number(
      (
        this.sqlite
          .prepare('SELECT COUNT(*) AS count FROM maintenance_demo_amo_capability_scopes')
          .get() as SqlRow
      ).count
    );
    if (!scopeCount) return [];
    const aircraftTargets = this.aircraftScopeTargets(workPackage);
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_demo_amo_capability_scopes
         WHERE status = 'ACTIVE' AND valid_from <= ? AND valid_until >= ?`
      )
      .all(evaluatedAt.slice(0, 10), evaluatedAt.slice(0, 10)) as SqlRow[];
    const matched = rows.some((row) => {
      const actionMatches = jsonArray(row.permitted_actions_json).includes('TECHNICAL_RELEASE');
      const type = nullableText(row.aircraft_type);
      const registration = nullableText(row.aircraft_registration);
      return (
        actionMatches &&
        (!type || aircraftTargets.includes(this.normalizeScopeToken(type))) &&
        (!registration || aircraftTargets.includes(this.normalizeScopeToken(registration)))
      );
    });
    return matched
      ? []
      : [
          this.eligibilityItem(
            'AMO_SCOPE_MISMATCH',
            'AMO_SCOPE',
            'BLOCKING',
            'WORK_PACKAGE',
            String(workPackage.id)
          )
        ];
  }

  private configurationEligibility(aircraftId: string) {
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_aircraft_configuration_conflicts
         WHERE aircraft_id = ? AND status = 'OPEN'`
      )
      .all(aircraftId) as SqlRow[];
    return rows.map((row) =>
      this.eligibilityItem(
        'AIRCRAFT_CONFIGURATION_CONFLICT',
        'AIRCRAFT_CONFIGURATION',
        'BLOCKING',
        String(row.source_type),
        nullableText(row.source_id) ?? String(row.id),
        { message: String(row.description) }
      )
    );
  }

  private releaseResourceContextWarnings(workPackageId: string) {
    const warnings: MaintenanceEligibilityBlockerDto[] = [];
    const materialCount = number(
      (
        this.sqlite
          .prepare(
            'SELECT COUNT(*) AS count FROM maintenance_work_package_material_requirements WHERE work_package_id = ?'
          )
          .get(workPackageId) as SqlRow
      ).count
    );
    if (!materialCount) {
      warnings.push(
        this.eligibilityItem(
          'MATERIAL_NOT_RESERVED',
          'MATERIAL',
          'WARNING',
          'WORK_PACKAGE',
          workPackageId,
          {
            title: 'Readiness material belum dikontrol Demo-v2',
            message: 'Paket legacy belum memiliki material requirement eksplisit.',
            nextAction: 'Tambahkan material requirement untuk demo readiness penuh.'
          }
        )
      );
    }
    return warnings;
  }

  private uniqueEligibilityItems(items: MaintenanceEligibilityBlockerDto[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.code}:${item.sourceType ?? ''}:${item.sourceId ?? ''}:${item.severity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private assertEligibilityPassed(eligibility: MaintenanceReleaseEligibilityDto) {
    if (eligibility.eligible) return;
    const first = eligibility.blockers[0];
    const legacyCode = this.legacyErrorCodeForEligibility(first);
    throw maintenanceError(
      legacyCode,
      first?.title ?? 'Technical release eligibility failed.',
      422,
      {
        impact: 'Technical release was not issued and aircraft readiness was not changed.',
        requiredAction:
          first?.nextAction ?? 'Resolve all backend eligibility blockers before release.',
        referenceId: first?.sourceId ?? eligibility.workPackageId,
        blockers: eligibility.blockers,
        warnings: eligibility.warnings
      }
    );
  }

  private legacyErrorCodeForEligibility(first: MaintenanceEligibilityBlockerDto | undefined) {
    if (!first) return 'RELEASE_RECORD_INCOMPLETE';
    if (first.code === 'APPROVED_DATA_MISSING') return 'MAINTENANCE_RELEASE_APPROVED_DATA_REQUIRED';
    if (first.code === 'REINSPECTION_REQUIRED') return 'MAINTENANCE_RELEASE_REINSPECTION_REQUIRED';
    if (first.code === 'REWORK_INCOMPLETE') return 'MAINTENANCE_RELEASE_REWORK_REQUIRED';
    if (first.code === 'INDEPENDENT_INSPECTION_REQUIRED') {
      return 'MAINTENANCE_RELEASE_INSPECTION_REQUIRED';
    }
    if (first.code === 'REQUIRED_SIGNOFF_MISSING') {
      return 'MAINTENANCE_RELEASE_MECHANIC_EVIDENCE_REQUIRED';
    }
    if (first.code === 'MANDATORY_JOB_CARD_INCOMPLETE') {
      return 'MAINTENANCE_RELEASE_INCOMPLETE_JOB_CARDS';
    }
    return first.code;
  }

  private insertReleaseEligibilitySnapshot(
    workPackageId: string,
    releaseId: string | null,
    eligibility: MaintenanceReleaseEligibilityDto,
    references: Record<string, unknown>
  ) {
    const timestamp = now();
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_release_eligibility_snapshots (
          id, work_package_id, release_id, evaluated_at, eligible, blockers_json,
          warnings_json, reference_snapshot_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `mrelsnap-${nanoid(12)}`,
        workPackageId,
        releaseId,
        eligibility.evaluatedAt,
        eligibility.eligible ? 1 : 0,
        JSON.stringify(eligibility.blockers),
        JSON.stringify(eligibility.warnings),
        JSON.stringify(references),
        timestamp
      );
  }

  private auditPackManifest(
    workPackage: MaintenanceWorkPackageDto,
    eligibility: MaintenanceReleaseEligibilityDto,
    generatedAt: string
  ) {
    return {
      generatedAt,
      disclaimer: demoAuditPackDisclaimer,
      aircraft: {
        registration: workPackage.aircraftRegistrationNumber,
        model: workPackage.aircraftModel,
        type: workPackage.aircraftType,
        serviceability: workPackage.aircraftTechnicalState,
        technicalEligibility: workPackage.aircraftTechnicalEligibility
      },
      workPackage: {
        id: workPackage.id,
        number: workPackage.packageNumber,
        title: workPackage.title,
        scope: workPackage.executionMode,
        status: workPackage.status,
        createdAt: workPackage.createdAt,
        updatedAt: workPackage.updatedAt,
        releasedAt: workPackage.releasedAt
      },
      jobCards: workPackage.jobCards.map((card) => ({
        number: card.cardNumber,
        title: card.title,
        status: card.status,
        approvedData: {
          legacyReference: card.maintenanceDataRef,
          legacyRevision: card.maintenanceDataRevision,
          controlledLinks: this.approvedDataLinksForJobCard(card.id)
        },
        mechanicSignoff: card.signoffs.find((item) => item.signoffType === 'MECHANIC') ?? null,
        inspectionSignoff:
          card.signoffs.find((item) => item.signoffType === 'INDEPENDENT_INSPECTION') ?? null,
        inspectionAttempts: card.inspectionAttempts,
        reworkActions: card.reworkActions
      })),
      readiness: {
        personnel: eligibility.blockers
          .concat(eligibility.warnings)
          .filter((item) => ['AUTHORIZATION', 'AMO_SCOPE'].includes(item.category)),
        material: eligibility.blockers
          .concat(eligibility.warnings)
          .filter((item) => item.category === 'MATERIAL'),
        tooling: eligibility.blockers
          .concat(eligibility.warnings)
          .filter((item) => item.category === 'TOOLING'),
        dueControl: eligibility.blockers
          .concat(eligibility.warnings)
          .filter((item) => item.category === 'DUE_CONTROL'),
        approvedData: eligibility.blockers
          .concat(eligibility.warnings)
          .filter((item) => item.category === 'APPROVED_DATA')
      },
      technicalRelease: workPackage.release
        ? {
            releaseNumber: workPackage.release.releaseNumber,
            certifyingUserId: workPackage.release.certifyingUserId,
            certifyingLicenseNumber: workPackage.release.certifyingLicenseNumber,
            releasedAt: workPackage.release.releasedAt,
            signerAuthorizationSnapshot: workPackage.release.signerAuthorizationSnapshot
          }
        : null,
      eligibility,
      auditTimeline: workPackage.auditRecords ?? []
    };
  }

  private approvedDataLinksForJobCard(jobCardId: string) {
    return this.sqlite
      .prepare(
        `SELECT link.*, doc.document_type, doc.document_number, doc.title, rev.status
         FROM maintenance_job_card_approved_data_links link
         JOIN maintenance_approved_data_revisions rev ON rev.id = link.approved_data_revision_id
         JOIN maintenance_approved_data_documents doc ON doc.id = rev.document_id
         WHERE link.job_card_id = ?`
      )
      .all(jobCardId) as SqlRow[];
  }

  private latestReleaseEligibilitySnapshot(
    workPackageId: string
  ): MaintenanceTechnicalRecordPackageDto['releaseSnapshot'] {
    const row = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_release_eligibility_snapshots
         WHERE work_package_id = ?
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(workPackageId) as SqlRow | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      releaseId: nullableText(row.release_id),
      evaluatedAt: String(row.evaluated_at),
      eligible: Boolean(row.eligible),
      blockers: jsonArray(row.blockers_json) as unknown as MaintenanceEligibilityBlockerDto[],
      warnings: jsonArray(row.warnings_json) as unknown as MaintenanceEligibilityBlockerDto[],
      referenceSnapshot: jsonObject(row.reference_snapshot_json) ?? {},
      createdAt: String(row.created_at)
    };
  }

  private materialTechnicalRecordEvidence(workPackageId: string): Record<string, unknown>[] {
    return this.sqlite
      .prepare(
        `SELECT installation.id, installation.installation_number, installation.material_requirement_id,
                installation.reservation_id, installation.issue_id, installation.job_card_id,
                installation.aircraft_id, installation.part_id, part.part_number, part.part_name,
                installation.serialized_part_id, installation.serial_number, installation.lot_number,
                installation.certificate_reference, installation.quantity, installation.unit,
                installation.position, installation.status, installation.installed_by,
                installation.installed_at, reservation.reservation_number,
                reservation.reserved_at, reservation.issued_at, reservation.issued_by
         FROM maintenance_material_installations installation
         LEFT JOIN maintenance_inventory_reservations reservation ON reservation.id = installation.reservation_id
         LEFT JOIN inventory_parts part ON part.id = installation.part_id
         WHERE installation.work_package_id = ?
         ORDER BY installation.installed_at, installation.installation_number`
      )
      .all(workPackageId) as Record<string, unknown>[];
  }

  private personnelTechnicalRecordEvidence(workPackageId: string): Record<string, unknown>[] {
    const rows = this.sqlite
      .prepare(
        `SELECT assignment.id, assignment.personnel_requirement_id, assignment.personnel_id,
                crew.full_name AS personnel_name, assignment.job_card_id, assignment.role_type,
                assignment.status, assignment.eligibility_status, assignment.eligibility_snapshot_json,
                assignment.assigned_by, assignment.assigned_at, assignment.confirmed_at,
                assignment.released_at, requirement.required_licence_type,
                requirement.required_qualification, requirement.required_authorization
         FROM maintenance_personnel_assignments assignment
         JOIN crews crew ON crew.id = assignment.personnel_id
         LEFT JOIN maintenance_personnel_requirements requirement
           ON requirement.id = assignment.personnel_requirement_id
         WHERE assignment.work_package_id = ?
         ORDER BY assignment.assigned_at, assignment.id`
      )
      .all(workPackageId) as SqlRow[];
    return rows.map((row) => ({
      ...row,
      eligibility_snapshot_json: jsonObject(row.eligibility_snapshot_json)
    }));
  }

  private toolTechnicalRecordEvidence(workPackageId: string): Record<string, unknown>[] {
    return this.sqlite
      .prepare(
        `SELECT allocation.id, allocation.tool_requirement_id, allocation.tool_id,
                tool.tool_code, tool.name AS tool_name, tool.serial_number,
                tool.status AS tool_status, tool.calibration_required,
                allocation.job_card_id, allocation.status AS allocation_status,
                allocation.allocated_by, allocation.allocated_at,
                allocation.custodian_personnel_id, crew.full_name AS custodian_name,
                allocation.custody_started_at, allocation.returned_by,
                allocation.returned_at, allocation.return_condition, allocation.return_note,
                calibration.certificate_reference, calibration.expires_at AS calibration_expires_at,
                calibration.status AS calibration_status
         FROM maintenance_tool_allocations_v2 allocation
         JOIN maintenance_tool_masters tool ON tool.id = allocation.tool_id
         LEFT JOIN crews crew ON crew.id = allocation.custodian_personnel_id
         LEFT JOIN maintenance_tool_calibration_records calibration ON calibration.id = (
           SELECT latest.id FROM maintenance_tool_calibration_records latest
           WHERE latest.tool_id = tool.id
           ORDER BY latest.expires_at DESC
           LIMIT 1
         )
         WHERE allocation.work_package_id = ?
         ORDER BY allocation.allocated_at, allocation.id`
      )
      .all(workPackageId) as Record<string, unknown>[];
  }

  private approvedDataTechnicalRecordEvidence(workPackageId: string): Record<string, unknown>[] {
    return this.sqlite
      .prepare(
        `SELECT card.id AS job_card_id, card.card_number, card.title AS job_card_title,
                card.maintenance_data_ref, card.maintenance_data_revision,
                link.approved_data_revision_id, link.usage_note,
                link.snapshot_document_number, link.snapshot_revision,
                link.snapshot_effective_date, doc.document_type, doc.document_number,
                doc.title AS document_title, rev.revision, rev.status AS revision_status
         FROM maintenance_job_cards card
         LEFT JOIN maintenance_job_card_approved_data_links link ON link.job_card_id = card.id
         LEFT JOIN maintenance_approved_data_revisions rev ON rev.id = link.approved_data_revision_id
         LEFT JOIN maintenance_approved_data_documents doc ON doc.id = rev.document_id
         WHERE card.work_package_id = ?
         ORDER BY card.card_number, doc.document_number`
      )
      .all(workPackageId) as Record<string, unknown>[];
  }

  private toAuditPackDto(row: SqlRow): MaintenanceAuditPackDto {
    return {
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      releaseId: nullableText(row.release_id),
      generatedAt: String(row.generated_at),
      manifest: jsonObject(row.manifest_json) ?? {},
      manifestHash: String(row.manifest_hash),
      disclaimer: String(row.disclaimer)
    };
  }

  private createQualityFindingForFailedInspection(
    workPackage: SqlRow,
    card: SqlRow,
    inspectionAttemptId: string,
    reworkId: string,
    finding: string
  ) {
    const existing = this.sqlite
      .prepare(
        `SELECT id
         FROM maintenance_quality_findings
         WHERE source_type = 'INSPECTION_ATTEMPT' AND source_id = ?
         LIMIT 1`
      )
      .get(inspectionAttemptId) as SqlRow | undefined;
    if (existing) return String(existing.id);
    const timestamp = now();
    const id = `mqf-${nanoid(12)}`;
    const reference = `QF-${String(workPackage.package_number)}-${String(card.card_number).slice(-6)}`;
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_quality_findings (
          id, reference, source_type, source_id, aircraft_id, work_package_id, classification,
          description, status, owner, due_date, fictional_demo, created_at, updated_at
        ) VALUES (?, ?, 'INSPECTION_ATTEMPT', ?, ?, ?, 'FAILED_INSPECTION_DEMO',
          ?, 'ACTION_REQUIRED', 'Chief Inspector / Quality Demo', ?, 1, ?, ?)`
      )
      .run(
        id,
        reference,
        inspectionAttemptId,
        String(workPackage.aircraft_id),
        String(workPackage.id),
        `Simulasi Quality & Safety dari failed inspection ${String(card.card_number)}: ${finding}`,
        new Date(Date.parse(timestamp) + 7 * 86400000).toISOString(),
        timestamp,
        timestamp
      );
    const capaId = `mcapa-${nanoid(12)}`;
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_capa_actions (
          id, finding_id, action_type, description, owner, due_date, status, created_at, updated_at
        ) VALUES (?, ?, 'CORRECTIVE_ACTION_DEMO',
          ?, 'Maintenance Control Demo', ?, 'ACTION_REQUIRED', ?, ?)`
      )
      .run(
        capaId,
        id,
        `Tinjau corrective work ${reworkId}, verifikasi evidence re-inspection, dan catat effectiveness review demo.`,
        new Date(Date.parse(timestamp) + 10 * 86400000).toISOString(),
        timestamp,
        timestamp
      );
    this.sqlite
      .prepare(
        `INSERT OR IGNORE INTO maintenance_sdr_assessments (
          id, source_type, source_id, reportability_status, discovered_at, simulated_due_at,
          assessment, decision_owner, status, fictional_demo, created_at, updated_at
        ) VALUES (?, 'QUALITY_FINDING', ?, 'INTERNAL_ASSESSMENT_ONLY', ?, ?,
          ?, 'Quality/Safety Demo', 'UNDER_REVIEW', 1, ?, ?)`
      )
      .run(
        `msdr-${nanoid(12)}`,
        id,
        timestamp,
        new Date(Date.parse(timestamp) + 4 * 86400000).toISOString(),
        'Simulasi pelaporan internal. Bukan laporan resmi kepada regulator.',
        timestamp,
        timestamp
      );
    return id;
  }

  private toQualityFindingDto(row: SqlRow): MaintenanceQualityFindingDto {
    const capaRows = this.sqlite
      .prepare('SELECT * FROM maintenance_capa_actions WHERE finding_id = ? ORDER BY created_at')
      .all(String(row.id)) as SqlRow[];
    const sdr = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_sdr_assessments
         WHERE source_type = 'QUALITY_FINDING' AND source_id = ?
         LIMIT 1`
      )
      .get(String(row.id)) as SqlRow | undefined;
    return {
      id: String(row.id),
      reference: String(row.reference),
      sourceType: String(row.source_type),
      sourceId: String(row.source_id),
      aircraftId: nullableText(row.aircraft_id),
      workPackageId: nullableText(row.work_package_id),
      classification: String(row.classification),
      description: String(row.description),
      status: String(row.status) as MaintenanceQualityFindingDto['status'],
      owner: String(row.owner),
      dueDate: nullableText(row.due_date),
      fictionalDemo: Boolean(row.fictional_demo),
      capaActions: capaRows.map((capa) => ({
        id: String(capa.id),
        findingId: String(capa.finding_id),
        actionType: String(capa.action_type),
        description: String(capa.description),
        owner: String(capa.owner),
        dueDate: nullableText(capa.due_date),
        completion: nullableText(capa.completion),
        effectivenessReview: nullableText(capa.effectiveness_review),
        status: String(capa.status) as MaintenanceQualityFindingDto['capaActions'][number]['status']
      })),
      sdrAssessment: sdr
        ? {
            id: String(sdr.id),
            sourceType: String(sdr.source_type),
            sourceId: String(sdr.source_id),
            reportabilityStatus: String(sdr.reportability_status),
            discoveredAt: String(sdr.discovered_at),
            simulatedDueAt: nullableText(sdr.simulated_due_at),
            assessment: String(sdr.assessment),
            decisionOwner: String(sdr.decision_owner),
            status: String(sdr.status) as NonNullable<
              MaintenanceQualityFindingDto['sdrAssessment']
            >['status'],
            fictionalDemo: Boolean(sdr.fictional_demo)
          }
        : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
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
    const findingRows = this.sqlite
      .prepare(
        `SELECT id, finding_number, status, disposition
         FROM maintenance_non_routine_findings
         WHERE work_package_id = ?
           AND status IN ('OPEN', 'ADDED_TO_SCOPE')
           AND resolved_at IS NULL`
      )
      .all(workPackageId) as SqlRow[];
    for (const row of findingRows) {
      blockers.push(
        this.blocker('NON_ROUTINE_FINDING_OPEN', `${String(row.id)}:${String(row.finding_number)}`)
      );
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
      },
      NON_ROUTINE_FINDING_OPEN: {
        message: 'Open non-routine finding is blocking release.',
        impact: 'Technical release is blocked.',
        requiredAction: 'Resolve and close the non-routine finding before release.'
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
                aircraft.registration_number AS aircraft_registration_number,
                aircraft.image_url AS aircraft_image_url
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
      aircraftRegistrationNumber: String(row.aircraft_registration_number),
      aircraftImageUrl: nullableText(row.aircraft_image_url)
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
          aircraftImageUrl: aircraft.imageUrl,
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
    inspectedAt: string,
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
        inspectedAt,
        input.idempotencyKey,
        actor.requestId ?? null,
        inspectedAt
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
                aircraft.image_url AS aircraft_image_url,
                aircraft.aircraft_type AS aircraft_type,
                aircraft.model AS aircraft_model,
                defect.defect_number AS primary_defect_number,
                due_requirement.code AS source_due_requirement_code,
                due_requirement.title AS source_due_requirement_title
         FROM maintenance_work_packages wp
         JOIN aircraft ON aircraft.id = wp.aircraft_id
         LEFT JOIN aircraft_defects defect ON defect.id = wp.primary_defect_id
         LEFT JOIN maintenance_due_requirements due_requirement
           ON due_requirement.id = wp.source_due_requirement_id
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

  private requireNonRoutineFinding(id: string) {
    const row = this.sqlite
      .prepare('SELECT * FROM maintenance_non_routine_findings WHERE id = ?')
      .get(id) as SqlRow | undefined;
    if (!row) {
      throw maintenanceError('NON_ROUTINE_NOT_FOUND', 'Non-routine finding was not found.', 404, {
        impact: 'Command was not applied.',
        requiredAction: 'Refresh Work Package and select an existing non-routine finding.',
        referenceId: id
      });
    }
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

  private assertNonRoutineResolutionReady(finding: SqlRow) {
    if (!nullableText(finding.disposition)) {
      throw maintenanceError(
        'NON_ROUTINE_NOT_ASSESSED',
        'Non-routine finding must be assessed before it can be resolved.',
        409,
        {
          impact: 'Temuan tetap terbuka.',
          requiredAction: 'Maintenance Controller harus melakukan assessment terlebih dahulu.',
          referenceId: String(finding.id)
        }
      );
    }
    if (String(finding.disposition) === 'NO_ACTION') return;
    const correctiveJobCardId = nullableText(finding.corrective_job_card_id);
    if (!correctiveJobCardId) {
      throw maintenanceError(
        'NON_ROUTINE_NOT_RESOLVED',
        'Corrective job card has not been created.',
        409,
        {
          impact: 'Temuan tetap terbuka dan release tetap diblokir.',
          requiredAction: 'Buat dan selesaikan Job Card korektif untuk temuan ini.',
          referenceId: String(finding.id)
        }
      );
    }
    const corrective = this.requireJobCard(correctiveJobCardId);
    if (String(corrective.status) !== 'READY_FOR_RELEASE_REVIEW') {
      throw maintenanceError(
        'NON_ROUTINE_NOT_RESOLVED',
        'Corrective job card is not ready for release review.',
        409,
        {
          impact: 'Temuan tetap terbuka dan release tetap diblokir.',
          requiredAction: 'Selesaikan sign-off, inspeksi, dan rework pada Job Card korektif.',
          referenceId: correctiveJobCardId
        }
      );
    }
    const openRework = this.openReworkActionForJobCard(correctiveJobCardId);
    if (openRework) {
      throw maintenanceError('REWORK_OPEN', 'Corrective job card still has open rework.', 409, {
        impact: 'Temuan tetap terbuka dan release tetap diblokir.',
        requiredAction: 'Selesaikan rework dan reinspection sebelum resolve non-routine.',
        referenceId: String(openRework.id)
      });
    }
    const materialBlockers = this.materialEligibility(
      String(finding.work_package_id),
      correctiveJobCardId
    );
    if (materialBlockers.length) {
      throw maintenanceError(
        'NON_ROUTINE_MATERIAL_INCOMPLETE',
        'Corrective material requirements are not complete.',
        409,
        {
          impact: 'Temuan tetap terbuka dan release tetap diblokir.',
          requiredAction: 'Selesaikan ATP, reserve, issue, dan install material korektif.',
          referenceId: String(finding.id),
          blockers: materialBlockers
        }
      );
    }
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

  private recordAircraftHistory(
    aircraftId: string,
    fromStatus: string | null,
    toStatus: string,
    reason: string,
    sourceType: string,
    sourceId: string | null,
    actor: MaintenanceActor
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO aircraft_status_history (
          id, aircraft_id, status_dimension, from_status, to_status, reason,
          source_type, source_id, actor_user_id, actor_role, occurred_at
        ) VALUES (?, ?, 'TECHNICAL', ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `ahist-${nanoid(12)}`,
        aircraftId,
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
      aircraftImageUrl: nullableText(row.aircraft_image_url),
      aircraftType: nullableText(row.aircraft_type) ?? undefined,
      aircraftModel: nullableText(row.aircraft_model) ?? undefined,
      sourceFlightId: nullableText(row.source_flight_id),
      primaryDefectId: nullableText(row.primary_defect_id),
      primaryDefectNumber: nullableText(row.primary_defect_number),
      sourceDueRequirementId: nullableText(row.source_due_requirement_id),
      sourceDueStatusId: nullableText(row.source_due_status_id),
      sourceDueRequirementCode: nullableText(row.source_due_requirement_code),
      sourceDueRequirementTitle: nullableText(row.source_due_requirement_title),
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
            nonRoutineFindings: this.nonRoutineFindings(id),
            currentMaintenanceSlot: this.currentMaintenanceSlot(id),
            readinessPanel: this.getReadinessPanel(id),
            releaseEligibility: this.evaluateReleaseEligibility(id),
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

  private runImmediateMaintenanceTransaction<T>(operation: () => T): T {
    return this.sqlite.inTransaction ? operation() : this.sqlite.transaction(operation).immediate();
  }

  private toCanonicalSlotTimestamp(value: string) {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) {
      throw maintenanceError('INVALID_SLOT_TIME', 'Slot timestamp is invalid.', 422, {
        impact: 'Slot maintenance tidak dapat dievaluasi.',
        requiredAction: 'Gunakan waktu mulai dan selesai dengan timezone yang eksplisit.',
        referenceId: null
      });
    }
    return new Date(parsed).toISOString();
  }

  private addDaysIso(value: string, days: number) {
    const date = new Date(value);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
  }

  private requireFacilityHierarchy(input: MaintenanceSlotAvailabilityInput) {
    const row = this.sqlite
      .prepare(
        `SELECT facility.id AS facility_id, facility.station_id, facility.code AS facility_code,
                facility.name AS facility_name, facility.facility_type, facility.active AS facility_active,
                COALESCE(NULLIF(facility.timezone, ''), station.timezone) AS station_timezone,
                station.station_code, station.station_name,
                area.id AS area_id, area.code AS area_code, area.name AS area_name,
                area.area_type, area.active AS area_active,
                bay.id AS bay_id, bay.code AS bay_code, bay.name AS bay_name,
                bay.capacity, bay.active AS bay_active
         FROM maintenance_facility_bays bay
         JOIN maintenance_facility_areas area ON area.id = bay.area_id
         JOIN maintenance_facilities facility ON facility.id = area.facility_id
         JOIN stations station ON station.id = facility.station_id
         WHERE facility.id = ? AND area.id = ? AND bay.id = ?`
      )
      .get(input.facilityId, input.areaId, input.bayId) as SqlRow | undefined;
    if (!row) {
      throw maintenanceError('BAY_NOT_FOUND', 'Maintenance bay was not found.', 404, {
        impact: 'Slot maintenance tidak dibuat.',
        requiredAction: 'Pilih fasilitas, area, dan bay maintenance yang valid.',
        referenceId: input.bayId
      });
    }
    if (!Boolean(row.facility_active)) {
      throw maintenanceError('FACILITY_INACTIVE', 'Maintenance facility is inactive.', 409, {
        impact: 'Slot maintenance tidak dibuat.',
        requiredAction: 'Pilih fasilitas maintenance aktif.',
        referenceId: input.facilityId
      });
    }
    if (!Boolean(row.area_active)) {
      throw maintenanceError('FACILITY_AREA_INACTIVE', 'Maintenance area is inactive.', 409, {
        impact: 'Slot maintenance tidak dibuat.',
        requiredAction: 'Pilih hangar/area maintenance aktif.',
        referenceId: input.areaId
      });
    }
    if (!Boolean(row.bay_active)) {
      throw maintenanceError('BAY_INACTIVE', 'Maintenance bay is inactive.', 409, {
        impact: 'Slot maintenance tidak dibuat.',
        requiredAction: 'Pilih bay maintenance aktif.',
        referenceId: input.bayId
      });
    }
    if (number(row.capacity) !== 1) {
      throw maintenanceError('INVALID_BAY_CAPACITY', 'M5.5 supports bay capacity 1 only.', 422, {
        impact: 'Slot maintenance tidak dibuat.',
        requiredAction: 'Gunakan bay dengan kapasitas satu aircraft untuk Demo-v3 M5.5.',
        referenceId: input.bayId
      });
    }
    return row;
  }

  private evaluateMaintenanceSlotAvailability(
    workPackageId: string,
    input: MaintenanceSlotAvailabilityInput,
    excludeSlotId?: string
  ): MaintenanceSlotAvailabilityDto {
    const workPackage = this.requireWorkPackage(workPackageId);
    if (['RELEASED', 'CANCELLED'].includes(String(workPackage.status))) {
      throw maintenanceError(
        'MAINTENANCE_PACKAGE_SLOT_STATE_INVALID',
        'Work Package cannot receive a new maintenance slot in its current state.',
        409,
        {
          impact: 'Slot maintenance tidak dapat dibuat atau diubah.',
          requiredAction: 'Pilih Work Package aktif yang belum dirilis atau dibatalkan.',
          referenceId: workPackageId
        }
      );
    }
    const hierarchy = this.requireFacilityHierarchy(input);
    const start = this.toCanonicalSlotTimestamp(input.plannedStartAt);
    const end = this.toCanonicalSlotTimestamp(input.plannedEndAt);
    if (start >= end) {
      throw maintenanceError('INVALID_SLOT_TIME', 'Slot end must be after slot start.', 422, {
        impact: 'Slot maintenance tidak dapat dibuat.',
        requiredAction: 'Pilih waktu selesai setelah waktu mulai.',
        referenceId: workPackageId
      });
    }
    const aircraft = this.requireAircraft(String(workPackage.aircraft_id));
    const aircraftStationId = nullableText(aircraft.current_station_id);
    if (aircraftStationId && aircraftStationId !== String(hierarchy.station_id)) {
      throw maintenanceError(
        'FACILITY_STATION_MISMATCH',
        'Maintenance facility station does not match the Work Package aircraft station.',
        409,
        {
          impact: 'Slot maintenance tidak dibuat.',
          requiredAction: 'Pilih fasilitas pada station aircraft/Work Package yang sama.',
          referenceId: workPackageId,
          aircraftStationId,
          facilityStationId: String(hierarchy.station_id)
        }
      );
    }

    const conflicts = this.findMaintenanceSlotConflicts({
      workPackageId,
      aircraftId: String(workPackage.aircraft_id),
      bayId: input.bayId,
      plannedStartAt: start,
      plannedEndAt: end,
      excludeSlotId
    });
    return {
      workPackageId,
      aircraftId: String(workPackage.aircraft_id),
      stationId: String(hierarchy.station_id),
      facilityId: input.facilityId,
      areaId: input.areaId,
      bayId: input.bayId,
      plannedStartAt: start,
      plannedEndAt: end,
      available: conflicts.length === 0,
      conflicts
    };
  }

  private findMaintenanceSlotConflicts(input: {
    workPackageId: string;
    aircraftId: string;
    bayId: string;
    plannedStartAt: string;
    plannedEndAt: string;
    excludeSlotId?: string;
  }): MaintenanceSlotConflictDto[] {
    const excludeSql = input.excludeSlotId ? 'AND slot.id <> ?' : '';
    const params = input.excludeSlotId ? [input.excludeSlotId] : [];
    const bayRows = this.sqlite
      .prepare(
        `${this.maintenanceSlotSelectSql()} WHERE slot.status IN ('BOOKED', 'IN_PROGRESS')
        AND slot.bay_id = ?
        AND slot.planned_start_at < ?
        AND slot.planned_end_at > ?
        ${excludeSql}`
      )
      .all(input.bayId, input.plannedEndAt, input.plannedStartAt, ...params) as SqlRow[];
    const aircraftRows = this.sqlite
      .prepare(
        `${this.maintenanceSlotSelectSql()} WHERE slot.status IN ('BOOKED', 'IN_PROGRESS')
        AND slot.aircraft_id = ?
        AND slot.planned_start_at < ?
        AND slot.planned_end_at > ?
        ${excludeSql}`
      )
      .all(input.aircraftId, input.plannedEndAt, input.plannedStartAt, ...params) as SqlRow[];
    const workPackageRows = this.sqlite
      .prepare(
        `${this.maintenanceSlotSelectSql()} WHERE slot.status IN ('BOOKED', 'IN_PROGRESS')
        AND slot.work_package_id = ?
        ${excludeSql}`
      )
      .all(input.workPackageId, ...params) as SqlRow[];
    return [
      ...bayRows.map((row) => this.toMaintenanceSlotConflictDto(row, 'BAY')),
      ...aircraftRows.map((row) => this.toMaintenanceSlotConflictDto(row, 'AIRCRAFT')),
      ...workPackageRows.map((row) => this.toMaintenanceSlotConflictDto(row, 'WORK_PACKAGE'))
    ].filter(
      (conflict, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.slotId === conflict.slotId && candidate.conflictType === conflict.conflictType
        ) === index
    );
  }

  private assertMaintenanceSlotAvailable(
    availability: MaintenanceSlotAvailabilityDto,
    workPackageId: string
  ) {
    const first = availability.conflicts[0];
    if (!first) return;
    const code =
      first.conflictType === 'AIRCRAFT' ? 'AIRCRAFT_SLOT_CONFLICT' : 'FACILITY_SLOT_CONFLICT';
    const message =
      first.conflictType === 'AIRCRAFT'
        ? 'Aircraft already has an overlapping maintenance slot.'
        : 'Maintenance bay already has an overlapping booking.';
    throw maintenanceError(code, message, 409, {
      impact: 'Slot maintenance tidak dibuat.',
      requiredAction:
        first.conflictType === 'AIRCRAFT'
          ? 'Pilih waktu yang tidak bentrok dengan slot aircraft ini.'
          : 'Pilih bay atau waktu maintenance yang tersedia.',
      referenceId: workPackageId,
      conflicts: availability.conflicts
    });
  }

  private readinessDimension(
    status: MaintenanceSlotReadinessDto['status'],
    summary: string,
    blockers: MaintenanceEligibilityBlockerDto[] = [],
    warnings: MaintenanceEligibilityBlockerDto[] = []
  ) {
    return { status, summary, blockers, warnings };
  }

  private facilityBlocker(
    code: string,
    sourceId: string,
    message: string
  ): MaintenanceEligibilityBlockerDto {
    return {
      code,
      category: 'AIRCRAFT_CONFIGURATION',
      severity: 'BLOCKING',
      title: code.replaceAll('_', ' '),
      message,
      sourceType: 'MAINTENANCE_SLOT',
      sourceId,
      nextAction: 'Resolve facility operations blocker before continuing.'
    };
  }

  private fromResourceBlocker(blocker: {
    code: string;
    category: string;
    severity: 'WARNING' | 'BLOCKING';
    title: string;
    message: string;
    sourceType?: string;
    sourceId?: string;
    suggestedAction?: string;
  }): MaintenanceEligibilityBlockerDto {
    const category = [
      'WORK',
      'INSPECTION',
      'REWORK',
      'AUTHORIZATION',
      'AMO_SCOPE',
      'APPROVED_DATA',
      'DUE_CONTROL',
      'MATERIAL',
      'TOOLING',
      'DEFERMENT',
      'AIRCRAFT_CONFIGURATION',
      'RECORD'
    ].includes(blocker.category)
      ? (blocker.category as MaintenanceEligibilityBlockerDto['category'])
      : 'RECORD';
    return {
      code: blocker.code,
      category,
      severity: blocker.severity,
      title: blocker.title,
      message: blocker.message,
      sourceType: blocker.sourceType,
      sourceId: blocker.sourceId,
      nextAction: blocker.suggestedAction
    };
  }

  private requireGseRequirementRow(requirementId: string) {
    const row = this.sqlite
      .prepare(`SELECT * FROM maintenance_gse_requirements WHERE id = ?`)
      .get(requirementId) as SqlRow | undefined;
    if (!row) {
      throw maintenanceError('GSE_REQUIREMENT_NOT_FOUND', 'GSE requirement was not found.', 404, {
        impact: 'Perintah GSE tidak diterapkan.',
        requiredAction: 'Refresh resource panel Work Package.',
        referenceId: requirementId
      });
    }
    return row;
  }

  private requireGseRequirement(requirementId: string): MaintenanceGseRequirementDto {
    const row = this.sqlite
      .prepare(
        `SELECT req.*,
                (SELECT COUNT(*) FROM maintenance_gse_allocations alloc
                 WHERE alloc.requirement_id = req.id
                   AND alloc.status IN ('ALLOCATED', 'STAGED', 'IN_USE')) AS allocated_count,
                (SELECT COUNT(*) FROM maintenance_gse_allocations alloc
                 JOIN maintenance_facility_resource_staging staging
                   ON staging.resource_type = 'GSE' AND staging.allocation_id = alloc.id
                  AND staging.status IN ('STAGED', 'IN_USE')
                 WHERE alloc.requirement_id = req.id
                   AND alloc.status IN ('ALLOCATED', 'STAGED', 'IN_USE')) AS staged_count
         FROM maintenance_gse_requirements req
         WHERE req.id = ?`
      )
      .get(requirementId) as SqlRow | undefined;
    if (!row) return this.toGseRequirementDto(this.requireGseRequirementRow(requirementId));
    return this.toGseRequirementDto(row);
  }

  private toGseRequirementDto(row: SqlRow): MaintenanceGseRequirementDto {
    return {
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      equipmentType: String(row.equipment_type),
      quantity: number(row.quantity),
      mandatory: Boolean(row.mandatory),
      allocatedQuantity: number(row.allocated_count),
      stagedQuantity: number(row.staged_count),
      status: String(row.status) as MaintenanceGseRequirementDto['status'],
      notes: nullableText(row.notes),
      createdByUserId: String(row.created_by_user_id),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private requireGseAsset(assetId: string) {
    const row = this.sqlite
      .prepare(`SELECT * FROM managed_assets WHERE id = ? AND category = 'GSE'`)
      .get(assetId) as SqlRow | undefined;
    if (!row) {
      throw maintenanceError('GSE_NOT_FOUND', 'GSE asset was not found.', 404, {
        impact: 'GSE tidak dialokasikan.',
        requiredAction: 'Pilih asset GSE dari master corporate assets.',
        referenceId: assetId
      });
    }
    return row;
  }

  private evaluateGseCandidate(
    asset: SqlRow,
    requirement: SqlRow,
    slot: MaintenanceSlotDto | null
  ): MaintenanceGseCandidateDto {
    const reasons: string[] = [];
    if (String(asset.lifecycle_status) !== 'ACTIVE') reasons.push('GSE_INACTIVE');
    if (String(asset.condition_status) !== 'SERVICEABLE') reasons.push('GSE_NOT_SERVICEABLE');
    const haystack =
      `${String(asset.asset_code)} ${String(asset.name)} ${nullableText(asset.model) ?? ''}`.toUpperCase();
    if (!haystack.includes(String(requirement.equipment_type).toUpperCase()))
      reasons.push('GSE_TYPE_MISMATCH');
    let conflictingWorkPackageId: string | null = null;
    let availabilityStatus: MaintenanceGseCandidateDto['availabilityStatus'] = slot
      ? 'AVAILABLE'
      : 'NOT_SCHEDULE_VALIDATED';
    if (slot) {
      const conflict = this.sqlite
        .prepare(
          `SELECT alloc.work_package_id
           FROM maintenance_gse_allocations alloc
           JOIN maintenance_slots active_slot ON active_slot.work_package_id = alloc.work_package_id
            AND active_slot.status IN ('BOOKED', 'IN_PROGRESS')
           WHERE alloc.asset_id = ?
             AND alloc.work_package_id <> ?
             AND alloc.status IN ('ALLOCATED', 'STAGED', 'IN_USE')
             AND active_slot.planned_start_at < ?
             AND active_slot.planned_end_at > ?
           LIMIT 1`
        )
        .get(String(asset.id), slot.workPackageId, slot.plannedEndAt, slot.plannedStartAt) as
        SqlRow | undefined;
      if (conflict) {
        reasons.push('GSE_SCHEDULE_CONFLICT');
        conflictingWorkPackageId = String(conflict.work_package_id);
        availabilityStatus = 'NOT_AVAILABLE';
      }
    }
    return {
      assetId: String(asset.id),
      assetCode: String(asset.asset_code),
      name: String(asset.name),
      equipmentType: String(requirement.equipment_type),
      stationId: nullableText(asset.station_id),
      conditionStatus: String(asset.condition_status),
      lifecycleStatus: String(asset.lifecycle_status),
      eligible: reasons.length === 0,
      reasons,
      availabilityStatus,
      conflictingWorkPackageId
    };
  }

  private activeGseAllocationCount(requirementId: string) {
    const row = this.sqlite
      .prepare(
        `SELECT COUNT(*) AS count
         FROM maintenance_gse_allocations
         WHERE requirement_id = ? AND status IN ('ALLOCATED', 'STAGED', 'IN_USE')`
      )
      .get(requirementId) as SqlRow;
    return number(row.count);
  }

  private requireGseAllocation(allocationId: string): MaintenanceGseAllocationDto {
    const row = this.sqlite
      .prepare(
        `SELECT alloc.*, req.equipment_type, asset.asset_code, asset.name AS asset_name
         FROM maintenance_gse_allocations alloc
         JOIN maintenance_gse_requirements req ON req.id = alloc.requirement_id
         JOIN managed_assets asset ON asset.id = alloc.asset_id
         WHERE alloc.id = ?`
      )
      .get(allocationId) as SqlRow | undefined;
    if (!row) {
      throw maintenanceError('GSE_ALLOCATION_NOT_FOUND', 'GSE allocation was not found.', 404, {
        impact: 'Perintah GSE tidak diterapkan.',
        requiredAction: 'Refresh resource panel.',
        referenceId: allocationId
      });
    }
    return this.toGseAllocationDto(row);
  }

  private listGseAllocations(workPackageId: string): MaintenanceGseAllocationDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT alloc.*, req.equipment_type, asset.asset_code, asset.name AS asset_name
         FROM maintenance_gse_allocations alloc
         JOIN maintenance_gse_requirements req ON req.id = alloc.requirement_id
         JOIN managed_assets asset ON asset.id = alloc.asset_id
         WHERE alloc.work_package_id = ?
         ORDER BY alloc.allocated_at`
      )
      .all(workPackageId) as SqlRow[];
    return rows.map((row) => this.toGseAllocationDto(row));
  }

  private toGseAllocationDto(row: SqlRow): MaintenanceGseAllocationDto {
    return {
      id: String(row.id),
      requirementId: String(row.requirement_id),
      workPackageId: String(row.work_package_id),
      slotId: nullableText(row.slot_id),
      assetId: String(row.asset_id),
      assetCode: String(row.asset_code),
      assetName: String(row.asset_name),
      equipmentType: String(row.equipment_type),
      status: String(row.status) as MaintenanceGseAllocationDto['status'],
      allocatedByUserId: String(row.allocated_by_user_id),
      allocatedAt: String(row.allocated_at),
      releasedByUserId: nullableText(row.released_by_user_id),
      releasedAt: nullableText(row.released_at)
    };
  }

  private stageResource(
    resourceType: 'TOOL' | 'GSE',
    slotId: string,
    input: StageMaintenanceResourceInput,
    actor: MaintenanceActor
  ): MaintenanceFacilityResourceStagingDto {
    let stagingId: string | null = null;
    this.runImmediateMaintenanceTransaction(() => {
      if (input.idempotencyKey) {
        const existing = this.sqlite
          .prepare(
            `SELECT id FROM maintenance_facility_resource_staging
             WHERE resource_type = ? AND allocation_id = ? AND idempotency_key = ?`
          )
          .get(resourceType, input.allocationId, input.idempotencyKey) as SqlRow | undefined;
        if (existing) {
          stagingId = String(existing.id);
          return;
        }
      }
      const slot = this.requireMaintenanceSlot(slotId);
      const allocation =
        resourceType === 'GSE'
          ? this.requireGseAllocation(input.allocationId)
          : this.requireToolAllocationForStaging(input.allocationId);
      if (allocation.workPackageId !== slot.workPackageId) {
        throw maintenanceError(
          'RESOURCE_STAGING_PACKAGE_MISMATCH',
          'Resource allocation does not belong to this slot Work Package.',
          409,
          {
            impact: 'Resource tidak di-stage ke bay.',
            requiredAction: 'Pilih allocation dari Work Package yang sama.',
            referenceId: input.allocationId
          }
        );
      }
      const timestamp = now();
      stagingId = `mstg-${nanoid(12)}`;
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_facility_resource_staging (
            id, resource_type, allocation_id, work_package_id, slot_id, bay_id, resource_id,
            status, idempotency_key, staged_by_user_id, staged_at, note, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'STAGED', ?, ?, ?, ?, ?)`
        )
        .run(
          stagingId,
          resourceType,
          input.allocationId,
          slot.workPackageId,
          slot.id,
          slot.bayId,
          resourceType === 'GSE'
            ? (allocation as MaintenanceGseAllocationDto).assetId
            : (allocation as { toolId: string }).toolId,
          input.idempotencyKey ?? null,
          actor.userId,
          timestamp,
          input.note ?? null,
          timestamp
        );
      if (resourceType === 'GSE') {
        this.sqlite
          .prepare(
            `UPDATE maintenance_gse_allocations SET status = 'STAGED', updated_at = ? WHERE id = ?`
          )
          .run(timestamp, input.allocationId);
      }
      this.audit(
        'FACILITY_RESOURCE_STAGING',
        stagingId,
        resourceType === 'GSE' ? 'GSE_STAGED' : 'TOOL_STAGED',
        actor,
        null,
        null,
        {
          slotId,
          allocationId: input.allocationId,
          resourceType
        }
      );
    });
    return this.requireResourceStaging(stagingId!);
  }

  private requireToolAllocationForStaging(allocationId: string) {
    const row = this.sqlite
      .prepare(
        `SELECT alloc.*, tm.tool_code, tm.name AS tool_name, tm.status AS tool_status,
                tm.calibration_required,
                (SELECT expires_at FROM maintenance_tool_calibration_records cal
                 WHERE cal.tool_id = tm.id AND cal.status = 'CURRENT'
                 ORDER BY cal.expires_at DESC LIMIT 1) AS calibration_expires_at
         FROM maintenance_tool_allocations_v2 alloc
         JOIN maintenance_tool_masters tm ON tm.id = alloc.tool_id
         WHERE alloc.id = ?`
      )
      .get(allocationId) as (SqlRow & { workPackageId?: string; toolId?: string }) | undefined;
    if (!row || !['ALLOCATED', 'IN_USE'].includes(String(row.status))) {
      throw maintenanceError(
        'TOOL_ALLOCATION_NOT_ACTIVE',
        'Tool allocation is not active for staging.',
        409,
        {
          impact: 'Tool tidak di-stage ke bay.',
          requiredAction: 'Pilih allocated tool yang aktif.',
          referenceId: allocationId
        }
      );
    }
    if (['OUT_OF_SERVICE', 'CALIBRATION_EXPIRED'].includes(String(row.tool_status))) {
      throw maintenanceError('TOOL_NOT_SERVICEABLE', 'Tool is not serviceable for staging.', 409, {
        impact: 'Tool tidak di-stage ke bay.',
        requiredAction: 'Pilih tool yang serviceable dan valid.',
        referenceId: allocationId
      });
    }
    const calibrationExpires = nullableText(row.calibration_expires_at);
    if (Boolean(row.calibration_required) && (!calibrationExpires || calibrationExpires <= now())) {
      throw maintenanceError(
        'TOOL_CALIBRATION_EXPIRED',
        'Tool calibration is expired for staging.',
        409,
        {
          impact: 'Tool tidak di-stage ke bay.',
          requiredAction: 'Gunakan tool dengan kalibrasi valid.',
          referenceId: allocationId
        }
      );
    }
    return {
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      toolId: String(row.tool_id),
      assetId: String(row.tool_id)
    };
  }

  private requireResourceStagingRow(stagingId: string) {
    const row = this.sqlite
      .prepare(`SELECT * FROM maintenance_facility_resource_staging WHERE id = ?`)
      .get(stagingId) as SqlRow | undefined;
    if (!row) {
      throw maintenanceError(
        'RESOURCE_STAGING_NOT_FOUND',
        'Facility resource staging record was not found.',
        404,
        {
          impact: 'Perintah staging tidak diterapkan.',
          requiredAction: 'Refresh Facility Operations.',
          referenceId: stagingId
        }
      );
    }
    return row;
  }

  private requireResourceStaging(stagingId: string): MaintenanceFacilityResourceStagingDto {
    return this.toResourceStagingDto(this.requireResourceStagingRow(stagingId));
  }

  private listResourceStaging(slotId: string): MaintenanceFacilityResourceStagingDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_facility_resource_staging WHERE slot_id = ? ORDER BY staged_at`
      )
      .all(slotId) as SqlRow[];
    return rows.map((row) => this.toResourceStagingDto(row));
  }

  private toResourceStagingDto(row: SqlRow): MaintenanceFacilityResourceStagingDto {
    let resourceCode = String(row.resource_id);
    let resourceName = resourceCode;
    if (String(row.resource_type) === 'GSE') {
      const asset = this.sqlite
        .prepare(`SELECT asset_code, name FROM managed_assets WHERE id = ?`)
        .get(String(row.resource_id)) as SqlRow | undefined;
      resourceCode = asset ? String(asset.asset_code) : resourceCode;
      resourceName = asset ? String(asset.name) : resourceName;
    } else {
      const tool = this.sqlite
        .prepare(`SELECT tool_code, name FROM maintenance_tool_masters WHERE id = ?`)
        .get(String(row.resource_id)) as SqlRow | undefined;
      resourceCode = tool ? String(tool.tool_code) : resourceCode;
      resourceName = tool ? String(tool.name) : resourceName;
    }
    const bay = this.sqlite
      .prepare(`SELECT code FROM maintenance_facility_bays WHERE id = ?`)
      .get(String(row.bay_id)) as SqlRow | undefined;
    return {
      id: String(row.id),
      resourceType: String(
        row.resource_type
      ) as MaintenanceFacilityResourceStagingDto['resourceType'],
      allocationId: String(row.allocation_id),
      workPackageId: String(row.work_package_id),
      slotId: String(row.slot_id),
      bayId: String(row.bay_id),
      bayCode: bay ? String(bay.code) : String(row.bay_id),
      resourceId: String(row.resource_id),
      resourceCode,
      resourceName,
      status: String(row.status) as MaintenanceFacilityResourceStagingDto['status'],
      stagedByUserId: String(row.staged_by_user_id),
      stagedAt: String(row.staged_at),
      releasedByUserId: nullableText(row.released_by_user_id),
      releasedAt: nullableText(row.released_at),
      note: nullableText(row.note)
    };
  }

  private listAircraftCustodies(input: {
    dateFrom?: string;
    dateTo?: string;
    aircraftId?: string;
  }): MaintenanceAircraftCustodyDto[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (input.aircraftId) {
      where.push('custody.aircraft_id = ?');
      params.push(input.aircraftId);
    }
    if (input.dateFrom && input.dateTo) {
      where.push(`COALESCE(custody.handed_back_at, custody.updated_at) >= ?`);
      where.push(`COALESCE(custody.actual_start_at, custody.created_at) <= ?`);
      params.push(input.dateFrom, input.dateTo);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = this.sqlite
      .prepare(`${this.custodySelectSql()} ${whereSql} ORDER BY custody.updated_at DESC`)
      .all(...params) as SqlRow[];
    return rows.map((row) => toMaintenanceAircraftCustodyDto(row));
  }

  private listOperationalOccupancyConflicts(dateFrom: string, dateTo: string) {
    const rows = this.sqlite
      .prepare(
        `SELECT slot.id AS slot_id, custody.id AS custody_id, slot.bay_id,
                bay.code AS bay_code, slot.planned_start_at, slot.planned_end_at,
                custody.actual_start_at, custody.in_bay_at, custody.status
         FROM maintenance_slots slot
         JOIN maintenance_facility_bays bay ON bay.id = slot.bay_id
         JOIN maintenance_aircraft_custodies custody
           ON custody.bay_id = slot.bay_id
          AND custody.slot_id <> slot.id
          AND custody.status IN ('MOVING_IN', 'IN_BAY', 'READY_FOR_MOVE_OUT', 'MOVING_OUT', 'HANDBACK_PENDING')
         WHERE slot.status = 'BOOKED'
           AND slot.planned_start_at < ?
           AND slot.planned_end_at > ?`
      )
      .all(dateTo, dateFrom) as SqlRow[];
    return rows.map((row) => ({
      code: 'BAY_ACTUAL_OCCUPANCY_CONFLICT' as const,
      slotId: String(row.slot_id),
      custodyId: String(row.custody_id),
      bayId: String(row.bay_id),
      bayCode: String(row.bay_code),
      reason: `Bay ${String(row.bay_code)} is actually occupied while another slot is booked.`
    }));
  }

  private custodySelectSql() {
    return `SELECT custody.*, wp.package_number,
                   aircraft.registration_number AS aircraft_registration_number,
                   facility.name AS facility_name,
                   area.name AS area_name,
                   bay.code AS bay_code
            FROM maintenance_aircraft_custodies custody
            JOIN maintenance_work_packages wp ON wp.id = custody.work_package_id
            JOIN aircraft ON aircraft.id = custody.aircraft_id
            JOIN maintenance_facilities facility ON facility.id = custody.facility_id
            JOIN maintenance_facility_areas area ON area.id = custody.area_id
            JOIN maintenance_facility_bays bay ON bay.id = custody.bay_id`;
  }

  private requireAircraftCustody(custodyId: string): MaintenanceAircraftCustodyDto {
    const row = this.sqlite
      .prepare(`${this.custodySelectSql()} WHERE custody.id = ?`)
      .get(custodyId) as SqlRow | undefined;
    if (!row) {
      throw maintenanceError(
        'MAINTENANCE_CUSTODY_NOT_FOUND',
        'Maintenance custody record was not found.',
        404,
        {
          impact: 'Perintah movement tidak diterapkan.',
          requiredAction: 'Refresh Facility Operations.',
          referenceId: custodyId
        }
      );
    }
    return toMaintenanceAircraftCustodyDto(row);
  }

  private requireActiveCustodyForSlot(slotId: string): MaintenanceAircraftCustodyDto {
    const row = this.sqlite
      .prepare(
        `${this.custodySelectSql()} WHERE custody.slot_id = ?
        AND custody.status IN ('MOVING_IN', 'IN_BAY', 'READY_FOR_MOVE_OUT', 'MOVING_OUT', 'HANDBACK_PENDING')
        ORDER BY custody.updated_at DESC LIMIT 1`
      )
      .get(slotId) as SqlRow | undefined;
    if (!row) {
      throw maintenanceError(
        'MAINTENANCE_CUSTODY_NOT_FOUND',
        'No active maintenance custody exists for this slot.',
        404,
        {
          impact: 'Perintah movement tidak diterapkan.',
          requiredAction: 'Mulai movement/check-in aircraft terlebih dahulu.',
          referenceId: slotId
        }
      );
    }
    return toMaintenanceAircraftCustodyDto(row);
  }

  private assertNoActiveBayOccupancy(bayId: string, slotId: string, excludeCustodyId?: string) {
    const row = this.sqlite
      .prepare(
        `SELECT id FROM maintenance_aircraft_custodies
         WHERE bay_id = ?
           AND slot_id <> ?
           AND (? IS NULL OR id <> ?)
           AND status IN ('MOVING_IN', 'IN_BAY', 'READY_FOR_MOVE_OUT', 'MOVING_OUT', 'HANDBACK_PENDING')
         LIMIT 1`
      )
      .get(bayId, slotId, excludeCustodyId ?? null, excludeCustodyId ?? null) as SqlRow | undefined;
    if (row) {
      throw maintenanceError(
        'BAY_ACTUALLY_OCCUPIED',
        'Maintenance bay is physically occupied.',
        409,
        {
          impact: 'Aircraft tidak dapat masuk ke bay.',
          requiredAction:
            'Pilih bay lain atau lakukan handback aircraft yang sedang menempati bay.',
          referenceId: bayId,
          custodyId: String(row.id)
        }
      );
    }
  }

  private assertNoActiveAircraftCustody(aircraftId: string, slotId: string) {
    const row = this.sqlite
      .prepare(
        `SELECT id FROM maintenance_aircraft_custodies
         WHERE aircraft_id = ?
           AND slot_id <> ?
           AND status IN ('MOVING_IN', 'IN_BAY', 'READY_FOR_MOVE_OUT', 'MOVING_OUT', 'HANDBACK_PENDING')
         LIMIT 1`
      )
      .get(aircraftId, slotId) as SqlRow | undefined;
    if (row) {
      throw maintenanceError(
        'AIRCRAFT_ALREADY_IN_MAINTENANCE',
        'Aircraft is already under maintenance custody.',
        409,
        {
          impact: 'Aircraft tidak dapat masuk ke fasilitas kedua.',
          requiredAction: 'Selesaikan handback custody yang aktif terlebih dahulu.',
          referenceId: aircraftId,
          custodyId: String(row.id)
        }
      );
    }
  }

  private recordCustodyEvent(
    custodyId: string,
    slot: MaintenanceSlotDto,
    fromStatus: string | null,
    toStatus: string,
    eventType: string,
    actor: MaintenanceActor,
    note: string | null,
    occurredAt: string
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_aircraft_custody_events (
          id, custody_id, slot_id, work_package_id, aircraft_id, event_type,
          actor_user_id, actor_role, from_status, to_status, note, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `mcustev-${nanoid(12)}`,
        custodyId,
        slot.id,
        slot.workPackageId,
        slot.aircraftId,
        eventType,
        actor.userId,
        actor.role,
        fromStatus,
        toStatus,
        note,
        occurredAt
      );
  }

  private firstAreaForFacility(facilityId: string) {
    const row = this.sqlite
      .prepare(
        `SELECT id FROM maintenance_facility_areas WHERE facility_id = ? AND active = 1 ORDER BY code LIMIT 1`
      )
      .get(facilityId) as SqlRow | undefined;
    if (!row)
      throw maintenanceError(
        'FACILITY_AREA_NOT_FOUND',
        'Maintenance facility area was not found.',
        404,
        {
          impact: 'Shift maintenance tidak dibuat.',
          requiredAction: 'Pastikan facility memiliki area aktif.',
          referenceId: facilityId
        }
      );
    return String(row.id);
  }

  private firstBayForFacility(facilityId: string) {
    const row = this.sqlite
      .prepare(
        `SELECT bay.id
         FROM maintenance_facility_bays bay
         JOIN maintenance_facility_areas area ON area.id = bay.area_id
         WHERE area.facility_id = ? AND area.active = 1 AND bay.active = 1
         ORDER BY area.code, bay.code LIMIT 1`
      )
      .get(facilityId) as SqlRow | undefined;
    if (!row)
      throw maintenanceError('BAY_NOT_FOUND', 'Maintenance bay was not found.', 404, {
        impact: 'Shift maintenance tidak dibuat.',
        requiredAction: 'Pastikan facility memiliki bay aktif.',
        referenceId: facilityId
      });
    return String(row.id);
  }

  private requireFacilityShift(shiftId: string): MaintenanceFacilityShiftDto {
    const row = this.sqlite
      .prepare(
        `SELECT shift.*, facility.name AS facility_name
         FROM maintenance_facility_shifts shift
         JOIN maintenance_facilities facility ON facility.id = shift.facility_id
         WHERE shift.id = ?`
      )
      .get(shiftId) as SqlRow | undefined;
    if (!row) {
      throw maintenanceError(
        'MAINTENANCE_SHIFT_NOT_FOUND',
        'Maintenance shift was not found.',
        404,
        {
          impact: 'Perintah shift tidak diterapkan.',
          requiredAction: 'Refresh Facility Operations.',
          referenceId: shiftId
        }
      );
    }
    return this.toFacilityShiftDto(row);
  }

  private listFacilityShifts(facilityId?: string): MaintenanceFacilityShiftDto[] {
    const where = facilityId ? 'WHERE shift.facility_id = ?' : '';
    const rows = this.sqlite
      .prepare(
        `SELECT shift.*, facility.name AS facility_name
         FROM maintenance_facility_shifts shift
         JOIN maintenance_facilities facility ON facility.id = shift.facility_id
         ${where}
         ORDER BY shift.start_at`
      )
      .all(...(facilityId ? [facilityId] : [])) as SqlRow[];
    return rows.map((row) => this.toFacilityShiftDto(row));
  }

  private toFacilityShiftDto(row: SqlRow): MaintenanceFacilityShiftDto {
    return {
      id: String(row.id),
      facilityId: String(row.facility_id),
      facilityName: String(row.facility_name),
      shiftDate: String(row.shift_date),
      name: String(row.name),
      startAt: String(row.start_at),
      endAt: String(row.end_at),
      status: String(row.status) as MaintenanceFacilityShiftDto['status'],
      supervisorPersonnelId: nullableText(row.supervisor_personnel_id),
      createdAt: String(row.created_at)
    };
  }

  private outstandingWorkReferences(workPackageId: string) {
    const jobCards = this.sqlite
      .prepare(
        `SELECT card_number FROM maintenance_job_cards
         WHERE work_package_id = ?
           AND status NOT IN ('READY_FOR_RELEASE_REVIEW', 'CANCELLED')
         ORDER BY card_number`
      )
      .all(workPackageId) as SqlRow[];
    const nonRoutine = this.sqlite
      .prepare(
        `SELECT finding_number FROM maintenance_non_routine_findings
         WHERE work_package_id = ? AND status NOT IN ('CLOSED', 'CANCELLED')
         ORDER BY finding_number`
      )
      .all(workPackageId) as SqlRow[];
    return [
      ...jobCards.map((row) => `JOB_CARD:${String(row.card_number)}`),
      ...nonRoutine.map((row) => `NON_ROUTINE:${String(row.finding_number)}`)
    ];
  }

  private requireShiftHandover(handoverId: string): MaintenanceShiftHandoverDto {
    const row = this.sqlite
      .prepare(`SELECT * FROM maintenance_shift_handovers WHERE id = ?`)
      .get(handoverId) as SqlRow | undefined;
    if (!row) {
      throw maintenanceError('SHIFT_HANDOVER_NOT_FOUND', 'Shift handover was not found.', 404, {
        impact: 'Perintah handover tidak diterapkan.',
        requiredAction: 'Refresh Facility Operations.',
        referenceId: handoverId
      });
    }
    return this.toShiftHandoverDto(row);
  }

  private listShiftHandovers(slotId: string): MaintenanceShiftHandoverDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_shift_handovers WHERE slot_id = ? ORDER BY prepared_at DESC`
      )
      .all(slotId) as SqlRow[];
    return rows.map((row) => this.toShiftHandoverDto(row));
  }

  private toShiftHandoverDto(row: SqlRow): MaintenanceShiftHandoverDto {
    return {
      id: String(row.id),
      slotId: String(row.slot_id),
      workPackageId: String(row.work_package_id),
      aircraftId: String(row.aircraft_id),
      outgoingShiftId: String(row.outgoing_shift_id),
      incomingShiftId: String(row.incoming_shift_id),
      status: String(row.status) as MaintenanceShiftHandoverDto['status'],
      notes: String(row.notes),
      safetyNotes: jsonArray(row.safety_notes_json),
      outstandingReferences: jsonArray(row.outstanding_refs_json),
      preparedByUserId: String(row.prepared_by_user_id),
      preparedAt: String(row.prepared_at),
      acknowledgedByUserId: nullableText(row.acknowledged_by_user_id),
      acknowledgedAt: nullableText(row.acknowledged_at)
    };
  }

  private maintenanceSlotSelectSql() {
    return `SELECT slot.*, wp.package_number, aircraft.registration_number AS aircraft_registration_number,
                   station.station_code, station.station_name,
                   COALESCE(NULLIF(facility.timezone, ''), station.timezone) AS station_timezone,
                   facility.code AS facility_code, facility.name AS facility_name,
                   area.code AS area_code, area.name AS area_name, area.area_type,
                   bay.code AS bay_code, bay.name AS bay_name
            FROM maintenance_slots slot
            JOIN maintenance_work_packages wp ON wp.id = slot.work_package_id
            JOIN aircraft ON aircraft.id = slot.aircraft_id
            JOIN stations station ON station.id = slot.station_id
            JOIN maintenance_facilities facility ON facility.id = slot.facility_id
            JOIN maintenance_facility_areas area ON area.id = slot.area_id
            JOIN maintenance_facility_bays bay ON bay.id = slot.bay_id`;
  }

  private requireMaintenanceSlotRow(slotId: string) {
    const row = this.sqlite.prepare('SELECT * FROM maintenance_slots WHERE id = ?').get(slotId) as
      SqlRow | undefined;
    if (!row) {
      throw maintenanceError('FACILITY_SLOT_NOT_FOUND', 'Maintenance slot was not found.', 404, {
        impact: 'Perintah slot maintenance tidak diterapkan.',
        requiredAction: 'Refresh Work Package dan pilih slot maintenance yang tersedia.',
        referenceId: slotId
      });
    }
    return row;
  }

  private requireMaintenanceSlot(slotId: string): MaintenanceSlotDto {
    const row = this.sqlite
      .prepare(`${this.maintenanceSlotSelectSql()} WHERE slot.id = ?`)
      .get(slotId) as SqlRow | undefined;
    if (!row) {
      throw maintenanceError('FACILITY_SLOT_NOT_FOUND', 'Maintenance slot was not found.', 404, {
        impact: 'Perintah slot maintenance tidak diterapkan.',
        requiredAction: 'Refresh Work Package dan pilih slot maintenance yang tersedia.',
        referenceId: slotId
      });
    }
    return this.toMaintenanceSlotDto(row);
  }

  private currentMaintenanceSlot(workPackageId: string): MaintenanceSlotDto | null {
    const row = this.sqlite
      .prepare(
        `${this.maintenanceSlotSelectSql()} WHERE slot.work_package_id = ?
        AND slot.status IN ('BOOKED', 'IN_PROGRESS')
        ORDER BY slot.updated_at DESC
        LIMIT 1`
      )
      .get(workPackageId) as SqlRow | undefined;
    return row ? this.toMaintenanceSlotDto(row) : null;
  }

  private toMaintenanceSlotDto(row: SqlRow): MaintenanceSlotDto {
    return {
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      packageNumber: String(row.package_number),
      aircraftId: String(row.aircraft_id),
      aircraftRegistrationNumber: String(row.aircraft_registration_number),
      stationId: String(row.station_id),
      stationCode: String(row.station_code),
      stationName: String(row.station_name),
      stationTimezone: String(row.station_timezone),
      facilityId: String(row.facility_id),
      facilityCode: String(row.facility_code),
      facilityName: String(row.facility_name),
      areaId: String(row.area_id),
      areaCode: String(row.area_code),
      areaName: String(row.area_name),
      areaType: String(row.area_type) as MaintenanceSlotDto['areaType'],
      bayId: String(row.bay_id),
      bayCode: String(row.bay_code),
      bayName: String(row.bay_name),
      plannedStartAt: String(row.planned_start_at),
      plannedEndAt: String(row.planned_end_at),
      actualStartAt: nullableText(row.actual_start_at),
      actualEndAt: nullableText(row.actual_end_at),
      status: String(row.status) as MaintenanceSlotDto['status'],
      createdByUserId: String(row.created_by_user_id),
      createdAt: String(row.created_at),
      updatedByUserId: nullableText(row.updated_by_user_id),
      updatedAt: String(row.updated_at),
      cancelledByUserId: nullableText(row.cancelled_by_user_id),
      cancelledAt: nullableText(row.cancelled_at),
      cancellationReason: nullableText(row.cancellation_reason)
    };
  }

  private toMaintenanceSlotConflictDto(
    row: SqlRow,
    conflictType: MaintenanceSlotConflictDto['conflictType']
  ): MaintenanceSlotConflictDto {
    return {
      slotId: String(row.id),
      conflictType,
      workPackageId: String(row.work_package_id),
      packageNumber: String(row.package_number),
      aircraftId: String(row.aircraft_id),
      aircraftRegistrationNumber: String(row.aircraft_registration_number),
      bayId: String(row.bay_id),
      bayCode: String(row.bay_code),
      plannedStartAt: String(row.planned_start_at),
      plannedEndAt: String(row.planned_end_at),
      status: String(row.status) as MaintenanceSlotConflictDto['status']
    };
  }

  private recordMaintenanceSlotEvent(
    slotId: string,
    eventType: 'BOOKED' | 'RESCHEDULED' | 'CANCELLED',
    actor: MaintenanceActor,
    occurredAt: string,
    details: {
      workPackageId: string;
      aircraftId: string;
      oldFacilityId?: string;
      oldAreaId?: string;
      oldBayId?: string;
      oldPlannedStartAt?: string;
      oldPlannedEndAt?: string;
      newFacilityId?: string;
      newAreaId?: string;
      newBayId?: string;
      newPlannedStartAt?: string;
      newPlannedEndAt?: string;
      reason: string | null;
    }
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_slot_events (
          id, slot_id, work_package_id, aircraft_id, event_type, actor_user_id, actor_role,
          old_facility_id, old_area_id, old_bay_id, old_planned_start_at, old_planned_end_at,
          new_facility_id, new_area_id, new_bay_id, new_planned_start_at, new_planned_end_at,
          reason, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `mslot-event-${nanoid(12)}`,
        slotId,
        details.workPackageId,
        details.aircraftId,
        eventType,
        actor.userId,
        actor.role,
        details.oldFacilityId ?? null,
        details.oldAreaId ?? null,
        details.oldBayId ?? null,
        details.oldPlannedStartAt ?? null,
        details.oldPlannedEndAt ?? null,
        details.newFacilityId ?? null,
        details.newAreaId ?? null,
        details.newBayId ?? null,
        details.newPlannedStartAt ?? null,
        details.newPlannedEndAt ?? null,
        details.reason,
        occurredAt
      );
  }

  private nonRoutineFindings(workPackageId: string): MaintenanceNonRoutineFindingDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT nr.*, source.card_number AS source_job_card_number,
                corrective.card_number AS corrective_job_card_number
         FROM maintenance_non_routine_findings nr
         LEFT JOIN maintenance_job_cards source ON source.id = nr.job_card_id
         LEFT JOIN maintenance_job_cards corrective ON corrective.id = nr.corrective_job_card_id
         WHERE nr.work_package_id = ?
         ORDER BY nr.created_at, nr.finding_number`
      )
      .all(workPackageId) as SqlRow[];
    return rows.map((row) => this.toNonRoutineFindingDto(row));
  }

  private toNonRoutineFindingDto(row: SqlRow): MaintenanceNonRoutineFindingDto {
    const workflowState = this.nonRoutineWorkflowState(row);
    return {
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      aircraftId: String(row.aircraft_id),
      sourceJobCardId: nullableText(row.job_card_id),
      sourceJobCardNumber: nullableText(row.source_job_card_number),
      correctiveJobCardId: nullableText(row.corrective_job_card_id),
      correctiveJobCardNumber: nullableText(row.corrective_job_card_number),
      findingNumber: String(row.finding_number),
      title: String(row.title),
      description: String(row.description),
      severity: String(row.severity ?? 'NORMAL') as MaintenanceNonRoutineFindingDto['severity'],
      location: nullableText(row.location),
      ataChapter: nullableText(row.ata_chapter),
      immediateSafetyConcern: Boolean(row.immediate_safety_concern),
      evidenceReferences: jsonArray(row.evidence_references_json),
      status: String(row.status) as MaintenanceNonRoutineFindingDto['status'],
      workflowState,
      disposition: nullableText(row.disposition) as MaintenanceNonRoutineFindingDto['disposition'],
      assessmentNote: nullableText(row.assessment_note),
      assessedByUserId: nullableText(row.assessed_by_user_id),
      assessedAt: nullableText(row.assessed_at),
      requiresIndependentInspection: Boolean(row.requires_independent_inspection),
      approvedDataRef: nullableText(row.approved_data_ref),
      foundByUserId: String(row.created_by_user_id),
      foundAt: String(row.created_at),
      resolvedAt: nullableText(row.resolved_at),
      resolvedByUserId: nullableText(row.resolved_by_user_id),
      resolutionNote: nullableText(row.resolution_note),
      closedAt: nullableText(row.closed_at),
      closedByUserId: nullableText(row.closed_by_user_id),
      closureNote: nullableText(row.closure_note),
      version: number(row.version),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      nextAction: this.nonRoutineNextAction(workflowState)
    };
  }

  private nonRoutineWorkflowState(row: SqlRow): MaintenanceNonRoutineFindingDto['workflowState'] {
    if (String(row.status) === 'CLOSED') return 'CLOSED';
    if (nullableText(row.resolved_at)) return 'RESOLVED';
    const disposition = nullableText(row.disposition);
    if (!disposition) return 'WAITING_ASSESSMENT';
    if (disposition === 'NO_ACTION') return 'READY_TO_RESOLVE';
    const correctiveJobCardId = nullableText(row.corrective_job_card_id);
    if (!correctiveJobCardId) return 'CORRECTIVE_WORK_REQUIRED';
    const card = this.sqlite
      .prepare('SELECT status FROM maintenance_job_cards WHERE id = ?')
      .get(correctiveJobCardId) as SqlRow | undefined;
    if (!card) return 'CORRECTIVE_WORK_REQUIRED';
    if (String(card.status) === 'REJECTED_FOR_REWORK') return 'REWORK_REQUIRED';
    if (String(card.status) === 'INSPECTION_REQUIRED') return 'AWAITING_INSPECTION';
    if (String(card.status) === 'READY_FOR_RELEASE_REVIEW') return 'READY_TO_RESOLVE';
    return 'IN_RECTIFICATION';
  }

  private nonRoutineNextAction(state: MaintenanceNonRoutineFindingDto['workflowState']): string {
    const labels: Record<MaintenanceNonRoutineFindingDto['workflowState'], string> = {
      WAITING_ASSESSMENT: 'Menunggu Assessment',
      CORRECTIVE_WORK_REQUIRED: 'Buat/Lanjutkan Pekerjaan Korektif',
      IN_RECTIFICATION: 'Lanjutkan Job Card korektif',
      AWAITING_INSPECTION: 'Menunggu Inspeksi',
      REWORK_REQUIRED: 'Lakukan Rework',
      READY_TO_RESOLVE: 'Resolve Temuan',
      RESOLVED: 'Tutup Temuan',
      CLOSED: 'Riwayat tertutup'
    };
    return labels[state];
  }

  private jobCards(workPackageId: string): MaintenanceJobCardDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT card.*, nr.finding_number AS source_non_routine_finding_number
         FROM maintenance_job_cards card
         LEFT JOIN maintenance_non_routine_findings nr
           ON nr.id = card.source_non_routine_finding_id
         WHERE card.work_package_id = ?
         ORDER BY card.created_at, card.card_number`
      )
      .all(workPackageId) as SqlRow[];
    return rows.map((row) => this.toJobCardDto(row));
  }

  private toJobCardDto(row: SqlRow): MaintenanceJobCardDto {
    return {
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      sourceNonRoutineFindingId: nullableText(row.source_non_routine_finding_id),
      sourceNonRoutineFindingNumber: nullableText(row.source_non_routine_finding_number),
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
