import { z } from 'zod';
import type { DemoRole } from './types/roles';

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
        approvedDataRevisionId: z
          .preprocess(emptyToNull, z.string().trim().min(1).nullable())
          .optional(),
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
  approvedDataRevisionId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable()).optional(),
  mandatoryFlag: z.boolean().optional().default(true),
  requiresIndependentInspection: z.boolean().optional().default(false),
  expectedWorkPackageVersion: z.coerce.number().int().positive()
});

export const createWorkPackageFromDueSchema = z.object({
  planningNote: z.preprocess(emptyToNull, z.string().trim().max(2000).nullable()).optional(),
  plannedStartAt: z.preprocess(emptyToNull, z.string().datetime().nullable()).optional(),
  stationId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable()).optional(),
  idempotencyKey: z.string().trim().min(8).max(200).optional()
});

export const maintenanceSlotStatusSchema = z.enum([
  'BOOKED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
]);

const maintenanceSlotTimeRangeSchema = z.object({
  plannedStartAt: z.string().datetime({ offset: true }),
  plannedEndAt: z.string().datetime({ offset: true })
});

const validMaintenanceSlotTimeRange = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine((value) => Date.parse(value.plannedStartAt) < Date.parse(value.plannedEndAt), {
    message: 'Planned end must be after planned start.',
    path: ['plannedEndAt']
  });

export const maintenanceSlotAvailabilitySchema = validMaintenanceSlotTimeRange(
  maintenanceSlotTimeRangeSchema.extend({
    facilityId: z.string().trim().min(1),
    areaId: z.string().trim().min(1),
    bayId: z.string().trim().min(1)
  })
);

export const createMaintenanceSlotSchema = validMaintenanceSlotTimeRange(
  maintenanceSlotTimeRangeSchema.extend({
    facilityId: z.string().trim().min(1),
    areaId: z.string().trim().min(1),
    bayId: z.string().trim().min(1),
    idempotencyKey: z.string().trim().min(8).max(200).optional()
  })
);

export const rescheduleMaintenanceSlotSchema = validMaintenanceSlotTimeRange(
  maintenanceSlotTimeRangeSchema.extend({
    facilityId: z.string().trim().min(1),
    areaId: z.string().trim().min(1),
    bayId: z.string().trim().min(1),
    reason: z.string().trim().min(5).max(1000)
  })
);

export const cancelMaintenanceSlotSchema = z.object({
  reason: z.string().trim().min(5).max(1000)
});

export const maintenanceFacilityCommandSchema = z.object({
  note: z.preprocess(emptyToNull, z.string().trim().max(1200).nullable()).optional(),
  idempotencyKey: z.string().trim().min(8).max(200).optional()
});

export const createMaintenanceGseRequirementSchema = z.object({
  jobCardId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable()).optional(),
  equipmentType: z.string().trim().min(2).max(120),
  quantity: z.coerce.number().int().min(1).max(20).optional().default(1),
  mandatory: z.boolean().optional().default(true),
  notes: z.preprocess(emptyToNull, z.string().trim().max(1200).nullable()).optional()
});

export const allocateMaintenanceGseSchema = z.object({
  requirementId: z.string().trim().min(1),
  assetId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(8).max(200).optional()
});

export const stageMaintenanceResourceSchema = z.object({
  allocationId: z.string().trim().min(1),
  note: z.preprocess(emptyToNull, z.string().trim().max(1200).nullable()).optional(),
  idempotencyKey: z.string().trim().min(8).max(200).optional()
});

export const releaseMaintenanceResourceStagingSchema = z.object({
  note: z.preprocess(emptyToNull, z.string().trim().max(1200).nullable()).optional()
});

export const createMaintenanceFacilityShiftSchema = z
  .object({
    facilityId: z.string().trim().min(1),
    shiftDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/u),
    name: z.string().trim().min(2).max(80),
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    supervisorPersonnelId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable()).optional()
  })
  .refine((value) => Date.parse(value.startAt) < Date.parse(value.endAt), {
    message: 'Shift end must be after shift start.',
    path: ['endAt']
  });

export const addMaintenanceShiftRosterSchema = z.object({
  personnelId: z.string().trim().min(1),
  roleType: z.string().trim().min(2).max(80)
});

export const prepareMaintenanceShiftHandoverSchema = z.object({
  outgoingShiftId: z.string().trim().min(1),
  incomingShiftId: z.string().trim().min(1),
  notes: z.string().trim().min(5).max(3000),
  safetyNotes: z.array(z.string().trim().min(1).max(300)).max(20).optional().default([])
});

