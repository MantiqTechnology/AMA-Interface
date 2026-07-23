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

export const flightRequestStatuses = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CONVERTED'
] as const;

export const flightApprovalTypes = [
  'READINESS_APPROVAL',
  'FLIGHT_APPROVAL',
  'CLOSURE_APPROVAL',
  'OVERRIDE'
] as const;

export const flightApprovalStatuses = [
  'NOT_STARTED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REVISION_REQUESTED'
] as const;

export const flightOperationStatusSchema = z.enum(flightOperationStatuses);
export const flightRequestStatusSchema = z.enum(flightRequestStatuses);
export const flightApprovalTypeSchema = z.enum(flightApprovalTypes);
export const flightApprovalStatusSchema = z.enum(flightApprovalStatuses);
export const flightTypeSchema = z.enum(['CHARTER', 'PASSENGER', 'CARGO']);
export const flightServiceTypeSchema = z.enum([
  'CHARTER_CARGO',
  'CHARTER_PASSENGER',
  'SCHEDULED_PASSENGER',
  'MEDEVAC',
  'POSITIONING'
]);
export const flightPrioritySchema = z.enum(['NORMAL', 'HIGH', 'EMERGENCY']);
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
export const aircraftServiceabilityStatusSchema = z.enum([
  'SERVICEABLE',
  'SERVICEABLE_WITH_RESTRICTIONS',
  'MAINTENANCE_DUE',
  'UNSERVICEABLE'
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

const emptyQueryValue = (value: unknown) =>
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
const referenceIdSchema = z.string().trim().min(1);
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
export type FlightRequestStatus = z.infer<typeof flightRequestStatusSchema>;
export type FlightApprovalType = z.infer<typeof flightApprovalTypeSchema>;
export type FlightApprovalStatus = z.infer<typeof flightApprovalStatusSchema>;
export type FlightType = z.infer<typeof flightTypeSchema>;
export type FlightServiceType = z.infer<typeof flightServiceTypeSchema>;
export type FlightPriority = z.infer<typeof flightPrioritySchema>;
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
export type AircraftServiceabilityStatus = z.infer<typeof aircraftServiceabilityStatusSchema>;
export type FinanceHandoffEventType = z.infer<typeof financeHandoffEventTypeSchema>;
export type FinanceHandoffStatus = z.infer<typeof financeHandoffStatusSchema>;

export type FlightOperationLookupOption = {
  value: string;
  id: string;
  code: string;
  label: string;
  title: string;
  sortOrder: number;
};

export type FlightOperationRecord = {
  id: string;
  orderNumber: string;
  flightRequestId: string | null;
  requestNumber: string | null;
  flightNumber: string;
  flightDate: string;
  flightTypeId: string;
  flightTypeCode: FlightType;
  flightTypeLabel: string;
  flightType: FlightType;
  serviceTypeId: string;
  serviceTypeCode: FlightServiceType;
  serviceTypeLabel: string;
  serviceType: FlightServiceType;
  requestSource: string;
  priorityId: string;
  priorityCode: FlightPriority;
  priorityLabel: string;
  priority: FlightPriority;
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
  aircraftCurrentStationCode: string | null;
  aircraftNextMaintenanceDueAt: string | null;
  pilotInCommandId: string | null;
  pilotInCommandName: string | null;
  pilotInCommandAvailabilityStatus: string | null;
  coPilotId: string | null;
  coPilotName: string | null;
  coPilotAvailabilityStatus: string | null;
  scheduledDepartureAt: string | null;
  scheduledArrivalAt: string | null;
  actualDepartureAt: string | null;
  actualDepartureStationId: string | null;
  actualDepartureStationCode: string | null;
  actualArrivalAt: string | null;
  actualArrivalStationId: string | null;
  actualArrivalStationCode: string | null;
  currentStatusId: string;
  currentStatusCode: FlightOperationStatus;
  currentStatusLabel: string;
  currentStatus: FlightOperationStatus;
  createdByUserId: string | null;
  approvedByUserId: string | null;
  remarks: string | null;
  billingType: string;
  estimatedRevenue: number | null;
  currencyCode: string;
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
  baseStationCode: string | null;
  dutyStationCode: string | null;
  masterAvailabilityStatus: string | null;
  readinessNote: string | null;
  availabilityStatus: 'READY' | 'WARNING' | 'BLOCKED';
  conflictNote: string | null;
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
  category: 'AIRCRAFT' | 'CREW' | 'MANIFEST' | 'FUEL' | 'STATION' | 'FINANCE' | 'DOCUMENTS';
  severity: 'SUCCESS' | 'WARNING' | 'DANGER' | 'NEUTRAL';
  blocking: boolean;
  ownerRole: string;
  recommendedAction: string;
  actionHref: string | null;
  classification:
    'SYSTEM_CHECK' | 'MANUAL_ATTESTATION' | 'ENFORCED' | 'INFORMATIONAL' | 'NOT_IMPLEMENTED';
  calculationStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'UNKNOWN';
  verificationStatus:
    'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'MODULE_UNAVAILABLE';
  effectiveStatus: 'PASSED' | 'BLOCKED' | 'WARNING' | 'NOT_APPLICABLE';
  calculatedAt: string | null;
  expiresAt: string | null;
  invalidationReason: string | null;
  sourceRecordIds: string[];
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
  flightOperationId: string;
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
  rejectionNote: string | null;
  version: number;
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
  version: number;
};

export type FlightMaintenanceHandoffDto = {
  id: string;
  flightId: string | null;
  flightNumber: string | null;
  flightDate: string | null;
  currentStatus: FlightOperationStatus | null;
  routeCode: string | null;
  originStationId: string | null;
  originStationCode: string | null;
  destinationStationId: string | null;
  destinationStationCode: string | null;
  scheduledDepartureAt: string | null;
  aircraftId: string;
  aircraftRegistration: string;
  aircraftType: string;
  aircraftNextMaintenanceDueAt: string | null;
  serviceabilityStatus: AircraftServiceabilityStatus;
  handoffServiceabilityStatus: AircraftServiceabilityStatus;
  workOrderReference: string | null;
  maintenanceNote: string | null;
  sparePartReference: string | null;
  maintenanceCost: number;
  currencyId: string;
  currencyCode: string;
  status: MaintenanceHandoffStatus;
  closureReady: boolean;
  needsAttention: boolean;
  pendingApproval: boolean;
  evidenceComplete: boolean;
  blockers: string[];
  attentionReasons: string[];
  financeCurrencyCode: string;
  financeCurrencyMismatch: boolean;
  fuelCost: number | null;
  stationCost: number | null;
  approvedMaintenanceCost: number | null;
  totalOperationalCost: number | null;
  estimatedRevenue: number | null;
  projectedGrossMargin: number | null;
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

export type FlightApprovalDto = {
  id: string;
  flightId: string;
  approvalType: FlightApprovalType;
  status: FlightApprovalStatus;
  requestedByUserId: string | null;
  assignedRole: string;
  decidedByUserId: string | null;
  requestedAt: string | null;
  decidedAt: string | null;
  reason: string | null;
  affectedSection: string | null;
  requiredCorrection: string | null;
};

export type FlightAttachmentDto = {
  id: string;
  flightId: string;
  documentType: string;
  fileName: string;
  status: 'AVAILABLE' | 'PENDING';
  uploadedAt: string | null;
};

export type FlightRequestRecord = {
  id: string;
  requestNumber: string;
  statusId: string;
  statusCode: FlightRequestStatus;
  statusLabel: string;
  status: FlightRequestStatus;
  flightDate: string;
  flightTypeId: string;
  flightTypeCode: FlightType;
  flightTypeLabel: string;
  flightType: FlightType;
  serviceTypeId: string;
  serviceTypeCode: FlightServiceType;
  serviceTypeLabel: string;
  serviceType: FlightServiceType;
  routeId: string;
  routeCode: string;
  originStationCode: string;
  destinationStationCode: string;
  customerId: string | null;
  customerName: string | null;
  aircraftId: string | null;
  aircraftRegistration: string | null;
  pilotInCommandId: string | null;
  pilotInCommandName: string | null;
  coPilotId: string | null;
  coPilotName: string | null;
  scheduledDepartureAt: string | null;
  scheduledArrivalAt: string | null;
  requestSource: string;
  priorityId: string;
  priorityCode: FlightPriority;
  priorityLabel: string;
  priority: FlightPriority;
  passengerEstimate: number;
  cargoWeightEstimateKg: number;
  cargoCategory: string | null;
  dangerousGoods: boolean;
  fuelType: string;
  requestedFuelLitre: number;
  fuelSupplierId: string | null;
  handlingSupplierId: string | null;
  parkingRequired: boolean;
  destinationHandlingRequired: boolean;
  billingType: string;
  estimatedRevenue: number | null;
  currencyCode: string;
  remarks: string | null;
  convertedFlightId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type FlightRequestOverviewDto = {
  summary: Record<FlightRequestStatus, number>;
  requests: FlightRequestRecord[];
};

export type FlightOperationDetailDto = FlightOperationRecord & {
  closureReadiness: {
    allowed: boolean;
    missing: string[];
  };
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
  approvals: FlightApprovalDto[];
  attachments: FlightAttachmentDto[];
  operationalClosureRequirements?: Array<{
    code: string;
    label: string;
    status: 'PASSED' | 'BLOCKED' | 'NOT_REQUIRED';
    required: boolean;
    satisfied: boolean;
    reason?: string;
    actionHref?: string;
  }>;
};

export type FlightOperationOverviewDto = {
  summary: Record<FlightOperationStatus, number>;
  flights: FlightOperationRecord[];
};

export type FlightOperationLookupsDto = {
  flightTypes: FlightOperationLookupOption[];
  flightServiceTypes: FlightOperationLookupOption[];
  flightPriorities: FlightOperationLookupOption[];
  flightRequestStatuses: FlightOperationLookupOption[];
  flightOperationStatuses: FlightOperationLookupOption[];
  crewAssignmentRoles: FlightOperationLookupOption[];
  flightActionTypes: FlightOperationLookupOption[];
  flightApprovalTypes: FlightOperationLookupOption[];
  flightApprovalStatuses: FlightOperationLookupOption[];
  flightAttachmentStatuses: FlightOperationLookupOption[];
  readinessStatuses: FlightOperationLookupOption[];
  manifestTypes: FlightOperationLookupOption[];
  manifestStatuses: FlightOperationLookupOption[];
  dgAcceptanceStatuses: FlightOperationLookupOption[];
  fuelWorkflowStatuses: FlightOperationLookupOption[];
  stationServiceTypes: FlightOperationLookupOption[];
  stationServiceStatuses: FlightOperationLookupOption[];
  stationCostStatuses: FlightOperationLookupOption[];
  aircraftServiceabilityStatuses: FlightOperationLookupOption[];
  maintenanceHandoffStatuses: FlightOperationLookupOption[];
  financeEventTypes: FlightOperationLookupOption[];
  financeHandoffStatuses: FlightOperationLookupOption[];
};

export type FlightRatePreviewDto = {
  matchedRateId: string | null;
  rateCode: string | null;
  serviceType: 'CHARTER' | 'PASSENGER' | 'CARGO' | null;
  bookingChannel: string | null;
  baseAmount: number;
  rateUnit: string | null;
  quantity: number;
  minimumCharge: number | null;
  estimatedTotal: number;
  currencyCode: string;
  taxCodeId: string | null;
  taxCode: string | null;
  note: string;
};

export const listFlightOperationsQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  statusId: z.string().trim().optional(),
  flightTypeId: z.string().trim().optional(),
  routeId: z.string().trim().optional(),
  originStationId: z.string().trim().optional(),
  destinationStationId: z.string().trim().optional(),
  aircraftId: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  scheduledFrom: z.string().datetime({ offset: true }).optional(),
  excludeTerminal: z.coerce.boolean().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0)
});

export const listFlightRequestsQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  statusId: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0)
});

