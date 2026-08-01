import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { AppDatabase } from '../../../db/client';
import {
  aircraft,
  flightCapacityProfiles,
  flightScheduleTemplates,
  flightServiceTypes,
  routes,
  scheduleTemplateAuditLogs,
  stations
} from '../../../db/schema';
import type {
  FlightScheduleTemplateDetailDto,
  FlightScheduleTemplateDto,
  FlightScheduleTemplateInput,
  FlightScheduleTemplateListQuery,
  FlightScheduleTemplateOption,
  ScheduleOperatingDay,
  ScheduleTemplateHistoryItemDto,
  ScheduleTemplateStatus
} from '../../../../shared/features/operations/flight-schedule-templates';

const origin = alias(stations, 'schedule_template_origin');
const destination = alias(stations, 'schedule_template_destination');

function parseOperatingDays(value: string): ScheduleOperatingDay[] {
  return value.split(',').filter(Boolean) as ScheduleOperatingDay[];
}

function toDto(row: typeof flightScheduleTemplates.$inferSelect): FlightScheduleTemplateDto {
  const bookingOpenMinutesBefore = row.bookingOpenMinutesBefore ?? row.bookingOpenHoursBefore * 60;
  return {
    id: row.id,
    templateCode: row.templateCode,
    routeId: row.routeId,
    serviceTypeId: row.serviceTypeId,
    defaultAircraftId: row.defaultAircraftId,
    capacityProfileId: row.capacityProfileId,
    operatingDays: parseOperatingDays(row.operatingDays),
    departureTimeLocal: row.departureTimeLocal,
    arrivalTimeLocal: row.arrivalTimeLocal,
    arrivalDayOffset: row.arrivalDayOffset,
    bookingOpenMinutesBefore,
    bookingOpenHoursBefore: Math.floor(bookingOpenMinutesBefore / 60),
    bookingCloseMinutesBefore: row.bookingCloseMinutesBefore,
    lifecycleStatus: row.lifecycleStatus as ScheduleTemplateStatus,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    scheduleNote: row.scheduleNote,
    internalOperationalNote: row.internalOperationalNote,
    version: row.version,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toValues(input: FlightScheduleTemplateInput) {
  return {
    templateCode: input.templateCode,
    routeId: input.routeId,
    serviceTypeId: input.serviceTypeId,
    defaultAircraftId: input.defaultAircraftId,
    capacityProfileId: input.capacityProfileId,
    operatingDays: input.operatingDays.join(','),
    departureTimeLocal: input.departureTimeLocal,
    arrivalTimeLocal: input.arrivalTimeLocal,
    arrivalDayOffset: input.arrivalDayOffset,
    bookingOpenMinutesBefore: input.bookingOpenMinutesBefore,
    bookingOpenHoursBefore: input.bookingOpenHoursBefore,
    bookingCloseMinutesBefore: input.bookingCloseMinutesBefore,
    effectiveFrom: input.effectiveFrom,
    effectiveUntil: input.effectiveUntil,
    scheduleNote: input.scheduleNote,
    internalOperationalNote: input.internalOperationalNote
  };
}

export class FlightScheduleTemplateRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: FlightScheduleTemplateListQuery): Promise<FlightScheduleTemplateDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(flightScheduleTemplates.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(flightScheduleTemplates.isActive, false));
    if (query.routeId) conditions.push(eq(flightScheduleTemplates.routeId, query.routeId));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(flightScheduleTemplates.templateCode, term),
          like(flightScheduleTemplates.operatingDays, term),
          like(flightScheduleTemplates.scheduleNote, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(flightScheduleTemplates)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(flightScheduleTemplates.templateCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<FlightScheduleTemplateDto | null> {
    const row = await this.db
      .select()
      .from(flightScheduleTemplates)
      .where(eq(flightScheduleTemplates.id, id))
      .get();
    return row ? toDto(row) : null;
  }

  async getServiceType(id: string) {
    return await this.db
      .select()
      .from(flightServiceTypes)
      .where(eq(flightServiceTypes.id, id))
      .get();
  }

  async getCapacityProfile(id: string) {
    return await this.db
      .select()
      .from(flightCapacityProfiles)
      .where(eq(flightCapacityProfiles.id, id))
      .get();
  }

  async getDetailById(id: string): Promise<FlightScheduleTemplateDetailDto | null> {
    const row = await this.db
      .select({
        template: flightScheduleTemplates,
        route: routes,
        origin,
        destination,
        serviceType: flightServiceTypes,
        defaultAircraft: aircraft,
        capacityProfile: flightCapacityProfiles
      })
      .from(flightScheduleTemplates)
      .innerJoin(routes, eq(flightScheduleTemplates.routeId, routes.id))
      .innerJoin(origin, eq(routes.originStationId, origin.id))
      .innerJoin(destination, eq(routes.destinationStationId, destination.id))
      .innerJoin(
        flightServiceTypes,
        eq(flightScheduleTemplates.serviceTypeId, flightServiceTypes.id)
      )
      .leftJoin(aircraft, eq(flightScheduleTemplates.defaultAircraftId, aircraft.id))
      .leftJoin(
        flightCapacityProfiles,
        eq(flightScheduleTemplates.capacityProfileId, flightCapacityProfiles.id)
      )
      .where(eq(flightScheduleTemplates.id, id))
      .get();

    if (!row) return null;
    const template = toDto(row.template);
    return {
      ...template,
      route: {
        id: row.route.id,
        routeCode: row.route.routeCode,
        origin: {
          id: row.origin.id,
          stationCode: row.origin.stationCode,
          stationName: row.origin.stationName,
          timezone: row.origin.timezone
        },
        destination: {
          id: row.destination.id,
          stationCode: row.destination.stationCode,
          stationName: row.destination.stationName,
          timezone: row.destination.timezone
        },
        estimatedDurationMinutes: row.route.estimatedDurationMinutes,
        distanceKm: row.route.distanceKm,
        status: row.route.restrictionLevel,
        isActive: row.route.isActive
      },
      serviceType: {
        id: row.serviceType.id,
        code: row.serviceType.code,
        name: row.serviceType.label,
        isActive: row.serviceType.isActive
      },
      defaultAircraft: row.defaultAircraft
        ? {
            id: row.defaultAircraft.id,
            registration: row.defaultAircraft.registrationNumber,
            aircraftTypeName: row.defaultAircraft.aircraftType,
            model: row.defaultAircraft.model,
            passengerCapacity: row.defaultAircraft.passengerCapacity,
            cargoCapacityKg: row.defaultAircraft.cargoCapacityKg,
            operationalStatus: row.defaultAircraft.operationalStatus,
            serviceabilityStatus: row.defaultAircraft.serviceabilityStatus,
            isActive: row.defaultAircraft.isActive
          }
        : null,
      capacityProfile: row.capacityProfile
        ? {
            id: row.capacityProfile.id,
            code: row.capacityProfile.profileCode,
            name: row.capacityProfile.profileName,
            seatCapacity: row.capacityProfile.seatCapacity,
            cargoCapacityKg: row.capacityProfile.cargoCapacityKg,
            isActive: row.capacityProfile.isActive
          }
        : null
    };
  }

  async create(id: string, input: FlightScheduleTemplateInput, timestamp: string) {
    const row = await this.db
      .insert(flightScheduleTemplates)
      .values({
        id,
        ...toValues(input),
        lifecycleStatus: 'ACTIVE',
        isActive: true,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: FlightScheduleTemplateInput, timestamp: string) {
    const conditions = [eq(flightScheduleTemplates.id, id)];
    if (input.expectedVersion) {
      conditions.push(eq(flightScheduleTemplates.version, input.expectedVersion));
    }
    const row = await this.db
      .update(flightScheduleTemplates)
      .set({
        ...toValues(input),
        version: sql`${flightScheduleTemplates.version} + 1`,
        updatedAt: timestamp
      })
      .where(and(...conditions))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async duplicate(
    id: string,
    source: FlightScheduleTemplateDto,
    templateCode: string,
    effectiveFrom: string | null,
    timestamp: string
  ) {
    const row = await this.db
      .insert(flightScheduleTemplates)
      .values({
        id,
        templateCode,
        routeId: source.routeId,
        serviceTypeId: source.serviceTypeId,
        defaultAircraftId: source.defaultAircraftId,
        capacityProfileId: source.capacityProfileId,
        operatingDays: source.operatingDays.join(','),
        departureTimeLocal: source.departureTimeLocal,
        arrivalTimeLocal: source.arrivalTimeLocal,
        arrivalDayOffset: source.arrivalDayOffset,
        bookingOpenMinutesBefore: source.bookingOpenMinutesBefore,
        bookingOpenHoursBefore: source.bookingOpenHoursBefore,
        bookingCloseMinutesBefore: source.bookingCloseMinutesBefore,
        effectiveFrom,
        effectiveUntil: source.effectiveUntil,
        scheduleNote: source.scheduleNote,
        internalOperationalNote: source.internalOperationalNote,
        lifecycleStatus: 'DRAFT',
        isActive: false,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async setLifecycle(id: string, status: ScheduleTemplateStatus, timestamp: string) {
    const row = await this.db
      .update(flightScheduleTemplates)
      .set({
        lifecycleStatus: status,
        isActive: status === 'ACTIVE',
        version: sql`${flightScheduleTemplates.version} + 1`,
        updatedAt: timestamp
      })
      .where(eq(flightScheduleTemplates.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async appendHistory(input: {
    id: string;
    templateId: string;
    action: string;
    actorId: string | null;
    actorName: string | null;
    changedFields: string[];
    metadata?: Record<string, unknown>;
    requestId?: string | null;
    occurredAt: string;
  }) {
    await this.db.insert(scheduleTemplateAuditLogs).values({
      id: input.id,
      templateId: input.templateId,
      action: input.action,
      actorId: input.actorId,
      actorName: input.actorName,
      changedFields: JSON.stringify(input.changedFields),
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      requestId: input.requestId ?? null,
      occurredAt: input.occurredAt
    });
  }

  async history(id: string): Promise<ScheduleTemplateHistoryItemDto[]> {
    const rows = await this.db
      .select()
      .from(scheduleTemplateAuditLogs)
      .where(eq(scheduleTemplateAuditLogs.templateId, id))
      .orderBy(desc(scheduleTemplateAuditLogs.occurredAt));
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorName: row.actorName,
      changedFields: JSON.parse(row.changedFields || '[]') as string[],
      occurredAt: row.occurredAt,
      requestId: row.requestId
    }));
  }

  async options(): Promise<FlightScheduleTemplateOption[]> {
    const rows = await this.db
      .select({
        id: flightScheduleTemplates.id,
        templateCode: flightScheduleTemplates.templateCode,
        routeId: flightScheduleTemplates.routeId,
        serviceTypeId: flightScheduleTemplates.serviceTypeId,
        defaultAircraftId: flightScheduleTemplates.defaultAircraftId,
        capacityProfileId: flightScheduleTemplates.capacityProfileId,
        operatingDays: flightScheduleTemplates.operatingDays,
        departureTimeLocal: flightScheduleTemplates.departureTimeLocal,
        arrivalTimeLocal: flightScheduleTemplates.arrivalTimeLocal,
        arrivalDayOffset: flightScheduleTemplates.arrivalDayOffset,
        bookingOpenMinutesBefore: flightScheduleTemplates.bookingOpenMinutesBefore,
        bookingOpenHoursBefore: flightScheduleTemplates.bookingOpenHoursBefore,
        bookingCloseMinutesBefore: flightScheduleTemplates.bookingCloseMinutesBefore,
        scheduleNote: flightScheduleTemplates.scheduleNote
      })
      .from(flightScheduleTemplates)
      .where(eq(flightScheduleTemplates.isActive, true))
      .orderBy(asc(flightScheduleTemplates.templateCode));
    return rows.map((row) => {
      const bookingOpenMinutesBefore =
        row.bookingOpenMinutesBefore ?? row.bookingOpenHoursBefore * 60;
      return {
        ...row,
        operatingDays: parseOperatingDays(row.operatingDays),
        bookingOpenMinutesBefore,
        bookingOpenHoursBefore: Math.floor(bookingOpenMinutesBefore / 60)
      };
    });
  }
}