export const acknowledgeMaintenanceShiftHandoverSchema = z.object({
  note: z.preprocess(emptyToNull, z.string().trim().max(1200).nullable()).optional()
});

export const maintenanceFacilityOccupancyQuerySchema = z
  .object({
    stationId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
    facilityId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
    aircraftId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
    status: z.preprocess(emptyToUndefined, maintenanceSlotStatusSchema.optional()),
    dateFrom: z.string().datetime({ offset: true }).optional(),
    dateTo: z.string().datetime({ offset: true }).optional()
  })
  .refine(
    (value) =>
      !value.dateFrom || !value.dateTo || Date.parse(value.dateFrom) <= Date.parse(value.dateTo),
    {
      message: 'dateTo must be on or after dateFrom.',
      path: ['dateTo']
    }
  );

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

export const maintenanceDefectAssessmentSchema = z
  .object({
    assessmentDecision: z.enum(['GROUND', 'DEFER', 'NO_IMPACT']),
    assessmentNote: z.string().trim().min(10).max(3000),
    deferment: z
      .object({
        defermentType: z.enum(['MEL', 'CDL']).optional().default('MEL'),
        referenceCode: z.string().trim().min(2).max(100),
        category: z.preprocess(emptyToNull, z.string().trim().max(40).nullable()).default(null),
        operationalLimitations: z.string().trim().min(10).max(3000),
        maintenanceProcedure: z
          .preprocess(emptyToNull, z.string().trim().max(3000).nullable())
          .default(null),
        operationsProcedure: z
          .preprocess(emptyToNull, z.string().trim().max(3000).nullable())
          .default(null),
        effectiveAt: z.string().datetime(),
        expiresAt: z.string().datetime(),
        targetRectificationAt: z
          .preprocess(emptyToNull, z.string().datetime().nullable())
          .default(null),
        authorizationReference: z.string().trim().min(2).max(240),
        applicableRouteIds: z.array(z.string().trim().min(1)).max(50).optional().default([]),
        applicableServiceTypeCodes: z
          .array(
            z.enum([
              'CHARTER_CARGO',
              'CHARTER_PASSENGER',
              'SCHEDULED_PASSENGER',
              'MEDEVAC',
              'POSITIONING'
            ])
          )
          .max(5)
          .optional()
          .default([])
      })
      .optional()
  })
  .refine((value) => value.assessmentDecision !== 'DEFER' || Boolean(value.deferment), {
    message: 'DEFER assessment requires deferment control details.',
    path: ['deferment']
  })
  .refine(
    (value) =>
      !value.deferment ||
      (value.deferment.expiresAt > value.deferment.effectiveAt &&
        (!value.deferment.targetRectificationAt ||
          value.deferment.targetRectificationAt >= value.deferment.effectiveAt)),
    {
      message: 'Deferment target and expiry must be after the effective time.',
      path: ['deferment']
    }
  );

export const maintenanceDeferredCloseSchema = z.object({
  closureNote: z.string().trim().min(10).max(3000),
  evidenceReferences: z.array(z.string().trim().min(1).max(240)).min(1).max(12)
});

export const maintenanceNonRoutineSeveritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'AOG']);

export const maintenanceNonRoutineDispositionSchema = z.enum([
  'CORRECTIVE_WORK_REQUIRED',
  'NO_ACTION'
]);

export const createNonRoutineFindingSchema = z.object({
  sourceJobCardId: z.string().trim().min(1),
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(10).max(3000),
  severity: maintenanceNonRoutineSeveritySchema.optional().default('NORMAL'),
  location: z.preprocess(emptyToNull, z.string().trim().max(160).nullable()).optional(),
  ataChapter: z.preprocess(emptyToNull, z.string().trim().max(20).nullable()).optional(),
  immediateSafetyConcern: z.boolean().optional().default(false),
  evidenceReferences: evidenceReferencesSchema,
  idempotencyKey: z.string().trim().min(8).max(200).optional()
});

export const assessNonRoutineFindingSchema = z.object({
  disposition: maintenanceNonRoutineDispositionSchema,
  assessmentNote: z.string().trim().min(10).max(3000),
  priority: maintenanceNonRoutineSeveritySchema.optional().default('NORMAL'),
  requiresIndependentInspection: z.boolean().optional().default(true),
  approvedDataRef: z.preprocess(emptyToNull, z.string().trim().max(240).nullable()).optional()
});

