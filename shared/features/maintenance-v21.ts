// =============================================================================
// Demo-v2.1: Operational Resource Control — Shared Types
// =============================================================================

// ----- Resource Planning Declarations -----

export type ResourcePlanningType = 'MATERIAL' | 'TOOL' | 'PERSONNEL';
export type ResourcePlanningDeclaration = 'REQUIRED' | 'NOT_REQUIRED';

export type MaintenanceResourceDeclarationDto = {
  id: string;
  workPackageId: string;
  resourceType: ResourcePlanningType;
  declaration: ResourcePlanningDeclaration;
  reason: string | null;
  evidenceDocumentId: string | null;
  declaredBy: string;
  declaredAt: string;
  updatedAt: string;
};

// ----- Material Requirement (extended) -----

export type MaterialRequirementStatus =
  'REQUESTED' | 'RESERVED' | 'ALLOCATED' | 'ISSUED' | 'NOT_REQUIRED' | 'BLOCKED';

export type MaintenanceMaterialRequirementDto = {
  id: string;
  workPackageId: string;
  jobCardId: string | null;
  partId: string | null;
  serializedPartId: string | null;
  requiredQuantity: number;
  unit: string;
  requestedStationId: string | null;
  requiredBy: string | null;
  status: MaterialRequirementStatus;
  reason: string | null;
  source: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Projected quantities
  reservedQuantity: number;
  issuedQuantity: number;
  consumedQuantity: number;
  returnedQuantity: number;
  installedQuantity: number;
  lifecycleStatus: 'REQUESTED' | 'RESERVED' | 'ISSUED' | 'INSTALLED';
  satisfied: boolean;
  // Part details
  partNumber?: string | null;
  partName?: string | null;
  partLifecycleType?: string | null;
  partTrackingType?: string | null;
  partCertificateRequired?: boolean;
};

// ----- Inventory Reservation -----

export type ReservationStatus =
  'ACTIVE' | 'PARTIALLY_ISSUED' | 'ISSUED' | 'RELEASED' | 'CANCELLED' | 'EXPIRED';

