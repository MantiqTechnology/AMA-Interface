/**
 * Framework-neutral ref contracts.
 * Vue Ref and ComputedRef satisfy these shapes structurally, while this domain
 * type file does not need direct imports from `vue` or `vue-router`.
 */
export interface MutableValue<T> {
  value: T;
}

export interface ReadonlyValue<T> {
  readonly value: T;
}

export interface StationOperationsRouteTarget {
  path: string;
  query: Record<string, string | number>;
}

export type FlightDirection = 'INBOUND' | 'OUTBOUND';
export type FlightStatus =
  'SCHEDULED' | 'ARRIVING' | 'LANDED' | 'DELAYED' | 'DEPARTED' | 'BOARDING';
export type ReadinessStatus = 'READY' | 'CHECK' | 'NOT_READY';
export type ServiceType = 'HANDLING' | 'PARKING';
export type ServiceStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
export type CostStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'VOID';

export interface StationOption {
  id: string;
  code: string;
  name: string;
}

export interface SelectOption {
  id: string;
  title: string;
  subtitle?: string;
}

export interface StationFlightRow {
  id: string;
  flightId: string;
  flightNumber: string;
  origin: string;
  destination: string;
  aircraftType: string;
  type: 'PSG' | 'CRG';
  direction: FlightDirection;
  scheduledTime: string;
  actualTime: string;
  status: FlightStatus;
  readiness: ReadinessStatus;
  paxOnboard: number;
  paxTotal: number;
  cargoWeightKg: number;
  needsAction: boolean;
}

export interface StationServiceRow {
  id: string;
  flightId: string;
  flightNumber: string;
  serviceType: ServiceType;
  supplierName: string;
  status: ServiceStatus;
  referenceRate?: number;
  version: number;
}

export interface StationCostRow {
  id: string;
  flightId: string | null;
  flightNumber: string | null;
  stationCode: string;
  vendorName: string | null;
  costCategoryName: string;
  description: string;
  amount: number;
  currencyCode: string;
  status: CostStatus;
  version: number;
}

export interface StationDataset {
  flights: StationFlightRow[];
  services: StationServiceRow[];
  costs: StationCostRow[];
  kpi: {
    inboundFlights: number;
    outboundFlights: number;
    flightsNeedingAction: number;
    paxCheckedIn: number;
    paxBoarded: number;
    cargoWeightKg: number;
    pendingServices: number;
    pendingCosts: number;
  };
  dailyReport: {
    flights: { total: number; onTime: number; delayed: number };
    passengers: { checkedIn: number; boarded: number; loadFactor: number };
    cargo: { totalWeightKg: number; totalVolumeM3: number; shipments: number };
    services: { requested: number; confirmed: number; completed: number };
    costs: {
      total: number;
      approvedPct: number;
      approvedAmount: number;
      positioningAmount: number;
    };
  };
  flightsByType: {
    passenger: { count: number; pct: number };
    cargo: { count: number; pct: number };
    positioning: { count: number; pct: number };
  };
  exceptions: {
    delayOver15: number;
    servicesOverdue: number;
    costOverdue: number;
    manifestIssue: number;
    techLogOpen: number;
  };
}

export interface ApiStationTask {
  id: string;
  stationId: string;
  taskCode: string;
  taskTitle: string;
  status: string;
  phase: string;
  requiresEvidence: boolean;
  notes: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  assignedTo: string | null;
  rejectionReason: string | null;
  version: number;
  evidenceCount: number;
  stationDecision: string | null;
  occDecision: string | null;
}

export interface ApiStationService {
  id: string;
  flightId: string;
  flightNumber: string;
  stationId: string;
  stationCode: string;
  serviceSupplierId: string;
  supplierName: string;
  serviceType: 'HANDLING' | 'PARKING';
  status: 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  referenceRate: number | null;
  rejectionNote: string | null;
  version: number;
}

export interface ApiStationCost {
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
  status: CostStatus;
  version: number;
}

export interface ApiAuditEntry {
  id: string;
  actorUserId: string;
  actorRole: string;
  module: string;
  action: string;
  beforeStatus: string | null;
  afterStatus: string | null;
  reason: string | null;
  timestamp: string;
}

export interface ApiStationFlight {
  id: string;
  flightId: string;
  flightNumber: string;
  flightDate: string;
  aircraftId: string;
  aircraftType: string;
  originStationId: string;
  originStationCode: string;
  destinationStationId: string;
  destinationStationCode: string;
  scheduledDepartureAt: string;
  actualDepartureAt: string | null;
  actualArrivalAt: string | null;
  currentStatus: string;
  currentStatusCode: string;
  flightTypeCode: string;
  serviceTypeCode: string;
  estimatedRevenue: number | null;
  passengerTotal: number;
  passengerActual: number;
  cargoWeightKg: number;
  dangerousGoods: boolean;
  tasks: ApiStationTask[];
  services: ApiStationService[];
  costs: ApiStationCost[];
  audit: ApiAuditEntry[];
}

export type StationTaskRow = ApiStationTask & {
  flightId: string;
  flightNumber: string;
};

export type StationAuditRow = ApiAuditEntry & {
  flightId: string;
  flightNumber: string;
};

export interface StationOperationsContext {
  selectedStationCode: MutableValue<string>;
  operationalDateModel: MutableValue<Date | null>;
  operationalDateIso: ReadonlyValue<string>;
  stationMaster: ReadonlyValue<StationOption[]>;
  stationOptions: ReadonlyValue<StationOption[]>;
  stationOptionsPending: ReadonlyValue<boolean>;
  selectedStationLabel: ReadonlyValue<string>;
  selectedStationId: ReadonlyValue<string>;
  canChangeStation: ReadonlyValue<boolean>;
  canReadAssets: ReadonlyValue<boolean>;
  lastUpdated: MutableValue<Date | null>;
  refreshing: MutableValue<boolean>;
  error: MutableValue<string>;
  actionError: MutableValue<string>;
  actionSuccess: MutableValue<string>;
  registerRefreshHandler: (handler: (() => Promise<void>) | null) => void;
  refreshCurrentPage: () => Promise<void>;
  withContext: (
    path: string,
    extraQuery?: Record<string, string | number | undefined | null>
  ) => StationOperationsRouteTarget;
}
