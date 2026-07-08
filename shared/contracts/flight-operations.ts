import { z } from 'zod';
import { isoDateTimeSchema } from './common';

export const flightOperationStatuses = [
  'DRAFT',
  'PENDING_READINESS',
  'BLOCKED',
  'READY_FOR_APPROVAL',
  'APPROVED',
  'SCHEDULED',
  'CHECK_IN_OPEN',
  'IN_PROGRESS',
  'LANDED',
  'PENDING_CLOSURE',
  'CLOSED',
  'CANCELLED',
  'DIVERTED',
  'REOPENED_FOR_CORRECTION'
] as const;

export const flightOperationStatusSchema = z.enum(flightOperationStatuses);
export const flightTypeSchema = z.enum(['CHARTER', 'PASSENGER', 'CARGO']);
export const crewAssignmentRoleSchema = z.enum([
  'PILOT_IN_COMMAND',
  'CO_PILOT',
  'CABIN_CREW',
  'FLIGHT_OPERATIONS',
  'GROUND_CREW'
]);
export const flightActionTypeSchema = z.enum([
  'CREATE',
  'SUBMIT',
  'READINESS_EVALUATED',
  'BLOCK',
  'APPROVE',
  'SCHEDULE',
  'OPEN_CHECK_IN',
  'DEPART',
  'LAND',
  'MARK_PENDING_CLOSURE',
  'CLOSE',
  'CANCEL',
  'DIVERT',
  'REOPEN'
]);
export const readinessStatusSchema = z.enum(['PENDING', 'PASS', 'FAIL', 'NOT_APPLICABLE']);
export const manifestTypeSchema = z.enum(['PASSENGER', 'CARGO']);
export const manifestStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED']);
export const dgAcceptanceStatusSchema = z.enum([
  'NOT_APPLICABLE',
  'PENDING',
  'ACCEPTED',
  'REJECTED'
]);
export const fuelWorkflowStatusSchema = z.enum([
  'REQUESTED',
  'APPROVED',
  'UPLIFTED',
  'POSTED',
  'REJECTED'
]);
export const stationServiceTypeSchema = z.enum(['HANDLING', 'PARKING']);
export const stationServiceStatusSchema = z.enum([
  'REQUESTED',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED'
]);
export const stationCostStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'VOID'
]);
export const maintenanceHandoffStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'POSTED'
]);
export const financeHandoffStatusSchema = z.enum(['DRAFT', 'READY', 'POSTED', 'VOID']);
export const financeHandoffEventTypeSchema = z.enum([
  'FUEL_COST_DRAFT',
  'STATION_COST_DRAFT',
  'MAINTENANCE_EXPENSE_DRAFT',
  'FLIGHT_CLOSED_ELIGIBLE_FOR_INVOICE',
  'FLIGHT_CANCELLED_VOID_REQUEST'
]);

const blankToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const localDateTimeToIso = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(trimmed)) {
    return new Date(trimmed).toISOString();
  }
  return trimmed;
};

const nullableIdSchema = z.preprocess(blankToNull, z.string().trim().min(1).nullable().optional());
const nullableTextSchema = z.preprocess(blankToNull, z.string().trim().nullable().optional());
const nullableIsoDateTimeSchema = z.preprocess(
  localDateTimeToIso,
  isoDateTimeSchema.nullable().optional()
);
const nonnegativeNumberSchema = z.preprocess(blankToUndefined, z.coerce.number().nonnegative());
const nullableNonnegativeNumberSchema = z.preprocess(
  blankToNull,
  z.coerce.number().nonnegative().nullable().optional()
);

