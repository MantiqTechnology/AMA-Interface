import type {
  AvailableTicketingFlightsQuery,
  OpenTicketingSalesInput
} from '../../../../shared/features/ticketing/sales';
import { DomainError, notFound } from '../../../utils/errors';
import {
  TicketingSalesRepository,
  ticketingServiceTypeForFlight,
  toOccFlightDto
} from './repository';

export class TicketingSalesService {
  constructor(private readonly repository: TicketingSalesRepository) {}

  availableFlights(query: AvailableTicketingFlightsQuery) {
    return this.repository.listAvailable(query);
  }

  listOccFlights() {
    return this.repository
      .listOccFlights()
      .map((flight) => toOccFlightDto(flight, this.blockersFor(flight)));
  }

  open(input: OpenTicketingSalesInput, actorId: string) {
    const flight = this.repository.getOccFlight(input.flightOperationId);
    if (!flight) throw notFound('Flight operation', input.flightOperationId);
    const blockers = this.blockersFor(flight);
    if (blockers.length > 0) {
      throw new DomainError(
        'TICKETING_SALES_NOT_READY',
        'Ticket sales cannot be opened for this flight.',
        422,
        { blockers }
      );
    }
    const serviceType = ticketingServiceTypeForFlight(flight);
    const rate = this.repository.getActiveRate(
      flight.routeId,
      serviceType,
      flight.scheduledDeparture!
    );
    if (!rate) {
      throw new DomainError(
        'TICKETING_RATE_NOT_FOUND',
        `No active ${serviceType.toLowerCase()} rate is configured for this route.`,
        422
      );
    }
    try {
      return this.repository.openSales(
        flight,
        serviceType,
        actorId,
        rate,
        new Date().toISOString()
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('ticketing_sales.flight_operation_id')) {
        throw new DomainError(
          'TICKETING_SALES_ALREADY_OPEN',
          'Ticket sales are already open for this flight.',
          409
        );
      }
      if (message.includes('flight_orders.flight_number')) {
        throw new DomainError(
          'TICKETING_FLIGHT_ALREADY_EXISTS',
          'A commercial flight with this flight number already exists.',
          409
        );
      }
      throw error;
    }
  }

  private blockersFor(flight: ReturnType<TicketingSalesRepository['listOccFlights']>[number]) {
    const blockers: string[] = [];
    if (flight.salesId) blockers.push('SALES_ALREADY_OPEN');
    if (!flight.aircraftId) blockers.push('AIRCRAFT_NOT_ASSIGNED');
    if (!flight.pilotInCommandId) blockers.push('PILOT_NOT_ASSIGNED');
    if (
      flight.pilotInCommandId &&
      (flight.pilotIsActive !== 1 ||
        !['AVAILABLE', 'ON_DUTY'].includes(flight.pilotAvailabilityStatus ?? ''))
    ) {
      blockers.push('PILOT_UNAVAILABLE');
    }
    if (
      flight.pilotInCommandId &&
      flight.scheduledDeparture &&
      (!flight.pilotLicenseExpiryDate ||
        !flight.pilotMedicalExpiryDate ||
        flight.pilotLicenseExpiryDate < flight.scheduledDeparture.slice(0, 10) ||
        flight.pilotMedicalExpiryDate < flight.scheduledDeparture.slice(0, 10))
    ) {
      blockers.push('PILOT_QUALIFICATION_EXPIRED');
    }
    if (!flight.customerId) blockers.push('CUSTOMER_NOT_ASSIGNED');
    if (!flight.scheduledDeparture || !flight.scheduledArrival)
      blockers.push('SCHEDULE_INCOMPLETE');
    if (
      flight.aircraftOperationalStatus !== 'ACTIVE' ||
      flight.aircraftServiceabilityStatus === 'UNSERVICEABLE'
    ) {
      blockers.push('AIRCRAFT_UNAVAILABLE');
    }
    if (!['SCHEDULED', 'CHECK_IN_OPEN'].includes(flight.operationStatus)) {
      blockers.push('FLIGHT_STATUS_NOT_ELIGIBLE');
    }
    if (flight.scheduledDeparture) {
      const serviceType = ticketingServiceTypeForFlight(flight);
      if (!this.repository.getActiveRate(flight.routeId, serviceType, flight.scheduledDeparture)) {
        blockers.push('RATE_NOT_CONFIGURED');
      }
    }
    return blockers;
  }
}
