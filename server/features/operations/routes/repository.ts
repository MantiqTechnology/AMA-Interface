import {
  and,
  asc,
  eq,
  gt,
  gte,
  isNull,
  like,
  lte,
  notInArray,
  or,
  sql,
  type SQL
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { AppDatabase } from '../../../db/client';
import {
  aircraft,
  flightCapacityProfiles,
  flightOperations,
  flightOperationStatuses,
  flightScheduleTemplates,
  flightServiceTypes,
  rateCards,
  routes,
  stations
} from '../../../db/schema';
import type {
  RouteDto,
  RouteInput,
  RouteListQuery,
  RouteOption,
  RouteRestrictionLevel
} from '../../../../shared/features/operations/routes';

const origin = alias(stations, 'route_option_origin');
const destination = alias(stations, 'route_option_destination');
const scheduleAircraft = alias(aircraft, 'route_schedule_aircraft');
const flightAircraft = alias(aircraft, 'route_flight_aircraft');

function toDto(row: typeof routes.$inferSelect): RouteDto {
  return {
    ...row,
    restrictionLevel: row.restrictionLevel as RouteRestrictionLevel
  };
}

export class RoutesRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: RouteListQuery): Promise<RouteDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(routes.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(routes.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(or(like(routes.routeCode, term)) as SQL);
    }
    const rows = await this.db
      .select()
      .from(routes)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(routes.routeCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<RouteDto | null> {
    const row = await this.db.select().from(routes).where(eq(routes.id, id)).get();
    return row ? toDto(row) : null;
  }

  async getStations(route: RouteDto) {
    const rows = await this.db
      .select()
      .from(stations)
      .where(
        or(eq(stations.id, route.originStationId), eq(stations.id, route.destinationStationId))
      );
    return {
      origin: rows.find((station) => station.id === route.originStationId) ?? null,
      destination: rows.find((station) => station.id === route.destinationStationId) ?? null
    };
  }

  async getActiveScheduleTemplates(routeId: string) {
    return await this.db
      .select({
        id: flightScheduleTemplates.id,
        templateCode: flightScheduleTemplates.templateCode,
        operatingDays: flightScheduleTemplates.operatingDays,
        departureTimeLocal: flightScheduleTemplates.departureTimeLocal,
        arrivalTimeLocal: flightScheduleTemplates.arrivalTimeLocal,
        serviceTypeId: flightScheduleTemplates.serviceTypeId,
        serviceTypeLabel: flightServiceTypes.label,
        defaultAircraftId: flightScheduleTemplates.defaultAircraftId,
        defaultAircraftRegistration: scheduleAircraft.registrationNumber
      })
      .from(flightScheduleTemplates)
      .innerJoin(
        flightServiceTypes,
        eq(flightScheduleTemplates.serviceTypeId, flightServiceTypes.id)
      )
      .leftJoin(
        scheduleAircraft,
        eq(flightScheduleTemplates.defaultAircraftId, scheduleAircraft.id)
      )
      .where(
        and(
          eq(flightScheduleTemplates.routeId, routeId),
          eq(flightScheduleTemplates.isActive, true),
          eq(flightServiceTypes.isActive, true)
        )
      )
      .orderBy(asc(flightScheduleTemplates.departureTimeLocal));
  }

  async getActiveCapacityProfiles(routeId: string) {
    return await this.db
      .select({
        profileId: flightCapacityProfiles.id,
        profileCode: flightCapacityProfiles.profileCode,
        profileName: flightCapacityProfiles.profileName,
        aircraftId: aircraft.id,
        registrationNumber: aircraft.registrationNumber,
        aircraftType: aircraft.aircraftType,
        serviceabilityStatus: aircraft.serviceabilityStatus,
        serviceTypeId: flightCapacityProfiles.serviceTypeId,
        serviceTypeLabel: flightServiceTypes.label,
        seatCapacity: flightCapacityProfiles.seatCapacity,
        cargoCapacityKg: flightCapacityProfiles.cargoCapacityKg,
        reservedSeatCount: flightCapacityProfiles.reservedSeatCount,
        reservedCargoKg: flightCapacityProfiles.reservedCargoKg
      })
      .from(flightCapacityProfiles)
      .innerJoin(aircraft, eq(flightCapacityProfiles.aircraftId, aircraft.id))
      .innerJoin(
        flightServiceTypes,
        eq(flightCapacityProfiles.serviceTypeId, flightServiceTypes.id)
      )
      .where(
        and(
          eq(flightCapacityProfiles.routeId, routeId),
          eq(flightCapacityProfiles.isActive, true),
          eq(aircraft.isActive, true),
          eq(flightServiceTypes.isActive, true)
        )
      )
      .orderBy(asc(aircraft.registrationNumber));
  }

  async getEffectiveRateServiceTypes(
    originStationId: string,
    destinationStationId: string,
    evaluatedDate: string
  ) {
    return await this.db
      .selectDistinct({ serviceType: rateCards.serviceType })
      .from(rateCards)
      .where(
        and(
          eq(rateCards.originStationId, originStationId),
          eq(rateCards.destinationStationId, destinationStationId),
          eq(rateCards.isActive, true),
          lte(rateCards.effectiveFrom, evaluatedDate),
          or(isNull(rateCards.effectiveTo), gte(rateCards.effectiveTo, evaluatedDate))
        )
      )
      .orderBy(asc(rateCards.serviceType));
  }

  async getReverseRoute(originStationId: string, destinationStationId: string) {
    return (
      (await this.db
        .select({ id: routes.id, routeCode: routes.routeCode, isActive: routes.isActive })
        .from(routes)
        .where(
          and(
            eq(routes.originStationId, destinationStationId),
            eq(routes.destinationStationId, originStationId)
          )
        )
        .get()) ?? null
    );
  }

  async getUpcomingFlights(route: RouteDto, evaluatedAt: string, limit = 3) {
    return await this.db
      .select({
        id: flightOperations.id,
        flightNumber: flightOperations.flightNumber,
        scheduledDepartureAt: flightOperations.scheduledDepartureAt,
        scheduledArrivalAt: flightOperations.scheduledArrivalAt,
        aircraftRegistration: flightAircraft.registrationNumber,
        status: flightOperationStatuses.code,
        statusLabel: flightOperationStatuses.label,
        passengerCount: sql<number>`(
          SELECT COUNT(*)
          FROM flight_manifest_passengers passenger
          JOIN flight_manifests manifest ON manifest.id = passenger.manifest_id
          WHERE manifest.flight_operation_id = ${flightOperations.id}
        )`,
        cargoWeightKg: sql<number | null>`(
          SELECT SUM(cargo.actual_weight_kg)
          FROM flight_manifest_cargo_items cargo
          JOIN flight_manifests manifest ON manifest.id = cargo.manifest_id
          WHERE manifest.flight_operation_id = ${flightOperations.id}
        )`
      })
      .from(flightOperations)
      .innerJoin(
        flightOperationStatuses,
        eq(flightOperations.currentStatusId, flightOperationStatuses.id)
      )
      .leftJoin(flightAircraft, eq(flightOperations.aircraftId, flightAircraft.id))
      .where(
        and(
          eq(flightOperations.routeId, route.id),
          eq(flightOperations.originStationId, route.originStationId),
          eq(flightOperations.destinationStationId, route.destinationStationId),
          gt(flightOperations.scheduledDepartureAt, evaluatedAt),
          notInArray(flightOperationStatuses.code, ['CLOSED', 'CANCELLED'])
        )
      )
      .orderBy(asc(flightOperations.scheduledDepartureAt))
      .limit(limit);
  }

  async create(id: string, input: RouteInput, timestamp: string): Promise<RouteDto> {
    const row = await this.db
      .insert(routes)
      .values({ id, ...input, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: RouteInput, timestamp: string): Promise<RouteDto | null> {
    const row = await this.db
      .update(routes)
      .set({ ...input, updatedAt: timestamp })
      .where(eq(routes.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string): Promise<RouteDto | null> {
    const row = await this.db
      .update(routes)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(routes.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async hasActiveForStation(stationId: string) {
    return Boolean(
      await this.db
        .select({ id: routes.id })
        .from(routes)
        .where(
          and(
            eq(routes.isActive, true),
            or(eq(routes.originStationId, stationId), eq(routes.destinationStationId, stationId))
          )
        )
        .get()
    );
  }

  async options(): Promise<RouteOption[]> {
    return await this.db
      .select({
        id: routes.id,
        routeCode: routes.routeCode,
        originStationId: routes.originStationId,
        destinationStationId: routes.destinationStationId,
        originStationCode: origin.stationCode,
        destinationStationCode: destination.stationCode,
        estimatedDurationMinutes: routes.estimatedDurationMinutes,
        distanceKm: routes.distanceKm
      })
      .from(routes)
      .innerJoin(origin, eq(routes.originStationId, origin.id))
      .innerJoin(destination, eq(routes.destinationStationId, destination.id))
      .where(
        and(eq(routes.isActive, true), eq(origin.isActive, true), eq(destination.isActive, true))
      )
      .orderBy(asc(routes.routeCode));
  }
}
