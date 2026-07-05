import type { DemoRole } from '../../shared/types/roles';
import type {
  AircraftRecord,
  AlertRecord,
  ApprovalRecord,
  CustomerRecord,
  FlightOrderRecord,
  FuelRequestRecord,
  FuelUpliftRecord,
  InvoiceRecord,
  MaintenanceWorkOrderRecord,
  ManifestRecord,
  PaymentRecord,
  RouteRecord,
  SerializedPartRecord,
  StationExpenseRecord,
  StationRecord,
  alerts,
  approvals,
  flightOrders,
  fuelRequests,
  fuelUplifts,
  maintenanceWorkOrders,
  payments,
  stationExpenses
} from '../db/schema';
import type { ApprovalStatus } from '../../shared/contracts/approvals';
import type { FlightStatus, RouteDto } from '../../shared/contracts/flights';

export type FlightJoinedRecord = {
  flight: FlightOrderRecord;
  customer: CustomerRecord;
  aircraft: AircraftRecord;
  route: RouteRecord;
  origin: StationRecord;
  destination: StationRecord;
  manifestCount: number;
};

export type ReferenceRepository = {
  getAircraft(id: string): Promise<AircraftRecord | null>;
  listAircraft(): Promise<AircraftRecord[]>;
  getStation(id: string): Promise<StationRecord | null>;
  listStations(): Promise<StationRecord[]>;
  getCustomer(id: string): Promise<CustomerRecord | null>;
  getRoute(id: string): Promise<RouteRecord | null>;
  getRouteDto(id: string): Promise<RouteDto | null>;
};

export type FlightRepository = {
  list(params: {
    status?: FlightStatus;
    station?: string;
    limit: number;
    offset: number;
  }): Promise<FlightJoinedRecord[]>;
  getById(id: string): Promise<FlightJoinedRecord | null>;
  listManifest(flightOrderId: string): Promise<ManifestRecord[]>;
  create(input: typeof flightOrders.$inferInsert): Promise<FlightOrderRecord>;
  updateStatus(id: string, status: FlightStatus): Promise<FlightOrderRecord | null>;
};

export type FuelRepository = {
  listRequests(params: {
    status?: string;
    limit: number;
    offset: number;
  }): Promise<FuelRequestRecord[]>;
  getRequest(id: string): Promise<FuelRequestRecord | null>;
  createRequest(input: typeof fuelRequests.$inferInsert): Promise<FuelRequestRecord>;
  updateRequestStatus(id: string, status: string): Promise<FuelRequestRecord | null>;
  createUplift(input: typeof fuelUplifts.$inferInsert): Promise<FuelUpliftRecord>;
  listUplifts(fuelRequestId: string): Promise<FuelUpliftRecord[]>;
};

export type StationExpenseRepository = {
  list(params: {
    status?: string;
    stationId?: string;
    limit: number;
    offset: number;
  }): Promise<StationExpenseRecord[]>;
  getById(id: string): Promise<StationExpenseRecord | null>;
  create(input: typeof stationExpenses.$inferInsert): Promise<StationExpenseRecord>;
  updateStatus(id: string, status: string): Promise<StationExpenseRecord | null>;
  attachReceipt(id: string, receiptPath: string): Promise<StationExpenseRecord | null>;
};

export type InvoiceRepository = {
  list(params: { status?: string; limit: number; offset: number }): Promise<InvoiceRecord[]>;
  getById(id: string): Promise<InvoiceRecord | null>;
  updateStatus(id: string, status: string): Promise<InvoiceRecord | null>;
  createPayment(input: typeof payments.$inferInsert): Promise<PaymentRecord>;
  listPayments(invoiceId: string): Promise<PaymentRecord[]>;
};

export type ApprovalRepository = {
  list(params: {
    status?: ApprovalStatus;
    roleRequired?: DemoRole;
    limit: number;
    offset: number;
  }): Promise<ApprovalRecord[]>;
  getById(id: string): Promise<ApprovalRecord | null>;
  create(input: typeof approvals.$inferInsert): Promise<ApprovalRecord>;
  decide(input: {
    id: string;
    status: ApprovalStatus;
    decidedBy: string;
    decidedAt: string;
    reason?: string;
  }): Promise<ApprovalRecord | null>;
};

export type MaintenanceRepository = {
  listWorkOrders(params: {
    status?: string;
    aircraftId?: string;
    limit: number;
    offset: number;
  }): Promise<MaintenanceWorkOrderRecord[]>;
  getWorkOrder(id: string): Promise<MaintenanceWorkOrderRecord | null>;
  createWorkOrder(
    input: typeof maintenanceWorkOrders.$inferInsert
  ): Promise<MaintenanceWorkOrderRecord>;
  closeWorkOrder(
    id: string,
    closedAt: string,
    closingNotes?: string
  ): Promise<MaintenanceWorkOrderRecord | null>;
  listPartsByWorkOrder(workOrderId: string): Promise<SerializedPartRecord[]>;
  listPartsByAircraft(aircraftId: string): Promise<SerializedPartRecord[]>;
};

export type AlertRepository = {
  listRecent(limit: number): Promise<AlertRecord[]>;
  create(input: typeof alerts.$inferInsert): Promise<AlertRecord>;
};

export type Repositories = {
  references: ReferenceRepository;
  flights: FlightRepository;
  fuel: FuelRepository;
  stationExpenses: StationExpenseRepository;
  invoices: InvoiceRepository;
  approvals: ApprovalRepository;
  maintenance: MaintenanceRepository;
  alerts: AlertRepository;
};
