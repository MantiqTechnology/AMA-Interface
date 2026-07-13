import type { AlertDto } from '../../shared/contracts/alerts';
import type { ApprovalDto } from '../../shared/contracts/approvals';
import type {
  AircraftDto,
  CustomerDto,
  FlightDetailDto,
  FlightSummaryDto,
  StationDto
} from '../../shared/contracts/flights';
import type { FuelRequestDto, FuelUpliftDto } from '../../shared/contracts/fuel';
import type {
  InvoiceDetailDto,
  InvoiceSummaryDto,
  PaymentDto
} from '../../shared/contracts/invoices';
import type {
  MaintenanceWorkOrderDto,
  SerializedPartDto
} from '../../shared/contracts/maintenance';
import type { StationExpenseDto } from '../../shared/contracts/station-expenses';
import type {
  AircraftRecord,
  AlertRecord,
  ApprovalRecord,
  CustomerRecord,
  FuelRequestRecord,
  FuelUpliftRecord,
  InvoiceRecord,
  MaintenanceWorkOrderRecord,
  ManifestRecord,
  PaymentRecord,
  SerializedPartRecord,
  StationExpenseRecord,
  StationRecord
} from '../db/schema';
import type { FlightJoinedRecord } from '../repositories/interfaces';

function aircraftStatus(row: AircraftRecord): AircraftDto['status'] {
  if (row.serviceabilityStatus === 'UNSERVICEABLE') return 'grounded';
  if (row.operationalStatus !== 'ACTIVE' || row.serviceabilityStatus === 'MAINTENANCE_DUE') {
    return 'in_maintenance';
  }

  return 'available';
}

function customerType(row: CustomerRecord): CustomerDto['type'] {
  if (row.accountType === 'GOVERNMENT') return 'government';
  if (row.accountType === 'INDIVIDUAL') return 'charter';
  return 'charter';
}

function kmToNm(distanceKm: number) {
  return Math.max(1, Math.round(distanceKm * 0.539957));
}

export function mapAircraft(row: AircraftRecord): AircraftDto {
  return {
    id: row.id,
    tailNumber: row.registrationNumber,
    type: row.aircraftType,
    displayName: `${row.registrationNumber} - ${row.manufacturer} ${row.model}`,
    capacity: row.passengerCapacity,
    status: aircraftStatus(row)
  };
}

export function mapStation(row: StationRecord): StationDto {
  return {
    id: row.id,
    code: row.stationCode,
    name: row.stationName,
    province: row.province,
    isActive: row.isActive
  };
}

export function mapCustomer(row: CustomerRecord): CustomerDto {
  return {
    id: row.id,
    name: row.accountName,
    type: customerType(row),
    contactEmail: row.email ?? `${row.accountCode.toLowerCase()}@demo.invalid`
  };
}

export function mapFlightSummary(row: FlightJoinedRecord): FlightSummaryDto {
  return {
    id: row.flight.id,
    flightNumber: row.flight.flightNumber,
    orderNumber: row.flight.orderNumber,
    status: row.flight.status,
    scheduledDeparture: row.flight.scheduledDeparture,
    scheduledArrival: row.flight.scheduledArrival,
    customer: mapCustomer(row.customer),
    aircraft: mapAircraft(row.aircraft),
    route: {
      id: row.route.id,
      origin: mapStation(row.origin),
      destination: mapStation(row.destination),
      distanceNm: kmToNm(row.route.distanceKm),
      estimatedBlockMinutes: row.route.estimatedDurationMinutes
    },
    manifestCount: row.manifestCount,
    quotedAmount: row.flight.quotedAmount,
    currency: row.flight.currency
  };
}

export function mapManifest(row: ManifestRecord) {
  return {
    id: row.id,
    passengerName: row.passengerName,
    documentNumber: row.documentNumber,
    seatNumber: row.seatNumber,
    weightKg: row.weightKg,
    remarks: row.remarks
  };
}

export function mapFlightDetail(
  row: FlightJoinedRecord,
  manifest: ManifestRecord[]
): FlightDetailDto {
  return {
    ...mapFlightSummary(row),
    purpose: row.flight.purpose,
    manifest: manifest.map(mapManifest)
  };
}

