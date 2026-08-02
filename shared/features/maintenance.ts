import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const maintenanceWorkPackageStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'READY_FOR_RELEASE',
  'RELEASED',
  'CANCELLED'
]);

export const maintenanceJobCardStatusSchema = z.enum([
  'READY',
  'IN_PROGRESS',
  'INSPECTION_REQUIRED',
  'REJECTED_FOR_REWORK',
  'READY_FOR_RELEASE_REVIEW',
  'CANCELLED'
]);

export const maintenanceCompanyAuthorizationActionSchema = z.enum([
  'MECHANIC_SIGN_OFF',
  'REWORK_SIGN_OFF',
  'INDEPENDENT_INSPECTION',
  'INDEPENDENT_REINSPECTION',
  'TECHNICAL_RELEASE'
]);

export const maintenanceCompanyAuthorizationStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const maintenanceListQuerySchema = z.object({
  aircraftId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable()).optional(),
  status: z.preprocess(emptyToUndefined, maintenanceWorkPackageStatusSchema.optional()),
  search: z.string().trim().max(120).optional().default(''),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0)
});

export const maintenanceAuditListQuerySchema = z.object({
  aircraft: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  package: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  entityType: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  action: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  actorRole: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  search: z.preprocess(emptyToUndefined, z.string().trim().max(160).optional()),
  dateFrom: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  dateTo: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0)
});

export const maintenanceIdParamsSchema = z.object({ id: z.string().trim().min(1) });

const evidenceReferencesSchema = z
  .array(z.string().trim().min(1).max(240))
  .max(12)
  .optional()
  .default([]);

export const createMaintenanceWorkPackageSchema = z
  .object({
    aircraftId: z.string().trim().min(1),
    sourceFlightId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable()).optional(),
    primaryDefectId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable()).optional(),
    title: z.string().trim().min(5).max(180),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'AOG']).optional().default('NORMAL'),
    executionMode: z.enum(['INTERNAL', 'EXTERNAL_AMO_VENDOR']).optional().default('INTERNAL'),
    vendorId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable()).optional(),
    planningNote: z.preprocess(emptyToNull, z.string().trim().max(2000).nullable()).optional(),
    initialJobCard: z
      .object({
        title: z.string().trim().min(5).max(180),
        taskType: z
          .enum([
            'DEFECT_RECTIFICATION',
            'SCHEDULED_TASK',
            'NON_ROUTINE',
            'INSPECTION',
            'COMPONENT_CHANGE'
          ])
          .optional()
          .default('DEFECT_RECTIFICATION'),
        maintenanceDataRef: z.string().trim().min(2).max(240),
        maintenanceDataRevision: z.string().trim().min(1).max(80),
        mandatoryFlag: z.boolean().optional().default(true),
        requiresIndependentInspection: z.boolean().optional().default(false)
      })
      .optional()
  })
  .refine((value) => value.executionMode === 'INTERNAL' || Boolean(value.vendorId), {
    message: 'External AMO/vendor execution requires vendorId.',
    path: ['vendorId']
  });

export const createMaintenanceJobCardSchema = z.object({
  title: z.string().trim().min(5).max(180),
  taskType: z
    .enum([
      'DEFECT_RECTIFICATION',
      'SCHEDULED_TASK',
      'NON_ROUTINE',
      'INSPECTION',
      'COMPONENT_CHANGE'
    ])
    .optional()
    .default('DEFECT_RECTIFICATION'),
  maintenanceDataRef: z.string().trim().min(2).max(240),
  maintenanceDataRevision: z.string().trim().min(1).max(80),
  mandatoryFlag: z.boolean().optional().default(true),
  requiresIndependentInspection: z.boolean().optional().default(false),
  expectedWorkPackageVersion: z.coerce.number().int().positive()
});

export const maintenanceVersionCommandSchema = z.object({
  expectedVersion: z.coerce.number().int().positive()
});

export const maintenanceJobCardWorkSignoffSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  certifyingLicenseNumber: z.string().trim().min(3).max(100),
  statement: z.string().trim().min(10).max(3000),
  evidenceReferences: evidenceReferencesSchema
});

export const maintenanceIndependentInspectionSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  decision: z.enum(['PASSED', 'FAILED']),
  statement: z.string().trim().min(10).max(3000),
  certifyingLicenseNumber: z.string().trim().min(3).max(100),
  inspectedAt: z.string().datetime(),
  idempotencyKey: z.string().trim().min(8).max(200),
  evidenceReferences: evidenceReferencesSchema
});

export const maintenanceReworkSignoffSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  certifyingLicenseNumber: z.string().trim().min(3).max(100),
  correctiveActionDescription: z.string().trim().min(10).max(3000),
  approvedDataRef: z.string().trim().min(2).max(240),
  statement: z.string().trim().min(10).max(3000),
  evidenceReferences: evidenceReferencesSchema
});

export const maintenanceReleaseSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  releaseNumber: z.string().trim().min(3).max(100),
  resultingStatus: z.enum(['SERVICEABLE', 'SERVICEABLE_WITH_RESTRICTIONS']),
  releaseStatement: z.string().trim().min(20).max(3000),
  certifyingLicenseNumber: z.string().trim().min(3).max(100),
  releasedAt: z.string().datetime(),
  evidenceReferences: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  idempotencyKey: z.string().trim().min(8).max(200).optional()
});

export const maintenanceDefectAssessmentSchema = z.object({
  assessmentDecision: z.enum(['GROUND', 'DEFER', 'NO_IMPACT']),
  assessmentNote: z.string().trim().min(10).max(3000)
});

export type MaintenanceWorkPackageStatus = z.infer<typeof maintenanceWorkPackageStatusSchema>;
export type MaintenanceJobCardStatus = z.infer<typeof maintenanceJobCardStatusSchema>;
export type MaintenanceCompanyAuthorizationAction = z.infer<
  typeof maintenanceCompanyAuthorizationActionSchema
>;
export type MaintenanceCompanyAuthorizationStatus = z.infer<
  typeof maintenanceCompanyAuthorizationStatusSchema
>;
export type MaintenanceListQuery = z.infer<typeof maintenanceListQuerySchema>;
export type MaintenanceAuditListQuery = z.infer<typeof maintenanceAuditListQuerySchema>;
export type CreateMaintenanceWorkPackageInput = z.infer<typeof createMaintenanceWorkPackageSchema>;
export type CreateMaintenanceJobCardInput = z.infer<typeof createMaintenanceJobCardSchema>;
export type MaintenanceVersionCommand = z.infer<typeof maintenanceVersionCommandSchema>;
export type MaintenanceJobCardWorkSignoffInput = z.infer<
  typeof maintenanceJobCardWorkSignoffSchema
>;
export type MaintenanceIndependentInspectionInput = z.infer<
  typeof maintenanceIndependentInspectionSchema
>;
export type MaintenanceReworkSignoffInput = z.infer<typeof maintenanceReworkSignoffSchema>;
export type MaintenanceReleaseInput = z.infer<typeof maintenanceReleaseSchema>;
export type MaintenanceDefectAssessmentInput = z.infer<typeof maintenanceDefectAssessmentSchema>;

export type MaintenanceActor = {
  userId: string;
  role: string;
  requestId?: string;
};

export type MaintenanceJobCardDto = {
  id: string;
  workPackageId: string;
  cardNumber: string;
  title: string;
  taskType: string;
  maintenanceDataRef: string;
  maintenanceDataRevision: string;
  mandatoryFlag: boolean;
  requiresIndependentInspection: boolean;
  status: MaintenanceJobCardStatus;
  version: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  signoffs: MaintenanceJobCardSignoffDto[];
  inspectionAttempts: MaintenanceInspectionAttemptDto[];
  reworkActions: MaintenanceReworkActionDto[];
};

export type MaintenanceJobCardSignoffDto = {
  id: string;
  jobCardId: string;
  signoffType: 'MECHANIC' | 'INDEPENDENT_INSPECTION';
  decision: 'COMPLETED' | 'PASSED' | 'FAILED';
  statement: string;
  evidenceReferences: string[];
  certifyingLicenseNumber: string | null;
  companyAuthorizationSnapshot: Record<string, unknown> | null;
  actorUserId: string;
  actorRole: string;
  signedAt: string;
};

export type MaintenanceInspectionAttemptDto = {
  id: string;
  jobCardId: string;
  workPackageId: string;
  attemptNumber: number;
  cycleNumber: number;
  result: 'PASSED' | 'FAILED';
  finding: string;
  inspectorUserId: string;
  inspectorRole: string;
  inspectorLicenseNumber: string;
  inspectorLicenseSnapshot: Record<string, unknown> | null;
  companyAuthorizationSnapshot: Record<string, unknown> | null;
  packageVersion: number;
  inspectedAt: string;
  requestId: string | null;
  createdAt: string;
};

