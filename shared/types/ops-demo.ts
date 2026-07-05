export type RequestSource =
  | 'TICKETING_WEBSITE'
  | 'SALES_AGENT'
  | 'CORPORATE_CHARTER'
  | 'CARGO_REQUEST'
  | 'MEDEVAC'
  | 'INTERNAL_OPERATION';

export type ReadinessState = 'PASS' | 'WARNING' | 'BLOCKER' | 'NOT_REQUIRED' | 'PENDING';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

export type FlightRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PLANNING'
  | 'BLOCKED'
  | 'READY_FOR_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED_TO_FLIGHT'
  | 'CANCELLED';

export type FlightStatus =
  | 'SCHEDULED'
  | 'READY'
  | 'APPROVED'
  | 'BOARDING'
  | 'DEPARTED'
  | 'AIRBORNE'
  | 'LANDED'
  | 'CLOSED'
  | 'DELAYED'
  | 'CANCELLED';

export type TenantModuleStatus = 'ACTIVE' | 'PREVIEW' | 'PLANNED' | 'DISABLED';
export type ScopeDefault = 'ALL_STATIONS' | 'ASSIGNED_STATIONS' | 'SELF_ONLY';

export interface Station {
  id: string;
  code: string;
  name: string;
  city: string;
  timezone: string;
  type: string;
  operationalStatus: 'OPEN' | 'OPEN_WITH_LIMITATION' | 'CLOSED';
  capabilities: {
    passengerHandling: boolean;
    cargoHandling: boolean;
    medevacSupport: boolean;
    nightOperation: boolean;
    fuelTypes: string[];
    parkingCapacity: number;
  };
}

export interface Route {
  id: string;
  originStationId: string;
  destinationStationId: string;
  plannedBlockMinutes: number;
  turnaroundBufferMinutes: number;
  notes: string;
}

export interface Aircraft {
  id: string;
  registration: string;
  fleetCode: string;
  manufacturer: string;
  model: string;
  fuelType: string;
  baseStationId: string;
  currentStationId: string;
  operationalStatus: 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'AOG';
  syntheticConfiguration: {
    maxPassengers: number;
    maxPayloadKg: number;
    estimatedCruiseFuelLitersPerHour: number;
    medevacKitAvailable: boolean;
  };
  availability: {
    availableFrom: string;
    nextCommitment: string | null;
  };
  maintenance: {
    nextMaintenanceDueAt: string;
    airworthinessValidUntil: string;
    status: string;
  };
  documents: Array<{
    type: string;
    number?: string;
    validUntil: string;
    status: 'VALID' | 'EXPIRED' | 'MISSING';
  }>;
}

export interface CrewMember {
  id: string;
  employeeNo: string;
  name: string;
  role: 'PILOT' | 'FLIGHT_MECHANIC';
  baseStationId: string;
  employmentStatus: string;
  currentStatus: string;
  qualifications: Array<{
    aircraftModel: string;
    validUntil: string;
    status: 'VALID' | 'EXPIRED';
  }>;
  documents: Array<{
    type: string;
    validUntil: string;
    status: 'VALID' | 'EXPIRED';
  }>;
  flightDuty: {
    dutyStartedAt: string;
    dutyLimitMinutes: number;
    elapsedMinutes: number;
    remainingMinutes: number;
    status: string;
  };
}

export interface Booking {
  id: string;
  bookingCode: string;
  source: RequestSource;
  customerType: string;
  customerName: string;
  status: string;
  routeId: string;
  requestedDepartureAt: string;
  passengerCount: number;
  cargoWeightKg: number;
  specialRequirements: string[];
  paymentStatus: string;
  createdAt: string;
}

export interface FlightRequest {
  id: string;
  requestNumber: string;
  source: RequestSource;
  requestType: string;
  title: string;
  status: FlightRequestStatus;
  priority: 'NORMAL' | 'HIGH' | 'CRITICAL';
  routeId: string;
  plannedDepartureAt: string;
  plannedArrivalAt: string;
  linkedBookingIds: string[];
  requestedAircraftId?: string | null;
  assignedAircraftId?: string | null;
  assignedCrewIds: string[];
  load: {
    passengerCount: number;
    cargoWeightKg: number;
    estimatedOperationalPayloadKg: number;
  };
  fuelPlan: {
    fuelType: 'AVTUR' | 'AVGAS';
    requiredLiters: number;
    upliftStationId: string;
    confirmationId?: string | null;
  };
  handlingPlan: {
    originHandlingId?: string | null;
    destinationHandlingId?: string | null;
  };
  createdByUserId: string;
  createdAt: string;
  notes?: string | null;
}