export const flightRatePreviewQuerySchema = z.object({
  routeId: z.string().trim().min(1),
  flightTypeId: z.string().trim().optional(),
  serviceTypeId: z.string().trim().optional(),
  bookingChannel: z.enum(['COUNTER', 'AGENT', 'CORPORATE', 'CARGO', 'CHARTER']).optional(),
  passengerType: z.enum(['ADULT', 'CHILD', 'INFANT']).optional(),
  cargoPriceBasis: z.enum(['ACTUAL_WEIGHT', 'VOLUME_WEIGHT', 'CHARGEABLE_WEIGHT']).optional(),
  customerId: z.string().trim().optional(),
  aircraftType: z.string().trim().optional(),
  quantity: z.coerce.number().nonnegative().optional().default(1),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .optional()
});

export const flightPlanningContextQuerySchema = z.object({
  routeId: z.string().trim().min(1),
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  serviceTypeId: z.preprocess(blankToUndefined, z.string().trim().min(1).optional()),
  scheduledDepartureAt: z.preprocess(blankToUndefined, isoDateTimeSchema.optional()),
  scheduledArrivalAt: z.preprocess(blankToUndefined, isoDateTimeSchema.optional()),
  passengerEstimate: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().nonnegative().optional()
  ),
  cargoWeightEstimateKg: z.preprocess(blankToUndefined, z.coerce.number().nonnegative().optional())
});

