import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';
import type {
  ActionNoteBody,
  ActualTimeBody,
  CreateCargoBody,
  CreateFlightOperationBody,
  CreateFlightRequestBody,
  CreateFuelRequestBody,
  CreateMaintenanceHandoffBody,
  CreatePassengerBody,
  CreateStationCostBody,
  CreateStationServiceBody,
  FlightFinanceHandoffDto,
  FlightApprovalDecisionBody,
  FlightApprovalDto,
  FlightAttachmentDto,
  FlightFuelRequestDto,
  FlightMaintenanceHandoffDto,
  FlightManifestCargoDto,
  FlightManifestDto,
  FlightOperationDetailDto,
  FlightOperationLookupsDto,
  FlightOperationOverviewDto,
  FlightOperationRecord,
  FlightOperationStatus,
  FlightPlanningContextDto,
  FlightPlanningContextQuery,
  FlightRatePreviewDto,
  FlightReadinessCheckDto,
  FlightRequestOverviewDto,
  FlightRequestRecord,
  FlightRequestStatus,
  FlightReasonActionBody,
  FlightStationCostDto,
  FlightStationServiceDto,
  ListMaintenanceHandoffsQuery,
  FlightStatusHistoryDto,
  ListFlightOperationsQuery,
  ListFlightRequestsQuery
} from '../../shared/contracts/flight-operations';
import { flightOperationStatuses } from '../../shared/contracts/flight-operations';
import { getReadinessClassification } from '../../shared/constants/readiness-classifications';
import { DomainError, notFound } from '../utils/errors';
import { getApplicationNow } from '../utils/time';
import { createAccountingService } from '../features/finance/accounting';
import { createInvoiceService } from '../features/finance/invoices';
import type { RoutesService } from '../features/operations/routes/service';

type SqlValue = string | number | boolean | null;
type SqlRow = Record<string, SqlValue>;
type ClosureEvidence = Pick<
  FlightOperationRecord,
  | 'id'
  | 'currentStatus'
  | 'actualDepartureAt'
  | 'actualArrivalAt'
  | 'aircraftId'
  | 'customerId'
  | 'estimatedRevenue'
> & {
  manifests: FlightManifestDto[];
  fuelRequests: FlightFuelRequestDto[];
  stationCosts: FlightStationCostDto[];
  maintenanceHandoffs: FlightMaintenanceHandoffDto[];
};

type MaintenanceHandoffQuery = ListMaintenanceHandoffsQuery & { flightId?: string };

const readinessDefinitions = [
  ['ROUTE_AVAILABILITY', 'Route availability'],
  ['AIRCRAFT_SERVICEABILITY', 'Aircraft serviceability'],
  ['AIRCRAFT_LOCATION', 'Aircraft location'],
  ['AIRCRAFT_SCHEDULE', 'Aircraft schedule availability'],
  ['AIRCRAFT_CAPACITY', 'Aircraft capacity'],
  ['CREW_AVAILABILITY', 'Crew availability'],
  ['CREW_LICENSE_MEDICAL', 'Crew license and medical'],
  ['MANIFEST_APPROVED', 'Manifest approved'],
  ['DG_ACCEPTANCE', 'Dangerous goods acceptance'],
  ['FUEL_CONFIRMED', 'Fuel confirmed'],
  ['HANDLING_CONFIRMED', 'Handling confirmed'],
  ['FINANCE_INITIALIZED', 'Finance tracking initialized'],
  ['REQUIRED_DOCUMENTS', 'Required documents'],
  ['SEPARATION_OF_DUTIES', 'Separation of duties']
] as const;

const normalTransitions: Partial<Record<FlightOperationStatus, FlightOperationStatus[]>> = {
  DRAFT: ['PENDING_READINESS'],
  PENDING_READINESS: ['BLOCKED', 'READY_FOR_APPROVAL'],
  BLOCKED: ['READY_FOR_APPROVAL'],
  READY_FOR_APPROVAL: ['APPROVED'],
  APPROVED: ['SCHEDULED'],
  SCHEDULED: ['CHECK_IN_OPEN'],
  CHECK_IN_OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['LANDED', 'DIVERTED'],
  LANDED: ['PENDING_CLOSURE'],
  PENDING_CLOSURE: ['CLOSED'],
  CLOSED: ['REOPENED_FOR_CORRECTION'],
  REOPENED_FOR_CORRECTION: ['PENDING_CLOSURE'],
  DIVERTED: ['PENDING_CLOSURE']
};

function bool(value: SqlValue) {
  return Boolean(value);
}

function str(value: SqlValue) {
  return typeof value === 'string' ? value : null;
}

function num(value: SqlValue) {
  return typeof value === 'number' ? value : 0;
}

function nullableNum(value: SqlValue) {
  return typeof value === 'number' ? value : null;
}