export type MaintenanceReworkActionDto = {
  id: string;
  reworkNumber: string;
  workPackageId: string;
  jobCardId: string;
  sourceInspectionAttemptId: string;
  cycleNumber: number;
  finding: string;
  correctiveActionDescription: string;
  approvedDataRef: string;
  assignedMechanicUserId: string | null;
  status:
    | 'REWORK_REQUIRED'
    | 'CORRECTIVE_WORK_IN_PROGRESS'
    | 'AWAITING_REINSPECTION'
    | 'REINSPECTION_PASSED'
    | 'REINSPECTION_FAILED'
    | 'CANCELLED';
  mechanicSignoffStatement: string | null;
  mechanicSignoffUserId: string | null;
  mechanicSignoffRole: string | null;
  mechanicLicenseNumber: string | null;
  companyAuthorizationSnapshot: Record<string, unknown> | null;
  mechanicSignoffAt: string | null;
  reinspectionAttemptId: string | null;
  requestId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceCompanyAuthorizationDto = {
  id: string;
  authorizationNumber: string;
  personnelId: string;
  personnelName: string;
  actorUserId: string | null;
  licenseId: string;
  licenseNumber: string;
  licenseType: string;
  status: MaintenanceCompanyAuthorizationStatus;
  validFrom: string;
  validUntil: string;
  permittedActions: MaintenanceCompanyAuthorizationAction[];
  aircraftTypeScope: string[];
  aircraftRegistrationScope: string[];
  notes: string | null;
  issuedBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceDomainBlockerDto = {
  code: string;
  message: string;
  impact: string;
  requiredAction: string;
  referenceId: string | null;
};

export type MaintenanceAuditRecordDto = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string;
  actorRole: string;
  requestId: string | null;
  beforeVersion: number | null;
  afterVersion: number | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

export type MaintenanceDefectSummaryDto = {
  id: string;
  aircraftId: string;
  aircraftRegistrationNumber: string;
  defectNumber: string;
  title: string;
  description: string;
  status: 'OPEN' | 'DEFERRED' | 'RECTIFIED' | 'CLOSED';
  detectedAt: string;
  sourceReference: string | null;
  derivedSourceFlightId: string | null;
  derivedSourceFlightNumber: string | null;
  assessmentDecision: 'GROUND' | 'DEFER' | 'NO_IMPACT' | null;
  assessmentNote: string | null;
  activeWorkPackageId: string | null;
  activeWorkPackageNumber: string | null;
  updatedAt: string;
};

export type MaintenanceRequirementScopeDto = {
  requirementId: string;
  requirementCode: string;
  title: string;
  status: 'ACTIVE' | 'COMPLIED' | 'VOID';
  dueAt: string | null;
  dueAirframeHours: number | null;
  dueAirframeCycles: number | null;
  jobCardId: string;
  jobCardNumber: string;
};

export type MaintenanceTechnicalReleaseSummaryDto = {
  id: string;
  aircraftId: string;
  aircraftRegistrationNumber: string;
  releaseNumber: string;
  resultingStatus: 'SERVICEABLE' | 'SERVICEABLE_WITH_RESTRICTIONS';
  workOrderReference: string;
  certifyingUserId: string;
  certifyingLicenseNumber: string;
  releasedAt: string;
  evidenceReferences: string[];
  defectIds: string[];
  signerAuthorizationSnapshot: Record<string, unknown> | null;
};

export type MaintenanceAircraftStatusSummaryDto = {
  aircraftId: string;
  registrationNumber: string;
  aircraftType: string;
  model: string;
  currentStationCode: string | null;
  operationalStatus: string;
  serviceabilityStatus: string;
  technicalEligibility: 'ELIGIBLE' | 'RESTRICTED' | 'BLOCKED';
  maintenanceDue: boolean;
  dueReasons: string[];
  openDefectCount: number;
  activeRestrictionCount: number;
  activeWorkPackageId: string | null;
  activeWorkPackageNumber: string | null;
  updatedAt: string;
};

export type MaintenanceOperationalAttentionDto = {
  aircraftId: string;
  aircraftRegistrationNumber: string;
  technicalState: string;
  defectOrDueItem: string;
  activePackageId: string | null;
  activePackageNumber: string | null;
  currentStage: string;
  blocker: string;
  requiredAction: string;
  owner: string;
  updatedAt: string;
};

export type MaintenanceCommandCenterDto = {
  generatedAt: string;
  authorizationNotice: string;
  summary: {
    fleetTotal: number;
    serviceable: number;
    restricted: number;
    unserviceable: number;
    openGroundingDefects: number;
    activeWorkPackages: number;
    jobCardsAwaitingExecution: number;
    inspectionsAwaitingAction: number;
    readyForRelease: number;
  };
  fleet: MaintenanceAircraftStatusSummaryDto[];
  defects: MaintenanceDefectSummaryDto[];
  workPackages: MaintenanceWorkPackageDto[];
  jobCardsAwaitingExecution: Array<
    MaintenanceJobCardDto & {
      packageNumber: string;
      workPackageTitle: string;
      aircraftRegistrationNumber: string;
    }
  >;
  inspectionsAwaitingAction: Array<
    MaintenanceJobCardDto & {
      packageNumber: string;
      workPackageTitle: string;
      aircraftRegistrationNumber: string;
    }
  >;
  readyForRelease: MaintenanceWorkPackageDto[];
  releaseBlockers: Array<{
    workPackageId: string;
    packageNumber: string;
    aircraftRegistrationNumber: string;
    blockers: MaintenanceDomainBlockerDto[];
  }>;
  operationalAttention: MaintenanceOperationalAttentionDto[];
  recentAuditRecords: MaintenanceAuditRecordDto[];
  technicalReleases: MaintenanceTechnicalReleaseSummaryDto[];
};

export type MaintenanceSelectorDataDto = {
  generatedAt: string;
  authorizationNotice: string;
  aircraft: Array<{
    id: string;
    registrationNumber: string;
    aircraftType: string;
    model: string;
    serviceabilityStatus: string;
    technicalEligibility: 'ELIGIBLE' | 'RESTRICTED' | 'BLOCKED';
    currentStationCode: string | null;
    updatedAt: string;
  }>;
  eligibleDefects: MaintenanceDefectSummaryDto[];
  vendors: Array<{
    id: string;
    vendorCode: string;
    vendorName: string;
  }>;
  signerLicenses: Array<{
    personnelId: string;
    personnelName: string;
    licenseId: string;
    licenseType: string;
    licenseNumber: string;
    status: string;
    issueDate: string | null;
    expiryDate: string | null;
    isUsableNow: boolean;
    scopeSummary: string;
  }>;
};

export type MaintenanceWorkPackageDto = {
  id: string;
  packageNumber: string;
  aircraftId: string;
  aircraftRegistrationNumber: string;
  aircraftType?: string;
  aircraftModel?: string;
  sourceFlightId: string | null;
  primaryDefectId: string | null;
  primaryDefectNumber: string | null;
  title: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'AOG';
  executionMode: 'INTERNAL' | 'EXTERNAL_AMO_VENDOR';
  vendorId: string | null;
  status: MaintenanceWorkPackageStatus;
  planningNote: string | null;
  releaseId: string | null;
  releasedAt: string | null;
  financialStatus: 'NOT_READY' | 'READY_FOR_HANDOFF' | 'HANDED_OFF' | 'POSTED' | 'BLOCKED';
  version: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  jobCards: MaintenanceJobCardDto[];
  aircraftTechnicalState?: string;
  aircraftTechnicalEligibility?: 'ELIGIBLE' | 'RESTRICTED' | 'BLOCKED';
  primaryDefect?: MaintenanceDefectSummaryDto | null;
  sourceFlight?: {
    id: string;
    flightNumber: string;
    currentStatus: string;
  } | null;
  vendorName?: string | null;
  requirementScope?: MaintenanceRequirementScopeDto[];
  release?: MaintenanceTechnicalReleaseSummaryDto | null;
  releaseChecklist?: {
    mandatoryWorkComplete: boolean;
    independentInspectionsComplete: boolean;
    approvedDataAvailable: boolean;
    mechanicEvidenceComplete: boolean;
    requirementScopeValid: boolean;
    blockers: MaintenanceDomainBlockerDto[];
  };
  auditRecords?: MaintenanceAuditRecordDto[];
};