export type FlightPlanningOptionDto = {
  id: string;
  label: string;
  recommended: boolean;
};

export type FlightPlanningAircraftCandidateDto = {
  id: string;
  label: string;
  registrationNumber: string;
  aircraftType: string;
  currentStationCode: string | null;
  serviceabilityStatus: string;
  available: boolean;
  warnings: string[];
  blockers: string[];
};

export type FlightPlanningCrewCandidateDto = {
  id: string;
  label: string;
  employeeCode: string;
  crewRole: string;
  baseStationCode: string | null;
  dutyStationCode: string | null;
  available: boolean;
  warnings: string[];
  blockers: string[];
};

export type FlightPlanningContextDto = {
  routeReadiness: {
    availableForScheduling: boolean;
    blockers: string[];
    warnings: string[];
  };
  scheduleTemplates: FlightPlanningOptionDto[];
  capacityProfiles: FlightPlanningOptionDto[];
  aircraftCandidates: FlightPlanningAircraftCandidateDto[];
  crewCandidates: FlightPlanningCrewCandidateDto[];
};

export const createFlightOperationBodySchema = z.object({
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  flightTypeId: referenceIdSchema,
  serviceTypeId: referenceIdSchema,
  priorityId: referenceIdSchema,
  routeId: z.string().min(1),
  customerId: nullableIdSchema,
  aircraftId: nullableIdSchema,
  pilotInCommandId: nullableIdSchema,
  coPilotId: nullableIdSchema,
  scheduledDepartureAt: nullableIsoDateTimeSchema,
  scheduledArrivalAt: nullableIsoDateTimeSchema,
  remarks: z.preprocess(blankToNull, z.string().trim().max(1000).nullable().optional())
});