export type FlightOperationStatus = z.infer<typeof flightOperationStatusSchema>;
export type FlightType = z.infer<typeof flightTypeSchema>;
export type CrewAssignmentRole = z.infer<typeof crewAssignmentRoleSchema>;
export type FlightActionType = z.infer<typeof flightActionTypeSchema>;
export type ReadinessStatus = z.infer<typeof readinessStatusSchema>;
export type ManifestType = z.infer<typeof manifestTypeSchema>;
export type ManifestStatus = z.infer<typeof manifestStatusSchema>;
export type DgAcceptanceStatus = z.infer<typeof dgAcceptanceStatusSchema>;
export type FuelWorkflowStatus = z.infer<typeof fuelWorkflowStatusSchema>;
export type StationServiceType = z.infer<typeof stationServiceTypeSchema>;
export type StationServiceStatus = z.infer<typeof stationServiceStatusSchema>;
export type StationCostStatus = z.infer<typeof stationCostStatusSchema>;
export type MaintenanceHandoffStatus = z.infer<typeof maintenanceHandoffStatusSchema>;
export type FinanceHandoffEventType = z.infer<typeof financeHandoffEventTypeSchema>;
export type FinanceHandoffStatus = z.infer<typeof financeHandoffStatusSchema>;

export type FlightOperationRecord = {
  id: string;
  flightNumber: string;
  flightDate: string;
  flightType: FlightType;
  routeId: string;
  routeCode: string;
  originStationId: string;
  originStationCode: string;
  destinationStationId: string;
  destinationStationCode: string;
  customerId: string | null;
  customerName: string | null;
  aircraftId: string | null;
  aircraftRegistration: string | null;
  aircraftServiceability: string | null;
  pilotInCommandId: string | null;
  pilotInCommandName: string | null;
  coPilotId: string | null;
  coPilotName: string | null;
  scheduledDepartureAt: string | null;
  scheduledArrivalAt: string | null;
  actualDepartureAt: string | null;
  actualArrivalAt: string | null;
  currentStatus: FlightOperationStatus;
  createdByUserId: string | null;
  approvedByUserId: string | null;
  remarks: string | null;
  isLocked: boolean;
  readinessPercent: number;
  readinessSummary: string;
  blockingReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FlightCrewAssignmentDto = {
  id: string;
  flightId: string;
  crewId: string;
  crewName: string;
  employeeCode: string;
  assignmentRole: CrewAssignmentRole;
  isPrimary: boolean;
  licenseExpiryDate: string | null;
  medicalExpiryDate: string | null;
};

export type FlightReadinessCheckDto = {
  id: string;
  flightId: string;
  checkCode: string;
  checkName: string;
  status: ReadinessStatus;
  isRequired: boolean;
  evaluatedAt: string | null;
  evaluatedByUserId: string | null;
  resultNote: string | null;
  sourceReference: string | null;
};

export type FlightStatusHistoryDto = {
  id: string;
  flightId: string;
  fromStatus: FlightOperationStatus | null;
  toStatus: FlightOperationStatus;
  actionType: FlightActionType;
  reasonId: string | null;
  reasonLabel: string | null;
  reasonNote: string | null;
  changedByUserId: string | null;
  changedAt: string;
  metadata: Record<string, unknown> | null;
};

export type FlightManifestDto = {
  id: string;
  flightId: string;
  manifestType: ManifestType;
  status: ManifestStatus;
  passengerCount: number;
  passengerWeightKg: number;
  cargoCount: number;
  cargoActualWeightKg: number;
  dgPendingCount: number;
  dgRejectedCount: number;
};

export type FlightManifestPassengerDto = {
  id: string;
  manifestId: string;
  fullName: string;
  identityType: string | null;
  identityNumber: string | null;
  weightKg: number | null;
  seatNumber: string | null;
  baggageWeightKg: number | null;
  remarks: string | null;
};

export type FlightManifestCargoDto = {
  id: string;
  manifestId: string;
  description: string;
  senderName: string | null;
  receiverName: string | null;
  actualWeightKg: number;
  volumeWeightKg: number | null;
  chargeableWeightKg: number | null;
  dgCategoryId: string | null;
  dgCategoryLabel: string | null;
  dgAcceptanceStatus: DgAcceptanceStatus;
  remarks: string | null;
};

export type FlightFuelRequestDto = {
  id: string;
  flightId: string;
  flightNumber: string;
  fuelSupplierId: string;
  supplierName: string;
  fuelType: string;
  requestedQuantityLitre: number;
  approvedQuantityLitre: number | null;
  actualUpliftLitre: number | null;
  referencePricePerLitre: number | null;
  actualPricePerLitre: number | null;
  taxAmount: number | null;
  totalCost: number | null;
  status: FuelWorkflowStatus;
  varianceNote: string | null;
};

export type FlightStationServiceDto = {
  id: string;
  flightId: string;
  flightNumber: string;
  stationId: string;
  stationCode: string;
  serviceSupplierId: string;
  supplierName: string;
  serviceType: StationServiceType;
  status: StationServiceStatus;
  referenceRate: number | null;
};

export type FlightStationCostDto = {
  id: string;
  flightId: string | null;
  flightNumber: string | null;
  stationId: string;
  stationCode: string;
  vendorId: string | null;
  vendorName: string | null;
  costCategoryId: string;
  costCategoryName: string;
  amount: number;
  currencyId: string;
  currencyCode: string;
  description: string;
  status: StationCostStatus;
};

export type FlightMaintenanceHandoffDto = {
  id: string;
  flightId: string | null;
  flightNumber: string | null;
  aircraftId: string;
  aircraftRegistration: string;
  serviceabilityStatus: string;
  workOrderReference: string | null;
  maintenanceNote: string | null;
  sparePartReference: string | null;
  maintenanceCost: number;
  currencyId: string;
  currencyCode: string;
  status: MaintenanceHandoffStatus;
};

export type FlightFinanceHandoffDto = {
  id: string;
  flightId: string;
  sourceType: string;
  sourceId: string | null;
  eventType: FinanceHandoffEventType;
  status: FinanceHandoffStatus;
  summary: string;
  amount: number | null;
  currencyId: string | null;
  currencyCode: string | null;
  createdAt: string;
};

export type FlightOperationDetailDto = FlightOperationRecord & {
  crewAssignments: FlightCrewAssignmentDto[];
  readinessChecks: FlightReadinessCheckDto[];
  histories: FlightStatusHistoryDto[];
  manifests: FlightManifestDto[];
  passengers: FlightManifestPassengerDto[];
  cargoItems: FlightManifestCargoDto[];
  fuelRequests: FlightFuelRequestDto[];
  stationServices: FlightStationServiceDto[];
  stationCosts: FlightStationCostDto[];
  maintenanceHandoffs: FlightMaintenanceHandoffDto[];
  financeHandoffs: FlightFinanceHandoffDto[];
};

export type FlightOperationOverviewDto = {
  summary: Record<FlightOperationStatus, number>;
  flights: FlightOperationRecord[];
};

export type FlightOperationLookupsDto = {
  routes: Array<{
    value: string;
    title: string;
    originStationId: string;
    destinationStationId: string;
  }>;
  aircraft: Array<{ value: string; title: string; serviceabilityStatus: string; fuelType: string }>;
  crews: Array<{
    value: string;
    title: string;
    crewRole: string;
    licenseExpiryDate: string | null;
    medicalExpiryDate: string | null;
  }>;
  customers: Array<{ value: string; title: string }>;
  stations: Array<{ value: string; title: string }>;
  fuelSuppliers: Array<{
    value: string;
    title: string;
    fuelType: string;
    referencePricePerLitre: number;
  }>;
  serviceSuppliers: Array<{
    value: string;
    title: string;
    serviceType: string;
    referenceRate: number | null;
  }>;
  vendors: Array<{ value: string; title: string }>;
  costCategories: Array<{ value: string; title: string }>;
  currencies: Array<{ value: string; title: string }>;
  dgCategories: Array<{ value: string; title: string }>;
  flightReasons: Array<{ value: string; title: string; reasonType: string; requiresNote: boolean }>;
};

export const listFlightOperationsQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  status: flightOperationStatusSchema.optional(),
  flightType: flightTypeSchema.optional(),
  routeId: z.string().trim().optional(),
  originStationId: z.string().trim().optional(),
  destinationStationId: z.string().trim().optional(),
  aircraftId: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0)
});

