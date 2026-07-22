import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';
import type {
  AvailableTicketingFlightDto,
  AvailableTicketingFlightsQuery,
  TicketingOccFlightDto,
  TicketingSalesOpeningDto,
  TicketingCargoPriceBasis,
  TicketingServiceType
} from '../../../../shared/features/ticketing/sales';
import { getApplicationNow } from '../../../utils/time';

type AvailableFlightRow = AvailableTicketingFlightDto;

type OccFlightRow = {
  flightOperationId: string;
  orderNumber: string;
  flightNumber: string;
  flightDate: string;
  flightType: string;
  serviceType: string;
  operationStatus: string;
  routeId: string;
  originCode: string;
  destinationCode: string;
  customerId: string | null;
  customerName: string | null;
  aircraftId: string | null;
  aircraftRegistration: string | null;
  aircraftOperationalStatus: string | null;
  aircraftServiceabilityStatus: string | null;
  pilotInCommandId: string | null;
  pilotInCommandName: string | null;
  pilotIsActive: number | null;
  pilotAvailabilityStatus: string | null;
  pilotLicenseExpiryDate: string | null;
  pilotMedicalExpiryDate: string | null;
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
  estimatedRevenue: number | null;
  currencyCode: string;
  salesId: string | null;
  salesServiceType: TicketingServiceType | null;
  salesOpenedAt: string | null;
};

export type TicketingRateRecord = {
  id: string;
  baseRate: number;
  minimumCharge: number | null;
  cargoPriceBasis: TicketingCargoPriceBasis | null;
  currencyCode: string;
  taxCodeId: string | null;
  taxCode: string | null;
  taxRateBasisPoints: number;
};

const availableFlightSelect = `
  SELECT
    operation.id AS flightOperationId,
    operation.flight_number AS flightNumber,
    operation.scheduled_departure_at AS scheduledDeparture,
    operation.scheduled_arrival_at AS scheduledArrival,
    ts.service_type AS serviceType,
    r.id AS routeId,
    origin.id AS originStationId,
    origin.station_code AS originCode,
    origin.station_name AS originName,
    destination.id AS destinationStationId,
    destination.station_code AS destinationCode,
    destination.station_name AS destinationName,
    a.id AS aircraftId,
    a.registration_number AS aircraftRegistration,
    a.passenger_capacity AS passengerCapacity,
    a.cargo_capacity_kg AS cargoCapacityKg,
    rc.base_rate AS baseRate,
    rc.minimum_charge AS minimumCharge,
    rc.cargo_price_basis AS cargoPriceBasis,
    rc.id AS rateCardId,
    currency.currency_code AS currencyCode,
    rc.tax_code_id AS taxCodeId,
    tax.tax_code AS taxCode,
    COALESCE(tax.tax_rate_basis_points, 0) AS taxRateBasisPoints
  FROM ticketing_sales ts
  JOIN flight_operations operation ON operation.id = ts.flight_operation_id
  JOIN flight_operation_statuses operation_status ON operation_status.id = operation.current_status_id
  JOIN routes r ON r.id = operation.route_id
  JOIN stations origin ON origin.id = r.origin_station_id
  JOIN stations destination ON destination.id = r.destination_station_id
  JOIN aircraft a ON a.id = operation.aircraft_id
  JOIN rate_cards rc ON rc.id = (
    SELECT candidate.id
    FROM rate_cards candidate
    WHERE candidate.service_type = ts.service_type
      AND candidate.origin_station_id = r.origin_station_id
      AND candidate.destination_station_id = r.destination_station_id
      AND candidate.customer_id IS NULL
      AND candidate.is_active = 1
      AND candidate.effective_from <= substr(operation.scheduled_departure_at, 1, 10)
      AND (candidate.effective_to IS NULL OR candidate.effective_to >= substr(operation.scheduled_departure_at, 1, 10))
    ORDER BY candidate.rate_priority ASC, candidate.effective_from DESC
    LIMIT 1
  )
  JOIN currencies currency ON currency.id = rc.currency_id
  LEFT JOIN tax_codes tax ON tax.id = rc.tax_code_id
`;

