import { randomUUID } from 'node:crypto';
import type {
  FlightCapacityProfileInput,
  FlightCapacityProfileListQuery
} from '../../../../shared/features/operations/flight-capacity-profiles';
import { DomainError, notFound } from '../../../utils/errors';
import { AircraftRepository } from '../aircraft/repository';
import { RoutesRepository } from '../routes/repository';
import { FlightCapacityProfileRepository } from './repository';

export class FlightCapacityProfileService {
  constructor(
    private readonly repository: FlightCapacityProfileRepository,
    private readonly aircraftRepository: AircraftRepository,
    private readonly routesRepository: RoutesRepository
  ) {}
  list(query: FlightCapacityProfileListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('FlightCapacityProfile', id);
    return row;
  }
  async create(input: FlightCapacityProfileInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'flight-capacity-profiles-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: FlightCapacityProfileInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('FlightCapacityProfile', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('FlightCapacityProfile', id);
    return row;
  }
  private async validate(input: FlightCapacityProfileInput) {
    const aircraft = await this.aircraftRepository.getById(input.aircraftId);
    if (!aircraft?.isActive)
      throw new DomainError(
        'FLIGHT_CAPACITY_PROFILES_AIRCRAFT_ID_INVALID',
        'Aircraft must reference an active record.',
        422
      );
    if (!(await this.routesRepository.getById(input.routeId))?.isActive)
      throw new DomainError(
        'FLIGHT_CAPACITY_PROFILES_ROUTE_ID_INVALID',
        'Route must reference an active record.',
        422
      );
    if (input.seatCapacity > aircraft.passengerCapacity)
      throw new DomainError(
        'CAPACITY_PROFILE_SEATS_EXCEED_AIRCRAFT',
        'Seat capacity cannot exceed aircraft passenger capacity.',
        422
      );
    if (input.cargoCapacityKg > aircraft.cargoCapacityKg)
      throw new DomainError(
        'CAPACITY_PROFILE_CARGO_EXCEED_AIRCRAFT',
        'Cargo capacity cannot exceed aircraft cargo capacity.',
        422
      );
    if (input.reservedSeatCount > input.seatCapacity)
      throw new DomainError(
        'CAPACITY_PROFILE_RESERVED_SEATS_INVALID',
        'Reserved seats cannot exceed profile seat capacity.',
        422
      );
    if (input.reservedCargoKg > input.cargoCapacityKg)
      throw new DomainError(
        'CAPACITY_PROFILE_RESERVED_CARGO_INVALID',
        'Reserved cargo cannot exceed profile cargo capacity.',
        422
      );
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'FLIGHT_CAPACITY_PROFILES_DUPLICATE',
        'FlightCapacityProfile code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError(
        'FLIGHT_CAPACITY_PROFILES_RELATION_INVALID',
        'A related record is invalid.',
        422
      );
    throw error;
  }
}
