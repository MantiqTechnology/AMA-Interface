import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { stations } from '../../../db/schema';
import type {
  StationDto,
  StationInput,
  StationListQuery,
  StationOption
} from '../../../../shared/features/operations/stations';

export class StationsRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: StationListQuery): Promise<StationDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(stations.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(stations.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(stations.stationCode, term),
          like(stations.stationName, term),
          like(stations.cityOrRegion, term),
          like(stations.province, term),
          like(stations.stationPicName, term)
        ) as SQL
      );
    }

    return await this.db
      .select()
      .from(stations)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(stations.stationCode));
  }

  async getById(id: string): Promise<StationDto | null> {
    return (await this.db.select().from(stations).where(eq(stations.id, id)).get()) ?? null;
  }

  async create(id: string, input: StationInput, timestamp: string): Promise<StationDto> {
    return await this.db
      .insert(stations)
      .values({ id, ...input, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
  }

  async update(id: string, input: StationInput, timestamp: string): Promise<StationDto | null> {
    return (
      (await this.db
        .update(stations)
        .set({ ...input, updatedAt: timestamp })
        .where(eq(stations.id, id))
        .returning()
        .get()) ?? null
    );
  }

  async setActive(id: string, isActive: boolean, timestamp: string): Promise<StationDto | null> {
    return (
      (await this.db
        .update(stations)
        .set({ isActive, updatedAt: timestamp })
        .where(eq(stations.id, id))
        .returning()
        .get()) ?? null
    );
  }

  async options(): Promise<StationOption[]> {
    return await this.db
      .select({
        id: stations.id,
        stationCode: stations.stationCode,
        stationName: stations.stationName,
        cityOrRegion: stations.cityOrRegion
      })
      .from(stations)
      .where(eq(stations.isActive, true))
      .orderBy(asc(stations.stationCode));
  }
}
