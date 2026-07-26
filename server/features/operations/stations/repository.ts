import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { stations } from '../../../db/schema';
import type {
  StationDto,
  StationInput,
  StationListQuery,
  StationOption,
  StationPicDto
} from '../../../../shared/features/operations/stations';

type StationRow = typeof stations.$inferSelect;

function mapRowToDto(row: StationRow): StationDto {
  const stationPic: StationPicDto = {
    name: row.stationPicName,
    phone: row.stationPicPhone
  };

  return {
    id: row.id,
    stationCode: row.stationCode,
    stationName: row.stationName,
    iataCode: row.iataCode,
    icaoCode: row.icaoCode,
    airportType: row.airportType as StationDto['airportType'],
    operationalStatus: row.operationalStatus as StationDto['operationalStatus'],
    city: row.city,
    province: row.province,
    countryCode: row.countryCode,
    timezone: row.timezone,
    latitude: row.latitude,
    longitude: row.longitude,
    elevationFt: row.elevationFt,
    surfaceType: row.surfaceType as StationDto['surfaceType'],
    runwayLengthM: row.runwayLengthM,
    runwayWidthM: row.runwayWidthM,
    stationPic,
    operationalNotes: row.operationalNotes,
    isRemoteStation: row.isRemoteStation,
    lowConnectivityMode: row.lowConnectivityMode,
    hasFuelService: row.hasFuelService,
    hasHandlingService: row.hasHandlingService,
    hasParkingService: row.hasParkingService,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

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
          like(stations.city, term),
          like(stations.province, term),
          like(stations.stationPicName, term)
        ) as SQL
      );
    }

    const rows = await this.db
      .select()
      .from(stations)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(stations.stationCode));

    return rows.map(mapRowToDto);
  }

  async getById(id: string): Promise<StationDto | null> {
    const row = await this.db.select().from(stations).where(eq(stations.id, id)).get();
    return row ? mapRowToDto(row) : null;
  }

  async create(id: string, input: StationInput, timestamp: string): Promise<StationDto> {
    const row = await this.db
      .insert(stations)
      .values({ id, ...input, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return mapRowToDto(row);
  }

  async update(id: string, input: StationInput, timestamp: string): Promise<StationDto | null> {
    const row = await this.db
      .update(stations)
      .set({ ...input, updatedAt: timestamp })
      .where(eq(stations.id, id))
      .returning()
      .get();
    return row ? mapRowToDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string): Promise<StationDto | null> {
    const row = await this.db
      .update(stations)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(stations.id, id))
      .returning()
      .get();
    return row ? mapRowToDto(row) : null;
  }

  async options(): Promise<StationOption[]> {
    const rows = await this.db
      .select({
        id: stations.id,
        stationCode: stations.stationCode,
        stationName: stations.stationName,
        city: stations.city
      })
      .from(stations)
      .where(eq(stations.isActive, true))
      .orderBy(asc(stations.stationCode));

    return rows;
  }
}
