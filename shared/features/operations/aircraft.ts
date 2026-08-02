import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const aircraftListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const aircraftIdParamsSchema = z.object({ id: z.string().min(1) });
export const aircraftStatusSchema = z.object({ isActive: z.boolean() });
export const aircraftOperationalStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'RETIRED']);
export const aircraftTechnicalStatusSchema = z.enum([
  'SERVICEABLE',
  'SERVICEABLE_WITH_RESTRICTIONS',
  'UNSERVICEABLE'
]);
export const aircraftInputSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  serialNumber: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  aircraftType: z.string().trim().min(1),
  manufacturer: z.string().trim().min(1),
  model: z.string().trim().min(1),
  fleetCode: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .nullable()
    )
    .optional()
    .default(null),
  passengerCapacity: z.coerce.number().int().min(0),
  cargoCapacityKg: z.coerce.number().int().min(0),
  fuelType: z.enum(['AVTUR', 'AVGAS']),
  engineCategory: z.enum(['RECIPROCATING', 'TURBINE']).optional().default('TURBINE'),
  usableFuelCapacityLitre: z
    .preprocess(emptyToNull, z.coerce.number().positive().nullable())
    .optional()
    .default(null),
  fuelCapacityBasis: z.enum(['USABLE', 'TOTAL_TANK']).optional().default('USABLE'),
  cruiseFuelBurnLitrePerHour: z
    .preprocess(emptyToNull, z.coerce.number().positive().nullable())
    .optional()
    .default(null),
  holdingFuelBurnLitrePerHour: z
    .preprocess(emptyToNull, z.coerce.number().positive().nullable())
    .optional()
    .default(null),
  taxiFuelBurnLitrePerHour: z
    .preprocess(emptyToNull, z.coerce.number().positive().nullable())
    .optional()
    .default(null),
  fuelProfileSource: z
    .enum(['AFM', 'POH', 'OPERATOR_APPROVED_TABLE', 'HISTORICAL_ESTIMATE', 'DEMO'])
    .optional()
    .default('DEMO'),
  fuelProfileReference: z
    .preprocess(emptyToNull, z.string().trim().max(200).nullable())
    .optional()
    .default(null),
  fuelProfileEffectiveFrom: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
        .nullable()
    )
    .optional()
    .default(null),
  fuelProfileAdvisoryOnly: z.boolean().optional().default(true),
  defaultCapacityProfileId: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  baseStationId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  currentStationId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
});

const evidenceReferencesSchema = z
  .array(z.string().trim().min(1).max(240))
  .max(12)
  .optional()
  .default([]);

export const aircraftOperationalTransitionSchema = z.object({
  toStatus: aircraftOperationalStatusSchema,
  reason: z.string().trim().min(10).max(1000),
  expectedVersion: z.coerce.number().int().positive()
});

export const aircraftDefectInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(3000),
  detectedAt: z.string().datetime(),
  sourceReference: z.preprocess(emptyToNull, z.string().trim().max(240).nullable()).default(null),
  evidenceReferences: evidenceReferencesSchema,
  expectedVersion: z.coerce.number().int().positive()
});

export const aircraftDefermentInputSchema = z
  .object({
    defectId: z.string().trim().min(1),
    defermentType: z.enum(['MEL', 'CDL']),
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
      .default([]),
    expectedVersion: z.coerce.number().int().positive()
  })
  .refine((value) => value.expiresAt > value.effectiveAt, {
    message: 'Deferment expiry must be after its effective time.',
    path: ['expiresAt']
  });

export const aircraftMaintenanceReleaseInputSchema = z.object({
  releaseNumber: z.string().trim().min(3).max(100),
  resultingStatus: z.enum(['SERVICEABLE', 'SERVICEABLE_WITH_RESTRICTIONS']),
  workOrderReference: z.string().trim().min(2).max(240),
  releaseStatement: z.string().trim().min(20).max(3000),
  certifyingLicenseNumber: z.string().trim().min(3).max(100),
  releasedAt: z.string().datetime(),
  defectIds: z.array(z.string().trim().min(1)).max(50).optional().default([]),
  evidenceReferences: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  expectedVersion: z.coerce.number().int().positive()
});

export const aircraftMaintenanceRequirementInputSchema = z
  .object({
    requirementCode: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .transform((value) => value.toUpperCase().replaceAll(/\s+/gu, '_')),
    title: z.string().trim().min(3).max(200),
    dueAt: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/u)
          .nullable()
      )
      .default(null),
    dueAirframeHours: z
      .preprocess(emptyToNull, z.coerce.number().positive().nullable())
      .default(null),
    dueAirframeCycles: z
      .preprocess(emptyToNull, z.coerce.number().int().positive().nullable())
      .default(null),
    sourceReference: z.string().trim().min(2).max(240),
    expectedVersion: z.coerce.number().int().positive()
  })
  .refine(
    (value) =>
      value.dueAt !== null || value.dueAirframeHours !== null || value.dueAirframeCycles !== null,
    {
      message: 'At least one calendar, hours, or cycles limit is required.',
      path: ['dueAt']
    }
  );