export class TicketingSalesRepository {
  constructor(private readonly sqlite: Database.Database) {}

  listAvailable(query: AvailableTicketingFlightsQuery): AvailableTicketingFlightDto[] {
    const referenceNow = getApplicationNow();
    const conditions = [
      "operation_status.code IN ('SCHEDULED', 'CHECK_IN_OPEN')",
      'julianday(operation.scheduled_departure_at) > julianday(?)',
      'ts.service_type = ?'
    ];
    const parameters: string[] = [referenceNow, query.serviceType];
    if (query.originStationId) {
      conditions.push('r.origin_station_id = ?');
      parameters.push(query.originStationId);
    }
    if (query.destinationStationId) {
      conditions.push('r.destination_station_id = ?');
      parameters.push(query.destinationStationId);
    }
    return this.sqlite
      .prepare(
        `${availableFlightSelect}
         WHERE ${conditions.join(' AND ')}
         ORDER BY operation.scheduled_departure_at ASC`
      )
      .all(...parameters) as AvailableTicketingFlightDto[];
  }

  getBookableFlight(
    flightOperationId: string,
    serviceType: TicketingServiceType
  ): AvailableFlightRow | null {
    const referenceNow = getApplicationNow();
    return (
      (this.sqlite
        .prepare(
          `${availableFlightSelect}
           WHERE operation.id = ?
             AND ts.service_type = ?
             AND operation_status.code IN ('SCHEDULED', 'CHECK_IN_OPEN')
             AND julianday(operation.scheduled_departure_at) > julianday(?)`
        )
        .get(flightOperationId, serviceType, referenceNow) as AvailableFlightRow | undefined) ??
      null
    );
  }

  getActiveRate(
    routeId: string,
    serviceType: TicketingServiceType,
    scheduledDeparture: string
  ): TicketingRateRecord | null {
    return (
      (this.sqlite
        .prepare(
          `SELECT rc.id, rc.base_rate AS baseRate, rc.minimum_charge AS minimumCharge,
                  rc.cargo_price_basis AS cargoPriceBasis,
                  currency.currency_code AS currencyCode,
                  rc.tax_code_id AS taxCodeId, tax.tax_code AS taxCode,
                  COALESCE(tax.tax_rate_basis_points, 0) AS taxRateBasisPoints
           FROM rate_cards rc
           JOIN routes r ON r.id = ?
           JOIN currencies currency ON currency.id = rc.currency_id
           LEFT JOIN tax_codes tax ON tax.id = rc.tax_code_id
           WHERE rc.service_type = ?
             AND rc.origin_station_id = r.origin_station_id
             AND rc.destination_station_id = r.destination_station_id
             AND rc.customer_id IS NULL
             AND rc.is_active = 1
             AND rc.effective_from <= substr(?, 1, 10)
             AND (rc.effective_to IS NULL OR rc.effective_to >= substr(?, 1, 10))
           ORDER BY rc.rate_priority ASC, rc.effective_from DESC
           LIMIT 1`
        )
        .get(routeId, serviceType, scheduledDeparture, scheduledDeparture) as
        TicketingRateRecord | undefined) ?? null
    );
  }

