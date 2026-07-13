import { randomUUID } from 'node:crypto';
import type { RouteInput, RouteListQuery } from '../../../../shared/features/operations/routes';
import { DomainError, notFound } from '../../../utils/errors';
import { StationsRepository } from '../stations/repository';
import { RoutesRepository } from './repository';

export class RoutesService {
  constructor(
    private readonly repository: RoutesRepository,
    private readonly stationsRepository: StationsRepository
  ) {}

  list(query: RouteListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const route = await this.repository.getById(id);
    if (!route) throw notFound('Route', id);
    return route;
  }

  options() {
    return this.repository.options();
  }

  async create(input: RouteInput) {
    await this.validate(input);
    try {
      return await this.repository.create(`route-${randomUUID()}`, input, new Date().toISOString());
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async update(id: string, input: RouteInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const route = await this.repository.update(id, input, new Date().toISOString());
      if (!route) throw notFound('Route', id);
      return route;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const route = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!route) throw notFound('Route', id);
    return route;
  }

  private async validate(input: RouteInput) {
    if (input.originStationId === input.destinationStationId) {
      throw new DomainError(
        'ROUTE_STATIONS_MUST_DIFFER',
        'Origin and destination cannot be the same.',
        422
      );
    }
    const originStation = await this.stationsRepository.getById(input.originStationId);
    if (!originStation?.isActive) {
      throw new DomainError(
        'ROUTE_ORIGIN_INVALID',
        'Origin must reference an active station.',
        422
      );
    }
    const destinationStation = await this.stationsRepository.getById(input.destinationStationId);
    if (!destinationStation?.isActive) {
      throw new DomainError(
        'ROUTE_DESTINATION_INVALID',
        'Destination must reference an active station.',
        422
      );
    }
  }

  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('routes.route_code')) {
      throw new DomainError('ROUTE_CODE_DUPLICATE', 'Route code already exists.', 409);
    }
    if (message.includes('routes.origin_station_id')) {
      throw new DomainError(
        'ROUTE_PAIR_DUPLICATE',
        'A route for this origin and destination already exists.',
        409
      );
    }
    throw error;
  }
}
