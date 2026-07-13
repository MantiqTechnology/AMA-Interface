import { randomUUID } from 'node:crypto';
import type {
  StationInput,
  StationListQuery
} from '../../../../shared/features/operations/stations';
import { DomainError, notFound } from '../../../utils/errors';
import { RoutesRepository } from '../routes/repository';
import { StationsRepository } from './repository';

export class StationsService {
  constructor(
    private readonly repository: StationsRepository,
    private readonly routesRepository: RoutesRepository
  ) {}

  list(query: StationListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const station = await this.repository.getById(id);
    if (!station) throw notFound('Station', id);
    return station;
  }

  options() {
    return this.repository.options();
  }

  async create(input: StationInput) {
    try {
      return await this.repository.create(
        `station-${randomUUID()}`,
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async update(id: string, input: StationInput) {
    await this.get(id);
    try {
      const station = await this.repository.update(id, input, new Date().toISOString());
      if (!station) throw notFound('Station', id);
      return station;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    if (!isActive && (await this.routesRepository.hasActiveForStation(id))) {
      throw new DomainError(
        'STATION_HAS_ACTIVE_ROUTES',
        'Station cannot be deactivated while it is used by an active route.',
        409
      );
    }
    const station = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!station) throw notFound('Station', id);
    return station;
  }

  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      throw new DomainError('STATION_CODE_DUPLICATE', 'Station code already exists.', 409);
    }
    throw error;
  }
}