export const createFlightRequestBodySchema = z.object({
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  flightTypeId: referenceIdSchema,
  serviceTypeId: referenceIdSchema,
  routeId: z.string().min(1),
  customerId: nullableIdSchema,
  aircraftId: nullableIdSchema,
  pilotInCommandId: nullableIdSchema,
  coPilotId: nullableIdSchema,
  scheduledDepartureAt: nullableIsoDateTimeSchema,
  scheduledArrivalAt: nullableIsoDateTimeSchema,
  requestSource: z.string().trim().min(1).max(100).default('Corporate Charter Request'),
  priorityId: referenceIdSchema,
  passengerEstimate: z.coerce.number().int().nonnegative().default(0),
  cargoWeightEstimateKg: z.coerce.number().nonnegative().default(0),
  cargoCategory: nullableTextSchema,
  dangerousGoods: z.coerce.boolean().default(false),
  fuelType: z.string().trim().min(1).default('AVTUR'),
  requestedFuelLitre: z.coerce.number().nonnegative().default(0),
  fuelSupplierId: nullableIdSchema,
  handlingSupplierId: nullableIdSchema,
  parkingRequired: z.coerce.boolean().default(false),
  destinationHandlingRequired: z.coerce.boolean().default(false),
  billingType: z.string().trim().min(1).default('CHARTER'),
  estimatedRevenue: nullableNonnegativeNumberSchema,
  remarks: z.preprocess(blankToNull, z.string().trim().max(1000).nullable().optional())
});

export const flightRequestIdParamsSchema = z.object({
  id: z.string().min(1)
});

export const flightApprovalDecisionBodySchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_REVISION']),
  reason: z.string().trim().max(1000).optional(),
  affectedSection: z.string().trim().max(100).optional(),
  requiredCorrection: z.string().trim().max(1000).optional()
});

export const flightOperationIdParamsSchema = z.object({
  id: z.string().min(1)
});

export const stationTaskIdParamsSchema = z.object({
  id: z.string().min(1)
});

export const startStationTaskBodySchema = z.object({
  expectedVersion: z.coerce.number().int().positive()
});

export const verifyStationTaskBodySchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  reason: z.string().trim().max(1000).optional()
});

export const rejectStationTaskBodySchema = z.object({
  rejectionReason: z.string().trim().min(1).max(1000),
  expectedVersion: z.coerce.number().int().positive()
});

export const approveStationTaskBodySchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  expectedVersion: z.coerce.number().int().positive(),
  reason: z.string().trim().max(1000).optional()
});

export const overrideStationTaskBodySchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1).max(1000),
  evidenceIds: z.array(z.string().min(1)).optional().default([])
});

export const addStationTaskEvidenceBodySchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  uploadId: z.string().trim().min(1).optional(),
  documentType: z.string().trim().optional(),
  fileName: z.string().trim().min(1),
  notes: z.string().trim().max(1000).optional()
});