  listOccFlights(): OccFlightRow[] {
    return this.sqlite
      .prepare(
        `SELECT
           f.id AS flightOperationId,
           f.order_number AS orderNumber,
           f.flight_number AS flightNumber,
           f.flight_date AS flightDate,
           flight_type.code AS flightType,
           service_type.code AS serviceType,
           operation_status.code AS operationStatus,
           f.route_id AS routeId,
           origin.station_code AS originCode,
           destination.station_code AS destinationCode,
           f.customer_id AS customerId,
           customer.account_name AS customerName,
           f.aircraft_id AS aircraftId,
           aircraft.registration_number AS aircraftRegistration,
           aircraft.operational_status AS aircraftOperationalStatus,
           aircraft.serviceability_status AS aircraftServiceabilityStatus,
           f.pilot_in_command_id AS pilotInCommandId,
           crew.full_name AS pilotInCommandName,
           crew.is_active AS pilotIsActive,
           crew.availability_status AS pilotAvailabilityStatus,
           crew.license_expiry_date AS pilotLicenseExpiryDate,
           crew.medical_expiry_date AS pilotMedicalExpiryDate,
           f.scheduled_departure_at AS scheduledDeparture,
           f.scheduled_arrival_at AS scheduledArrival,
           f.estimated_revenue AS estimatedRevenue,
           f.currency_code AS currencyCode,
           sale.id AS salesId,
           sale.service_type AS salesServiceType,
           sale.opened_at AS salesOpenedAt
         FROM flight_operations f
         JOIN flight_types flight_type ON flight_type.id = f.flight_type_id
         JOIN flight_service_types service_type ON service_type.id = f.service_type_id
         JOIN flight_operation_statuses operation_status ON operation_status.id = f.current_status_id
         JOIN stations origin ON origin.id = f.origin_station_id
         JOIN stations destination ON destination.id = f.destination_station_id
         LEFT JOIN customers customer ON customer.id = f.customer_id
         LEFT JOIN aircraft aircraft ON aircraft.id = f.aircraft_id
         LEFT JOIN crews crew ON crew.id = f.pilot_in_command_id
         LEFT JOIN ticketing_sales sale ON sale.flight_operation_id = f.id
         ORDER BY f.flight_date DESC, f.scheduled_departure_at DESC`
      )
      .all() as OccFlightRow[];
  }

  getOccFlight(flightOperationId: string): OccFlightRow | null {
    return (
      this.listOccFlights().find((flight) => flight.flightOperationId === flightOperationId) ?? null
    );
  }

  openSales(
    flight: OccFlightRow,
    serviceType: TicketingServiceType,
    actorId: string,
    timestamp: string
  ): TicketingSalesOpeningDto {
    const salesId = `ticket-sale-${nanoid(12)}`;
    const open = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO ticketing_sales (
             id, flight_operation_id, service_type, opened_by_user_id, opened_at
           ) VALUES (?, ?, ?, ?, ?)`
        )
        .run(salesId, flight.flightOperationId, serviceType, actorId, timestamp);
    });
    open();
    return {
      id: salesId,
      flightOperationId: flight.flightOperationId,
      flightNumber: flight.flightNumber,
      serviceType,
      openedAt: timestamp
    };
  }
}

export function ticketingServiceTypeForFlight(flight: OccFlightRow): TicketingServiceType {
  return flight.flightType === 'CARGO' || flight.serviceType.includes('CARGO')
    ? 'CARGO'
    : 'PASSENGER';
}

export function toOccFlightDto(flight: OccFlightRow, blockers: string[]): TicketingOccFlightDto {
  const ticketingServiceType = ticketingServiceTypeForFlight(flight);
  return {
    flightOperationId: flight.flightOperationId,
    orderNumber: flight.orderNumber,
    flightNumber: flight.flightNumber,
    flightDate: flight.flightDate,
    flightType: flight.flightType,
    serviceType: flight.serviceType,
    operationStatus: flight.operationStatus,
    routeId: flight.routeId,
    originCode: flight.originCode,
    destinationCode: flight.destinationCode,
    customerName: flight.customerName,
    aircraftRegistration: flight.aircraftRegistration,
    pilotInCommandName: flight.pilotInCommandName,
    scheduledDeparture: flight.scheduledDeparture,
    scheduledArrival: flight.scheduledArrival,
    sales:
      flight.salesId && flight.salesServiceType && flight.salesOpenedAt
        ? {
            id: flight.salesId,
            flightOperationId: flight.flightOperationId,
            flightNumber: flight.flightNumber,
            serviceType: flight.salesServiceType,
            openedAt: flight.salesOpenedAt
          }
        : null,
    ticketingServiceType,
    canOpenSales: blockers.length === 0,
    blockers
  };
}