export const createFlightOperationBodySchema = z.object({
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  flightType: flightTypeSchema,
  routeId: z.string().min(1),
  customerId: nullableIdSchema,
  aircraftId: nullableIdSchema,
  pilotInCommandId: nullableIdSchema,
  coPilotId: nullableIdSchema,
  scheduledDepartureAt: nullableIsoDateTimeSchema,
  scheduledArrivalAt: nullableIsoDateTimeSchema,
  remarks: z.preprocess(blankToNull, z.string().trim().max(1000).nullable().optional())
});

export const flightOperationIdParamsSchema = z.object({
  id: z.string().min(1)
});

export const actionNoteBodySchema = z.object({
  note: z.preprocess(blankToUndefined, z.string().trim().max(1000).optional())
});

export const flightReasonActionBodySchema = z.object({
  reasonId: z.string().min(1),
  reasonNote: z.preprocess(blankToUndefined, z.string().trim().max(1000).optional()),
  diversionStationId: z.preprocess(blankToUndefined, z.string().trim().min(1).optional())
});

export const actualTimeBodySchema = z.object({
  actualAt: isoDateTimeSchema
});

export const createPassengerBodySchema = z.object({
  manifestId: z.string().min(1),
  fullName: z.string().trim().min(1),
  identityType: nullableTextSchema,
  identityNumber: nullableTextSchema,
  weightKg: nullableNonnegativeNumberSchema,
  seatNumber: nullableTextSchema,
  baggageWeightKg: nullableNonnegativeNumberSchema,
  remarks: nullableTextSchema
});