export const createStationTaskBodySchema = z.object({
  stationId: z.string().trim().min(1),
  phase: z.enum(['ORIGIN_DEPARTURE', 'DESTINATION_ARRIVAL', 'DESTINATION_CLOSURE']),
  taskCode: z.string().trim().min(1),
  taskTitle: z.string().trim().min(1),
  requiresEvidence: z.literal(true).optional().default(true),
  notes: z.string().trim().max(1000).optional(),
  assignedUserId: z.string().trim().min(1).optional(),
  assignedRole: z.string().trim().min(1).optional(),
  sourceRecordType: z.string().trim().optional(),
  sourceRecordId: z.string().trim().optional()
});

export const reconcileActualsBodySchema = z
  .object({
    plannedPassengers: z.coerce.number().int().nonnegative().default(0),
    actualPassengers: z.coerce.number().int().nonnegative().default(0),
    plannedCargoKg: z.coerce.number().nonnegative().default(0),
    actualCargoKg: z.coerce.number().nonnegative().default(0),
    noShowPassengers: z.coerce.number().int().nonnegative().default(0),
    offloadedCargoKg: z.coerce.number().nonnegative().default(0),
    totalDiscrepancyNote: z.string().trim().max(1000).optional(),
    expectedVersion: z.coerce.number().int().nonnegative()
  })
  .superRefine((value, context) => {
    const differs =
      value.plannedPassengers !== value.actualPassengers ||
      value.plannedCargoKg !== value.actualCargoKg ||
      value.noShowPassengers > 0 ||
      value.offloadedCargoKg > 0;
    if (differs && !value.totalDiscrepancyNote) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['totalDiscrepancyNote'],
        message: 'A discrepancy note is required when planned and actual totals differ.'
      });
    }
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
  actualAt: isoDateTimeSchema,
  stationId: z.preprocess(blankToUndefined, z.string().trim().min(1).optional()),
  note: z.preprocess(blankToUndefined, z.string().trim().max(1000).optional())
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
  dgAcceptanceStatusId: z.preprocess(
    blankToUndefined,
    z.string().trim().min(1).default('dg-acceptance-status-not-applicable')
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
  serviceTypeId: referenceIdSchema,
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

export const stationRecordActionBodySchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1).max(1000).optional()
});

export const createMaintenanceHandoffBodySchema = z.object({
  flightId: nullableIdSchema,
  aircraftId: z.string().min(1),
  serviceabilityStatusId: referenceIdSchema,
  workOrderReference: nullableTextSchema,
  maintenanceNote: nullableTextSchema,
  sparePartReference: nullableTextSchema,
  maintenanceCost: z.preprocess(blankToUndefined, z.coerce.number().nonnegative().default(0)),
  currencyId: z.string().min(1)
});

export const listMaintenanceHandoffsQuerySchema = z.object({
  search: z.preprocess(emptyQueryValue, z.string().trim().min(1).optional()),
  date: z.preprocess(
    emptyQueryValue,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
      .refine((value) => {
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
      }, 'Expected a valid calendar date')
      .optional()
  ),
  stationId: z.preprocess(emptyQueryValue, z.string().trim().min(1).optional()),
  serviceability: z.preprocess(emptyQueryValue, aircraftServiceabilityStatusSchema.optional()),
  status: z.preprocess(emptyQueryValue, maintenanceHandoffStatusSchema.optional())
});

export type ListFlightOperationsQuery = z.infer<typeof listFlightOperationsQuerySchema>;
export type FlightPlanningContextQuery = z.infer<typeof flightPlanningContextQuerySchema>;
export type ListFlightRequestsQuery = z.infer<typeof listFlightRequestsQuerySchema>;
export type CreateFlightOperationBody = z.infer<typeof createFlightOperationBodySchema>;
export type CreateFlightRequestBody = z.infer<typeof createFlightRequestBodySchema>;
export type FlightApprovalDecisionBody = z.infer<typeof flightApprovalDecisionBodySchema>;
export type ActionNoteBody = z.infer<typeof actionNoteBodySchema>;
export type FlightReasonActionBody = z.infer<typeof flightReasonActionBodySchema>;
export type ActualTimeBody = z.infer<typeof actualTimeBodySchema>;
export type CreatePassengerBody = z.infer<typeof createPassengerBodySchema>;
export type CreateCargoBody = z.infer<typeof createCargoBodySchema>;
export type CreateFuelRequestBody = z.infer<typeof createFuelRequestBodySchema>;
export type CreateStationServiceBody = z.infer<typeof createStationServiceBodySchema>;
export type CreateStationCostBody = z.infer<typeof createStationCostBodySchema>;
export type CreateMaintenanceHandoffBody = z.infer<typeof createMaintenanceHandoffBodySchema>;
export type ListMaintenanceHandoffsQuery = z.infer<typeof listMaintenanceHandoffsQuerySchema>;
