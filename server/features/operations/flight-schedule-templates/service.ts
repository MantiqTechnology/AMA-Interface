import { randomUUID } from 'node:crypto';
import type {
  DuplicateScheduleTemplateInput,
  FlightScheduleTemplateDto,
  FlightScheduleTemplateInput,
  FlightScheduleTemplateListQuery,
  ScheduleTemplateStatus
} from '../../../../shared/features/operations/flight-schedule-templates';
import { DomainError, notFound } from '../../../utils/errors';
import { AircraftRepository } from '../aircraft/repository';
import { RoutesRepository } from '../routes/repository';
import { FlightScheduleTemplateRepository } from './repository';

type ScheduleTemplateActor = {
  userId: string | null;
  role?: string | null;
  requestId?: string | null;
};

const mutableFields: Array<keyof FlightScheduleTemplateInput> = [
  'templateCode',
  'routeId',
  'serviceTypeId',
  'defaultAircraftId',
  'capacityProfileId',
  'operatingDays',
  'departureTimeLocal',
  'arrivalTimeLocal',
  'arrivalDayOffset',
  'bookingOpenMinutesBefore',
  'bookingCloseMinutesBefore',
  'effectiveFrom',
  'effectiveUntil',
  'scheduleNote',
  'internalOperationalNote'
];

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
    const row = await this.repository.getDetailById(id);
    if (!row) throw notFound('FlightScheduleTemplate', id);
    return row;
  }

  async history(id: string) {
    await this.get(id);
    return this.repository.history(id);
  }

  async create(input: FlightScheduleTemplateInput, actor?: ScheduleTemplateActor) {
    await this.validate(input, { requireCompleteForActivation: true });
    const timestamp = new Date().toISOString();
    try {
      const row = await this.repository.create(
        'flight-schedule-templates-' + randomUUID(),
        input,
        timestamp
      );
      await this.audit(row.id, 'CREATED', Object.keys(input), actor, timestamp);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async update(id: string, input: FlightScheduleTemplateInput, actor?: ScheduleTemplateActor) {
    const before = await this.requireBase(id);
    if (input.expectedVersion && input.expectedVersion !== before.version) {
      throw new DomainError(
        'SCHEDULE_TEMPLATE_VERSION_CONFLICT',
        'Schedule template was changed by another operation. Refresh and retry.',
        409
      );
    }
    if (before.lifecycleStatus === 'ARCHIVED') {
      throw new DomainError(
        'SCHEDULE_TEMPLATE_ARCHIVED',
        'Archived schedule templates cannot be edited.',
        422
      );
    }
    await this.validate(input, {
      requireCompleteForActivation: before.lifecycleStatus === 'ACTIVE'
    });
    const changedFields = this.changedFields(before, input);
    try {
      const timestamp = new Date().toISOString();
      const row = await this.repository.update(id, input, timestamp);
      if (!row) {
        throw new DomainError(
          'SCHEDULE_TEMPLATE_VERSION_CONFLICT',
          'Schedule template was changed by another operation. Refresh and retry.',
          409
        );
      }
      await this.audit(id, 'UPDATED', changedFields, actor, timestamp, {
        beforeVersion: before.version,
        afterVersion: row.version
      });
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async duplicate(
    id: string,
    input: DuplicateScheduleTemplateInput,
    actor?: ScheduleTemplateActor
  ) {
    const source = await this.requireBase(id);
    const timestamp = new Date().toISOString();
    try {
      const row = await this.repository.duplicate(
        'flight-schedule-templates-' + randomUUID(),
        source,
        input.templateCode,
        input.effectiveFrom,
        timestamp
      );
      await this.audit(row.id, 'DUPLICATED', ['templateCode'], actor, timestamp, {
        sourceTemplateId: source.id,
        sourceVersion: source.version
      });
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async activate(id: string, actor?: ScheduleTemplateActor) {
    const before = await this.requireBase(id);
    if (before.lifecycleStatus === 'ARCHIVED') {
      throw new DomainError(
        'SCHEDULE_TEMPLATE_ARCHIVED',
        'Archived schedule templates cannot be activated.',
        422
      );
    }
    await this.validate(this.baseToInput(before), { requireCompleteForActivation: true });
    return this.setLifecycle(id, 'ACTIVE', 'ACTIVATED', before, actor);
  }

  async deactivate(id: string, actor?: ScheduleTemplateActor) {
    const before = await this.requireBase(id);
    if (before.lifecycleStatus === 'ARCHIVED') {
      throw new DomainError(
        'SCHEDULE_TEMPLATE_ARCHIVED',
        'Archived schedule templates cannot be deactivated.',
        422
      );
    }
    return this.setLifecycle(id, 'INACTIVE', 'DEACTIVATED', before, actor);
  }

  async archive(id: string, actor?: ScheduleTemplateActor) {
    const before = await this.requireBase(id);
    return this.setLifecycle(id, 'ARCHIVED', 'ARCHIVED', before, actor);
  }

  async setActive(id: string, isActive: boolean, actor?: ScheduleTemplateActor) {
    return isActive ? this.activate(id, actor) : this.deactivate(id, actor);
  }

  private async setLifecycle(
    id: string,
    status: ScheduleTemplateStatus,
    action: string,
    before: FlightScheduleTemplateDto,
    actor?: ScheduleTemplateActor
  ) {
    const timestamp = new Date().toISOString();
    const row = await this.repository.setLifecycle(id, status, timestamp);
    if (!row) throw notFound('FlightScheduleTemplate', id);
    await this.audit(id, action, ['lifecycleStatus', 'isActive'], actor, timestamp, {
      beforeStatus: before.lifecycleStatus,
      afterStatus: row.lifecycleStatus,
      beforeVersion: before.version,
      afterVersion: row.version
    });
    return row;
  }

  private async requireBase(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('FlightScheduleTemplate', id);
    return row;
  }

  private async validate(
    input: FlightScheduleTemplateInput,
    options: { requireCompleteForActivation: boolean }
  ) {
    const route = await this.routesRepository.getById(input.routeId);
    if (!route?.isActive) {
      throw new DomainError(
        'FLIGHT_SCHEDULE_TEMPLATES_ROUTE_ID_INVALID',
        'Route must reference an active record.',
        422
      );
    }
    const serviceType = await this.repository.getServiceType(input.serviceTypeId);
    if (!serviceType?.isActive) {
      throw new DomainError(
        'FLIGHT_SCHEDULE_TEMPLATES_SERVICE_TYPE_INVALID',
        'Service type must reference an active record.',
        422
      );
    }
    if (
      input.defaultAircraftId &&
      !(await this.aircraftRepository.getById(input.defaultAircraftId))?.isActive
    ) {
      throw new DomainError(
        'FLIGHT_SCHEDULE_TEMPLATES_DEFAULT_AIRCRAFT_ID_INVALID',
        'Default aircraft must reference an active record.',
        422
      );
    }
    if (input.capacityProfileId) {
      const capacityProfile = await this.repository.getCapacityProfile(input.capacityProfileId);
      if (!capacityProfile?.isActive) {
        throw new DomainError(
          'FLIGHT_SCHEDULE_TEMPLATES_CAPACITY_PROFILE_INVALID',
          'Capacity profile must reference an active record.',
          422
        );
      }
    }
    if (input.bookingOpenMinutesBefore <= input.bookingCloseMinutesBefore) {
      throw new DomainError(
        'SCHEDULE_BOOKING_WINDOW_INVALID',
        'Booking open offset must be greater than booking close offset.',
        422
      );
    }
    if (input.effectiveFrom && input.effectiveUntil && input.effectiveUntil < input.effectiveFrom) {
      throw new DomainError(
        'SCHEDULE_EFFECTIVE_PERIOD_INVALID',
        'Effective until must be on or after effective from.',
        422
      );
    }
    if (options.requireCompleteForActivation && input.operatingDays.length === 0) {
      throw new DomainError(
        'SCHEDULE_OPERATING_DAYS_REQUIRED',
        'At least one operating day is required.',
        422
      );
    }
  }

  private changedFields(before: FlightScheduleTemplateDto, input: FlightScheduleTemplateInput) {
    return mutableFields.filter((field) => {
      if (field === 'expectedVersion') return false;
      const previous = before[field as keyof FlightScheduleTemplateDto];
      const next = input[field];
      return JSON.stringify(previous) !== JSON.stringify(next);
    }) as string[];
  }

  private baseToInput(row: FlightScheduleTemplateDto): FlightScheduleTemplateInput {
    return {
      templateCode: row.templateCode,
      expectedVersion: row.version,
      routeId: row.routeId,
      serviceTypeId: row.serviceTypeId as FlightScheduleTemplateInput['serviceTypeId'],
      defaultAircraftId: row.defaultAircraftId,
      capacityProfileId: row.capacityProfileId,
      operatingDays: row.operatingDays,
      departureTimeLocal: row.departureTimeLocal,
      arrivalTimeLocal: row.arrivalTimeLocal,
      arrivalDayOffset: row.arrivalDayOffset,
      bookingOpenMinutesBefore: row.bookingOpenMinutesBefore,
      bookingOpenHoursBefore: row.bookingOpenHoursBefore,
      bookingCloseMinutesBefore: row.bookingCloseMinutesBefore,
      effectiveFrom: row.effectiveFrom,
      effectiveUntil: row.effectiveUntil,
      scheduleNote: row.scheduleNote,
      internalOperationalNote: row.internalOperationalNote
    };
  }

  private async audit(
    templateId: string,
    action: string,
    changedFields: string[],
    actor: ScheduleTemplateActor | undefined,
    timestamp: string,
    metadata?: Record<string, unknown>
  ) {
    await this.repository.appendHistory({
      id: 'schedule-template-audit-' + randomUUID(),
      templateId,
      action,
      actorId: actor?.userId ?? null,
      actorName: actor?.role ?? null,
      changedFields,
      metadata,
      requestId: actor?.requestId ?? null,
      occurredAt: timestamp
    });
  }

  private rethrowWriteError(error: unknown): never {
    if (error instanceof DomainError) throw error;
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
