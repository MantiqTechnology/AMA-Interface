import { nanoid } from 'nanoid';
import type {
  CreateFlightOrderBody,
  FlightStatus,
  ListFlightsQuery
} from '../../shared/contracts/flights';
import type { Repositories } from '../repositories/interfaces';
import { DomainError, notFound } from '../utils/errors';
import { mapFlightDetail, mapFlightSummary } from './mappers';

export class FlightsService {
  constructor(private readonly repositories: Repositories) {}

  async listFlights(query: ListFlightsQuery) {
    const rows = await this.repositories.flights.list(query);
    return rows.map(mapFlightSummary);
  }

  async getFlightDetail(id: string) {
    const flight = await this.repositories.flights.getById(id);
    if (!flight) {
      throw notFound('Flight order', id);
    }

    const manifest = await this.repositories.flights.listManifest(id);
    return mapFlightDetail(flight, manifest);
  }

  async createFlightOrder(input: CreateFlightOrderBody) {
    const [customer, route, aircraft] = await Promise.all([
      this.repositories.references.getCustomer(input.customerId),
      this.repositories.references.getRoute(input.routeId),
      this.repositories.references.getAircraft(input.aircraftId)
    ]);

    if (!customer) throw notFound('Customer', input.customerId);
    if (!route) throw notFound('Route', input.routeId);
    if (!aircraft) throw notFound('Aircraft', input.aircraftId);
    if (
      aircraft.operationalStatus !== 'ACTIVE' ||
      aircraft.serviceabilityStatus === 'UNSERVICEABLE'
    ) {
      throw new DomainError(
        'AIRCRAFT_UNAVAILABLE',
        `${aircraft.registrationNumber} is not available`,
        409
      );
    }

    const created = await this.repositories.flights.create({
      id: nanoid(),
      ...input,
      status: 'scheduled'
    });

    await this.repositories.alerts.create({
      id: nanoid(),
      severity: 'info',
      title: 'Flight order scheduled',
      message: `${created.flightNumber} is scheduled for ${created.scheduledDeparture}`,
      entityType: 'flight_order',
      entityId: created.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return await this.getFlightDetail(created.id);
  }

  async transitionFlight(id: string, status: FlightStatus) {
    const existing = await this.repositories.flights.getById(id);
    if (!existing) {
      throw notFound('Flight order', id);
    }

    const updated = await this.repositories.flights.updateStatus(id, status);
    if (!updated) {
      throw notFound('Flight order', id);
    }

    await this.repositories.alerts.create({
      id: nanoid(),
      severity: status === 'cancelled' ? 'warning' : 'info',
      title: `Flight ${status}`,
      message: `${existing.flight.flightNumber} moved to ${status}`,
      entityType: 'flight_order',
      entityId: id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return await this.getFlightDetail(id);
  }

  async dispatchFlight(id: string) {
    return await this.transitionFlight(id, 'dispatched');
  }
}