export interface FuelConfirmation {
  id: string;
  flightRequestId: string;
  provider: string;
  providerReference: string;
  stationId: string;
  fuelType: 'AVTUR' | 'AVGAS';
  requestedLiters: number;
  confirmedLiters: number;
  status: 'REQUESTED' | 'PARTIALLY_CONFIRMED' | 'CONFIRMED' | 'REJECTED';
  requestedAt: string;
  confirmedAt: string | null;
  validUntil: string;
  remarks: string;
}

export interface HandlingConfirmation {
  id: string;
  flightRequestId: string;
  stationId: string;
  provider: string;
  providerReference: string;
  serviceType: string[];
  status: 'REQUESTED' | 'CONFIRMED' | 'REJECTED';
  parkingBay: string | null;
  handlingWindowStart: string;
  handlingWindowEnd: string;
  remarks: string;
}

export interface ReadinessItem {
  code: string;
  label: string;
  state: ReadinessState;
  severity: Severity;
  message: string;
}

export interface ReadinessCheck {
  id: string;
  flightRequestId: string;
  overallState: ReadinessState;
  overallDecision: 'READY_FOR_APPROVAL' | 'BLOCKED' | 'CONVERTED_TO_FLIGHT';
  checkedAt: string;
  items: ReadinessItem[];
}

export interface Approval {
  id: string;
  flightRequestId: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  requestedByUserId: string;
  assignedApproverUserId: string;
  decisionAt: string | null;
  decisionByUserId: string | null;
  remarks: string | null;
}

export interface FlightTimelineItem {
  at: string;
  event: string;
  actor: string;
  note: string;
}

export interface Flight {
  id: string;
  flightNumber: string;
  flightRequestId: string | null;
  status: FlightStatus;
  routeId: string;
  aircraftId: string;
  crewIds: string[];
  plannedDepartureAt: string;
  plannedArrivalAt: string;
  actualDepartureAt: string | null;
  actualArrivalAt: string | null;
  lastStatusAt: string;
  currentPositionText: string;
  delay: {
    isDelayed: boolean;
    minutes: number;
    reasonCode: string | null;
    reasonText: string | null;
  };
  manifestSummary: {
    passengerCount: number;
    cargoWeightKg: number;
  };
  closure?: {
    closedByUserId: string;
    closedAt: string;
    fuelUsedLiters: number;
    delayMinutes: number;
    incidentReported: boolean;
    operationalRemark: string;
    financeHandoffStatus: string;
    maintenanceHandoffStatus: string;
  };
  timeline: FlightTimelineItem[];
}

export interface Alert {
  id: string;
  severity: Severity;
  scopeType: 'FLIGHT_REQUEST' | 'FLIGHT';
  scopeId: string;
  title: string;
  message: string;
  actionLabel: string;
  createdAt: string;
  isRead: boolean;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  scopeDefault: ScopeDefault;
  isSystemRole: boolean;
  permissionIds: string[];
}

export interface AppUser {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  roleIds: string[];
  stationScopeIds: string[];
  selfCrewId?: string;
  defaultModuleKey: string;
  demoPersona: string;
}

export interface ModuleCatalogItem {
  key: string;
  name: string;
  category: string;
  status: TenantModuleStatus;
  description: string;
  demoNavigation: string[];
  isMandatory: boolean;
  phase: string;
}

export interface TenantModule {
  id: string;
  tenantId: string;
  moduleKey: string;
  status: TenantModuleStatus;
  enabledAt: string | null;
  config: Record<string, boolean | number | string>;
}

export interface PermissionCatalogItem {
  id: string;
  moduleKey: string;
  resource: string;
  action: string;
  description: string;
}

export interface DemoDatabase {
  meta: {
    appName: string;
    version: string;
    demoDate: string;
    timezone: string;
    mode: string;
    disclaimer: string;
    tenantId: string;
    rbacNote: string;
  };
  roles: Role[];
  appUsers: AppUser[];
  stations: Station[];
  routes: Route[];
  aircraft: Aircraft[];
  crew: CrewMember[];
  bookings: Booking[];
  flightRequests: FlightRequest[];
  fuelConfirmations: FuelConfirmation[];
  handlingConfirmations: HandlingConfirmation[];
  readinessChecks: ReadinessCheck[];
  approvals: Approval[];
  flights: Flight[];
  alerts: Alert[];
  auditEvents: AuditEvent[];
  moduleCatalog: ModuleCatalogItem[];
  tenantModules: TenantModule[];
  permissionCatalog: PermissionCatalogItem[];
  accessControl: {
    flightTransitionMatrix: Partial<Record<FlightStatus, FlightStatus[]>>;
  };
}