export const createCargoBodySchema = z.object({
  manifestId: z.string().min(1),
  description: z.string().trim().min(1),
  senderName: nullableTextSchema,
  receiverName: nullableTextSchema,
  actualWeightKg: nonnegativeNumberSchema,
  volumeWeightKg: nullableNonnegativeNumberSchema,
  chargeableWeightKg: nullableNonnegativeNumberSchema,
  dgCategoryId: nullableIdSchema,
  dgAcceptanceStatus: z.preprocess(
    blankToUndefined,
    dgAcceptanceStatusSchema.default('NOT_APPLICABLE')
  ),
  remarks: nullableTextSchema
});

export const createFuelRequestBodySchema = z.object({
  flightId: z.string().min(1),
  fuelSupplierId: z.string().min(1),
  fuelType: z.string().min(1),
  requestedQuantityLitre: nonnegativeNumberSchema,
  referencePricePerLitre: nullableNonnegativeNumberSchema
});

export const createStationServiceBodySchema = z.object({
  flightId: z.string().min(1),
  stationId: z.string().min(1),
  serviceSupplierId: z.string().min(1),
  serviceType: stationServiceTypeSchema,
  referenceRate: nullableNonnegativeNumberSchema
});

export const createStationCostBodySchema = z.object({
  flightId: nullableIdSchema,
  stationId: z.string().min(1),
  vendorId: nullableIdSchema,
  costCategoryId: z.string().min(1),
  amount: nonnegativeNumberSchema,
  currencyId: z.string().min(1),
  description: z.string().trim().min(1)
});

export const createMaintenanceHandoffBodySchema = z.object({
  flightId: nullableIdSchema,
  aircraftId: z.string().min(1),
  serviceabilityStatus: z.string().min(1),
  workOrderReference: nullableTextSchema,
  maintenanceNote: nullableTextSchema,
  sparePartReference: nullableTextSchema,
  maintenanceCost: z.preprocess(blankToUndefined, z.coerce.number().nonnegative().default(0)),
  currencyId: z.string().min(1)
});

export type ListFlightOperationsQuery = z.infer<typeof listFlightOperationsQuerySchema>;
export type CreateFlightOperationBody = z.infer<typeof createFlightOperationBodySchema>;
export type ActionNoteBody = z.infer<typeof actionNoteBodySchema>;
export type FlightReasonActionBody = z.infer<typeof flightReasonActionBodySchema>;
export type ActualTimeBody = z.infer<typeof actualTimeBodySchema>;
export type CreatePassengerBody = z.infer<typeof createPassengerBodySchema>;
export type CreateCargoBody = z.infer<typeof createCargoBodySchema>;
export type CreateFuelRequestBody = z.infer<typeof createFuelRequestBodySchema>;
export type CreateStationServiceBody = z.infer<typeof createStationServiceBodySchema>;
export type CreateStationCostBody = z.infer<typeof createStationCostBodySchema>;
export type CreateMaintenanceHandoffBody = z.infer<typeof createMaintenanceHandoffBodySchema>;
