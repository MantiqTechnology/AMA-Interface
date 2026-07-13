import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { flightCapacityProfiles } from '../../../db/schema';
import type {
  FlightCapacityProfileDto,
  FlightCapacityProfileInput,
  FlightCapacityProfileListQuery,
  FlightCapacityProfileOption
} from '../../../../shared/features/operations/flight-capacity-profiles';

function toDto(row: typeof flightCapacityProfiles.$inferSelect): FlightCapacityProfileDto {
  return {
    id: row.id,
    profileCode: row.profileCode,
    profileName: row.profileName,
    aircraftId: row.aircraftId,
    routeId: row.routeId,
    serviceTypeId: row.serviceTypeId,
    seatCapacity: row.seatCapacity,
    cargoCapacityKg: row.cargoCapacityKg,
    reservedSeatCount: row.reservedSeatCount,
    reservedCargoKg: row.reservedCargoKg,
    capacityNote: row.capacityNote,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class FlightCapacityProfileRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: FlightCapacityProfileListQuery): Promise<FlightCapacityProfileDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(flightCapacityProfiles.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(flightCapacityProfiles.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(flightCapacityProfiles.profileCode, term),
          like(flightCapacityProfiles.profileName, term),
          like(flightCapacityProfiles.capacityNote, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(flightCapacityProfiles)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(flightCapacityProfiles.profileCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<FlightCapacityProfileDto | null> {
    const row = await this.db
      .select()
      .from(flightCapacityProfiles)
      .where(eq(flightCapacityProfiles.id, id))
      .get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: FlightCapacityProfileInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(flightCapacityProfiles)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: FlightCapacityProfileInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(flightCapacityProfiles)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(flightCapacityProfiles.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(flightCapacityProfiles)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(flightCapacityProfiles.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<FlightCapacityProfileOption[]> {
    return await this.db
      .select({
        id: flightCapacityProfiles.id,
        profileCode: flightCapacityProfiles.profileCode,
        profileName: flightCapacityProfiles.profileName,
        aircraftId: flightCapacityProfiles.aircraftId,
        routeId: flightCapacityProfiles.routeId,
        serviceTypeId: flightCapacityProfiles.serviceTypeId,
        seatCapacity: flightCapacityProfiles.seatCapacity,
        cargoCapacityKg: flightCapacityProfiles.cargoCapacityKg,
        reservedSeatCount: flightCapacityProfiles.reservedSeatCount,
        reservedCargoKg: flightCapacityProfiles.reservedCargoKg,
        capacityNote: flightCapacityProfiles.capacityNote
      })
      .from(flightCapacityProfiles)
      .where(eq(flightCapacityProfiles.isActive, true))
      .orderBy(asc(flightCapacityProfiles.profileCode));
  }
}
