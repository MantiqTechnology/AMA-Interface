import { randomUUID } from 'node:crypto';
import type {
  FlightScheduleTemplateInput,
  FlightScheduleTemplateListQuery
} from '../../../../shared/features/operations/flight-schedule-templates';
import { DomainError, notFound } from '../../../utils/errors';
import { AircraftRepository } from '../aircraft/repository';
import { RoutesRepository } from '../routes/repository';
import { FlightScheduleTemplateRepository } from './repository';

export class FlightScheduleTemplateService {
  constructor(
    private readonly repository: FlightScheduleTemplateRepository,
    private readonly routesRepository: RoutesRepository,
    private readonly aircraftRepository: AircraftRepository
  ) {}
  list(query: FlightScheduleTemplateListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('FlightScheduleTemplate', id);
    return row;
  }
  async create(input: FlightScheduleTemplateInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'flight-schedule-templates-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: FlightScheduleTemplateInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('FlightScheduleTemplate', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('FlightScheduleTemplate', id);
    return row;
  }
  private async validate(input: FlightScheduleTemplateInput) {
    if (!(await this.routesRepository.getById(input.routeId))?.isActive)
      throw new DomainError(
        'FLIGHT_SCHEDULE_TEMPLATES_ROUTE_ID_INVALID',
        'Route must reference an active record.',
        422
      );
    if (
      input.defaultAircraftId &&
      !(await this.aircraftRepository.getById(input.defaultAircraftId))?.isActive
    )
      throw new DomainError(
        'FLIGHT_SCHEDULE_TEMPLATES_DEFAULT_AIRCRAFT_ID_INVALID',
        'Default aircraft must reference an active record.',
        422
      );
    if (input.bookingCloseMinutesBefore > input.bookingOpenHoursBefore * 60)
      throw new DomainError(
        'SCHEDULE_BOOKING_WINDOW_INVALID',
        'Booking close minutes cannot be greater than booking open hours.',
        422
      );
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'FLIGHT_SCHEDULE_TEMPLATES_DUPLICATE',
        'FlightScheduleTemplate code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError(
        'FLIGHT_SCHEDULE_TEMPLATES_RELATION_INVALID',
        'A related record is invalid.',
        422
      );
    throw error;
  }
}
