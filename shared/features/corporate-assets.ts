import { z } from 'zod';

export const assetCategories = [
  'GSE',
  'VEHICLE',
  'IT_EQUIPMENT',
  'MACHINERY',
  'FACILITY',
  'FURNITURE',
  'OTHER'
] as const;
export const assetLifecycleStatuses = ['ACTIVE', 'RETIRED', 'DISPOSED', 'LOST'] as const;
export const assetConditionStatuses = [
  'SERVICEABLE',
  'LIMITED',
  'UNDER_MAINTENANCE',
  'UNSERVICEABLE'
] as const;
export const assetLocationTypes = [
  'STATION',
  'DEPARTMENT',
  'TRANSIT',
  'VENDOR',
  'UNASSIGNED',
  'RETIRED',
  'LOST'
] as const;

const nullableId = z.string().trim().min(1).nullable().default(null);
const mutationTokenSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional()
});

export const departmentInputSchema = z.object({
  departmentCode: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .transform((value) => value.toUpperCase()),
  departmentName: z.string().trim().min(2).max(120)
});
export const departmentUpdateSchema = departmentInputSchema.extend({ isActive: z.boolean() });
export const employeeInputSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((value) => value.toUpperCase()),
  fullName: z.string().trim().min(2).max(160),
  departmentId: nullableId,
  baseStationId: nullableId,
  positionTitle: z.string().trim().min(2).max(120),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  demoActorId: nullableId
});
export const departmentStatusSchema = z.object({ isActive: z.boolean() });
export const employeeStatusSchema = z.object({ employmentStatus: z.enum(['ACTIVE', 'INACTIVE']) });

export const assetListQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  category: z.enum(assetCategories).optional(),
  stationId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  lifecycleStatus: z.enum(assetLifecycleStatuses).optional(),
  conditionStatus: z.enum(assetConditionStatuses).optional(),
  sortBy: z.enum(['assetCode', 'name', 'category', 'updatedAt']).default('assetCode'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().int().min(1).max(250).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const assetInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.enum(assetCategories),
  brand: z.string().trim().max(120).nullable().default(null),
  model: z.string().trim().max(120).nullable().default(null),
  serialNumber: z.string().trim().max(120).nullable().default(null),
  stationId: nullableId,
  locationType: z.enum(assetLocationTypes),
  locationDetail: z.string().trim().min(2).max(240),
  departmentId: nullableId,
  currentCustodianEmployeeId: nullableId,
  custodianNameSnapshot: z.string().trim().max(160).nullable().default(null),
  acquisitionDate: z.string().date().nullable().default(null),
  acquisitionReference: z.string().trim().max(120).nullable().default(null),
  lifecycleStatus: z.enum(assetLifecycleStatuses).default('ACTIVE'),
  conditionStatus: z.enum(assetConditionStatuses).default('SERVICEABLE')
});
export const assetUpdateSchema = assetInputSchema.merge(mutationTokenSchema);

export const assetAssignSchema = mutationTokenSchema.extend({
  employeeId: nullableId,
  custodianNameSnapshot: z.string().trim().min(2).max(160),
  departmentId: nullableId,
  reason: z.string().trim().min(3).max(500),
  startedAt: z.string().datetime({ offset: true })
});
export const assetMoveSchema = mutationTokenSchema.extend({
  toStationId: nullableId,
  toLocationType: z.enum(assetLocationTypes),
  toLocation: z.string().trim().min(2).max(240),
  newEmployeeId: nullableId,
  newCustodianNameSnapshot: z.string().trim().max(160).nullable().default(null),
  reason: z.string().trim().min(3).max(500),
  movedAt: z.string().datetime({ offset: true })
});
export const maintenanceWorkOrderInputSchema = mutationTokenSchema.extend({
  maintenanceType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  summary: z.string().trim().min(3).max(500),
  scheduledAt: z.string().datetime({ offset: true }).nullable().default(null)
});
export const maintenanceCompleteSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
  completionResult: z.string().trim().min(3).max(1000),
  evidenceReference: z.string().trim().min(2).max(240),
  conditionAfter: z.enum(assetConditionStatuses).refine((value) => value !== 'UNDER_MAINTENANCE'),
  reason: z.string().trim().min(3).max(500)
});
export const maintenancePartRequestSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
  warehouseId: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(500),
  lines: z
    .array(
      z.object({
        partId: z.string().trim().min(1),
        quantity: z.coerce.number().positive(),
        serialIds: z.array(z.string().trim().min(1)).default([]),
        note: z.string().trim().max(500).nullable().default(null)
      })
    )
    .min(1)
});
export const auditInputSchema = mutationTokenSchema.extend({
  auditorEmployeeId: nullableId,
  auditorNameSnapshot: z.string().trim().min(2).max(160),
  auditedAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(1000).nullable().default(null),
  lines: z
    .array(
      z.object({
        fieldName: z.string().trim().min(1).max(80),
        expectedValue: z.string().trim().max(240).nullable().default(null),
        actualValue: z.string().trim().max(240).nullable().default(null),
        discrepancyType: z.string().trim().max(80).nullable().default(null),
        notes: z.string().trim().max(500).nullable().default(null)
      })
    )
    .min(1)
});
export const reconcileAssetSchema = mutationTokenSchema.extend({
  auditId: z.string().trim().min(1),
  stationId: nullableId,
  locationType: z.enum(assetLocationTypes),
  locationDetail: z.string().trim().min(2).max(240),
  conditionStatus: z.enum(assetConditionStatuses),
  reason: z.string().trim().min(3).max(500)
});
export const insuranceInputSchema = mutationTokenSchema
  .extend({
    insurer: z.string().trim().min(2).max(160),
    policyNumber: z.string().trim().min(2).max(120),
    coverageMinor: z.coerce.number().int().nonnegative(),
    premiumMinor: z.coerce.number().int().nonnegative(),
    effectiveDate: z.string().date(),
    expiryDate: z.string().date(),
    status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']).default('ACTIVE')
  })
  .refine((value) => value.expiryDate >= value.effectiveDate, {
    message: 'Expiry date must be on or after effective date.',
    path: ['expiryDate']
  });

export type AssetListQuery = z.infer<typeof assetListQuerySchema>;
export type AssetInput = z.infer<typeof assetInputSchema>;
export type AssetUpdate = z.infer<typeof assetUpdateSchema>;
export type AssetAssignInput = z.infer<typeof assetAssignSchema>;
export type AssetMoveInput = z.infer<typeof assetMoveSchema>;
export type MaintenanceWorkOrderInput = z.infer<typeof maintenanceWorkOrderInputSchema>;
export type MaintenanceCompleteInput = z.infer<typeof maintenanceCompleteSchema>;
export type MaintenancePartRequestInput = z.infer<typeof maintenancePartRequestSchema>;
export type AssetAuditInput = z.infer<typeof auditInputSchema>;
export type ReconcileAssetInput = z.infer<typeof reconcileAssetSchema>;
export type InsuranceInput = z.infer<typeof insuranceInputSchema>;
export type DepartmentInput = z.infer<typeof departmentInputSchema>;
export type DepartmentUpdate = z.infer<typeof departmentUpdateSchema>;
export type EmployeeInput = z.infer<typeof employeeInputSchema>;
