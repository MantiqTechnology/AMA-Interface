import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { AppDatabase } from '../../../db/client';
import { routes, stations } from '../../../db/schema';
import type {
  RouteDto,
  RouteInput,
  RouteListQuery,
  RouteOption
} from '../../../../shared/features/operations/routes';

const origin = alias(stations, 'route_option_origin');
const destination = alias(stations, 'route_option_destination');

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
    return await this.db
      .select()
      .from(routes)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(routes.routeCode));
  }

  async getById(id: string): Promise<RouteDto | null> {
    return (await this.db.select().from(routes).where(eq(routes.id, id)).get()) ?? null;
  }

  async create(id: string, input: RouteInput, timestamp: string): Promise<RouteDto> {
    return await this.db
      .insert(routes)
      .values({ id, ...input, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
  }

  async update(id: string, input: RouteInput, timestamp: string): Promise<RouteDto | null> {
    return (
      (await this.db
        .update(routes)
        .set({ ...input, updatedAt: timestamp })
        .where(eq(routes.id, id))
        .returning()
        .get()) ?? null
    );
  }

  async setActive(id: string, isActive: boolean, timestamp: string): Promise<RouteDto | null> {
    return (
      (await this.db
        .update(routes)
        .set({ isActive, updatedAt: timestamp })
        .where(eq(routes.id, id))
        .returning()
        .get()) ?? null
    );
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
