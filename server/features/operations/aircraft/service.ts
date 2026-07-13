import { randomUUID } from 'node:crypto';
import type {
  AircraftInput,
  AircraftListQuery
} from '../../../../shared/features/operations/aircraft';
import { DomainError, notFound } from '../../../utils/errors';
import { FlightCapacityProfileRepository } from '../flight-capacity-profiles/repository';
import { StationsRepository } from '../stations/repository';
import { AircraftRepository } from './repository';

export class AircraftService {
  constructor(
    private readonly repository: AircraftRepository,
    private readonly capacityProfilesRepository: FlightCapacityProfileRepository,
    private readonly stationsRepository: StationsRepository
  ) {}
  list(query: AircraftListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Aircraft', id);
    return row;
  }
  async create(input: AircraftInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'aircraft-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: AircraftInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('Aircraft', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('Aircraft', id);
    return row;
  }
  private async validate(input: AircraftInput) {
    if (
      input.defaultCapacityProfileId &&
      !(await this.capacityProfilesRepository.getById(input.defaultCapacityProfileId))?.isActive
    )
      throw new DomainError(
        'AIRCRAFT_DEFAULT_CAPACITY_PROFILE_ID_INVALID',
        'Default capacity profile must reference an active record.',
        422
      );
    if (
      input.baseStationId &&
      !(await this.stationsRepository.getById(input.baseStationId))?.isActive
    )
      throw new DomainError(
        'AIRCRAFT_BASE_STATION_ID_INVALID',
        'Home base must reference an active record.',
        422
      );
    if (
      input.currentStationId &&
      !(await this.stationsRepository.getById(input.currentStationId))?.isActive
    )
      throw new DomainError(
        'AIRCRAFT_CURRENT_STATION_ID_INVALID',
        'Current station must reference an active record.',
        422
      );
    if (
      input.lastMaintenanceCheckAt &&
      input.nextMaintenanceDueAt &&
      input.nextMaintenanceDueAt < input.lastMaintenanceCheckAt
    )
      throw new DomainError(
        'AIRCRAFT_MAINTENANCE_DATE_INVALID',
        'Next maintenance date cannot be before the last inspection date.',
        422
      );
    if (input.serviceabilityStatus !== 'SERVICEABLE' && !input.serviceabilityNote)
      throw new DomainError(
        'AIRCRAFT_SERVICEABILITY_NOTE_REQUIRED',
        'Aircraft serviceability restrictions require an operational note.',
        422
      );
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'AIRCRAFT_DUPLICATE',
        'Aircraft code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('AIRCRAFT_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