export const createCorrectiveJobCardFromFindingSchema = z.object({
  title: z.string().trim().min(5).max(180),
  maintenanceDataRef: z.string().trim().min(2).max(240),
  maintenanceDataRevision: z.string().trim().min(1).max(80),
  approvedDataRevisionId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable()).optional(),
  mandatoryFlag: z.boolean().optional().default(true),
  requiresIndependentInspection: z.boolean().optional().default(true),
  expectedWorkPackageVersion: z.coerce.number().int().positive()
});

export const resolveNonRoutineFindingSchema = z.object({
  resolutionNote: z.string().trim().min(10).max(3000),
  evidenceReferences: z.array(z.string().trim().min(1).max(240)).min(1).max(12)
});

export const closeNonRoutineFindingSchema = z.object({
  closureNote: z.string().trim().min(10).max(3000),
  evidenceReferences: z.array(z.string().trim().min(1).max(240)).min(1).max(12)
});

export const approvedDataDocumentTypeSchema = z.enum([
  'AMM',
  'IPC',
  'SRM',
  'WDM',
  'CMM',
  'MPD',
  'AD',
  'SB',
  'STANDARD_PRACTICE',
  'OTHER'
]);

export const approvedDataRevisionStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'SUPERSEDED',
  'WITHDRAWN'
]);

export const dueControlStatusSchema = z.enum([
  'NOT_DUE',
  'DUE_SOON',
  'DUE',
  'OVERDUE',
  'COMPLETED',
  'INACTIVE'
]);

export const maintenanceBlockerCategorySchema = z.enum([
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
]);

export const maintenanceBlockerSeveritySchema = z.enum(['WARNING', 'BLOCKING']);

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
export type CreateWorkPackageFromDueInput = z.infer<typeof createWorkPackageFromDueSchema>;
export type MaintenanceVersionCommand = z.infer<typeof maintenanceVersionCommandSchema>;
export type MaintenanceJobCardWorkSignoffInput = z.infer<
  typeof maintenanceJobCardWorkSignoffSchema
>;
export type MaintenanceIndependentInspectionInput = z.infer<
  typeof maintenanceIndependentInspectionSchema
>;
export type MaintenanceReworkSignoffInput = z.infer<typeof maintenanceReworkSignoffSchema>;
export type MaintenanceReleaseInput = z.infer<typeof maintenanceReleaseSchema>;
export type MaintenanceDefectAssessmentInput = z.input<typeof maintenanceDefectAssessmentSchema>;
export type MaintenanceDeferredCloseInput = z.infer<typeof maintenanceDeferredCloseSchema>;
export type CreateNonRoutineFindingInput = z.infer<typeof createNonRoutineFindingSchema>;
export type AssessNonRoutineFindingInput = z.infer<typeof assessNonRoutineFindingSchema>;
export type CreateCorrectiveJobCardFromFindingInput = z.infer<
  typeof createCorrectiveJobCardFromFindingSchema
>;
export type ResolveNonRoutineFindingInput = z.infer<typeof resolveNonRoutineFindingSchema>;
export type CloseNonRoutineFindingInput = z.infer<typeof closeNonRoutineFindingSchema>;
export type ApprovedDataDocumentType = z.infer<typeof approvedDataDocumentTypeSchema>;
export type ApprovedDataRevisionStatus = z.infer<typeof approvedDataRevisionStatusSchema>;
export type DueControlStatus = z.infer<typeof dueControlStatusSchema>;
export type MaintenanceBlockerCategory = z.infer<typeof maintenanceBlockerCategorySchema>;
export type MaintenanceBlockerSeverity = z.infer<typeof maintenanceBlockerSeveritySchema>;

export type MaintenanceActor = {
  userId: string;
  role: string;
  requestId?: string;
};