export type AircraftListQuery = z.infer<typeof aircraftListQuerySchema>;
export type AircraftInput = z.infer<typeof aircraftInputSchema>;
export type AircraftOperationalStatus = z.infer<typeof aircraftOperationalStatusSchema>;
export type AircraftTechnicalStatus = z.infer<typeof aircraftTechnicalStatusSchema>;
export type AircraftOperationalTransition = z.infer<typeof aircraftOperationalTransitionSchema>;
export type AircraftDefectInput = z.infer<typeof aircraftDefectInputSchema>;
export type AircraftDefermentInput = z.infer<typeof aircraftDefermentInputSchema>;
export type AircraftMaintenanceReleaseInput = z.infer<typeof aircraftMaintenanceReleaseInputSchema>;
export type AircraftMaintenanceRequirementInput = z.infer<
  typeof aircraftMaintenanceRequirementInputSchema
>;
export type AircraftDto = {
  id: string;
  registrationNumber: string;
  serialNumber: string | null;
  aircraftType: string;
  manufacturer: string;
  model: string;
  fleetCode: string | null;
  passengerCapacity: number;
  cargoCapacityKg: number;
  fuelType: string;
  engineCategory: string;
  usableFuelCapacityLitre: number | null;
  fuelCapacityBasis: string;
  cruiseFuelBurnLitrePerHour: number | null;
  holdingFuelBurnLitrePerHour: number | null;
  taxiFuelBurnLitrePerHour: number | null;
  fuelProfileSource: string;
  fuelProfileReference: string | null;
  fuelProfileEffectiveFrom: string | null;
  fuelProfileAdvisoryOnly: boolean;
  defaultCapacityProfileId: string | null;
  operationalStatus: AircraftOperationalStatus;
  serviceabilityStatus: AircraftTechnicalStatus;
  baseStationId: string | null;
  currentStationId: string | null;
  lastMaintenanceCheckAt: string | null;
  nextMaintenanceDueAt: string | null;
  serviceabilityNote: string | null;
  airframeHours: number;
  airframeCycles: number;
  version: number;
  maintenanceDue: boolean;
  dueReasons: string[];
  technicalEligibility: 'ELIGIBLE' | 'RESTRICTED' | 'BLOCKED';
  openDefectCount: number;
  activeRestrictionCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AircraftDefectDto = {
  id: string;
  defectNumber: string;
  title: string;
  description: string;
  detectedAt: string;
  sourceReference: string | null;
  evidenceReferences: string[];
  status: 'OPEN' | 'DEFERRED' | 'RECTIFIED' | 'CLOSED';
  rectificationNote: string | null;
  version: number;
};

export type AircraftDefermentDto = {
  id: string;
  defectId: string;
  defermentType: 'MEL' | 'CDL';
  referenceCode: string;
  category: string | null;
  operationalLimitations: string;
  applicableRouteIds: string[];
  applicableServiceTypeCodes: string[];
  effectiveAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CLOSED' | 'VOID';
};

export type AircraftMaintenanceReleaseDto = {
  id: string;
  releaseNumber: string;
  resultingStatus: 'SERVICEABLE' | 'SERVICEABLE_WITH_RESTRICTIONS';
  workOrderReference: string;
  releaseStatement: string;
  certifyingUserId: string;
  certifyingLicenseNumber: string;
  releasedAt: string;
  evidenceReferences: string[];
  defectIds: string[];
  signerAuthorizationSnapshot: Record<string, unknown> | null;
};

export type AircraftMaintenanceRequirementDto = {
  id: string;
  requirementCode: string;
  title: string;
  dueAt: string | null;
  dueAirframeHours: number | null;
  dueAirframeCycles: number | null;
  sourceReference: string;
  status: 'ACTIVE' | 'COMPLIED' | 'VOID';
  compliedAt: string | null;
};

export type AircraftStatusHistoryDto = {
  id: string;
  statusDimension: 'OPERATIONAL' | 'TECHNICAL';
  fromStatus: string | null;
  toStatus: string;
  reason: string;
  sourceType: string;
  sourceId: string | null;
  actorUserId: string;
  actorRole: string;
  occurredAt: string;
};

export type AircraftAirworthinessDto = {
  aircraft: AircraftDto;
  defects: AircraftDefectDto[];
  deferments: AircraftDefermentDto[];
  requirements: AircraftMaintenanceRequirementDto[];
  releases: AircraftMaintenanceReleaseDto[];
  history: AircraftStatusHistoryDto[];
  affectedFlightIds: string[];
};
export type AircraftOption = {
  id: string;
  registrationNumber: string;
  aircraftType: string;
  manufacturer: string;
  model: string;
  passengerCapacity: number;
  cargoCapacityKg: number;
  fuelType: string;
  engineCategory: string;
  usableFuelCapacityLitre: number | null;
  fuelCapacityBasis: string;
  cruiseFuelBurnLitrePerHour: number | null;
  holdingFuelBurnLitrePerHour: number | null;
  taxiFuelBurnLitrePerHour: number | null;
  fuelProfileSource: string;
  fuelProfileReference: string | null;
  fuelProfileEffectiveFrom: string | null;
  fuelProfileAdvisoryOnly: boolean;
  serviceabilityStatus: string;
  baseStationId: string | null;
  currentStationId: string | null;
  nextMaintenanceDueAt: string | null;
  serviceabilityNote: string | null;
};