export function mapFuelRequest(
  row: FuelRequestRecord,
  flight: FlightJoinedRecord,
  station: StationRecord,
  aircraftRecord: AircraftRecord
): FuelRequestDto {
  return {
    id: row.id,
    status: row.status as FuelRequestDto['status'],
    requestedLiters: row.requestedLiters,
    requestedBy: row.requestedBy,
    requiredAt: row.requiredAt,
    notes: row.notes,
    flight: mapFlightSummary(flight),
    station: mapStation(station),
    aircraft: mapAircraft(aircraftRecord)
  };
}

export function mapFuelUplift(row: FuelUpliftRecord): FuelUpliftDto {
  return {
    id: row.id,
    fuelRequestId: row.fuelRequestId,
    supplier: row.supplier,
    liters: row.liters,
    unitPrice: row.unitPrice,
    total: row.total,
    currency: row.currency,
    upliftedAt: row.upliftedAt,
    receiptPath: row.receiptPath
  };
}

export function mapStationExpense(
  row: StationExpenseRecord,
  station: StationRecord,
  flight: FlightJoinedRecord | null
): StationExpenseDto {
  return {
    id: row.id,
    category: row.category as StationExpenseDto['category'],
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    status: row.status as StationExpenseDto['status'],
    receiptPath: row.receiptPath,
    incurredAt: row.incurredAt,
    submittedBy: row.submittedBy,
    station: mapStation(station),
    flight: flight ? mapFlightSummary(flight) : null
  };
}

export function mapPayment(row: PaymentRecord): PaymentDto {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    amount: row.amount,
    currency: row.currency,
    paidAt: row.paidAt,
    method: row.method as PaymentDto['method'],
    reference: row.reference
  };
}

export function mapInvoiceSummary(
  row: InvoiceRecord,
  flight: FlightJoinedRecord
): InvoiceSummaryDto {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    status: row.status as InvoiceSummaryDto['status'],
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    currency: row.currency,
    issuedAt: row.issuedAt,
    dueAt: row.dueAt,
    customer: mapCustomer(flight.customer),
    flight: mapFlightSummary(flight)
  };
}

export function mapInvoiceDetail(
  row: InvoiceRecord,
  flight: FlightJoinedRecord,
  payments: PaymentRecord[]
): InvoiceDetailDto {
  const mappedPayments = payments.map(mapPayment);
  const paid = mappedPayments.reduce((total, payment) => total + payment.amount, 0);

  return {
    ...mapInvoiceSummary(row, flight),
    payments: mappedPayments,
    balanceDue: Math.max(row.total - paid, 0)
  };
}

export function mapApproval(row: ApprovalRecord): ApprovalDto {
  return {
    id: row.id,
    domainEntity: row.domainEntity as ApprovalDto['domainEntity'],
    entityId: row.entityId,
    requestedBy: row.requestedBy,
    roleRequired: row.roleRequired as ApprovalDto['roleRequired'],
    status: row.status,
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt,
    reason: row.reason,
    createdAt: row.createdAt
  };
}

export function mapSerializedPart(row: SerializedPartRecord): SerializedPartDto {
  return {
    id: row.id,
    aircraftId: row.aircraftId,
    partNumber: row.partNumber,
    serialNumber: row.serialNumber,
    description: row.description,
    status: row.status as SerializedPartDto['status'],
    installedAt: row.installedAt,
    workOrderId: row.workOrderId
  };
}

export function mapMaintenanceWorkOrder(
  row: MaintenanceWorkOrderRecord,
  aircraftRecord: AircraftRecord,
  parts: SerializedPartRecord[]
): MaintenanceWorkOrderDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority as MaintenanceWorkOrderDto['priority'],
    status: row.status as MaintenanceWorkOrderDto['status'],
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    dueAt: row.dueAt,
    aircraft: mapAircraft(aircraftRecord),
    parts: parts.map(mapSerializedPart)
  };
}

export function mapAlert(row: AlertRecord): AlertDto {
  return {
    id: row.id,
    severity: row.severity as AlertDto['severity'],
    title: row.title,
    message: row.message,
    entityType: row.entityType,
    entityId: row.entityId,
    isRead: row.isRead,
    createdAt: row.createdAt
  };
}