export type MaintenanceJobCardDto = {
  id: string;
  workPackageId: string;
  sourceNonRoutineFindingId: string | null;
  sourceNonRoutineFindingNumber: string | null;
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

export type MaintenanceNonRoutineFindingDto = {
  id: string;
  workPackageId: string;
  aircraftId: string;
  sourceJobCardId: string | null;
  sourceJobCardNumber: string | null;
  correctiveJobCardId: string | null;
  correctiveJobCardNumber: string | null;
  findingNumber: string;
  title: string;
  description: string;
  severity: 'LOW' | 'NORMAL' | 'HIGH' | 'AOG';
  location: string | null;
  ataChapter: string | null;
  immediateSafetyConcern: boolean;
  evidenceReferences: string[];
  status: 'OPEN' | 'ADDED_TO_SCOPE' | 'DEFERRED' | 'CLOSED';
  workflowState:
    | 'WAITING_ASSESSMENT'
    | 'CORRECTIVE_WORK_REQUIRED'
    | 'IN_RECTIFICATION'
    | 'AWAITING_INSPECTION'
    | 'REWORK_REQUIRED'
    | 'READY_TO_RESOLVE'
    | 'RESOLVED'
    | 'CLOSED';
  disposition: 'CORRECTIVE_WORK_REQUIRED' | 'NO_ACTION' | null;
  assessmentNote: string | null;
  assessedByUserId: string | null;
  assessedAt: string | null;
  requiresIndependentInspection: boolean;
  approvedDataRef: string | null;
  foundByUserId: string;
  foundAt: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  resolutionNote: string | null;
  closedAt: string | null;
  closedByUserId: string | null;
  closureNote: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  nextAction: string;
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

export type MaintenanceEligibilityBlockerDto = {
  code: string;
  category: MaintenanceBlockerCategory;
  severity: MaintenanceBlockerSeverity;
  title: string;
  message: string;
  sourceType?: string;
  sourceId?: string;
  nextAction?: string;
};

export type MaintenanceReleaseEligibilityDto = {
  workPackageId: string;
  aircraftId: string;
  evaluatedAt: string;
  eligible: boolean;
  blockers: MaintenanceEligibilityBlockerDto[];
  warnings: MaintenanceEligibilityBlockerDto[];
};

export type MaintenanceApprovedDataDocumentDto = {
  id: string;
  documentType: ApprovedDataDocumentType;
  documentNumber: string;
  title: string;
  sourceIssuer: string;
  applicability: string;
  status: 'ACTIVE' | 'INACTIVE';
  fictionalDemo: boolean;
  createdAt: string;
  updatedAt: string;
  revisions: MaintenanceApprovedDataRevisionDto[];
  activeRevision: MaintenanceApprovedDataRevisionDto | null;
  jobCardUsageCount: number;
};

export type MaintenanceApprovedDataRevisionDto = {
  id: string;
  documentId: string;
  revision: string;
  effectiveDate: string;
  status: ApprovedDataRevisionStatus;
  supersededByRevisionId: string | null;
  fictionalDemo: boolean;
  notes: string | null;
};

export type MaintenanceDueStatusDto = {
  id: string;
  requirementId: string;
  aircraftId: string;
  aircraftRegistrationNumber: string;
  aircraftImageUrl: string | null;
  code: string;
  title: string;
  mandatory: boolean;
  recurring: boolean;
  active: boolean;
  fictionalDemo: boolean;
  status: DueControlStatus;
  planningStatus: 'UNPLANNED' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLIED' | 'INACTIVE';
  nearestBasis: 'CALENDAR' | 'FH' | 'FC' | 'NONE';
  currentFlightHours: number;
  currentFlightCycles: number;
  utilizationAsOf: string | null;
  lastCompletedAt: string | null;
  lastCompletedFlightHours: number | null;
  lastCompletedFlightCycles: number | null;
  intervalCalendarDays: number | null;
  intervalFlightHours: number | null;
  intervalFlightCycles: number | null;
  calendarRemainingDays: number | null;
  flightHoursRemaining: number | null;
  flightCyclesRemaining: number | null;
  nextDueAt: string | null;
  nextDueFlightHours: number | null;
  nextDueFlightCycles: number | null;
  forecastHorizonDays: 30 | 60 | 90 | 180 | null;
  sourceApprovedDataRevisionId: string | null;
  sourceWorkPackageId: string | null;
  sourceJobCardId: string | null;
  plannedWorkPackageId: string | null;
  plannedWorkPackageNumber: string | null;
  complianceRecordId: string | null;
  calculationExplanation: string;
  actionLabel: string;
  calculatedAt: string;
  dataFreshness: string;
};

export type MaintenanceSlotStatus = z.infer<typeof maintenanceSlotStatusSchema>;
export type MaintenanceSlotAvailabilityInput = z.infer<typeof maintenanceSlotAvailabilitySchema>;
export type CreateMaintenanceSlotInput = z.infer<typeof createMaintenanceSlotSchema>;
export type RescheduleMaintenanceSlotInput = z.infer<typeof rescheduleMaintenanceSlotSchema>;
export type CancelMaintenanceSlotInput = z.infer<typeof cancelMaintenanceSlotSchema>;
export type MaintenanceFacilityCommandInput = z.infer<typeof maintenanceFacilityCommandSchema>;
export type CreateMaintenanceGseRequirementInput = z.infer<
  typeof createMaintenanceGseRequirementSchema
>;
export type AllocateMaintenanceGseInput = z.infer<typeof allocateMaintenanceGseSchema>;
export type StageMaintenanceResourceInput = z.infer<typeof stageMaintenanceResourceSchema>;
export type ReleaseMaintenanceResourceStagingInput = z.infer<
  typeof releaseMaintenanceResourceStagingSchema
>;
export type CreateMaintenanceFacilityShiftInput = z.infer<
  typeof createMaintenanceFacilityShiftSchema
>;
export type AddMaintenanceShiftRosterInput = z.infer<typeof addMaintenanceShiftRosterSchema>;
export type PrepareMaintenanceShiftHandoverInput = z.infer<
  typeof prepareMaintenanceShiftHandoverSchema
>;
export type AcknowledgeMaintenanceShiftHandoverInput = z.infer<
  typeof acknowledgeMaintenanceShiftHandoverSchema
>;
export type MaintenanceFacilityOccupancyQuery = z.infer<
  typeof maintenanceFacilityOccupancyQuerySchema
>;

export type MaintenanceFacilityBayDto = {
  id: string;
  areaId: string;
  code: string;
  name: string;
  active: boolean;
  capacity: 1;
  notes: string | null;
};

export type MaintenanceFacilityAreaDto = {
  id: string;
  facilityId: string;
  code: string;
  name: string;
  areaType: 'HANGAR' | 'MAINTENANCE_APRON' | 'WORKSHOP_AREA';
  active: boolean;
  notes: string | null;
  bays: MaintenanceFacilityBayDto[];
};

export type MaintenanceFacilityDto = {
  id: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  timezone: string;
  code: string;
  name: string;
  facilityType: 'LINE_MAINTENANCE' | 'BASE_MAINTENANCE' | 'MIXED';
  active: boolean;
  notes: string | null;
  areas: MaintenanceFacilityAreaDto[];
};

export type MaintenanceSlotDto = {
  id: string;
  workPackageId: string;
  packageNumber: string;
  aircraftId: string;
  aircraftRegistrationNumber: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  stationTimezone: string;
  facilityId: string;
  facilityCode: string;
  facilityName: string;
  areaId: string;
  areaCode: string;
  areaName: string;
  areaType: MaintenanceFacilityAreaDto['areaType'];
  bayId: string;
  bayCode: string;
  bayName: string;
  plannedStartAt: string;
  plannedEndAt: string;
  actualStartAt: string | null;
  actualEndAt: string | null;
  status: MaintenanceSlotStatus;
  createdByUserId: string;
  createdAt: string;
  updatedByUserId: string | null;
  updatedAt: string;
  cancelledByUserId: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
};

export type MaintenanceSlotConflictDto = {
  slotId: string;
  conflictType: 'BAY' | 'AIRCRAFT' | 'WORK_PACKAGE';
  workPackageId: string;
  packageNumber: string;
  aircraftId: string;
  aircraftRegistrationNumber: string;
  bayId: string;
  bayCode: string;
  plannedStartAt: string;
  plannedEndAt: string;
  status: MaintenanceSlotStatus;
};

export type MaintenanceSlotAvailabilityDto = {
  workPackageId: string;
  aircraftId: string;
  stationId: string;
  facilityId: string;
  areaId: string;
  bayId: string;
  plannedStartAt: string;
  plannedEndAt: string;
  available: boolean;
  conflicts: MaintenanceSlotConflictDto[];
};

export type MaintenanceFacilityOccupancyDto = {
  generatedAt: string;
  dateFrom: string;
  dateTo: string;
  slots: MaintenanceSlotDto[];
  actualOccupancies?: MaintenanceAircraftCustodyDto[];
  operationalConflicts?: MaintenanceOperationalConflictDto[];
};

export type MaintenanceReadinessDimensionStatus = 'READY' | 'BLOCKED' | 'NOT_REQUIRED' | 'UNKNOWN';

export type MaintenanceGseRequirementDto = {
  id: string;
  workPackageId: string;
  jobCardId: string | null;
  equipmentType: string;
  quantity: number;
  mandatory: boolean;
  allocatedQuantity: number;
  stagedQuantity: number;
  status: 'OPEN' | 'SATISFIED' | 'CANCELLED';
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceGseCandidateDto = {
  assetId: string;
  assetCode: string;
  name: string;
  equipmentType: string;
  stationId: string | null;
  conditionStatus: string;
  lifecycleStatus: string;
  eligible: boolean;
  reasons: string[];
  availabilityStatus: 'AVAILABLE' | 'NOT_AVAILABLE' | 'NOT_SCHEDULE_VALIDATED';
  conflictingWorkPackageId: string | null;
};

export type MaintenanceGseAllocationDto = {
  id: string;
  requirementId: string;
  workPackageId: string;
  slotId: string | null;
  assetId: string;
  assetCode: string;
  assetName: string;
  equipmentType: string;
  status: 'ALLOCATED' | 'STAGED' | 'IN_USE' | 'RELEASED' | 'CANCELLED';
  allocatedByUserId: string;
  allocatedAt: string;
  releasedByUserId: string | null;
  releasedAt: string | null;
};

export type MaintenanceFacilityResourceStagingDto = {
  id: string;
  resourceType: 'TOOL' | 'GSE';
  allocationId: string;
  workPackageId: string;
  slotId: string;
  bayId: string;
  bayCode: string;
  resourceId: string;
  resourceCode: string;
  resourceName: string;
  status: 'STAGED' | 'IN_USE' | 'RELEASED' | 'CANCELLED';
  stagedByUserId: string;
  stagedAt: string;
  releasedByUserId: string | null;
  releasedAt: string | null;
  note: string | null;
};

export type MaintenanceSlotReadinessDto = {
  slotId: string;
  workPackageId: string;
  aircraftId: string;
  status: MaintenanceReadinessDimensionStatus;
  evaluatedAt: string;
  dimensions: Record<
    'facility' | 'material' | 'personnel' | 'tools' | 'gse',
    {
      status: MaintenanceReadinessDimensionStatus;
      summary: string;
      blockers: MaintenanceEligibilityBlockerDto[];
      warnings: MaintenanceEligibilityBlockerDto[];
    }
  >;
  manpowerCapacity: Array<{
    roleType: string;
    required: number;
    availableEligible: number;
    assigned: number;
    status: MaintenanceReadinessDimensionStatus;
  }>;
};

export type MaintenanceAircraftCustodyStatus =
  | 'MOVING_IN'
  | 'IN_BAY'
  | 'READY_FOR_MOVE_OUT'
  | 'MOVING_OUT'
  | 'HANDBACK_PENDING'
  | 'HANDED_BACK'
  | 'CANCELLED';

export type MaintenanceAircraftCustodyDto = {
  id: string;
  slotId: string;
  workPackageId: string;
  packageNumber: string;
  aircraftId: string;
  aircraftRegistrationNumber: string;
  facilityId: string;
  facilityName: string;
  areaId: string;
  areaName: string;
  bayId: string;
  bayCode: string;
  status: MaintenanceAircraftCustodyStatus;
  actualStartAt: string | null;
  inBayAt: string | null;
  readyForMoveOutAt: string | null;
  movingOutAt: string | null;
  handedBackAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceOperationalAvailabilityDto = {
  aircraftId: string;
  status:
    | 'AVAILABLE'
    | 'PLANNED_MAINTENANCE'
    | 'IN_MAINTENANCE_FACILITY'
    | 'HANDBACK_PENDING'
    | 'UNKNOWN';
  available: boolean;
  evaluatedAt: string;
  blockers: MaintenanceEligibilityBlockerDto[];
  warnings: MaintenanceEligibilityBlockerDto[];
  currentCustody: MaintenanceAircraftCustodyDto | null;
  plannedSlot: MaintenanceSlotDto | null;
};

export type MaintenanceOperationalConflictDto = {
  code: 'BAY_ACTUAL_OCCUPANCY_CONFLICT' | 'SLOT_OVERRUN';
  slotId: string;
  custodyId: string;
  bayId: string;
  bayCode: string;
  reason: string;
};

export type MaintenanceFacilityShiftDto = {
  id: string;
  facilityId: string;
  facilityName: string;
  shiftDate: string;
  name: string;
  startAt: string;
  endAt: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  supervisorPersonnelId: string | null;
  createdAt: string;
};

export type MaintenanceShiftHandoverDto = {
  id: string;
  slotId: string;
  workPackageId: string;
  aircraftId: string;
  outgoingShiftId: string;
  incomingShiftId: string;
  status: 'PREPARED' | 'ACKNOWLEDGED' | 'CANCELLED';
  notes: string;
  safetyNotes: string[];
  outstandingReferences: string[];
  preparedByUserId: string;
  preparedAt: string;
  acknowledgedByUserId: string | null;
  acknowledgedAt: string | null;
};

export type MaintenanceFacilityOperationsDto = {
  generatedAt: string;
  facilities: MaintenanceFacilityDto[];
  occupancy: MaintenanceFacilityOccupancyDto;
  readiness: MaintenanceSlotReadinessDto[];
  custodies: MaintenanceAircraftCustodyDto[];
  gseRequirements: MaintenanceGseRequirementDto[];
  gseAllocations: MaintenanceGseAllocationDto[];
  staging: MaintenanceFacilityResourceStagingDto[];
  shifts: MaintenanceFacilityShiftDto[];
  handovers: MaintenanceShiftHandoverDto[];
};

export type MaintenanceReadinessPanelDto = {
  evaluatedAt: string;
  sections: Array<{
    key: string;
    label: string;
    status: 'SIAP' | 'PERLU_TINDAKAN' | 'TERBLOKIR' | 'TIDAK_DIPERLUKAN';
    blockers: MaintenanceEligibilityBlockerDto[];
    warnings: MaintenanceEligibilityBlockerDto[];
  }>;
};

export type InternalAogDemoPhase =
  | 'MATERIAL_REQUIRED'
  | 'MATERIAL_RESERVED'
  | 'READY_FOR_EXECUTION'
  | 'WORK_IN_PROGRESS'
  | 'INSPECTION_REQUIRED'
  | 'RELEASE_REVIEW_REQUIRED'
  | 'READY_FOR_RELEASE'
  | 'RELEASED';

export type InternalAogDemoTimelineEventDto = {
  id: string;
  occurredAt: string;
  domain: 'MRO' | 'INVENTORY';
  title: string;
  detail: string;
  actorRole: string | null;
};

export type InternalAogDemoDto = {
  scenarioId: 'INTERNAL_AOG_MATERIAL';
  title: string;
  phase: InternalAogDemoPhase;
  currentStep: number;
  totalSteps: 8;
  nextRole: DemoRole | null;
  nextAction: { label: string; href: string } | null;
  aircraft: { id: string; registrationNumber: string; aog: boolean };
  workPackage: { id: string; packageNumber: string; status: string; version: number };
  jobCard: { id: string; cardNumber: string; status: string; version: number };
  materialRequirement: {
    id: string;
    status: string;
    partNumber: string;
    partName: string;
    requiredQuantity: number;
    reservedQuantity: number;
    issuedQuantity: number;
  };
  readiness: MaintenanceReadinessPanelDto;
  blocker: { reason: string; owner: DemoRole; impact: string } | null;
  timeline: InternalAogDemoTimelineEventDto[];
};

export type MaintenanceAuditPackDto = {
  id: string;
  workPackageId: string;
  releaseId: string | null;
  generatedAt: string;
  manifest: Record<string, unknown>;
  manifestHash: string;
  disclaimer: string;
};

export type MaintenanceTechnicalRecordPackageDto = {
  workPackageId: string;
  releaseId: string | null;
  generatedAt: string;
  disclaimer: string;
  currentWorkPackage: MaintenanceWorkPackageDto;
  releaseEligibility: MaintenanceReleaseEligibilityDto;
  releaseSnapshot: {
    id: string;
    releaseId: string | null;
    evaluatedAt: string;
    eligible: boolean;
    blockers: MaintenanceEligibilityBlockerDto[];
    warnings: MaintenanceEligibilityBlockerDto[];
    referenceSnapshot: Record<string, unknown>;
    createdAt: string;
  } | null;
  evidence: {
    source: Record<string, unknown>;
    jobCards: MaintenanceJobCardDto[];
    nonRoutineFindings: MaintenanceNonRoutineFindingDto[];
    materialTraceability: Record<string, unknown>[];
    personnelEvidence: Record<string, unknown>[];
    toolEvidence: Record<string, unknown>[];
    approvedDataReferences: Record<string, unknown>[];
    facilityContext: MaintenanceSlotDto | null;
    technicalRelease: MaintenanceTechnicalReleaseSummaryDto | null;
    auditTimeline: MaintenanceAuditRecordDto[];
  };
};

export type MaintenanceQualityFindingDto = {
  id: string;
  reference: string;
  sourceType: string;
  sourceId: string;
  aircraftId: string | null;
  workPackageId: string | null;
  classification: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'ACTION_REQUIRED' | 'COMPLETED' | 'CLOSED';
  owner: string;
  dueDate: string | null;
  fictionalDemo: boolean;
  capaActions: MaintenanceCapaActionDto[];
  sdrAssessment: MaintenanceSdrAssessmentDto | null;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceCapaActionDto = {
  id: string;
  findingId: string;
  actionType: string;
  description: string;
  owner: string;
  dueDate: string | null;
  completion: string | null;
  effectivenessReview: string | null;
  status: 'OPEN' | 'UNDER_REVIEW' | 'ACTION_REQUIRED' | 'COMPLETED' | 'CLOSED';
};

export type MaintenanceSdrAssessmentDto = {
  id: string;
  sourceType: string;
  sourceId: string;
  reportabilityStatus: string;
  discoveredAt: string;
  simulatedDueAt: string | null;
  assessment: string;
  decisionOwner: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'ACTION_REQUIRED' | 'COMPLETED' | 'CLOSED';
  fictionalDemo: boolean;
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
  aircraftImageUrl: string | null;
  defectNumber: string;
  title: string;
  description: string;
  status: 'OPEN' | 'DEFERRED' | 'RECTIFIED' | 'CLOSED';
  detectedAt: string;
  reporterObservation: string;
  initialSeverity: string;
  operationalImpact: string | null;
  flightPhase: string | null;
  stationId: string | null;
  sourceReference: string | null;
  derivedSourceFlightId: string | null;
  derivedSourceFlightNumber: string | null;
  assessmentDecision: 'GROUND' | 'DEFER' | 'NO_IMPACT' | null;
  assessmentNote: string | null;
  defermentId: string | null;
  defermentStatus: 'ACTIVE' | 'EXPIRED' | 'CLOSED' | 'VOID' | null;
  defermentEffectiveAt: string | null;
  defermentExpiresAt: string | null;
  defermentTargetRectificationAt: string | null;
  defermentReferenceCode: string | null;
  defermentOperationalLimitations: string | null;
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
  aircraftImageUrl: string | null;
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
  imageUrl: string | null;
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
  aircraftImageUrl: string | null;
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
    maintenanceHold: number;
    demoBlocked: number;
    dueSoon: number;
    overdue: number;
    partsBlockers: number;
    toolingBlockers: number;
    authorizationBlockers: number;
    approvedDataBlockers: number;
    reworkRequired: number;
  };
  fleet: MaintenanceAircraftStatusSummaryDto[];
  defects: MaintenanceDefectSummaryDto[];
  workPackages: MaintenanceWorkPackageDto[];
  jobCardsAwaitingExecution: Array<
    MaintenanceJobCardDto & {
      packageNumber: string;
      workPackageTitle: string;
      aircraftRegistrationNumber: string;
      aircraftImageUrl: string | null;
    }
  >;
  inspectionsAwaitingAction: Array<
    MaintenanceJobCardDto & {
      packageNumber: string;
      workPackageTitle: string;
      aircraftRegistrationNumber: string;
      aircraftImageUrl: string | null;
    }
  >;
  readyForRelease: MaintenanceWorkPackageDto[];
  releaseBlockers: Array<{
    workPackageId: string;
    packageNumber: string;
    aircraftRegistrationNumber: string;
    aircraftImageUrl: string | null;
    blockers: MaintenanceDomainBlockerDto[];
  }>;
  operationalAttention: MaintenanceOperationalAttentionDto[];
  recentAuditRecords: MaintenanceAuditRecordDto[];
  technicalReleases: MaintenanceTechnicalReleaseSummaryDto[];
  dueControl: MaintenanceDueStatusDto[];
};

export type MaintenanceSelectorDataDto = {
  generatedAt: string;
  authorizationNotice: string;
  aircraft: Array<{
    id: string;
    registrationNumber: string;
    imageUrl: string | null;
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
  aircraftImageUrl: string | null;
  aircraftType?: string;
  aircraftModel?: string;
  sourceFlightId: string | null;
  primaryDefectId: string | null;
  primaryDefectNumber: string | null;
  sourceDueRequirementId: string | null;
  sourceDueStatusId: string | null;
  sourceDueRequirementCode: string | null;
  sourceDueRequirementTitle: string | null;
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
  currentMaintenanceSlot?: MaintenanceSlotDto | null;
  readinessPanel?: MaintenanceReadinessPanelDto;
  releaseEligibility?: MaintenanceReleaseEligibilityDto;
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
  nonRoutineFindings?: MaintenanceNonRoutineFindingDto[];
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
