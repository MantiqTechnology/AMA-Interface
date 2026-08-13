import { z } from 'zod';

// =============================================================================
// Demo-v2.1: Operational Resource Control — Zod Validation Schemas
// =============================================================================

// ----- Resource Planning Declarations -----

export const resourcePlanningTypeSchema = z.enum(['MATERIAL', 'TOOL', 'PERSONNEL']);
export const resourcePlanningDeclarationSchema = z.enum(['REQUIRED', 'NOT_REQUIRED']);

export const declareResourceSchema = z.object({
  resourceType: resourcePlanningTypeSchema,
  declaration: resourcePlanningDeclarationSchema,
  reason: z.string().trim().max(2000).optional(),
  evidenceDocumentId: z.string().trim().min(1).optional()
});

// ----- Material Requirements -----

export const createMaterialRequirementSchema = z
  .object({
    workPackageId: z.string().trim().min(1),
    jobCardId: z.string().trim().min(1).optional(),
    partId: z.string().trim().min(1).optional(),
    serializedPartId: z.string().trim().min(1).optional(),
    requiredQuantity: z.number().positive(),
    unit: z.string().trim().min(1),
    requestedStationId: z.string().trim().min(1),
    requiredBy: z.string().trim().min(1).optional(),
    reason: z.string().trim().max(2000).optional(),
    notes: z.string().trim().max(2000).optional()
  })
  .refine((data) => data.partId || data.serializedPartId, {
    message: 'Either partId or serializedPartId must be provided',
    path: ['partId']
  })
  .refine((data) => !(data.partId && data.serializedPartId), {
    message: 'Cannot specify both partId and serializedPartId',
    path: ['partId']
  });

// ----- Material Reservation -----

export const reserveMaterialSchema = z.object({
  materialRequirementId: z.string().trim().min(1),
  inventoryItemId: z.string().trim().min(1),
  serializedPartId: z.string().trim().min(1).optional(),
  lotNumber: z.string().trim().min(1).optional(),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1),
  stationId: z.string().trim().min(1),
  inventoryLocationId: z.string().trim().min(1).optional(),
  certificateReference: z.string().trim().min(1).optional(),
  certificateDocumentId: z.string().trim().min(1).optional(),
  idempotencyKey: z.string().trim().min(1)
});

// ----- Material Issue -----

export const issueMaterialSchema = z.object({
  reservationId: z.string().trim().min(1),
  quantity: z.number().positive(),
  idempotencyKey: z.string().trim().min(1)
});

export const releaseMaterialReservationSchema = z.object({
  reservationId: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(2000),
  idempotencyKey: z.string().trim().min(1).optional()
});

export const installMaterialSchema = z.object({
  reservationId: z.string().trim().min(1),
  quantity: z.number().positive(),
  jobCardId: z.string().trim().min(1).optional(),
  position: z.string().trim().min(1).max(120).optional(),
  installedAt: z.string().datetime({ offset: true }).optional(),
  hoursAtInstall: z.coerce.number().nonnegative().optional(),
  cyclesAtInstall: z.coerce.number().int().nonnegative().optional(),
  idempotencyKey: z.string().trim().min(1)
});

// ----- Material Consume -----

export const consumeMaterialSchema = z.object({
  reservationId: z.string().trim().min(1),
  quantity: z.number().positive(),
  idempotencyKey: z.string().trim().min(1)
});

// ----- Material Return -----

export const returnMaterialSchema = z.object({
  reservationId: z.string().trim().min(1),
  quantity: z.number().positive(),
  condition: z.enum(['SERVICEABLE', 'UNSERVICEABLE', 'QUARANTINE']),
  reason: z.string().trim().max(2000),
  idempotencyKey: z.string().trim().min(1)
});

// ----- Tool Requirements -----

export const createToolRequirementSchema = z.object({
  workPackageId: z.string().trim().min(1),
  jobCardId: z.string().trim().min(1).optional(),
  toolMasterId: z.string().trim().min(1).optional(),
  toolType: z.string().trim().min(1).optional(),
  quantity: z.number().int().positive(),
  requiredStationId: z.string().trim().min(1),
  requiredFrom: z.string().trim().min(1),
  requiredUntil: z.string().trim().min(1)
});

// ----- Tool Allocation -----

export const allocateToolSchema = z.object({
  toolRequirementId: z.string().trim().min(1),
  toolId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1)
});

// ----- Tool Custody -----

export const assignToolCustodySchema = z.object({
  allocationId: z.string().trim().min(1),
  custodianPersonnelId: z.string().trim().min(1)
});

// ----- Tool Return -----

export const returnToolSchema = z.object({
  allocationId: z.string().trim().min(1),
  returnCondition: z.string().trim().min(1),
  returnNote: z.string().trim().max(2000).optional(),
  idempotencyKey: z.string().trim().min(1)
});

// ----- Personnel Requirements -----

export const personnelRoleTypeSchema = z.enum(['MECHANIC', 'INSPECTOR', 'CERTIFYING_STAFF']);

export const createPersonnelRequirementSchema = z.object({
  workPackageId: z.string().trim().min(1),
  jobCardId: z.string().trim().min(1).optional(),
  roleType: personnelRoleTypeSchema,
  requiredCount: z.number().int().positive(),
  requiredLicenceType: z.string().trim().min(1).optional(),
  requiredQualification: z.string().trim().min(1).optional(),
  requiredAuthorization: z.string().trim().min(1).optional(),
  aircraftType: z.string().trim().min(1).optional(),
  dutyStationId: z.string().trim().min(1),
  requiredFrom: z.string().trim().min(1),
  requiredUntil: z.string().trim().min(1)
});

// ----- Personnel Assignment -----

export const assignPersonnelSchema = z.object({
  personnelRequirementId: z.string().trim().min(1),
  personnelId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1)
});

// ----- Personnel Confirm/Release -----

export const personnelActionSchema = z.object({
  assignmentId: z.string().trim().min(1)
});

// ----- Flight-MRO Links -----

export const linkFlightMroSchema = z.object({
  flightOrderId: z.string().trim().min(1),
  workPackageId: z.string().trim().min(1),
  affectsServiceability: z.boolean(),
  linkReason: z.string().trim().max(2000)
});

export const unlinkFlightMroSchema = z.object({
  linkId: z.string().trim().min(1),
  reason: z.string().trim().max(2000)
});

// ----- Query Schemas -----

export const atpQuerySchema = z.object({
  partId: z.string().trim().min(1),
  stationId: z.string().trim().min(1)
});

export const materialTraceabilityQuerySchema = z.object({
  materialRequirementId: z.string().trim().min(1).optional()
});

export const resourceRequirementIdParamsSchema = z.object({
  id: z.string().trim().min(1),
  requirementId: z.string().trim().min(1)
});