function stringArray(value: SqlValue) {
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function crewUnavailableForExistingAssignment(status: string | null) {
  return !status || !['AVAILABLE', 'ON_DUTY'].includes(status);
}

function isApprovedMaintenanceStatus(status: string) {
  return status === 'APPROVED' || status === 'POSTED';
}

function maintenanceIsDue(
  nextMaintenanceDueAt: string | null,
  scheduledDepartureAt: string | null
) {
  if (!nextMaintenanceDueAt || !scheduledDepartureAt) return false;
  return nextMaintenanceDueAt.slice(0, 10) <= scheduledDepartureAt.slice(0, 10);
}

function maintenanceBlockers(row: {
  serviceabilityStatus: string;
  status: string;
  workOrderReference: string | null;
  aircraftNextMaintenanceDueAt: string | null;
  scheduledDepartureAt: string | null;
}) {
  const blockers: string[] = [];
  if (!isApprovedMaintenanceStatus(row.status)) {
    blockers.push(
      row.status === 'REJECTED'
        ? 'Maintenance review was rejected'
        : 'Maintenance approval is missing'
    );
  }
  if (row.serviceabilityStatus === 'UNSERVICEABLE') {
    blockers.push('Aircraft is currently unserviceable');
  }
  if (
    row.serviceabilityStatus === 'MAINTENANCE_DUE' ||
    maintenanceIsDue(row.aircraftNextMaintenanceDueAt, row.scheduledDepartureAt)
  ) {
    blockers.push('Maintenance is due before scheduled departure');
  }
  if (!row.workOrderReference) {
    blockers.push('Work order evidence has not been recorded');
  }
  return blockers;
}

function timestamp() {
  return getApplicationNow();
}

function parseMetadata(value: SqlValue): Record<string, unknown> | null {
  if (typeof value !== 'string' || !value) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function mapFlight(row: SqlRow): FlightOperationRecord {
  const required = Number(row.required_checks ?? 0);
  const passed = Number(row.pass_checks ?? 0);
  const notApplicable = Number(row.na_checks ?? 0);
  const readinessPercent =
    required > 0 ? Math.round(((passed + notApplicable) / required) * 100) : 0;

  return {
    id: String(row.id),
    orderNumber: String(row.order_number || `FO-${String(row.flight_number).replace('AMA-', '')}`),
    flightRequestId: str(row.flight_request_id),
    requestNumber: str(row.request_number),
    flightNumber: String(row.flight_number),
    flightDate: String(row.flight_date),
    flightTypeId: String(row.flight_type_id),
    flightTypeCode: String(
      row.flight_type_code ?? row.flight_type
    ) as FlightOperationRecord['flightTypeCode'],
    flightTypeLabel: String(row.flight_type_label ?? row.flight_type_code ?? row.flight_type),
    flightType: String(
      row.flight_type_code ?? row.flight_type
    ) as FlightOperationRecord['flightType'],
    serviceTypeId: String(row.service_type_id),
    serviceTypeCode: String(
      row.service_type_code ?? row.service_type ?? 'CHARTER_CARGO'
    ) as FlightOperationRecord['serviceTypeCode'],
    serviceTypeLabel: String(row.service_type_label ?? row.service_type_code ?? row.service_type),
    serviceType: String(
      row.service_type_code ?? row.service_type ?? 'CHARTER_CARGO'
    ) as FlightOperationRecord['serviceType'],
    requestSource: String(row.request_source ?? 'Corporate Charter Request'),
    priorityId: String(row.priority_id),
    priorityCode: String(
      row.priority_code ?? row.priority ?? 'NORMAL'
    ) as FlightOperationRecord['priorityCode'],
    priorityLabel: String(row.priority_label ?? row.priority_code ?? row.priority ?? 'NORMAL'),
    priority: String(
      row.priority_code ?? row.priority ?? 'NORMAL'
    ) as FlightOperationRecord['priority'],
    routeId: String(row.route_id),
    routeCode: String(row.route_code ?? '-'),
    originStationId: String(row.origin_station_id),
    originStationCode: String(row.origin_station_code ?? '-'),
    destinationStationId: String(row.destination_station_id),
    destinationStationCode: String(row.destination_station_code ?? '-'),
    customerId: str(row.customer_id),
    customerName: str(row.customer_name),
    aircraftId: str(row.aircraft_id),
    aircraftRegistration: str(row.aircraft_registration),
    aircraftServiceability: str(row.aircraft_serviceability),
    aircraftCurrentStationCode: str(row.aircraft_current_station_code),
    aircraftNextMaintenanceDueAt: str(row.aircraft_next_maintenance_due_at),
    pilotInCommandId: str(row.pilot_in_command_id),
    pilotInCommandName: str(row.pic_name),
    pilotInCommandAvailabilityStatus: str(row.pic_availability_status),
    coPilotId: str(row.co_pilot_id),
    coPilotName: str(row.copilot_name),
    coPilotAvailabilityStatus: str(row.copilot_availability_status),
    scheduledDepartureAt: str(row.scheduled_departure_at),
    scheduledArrivalAt: str(row.scheduled_arrival_at),
    actualDepartureAt: str(row.actual_departure_at),
    actualDepartureStationId: str(row.actual_departure_station_id),
    actualDepartureStationCode: str(row.actual_departure_station_code),
    actualArrivalAt: str(row.actual_arrival_at),
    actualArrivalStationId: str(row.actual_arrival_station_id),
    actualArrivalStationCode: str(row.actual_arrival_station_code),
    currentStatusId: String(row.current_status_id),
    currentStatusCode: String(
      row.current_status_code ?? row.current_status
    ) as FlightOperationStatus,
    currentStatusLabel: String(
      row.current_status_label ?? row.current_status_code ?? row.current_status
    ),
    currentStatus: String(row.current_status_code ?? row.current_status) as FlightOperationStatus,
    createdByUserId: str(row.created_by_user_id),
    approvedByUserId: str(row.approved_by_user_id),
    remarks: str(row.remarks),
    billingType: String(row.billing_type ?? 'CHARTER'),
    estimatedRevenue: nullableNum(row.estimated_revenue),
    currencyCode: String(row.currency_code ?? 'IDR'),
    isLocked: bool(row.is_locked),
    readinessPercent,
    readinessSummary: `${passed + notApplicable}/${required || readinessDefinitions.length} ready`,
    blockingReason: str(row.blocking_reason),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapRequest(row: SqlRow): FlightRequestRecord {
  return {
    id: String(row.id),
    requestNumber: String(row.request_number),
    statusId: String(row.status_id),
    statusCode: String(row.status_code ?? row.status) as FlightRequestStatus,
    statusLabel: String(row.status_label ?? row.status_code ?? row.status),
    status: String(row.status_code ?? row.status) as FlightRequestStatus,
    flightDate: String(row.flight_date),
    flightTypeId: String(row.flight_type_id),
    flightTypeCode: String(
      row.flight_type_code ?? row.flight_type
    ) as FlightRequestRecord['flightTypeCode'],
    flightTypeLabel: String(row.flight_type_label ?? row.flight_type_code ?? row.flight_type),
    flightType: String(
      row.flight_type_code ?? row.flight_type
    ) as FlightRequestRecord['flightType'],
    serviceTypeId: String(row.service_type_id),
    serviceTypeCode: String(
      row.service_type_code ?? row.service_type
    ) as FlightRequestRecord['serviceTypeCode'],
    serviceTypeLabel: String(row.service_type_label ?? row.service_type_code ?? row.service_type),
    serviceType: String(
      row.service_type_code ?? row.service_type
    ) as FlightRequestRecord['serviceType'],
    routeId: String(row.route_id),
    routeCode: String(row.route_code),
    originStationCode: String(row.origin_station_code),
    destinationStationCode: String(row.destination_station_code),
    customerId: str(row.customer_id),
    customerName: str(row.customer_name),
    aircraftId: str(row.aircraft_id),
    aircraftRegistration: str(row.aircraft_registration),
    pilotInCommandId: str(row.pilot_in_command_id),
    pilotInCommandName: str(row.pic_name),
    coPilotId: str(row.co_pilot_id),
    coPilotName: str(row.copilot_name),
    scheduledDepartureAt: str(row.scheduled_departure_at),
    scheduledArrivalAt: str(row.scheduled_arrival_at),
    requestSource: String(row.request_source),
    priorityId: String(row.priority_id),
    priorityCode: String(row.priority_code ?? row.priority) as FlightRequestRecord['priorityCode'],
    priorityLabel: String(row.priority_label ?? row.priority_code ?? row.priority),
    priority: String(row.priority_code ?? row.priority) as FlightRequestRecord['priority'],
    passengerEstimate: num(row.passenger_estimate),
    cargoWeightEstimateKg: num(row.cargo_weight_estimate_kg),
    cargoCategory: str(row.cargo_category),
    dangerousGoods: bool(row.dangerous_goods),
    fuelType: String(row.fuel_type),
    requestedFuelLitre: num(row.requested_fuel_litre),
    fuelSupplierId: str(row.fuel_supplier_id),
    handlingSupplierId: str(row.handling_supplier_id),
    parkingRequired: bool(row.parking_required),
    destinationHandlingRequired: bool(row.destination_handling_required),
    billingType: String(row.billing_type),
    estimatedRevenue: nullableNum(row.estimated_revenue),
    currencyCode: String(row.currency_code),
    remarks: str(row.remarks),
    convertedFlightId: str(row.converted_flight_id),
    createdByUserId: String(row.created_by_user_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function actionTypeForStatus(status: FlightOperationStatus) {
  const actions: Partial<Record<FlightOperationStatus, string>> = {
    APPROVED: 'APPROVE',
    SCHEDULED: 'SCHEDULE',
    CHECK_IN_OPEN: 'OPEN_CHECK_IN',
    IN_PROGRESS: 'DEPART',
    LANDED: 'LAND',
    PENDING_CLOSURE: 'MARK_PENDING_CLOSURE',
    CLOSED: 'CLOSE',
    CANCELLED: 'CANCEL',
    DIVERTED: 'DIVERT',
    REOPENED_FOR_CORRECTION: 'REOPEN'
  };
  return actions[status] ?? 'READINESS_EVALUATED';
}

function readinessPresentation(code: string, status: string) {
  const config: Record<
    string,
    {
      category: FlightReadinessCheckDto['category'];
      ownerRole: string;
      recommendedAction: string;
      actionHref: string | null;
    }
  > = {
    ROUTE_AVAILABILITY: {
      category: 'AIRCRAFT',
      ownerRole: 'OCC Staff',
      recommendedAction: 'Resolve the route restriction before dispatch.',
      actionHref: '/master-data/routes'
    },
    AIRCRAFT_SERVICEABILITY: {
      category: 'AIRCRAFT',
      ownerRole: 'Maintenance Reviewer',
      recommendedAction: 'Review aircraft serviceability and maintenance restrictions.',
      actionHref: '/flights/maintenance'
    },
    AIRCRAFT_LOCATION: {
      category: 'AIRCRAFT',
      ownerRole: 'Flight Coordinator',
      recommendedAction: 'Assign an aircraft at the departure station.',
      actionHref: null
    },
    AIRCRAFT_SCHEDULE: {
      category: 'AIRCRAFT',
      ownerRole: 'Flight Coordinator',
      recommendedAction: 'Resolve the overlapping aircraft assignment.',
      actionHref: '/ops/flight-following'
    },
    AIRCRAFT_CAPACITY: {
      category: 'AIRCRAFT',
      ownerRole: 'OCC Staff',
      recommendedAction: 'Reduce load or assign an aircraft with sufficient capacity.',
      actionHref: '/flights/manifest'
    },
    CREW_AVAILABILITY: {
      category: 'CREW',
      ownerRole: 'Chief Pilot',
      recommendedAction: 'Resolve schedule conflict or assign an available crew member.',
      actionHref: null
    },
    CREW_LICENSE_MEDICAL: {
      category: 'CREW',
      ownerRole: 'Chief Pilot',
      recommendedAction: 'Assign crew with valid licence and medical documents.',
      actionHref: null
    },
    MANIFEST_APPROVED: {
      category: 'MANIFEST',
      ownerRole: 'Loadmaster',
      recommendedAction: 'Complete and approve passenger and cargo manifests.',
      actionHref: '/flights/manifest'
    },
    DG_ACCEPTANCE: {
      category: 'MANIFEST',
      ownerRole: 'Operation Manager',
      recommendedAction: 'Complete Dangerous Goods acceptance review.',
      actionHref: '/flights/manifest'
    },
    FUEL_CONFIRMED: {
      category: 'FUEL',
      ownerRole: 'Station Admin',
      recommendedAction: 'Confirm the supplier and approved fuel quantity.',
      actionHref: '/flights/fuel'
    },
    HANDLING_CONFIRMED: {
      category: 'STATION',
      ownerRole: 'Station Admin',
      recommendedAction: 'Confirm required departure and destination station services.',
      actionHref: '/flights/station-operations'
    },
    FINANCE_INITIALIZED: {
      category: 'FINANCE',
      ownerRole: 'Finance Reviewer',
      recommendedAction: 'Confirm customer, billing type, and revenue estimate.',
      actionHref: null
    },
    REQUIRED_DOCUMENTS: {
      category: 'DOCUMENTS',
      ownerRole: 'OCC Staff',
      recommendedAction: 'Upload the missing operational evidence.',
      actionHref: null
    },
    SEPARATION_OF_DUTIES: {
      category: 'FINANCE',
      ownerRole: 'Operation Manager',
      recommendedAction: 'Assign a different authorized approver.',
      actionHref: null
    }
  };
  const selected = config[code] ?? {
    category: 'DOCUMENTS' as const,
    ownerRole: 'OCC Staff',
    recommendedAction: 'Review the affected operational data.',
    actionHref: null
  };
  return {
    ...selected,
    severity:
      status === 'FAIL'
        ? ('DANGER' as const)
        : status === 'PENDING'
          ? ('WARNING' as const)
          : status === 'PASS'
            ? ('SUCCESS' as const)
            : ('NEUTRAL' as const),
    blocking: status === 'FAIL' || status === 'PENDING'
  };
}

export class FlightOperationsService {
  constructor(
    protected readonly sqlite: Database.Database,
    private readonly routesService?: RoutesService
  ) {}

  list(query: ListFlightOperationsQuery): FlightOperationOverviewDto {
    const rows = this.queryFlights(query);
    const summary = Object.fromEntries(
      flightOperationStatuses.map((status) => [status, 0])
    ) as Record<FlightOperationStatus, number>;

    const summaryRows = this.sqlite
      .prepare(
        `SELECT status.code as current_status, COUNT(*) as count
         FROM flight_operations f
         JOIN flight_operation_statuses status ON status.id = f.current_status_id
         GROUP BY status.code`
      )
      .all() as SqlRow[];

    for (const row of summaryRows) {
      const status = String(row.current_status) as FlightOperationStatus;
      if (status in summary) summary[status] = Number(row.count);
    }

    return {
      summary,
      flights: rows.map(mapFlight)
    };
  }

  detail(id: string): FlightOperationDetailDto {
    const row = this.queryFlightById(id);
    if (!row) throw notFound('Flight', id);
    const flight = mapFlight(row);
    const manifests = this.listManifests(id);
    const fuelRequests = this.listFuel({ flightId: id });
    const stationCosts = this.listStationCosts({ flightId: id });
    const maintenanceHandoffs = this.listMaintenance({ flightId: id });

    return {
      ...flight,
      closureReadiness: this.closureReadiness({
        ...flight,
        manifests,
        fuelRequests,
        stationCosts,
        maintenanceHandoffs
      }),
      crewAssignments: (
        this.sqlite
          .prepare(
            `SELECT a.*, c.full_name, c.employee_code, c.crew_role, c.license_expiry_date,
                c.medical_expiry_date, c.availability_status, c.readiness_note,
                role.code as assignment_role,
                base_station.station_code as base_station_code,
                duty_station.station_code as duty_station_code
         FROM flight_crew_assignments a
         JOIN crews c ON c.id = a.crew_id
         JOIN crew_assignment_roles role ON role.id = a.assignment_role_id
         LEFT JOIN stations base_station ON base_station.id = c.base_station_id
         LEFT JOIN stations duty_station ON duty_station.id = c.duty_station_id
         WHERE a.flight_id = ?
         ORDER BY role.sort_order, c.full_name`
          )
          .all(id) as SqlRow[]
      ).map((item) => {
        const masterAvailabilityStatus = str(item.availability_status);
        const dutyStationCode = str(item.duty_station_code);
        const baseStationCode = str(item.base_station_code);
        const isUnavailable = crewUnavailableForExistingAssignment(masterAvailabilityStatus);
        const dutyStationMismatch =
          Boolean(dutyStationCode) && dutyStationCode !== flight.originStationCode;
        const baseStationMismatch =
          Boolean(baseStationCode) && baseStationCode !== flight.originStationCode;

        return {
          id: String(item.id),
          flightId: String(item.flight_id),
          crewId: String(item.crew_id),
          crewName: String(item.full_name),
          employeeCode: String(item.employee_code),
          assignmentRole: String(
            item.assignment_role
          ) as FlightOperationDetailDto['crewAssignments'][number]['assignmentRole'],
          isPrimary: bool(item.is_primary),
          licenseExpiryDate: str(item.license_expiry_date),
          medicalExpiryDate: str(item.medical_expiry_date),
          baseStationCode,
          dutyStationCode,
          masterAvailabilityStatus,
          readinessNote: str(item.readiness_note),
          availabilityStatus: isUnavailable
            ? 'BLOCKED'
            : dutyStationMismatch || baseStationMismatch
              ? 'WARNING'
              : 'READY',
          conflictNote: isUnavailable
            ? `Crew availability is ${masterAvailabilityStatus}.`
            : dutyStationMismatch
              ? `Crew duty station is ${dutyStationCode}; positioning review required.`
              : baseStationMismatch
                ? `Crew is based at ${baseStationCode}; positioning review required.`
                : null
        };
      }),
      readinessChecks: (
        this.sqlite
          .prepare(
            `SELECT c.*, status.code as status
             FROM flight_readiness_checks c
             JOIN readiness_statuses status ON status.id = c.status_id
             WHERE c.flight_id = ? ORDER BY c.check_code`
          )
          .all(id) as SqlRow[]
      ).map((item) => {
        const status = String(
          item.status
        ) as FlightOperationDetailDto['readinessChecks'][number]['status'];
        const presentation = readinessPresentation(String(item.check_code), status);
        const sourceIds = stringArray(item.source_record_ids);
        const actionHref = presentation.actionHref
          ? `${presentation.actionHref}?flightId=${encodeURIComponent(id)}&checkCode=${encodeURIComponent(String(item.check_code))}${
              sourceIds[0] ? `&sourceRecordId=${encodeURIComponent(sourceIds[0])}` : ''
            }&returnUrl=${encodeURIComponent(`/flights/${id}`)}`
          : null;
        return {
          id: String(item.id),
          flightId: String(item.flight_id),
          checkCode: String(item.check_code),
          checkName: String(item.check_name),
          status,
          isRequired: bool(item.is_required),
          evaluatedAt: str(item.evaluated_at),
          evaluatedByUserId: str(item.evaluated_by_user_id),
          resultNote: str(item.result_note),
          sourceReference: str(item.source_reference),
          classification:
            (str(item.classification) as FlightReadinessCheckDto['classification']) ??
            'SYSTEM_CHECK',
          calculationStatus:
            (str(item.calculation_status) as FlightReadinessCheckDto['calculationStatus']) ??
            (status === 'PASS'
              ? 'PASS'
              : status === 'FAIL'
                ? 'FAIL'
                : status === 'NOT_APPLICABLE'
                  ? 'NOT_APPLICABLE'
                  : 'UNKNOWN'),
          verificationStatus:
            (str(item.verification_status) as FlightReadinessCheckDto['verificationStatus']) ??
            'NOT_REQUIRED',
          effectiveStatus:
            (str(item.effective_status) as FlightReadinessCheckDto['effectiveStatus']) ??
            (status === 'PASS'
              ? 'PASSED'
              : status === 'NOT_APPLICABLE'
                ? 'NOT_APPLICABLE'
                : 'BLOCKED'),
          calculatedAt: str(item.calculated_at) ?? str(item.evaluated_at),
          expiresAt: str(item.expiry_at),
          invalidationReason: str(item.invalidation_reason),
          sourceRecordIds: sourceIds,
          ...presentation,
          actionHref
        };
      }),
      histories: (
        this.sqlite
          .prepare(
            `SELECT h.*, from_status.code as from_status, to_status.code as to_status,
                action.code as action_type, r.reason_code, r.description
         FROM flight_status_histories h
         LEFT JOIN flight_operation_statuses from_status ON from_status.id = h.from_status_id
         JOIN flight_operation_statuses to_status ON to_status.id = h.to_status_id
         JOIN flight_action_types action ON action.id = h.action_type_id
         LEFT JOIN flight_reasons r ON r.id = h.reason_id
         WHERE h.flight_id = ?
         ORDER BY h.changed_at DESC`
          )
          .all(id) as SqlRow[]
      ).map((item): FlightStatusHistoryDto => ({
        id: String(item.id),
        flightId: String(item.flight_id),
        fromStatus: str(item.from_status) as FlightOperationStatus | null,
        toStatus: String(item.to_status) as FlightOperationStatus,
        actionType: String(item.action_type) as FlightStatusHistoryDto['actionType'],
        reasonId: str(item.reason_id),
        reasonLabel: str(item.reason_code) ?? str(item.description),
        reasonNote: str(item.reason_note),
        changedByUserId: str(item.changed_by_user_id),
        changedAt: String(item.changed_at),
        metadata: parseMetadata(item.metadata_json)
      })),
      manifests,
      passengers: this.listPassengers(id),
      cargoItems: this.listCargo(id),
      fuelRequests,
      stationServices: this.listStationServices({ flightId: id }),
      stationCosts,
      maintenanceHandoffs,
      financeHandoffs: this.listFinanceHandoffs(id),
      approvals: this.listFlightApprovals(id),
      attachments: this.listFlightAttachments(id)
    };
  }

  routeStationCodes(routeId: string) {
    const row = this.requireRow(
      `SELECT origin.station_code as origin_station_code,
              destination.station_code as destination_station_code
       FROM routes route
       JOIN stations origin ON origin.id = route.origin_station_id
       JOIN stations destination ON destination.id = route.destination_station_id
       WHERE route.id = ?`,
      routeId,
      'Route'
    );
    return {
      originStationCode: String(row.origin_station_code),
      destinationStationCode: String(row.destination_station_code)
    };
  }

  lookups(): FlightOperationLookupsDto {
    return {
      flightTypes: this.lookupOptions('flight_types'),
      flightServiceTypes: this.lookupOptions('flight_service_types'),
      flightPriorities: this.lookupOptions('flight_priorities'),
      flightRequestStatuses: this.lookupOptions('flight_request_statuses'),
      flightOperationStatuses: this.lookupOptions('flight_operation_statuses'),
      crewAssignmentRoles: this.lookupOptions('crew_assignment_roles'),
      flightActionTypes: this.lookupOptions('flight_action_types'),
      flightApprovalTypes: this.lookupOptions('flight_approval_types'),
      flightApprovalStatuses: this.lookupOptions('flight_approval_statuses'),
      flightAttachmentStatuses: this.lookupOptions('flight_attachment_statuses'),
      readinessStatuses: this.lookupOptions('readiness_statuses'),
      manifestTypes: this.lookupOptions('manifest_types'),
      manifestStatuses: this.lookupOptions('manifest_statuses'),
      dgAcceptanceStatuses: this.lookupOptions('dg_acceptance_statuses'),
      fuelWorkflowStatuses: this.lookupOptions('fuel_workflow_statuses'),
      stationServiceTypes: this.lookupOptions('station_service_types'),
      stationServiceStatuses: this.lookupOptions('station_service_statuses'),
      stationCostStatuses: this.lookupOptions('station_cost_statuses'),
      aircraftServiceabilityStatuses: this.lookupOptions('aircraft_serviceability_statuses'),
      maintenanceHandoffStatuses: this.lookupOptions('maintenance_handoff_statuses'),
      financeEventTypes: this.lookupOptions('finance_event_types'),
      financeHandoffStatuses: this.lookupOptions('finance_handoff_statuses')
    };
  }

  ratePreview(query: {
    routeId: string;
    flightTypeId?: string;
    serviceTypeId?: string;
    bookingChannel?: string;
    passengerType?: string;
    cargoPriceBasis?: string;
    customerId?: string;
    aircraftType?: string;
    quantity?: number;
    date?: string;
  }): FlightRatePreviewDto {
    const route = this.requireRow(
      `SELECT id, origin_station_id, destination_station_id
       FROM routes WHERE id = ? AND is_active = 1`,
      query.routeId,
      'Route'
    );
    const flightType = query.flightTypeId
      ? this.lookupCode('flight_types', query.flightTypeId, 'Flight type')
      : undefined;
    const serviceTypeCode = query.serviceTypeId
      ? this.lookupCode('flight_service_types', query.serviceTypeId, 'Service type')
      : undefined;
    const serviceType = this.previewRateServiceType(flightType, serviceTypeCode);
    const quantity = Math.max(0, Number(query.quantity ?? 1));
    const rateDate = query.date || new Date().toISOString().slice(0, 10);
    const rows = this.sqlite
      .prepare(
        `SELECT rc.id, rc.rate_code, rc.service_type, rc.customer_id, rc.aircraft_type,
            rc.currency_id, rc.tax_code_id, rc.base_rate, rc.rate_unit, rc.booking_channel,
            rc.minimum_charge, rc.rate_priority, rc.effective_from, rc.effective_to,
            cur.currency_code, tax.tax_code
         FROM rate_cards rc
         JOIN currencies cur ON cur.id = rc.currency_id
         LEFT JOIN tax_codes tax ON tax.id = rc.tax_code_id
         WHERE rc.is_active = 1
           AND rc.origin_station_id = @originStationId
           AND rc.destination_station_id = @destinationStationId
           AND rc.service_type = @serviceType
           AND rc.effective_from <= @rateDate
           AND (rc.effective_to IS NULL OR rc.effective_to >= @rateDate)
           AND (rc.customer_id IS NULL OR rc.customer_id = @customerId)
           AND (rc.aircraft_type IS NULL OR rc.aircraft_type = @aircraftType)
           AND (@bookingChannel IS NULL OR rc.booking_channel IS NULL OR rc.booking_channel = @bookingChannel)
           AND (@passengerType IS NULL OR rc.passenger_type IS NULL OR rc.passenger_type = @passengerType)
           AND (@cargoPriceBasis IS NULL OR rc.cargo_price_basis IS NULL OR rc.cargo_price_basis = @cargoPriceBasis)
         ORDER BY
           CASE WHEN rc.customer_id IS NOT NULL THEN 0 ELSE 1 END,
           CASE WHEN rc.aircraft_type IS NOT NULL THEN 0 ELSE 1 END,
           CASE WHEN rc.booking_channel IS NOT NULL THEN 0 ELSE 1 END,
           CASE WHEN rc.passenger_type IS NOT NULL THEN 0 ELSE 1 END,
           CASE WHEN rc.cargo_price_basis IS NOT NULL THEN 0 ELSE 1 END,
           rc.rate_priority ASC,
           rc.effective_from DESC`
      )
      .all({
        originStationId: String(route.origin_station_id),
        destinationStationId: String(route.destination_station_id),
        serviceType,
        customerId: query.customerId || null,
        aircraftType: query.aircraftType || null,
        bookingChannel: query.bookingChannel || this.defaultBookingChannel(serviceType),
        passengerType: query.passengerType || (serviceType === 'PASSENGER' ? 'ADULT' : null),
        cargoPriceBasis:
          query.cargoPriceBasis || (serviceType === 'CARGO' ? 'CHARGEABLE_WEIGHT' : null),
        rateDate
      }) as SqlRow[];

    const row = rows[0];
    if (!row) {
      return {
        matchedRateId: null,
        rateCode: null,
        serviceType,
        bookingChannel: null,
        baseAmount: 0,
        rateUnit: null,
        quantity,
        minimumCharge: null,
        estimatedTotal: 0,
        currencyCode: 'IDR',
        taxCodeId: null,
        taxCode: null,
        note: 'No active rate card matched this request.'
      };
    }

    const baseAmount = num(row.base_rate);
    const minimumCharge = nullableNum(row.minimum_charge);
    const rateUnit = String(row.rate_unit);
    const rawTotal = rateUnit === 'PER_FLIGHT' ? baseAmount : baseAmount * quantity;
    const estimatedTotal = minimumCharge === null ? rawTotal : Math.max(rawTotal, minimumCharge);

    return {
      matchedRateId: String(row.id),
      rateCode: String(row.rate_code),
      serviceType: String(row.service_type) as FlightRatePreviewDto['serviceType'],
      bookingChannel: str(row.booking_channel),
      baseAmount,
      rateUnit,
      quantity,
      minimumCharge,
      estimatedTotal,
      currencyCode: String(row.currency_code),
      taxCodeId: str(row.tax_code_id),
      taxCode: str(row.tax_code),
      note: 'Estimated from the best matching active demo rate card.'
    };
  }

  async planningContext(query: FlightPlanningContextQuery): Promise<FlightPlanningContextDto> {
    if (!this.routesService) {
      throw new DomainError(
        'PLANNING_CONTEXT_UNAVAILABLE',
        'Route operational profile service is unavailable.',
        503
      );
    }
    this.validateSchedule(query.scheduledDepartureAt ?? null, query.scheduledArrivalAt ?? null);
    const profile = await this.routesService.getOperationalProfile(query.routeId);
    const passengerEstimate = query.passengerEstimate ?? 0;
    const cargoWeightEstimateKg = query.cargoWeightEstimateKg ?? 0;
    const serviceMatches = (serviceTypeId: string) =>
      !query.serviceTypeId || serviceTypeId === query.serviceTypeId;
    const flightDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][
      new Date(`${query.flightDate}T00:00:00.000Z`).getUTCDay()
    ];

    const capacityRows = profile.compatibleAircraft.filter((item) =>
      serviceMatches(item.serviceTypeId)
    );
    const capacityByAircraft = new Map(
      capacityRows.map((item) => [item.aircraftId, item] as const)
    );
    const aircraftRows = this.sqlite
      .prepare(
        `SELECT aircraft.*, station.station_code as current_station_code
         FROM aircraft
         LEFT JOIN stations station ON station.id = aircraft.current_station_id
         WHERE aircraft.is_active = 1
         ORDER BY aircraft.registration_number`
      )
      .all() as SqlRow[];
    const aircraftCandidates = aircraftRows.map((row) => {
      const blockers: string[] = [];
      const warnings: string[] = [];
      const aircraftId = String(row.id);
      const capacity = capacityByAircraft.get(aircraftId);
      const serviceability = String(row.serviceability_status);
      const currentStationCode = str(row.current_station_code);
      if (String(row.operational_status) !== 'ACTIVE')
        blockers.push('Aircraft is not operationally active.');
      if (serviceability !== 'SERVICEABLE') {
        blockers.push(`Aircraft serviceability is ${serviceability}.`);
      }
      if (currentStationCode !== profile.origin?.stationCode) {
        blockers.push(
          `Aircraft is at ${currentStationCode ?? 'an unknown station'}, not ${profile.origin?.stationCode ?? 'the route origin'}.`
        );
      }
      if (!capacity) {
        blockers.push('No active capacity profile matches this route and service.');
      } else {
        const availableSeats = capacity.seatCapacity - capacity.reservedSeatCount;
        const availableCargo = capacity.cargoCapacityKg - capacity.reservedCargoKg;
        if (passengerEstimate > availableSeats) {
          blockers.push(`Passenger estimate exceeds the available ${availableSeats} seats.`);
        }
        if (cargoWeightEstimateKg > availableCargo) {
          blockers.push(`Cargo estimate exceeds the available ${availableCargo} kg.`);
        }
      }
      if (
        this.hasScheduleOverlap(
          'aircraft_id',
          aircraftId,
          query.scheduledDepartureAt,
          query.scheduledArrivalAt
        )
      ) {
        blockers.push('Aircraft is assigned to another overlapping flight.');
      }
      return {
        id: aircraftId,
        label: `${String(row.registration_number)} - ${String(row.aircraft_type)}`,
        registrationNumber: String(row.registration_number),
        aircraftType: String(row.aircraft_type),
        currentStationCode,
        serviceabilityStatus: serviceability,
        available: blockers.length === 0,
        warnings,
        blockers
      };
    });

    const crewRows = this.sqlite
      .prepare(
        `SELECT crew.*, base.station_code as base_station_code, duty.station_code as duty_station_code
         FROM crews crew
         LEFT JOIN stations base ON base.id = crew.base_station_id
         LEFT JOIN stations duty ON duty.id = crew.duty_station_id
         WHERE crew.is_active = 1 AND crew.crew_role IN ('PILOT_IN_COMMAND', 'CO_PILOT')
         ORDER BY crew.full_name`
      )
      .all() as SqlRow[];
    const crewCandidates = crewRows.map((row) => {
      const blockers: string[] = [];
      const warnings: string[] = [];
      const crewId = String(row.id);
      const licenseExpiry = str(row.license_expiry_date);
      const medicalExpiry = str(row.medical_expiry_date);
      if (String(row.availability_status) !== 'AVAILABLE') {
        blockers.push(`Crew availability is ${String(row.availability_status)}.`);
      }
      if (!licenseExpiry || licenseExpiry < query.flightDate) {
        blockers.push('License is missing or expires before the flight date.');
      }
      if (!medicalExpiry || medicalExpiry < query.flightDate) {
        blockers.push('Medical certificate is missing or expires before the flight date.');
      }
      if (
        this.hasCrewScheduleOverlap(crewId, query.scheduledDepartureAt, query.scheduledArrivalAt)
      ) {
        blockers.push('Crew member is assigned to another overlapping flight.');
      }
      const dutyStationCode = str(row.duty_station_code);
      const baseStationCode = str(row.base_station_code);
      if (dutyStationCode && dutyStationCode !== profile.origin?.stationCode) {
        warnings.push(`Duty station is ${dutyStationCode}; positioning review is required.`);
      } else if (baseStationCode && baseStationCode !== profile.origin?.stationCode) {
        warnings.push(`Base station is ${baseStationCode}; positioning review is required.`);
      }
      return {
        id: crewId,
        label: `${String(row.employee_code)} - ${String(row.full_name)}`,
        employeeCode: String(row.employee_code),
        crewRole: String(row.crew_role),
        baseStationCode,
        dutyStationCode,
        available: blockers.length === 0,
        warnings,
        blockers
      };
    });

    const scheduleTemplates = profile.scheduleTemplates
      .filter((item) => serviceMatches(item.serviceTypeId))
      .map((item) => ({
        id: item.id,
        label: `${item.templateCode} - ${item.departureTimeLocal} to ${item.arrivalTimeLocal}`,
        recommended: item.operatingDays.includes(flightDay)
      }));
    const capacityProfiles = capacityRows.map((item) => ({
      id: item.profileId,
      label: `${item.profileCode} - ${item.profileName}`,
      recommended:
        passengerEstimate <= item.seatCapacity - item.reservedSeatCount &&
        cargoWeightEstimateKg <= item.cargoCapacityKg - item.reservedCargoKg
    }));

    return {
      routeReadiness: {
        availableForScheduling: profile.readiness.availableForScheduling,
        blockers: profile.readiness.blockers,
        warnings: profile.readiness.warnings
      },
      scheduleTemplates,
      capacityProfiles,
      aircraftCandidates,
      crewCandidates
    };
  }

  private previewRateServiceType(flightType?: string, serviceType?: string) {
    if (serviceType === 'SCHEDULED_PASSENGER') return 'PASSENGER' as const;
    if (serviceType === 'CHARTER_CARGO') return 'CARGO' as const;
    if (
      serviceType === 'CHARTER_PASSENGER' ||
      serviceType === 'MEDEVAC' ||
      serviceType === 'POSITIONING'
    ) {
      return 'CHARTER' as const;
    }
    if (flightType === 'PASSENGER') return 'PASSENGER' as const;
    if (flightType === 'CARGO') return 'CARGO' as const;
    if (flightType === 'CHARTER') return 'CHARTER' as const;
    return 'CHARTER' as const;
  }

  private defaultBookingChannel(serviceType: 'CHARTER' | 'PASSENGER' | 'CARGO') {
    if (serviceType === 'PASSENGER') return 'COUNTER';
    if (serviceType === 'CARGO') return 'CARGO';
    return null;
  }

  listRequests(query: ListFlightRequestsQuery): FlightRequestOverviewDto {
    const conditions: string[] = [];
    const params: Record<string, string | number> = {
      limit: query.limit,
      offset: query.offset
    };
    if (query.search) {
      conditions.push(
        '(fr.request_number LIKE @search OR c.account_name LIKE @search OR r.route_code LIKE @search)'
      );
      params.search = `%${query.search}%`;
    }
    if (query.statusId) {
      conditions.push('fr.status_id = @statusId');
      params.statusId = query.statusId;
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const requests = (
      this.sqlite
        .prepare(
          `${this.flightRequestSelectSql()} ${where}
           ORDER BY fr.flight_date DESC, fr.request_number DESC LIMIT @limit OFFSET @offset`
        )
        .all(params) as SqlRow[]
    ).map(mapRequest);
    const summary = Object.fromEntries(
      ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED'].map((status) => [status, 0])
    ) as Record<FlightRequestStatus, number>;
    const counts = this.sqlite
      .prepare(
        `SELECT status.code as status, COUNT(*) as count
         FROM flight_requests fr
         JOIN flight_request_statuses status ON status.id = fr.status_id
         GROUP BY status.code`
      )
      .all() as SqlRow[];
    for (const row of counts) {
      summary[String(row.status) as FlightRequestStatus] = num(row.count);
    }
    return { summary, requests };
  }

  requestDetail(id: string) {
    const row = this.sqlite.prepare(`${this.flightRequestSelectSql()} WHERE fr.id = ?`).get(id) as
      SqlRow | undefined;
    if (!row) throw notFound('Flight request', id);
    return mapRequest(row);
  }

  createRequest(input: CreateFlightRequestBody, actorUserId: string) {
    this.validateRouteForScheduling(input.routeId);
    this.requireActiveRef('flight_types', input.flightTypeId, 'Flight type');
    this.requireActiveRef('flight_service_types', input.serviceTypeId, 'Service type');
    this.requireActiveRef('flight_priorities', input.priorityId, 'Priority');
    this.validateSchedule(input.scheduledDepartureAt ?? null, input.scheduledArrivalAt ?? null);
    if (input.pilotInCommandId && input.coPilotId && input.pilotInCommandId === input.coPilotId) {
      throw new DomainError(
        'DUPLICATE_CREW_ASSIGNMENT',
        'PIC and co-pilot cannot be the same crew.',
        422
      );
    }
    const now = timestamp();
    const id = `fr-${nanoid(12)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_requests (
          id, request_number, status_id, flight_date, flight_type_id, service_type_id, route_id,
          customer_id, aircraft_id, pilot_in_command_id, co_pilot_id, scheduled_departure_at,
          scheduled_arrival_at, request_source, priority_id, passenger_estimate,
          cargo_weight_estimate_kg, cargo_category, dangerous_goods, fuel_type,
          requested_fuel_litre, fuel_supplier_id, handling_supplier_id, parking_required,
          destination_handling_required, billing_type, estimated_revenue, currency_code,
          remarks, converted_flight_id, created_by_user_id, approved_by_user_id, approved_at,
          created_at, updated_at
        ) VALUES (
          @id, @requestNumber, 'flight-request-status-draft', @flightDate, @flightTypeId, @serviceTypeId, @routeId,
          @customerId, @aircraftId, @pilotInCommandId, @coPilotId, @scheduledDepartureAt,
          @scheduledArrivalAt, @requestSource, @priorityId, @passengerEstimate,
          @cargoWeightEstimateKg, @cargoCategory, @dangerousGoods, @fuelType,
          @requestedFuelLitre, @fuelSupplierId, @handlingSupplierId, @parkingRequired,
          @destinationHandlingRequired, @billingType, @estimatedRevenue, 'IDR',
          @remarks, NULL, @createdByUserId, NULL, NULL, @createdAt, @updatedAt
        )`
      )
      .run({
        ...input,
        id,
        requestNumber: this.nextRequestNumber(input.flightDate),
        customerId: input.customerId ?? null,
        aircraftId: input.aircraftId ?? null,
        pilotInCommandId: input.pilotInCommandId ?? null,
        coPilotId: input.coPilotId ?? null,
        scheduledDepartureAt: input.scheduledDepartureAt ?? null,
        scheduledArrivalAt: input.scheduledArrivalAt ?? null,
        cargoCategory: input.cargoCategory ?? null,
        fuelSupplierId: input.fuelSupplierId ?? null,
        handlingSupplierId: input.handlingSupplierId ?? null,
        estimatedRevenue: input.estimatedRevenue ?? null,
        remarks: input.remarks ?? null,
        dangerousGoods: input.dangerousGoods ? 1 : 0,
        parkingRequired: input.parkingRequired ? 1 : 0,
        destinationHandlingRequired: input.destinationHandlingRequired ? 1 : 0,
        createdByUserId: actorUserId,
        createdAt: now,
        updatedAt: now
      });
    return this.requestDetail(id);
  }

  updateRequest(id: string, input: CreateFlightRequestBody) {
    const request = this.requestDetail(id);
    if (request.status !== 'DRAFT' && request.status !== 'REJECTED') {
      throw new DomainError(
        'REQUEST_LOCKED',
        'Only draft or rejected requests can be edited.',
        409
      );
    }
    this.validateSchedule(input.scheduledDepartureAt ?? null, input.scheduledArrivalAt ?? null);
    this.validateRouteForScheduling(input.routeId);
    this.requireActiveRef('flight_types', input.flightTypeId, 'Flight type');
    this.requireActiveRef('flight_service_types', input.serviceTypeId, 'Service type');
    this.requireActiveRef('flight_priorities', input.priorityId, 'Priority');
    this.sqlite
      .prepare(
        `UPDATE flight_requests SET
          flight_date = @flightDate, flight_type_id = @flightTypeId, service_type_id = @serviceTypeId,
          route_id = @routeId, customer_id = @customerId, aircraft_id = @aircraftId,
          pilot_in_command_id = @pilotInCommandId, co_pilot_id = @coPilotId,
          scheduled_departure_at = @scheduledDepartureAt,
          scheduled_arrival_at = @scheduledArrivalAt, request_source = @requestSource,
          priority_id = @priorityId, passenger_estimate = @passengerEstimate,
          cargo_weight_estimate_kg = @cargoWeightEstimateKg, cargo_category = @cargoCategory,
          dangerous_goods = @dangerousGoods, fuel_type = @fuelType,
          requested_fuel_litre = @requestedFuelLitre, fuel_supplier_id = @fuelSupplierId,
          handling_supplier_id = @handlingSupplierId, parking_required = @parkingRequired,
          destination_handling_required = @destinationHandlingRequired,
          billing_type = @billingType, estimated_revenue = @estimatedRevenue,
          remarks = @remarks, status_id = 'flight-request-status-draft', updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({
        ...input,
        id,
        customerId: input.customerId ?? null,
        aircraftId: input.aircraftId ?? null,
        pilotInCommandId: input.pilotInCommandId ?? null,
        coPilotId: input.coPilotId ?? null,
        scheduledDepartureAt: input.scheduledDepartureAt ?? null,
        scheduledArrivalAt: input.scheduledArrivalAt ?? null,
        cargoCategory: input.cargoCategory ?? null,
        fuelSupplierId: input.fuelSupplierId ?? null,
        handlingSupplierId: input.handlingSupplierId ?? null,
        estimatedRevenue: input.estimatedRevenue ?? null,
        remarks: input.remarks ?? null,
        dangerousGoods: input.dangerousGoods ? 1 : 0,
        parkingRequired: input.parkingRequired ? 1 : 0,
        destinationHandlingRequired: input.destinationHandlingRequired ? 1 : 0,
        updatedAt: timestamp()
      });
    return this.requestDetail(id);
  }

  submitRequest(id: string) {
    const request = this.requestDetail(id);
    if (request.status !== 'DRAFT' && request.status !== 'REJECTED') {
      throw new DomainError(
        'INVALID_REQUEST_TRANSITION',
        'Only a draft request can be submitted.',
        409
      );
    }
    const customerRequired = ['CHARTER_CARGO', 'CHARTER_PASSENGER', 'SCHEDULED_PASSENGER'].includes(
      request.serviceTypeCode
    );
    if (
      (customerRequired && !request.customerId) ||
      !request.aircraftId ||
      !request.pilotInCommandId ||
      !request.scheduledDepartureAt ||
      !request.scheduledArrivalAt
    ) {
      throw new DomainError(
        'REQUEST_INCOMPLETE',
        customerRequired
          ? 'Customer, aircraft, PIC, departure, and arrival schedule are required.'
          : 'Aircraft, PIC, departure, and arrival schedule are required.',
        422
      );
    }
    this.validateRequestPlanning(request);
    this.sqlite
      .prepare(
        `UPDATE flight_requests SET status_id = 'flight-request-status-submitted', updated_at = ? WHERE id = ?`
      )
      .run(timestamp(), id);
    return this.requestDetail(id);
  }

  decideRequest(id: string, body: FlightApprovalDecisionBody, actorUserId: string) {
    const request = this.requestDetail(id);
    if (request.status !== 'SUBMITTED') {
      throw new DomainError(
        'REQUEST_NOT_PENDING',
        'Only submitted requests can receive a decision.',
        409
      );
    }
    if (request.createdByUserId === actorUserId) {
      throw new DomainError(
        'SELF_APPROVAL_BLOCKED',
        'The request creator cannot approve the same request.',
        409
      );
    }
    if (body.decision !== 'APPROVE') {
      const status = body.decision === 'REJECT' ? 'REJECTED' : 'DRAFT';
      this.sqlite
        .prepare(
          `UPDATE flight_requests SET status_id = ?, remarks = COALESCE(?, remarks), updated_at = ? WHERE id = ?`
        )
        .run(
          this.lookupId('flight_request_statuses', status, 'Flight request status'),
          body.reason ?? null,
          timestamp(),
          id
        );
      return { request: this.requestDetail(id), flight: null };
    }
    const transaction = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `UPDATE flight_requests
           SET status_id = 'flight-request-status-approved', approved_by_user_id = ?, approved_at = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(actorUserId, timestamp(), timestamp(), id);
      const flight = this.createOrderFromRequest(this.requestDetail(id), actorUserId);
      this.sqlite
        .prepare(
          `UPDATE flight_requests
           SET status_id = 'flight-request-status-converted', converted_flight_id = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(flight.id, timestamp(), id);
      return flight;
    });
    const flight = transaction();
    return { request: this.requestDetail(id), flight };
  }

  create(input: CreateFlightOperationBody, actorUserId: string) {
    const route = this.validateRouteForScheduling(input.routeId);
    this.requireActiveRef('flight_types', input.flightTypeId, 'Flight type');
    this.requireActiveRef('flight_service_types', input.serviceTypeId, 'Service type');
    this.requireActiveRef('flight_priorities', input.priorityId, 'Priority');
    this.validateSchedule(input.scheduledDepartureAt ?? null, input.scheduledArrivalAt ?? null);

    const now = timestamp();
    const flightNumber = this.nextFlightNumber(input.flightDate);
    const orderNumber = this.nextOrderNumber(input.flightDate);
    const id = `fop-${nanoid(12)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_operations (
          id, order_number, flight_request_id, flight_number, flight_date, flight_type_id,
          service_type_id, request_source, priority_id, route_id, origin_station_id,
          destination_station_id, customer_id, aircraft_id, pilot_in_command_id, co_pilot_id,
          scheduled_departure_at, scheduled_arrival_at, current_status_id, created_by_user_id,
          approved_by_user_id, remarks, billing_type, estimated_revenue, currency_code,
          is_locked, blocking_reason, created_at, updated_at
        ) VALUES (
          @id, @orderNumber, NULL, @flightNumber, @flightDate, @flightTypeId,
          @serviceTypeId, 'Direct Operational Entry', @priorityId, @routeId, @originStationId,
          @destinationStationId, @customerId, @aircraftId, @pilotInCommandId, @coPilotId,
          @scheduledDepartureAt, @scheduledArrivalAt, 'flight-operation-status-draft', @createdByUserId,
          NULL, @remarks, 'CHARTER', NULL, 'IDR', 0, NULL, @createdAt, @updatedAt
        )`
      )
      .run({
        id,
        orderNumber,
        flightNumber,
        flightDate: input.flightDate,
        flightTypeId: input.flightTypeId,
        serviceTypeId: input.serviceTypeId,
        priorityId: input.priorityId,
        routeId: input.routeId,
        originStationId: route.origin_station_id,
        destinationStationId: route.destination_station_id,
        customerId: input.customerId ?? null,
        aircraftId: input.aircraftId ?? null,
        pilotInCommandId: input.pilotInCommandId ?? null,
        coPilotId: input.coPilotId ?? null,
        scheduledDepartureAt: input.scheduledDepartureAt ?? null,
        scheduledArrivalAt: input.scheduledArrivalAt ?? null,
        remarks: input.remarks ?? null,
        createdByUserId: actorUserId,
        createdAt: now,
        updatedAt: now
      });

    this.ensureCrewAssignments(id, input.pilotInCommandId ?? null, input.coPilotId ?? null);
    this.ensureManifests(id);
    this.ensureOperationalVerificationTasks(id);
    this.initializeFlightGovernance(id);
    this.appendHistory(id, null, 'DRAFT', 'CREATE', actorUserId);
    this.evaluateReadiness(id, false, actorUserId);
    return this.detail(id);
  }

  update(id: string, input: CreateFlightOperationBody, actorUserId: string) {
    const flight = this.requireFlight(id);
    if (flight.currentStatus !== 'DRAFT' && flight.currentStatus !== 'REOPENED_FOR_CORRECTION') {
      throw new DomainError(
        'FLIGHT_LOCKED_FOR_EDIT',
        'Only draft or reopened flights can be edited.',
        409
      );
    }

    const route = this.validateRouteForScheduling(input.routeId);
    this.requireActiveRef('flight_types', input.flightTypeId, 'Flight type');
    this.requireActiveRef('flight_service_types', input.serviceTypeId, 'Service type');
    this.requireActiveRef('flight_priorities', input.priorityId, 'Priority');
    this.validateSchedule(input.scheduledDepartureAt ?? null, input.scheduledArrivalAt ?? null);

    this.sqlite
      .prepare(
        `UPDATE flight_operations
         SET flight_date = @flightDate,
             flight_type_id = @flightTypeId,
             service_type_id = @serviceTypeId,
             priority_id = @priorityId,
             route_id = @routeId,
             origin_station_id = @originStationId,
             destination_station_id = @destinationStationId,
             customer_id = @customerId,
             aircraft_id = @aircraftId,
             pilot_in_command_id = @pilotInCommandId,
             co_pilot_id = @coPilotId,
             scheduled_departure_at = @scheduledDepartureAt,
             scheduled_arrival_at = @scheduledArrivalAt,
             remarks = @remarks,
             updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({
        id,
        flightDate: input.flightDate,
        flightTypeId: input.flightTypeId,
        serviceTypeId: input.serviceTypeId,
        priorityId: input.priorityId,
        routeId: input.routeId,
        originStationId: route.origin_station_id,
        destinationStationId: route.destination_station_id,
        customerId: input.customerId ?? null,
        aircraftId: input.aircraftId ?? null,
        pilotInCommandId: input.pilotInCommandId ?? null,
        coPilotId: input.coPilotId ?? null,
        scheduledDepartureAt: input.scheduledDepartureAt ?? null,
        scheduledArrivalAt: input.scheduledArrivalAt ?? null,
        remarks: input.remarks ?? null,
        updatedAt: timestamp()
      });

    this.sqlite.prepare('DELETE FROM flight_crew_assignments WHERE flight_id = ?').run(id);
    this.ensureCrewAssignments(id, input.pilotInCommandId ?? null, input.coPilotId ?? null);
    this.invalidateStationVerification(
      id,
      'Flight planning, assignment, route, or schedule changed.',
      actorUserId
    );
    this.evaluateReadiness(id, false, actorUserId);
    return this.detail(id);
  }

  submit(id: string, actorUserId: string) {
    const flight = this.requireFlight(id);
    if (flight.currentStatus !== 'DRAFT' && flight.currentStatus !== 'REOPENED_FOR_CORRECTION') {
      throw new DomainError(
        'INVALID_TRANSITION',
        'Only draft or reopened flights can be submitted.',
        409
      );
    }
    if (!flight.aircraftId || !flight.pilotInCommandId) {
      throw new DomainError(
        'FLIGHT_SUBMIT_INCOMPLETE',
        'Submit requires aircraft and PIC assignment.',
        422
      );
    }

    this.transition(id, 'PENDING_READINESS', actorUserId);
    this.sqlite
      .prepare(
        `UPDATE flight_operation_approvals
         SET status_id = 'flight-approval-status-pending', requested_by_user_id = ?, requested_at = ?, updated_at = ?
         WHERE flight_id = ? AND approval_type_id = 'flight-approval-type-readiness-approval'`
      )
      .run(flight.createdByUserId, timestamp(), timestamp(), id);
    return this.evaluateReadiness(id, true, actorUserId);
  }

  evaluate(id: string, actorUserId: string) {
    return this.evaluateReadiness(id, true, actorUserId);
  }

  approve(id: string, body: ActionNoteBody, actorUserId: string) {
    const flight = this.requireFlight(id);
    if (flight.currentStatus !== 'READY_FOR_APPROVAL') {
      throw new DomainError('READINESS_NOT_APPROVABLE', 'Flight must be ready for approval.', 409);
    }
    if (flight.createdByUserId === actorUserId) {
      throw new DomainError(
        'SELF_APPROVAL_BLOCKED',
        'Creator cannot approve their own flight.',
        409
      );
    }

    this.sqlite
      .prepare(
        `UPDATE flight_operations
         SET approved_by_user_id = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(actorUserId, timestamp(), id);
    this.sqlite
      .prepare(
        `UPDATE flight_operation_approvals
         SET status_id = 'flight-approval-status-approved', decided_by_user_id = ?, decided_at = ?,
             reason = ?, updated_at = ?
         WHERE flight_id = ? AND approval_type_id IN ('flight-approval-type-readiness-approval', 'flight-approval-type-flight-approval')`
      )
      .run(actorUserId, timestamp(), body.note ?? null, timestamp(), id);
    this.transition(id, 'APPROVED', actorUserId, { note: body.note });
    return this.detail(id);
  }

  closeFlight(id: string, actorUserId: string) {
    const close = this.sqlite.transaction(() => {
      const flight = this.detail(id);
      if (flight.currentStatus === 'CLOSED') {
        createInvoiceService(this.sqlite).finalizeClosedFlight(id, actorUserId);
        createAccountingService(this.sqlite).fulfillPassengerServicesForFlight(id, actorUserId);
        return flight;
      }
      if (flight.currentStatus !== 'PENDING_CLOSURE') {
        throw new DomainError(
          'INVALID_TRANSITION',
          'Only a flight pending closure can be closed.',
          409
        );
      }
      const { missing } = flight.closureReadiness;
      if (missing.length) {
        throw new DomainError(
          'CLOSURE_REQUIREMENTS_INCOMPLETE',
          `Flight cannot be closed. Complete: ${missing.join(', ')}.`,
          422,
          { missing }
        );
      }
      this.sqlite
        .prepare(
          `UPDATE flight_operation_approvals
           SET status_id = 'flight-approval-status-approved', requested_by_user_id = COALESCE(requested_by_user_id, ?),
               requested_at = COALESCE(requested_at, ?), decided_by_user_id = ?,
               decided_at = ?, updated_at = ?
           WHERE flight_id = ? AND approval_type_id = 'flight-approval-type-closure-approval'`
        )
        .run(actorUserId, timestamp(), actorUserId, timestamp(), timestamp(), id);
      return this.transition(id, 'CLOSED', actorUserId);
    });
    return close.immediate();
  }

  private closureReadiness(
    evidence: ClosureEvidence
  ): FlightOperationDetailDto['closureReadiness'] {
    const missing: string[] = [];
    if (!evidence.actualDepartureAt || !evidence.actualArrivalAt) {
      missing.push('actual departure/arrival');
    }
    if (
      evidence.manifests.length === 0 ||
      evidence.manifests.some((manifest) => !['APPROVED', 'LOCKED'].includes(manifest.status))
    ) {
      missing.push('final manifest');
    }
    if (!evidence.fuelRequests.some((fuel) => ['UPLIFTED', 'POSTED'].includes(fuel.status))) {
      missing.push('actual fuel uplift');
    }
    if (
      evidence.stationCosts.length === 0 ||
      evidence.stationCosts.some((cost) => cost.status !== 'APPROVED')
    ) {
      missing.push('approved station cost');
    }
    if (
      evidence.maintenanceHandoffs.length === 0 ||
      !evidence.maintenanceHandoffs.some(
        (handoff) =>
          handoff.aircraftId === evidence.aircraftId && isApprovedMaintenanceStatus(handoff.status)
      )
    ) {
      missing.push('approved maintenance handoff');
    }
    const hasActualRevenue = Boolean(
      (
        this.sqlite
          .prepare(
            `SELECT EXISTS (
               SELECT 1 FROM passenger_tickets ticket
               WHERE ticket.flight_operation_id = @flightId
                 AND ticket.ticket_status = 'ACTIVE' AND ticket.payment_status = 'PAID'
                 AND NOT EXISTS (
                   SELECT 1 FROM ticketing_refund_requests refund
                   WHERE refund.passenger_ticket_id = ticket.id AND refund.status = 'APPROVED'
                 )
               UNION ALL
               SELECT 1 FROM cargo_bookings booking
               WHERE booking.flight_operation_id = @flightId AND booking.payment_status = 'PAID'
                 AND booking.status IN ('BOOKED', 'DELIVERED')
                 AND NOT EXISTS (
                   SELECT 1 FROM ticketing_refund_requests refund
                   WHERE refund.cargo_booking_id = booking.id AND refund.status = 'APPROVED'
                 )
             ) AS hasRevenue`
          )
          .get({ flightId: evidence.id }) as { hasRevenue: number }
      ).hasRevenue
    );
    if (!evidence.customerId || (evidence.estimatedRevenue === null && !hasActualRevenue)) {
      missing.push('invoice customer/revenue');
    }
    return {
      allowed: evidence.currentStatus === 'PENDING_CLOSURE' && missing.length === 0,
      missing
    };
  }

  transition(
    id: string,
    toStatus: FlightOperationStatus,
    actorUserId: string,
    options: { note?: string } = {}
  ) {
    this.sqlite.transaction(() => {
      const flight = this.requireFlight(id);
      this.applyTransition(flight, toStatus, actorUserId, { reasonNote: options.note });

      if (toStatus === 'CLOSED') {
        createInvoiceService(this.sqlite).finalizeClosedFlight(id, actorUserId);
        createAccountingService(this.sqlite).fulfillPassengerServicesForFlight(id, actorUserId);
      }
    })();

    return this.detail(id);
  }

  depart(id: string, body: ActualTimeBody, actorUserId: string) {
    this.sqlite.transaction(() => {
      const flight = this.requireFlight(id);
      this.assertTransition(flight, 'IN_PROGRESS');
      const stationId = body.stationId ?? flight.originStationId;
      if (stationId !== flight.originStationId) {
        throw new DomainError(
          'INVALID_DEPARTURE_STATION',
          'Departure station must match the planned origin station.',
          422
        );
      }
      const actualAt = new Date(body.actualAt).toISOString();
      this.sqlite
        .prepare(
          `UPDATE flight_operations
           SET actual_departure_at = ?, actual_departure_station_id = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(actualAt, stationId, timestamp(), id);
      this.applyTransition(flight, 'IN_PROGRESS', actorUserId, {
        reasonNote: body.note,
        metadata: { actualAt, stationId }
      });
    })();
    return this.detail(id);
  }

  land(id: string, body: ActualTimeBody, actorUserId: string) {
    this.sqlite.transaction(() => {
      const flight = this.requireFlight(id);
      this.assertTransition(flight, 'LANDED');
      const stationId = body.stationId ?? flight.destinationStationId;
      if (stationId !== flight.destinationStationId) {
        throw new DomainError(
          'DIVERSION_ACTION_REQUIRED',
          'Use the diversion action when the actual arrival station differs from plan.',
          422
        );
      }
      const actualAt = new Date(body.actualAt).toISOString();
      const departureAt = flight.actualDepartureAt
        ? new Date(flight.actualDepartureAt).toISOString()
        : null;
      if (!departureAt || new Date(actualAt).getTime() < new Date(departureAt).getTime()) {
        throw new DomainError(
          'INVALID_ACTUAL_TIME',
          'Actual arrival must be recorded after actual departure.',
          422
        );
      }
      this.sqlite
        .prepare(
          `UPDATE flight_operations
           SET actual_departure_at = ?, actual_arrival_at = ?, actual_arrival_station_id = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(departureAt, actualAt, stationId, timestamp(), id);
      if (flight.aircraftId) {
        this.sqlite
          .prepare('UPDATE aircraft SET current_station_id = ?, updated_at = ? WHERE id = ?')
          .run(stationId, timestamp(), flight.aircraftId);
      }
      this.applyTransition(flight, 'LANDED', actorUserId, {
        reasonNote: body.note,
        metadata: { actualAt, stationId }
      });
    })();
    return this.detail(id);
  }

  cancel(id: string, body: FlightReasonActionBody, actorUserId: string) {
    this.validateReason(body);
    this.sqlite.transaction(() => {
      const flight = this.requireFlight(id);
      if (flight.currentStatus === 'CLOSED') {
        throw new DomainError(
          'CLOSED_FLIGHT_LOCKED',
          'Closed flight must be reopened before cancellation.',
          409
        );
      }
      this.sqlite
        .prepare(
          `UPDATE flight_operations SET current_status_id = 'flight-operation-status-cancelled', is_locked = 1, updated_at = ? WHERE id = ?`
        )
        .run(timestamp(), id);
      this.appendHistory(id, flight.currentStatus, 'CANCELLED', 'CANCEL', actorUserId, {
        reasonId: body.reasonId,
        reasonNote: body.reasonNote
      });
      this.upsertFinanceHandoff(
        id,
        'flight',
        id,
        'FLIGHT_CANCELLED_VOID_REQUEST',
        'VOID',
        'Cancellation marks related finance drafts as void.',
        null,
        null
      );
    })();
    return this.detail(id);
  }

  divert(id: string, body: FlightReasonActionBody, actorUserId: string) {
    if (!body.diversionStationId) {
      throw new DomainError('DIVERSION_STATION_REQUIRED', 'Diversion station is required.', 422);
    }
    this.validateReason(body);
    this.sqlite.transaction(() => {
      const flight = this.requireFlight(id);
      this.assertTransition(flight, 'DIVERTED');
      this.requireRow(
        'SELECT id FROM stations WHERE id = ? AND is_active = 1',
        body.diversionStationId!,
        'Diversion station'
      );
      const actualAt = timestamp();
      const departureAt = flight.actualDepartureAt
        ? new Date(flight.actualDepartureAt).toISOString()
        : null;
      this.sqlite
        .prepare(
          `UPDATE flight_operations
           SET actual_departure_at = ?, actual_arrival_at = ?, actual_arrival_station_id = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(departureAt, actualAt, body.diversionStationId, timestamp(), id);
      if (flight.aircraftId) {
        this.sqlite
          .prepare('UPDATE aircraft SET current_station_id = ?, updated_at = ? WHERE id = ?')
          .run(body.diversionStationId, timestamp(), flight.aircraftId);
      }
      this.applyTransition(flight, 'DIVERTED', actorUserId, {
        reasonId: body.reasonId,
        reasonNote: body.reasonNote,
        metadata: { diversionStationId: body.diversionStationId, actualAt }
      });
    })();
    return this.detail(id);
  }

  reopen(id: string, body: FlightReasonActionBody, actorUserId: string) {
    const flight = this.requireFlight(id);
    if (flight.currentStatus !== 'CLOSED') {
      throw new DomainError('REOPEN_ONLY_CLOSED', 'Only closed flights can be reopened.', 409);
    }
    this.validateReason(body);
    this.sqlite
      .prepare(
        `UPDATE flight_operations SET current_status_id = 'flight-operation-status-reopened-for-correction', is_locked = 0, updated_at = ? WHERE id = ?`
      )
      .run(timestamp(), id);
    this.appendHistory(id, 'CLOSED', 'REOPENED_FOR_CORRECTION', 'REOPEN', actorUserId, {
      reasonId: body.reasonId,
      reasonNote: body.reasonNote
    });
    return this.detail(id);
  }

  createPassenger(body: CreatePassengerBody) {
    this.requireManifest(body.manifestId);
    this.sqlite
      .prepare(
        `INSERT INTO flight_manifest_passengers (
          id, manifest_id, full_name, identity_type, identity_number, weight_kg, seat_number,
          baggage_weight_kg, remarks, created_at, updated_at
        ) VALUES (@id, @manifestId, @fullName, @identityType, @identityNumber, @weightKg, @seatNumber,
          @baggageWeightKg, @remarks, @createdAt, @updatedAt)`
      )
      .run({ id: nanoid(), createdAt: timestamp(), updatedAt: timestamp(), ...body });
    return this.detail(String(this.manifestFlightOperationId(body.manifestId)));
  }

  createCargo(body: CreateCargoBody, actorUserId: string) {
    this.requireManifest(body.manifestId);
    this.sqlite
      .prepare(
        `INSERT INTO flight_manifest_cargo_items (
          id, manifest_id, description, sender_name, receiver_name, actual_weight_kg,
          volume_weight_kg, chargeable_weight_kg, dg_category_id, dg_acceptance_status_id,
          remarks, created_at, updated_at
        ) VALUES (@id, @manifestId, @description, @senderName, @receiverName, @actualWeightKg,
          @volumeWeightKg, @chargeableWeightKg, @dgCategoryId, @dgAcceptanceStatusId, @remarks,
          @createdAt, @updatedAt)`
      )
      .run({ id: nanoid(), createdAt: timestamp(), updatedAt: timestamp(), ...body });
    const flightId = String(this.manifestFlightOperationId(body.manifestId));
    this.evaluateReadiness(flightId, false, actorUserId);
    return this.detail(flightId);
  }

  createFuel(body: CreateFuelRequestBody, actorUserId: string) {
    const flight = this.requireFlight(body.flightId);
    const supplier = this.requireRow(
      `SELECT * FROM fuel_suppliers WHERE id = ? AND is_active = 1`,
      body.fuelSupplierId,
      'Fuel supplier'
    );
    if (
      flight.aircraftServiceability &&
      supplier.fuel_type &&
      body.fuelType !== supplier.fuel_type
    ) {
      throw new DomainError('FUEL_TYPE_MISMATCH', 'Fuel type must match selected supplier.', 422);
    }
    const id = `fuel-${nanoid(10)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_fuel_requests (
          id, flight_id, fuel_supplier_id, fuel_type, requested_quantity_litre,
          approved_quantity_litre, actual_uplift_litre, reference_price_per_litre,
          actual_price_per_litre, tax_code_id, tax_amount, total_cost, currency_id, status_id,
          requested_by_user_id, created_at, updated_at
        ) VALUES (@id, @flightId, @fuelSupplierId, @fuelType, @requestedQuantityLitre,
          NULL, NULL, @referencePricePerLitre, NULL, NULL, NULL, NULL, @currencyId, 'fuel-workflow-status-requested',
          @actorUserId, @createdAt, @updatedAt)`
      )
      .run({
        id,
        actorUserId,
        currencyId: String(supplier.currency_id),
        createdAt: timestamp(),
        updatedAt: timestamp(),
        ...body
      });
    this.evaluateReadiness(body.flightId, false, actorUserId);
    return this.detail(body.flightId);
  }

  fuelAction(
    id: string,
    action: 'approve' | 'uplift' | 'post' | 'reject',
    body: Record<string, unknown>,
    actorUserId: string
  ) {
    const request = this.requireRow(
      `SELECT * FROM flight_fuel_requests WHERE id = ?`,
      id,
      'Fuel request'
    );
    const now = timestamp();
    if (action === 'approve') {
      this.sqlite
        .prepare(
          `UPDATE flight_fuel_requests SET status_id = 'fuel-workflow-status-approved', approved_quantity_litre = ?, approved_by_user_id = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          Number(body.approvedQuantityLitre ?? request.requested_quantity_litre),
          actorUserId,
          now,
          id
        );
    } else if (action === 'uplift') {
      const actual = Number(body.actualUpliftLitre ?? 0);
      const price = Number(body.actualPricePerLitre ?? request.reference_price_per_litre ?? 0);
      const total = Math.round(actual * price);
      this.sqlite
        .prepare(
          `UPDATE flight_fuel_requests SET status_id = 'fuel-workflow-status-uplifted', actual_uplift_litre = ?, actual_price_per_litre = ?, total_cost = ?, tax_amount = 0, uplift_recorded_by_user_id = ?, variance_note = ?, updated_at = ? WHERE id = ?`
        )
        .run(actual, price, total, actorUserId, String(body.varianceNote ?? ''), now, id);
    } else if (action === 'post') {
      this.sqlite
        .prepare(
          `UPDATE flight_fuel_requests SET status_id = 'fuel-workflow-status-posted', updated_at = ? WHERE id = ?`
        )
        .run(now, id);
      const latest = this.requireRow(
        `SELECT * FROM flight_fuel_requests WHERE id = ?`,
        id,
        'Fuel request'
      );
      this.upsertFinanceHandoff(
        String(latest.flight_id),
        'fuel',
        id,
        'FUEL_COST_DRAFT',
        'READY',
        'Fuel uplift cost posted to finance handoff preview.',
        nullableNum(latest.total_cost),
        str(latest.currency_id)
      );
    } else {
      this.sqlite
        .prepare(
          `UPDATE flight_fuel_requests SET status_id = 'fuel-workflow-status-rejected', rejection_reason = ?, updated_at = ? WHERE id = ?`
        )
        .run(String(body.rejectionReason ?? 'Rejected in demo workflow.'), now, id);
    }
    const flightId = String(request.flight_id);
    this.evaluateReadiness(flightId, false, actorUserId);
    return this.detail(flightId);
  }

  createStationService(body: CreateStationServiceBody, actorUserId: string) {
    const flight = this.requireFlight(body.flightId);
    if (![flight.originStationId, flight.destinationStationId].includes(body.stationId)) {
      throw new DomainError(
        'STATION_NOT_ON_FLIGHT',
        'Station service must belong to the flight origin or destination.',
        422
      );
    }
    const id = `station-service-${nanoid(10)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_station_service_requests (
          id, flight_id, station_id, service_supplier_id, service_type_id, status_id,
          reference_rate, created_at, updated_at
        ) VALUES (@id, @flightId, @stationId, @serviceSupplierId, @serviceTypeId, 'station-service-status-requested',
          @referenceRate, @createdAt, @updatedAt)`
      )
      .run({ id, createdAt: timestamp(), updatedAt: timestamp(), ...body });
    this.invalidateStationVerification(
      body.flightId,
      'Station service request changed.',
      actorUserId,
      ['ORIGIN_HANDLING', 'ORIGIN_STATION_SIGNOFF']
    );
    this.evaluateReadiness(body.flightId, false, actorUserId);
    return this.listStationServices({ flightId: body.flightId }).find(
      (record) => record.id === id
    )!;
  }

  confirmStationService(id: string, actorUserId: string, expectedVersion?: number) {
    const row = this.requireRow(
      `SELECT * FROM flight_station_service_requests WHERE id = ?`,
      id,
      'Station service'
    );
    if (expectedVersion !== undefined && Number(row.version) !== expectedVersion) {
      throw new DomainError('STALE_VERSION', 'Station service changed. Refresh and retry.', 409, {
        currentVersion: Number(row.version)
      });
    }
    if (String(row.status_id) !== 'station-service-status-requested') {
      throw new DomainError(
        'INVALID_TRANSITION',
        'Only a requested station service can be confirmed.',
        409
      );
    }
    const result = this.sqlite
      .prepare(
        `UPDATE flight_station_service_requests
         SET status_id = 'station-service-status-confirmed', confirmed_at = ?,
             confirmed_by_user_id = ?, version = version + 1, updated_at = ?
         WHERE id = ? AND version = ?`
      )
      .run(timestamp(), actorUserId, timestamp(), id, Number(row.version));
    if (!result.changes) {
      throw new DomainError('STALE_VERSION', 'Station service changed. Refresh and retry.', 409);
    }
    this.invalidateStationVerification(
      String(row.flight_id),
      'Station service confirmation changed.',
      actorUserId,
      ['ORIGIN_HANDLING', 'ORIGIN_STATION_SIGNOFF']
    );
    this.evaluateReadiness(String(row.flight_id), false, actorUserId);
    return this.detail(String(row.flight_id));
  }

  rejectStationService(id: string, reason: string, actorUserId: string, expectedVersion: number) {
    const row = this.requireRow(
      `SELECT * FROM flight_station_service_requests WHERE id = ?`,
      id,
      'Station service'
    );
    if (Number(row.version) !== expectedVersion) {
      throw new DomainError('STALE_VERSION', 'Station service changed. Refresh and retry.', 409, {
        currentVersion: Number(row.version)
      });
    }
    if (String(row.status_id) !== 'station-service-status-requested') {
      throw new DomainError(
        'INVALID_TRANSITION',
        'Only a requested station service can be rejected.',
        409
      );
    }
    const result = this.sqlite
      .prepare(
        `UPDATE flight_station_service_requests
         SET status_id = 'station-service-status-rejected', rejection_note = ?,
             version = version + 1, updated_at = ?
         WHERE id = ? AND version = ?`
      )
      .run(reason, timestamp(), id, expectedVersion);
    if (!result.changes) {
      throw new DomainError('STALE_VERSION', 'Station service changed. Refresh and retry.', 409);
    }
    this.invalidateStationVerification(
      String(row.flight_id),
      `Station service rejected: ${reason}`,
      actorUserId,
      ['ORIGIN_HANDLING', 'ORIGIN_STATION_SIGNOFF']
    );
    this.evaluateReadiness(String(row.flight_id), false, actorUserId);
    return this.detail(String(row.flight_id));
  }

  createStationCost(body: CreateStationCostBody, actorUserId: string) {
    if (body.flightId) {
      const flight = this.requireFlight(body.flightId);
      if (![flight.originStationId, flight.destinationStationId].includes(body.stationId)) {
        throw new DomainError(
          'STATION_NOT_ON_FLIGHT',
          'Station cost must belong to the flight origin or destination.',
          422
        );
      }
    }
    const id = `station-cost-${nanoid(10)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_station_costs (
          id, flight_id, station_id, vendor_id, cost_category_id, amount, currency_id,
          description, status_id, submitted_by_user_id, created_at, updated_at
        ) VALUES (@id, @flightId, @stationId, @vendorId, @costCategoryId, @amount, @currencyId,
          @description, 'station-cost-status-draft', @actorUserId, @createdAt, @updatedAt)`
      )
      .run({ id, actorUserId, createdAt: timestamp(), updatedAt: timestamp(), ...body });
    return this.listStationCosts().find((record) => record.id === id)!;
  }

  submitStationCost(id: string, actorUserId: string, expectedVersion: number) {
    const row = this.requireRow(
      `SELECT * FROM flight_station_costs WHERE id = ?`,
      id,
      'Station cost'
    );
    if (Number(row.version) !== expectedVersion) {
      throw new DomainError('STALE_VERSION', 'Station cost changed. Refresh and retry.', 409, {
        currentVersion: Number(row.version)
      });
    }
    if (String(row.status_id) !== 'station-cost-status-draft') {
      throw new DomainError(
        'INVALID_TRANSITION',
        'Only a draft station cost can be submitted.',
        409
      );
    }
    const result = this.sqlite
      .prepare(
        `UPDATE flight_station_costs
         SET status_id = 'station-cost-status-submitted', submitted_by_user_id = ?,
             version = version + 1, updated_at = ?
         WHERE id = ? AND version = ?`
      )
      .run(actorUserId, timestamp(), id, expectedVersion);
    if (!result.changes) {
      throw new DomainError('STALE_VERSION', 'Station cost changed. Refresh and retry.', 409);
    }
    return row.flight_id ? this.detail(String(row.flight_id)) : this.listStationCosts();
  }

  approveStationCost(id: string, actorUserId: string, expectedVersion?: number) {
    const row = this.requireRow(
      `SELECT * FROM flight_station_costs WHERE id = ?`,
      id,
      'Station cost'
    );
    if (expectedVersion !== undefined && Number(row.version) !== expectedVersion) {
      throw new DomainError('STALE_VERSION', 'Station cost changed. Refresh and retry.', 409, {
        currentVersion: Number(row.version)
      });
    }
    if (
      expectedVersion !== undefined &&
      String(row.status_id) !== 'station-cost-status-submitted'
    ) {
      throw new DomainError(
        'INVALID_TRANSITION',
        'Only a submitted station cost can be approved.',
        409
      );
    }
    const result = this.sqlite
      .prepare(
        `UPDATE flight_station_costs
         SET status_id = 'station-cost-status-approved', approved_by_user_id = ?,
             approved_at = ?, version = version + 1, updated_at = ?
         WHERE id = ? AND version = ?`
      )
      .run(actorUserId, timestamp(), timestamp(), id, Number(row.version));
    if (!result.changes) {
      throw new DomainError('STALE_VERSION', 'Station cost changed. Refresh and retry.', 409);
    }
    if (row.flight_id) {
      this.upsertFinanceHandoff(
        String(row.flight_id),
        'station_cost',
        id,
        'STATION_COST_DRAFT',
        'READY',
        'Approved station cost ready for finance handoff.',
        nullableNum(row.amount),
        str(row.currency_id)
      );
      return this.detail(String(row.flight_id));
    }
    return row;
  }

  createMaintenance(body: CreateMaintenanceHandoffBody, actorUserId: string) {
    this.requireRow(
      'SELECT id FROM aircraft WHERE id = ? AND is_active = 1',
      body.aircraftId,
      'Aircraft'
    );
    if (body.flightId) {
      const flight = this.requireRow(
        'SELECT aircraft_id FROM flight_operations WHERE id = ?',
        body.flightId,
        'Flight operation'
      );
      if (!flight.aircraft_id) {
        throw new DomainError(
          'MAINTENANCE_FLIGHT_AIRCRAFT_REQUIRED',
          'Assign an aircraft to the flight before recording a maintenance handoff.',
          422
        );
      }
      if (String(flight.aircraft_id) !== body.aircraftId) {
        throw new DomainError(
          'MAINTENANCE_AIRCRAFT_MISMATCH',
          'Maintenance handoff aircraft must match the aircraft assigned to the flight.',
          422,
          { flightAircraftId: String(flight.aircraft_id), handoffAircraftId: body.aircraftId }
        );
      }
    }
    const id = `maintenance-${nanoid(10)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_maintenance_handoffs (
          id, flight_id, aircraft_id, serviceability_status_id, work_order_reference,
          maintenance_note, spare_part_reference, maintenance_cost, currency_id, status_id,
          recorded_by_user_id, created_at, updated_at
        ) VALUES (@id, @flightId, @aircraftId, @serviceabilityStatusId, @workOrderReference,
          @maintenanceNote, @sparePartReference, @maintenanceCost, @currencyId, 'maintenance-handoff-status-draft',
          @actorUserId, @createdAt, @updatedAt)`
      )
      .run({ id, actorUserId, createdAt: timestamp(), updatedAt: timestamp(), ...body });
    return body.flightId ? this.detail(body.flightId) : this.listMaintenance({});
  }

  approveMaintenance(id: string, actorUserId: string) {
    const row = this.requireRow(
      `SELECT * FROM flight_maintenance_handoffs WHERE id = ?`,
      id,
      'Maintenance handoff'
    );
    if (
      !['maintenance-handoff-status-draft', 'maintenance-handoff-status-submitted'].includes(
        String(row.status_id)
      )
    ) {
      throw new DomainError(
        'INVALID_TRANSITION',
        'Only draft or submitted maintenance handoffs can be approved.',
        409
      );
    }
    this.sqlite
      .prepare(
        `UPDATE flight_maintenance_handoffs SET status_id = 'maintenance-handoff-status-approved', approved_by_user_id = ?, approved_at = ?, updated_at = ? WHERE id = ?`
      )
      .run(actorUserId, timestamp(), timestamp(), id);
    if (row.flight_id) {
      this.upsertFinanceHandoff(
        String(row.flight_id),
        'maintenance',
        id,
        'MAINTENANCE_EXPENSE_DRAFT',
        'READY',
        'Approved maintenance handoff ready for finance preview.',
        nullableNum(row.maintenance_cost),
        str(row.currency_id)
      );
      return this.detail(String(row.flight_id));
    }
    return row;
  }

  listFuel(params: { flightId?: string } = {}): FlightFuelRequestDto[] {
    const where = params.flightId ? 'WHERE f.id = @flightId' : '';
    return (
      this.sqlite
        .prepare(
          `SELECT r.*, status.code as status, f.flight_number, s.supplier_name
       FROM flight_fuel_requests r
       JOIN flight_operations f ON f.id = r.flight_id
       JOIN fuel_suppliers s ON s.id = r.fuel_supplier_id
       JOIN fuel_workflow_statuses status ON status.id = r.status_id
       ${where}
       ORDER BY r.updated_at DESC`
        )
        .all(params) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: String(row.flight_id),
      flightNumber: String(row.flight_number),
      fuelSupplierId: String(row.fuel_supplier_id),
      supplierName: String(row.supplier_name),
      fuelType: String(row.fuel_type),
      requestedQuantityLitre: num(row.requested_quantity_litre),
      approvedQuantityLitre: nullableNum(row.approved_quantity_litre),
      actualUpliftLitre: nullableNum(row.actual_uplift_litre),
      referencePricePerLitre: nullableNum(row.reference_price_per_litre),
      actualPricePerLitre: nullableNum(row.actual_price_per_litre),
      taxAmount: nullableNum(row.tax_amount),
      totalCost: nullableNum(row.total_cost),
      status: String(row.status) as FlightFuelRequestDto['status'],
      varianceNote: str(row.variance_note)
    }));
  }

  listStationServices(params: { flightId?: string } = {}): FlightStationServiceDto[] {
    const where = params.flightId ? 'WHERE f.id = @flightId' : '';
    return (
      this.sqlite
        .prepare(
          `SELECT r.*, service_type.code as service_type, status.code as status,
              f.flight_number, s.station_code, p.supplier_name
       FROM flight_station_service_requests r
       JOIN flight_operations f ON f.id = r.flight_id
       JOIN stations s ON s.id = r.station_id
       JOIN station_service_suppliers p ON p.id = r.service_supplier_id
       JOIN station_service_types service_type ON service_type.id = r.service_type_id
       JOIN station_service_statuses status ON status.id = r.status_id
       ${where}
       ORDER BY r.updated_at DESC`
        )
        .all(params) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: String(row.flight_id),
      flightNumber: String(row.flight_number),
      stationId: String(row.station_id),
      stationCode: String(row.station_code),
      serviceSupplierId: String(row.service_supplier_id),
      supplierName: String(row.supplier_name),
      serviceType: String(row.service_type) as FlightStationServiceDto['serviceType'],
      status: String(row.status) as FlightStationServiceDto['status'],
      referenceRate: nullableNum(row.reference_rate),
      rejectionNote: str(row.rejection_note),
      version: num(row.version)
    }));
  }

  listStationCosts(params: { flightId?: string } = {}): FlightStationCostDto[] {
    const where = params.flightId ? 'WHERE f.id = @flightId' : '';
    return (
      this.sqlite
        .prepare(
          `SELECT c.*, status.code as status, f.flight_number, s.station_code, v.vendor_name,
              cc.category_name, cur.currency_code
       FROM flight_station_costs c
       LEFT JOIN flight_operations f ON f.id = c.flight_id
       JOIN stations s ON s.id = c.station_id
       LEFT JOIN vendors v ON v.id = c.vendor_id
       JOIN cost_categories cc ON cc.id = c.cost_category_id
       JOIN currencies cur ON cur.id = c.currency_id
       JOIN station_cost_statuses status ON status.id = c.status_id
       ${where}
       ORDER BY c.updated_at DESC`
        )
        .all(params) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: str(row.flight_id),
      flightNumber: str(row.flight_number),
      stationId: String(row.station_id),
      stationCode: String(row.station_code),
      vendorId: str(row.vendor_id),
      vendorName: str(row.vendor_name),
      costCategoryId: String(row.cost_category_id),
      costCategoryName: String(row.category_name),
      amount: num(row.amount),
      currencyId: String(row.currency_id),
      currencyCode: String(row.currency_code),
      description: String(row.description),
      status: String(row.status) as FlightStationCostDto['status'],
      version: num(row.version)
    }));
  }

  listMaintenance(params: MaintenanceHandoffQuery = {}): FlightMaintenanceHandoffDto[] {
    const conditions: string[] = [];
    const queryParams: Record<string, SqlValue> = {};
    if (params.flightId) {
      conditions.push('f.id = @flightId');
      queryParams.flightId = params.flightId;
    }
    if (params.search) {
      conditions.push('(f.flight_number LIKE @search OR a.registration_number LIKE @search)');
      queryParams.search = `%${params.search}%`;
    }
    if (params.date) {
      conditions.push('f.flight_date = @date');
      queryParams.date = params.date;
    }
    if (params.stationId) {
      conditions.push(
        '(f.origin_station_id = @stationId OR f.destination_station_id = @stationId)'
      );
      queryParams.stationId = params.stationId;
    }
    if (params.serviceability) {
      conditions.push('a.serviceability_status = @serviceability');
      queryParams.serviceability = params.serviceability;
    }
    if (params.status) {
      conditions.push('status.code = @status');
      queryParams.status = params.status;
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return (
      this.sqlite
        .prepare(
          `SELECT m.*, handoff_serviceability.code as handoff_serviceability_status,
              a.serviceability_status as serviceability_status, status.code as status,
              f.flight_number, f.flight_date, current_status.code as current_status,
              f.scheduled_departure_at, f.estimated_revenue, f.currency_code as flight_currency_code,
              r.route_code, origin.id as origin_station_id, origin.station_code as origin_station_code,
              destination.id as destination_station_id,
              destination.station_code as destination_station_code,
              a.registration_number, a.aircraft_type, a.next_maintenance_due_at,
              cur.currency_code,
              COALESCE((
                SELECT SUM(fuel.total_cost)
                FROM flight_fuel_requests fuel
                JOIN fuel_workflow_statuses fuel_status ON fuel_status.id = fuel.status_id
                WHERE fuel.flight_id = f.id AND fuel_status.code = 'POSTED'
              ), 0) AS fuel_cost,
              COALESCE((
                SELECT SUM(cost.amount)
                FROM flight_station_costs cost
                JOIN station_cost_statuses cost_status ON cost_status.id = cost.status_id
                WHERE cost.flight_id = f.id AND cost_status.code = 'APPROVED'
              ), 0) AS station_cost,
              COALESCE((
                SELECT SUM(approved_handoff.maintenance_cost)
                FROM flight_maintenance_handoffs approved_handoff
                JOIN maintenance_handoff_statuses approved_status
                  ON approved_status.id = approved_handoff.status_id
                WHERE approved_handoff.flight_id = f.id
                  AND approved_handoff.aircraft_id = f.aircraft_id
                  AND approved_status.code IN ('APPROVED', 'POSTED')
              ), 0) AS approved_maintenance_cost,
              COALESCE((
                SELECT COUNT(*)
                FROM flight_fuel_requests fuel
                JOIN fuel_workflow_statuses fuel_status ON fuel_status.id = fuel.status_id
                JOIN currencies fuel_currency ON fuel_currency.id = fuel.currency_id
                WHERE fuel.flight_id = f.id AND fuel_status.code = 'POSTED'
                  AND fuel_currency.currency_code <> f.currency_code
              ), 0) + COALESCE((
                SELECT COUNT(*)
                FROM flight_station_costs cost
                JOIN station_cost_statuses cost_status ON cost_status.id = cost.status_id
                JOIN currencies cost_currency ON cost_currency.id = cost.currency_id
                WHERE cost.flight_id = f.id AND cost_status.code = 'APPROVED'
                  AND cost_currency.currency_code <> f.currency_code
              ), 0) + COALESCE((
                SELECT COUNT(*)
                FROM flight_maintenance_handoffs approved_handoff
                JOIN maintenance_handoff_statuses approved_status
                  ON approved_status.id = approved_handoff.status_id
                JOIN currencies maintenance_currency
                  ON maintenance_currency.id = approved_handoff.currency_id
                WHERE approved_handoff.flight_id = f.id
                  AND approved_handoff.aircraft_id = f.aircraft_id
                  AND approved_status.code IN ('APPROVED', 'POSTED')
                  AND maintenance_currency.currency_code <> f.currency_code
              ), 0) AS finance_currency_mismatch_count
       FROM flight_maintenance_handoffs m
       LEFT JOIN flight_operations f ON f.id = m.flight_id
       LEFT JOIN flight_operation_statuses current_status ON current_status.id = f.current_status_id
       LEFT JOIN routes r ON r.id = f.route_id
       LEFT JOIN stations origin ON origin.id = f.origin_station_id
       LEFT JOIN stations destination ON destination.id = f.destination_station_id
       JOIN aircraft a ON a.id = m.aircraft_id
       JOIN currencies cur ON cur.id = m.currency_id
       JOIN aircraft_serviceability_statuses handoff_serviceability
         ON handoff_serviceability.id = m.serviceability_status_id
       JOIN maintenance_handoff_statuses status ON status.id = m.status_id
       ${where}
       ORDER BY m.updated_at DESC`
        )
        .all(queryParams) as SqlRow[]
    ).map((row) => {
      const status = String(row.status) as FlightMaintenanceHandoffDto['status'];
      const serviceabilityStatus = String(
        row.serviceability_status
      ) as FlightMaintenanceHandoffDto['serviceabilityStatus'];
      const handoffServiceabilityStatus = String(
        row.handoff_serviceability_status
      ) as FlightMaintenanceHandoffDto['handoffServiceabilityStatus'];
      const workOrderReference = str(row.work_order_reference);
      const aircraftNextMaintenanceDueAt = str(row.next_maintenance_due_at);
      const scheduledDepartureAt = str(row.scheduled_departure_at);
      const blockers = maintenanceBlockers({
        serviceabilityStatus,
        status,
        workOrderReference,
        aircraftNextMaintenanceDueAt,
        scheduledDepartureAt
      });
      const maintenanceCost = num(row.maintenance_cost);
      const financeCurrencyMismatch = num(row.finance_currency_mismatch_count) > 0;
      const fuelCost = financeCurrencyMismatch ? null : num(row.fuel_cost);
      const stationCost = financeCurrencyMismatch ? null : num(row.station_cost);
      const approvedMaintenanceCost = financeCurrencyMismatch
        ? null
        : num(row.approved_maintenance_cost);
      const totalOperationalCost = financeCurrencyMismatch
        ? null
        : num(row.fuel_cost) + num(row.station_cost) + num(row.approved_maintenance_cost);
      const estimatedRevenue = nullableNum(row.estimated_revenue);
      const attentionReasons = [
        ...(!row.flight_id ? ['Maintenance handoff is not linked to a flight'] : []),
        ...(serviceabilityStatus === 'SERVICEABLE_WITH_RESTRICTIONS'
          ? ['Aircraft is serviceable with restrictions and requires review']
          : []),
        ...(financeCurrencyMismatch
          ? ['Operational costs contain a currency that does not match the flight']
          : [])
      ];
      return {
        id: String(row.id),
        flightId: str(row.flight_id),
        flightNumber: str(row.flight_number),
        flightDate: str(row.flight_date),
        currentStatus: str(row.current_status) as FlightOperationStatus | null,
        routeCode: str(row.route_code),
        originStationId: str(row.origin_station_id),
        originStationCode: str(row.origin_station_code),
        destinationStationId: str(row.destination_station_id),
        destinationStationCode: str(row.destination_station_code),
        scheduledDepartureAt,
        aircraftId: String(row.aircraft_id),
        aircraftRegistration: String(row.registration_number),
        aircraftType: String(row.aircraft_type),
        aircraftNextMaintenanceDueAt,
        serviceabilityStatus,
        handoffServiceabilityStatus,
        workOrderReference,
        maintenanceNote: str(row.maintenance_note),
        sparePartReference: str(row.spare_part_reference),
        maintenanceCost,
        currencyId: String(row.currency_id),
        currencyCode: String(row.currency_code),
        status,
        closureReady:
          Boolean(row.flight_id) && blockers.length === 0 && serviceabilityStatus === 'SERVICEABLE',
        needsAttention: blockers.length > 0 || attentionReasons.length > 0,
        pendingApproval: ['DRAFT', 'SUBMITTED'].includes(status),
        evidenceComplete: Boolean(workOrderReference) && isApprovedMaintenanceStatus(status),
        blockers,
        attentionReasons,
        financeCurrencyCode: str(row.flight_currency_code) ?? String(row.currency_code),
        financeCurrencyMismatch,
        fuelCost,
        stationCost,
        approvedMaintenanceCost,
        totalOperationalCost,
        estimatedRevenue,
        projectedGrossMargin:
          estimatedRevenue === null || totalOperationalCost === null
            ? null
            : estimatedRevenue - totalOperationalCost
      };
    });
  }

  private queryFlights(query: ListFlightOperationsQuery) {
    const conditions: string[] = [];
    const params: Record<string, SqlValue> = {
      search: `%${query.search ?? ''}%`,
      limit: query.limit,
      offset: query.offset
    };

    if (query.search) {
      conditions.push(
        '(f.flight_number LIKE @search OR c.account_name LIKE @search OR r.route_code LIKE @search)'
      );
    }
    for (const [key, column] of [
      ['statusId', 'f.current_status_id'],
      ['flightTypeId', 'f.flight_type_id'],
      ['routeId', 'f.route_id'],
      ['originStationId', 'f.origin_station_id'],
      ['destinationStationId', 'f.destination_station_id'],
      ['aircraftId', 'f.aircraft_id'],
      ['customerId', 'f.customer_id']
    ] as const) {
      const value = query[key];
      if (value) {
        conditions.push(`${column} = @${key}`);
        params[key] = value;
      }
    }
    if (query.dateFrom) {
      conditions.push('f.flight_date >= @dateFrom');
      params.dateFrom = query.dateFrom;
    }
    if (query.dateTo) {
      conditions.push('f.flight_date <= @dateTo');
      params.dateTo = query.dateTo;
    }
    if (query.scheduledFrom) {
      conditions.push('datetime(f.scheduled_departure_at) >= datetime(@scheduledFrom)');
      params.scheduledFrom = query.scheduledFrom;
    }
    if (query.excludeTerminal) {
      conditions.push("current_status.code NOT IN ('CANCELLED', 'CLOSED')");
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const order = query.sortDirection === 'asc' ? 'ASC' : 'DESC';
    return this.sqlite
      .prepare(
        `${this.flightSelectSql()} ${where} ORDER BY datetime(f.scheduled_departure_at) ${order}, f.flight_number ${order} LIMIT @limit OFFSET @offset`
      )
      .all(params) as SqlRow[];
  }

  private queryFlightById(id: string) {
    return this.sqlite.prepare(`${this.flightSelectSql()} WHERE f.id = ?`).get(id) as
      SqlRow | undefined;
  }

  private flightSelectSql() {
    return `SELECT f.*,
        flight_type.code as flight_type_code,
        flight_type.label as flight_type_label,
        service_type.code as service_type_code,
        service_type.label as service_type_label,
        priority.code as priority_code,
        priority.label as priority_label,
        current_status.code as current_status_code,
        current_status.label as current_status_label,
        fr.request_number,
        r.route_code,
        o.station_code as origin_station_code,
        d.station_code as destination_station_code,
        actual_departure_station.station_code as actual_departure_station_code,
        actual_arrival_station.station_code as actual_arrival_station_code,
        c.account_name as customer_name,
        a.registration_number as aircraft_registration,
        a.serviceability_status as aircraft_serviceability,
        current_station.station_code as aircraft_current_station_code,
        a.next_maintenance_due_at as aircraft_next_maintenance_due_at,
        pic.full_name as pic_name,
        pic.availability_status as pic_availability_status,
        cop.full_name as copilot_name,
        cop.availability_status as copilot_availability_status,
        (SELECT COUNT(*) FROM flight_readiness_checks chk WHERE chk.flight_id = f.id AND chk.is_required = 1) as required_checks,
        (SELECT COUNT(*) FROM flight_readiness_checks chk JOIN readiness_statuses rs ON rs.id = chk.status_id WHERE chk.flight_id = f.id AND rs.code = 'PASS') as pass_checks,
        (SELECT COUNT(*) FROM flight_readiness_checks chk JOIN readiness_statuses rs ON rs.id = chk.status_id WHERE chk.flight_id = f.id AND rs.code = 'NOT_APPLICABLE') as na_checks
      FROM flight_operations f
      JOIN flight_types flight_type ON flight_type.id = f.flight_type_id
      JOIN flight_service_types service_type ON service_type.id = f.service_type_id
      JOIN flight_priorities priority ON priority.id = f.priority_id
      JOIN flight_operation_statuses current_status ON current_status.id = f.current_status_id
      LEFT JOIN flight_requests fr ON fr.id = f.flight_request_id
      JOIN routes r ON r.id = f.route_id
      JOIN stations o ON o.id = f.origin_station_id
      JOIN stations d ON d.id = f.destination_station_id
      LEFT JOIN stations actual_departure_station ON actual_departure_station.id = f.actual_departure_station_id
      LEFT JOIN stations actual_arrival_station ON actual_arrival_station.id = f.actual_arrival_station_id
      LEFT JOIN customers c ON c.id = f.customer_id
      LEFT JOIN aircraft a ON a.id = f.aircraft_id
      LEFT JOIN stations current_station ON current_station.id = a.current_station_id
      LEFT JOIN crews pic ON pic.id = f.pilot_in_command_id
      LEFT JOIN crews cop ON cop.id = f.co_pilot_id`;
  }

  private flightRequestSelectSql() {
    return `SELECT fr.*,
        status.code as status_code,
        status.label as status_label,
        flight_type.code as flight_type_code,
        flight_type.label as flight_type_label,
        service_type.code as service_type_code,
        service_type.label as service_type_label,
        priority.code as priority_code,
        priority.label as priority_label,
        r.route_code,
        o.station_code as origin_station_code,
        d.station_code as destination_station_code,
        c.account_name as customer_name,
        a.registration_number as aircraft_registration,
        pic.full_name as pic_name,
        cop.full_name as copilot_name
      FROM flight_requests fr
      JOIN flight_request_statuses status ON status.id = fr.status_id
      JOIN flight_types flight_type ON flight_type.id = fr.flight_type_id
      JOIN flight_service_types service_type ON service_type.id = fr.service_type_id
      JOIN flight_priorities priority ON priority.id = fr.priority_id
      JOIN routes r ON r.id = fr.route_id
      JOIN stations o ON o.id = r.origin_station_id
      JOIN stations d ON d.id = r.destination_station_id
      LEFT JOIN customers c ON c.id = fr.customer_id
      LEFT JOIN aircraft a ON a.id = fr.aircraft_id
      LEFT JOIN crews pic ON pic.id = fr.pilot_in_command_id
      LEFT JOIN crews cop ON cop.id = fr.co_pilot_id`;
  }

  private lookupOptions(table: string) {
    const rows = this.sqlite
      .prepare(
        `SELECT id, code, label, sort_order
         FROM ${table}
         WHERE is_active = 1
         ORDER BY sort_order, label`
      )
      .all() as SqlRow[];

    return rows.map((row) => ({
      value: String(row.id),
      id: String(row.id),
      code: String(row.code),
      label: String(row.label),
      title: String(row.label),
      sortOrder: num(row.sort_order)
    }));
  }

  private requireActiveRef(table: string, id: string, entity: string) {
    return this.requireRow(`SELECT * FROM ${table} WHERE id = ? AND is_active = 1`, id, entity);
  }

  private lookupId(table: string, code: string, entity: string) {
    const row = this.sqlite.prepare(`SELECT id FROM ${table} WHERE code = ?`).get(code) as
      SqlRow | undefined;
    if (!row) throw notFound(entity, code);
    return String(row.id);
  }

  private lookupCode(table: string, id: string, entity: string) {
    const row = this.requireActiveRef(table, id, entity);
    return String(row.code);
  }

  protected requireFlight(id: string) {
    const row = this.queryFlightById(id);
    if (!row) throw notFound('Flight', id);
    return mapFlight(row);
  }

  private requireRow(sql: string, id: string, entity: string) {
    const row = this.sqlite.prepare(sql).get(id) as SqlRow | undefined;
    if (!row) throw notFound(entity, id);
    return row;
  }

  private requireManifest(id: string) {
    return this.requireRow(`SELECT * FROM flight_manifests WHERE id = ?`, id, 'Manifest');
  }

  private manifestFlightOperationId(manifestId: string) {
    return this.requireManifest(manifestId).flight_operation_id;
  }

  private validateSchedule(departure: string | null, arrival: string | null) {
    if (departure && arrival && new Date(arrival).getTime() < new Date(departure).getTime()) {
      throw new DomainError(
        'INVALID_SCHEDULE',
        'Scheduled arrival cannot be before departure.',
        422
      );
    }
  }

  private hasScheduleOverlap(
    column: 'aircraft_id',
    resourceId: string,
    departure?: string,
    arrival?: string,
    excludeFlightId?: string
  ) {
    if (!departure || !arrival) return false;
    const row = this.sqlite
      .prepare(
        `SELECT COUNT(*) as count
         FROM flight_operations flight
         JOIN flight_operation_statuses status ON status.id = flight.current_status_id
         WHERE flight.${column} = @resourceId
           AND (@excludeFlightId IS NULL OR flight.id <> @excludeFlightId)
           AND status.code NOT IN ('LANDED', 'DIVERTED', 'PENDING_CLOSURE', 'CLOSED', 'CANCELLED')
           AND datetime(flight.scheduled_departure_at) < datetime(@arrival)
           AND datetime(flight.scheduled_arrival_at) > datetime(@departure)`
      )
      .get({ resourceId, departure, arrival, excludeFlightId: excludeFlightId ?? null }) as SqlRow;
    return num(row.count) > 0;
  }

  private hasCrewScheduleOverlap(
    crewId: string,
    departure?: string,
    arrival?: string,
    excludeFlightId?: string
  ) {
    if (!departure || !arrival) return false;
    const row = this.sqlite
      .prepare(
        `SELECT COUNT(*) as count
         FROM flight_crew_assignments assignment
         JOIN flight_operations flight ON flight.id = assignment.flight_id
         JOIN flight_operation_statuses status ON status.id = flight.current_status_id
         WHERE assignment.crew_id = @crewId
           AND (@excludeFlightId IS NULL OR flight.id <> @excludeFlightId)
           AND status.code NOT IN ('LANDED', 'DIVERTED', 'PENDING_CLOSURE', 'CLOSED', 'CANCELLED')
           AND datetime(flight.scheduled_departure_at) < datetime(@arrival)
           AND datetime(flight.scheduled_arrival_at) > datetime(@departure)`
      )
      .get({ crewId, departure, arrival, excludeFlightId: excludeFlightId ?? null }) as SqlRow;
    return num(row.count) > 0;
  }

  protected validateReason(body: FlightReasonActionBody) {
    const reason = this.requireRow(
      `SELECT * FROM flight_reasons WHERE id = ? AND is_active = 1`,
      body.reasonId,
      'Flight reason'
    );
    if (bool(reason.requires_note) && !body.reasonNote?.trim()) {
      throw new DomainError('REASON_NOTE_REQUIRED', 'This flight reason requires a note.', 422);
    }
  }

  private validateRouteForScheduling(routeId: string) {
    const route = this.requireRow(
      `SELECT route.*, origin.is_active as origin_active, destination.is_active as destination_active
       FROM routes route
       JOIN stations origin ON origin.id = route.origin_station_id
       JOIN stations destination ON destination.id = route.destination_station_id
       WHERE route.id = ?`,
      routeId,
      'Route'
    );
    if (!bool(route.is_active) || !bool(route.origin_active) || !bool(route.destination_active)) {
      throw new DomainError(
        'ROUTE_NOT_AVAILABLE',
        'Route and both stations must be active before scheduling.',
        422
      );
    }
    if (num(route.distance_km) <= 0 || num(route.estimated_duration_minutes) <= 0) {
      throw new DomainError(
        'ROUTE_NOT_AVAILABLE',
        'Route distance and duration must be configured before scheduling.',
        422
      );
    }
    if (String(route.restriction_level) === 'BLOCKING') {
      throw new DomainError(
        'ROUTE_BLOCKED',
        str(route.restriction_note) ?? 'Route has a blocking operational restriction.',
        422
      );
    }
    return route;
  }

  private validateRequestPlanning(request: FlightRequestRecord) {
    const route = this.validateRouteForScheduling(request.routeId);
    const departure = request.scheduledDepartureAt ?? undefined;
    const arrival = request.scheduledArrivalAt ?? undefined;
    if (!request.aircraftId || !request.pilotInCommandId) return;

    const aircraft = this.requireRow(
      `SELECT * FROM aircraft WHERE id = ? AND is_active = 1`,
      request.aircraftId,
      'Aircraft'
    );
    if (
      String(aircraft.operational_status) !== 'ACTIVE' ||
      String(aircraft.serviceability_status) !== 'SERVICEABLE'
    ) {
      throw new DomainError(
        'AIRCRAFT_NOT_AVAILABLE',
        'Selected aircraft is not active and serviceable.',
        422
      );
    }
    if (str(aircraft.current_station_id) !== String(route.origin_station_id)) {
      throw new DomainError(
        'AIRCRAFT_NOT_AT_ORIGIN',
        'Selected aircraft is not positioned at the route origin.',
        422
      );
    }
    const capacity = this.sqlite
      .prepare(
        `SELECT * FROM flight_capacity_profiles
         WHERE aircraft_id = ? AND route_id = ? AND service_type_id = ? AND is_active = 1`
      )
      .get(request.aircraftId, request.routeId, request.serviceTypeId) as SqlRow | undefined;
    if (!capacity) {
      throw new DomainError(
        'CAPACITY_PROFILE_REQUIRED',
        'Selected aircraft has no active capacity profile for this route and service.',
        422
      );
    }
    if (
      request.passengerEstimate > num(capacity.seat_capacity) - num(capacity.reserved_seat_count) ||
      request.cargoWeightEstimateKg >
        num(capacity.cargo_capacity_kg) - num(capacity.reserved_cargo_kg)
    ) {
      throw new DomainError(
        'AIRCRAFT_CAPACITY_EXCEEDED',
        'Passenger or cargo estimate exceeds the selected capacity profile.',
        422
      );
    }
    if (this.hasScheduleOverlap('aircraft_id', request.aircraftId, departure, arrival)) {
      throw new DomainError(
        'AIRCRAFT_SCHEDULE_CONFLICT',
        'Selected aircraft is assigned to another overlapping flight.',
        409
      );
    }

    for (const [crewId, expectedRole, label] of [
      [request.pilotInCommandId, 'PILOT_IN_COMMAND', 'PIC'],
      [request.coPilotId, 'CO_PILOT', 'Co-pilot']
    ] as const) {
      if (!crewId) continue;
      const crew = this.requireRow(
        'SELECT * FROM crews WHERE id = ? AND is_active = 1',
        crewId,
        label
      );
      if (
        String(crew.crew_role) !== expectedRole ||
        String(crew.availability_status) !== 'AVAILABLE'
      ) {
        throw new DomainError(
          'CREW_NOT_AVAILABLE',
          `${label} is not available for the selected assignment.`,
          422
        );
      }
      const licenseExpiry = str(crew.license_expiry_date);
      const medicalExpiry = str(crew.medical_expiry_date);
      if (
        !licenseExpiry ||
        licenseExpiry < request.flightDate ||
        !medicalExpiry ||
        medicalExpiry < request.flightDate
      ) {
        throw new DomainError(
          'CREW_DOCUMENT_EXPIRED',
          `${label} license or medical is not valid on the flight date.`,
          422
        );
      }
      if (this.hasCrewScheduleOverlap(crewId, departure, arrival)) {
        throw new DomainError(
          'CREW_SCHEDULE_CONFLICT',
          `${label} is assigned to another overlapping flight.`,
          409
        );
      }
    }
  }

  private nextFlightNumber(date: string) {
    const year = date.slice(0, 4);
    const count = this.sqlite
      .prepare(`SELECT COUNT(*) as count FROM flight_operations WHERE flight_number LIKE ?`)
      .get(`FL-${year}-%`) as SqlRow;
    return `FL-${year}-${String(Number(count.count) + 1).padStart(5, '0')}`;
  }

  private nextOrderNumber(date: string) {
    const year = date.slice(0, 4);
    const count = this.sqlite
      .prepare(`SELECT COUNT(*) as count FROM flight_operations WHERE order_number LIKE ?`)
      .get(`FO-${year}-%`) as SqlRow;
    return `FO-${year}-${String(Number(count.count) + 1).padStart(5, '0')}`;
  }

  private nextRequestNumber(date: string) {
    const year = date.slice(0, 4);
    const count = this.sqlite
      .prepare(`SELECT COUNT(*) as count FROM flight_requests WHERE request_number LIKE ?`)
      .get(`FR-${year}-%`) as SqlRow;
    return `FR-${year}-${String(Number(count.count) + 1).padStart(5, '0')}`;
  }

  private createOrderFromRequest(request: FlightRequestRecord, approvedByUserId: string) {
    const route = this.requireRow('SELECT * FROM routes WHERE id = ?', request.routeId, 'Route');
    const now = timestamp();
    const id = `fop-${nanoid(12)}`;
    this.sqlite
      .prepare(
        `INSERT INTO flight_operations (
          id, order_number, flight_request_id, flight_number, flight_date, flight_type_id,
          service_type_id, request_source, priority_id, route_id, origin_station_id,
          destination_station_id, customer_id, aircraft_id, pilot_in_command_id, co_pilot_id,
          scheduled_departure_at, scheduled_arrival_at, actual_departure_at, actual_arrival_at,
          current_status_id, created_by_user_id, approved_by_user_id, remarks, billing_type,
          estimated_revenue, currency_code, is_locked, blocking_reason, created_at, updated_at
        ) VALUES (
          @id, @orderNumber, @flightRequestId, @flightNumber, @flightDate, @flightTypeId,
          @serviceTypeId, @requestSource, @priorityId, @routeId, @originStationId,
          @destinationStationId, @customerId, @aircraftId, @pilotInCommandId, @coPilotId,
          @scheduledDepartureAt, @scheduledArrivalAt, NULL, NULL, 'flight-operation-status-draft',
          @createdByUserId, NULL, @remarks, @billingType, @estimatedRevenue, @currencyCode,
          0, NULL, @createdAt, @updatedAt
        )`
      )
      .run({
        id,
        orderNumber: this.nextOrderNumber(request.flightDate),
        flightRequestId: request.id,
        flightNumber: this.nextFlightNumber(request.flightDate),
        flightDate: request.flightDate,
        flightTypeId: request.flightTypeId,
        serviceTypeId: request.serviceTypeId,
        requestSource: request.requestSource,
        priorityId: request.priorityId,
        routeId: request.routeId,
        originStationId: route.origin_station_id,
        destinationStationId: route.destination_station_id,
        customerId: request.customerId,
        aircraftId: request.aircraftId,
        pilotInCommandId: request.pilotInCommandId,
        coPilotId: request.coPilotId,
        scheduledDepartureAt: request.scheduledDepartureAt,
        scheduledArrivalAt: request.scheduledArrivalAt,
        createdByUserId: request.createdByUserId,
        approvedByUserId,
        remarks: request.remarks,
        billingType: request.billingType,
        estimatedRevenue: request.estimatedRevenue,
        currencyCode: request.currencyCode,
        createdAt: now,
        updatedAt: now
      });
    this.ensureCrewAssignments(id, request.pilotInCommandId, request.coPilotId);
    this.ensureManifests(id);
    this.ensureOperationalVerificationTasks(id);
    this.initializeFlightGovernance(id);
    this.appendHistory(id, null, 'DRAFT', 'CREATE', approvedByUserId, {
      reasonNote: `Created from approved request ${request.requestNumber}.`,
      metadata: { flightRequestId: request.id, approvedByUserId }
    });

    if (request.fuelSupplierId && request.requestedFuelLitre > 0) {
      this.createFuel(
        {
          flightId: id,
          fuelSupplierId: request.fuelSupplierId,
          fuelType: request.fuelType,
          requestedQuantityLitre: request.requestedFuelLitre,
          referencePricePerLitre: null
        },
        approvedByUserId
      );
    }
    if (request.handlingSupplierId) {
      this.createStationService(
        {
          flightId: id,
          stationId: String(route.origin_station_id),
          serviceSupplierId: request.handlingSupplierId,
          serviceTypeId: 'station-service-type-handling',
          referenceRate: null
        },
        approvedByUserId
      );
    }
    this.evaluateReadiness(id, false, approvedByUserId);
    return this.detail(id);
  }

  private initializeFlightGovernance(flightId: string) {
    const now = timestamp();
    const approvals = [
      ['READINESS_APPROVAL', 'PENDING', 'Operation Manager'],
      ['FLIGHT_APPROVAL', 'NOT_STARTED', 'Chief Pilot'],
      ['CLOSURE_APPROVAL', 'NOT_STARTED', 'Operation Manager / Finance Reviewer']
    ] as const;
    for (const [approvalType, status, assignedRole] of approvals) {
      this.sqlite
        .prepare(
          `INSERT OR IGNORE INTO flight_operation_approvals (
            id, flight_id, approval_type_id, status_id, requested_by_user_id, assigned_role,
            decided_by_user_id, requested_at, decided_at, reason, affected_section,
            required_correction, created_at, updated_at
          ) VALUES (?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`
        )
        .run(
          `approval-${flightId}-${approvalType.toLowerCase()}`,
          flightId,
          this.lookupId('flight_approval_types', approvalType, 'Flight approval type'),
          this.lookupId('flight_approval_statuses', status, 'Flight approval status'),
          assignedRole,
          now,
          now
        );
    }
    const attachments = [
      ['CHARTER_REQUEST', 'Charter request document.pdf', 'AVAILABLE'],
      ['FLIGHT_INSTRUCTION', 'Flight instruction.pdf', 'AVAILABLE'],
      ['FUEL_EVIDENCE', 'Fuel request evidence', 'PENDING'],
      ['CARGO_DOCUMENT', 'Cargo manifest.pdf', 'PENDING'],
      ['CLOSURE_REPORT', 'Flight closure report.pdf', 'PENDING']
    ] as const;
    for (const [documentType, fileName, status] of attachments) {
      this.sqlite
        .prepare(
          `INSERT OR IGNORE INTO flight_operation_attachments (
            id, flight_id, document_type, file_name, status_id, uploaded_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `attachment-${flightId}-${documentType.toLowerCase()}`,
          flightId,
          documentType,
          fileName,
          this.lookupId('flight_attachment_statuses', status, 'Flight attachment status'),
          status === 'AVAILABLE' ? now : null,
          now,
          now
        );
    }
  }

  private ensureCrewAssignments(flightId: string, picId: string | null, coPilotId: string | null) {
    if (picId && coPilotId && picId === coPilotId) {
      throw new DomainError(
        'DUPLICATE_CREW_ASSIGNMENT',
        'PIC and co-pilot cannot be the same crew.',
        422
      );
    }
    const now = timestamp();
    if (picId) {
      this.requireRow(`SELECT * FROM crews WHERE id = ? AND is_active = 1`, picId, 'PIC');
      this.sqlite
        .prepare(
          `INSERT INTO flight_crew_assignments
            (id, flight_id, crew_id, assignment_role_id, is_primary, created_at, updated_at)
           VALUES (?, ?, ?, 'crew-assignment-role-pilot-in-command', 1, ?, ?)`
        )
        .run(`crew-${nanoid(10)}`, flightId, picId, now, now);
    }
    if (coPilotId) {
      this.requireRow(`SELECT * FROM crews WHERE id = ? AND is_active = 1`, coPilotId, 'Co-pilot');
      this.sqlite
        .prepare(
          `INSERT INTO flight_crew_assignments
            (id, flight_id, crew_id, assignment_role_id, is_primary, created_at, updated_at)
           VALUES (?, ?, ?, 'crew-assignment-role-co-pilot', 1, ?, ?)`
        )
        .run(`crew-${nanoid(10)}`, flightId, coPilotId, now, now);
    }
  }

  private ensureManifests(flightId: string) {
    const now = timestamp();
    for (const type of ['PASSENGER', 'CARGO'] as const) {
      this.sqlite
        .prepare(
          `INSERT OR IGNORE INTO flight_manifests (
             id, flight_operation_id, manifest_type_id, status_id, approved_by_user_id, approved_at,
             locked_at, created_at, updated_at
           ) VALUES (?, ?, ?, 'manifest-status-draft', NULL, NULL, NULL, ?, ?)`
        )
        .run(
          `manifest-${flightId}-${type.toLowerCase()}`,
          flightId,
          this.lookupId('manifest_types', type, 'Manifest type'),
          now,
          now
        );
    }
  }

  protected ensureOperationalVerificationTasks(flightId: string) {
    const flight = this.requireRow(
      `SELECT origin_station_id, destination_station_id FROM flight_operations WHERE id = ?`,
      flightId,
      'Flight'
    );
    const now = timestamp();
    const tasks = [
      [
        flight.origin_station_id,
        'ORIGIN_DEPARTURE',
        'ORIGIN_HANDLING',
        'Origin handling confirmed'
      ],
      [
        flight.origin_station_id,
        'ORIGIN_DEPARTURE',
        'ORIGIN_HANDOVER',
        'Passenger and cargo handover ready'
      ],
      [
        flight.origin_station_id,
        'ORIGIN_DEPARTURE',
        'ORIGIN_DOCUMENTS',
        'Required departure documents available'
      ],
      [
        flight.origin_station_id,
        'ORIGIN_DEPARTURE',
        'ORIGIN_CHECKLIST',
        'Station departure checklist completed'
      ],
      [
        flight.origin_station_id,
        'ORIGIN_DEPARTURE',
        'ORIGIN_STATION_SIGNOFF',
        'Origin station sign-off'
      ],
      [
        flight.destination_station_id,
        'DESTINATION_ARRIVAL',
        'DESTINATION_HANDLING',
        'Arrival handling completed'
      ],
      [
        flight.destination_station_id,
        'DESTINATION_ARRIVAL',
        'DESTINATION_HANDOVER',
        'Passenger and cargo handover completed'
      ],
      [
        flight.destination_station_id,
        'DESTINATION_ARRIVAL',
        'DESTINATION_INCIDENT',
        'Station incident recorded or declared clear'
      ],
      [
        flight.destination_station_id,
        'DESTINATION_ARRIVAL',
        'DESTINATION_DOCUMENTS',
        'Destination documents received'
      ],
      [
        flight.destination_station_id,
        'DESTINATION_CLOSURE',
        'DESTINATION_STATION_SIGNOFF',
        'Destination station sign-off'
      ]
    ] as const;
    const insert = this.sqlite.prepare(
      `INSERT OR IGNORE INTO flight_station_tasks (
         id, flight_id, station_id, phase, task_code, task_title, status, assigned_role,
         requires_evidence, version, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'Station Admin', 1, 1, ?, ?)`
    );
    for (const [stationId, phase, code, title] of tasks) {
      insert.run(`stask-${nanoid(10)}`, flightId, stationId, phase, code, title, now, now);
    }
  }

  protected invalidateStationVerification(
    flightId: string,
    reason: string,
    actorUserId: string,
    taskCodes?: string[]
  ) {
    const params: Array<string> = [timestamp(), flightId];
    const taskFilter = taskCodes?.length
      ? ` AND task_code IN (${taskCodes.map(() => '?').join(',')})`
      : '';
    if (taskCodes) params.push(...taskCodes);
    const affected = this.sqlite
      .prepare(
        `SELECT id, station_id, status, task_code FROM flight_station_tasks
         WHERE flight_id = ?${taskFilter}`
      )
      .all(flightId, ...(taskCodes ?? [])) as Array<{
      id: string;
      station_id: string;
      status: string;
      task_code: string;
    }>;
    const verified = affected.filter((task) => task.status === 'VERIFIED');
    if (!verified.length) return;

    this.sqlite
      .prepare(
        `UPDATE flight_station_tasks
         SET status = 'PENDING', verified_by_user_id = NULL, verified_at = NULL,
             rejection_reason = NULL, version = version + 1, updated_at = ?
         WHERE flight_id = ?${taskFilter}`
      )
      .run(...params);
    this.sqlite
      .prepare(
        `DELETE FROM flight_station_task_approvals
         WHERE task_id IN (
           SELECT id FROM flight_station_tasks WHERE flight_id = ?${taskFilter}
         )`
      )
      .run(flightId, ...(taskCodes ?? []));
    this.sqlite
      .prepare(
        `UPDATE flight_readiness_checks
         SET verification_status = 'PENDING', effective_status = 'BLOCKED',
             invalidation_reason = ?, updated_at = ?
         WHERE flight_id = ?`
      )
      .run(reason, timestamp(), flightId);
    const readinessCodes = taskCodes?.map((code) => {
      if (code === 'ORIGIN_HANDLING') return 'HANDLING_CONFIRMED';
      if (code === 'ORIGIN_DOCUMENTS') return 'REQUIRED_DOCUMENTS';
      return code;
    });
    const readinessFilter = readinessCodes?.length
      ? ` AND check_code IN (${readinessCodes.map(() => '?').join(',')})`
      : '';
    this.sqlite
      .prepare(
        `UPDATE flight_readiness_verifications
         SET verification_status = 'INVALIDATED', invalidated_at = ?,
             invalidation_reason = ?, updated_at = ?
         WHERE flight_id = ? AND verification_status = 'VERIFIED'${readinessFilter}`
      )
      .run(timestamp(), reason, timestamp(), flightId, ...(readinessCodes ?? []));
    const audit = this.sqlite.prepare(
      `INSERT INTO flight_operational_audit (
         id, actor_user_id, actor_role, flight_id, station_id, module, action,
         before_status, after_status, reason, timestamp, created_at
       ) VALUES (?, ?, 'SYSTEM', ?, ?, 'READINESS', 'INVALIDATE',
         'VERIFIED', 'PENDING', ?, ?, ?)`
    );
    for (const task of verified) {
      const now = timestamp();
      audit.run(
        `audit-${nanoid(10)}`,
        actorUserId,
        flightId,
        task.station_id,
        `${task.task_code}: ${reason}`,
        now,
        now
      );
    }
  }

  private appendHistory(
    flightId: string,
    fromStatus: FlightOperationStatus | null,
    toStatus: FlightOperationStatus,
    actionType: string,
    actorUserId: string,
    options: {
      reasonId?: string;
      reasonNote?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO flight_status_histories (
           id, flight_id, from_status_id, to_status_id, action_type_id, reason_id, reason_note,
           changed_by_user_id, changed_at, metadata_json
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `hist-${nanoid(12)}`,
        flightId,
        fromStatus
          ? this.lookupId('flight_operation_statuses', fromStatus, 'Flight operation status')
          : null,
        this.lookupId('flight_operation_statuses', toStatus, 'Flight operation status'),
        this.lookupId('flight_action_types', actionType, 'Flight action type'),
        options.reasonId ?? null,
        options.reasonNote ?? null,
        actorUserId,
        timestamp(),
        options.metadata ? JSON.stringify(options.metadata) : null
      );
  }

  private assertTransition(flight: FlightOperationRecord, toStatus: FlightOperationStatus) {
    const allowed = normalTransitions[flight.currentStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new DomainError(
        'INVALID_TRANSITION',
        `${flight.currentStatus} cannot move to ${toStatus}.`,
        409
      );
    }
  }

  private applyTransition(
    flight: FlightOperationRecord,
    toStatus: FlightOperationStatus,
    actorUserId: string,
    options: {
      reasonId?: string;
      reasonNote?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ) {
    this.assertTransition(flight, toStatus);
    this.sqlite
      .prepare(
        `UPDATE flight_operations
         SET current_status_id = ?, is_locked = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        this.lookupId('flight_operation_statuses', toStatus, 'Flight operation status'),
        toStatus === 'CLOSED' ? 1 : 0,
        timestamp(),
        flight.id
      );
    this.appendHistory(
      flight.id,
      flight.currentStatus,
      toStatus,
      actionTypeForStatus(toStatus),
      actorUserId,
      options
    );
  }

  private evaluateReadiness(id: string, updateStatus: boolean, actorUserId: string) {
    const flight = this.requireFlight(id);
    const now = timestamp();
    this.ensureOperationalVerificationTasks(id);
    const calculated = this.calculateReadiness(id, flight);
    const taskRows = this.sqlite
      .prepare(
        `SELECT id, task_code, status, verified_at
         FROM flight_station_tasks WHERE flight_id = ?`
      )
      .all(id) as Array<{
      id: string;
      task_code: string;
      status: string;
      verified_at: string | null;
    }>;
    const taskByCode = new Map(taskRows.map((task) => [task.task_code, task]));
    const approvalRows = this.sqlite
      .prepare(
        `SELECT task_id, approval_stage, decision FROM flight_station_task_approvals
         WHERE task_id IN (SELECT id FROM flight_station_tasks WHERE flight_id = ?)`
      )
      .all(id) as Array<{ task_id: string; approval_stage: string; decision: string }>;
    const approvalComplete = (taskId: string) =>
      ['STATION', 'OCC'].every((stage) =>
        approvalRows.some(
          (approval) =>
            approval.task_id === taskId &&
            approval.approval_stage === stage &&
            ['APPROVED', 'OVERRIDDEN'].includes(approval.decision)
        )
      );
    const manualTaskCodes: Record<string, string> = {
      HANDLING_CONFIRMED: 'ORIGIN_HANDLING',
      REQUIRED_DOCUMENTS: 'ORIGIN_DOCUMENTS'
    };
    const results = [
      ...calculated,
      {
        checkCode: 'ORIGIN_STATION_SIGNOFF',
        checkName: 'Origin station sign-off',
        status: 'PENDING' as const,
        resultNote: 'Origin station verification requires Station Admin and OCC approval.',
        sourceReference: 'flight_station_tasks'
      },
      {
        checkCode: 'DESTINATION_STATION_SIGNOFF',
        checkName: 'Destination station sign-off',
        status: 'PENDING' as const,
        resultNote: 'Destination sign-off is evaluated as a closure requirement.',
        sourceReference: 'flight_station_tasks'
      }
    ].map((result) => {
      const definition = getReadinessClassification(result.checkCode);
      const classification = definition?.classification ?? 'NOT_IMPLEMENTED';
      const taskCode =
        manualTaskCodes[result.checkCode] ??
        (result.checkCode === 'ORIGIN_STATION_SIGNOFF' ||
        result.checkCode === 'DESTINATION_STATION_SIGNOFF'
          ? result.checkCode
          : null);
      const task = taskCode ? taskByCode.get(taskCode) : undefined;
      const expiryAt =
        task?.verified_at && definition?.expiryHours
          ? new Date(
              new Date(task.verified_at).getTime() + definition.expiryHours * 60 * 60 * 1000
            ).toISOString()
          : null;
      const verificationExpired = Boolean(
        expiryAt && new Date(expiryAt).getTime() <= new Date(timestamp()).getTime()
      );
      const calculationStatus =
        result.status === 'PASS'
          ? 'PASS'
          : result.status === 'FAIL'
            ? 'FAIL'
            : result.status === 'NOT_APPLICABLE'
              ? 'NOT_APPLICABLE'
              : result.checkCode.endsWith('STATION_SIGNOFF')
                ? task?.status === 'VERIFIED'
                  ? 'PASS'
                  : 'UNKNOWN'
                : 'UNKNOWN';
      const verificationStatus = definition?.verificationRequired
        ? verificationExpired
          ? 'EXPIRED'
          : task?.status === 'REJECTED'
            ? 'REJECTED'
            : task?.status === 'VERIFIED' &&
                (!definition.approvalStages.length || approvalComplete(task.id))
              ? 'VERIFIED'
              : 'PENDING'
        : 'NOT_REQUIRED';
      const isRequired =
        Boolean(definition?.gate) && result.checkCode !== 'DESTINATION_STATION_SIGNOFF';
      const effectiveStatus =
        calculationStatus === 'NOT_APPLICABLE'
          ? 'NOT_APPLICABLE'
          : !isRequired && classification === 'INFORMATIONAL'
            ? 'WARNING'
            : calculationStatus === 'FAIL' || verificationStatus === 'REJECTED'
              ? 'BLOCKED'
              : calculationStatus === 'PASS' &&
                  (!definition?.verificationRequired || verificationStatus === 'VERIFIED')
                ? 'PASSED'
                : isRequired
                  ? 'BLOCKED'
                  : 'WARNING';
      const status =
        effectiveStatus === 'PASSED'
          ? ('PASS' as const)
          : effectiveStatus === 'NOT_APPLICABLE'
            ? ('NOT_APPLICABLE' as const)
            : calculationStatus === 'FAIL' || verificationStatus === 'REJECTED'
              ? ('FAIL' as const)
              : ('PENDING' as const);
      return {
        ...result,
        status,
        isRequired,
        classification,
        calculationStatus,
        verificationStatus,
        effectiveStatus,
        expiryAt,
        sourceRecordIds: task ? [task.id] : []
      };
    });

    for (const result of results) {
      this.sqlite
        .prepare(
          `INSERT INTO flight_readiness_checks (
            id, flight_id, check_code, check_name, status_id, is_required, evaluated_at,
            evaluated_by_user_id, result_note, source_reference, classification,
            calculation_status, verification_status, effective_status, calculated_at, expiry_at,
            source_record_ids, created_at, updated_at
          ) VALUES (
            @id, @flightId, @checkCode, @checkName, @statusId, @isRequired, @evaluatedAt,
            @actorUserId, @resultNote, @sourceReference, @classification,
            @calculationStatus, @verificationStatus, @effectiveStatus, @calculatedAt, @expiryAt,
            @sourceRecordIds, @createdAt, @updatedAt
          )
          ON CONFLICT(flight_id, check_code) DO UPDATE SET
            status_id = excluded.status_id,
            evaluated_at = excluded.evaluated_at,
            evaluated_by_user_id = excluded.evaluated_by_user_id,
            result_note = excluded.result_note,
            source_reference = excluded.source_reference,
            classification = excluded.classification,
            calculation_status = excluded.calculation_status,
            verification_status = excluded.verification_status,
            effective_status = excluded.effective_status,
            calculated_at = excluded.calculated_at,
            expiry_at = excluded.expiry_at,
            source_record_ids = excluded.source_record_ids,
            is_required = excluded.is_required,
            updated_at = excluded.updated_at`
        )
        .run({
          id: `check-${id}-${result.checkCode.toLowerCase().replaceAll('_', '-')}`,
          flightId: id,
          checkCode: result.checkCode,
          checkName: result.checkName,
          statusId: this.lookupId('readiness_statuses', result.status, 'Readiness status'),
          isRequired: result.isRequired ? 1 : 0,
          evaluatedAt: now,
          actorUserId,
          resultNote: result.resultNote,
          sourceReference: result.sourceReference,
          classification: result.classification,
          calculationStatus: result.calculationStatus,
          verificationStatus: result.verificationStatus,
          effectiveStatus: result.effectiveStatus,
          calculatedAt: now,
          expiryAt: result.expiryAt,
          sourceRecordIds: JSON.stringify(result.sourceRecordIds),
          createdAt: now,
          updatedAt: now
        });
    }

    const fail = results.find((result) => result.isRequired && result.status === 'FAIL');
    const pending = results.find((result) => result.isRequired && result.status === 'PENDING');
    const nextStatus: FlightOperationStatus = fail
      ? 'BLOCKED'
      : pending
        ? 'PENDING_READINESS'
        : 'READY_FOR_APPROVAL';

    if (
      updateStatus &&
      ['PENDING_READINESS', 'BLOCKED', 'READY_FOR_APPROVAL', 'DRAFT'].includes(flight.currentStatus)
    ) {
      this.sqlite
        .prepare(
          `UPDATE flight_operations SET current_status_id = ?, blocking_reason = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          this.lookupId('flight_operation_statuses', nextStatus, 'Flight operation status'),
          fail?.resultNote ?? null,
          now,
          id
        );
      if (nextStatus !== flight.currentStatus) {
        this.appendHistory(
          id,
          flight.currentStatus,
          nextStatus,
          nextStatus === 'BLOCKED' ? 'BLOCK' : 'READINESS_EVALUATED',
          actorUserId
        );
      }
    }

    return this.detail(id);
  }

  private calculateReadiness(id: string, flight: FlightOperationRecord) {
    const readinessDate = str(flight.scheduledDepartureAt)?.slice(0, 10) ?? flight.flightDate;
    const rows = {
      passengerManifest: this.sqlite
        .prepare(
          `SELECT m.*, status.code as status
           FROM flight_manifests m
           JOIN manifest_types type ON type.id = m.manifest_type_id
           JOIN manifest_statuses status ON status.id = m.status_id
           WHERE m.flight_operation_id = ? AND type.code = 'PASSENGER'`
        )
        .get(id) as SqlRow | undefined,
      cargoManifest: this.sqlite
        .prepare(
          `SELECT m.*, status.code as status
           FROM flight_manifests m
           JOIN manifest_types type ON type.id = m.manifest_type_id
           JOIN manifest_statuses status ON status.id = m.status_id
           WHERE m.flight_operation_id = ? AND type.code = 'CARGO'`
        )
        .get(id) as SqlRow | undefined,
      dgPending: this.sqlite
        .prepare(
          `SELECT COUNT(*) as count
         FROM flight_manifest_cargo_items i
         JOIN dg_acceptance_statuses dg_status ON dg_status.id = i.dg_acceptance_status_id
         JOIN flight_manifests m ON m.id = i.manifest_id
         WHERE m.flight_operation_id = ? AND i.dg_category_id IS NOT NULL AND dg_status.code <> 'ACCEPTED'`
        )
        .get(id) as SqlRow,
      dgTotal: this.sqlite
        .prepare(
          `SELECT COUNT(*) as count
           FROM flight_manifest_cargo_items i
           JOIN flight_manifests m ON m.id = i.manifest_id
           WHERE m.flight_operation_id = ? AND i.dg_category_id IS NOT NULL`
        )
        .get(id) as SqlRow,
      fuelPosted: this.sqlite
        .prepare(
          `SELECT COUNT(*) as count FROM flight_fuel_requests fuel
           JOIN fuel_workflow_statuses status ON status.id = fuel.status_id
           WHERE fuel.flight_id = ? AND status.code IN ('APPROVED', 'UPLIFTED', 'POSTED')`
        )
        .get(id) as SqlRow,
      handlingConfirmed: this.sqlite
        .prepare(
          `SELECT COUNT(*) as count FROM flight_station_service_requests req
           JOIN station_service_types service_type ON service_type.id = req.service_type_id
           JOIN station_service_statuses status ON status.id = req.status_id
           WHERE req.flight_id = ? AND req.station_id = ? AND service_type.code = 'HANDLING'
             AND status.code = 'CONFIRMED'`
        )
        .get(id, flight.originStationId) as SqlRow,
      crew: this.sqlite
        .prepare(
          `SELECT c.* FROM flight_crew_assignments a JOIN crews c ON c.id = a.crew_id WHERE a.flight_id = ?`
        )
        .all(id) as SqlRow[],
      aircraft: flight.aircraftId
        ? (this.sqlite
            .prepare(
              `SELECT a.*,
                      base_station.station_code as base_station_code,
                      current_station.station_code as current_station_code
               FROM aircraft a
               LEFT JOIN stations base_station ON base_station.id = a.base_station_id
               LEFT JOIN stations current_station ON current_station.id = a.current_station_id
               WHERE a.id = ?`
            )
            .get(flight.aircraftId) as SqlRow | undefined)
        : undefined,
      passengerCount: this.sqlite
        .prepare(
          `SELECT COUNT(*) as count FROM flight_manifest_passengers p
           JOIN flight_manifests m ON m.id = p.manifest_id WHERE m.flight_operation_id = ?`
        )
        .get(id) as SqlRow,
      cargoWeight: this.sqlite
        .prepare(
          `SELECT COALESCE(SUM(c.actual_weight_kg), 0) as weight
           FROM flight_manifest_cargo_items c
           JOIN flight_manifests m ON m.id = c.manifest_id WHERE m.flight_operation_id = ?`
        )
        .get(id) as SqlRow,
      requiredDocuments: this.sqlite
        .prepare(
          `SELECT COUNT(*) as count FROM flight_operation_attachments attachment
           JOIN flight_attachment_statuses status ON status.id = attachment.status_id
           WHERE attachment.flight_id = ?
             AND attachment.document_type IN ('CHARTER_REQUEST', 'FLIGHT_INSTRUCTION')
             AND status.code = 'AVAILABLE'`
        )
        .get(id) as SqlRow,
      crewConflicts: this.sqlite
        .prepare(
          `SELECT COUNT(*) as count
           FROM flight_crew_assignments current_assignment
           JOIN flight_crew_assignments other_assignment
             ON other_assignment.crew_id = current_assignment.crew_id
            AND other_assignment.flight_id <> current_assignment.flight_id
           JOIN flight_operations other ON other.id = other_assignment.flight_id
           JOIN flight_operation_statuses status ON status.id = other.current_status_id
           WHERE current_assignment.flight_id = ?
             AND status.code NOT IN ('CANCELLED', 'CLOSED')
             AND ? IS NOT NULL AND ? IS NOT NULL
             AND other.scheduled_departure_at < ?
             AND other.scheduled_arrival_at > ?`
        )
        .get(
          id,
          flight.scheduledDepartureAt,
          flight.scheduledArrivalAt,
          flight.scheduledArrivalAt,
          flight.scheduledDepartureAt
        ) as SqlRow,
      route: this.sqlite
        .prepare('SELECT restriction_level, restriction_note FROM routes WHERE id = ?')
        .get(flight.routeId) as SqlRow,
      sourceRequest: flight.flightRequestId
        ? (this.sqlite
            .prepare(
              'SELECT requested_fuel_litre, destination_handling_required, parking_required FROM flight_requests WHERE id = ?'
            )
            .get(flight.flightRequestId) as SqlRow | undefined)
        : undefined,
      readinessApprover: this.sqlite
        .prepare(
          `SELECT decided_by_user_id
           FROM flight_operation_approvals
           WHERE flight_id = ?
             AND approval_type_id = 'flight-approval-type-readiness-approval'
             AND decided_by_user_id IS NOT NULL
           LIMIT 1`
        )
        .get(id) as SqlRow | undefined
    };

    const nextMaintenanceDueAt = str(rows.aircraft?.next_maintenance_due_at ?? null);
    const maintenanceDue = Boolean(nextMaintenanceDueAt && nextMaintenanceDueAt <= readinessDate);
    const aircraftPass = flight.aircraftServiceability === 'SERVICEABLE' && !maintenanceDue;
    const aircraftCurrentStationCode = str(rows.aircraft?.current_station_code ?? null);
    const aircraftLocationPass =
      Boolean(rows.aircraft) && aircraftCurrentStationCode === flight.originStationCode;
    const aircraftCapacityPass =
      Boolean(rows.aircraft) &&
      num(rows.passengerCount.count) <= num(rows.aircraft?.passenger_capacity ?? 0) &&
      num(rows.cargoWeight.weight) <= num(rows.aircraft?.cargo_capacity_kg ?? 0);
    const crewExpiry = rows.crew.find((crew) => {
      const licence = str(crew.license_expiry_date);
      const medical = str(crew.medical_expiry_date);
      return !licence || !medical || licence < readinessDate || medical < readinessDate;
    });
    const unavailableCrew = rows.crew.find((crew) => {
      const availability = str(crew.availability_status) ?? 'AVAILABLE';
      return crewUnavailableForExistingAssignment(availability);
    });
    const passengerManifestRequired = ['SCHEDULED_PASSENGER', 'CHARTER_PASSENGER'].includes(
      flight.serviceTypeCode
    );
    const cargoManifestRequired =
      flight.serviceTypeCode === 'CHARTER_CARGO' || num(rows.cargoWeight.weight) > 0;
    const manifestRequired = passengerManifestRequired || cargoManifestRequired;
    const manifestApproved =
      (!passengerManifestRequired ||
        ['APPROVED', 'LOCKED'].includes(String(rows.passengerManifest?.status))) &&
      (!cargoManifestRequired ||
        ['APPROVED', 'LOCKED'].includes(String(rows.cargoManifest?.status)));
    const hasDangerousGoods = Number(rows.dgTotal.count) > 0;
    const dgAccepted = hasDangerousGoods && Number(rows.dgPending.count) === 0;
    const fuelRequired =
      flight.serviceTypeCode !== 'POSITIONING' ||
      num(rows.sourceRequest?.requested_fuel_litre ?? 0) > 0;
    const fuelConfirmed = Number(rows.fuelPosted.count) > 0;
    const commercialService = [
      'SCHEDULED_PASSENGER',
      'CHARTER_PASSENGER',
      'CHARTER_CARGO'
    ].includes(flight.serviceTypeCode);
    const handlingRequired = commercialService;
    const handlingConfirmed = Number(rows.handlingConfirmed.count) > 0;
    const crewConflict = num(rows.crewConflicts.count) > 0;
    const crewAvailabilityFailed = crewConflict || Boolean(unavailableCrew);
    const financeRequired =
      commercialService || (flight.serviceTypeCode === 'MEDEVAC' && Boolean(flight.customerId));
    const financeInitialized = Boolean(flight.customerId && flight.billingType);
    const documentsRequired = flight.serviceTypeCode !== 'POSITIONING';
    const documentsReady = num(rows.requiredDocuments.count) >= 2;
    const aircraftScheduleConflict = Boolean(
      flight.aircraftId &&
      this.hasScheduleOverlap(
        'aircraft_id',
        flight.aircraftId,
        flight.scheduledDepartureAt ?? undefined,
        flight.scheduledArrivalAt ?? undefined,
        id
      )
    );
    const routeBlocked = String(rows.route.restriction_level) === 'BLOCKING';
    const readinessApproverId = str(rows.readinessApprover?.decided_by_user_id ?? null);
    const separationOfDutiesPass = Boolean(
      readinessApproverId && readinessApproverId !== flight.createdByUserId
    );

    return [
      {
        checkCode: 'ROUTE_AVAILABILITY',
        checkName: 'Route availability',
        status: routeBlocked ? 'FAIL' : 'PASS',
        resultNote: routeBlocked
          ? (str(rows.route.restriction_note) ?? 'Route has a blocking operational restriction.')
          : String(rows.route.restriction_level) === 'ADVISORY'
            ? (str(rows.route.restriction_note) ?? 'Route advisory requires review.')
            : 'Route is available for scheduling.',
        sourceReference: 'routes.restriction_level'
      },
      {
        checkCode: 'AIRCRAFT_SERVICEABILITY',
        checkName: 'Aircraft serviceability',
        status: aircraftPass ? 'PASS' : 'FAIL',
        resultNote: aircraftPass
          ? 'Aircraft is serviceable and maintenance is not due.'
          : maintenanceDue
            ? `Aircraft maintenance is due on ${nextMaintenanceDueAt}.`
            : 'Aircraft is not serviceable.',
        sourceReference: flight.aircraftRegistration ?? 'aircraft'
      },
      {
        checkCode: 'AIRCRAFT_LOCATION',
        checkName: 'Aircraft location',
        status: aircraftLocationPass ? 'PASS' : 'FAIL',
        resultNote: aircraftLocationPass
          ? `Aircraft is positioned at ${flight.originStationCode}.`
          : `Aircraft current station ${aircraftCurrentStationCode ?? 'unknown'} does not match departure station ${flight.originStationCode}.`,
        sourceReference: 'aircraft.current_station_id'
      },
      {
        checkCode: 'AIRCRAFT_SCHEDULE',
        checkName: 'Aircraft schedule availability',
        status: aircraftScheduleConflict ? 'FAIL' : 'PASS',
        resultNote: aircraftScheduleConflict
          ? 'Aircraft is assigned to another overlapping flight.'
          : 'No overlapping aircraft assignment was found.',
        sourceReference: 'flight_operations.aircraft_id'
      },
      {
        checkCode: 'AIRCRAFT_CAPACITY',
        checkName: 'Aircraft capacity',
        status: aircraftCapacityPass ? 'PASS' : 'FAIL',
        resultNote: aircraftCapacityPass
          ? 'Passenger and cargo load are within aircraft capacity.'
          : 'Manifest load exceeds the selected aircraft capacity.',
        sourceReference: 'flight_manifests'
      },
      {
        checkCode: 'CREW_AVAILABILITY',
        checkName: 'Crew availability',
        status: crewAvailabilityFailed ? 'FAIL' : rows.crew.length > 0 ? 'PASS' : 'PENDING',
        resultNote: crewConflict
          ? 'A crew member is assigned to another overlapping flight.'
          : unavailableCrew
            ? `${String(unavailableCrew.full_name)} availability is ${String(unavailableCrew.availability_status)}.`
            : rows.crew.length > 0
              ? 'Assigned crew are available for this flight.'
              : 'Crew assignment is pending.',
        sourceReference: crewAvailabilityFailed
          ? 'crews.availability_status'
          : 'flight_crew_assignments'
      },
      {
        checkCode: 'CREW_LICENSE_MEDICAL',
        checkName: 'Crew license and medical',
        status: crewExpiry ? 'FAIL' : rows.crew.length > 0 ? 'PASS' : 'PENDING',
        resultNote: crewExpiry
          ? `${String(crewExpiry.full_name)} has expired licence or medical document.`
          : 'Crew licence and medical dates are valid.',
        sourceReference: 'crews'
      },
      {
        checkCode: 'MANIFEST_APPROVED',
        checkName: 'Manifest approved',
        status: !manifestRequired ? 'NOT_APPLICABLE' : manifestApproved ? 'PASS' : 'PENDING',
        resultNote: !manifestRequired
          ? 'Commercial manifests are not required for this service type.'
          : manifestApproved
            ? 'Required manifests are approved.'
            : 'Required manifest approval is pending.',
        sourceReference: 'flight_manifests'
      },
      {
        checkCode: 'DG_ACCEPTANCE',
        checkName: 'Dangerous goods acceptance',
        status: !hasDangerousGoods ? 'NOT_APPLICABLE' : dgAccepted ? 'PASS' : 'PENDING',
        resultNote: !hasDangerousGoods
          ? 'No dangerous goods cargo is present.'
          : dgAccepted
            ? 'All dangerous goods cargo has been accepted.'
            : 'Dangerous goods cargo requires acceptance.',
        sourceReference: 'flight_manifest_cargo_items'
      },
      {
        checkCode: 'FUEL_CONFIRMED',
        checkName: 'Fuel confirmed',
        status: !fuelRequired ? 'NOT_APPLICABLE' : fuelConfirmed ? 'PASS' : 'PENDING',
        resultNote: !fuelRequired
          ? 'No fuel uplift is requested for this positioning flight.'
          : fuelConfirmed
            ? 'Fuel uplift or post exists.'
            : 'Fuel confirmation is pending.',
        sourceReference: 'flight_fuel_requests'
      },
      {
        checkCode: 'HANDLING_CONFIRMED',
        checkName: 'Handling confirmed',
        status: !handlingRequired ? 'NOT_APPLICABLE' : handlingConfirmed ? 'PASS' : 'PENDING',
        resultNote: !handlingRequired
          ? 'Commercial station handling is not required for this service type.'
          : handlingConfirmed
            ? 'Station service confirmed.'
            : 'Handling or parking confirmation pending.',
        sourceReference: 'flight_station_service_requests'
      },
      {
        checkCode: 'FINANCE_INITIALIZED',
        checkName: 'Finance tracking initialized',
        status: !financeRequired ? 'NOT_APPLICABLE' : financeInitialized ? 'PASS' : 'PENDING',
        resultNote: !financeRequired
          ? 'Commercial billing is not required for this service type.'
          : financeInitialized
            ? 'Customer and billing tracking are initialized.'
            : 'Customer or billing type is incomplete.',
        sourceReference: 'flight_operations'
      },
      {
        checkCode: 'REQUIRED_DOCUMENTS',
        checkName: 'Required documents',
        status: !documentsRequired ? 'NOT_APPLICABLE' : documentsReady ? 'PASS' : 'PENDING',
        resultNote: !documentsRequired
          ? 'Commercial request documents are not required for positioning.'
          : documentsReady
            ? 'Charter request and flight instruction are available.'
            : 'Required operational documents are missing.',
        sourceReference: 'flight_operation_attachments'
      },
      {
        checkCode: 'SEPARATION_OF_DUTIES',
        checkName: 'Separation of duties',
        status: !readinessApproverId ? 'NOT_APPLICABLE' : separationOfDutiesPass ? 'PASS' : 'FAIL',
        resultNote: !readinessApproverId
          ? 'Separation of duties will be evaluated when an approver decides.'
          : separationOfDutiesPass
            ? 'The readiness approver is different from the flight creator.'
            : 'The readiness approver must be different from the flight creator.',
        sourceReference: 'flight_operation_approvals.decided_by_user_id'
      }
    ] as Array<{
      checkCode: string;
      checkName: string;
      status: 'PENDING' | 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
      resultNote: string;
      sourceReference: string;
    }>;
  }

  private listManifests(id: string): FlightManifestDto[] {
    return (
      this.sqlite
        .prepare(
          `SELECT m.*, type.code as manifest_type, status.code as status,
         (SELECT COUNT(*) FROM flight_manifest_passengers p WHERE p.manifest_id = m.id) as passenger_count,
         (SELECT COALESCE(SUM(COALESCE(p.weight_kg, 0) + COALESCE(p.baggage_weight_kg, 0)), 0) FROM flight_manifest_passengers p WHERE p.manifest_id = m.id) as passenger_weight_kg,
         (SELECT COUNT(*) FROM flight_manifest_cargo_items c WHERE c.manifest_id = m.id) as cargo_count,
         (SELECT COALESCE(SUM(c.actual_weight_kg), 0) FROM flight_manifest_cargo_items c WHERE c.manifest_id = m.id) as cargo_actual_weight_kg,
         (SELECT COUNT(*) FROM flight_manifest_cargo_items c JOIN dg_acceptance_statuses dg_status ON dg_status.id = c.dg_acceptance_status_id WHERE c.manifest_id = m.id AND dg_status.code = 'PENDING') as dg_pending_count,
         (SELECT COUNT(*) FROM flight_manifest_cargo_items c JOIN dg_acceptance_statuses dg_status ON dg_status.id = c.dg_acceptance_status_id WHERE c.manifest_id = m.id AND dg_status.code = 'REJECTED') as dg_rejected_count
       FROM flight_manifests m
       JOIN manifest_types type ON type.id = m.manifest_type_id
       JOIN manifest_statuses status ON status.id = m.status_id
       WHERE m.flight_operation_id = ? ORDER BY type.sort_order`
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightOperationId: String(row.flight_operation_id),
      manifestType: String(row.manifest_type) as FlightManifestDto['manifestType'],
      status: String(row.status) as FlightManifestDto['status'],
      passengerCount: num(row.passenger_count),
      passengerWeightKg: num(row.passenger_weight_kg),
      cargoCount: num(row.cargo_count),
      cargoActualWeightKg: num(row.cargo_actual_weight_kg),
      dgPendingCount: num(row.dg_pending_count),
      dgRejectedCount: num(row.dg_rejected_count)
    }));
  }

  private listPassengers(id: string) {
    return (
      this.sqlite
        .prepare(
          `SELECT p.* FROM flight_manifest_passengers p
       JOIN flight_manifests m ON m.id = p.manifest_id
       WHERE m.flight_operation_id = ?
       ORDER BY p.seat_number, p.full_name`
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      manifestId: String(row.manifest_id),
      fullName: String(row.full_name),
      identityType: str(row.identity_type),
      identityNumber: str(row.identity_number),
      weightKg: nullableNum(row.weight_kg),
      seatNumber: str(row.seat_number),
      baggageWeightKg: nullableNum(row.baggage_weight_kg),
      remarks: str(row.remarks)
    }));
  }

  private listCargo(id: string): FlightManifestCargoDto[] {
    return (
      this.sqlite
        .prepare(
          `SELECT c.*, dg_status.code as dg_acceptance_status, dg.dg_code,
          dg.description as dg_description
       FROM flight_manifest_cargo_items c
       JOIN flight_manifests m ON m.id = c.manifest_id
       JOIN dg_acceptance_statuses dg_status ON dg_status.id = c.dg_acceptance_status_id
       LEFT JOIN dg_categories dg ON dg.id = c.dg_category_id
       WHERE m.flight_operation_id = ?
       ORDER BY c.description`
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      manifestId: String(row.manifest_id),
      description: String(row.description),
      senderName: str(row.sender_name),
      receiverName: str(row.receiver_name),
      actualWeightKg: num(row.actual_weight_kg),
      volumeWeightKg: nullableNum(row.volume_weight_kg),
      chargeableWeightKg: nullableNum(row.chargeable_weight_kg),
      dgCategoryId: str(row.dg_category_id),
      dgCategoryLabel: row.dg_code
        ? `${String(row.dg_code)} - ${String(row.dg_description)}`
        : null,
      dgAcceptanceStatus: String(
        row.dg_acceptance_status
      ) as FlightManifestCargoDto['dgAcceptanceStatus'],
      remarks: str(row.remarks)
    }));
  }

  private listFinanceHandoffs(id: string): FlightFinanceHandoffDto[] {
    return (
      this.sqlite
        .prepare(
          `SELECT h.*, event_type.code as event_type, status.code as status, c.currency_code
       FROM flight_finance_handoffs h
       JOIN finance_event_types event_type ON event_type.id = h.event_type_id
       JOIN finance_handoff_statuses status ON status.id = h.status_id
       LEFT JOIN currencies c ON c.id = h.currency_id
       WHERE h.flight_id = ?
       ORDER BY h.created_at DESC`
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: String(row.flight_id),
      sourceType: String(row.source_type),
      sourceId: str(row.source_id),
      eventType: String(row.event_type) as FlightFinanceHandoffDto['eventType'],
      status: String(row.status) as FlightFinanceHandoffDto['status'],
      summary: String(row.summary),
      amount: nullableNum(row.amount),
      currencyId: str(row.currency_id),
      currencyCode: str(row.currency_code),
      createdAt: String(row.created_at)
    }));
  }

  private listFlightApprovals(id: string): FlightApprovalDto[] {
    return (
      this.sqlite
        .prepare(
          `SELECT approval.*, type.code as approval_type, status.code as status
           FROM flight_operation_approvals approval
           JOIN flight_approval_types type ON type.id = approval.approval_type_id
           JOIN flight_approval_statuses status ON status.id = approval.status_id
           WHERE approval.flight_id = ?
           ORDER BY CASE type.code
             WHEN 'READINESS_APPROVAL' THEN 1
             WHEN 'FLIGHT_APPROVAL' THEN 2
             WHEN 'CLOSURE_APPROVAL' THEN 3
             ELSE 4 END`
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: String(row.flight_id),
      approvalType: String(row.approval_type) as FlightApprovalDto['approvalType'],
      status: String(row.status) as FlightApprovalDto['status'],
      requestedByUserId: str(row.requested_by_user_id),
      assignedRole: String(row.assigned_role),
      decidedByUserId: str(row.decided_by_user_id),
      requestedAt: str(row.requested_at),
      decidedAt: str(row.decided_at),
      reason: str(row.reason),
      affectedSection: str(row.affected_section),
      requiredCorrection: str(row.required_correction)
    }));
  }

  private listFlightAttachments(id: string): FlightAttachmentDto[] {
    return (
      this.sqlite
        .prepare(
          `SELECT attachment.*, status.code as status
           FROM flight_operation_attachments attachment
           JOIN flight_attachment_statuses status ON status.id = attachment.status_id
           WHERE attachment.flight_id = ? ORDER BY attachment.document_type`
        )
        .all(id) as SqlRow[]
    ).map((row) => ({
      id: String(row.id),
      flightId: String(row.flight_id),
      documentType: String(row.document_type),
      fileName: String(row.file_name),
      status: String(row.status) as FlightAttachmentDto['status'],
      uploadedAt: str(row.uploaded_at)
    }));
  }

  private upsertFinanceHandoff(
    flightId: string,
    sourceType: string,
    sourceId: string | null,
    eventType: string,
    status: string,
    summary: string,
    amount: number | null,
    currencyId: string | null
  ) {
    const existing = this.sqlite
      .prepare(
        `SELECT id FROM flight_finance_handoffs
         WHERE flight_id = ? AND source_type = ? AND source_id IS ? AND event_type_id = ?`
      )
      .get(
        flightId,
        sourceType,
        sourceId,
        this.lookupId('finance_event_types', eventType, 'Finance event type')
      ) as SqlRow | undefined;
    if (existing) {
      this.sqlite
        .prepare(
          `UPDATE flight_finance_handoffs SET status_id = ?, summary = ?, amount = ?, currency_id = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          this.lookupId('finance_handoff_statuses', status, 'Finance handoff status'),
          summary,
          amount,
          currencyId,
          timestamp(),
          existing.id
        );
      return;
    }
    this.sqlite
      .prepare(
        `INSERT INTO flight_finance_handoffs (
          id, flight_id, source_type, source_id, event_type_id, status_id, summary, amount,
          currency_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `handoff-${nanoid(10)}`,
        flightId,
        sourceType,
        sourceId,
        this.lookupId('finance_event_types', eventType, 'Finance event type'),
        this.lookupId('finance_handoff_statuses', status, 'Finance handoff status'),
        summary,
        amount,
        currencyId,
        timestamp(),
        timestamp()
      );
  }
}