export type MaintenanceInventoryReservationDto = {
  id: string;
  reservationNumber: string;
  materialRequirementId: string;
  workPackageId: string;
  jobCardId: string | null;
  aircraftId: string;
  flightOrderId: string | null;
  inventoryItemId: string;
  partId: string;
  serializedPartId: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  stationId: string;
  inventoryLocationId: string | null;
  quantity: number;
  unit: string;
  expiryAt: string | null;
  certificateReference: string | null;
  certificateDocumentId: string | null;
  status: ReservationStatus;
  reservedBy: string;
  reservedAt: string;
  releasedBy: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  issueId?: string | null;
  issueMovementId?: string | null;
  issuedQuantity?: number;
  issuedBy?: string | null;
  issuedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceMaterialInstallationDto = {
  id: string;
  installationNumber: string;
  materialRequirementId: string;
  reservationId: string;
  issueId: string | null;
  inventoryComponentInstallationId: string | null;
  workPackageId: string;
  jobCardId: string | null;
  aircraftId: string;
  partId: string;
  serializedPartId: string | null;
  sourceWarehouseId: string | null;
  sourceBinId: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  certificateReference: string | null;
  quantity: number;
  unit: string;
  position: string | null;
  status: 'INSTALLED' | 'CANCELLED';
  installedBy: string;
  installedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceMaterialTraceabilityDto = {
  workPackageId: string;
  materialRequirementId: string;
  requirement: MaintenanceMaterialRequirementDto;
  reservations: MaintenanceInventoryReservationDto[];
  installations: MaintenanceMaterialInstallationDto[];
  traceComplete: boolean;
};

export type ReservationEventType =
  'RESERVED' | 'PARTIALLY_ISSUED' | 'ISSUED' | 'RELEASED' | 'RETURNED' | 'CANCELLED' | 'EXPIRED';

export type MaintenanceReservationEventDto = {
  id: string;
  reservationId: string;
  eventType: ReservationEventType;
  quantity: number;
  actorUserId: string;
  actorRole: string;
  reason: string | null;
  beforeSnapshot: Record<string, unknown>;
  afterSnapshot: Record<string, unknown>;
  correlationId: string | null;
  idempotencyKey: string | null;
  occurredAt: string;
  createdAt: string;
};

// ----- ATP (Available-to-Promise) -----

export type MaintenanceAtpResultDto = {
  partId: string;
  partNumber: string;
  partName: string;
  stationId: string;
  stationCode: string;
  serviceableOnHand: number;
  activeReservations: number;
  quarantinedQuantity: number;
  restrictedQuantity: number;
  availableToPromise: number;
  unit: string;
  serializedAvailability: Array<{
    serializedPartId: string;
    serialNumber: string;
    condition: string;
    available: boolean;
    reservedByPackageId: string | null;
  }>;
  evaluatedAt: string;
};

// ----- Tool Requirements -----

export type ToolRequirementStatus =
  | 'REQUIRED'
  | 'REQUESTED'
  | 'ALLOCATED'
  | 'PARTIALLY_ALLOCATED'
  | 'RETURNED'
  | 'CANCELLED'
  | 'NOT_REQUIRED';

export type MaintenanceToolRequirementDto = {
  id: string;
  workPackageId: string;
  jobCardId: string | null;
  toolMasterId: string | null;
  toolType: string | null;
  quantity: number;
  requiredStationId: string;
  requiredFrom: string;
  requiredUntil: string;
  status: ToolRequirementStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Tool details
  toolCode?: string | null;
  toolName?: string | null;
  toolSerialNumber?: string | null;
};

// ----- Enhanced Tool Allocation -----

export type ToolAllocationStatus =
  'REQUESTED' | 'ALLOCATED' | 'IN_USE' | 'RETURNED' | 'RELEASED' | 'CANCELLED';

export type MaintenanceToolAllocationV2Dto = {
  id: string;
  toolRequirementId: string | null;
  toolId: string;
  workPackageId: string;
  jobCardId: string | null;
  aircraftId: string;
  stationId: string;
  status: ToolAllocationStatus;
  allocatedBy: string;
  allocatedAt: string;
  custodianPersonnelId: string | null;
  custodyStartedAt: string | null;
  returnedBy: string | null;
  returnedAt: string | null;
  returnCondition: string | null;
  returnNote: string | null;
  createdAt: string;
  updatedAt: string;
  // Tool details
  toolCode?: string;
  toolName?: string;
  toolSerialNumber?: string | null;
  calibrationRequired?: boolean;
  calibrationExpiresAt?: string | null;
  // Custodian details
  custodianName?: string | null;
};

export type ResourceAvailabilityStatus = 'AVAILABLE' | 'NOT_AVAILABLE' | 'NOT_SCHEDULE_VALIDATED';

export type MaintenanceToolCandidateDto = {
  toolId: string;
  toolCode: string;
  toolName: string;
  serialNumber: string | null;
  status: string;
  stationId: string | null;
  calibrationRequired: boolean;
  calibrationExpiresAt: string | null;
  availabilityStatus: ResourceAvailabilityStatus;
  eligibilityStatus: 'ELIGIBLE' | 'INELIGIBLE';
  reasons: string[];
  conflictingWorkPackageId: string | null;
  conflictingAllocationId: string | null;
  scheduleValidated: boolean;
};

export type ToolAllocationEventType =
  'REQUESTED' | 'ALLOCATED' | 'CUSTODY_ASSIGNED' | 'IN_USE' | 'RETURNED' | 'RELEASED' | 'CANCELLED';

export type MaintenanceToolAllocationEventDto = {
  id: string;
  allocationId: string;
  eventType: ToolAllocationEventType;
  actorUserId: string;
  actorRole: string;
  reason: string | null;
  beforeSnapshot: Record<string, unknown>;
  afterSnapshot: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

// ----- Personnel Requirements -----

export type PersonnelRoleType = 'MECHANIC' | 'INSPECTOR' | 'CERTIFYING_STAFF';

export type PersonnelRequirementStatus =
  'REQUIRED' | 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'CANCELLED' | 'NOT_REQUIRED';

export type MaintenancePersonnelRequirementDto = {
  id: string;
  workPackageId: string;
  jobCardId: string | null;
  roleType: PersonnelRoleType;
  requiredCount: number;
  requiredLicenceType: string | null;
  requiredQualification: string | null;
  requiredAuthorization: string | null;
  aircraftType: string | null;
  dutyStationId: string;
  requiredFrom: string;
  requiredUntil: string;
  status: PersonnelRequirementStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignedCount: number;
};

// ----- Personnel Assignments -----

export type PersonnelAssignmentStatus = 'ASSIGNED' | 'CONFIRMED' | 'RELEASED' | 'CANCELLED';
export type PersonnelEligibilityStatus = 'PENDING' | 'ELIGIBLE' | 'INELIGIBLE';

export type MaintenancePersonnelAssignmentDto = {
  id: string;
  personnelRequirementId: string;
  personnelId: string;
  workPackageId: string;
  jobCardId: string | null;
  roleType: PersonnelRoleType;
  status: PersonnelAssignmentStatus;
  eligibilityStatus: PersonnelEligibilityStatus;
  eligibilitySnapshot: PersonnelEligibilitySnapshot;
  assignedBy: string;
  assignedAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Personnel details
  personnelName?: string;
  personnelCode?: string;
  licenceNumber?: string | null;
  licenceType?: string | null;
};

export type MaintenancePersonnelCandidateDto = {
  personnelId: string;
  personnelName: string;
  personnelCode: string | null;
  role: string;
  dutyStationId: string | null;
  licenceReference: string | null;
  licenceValid: boolean;
  licenceExpiry: string | null;
  authorizationReference: string | null;
  authorizationValid: boolean;
  authorizationExpiry: string | null;
  availabilityStatus: ResourceAvailabilityStatus;
  eligibilityStatus: PersonnelEligibilityStatus;
  reasons: string[];
  conflictingWorkPackageId: string | null;
  conflictingAssignmentId: string | null;
  scheduleValidated: boolean;
  snapshot: PersonnelEligibilitySnapshot;
};

export type PersonnelEligibilitySnapshot = {
  licenceReference: string | null;
  licenceValid: boolean;
  licenceExpiry: string | null;
  licenceTypeMatch: boolean;
  qualification: string | null;
  qualificationMatch: boolean;
  authorizationReference: string | null;
  authorizationValid: boolean;
  authorizationExpiry: string | null;
  aircraftTypeMatch: boolean;
  dutyStationMatch: boolean;
  availabilityResult: boolean;
  assignmentConflict: boolean;
  roleSeparationResult: boolean;
  roleSeparationDetails: string | null;
  evaluatedAt: string;
  evaluatedByVersion: string;
};

export type MaintenancePersonnelEligibilityEventDto = {
  id: string;
  assignmentId: string;
  eventType: 'EVALUATED' | 'RE_EVALUATED' | 'ELIGIBILITY_CHANGED';
  eligibilityStatus: PersonnelEligibilityStatus;
  snapshot: PersonnelEligibilitySnapshot;
  evaluatedBy: string;
  evaluatedAt: string;
  createdAt: string;
};

// ----- AMO Organizations -----

export type AmoOrganizationType = 'INTERNAL_AMO' | 'CONTRACTED_AMO' | 'VENDOR';
export type AmoOrganizationStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';

export type MaintenanceAmoOrganizationDto = {
  id: string;
  organizationCode: string;
  organizationName: string;
  organizationType: AmoOrganizationType;
  approvalReference: string;
  approvalDocumentId: string | null;
  approvalAuthority: string;
  validFrom: string;
  validUntil: string;
  status: AmoOrganizationStatus;
  fictionalDemo: boolean;
  createdAt: string;
  updatedAt: string;
  scopes: MaintenanceAmoScopeDto[];
};

// ----- AMO Scopes -----

export type AmoScopeStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';

export type MaintenanceAmoScopeDto = {
  id: string;
  amoOrganizationId: string;
  aircraftType: string;
  aircraftRegistration: string | null;
  maintenanceAction: string;
  rating: string;
  limitation: string | null;
  stationId: string | null;
  validFrom: string;
  validUntil: string;
  approvalDocumentId: string | null;
  status: AmoScopeStatus;
  fictionalDemo: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  organizationName?: string;
  organizationCode?: string;
  stationCode?: string | null;
};

// ----- Flight-MRO Links -----

export type FlightMroLinkStatus = 'ACTIVE' | 'SUPERSEDED' | 'CANCELLED';

export type MaintenanceFlightMroLinkDto = {
  id: string;
  flightOrderId: string;
  workPackageId: string;
  aircraftId: string;
  affectsServiceability: boolean;
  linkReason: string;
  status: FlightMroLinkStatus;
  linkedBy: string;
  linkedAt: string;
  unlinkedBy: string | null;
  unlinkedAt: string | null;
  unlinkReason: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  workPackageNumber?: string;
  workPackageTitle?: string;
  workPackageStatus?: string;
  flightOrderNumber?: string;
  aircraftRegistration?: string;
};

// ----- Centralized MRO Eligibility -----

export type MroEligibilityBlockerCode =
  // Material
  | 'MATERIAL_PLANNING_UNDECLARED'
  | 'MATERIAL_REQUIREMENT_INCOMPLETE'
  | 'MATERIAL_NOT_RESERVED'
  | 'MATERIAL_PARTIALLY_RESERVED'
  | 'MATERIAL_NOT_ISSUED'
  | 'MATERIAL_NOT_INSTALLED'
  | 'MATERIAL_SHORTAGE'
  | 'MATERIAL_TRACE_DOCUMENT_MISSING'
  // Tool
  | 'TOOL_PLANNING_UNDECLARED'
  | 'TOOL_REQUIREMENT_INCOMPLETE'
  | 'TOOL_NOT_ALLOCATED'
  | 'TOOL_CALIBRATION_EXPIRED'
  | 'TOOL_NOT_RETURNED'
  // Personnel
  | 'PERSONNEL_PLANNING_UNDECLARED'
  | 'PERSONNEL_REQUIREMENT_UNFULFILLED'
  | 'PERSONNEL_ASSIGNMENT_INELIGIBLE'
  // AMO
  | 'AMO_ORGANIZATION_MISSING'
  | 'AMO_SCOPE_MISSING'
  | 'AMO_SCOPE_MISMATCH'
  | 'AMO_APPROVAL_EXPIRED'
  | 'AMO_APPROVAL_DOCUMENT_MISSING'
  // Flight-MRO
  | 'FLIGHT_MRO_LINK_MISSING'
  | 'FLIGHT_AIRCRAFT_MRO_MISMATCH'
  | 'UNLINKED_SERVICEABILITY_MRO_PACKAGE'
  // Release
  | 'TECHNICAL_RELEASE_REQUIRED'
  // Existing blockers from Demo-v2
  | 'WORK'
  | 'INSPECTION'
  | 'REWORK'
  | 'AUTHORIZATION'
  | 'AMO_SCOPE'
  | 'APPROVED_DATA'
  | 'DUE_CONTROL'
  | 'MATERIAL'
  | 'TOOLING'
  | 'DEFERMENT'
  | 'AIRCRAFT_CONFIGURATION'
  | 'RECORD';

export type MroEligibilitySectionKey =
  | 'package'
  | 'approvedData'
  | 'dueControl'
  | 'material'
  | 'tools'
  | 'personnel'
  | 'amoScope'
  | 'jobCards'
  | 'inspections'
  | 'release';

export type MroEligibilityBlocker = {
  code: string;
  category: string;
  severity: 'WARNING' | 'BLOCKING';
  title: string;
  message: string;
  technicalMessage?: string;
  sourceType?: string;
  sourceId?: string;
  suggestedAction?: string;
  route?: string;
  evidence?: string;
};

export type MroEligibilitySection = {
  key: MroEligibilitySectionKey;
  label: string;
  status: 'SIAP' | 'PERLU_TINDAKAN' | 'TERBLOKIR' | 'TIDAK_DIPERLUKAN';
  blockers: MroEligibilityBlocker[];
  warnings: MroEligibilityBlocker[];
};

export type MroEligibilityResult = {
  eligible: boolean;
  evaluatedAt: string;
  workPackageId: string;
  aircraftId: string;
  flightOrderId: string | null;
  blockers: MroEligibilityBlocker[];
  warnings: MroEligibilityBlocker[];
  sections: Record<MroEligibilitySectionKey, MroEligibilitySection>;
  resourceSummary?: {
    materialRequirements: number;
    materialReserved: number;
    materialIssued: number;
    toolRequirements: number;
    toolsAllocated: number;
    toolsReturned: number;
    personnelRequirements: number;
    personnelAssigned: number;
    personnelEligible: number;
  };
};

// ----- Flight MRO Readiness -----

export type FlightMroReadinessDto = {
  flightOrderId: string;
  flightOrderNumber: string;
  aircraftId: string;
  aircraftRegistration: string;
  evaluatedAt: string;
  ready: boolean;
  linkedPackages: Array<{
    linkId: string;
    workPackageId: string;
    workPackageNumber: string;
    workPackageTitle: string;
    workPackageStatus: string;
    affectsServiceability: boolean;
    linkStatus: FlightMroLinkStatus;
    eligibility: MroEligibilityResult | null;
    hasTechnicalRelease: boolean;
    releaseNumber: string | null;
  }>;
  blockers: MroEligibilityBlocker[];
  warnings: MroEligibilityBlocker[];
  unlinkedServiceabilityPackages: Array<{
    workPackageId: string;
    workPackageNumber: string;
    workPackageTitle: string;
    workPackageStatus: string;
  }>;
  legacyHandoffStatus: string | null;
};

// ----- Simulated Accounting Events -----

export type MaintenanceSimulatedAccountingEventDto = {
  id: string;
  eventType: string;
  sourceType: string;
  sourceId: string;
  workPackageId: string;
  jobCardId: string | null;
  aircraftId: string;
  flightOrderId: string | null;
  reservationId: string | null;
  amountIdr: number;
  currencyCode: string;
  payloadJson: Record<string, unknown>;
  idempotencyKey: string | null;
  createdAt: string;
  label: 'Simulated accounting event';
};

// ----- Resource Readiness Summary -----

export type MaintenanceResourceReadinessDto = {
  workPackageId: string;
  evaluatedAt: string;
  declarations: MaintenanceResourceDeclarationDto[];
  material: {
    declared: boolean;
    declaration: ResourcePlanningDeclaration | null;
    requirements: MaintenanceMaterialRequirementDto[];
    reservations: MaintenanceInventoryReservationDto[];
    totalRequired: number;
    totalReserved: number;
    totalIssued: number;
    totalConsumed: number;
    totalReturned: number;
    ready: boolean;
    blockers: MroEligibilityBlocker[];
  };
  tools: {
    declared: boolean;
    declaration: ResourcePlanningDeclaration | null;
    requirements: MaintenanceToolRequirementDto[];
    allocations: MaintenanceToolAllocationV2Dto[];
    totalRequired: number;
    totalAllocated: number;
    totalReturned: number;
    ready: boolean;
    blockers: MroEligibilityBlocker[];
  };
  personnel: {
    declared: boolean;
    declaration: ResourcePlanningDeclaration | null;
    requirements: MaintenancePersonnelRequirementDto[];
    assignments: MaintenancePersonnelAssignmentDto[];
    totalRequired: number;
    totalAssigned: number;
    totalEligible: number;
    ready: boolean;
    blockers: MroEligibilityBlocker[];
  };
  amoScope: {
    organizationId: string | null;
    organizationName: string | null;
    scope: MaintenanceAmoScopeDto | null;
    ready: boolean;
    blockers: MroEligibilityBlocker[];
  };
};

// ----- API Input Schemas (Zod will be defined in shared/features/maintenance.ts) -----

export type DeclareResourceInput = {
  resourceType: ResourcePlanningType;
  declaration: ResourcePlanningDeclaration;
  reason?: string;
  evidenceDocumentId?: string;
};

export type CreateMaterialRequirementInput = {
  workPackageId: string;
  jobCardId?: string;
  partId?: string;
  serializedPartId?: string;
  requiredQuantity: number;
  unit: string;
  requestedStationId: string;
  requiredBy?: string;
  reason?: string;
  notes?: string;
};

export type ReserveMaterialInput = {
  materialRequirementId: string;
  inventoryItemId: string;
  serializedPartId?: string;
  lotNumber?: string;
  quantity: number;
  unit: string;
  stationId: string;
  inventoryLocationId?: string;
  certificateReference?: string;
  certificateDocumentId?: string;
  idempotencyKey: string;
};

export type IssueMaterialInput = {
  reservationId: string;
  quantity: number;
  idempotencyKey: string;
};

export type ReleaseMaterialReservationInput = {
  reservationId: string;
  reason: string;
  idempotencyKey?: string;
};

export type InstallMaterialInput = {
  reservationId: string;
  quantity: number;
  jobCardId?: string;
  position?: string;
  installedAt?: string;
  hoursAtInstall?: number;
  cyclesAtInstall?: number;
  idempotencyKey: string;
};

export type ConsumeMaterialInput = {
  reservationId: string;
  quantity: number;
  idempotencyKey: string;
};

export type ReturnMaterialInput = {
  reservationId: string;
  quantity: number;
  condition: 'SERVICEABLE' | 'UNSERVICEABLE' | 'QUARANTINE';
  reason: string;
  idempotencyKey: string;
};

export type CreateToolRequirementInput = {
  workPackageId: string;
  jobCardId?: string;
  toolMasterId?: string;
  toolType?: string;
  quantity: number;
  requiredStationId: string;
  requiredFrom: string;
  requiredUntil: string;
};

export type AllocateToolInput = {
  toolRequirementId: string;
  toolId: string;
  idempotencyKey: string;
};

export type AssignToolCustodyInput = {
  allocationId: string;
  custodianPersonnelId: string;
};

export type ReturnToolInput = {
  allocationId: string;
  returnCondition: string;
  returnNote?: string;
  idempotencyKey: string;
};

export type CreatePersonnelRequirementInput = {
  workPackageId: string;
  jobCardId?: string;
  roleType: PersonnelRoleType;
  requiredCount: number;
  requiredLicenceType?: string;
  requiredQualification?: string;
  requiredAuthorization?: string;
  aircraftType?: string;
  dutyStationId: string;
  requiredFrom: string;
  requiredUntil: string;
};

export type AssignPersonnelInput = {
  personnelRequirementId: string;
  personnelId: string;
  idempotencyKey: string;
};

export type LinkFlightMroInput = {
  flightOrderId: string;
  workPackageId: string;
  affectsServiceability: boolean;
  linkReason: string;
};

export type UnlinkFlightMroInput = {
  linkId: string;
  reason: string;
};
