import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { aircraft } from '../../../db/schema';
import type {
  AircraftDto,
  AircraftInput,
  AircraftListQuery,
  AircraftOption
} from '../../../../shared/features/operations/aircraft';

function toDto(row: typeof aircraft.$inferSelect): AircraftDto {
  return {
    id: row.id,
    registrationNumber: row.registrationNumber,
    serialNumber: row.serialNumber,
    aircraftType: row.aircraftType,
    manufacturer: row.manufacturer,
    model: row.model,
    fleetCode: row.fleetCode,
    passengerCapacity: row.passengerCapacity,
    cargoCapacityKg: row.cargoCapacityKg,
    fuelType: row.fuelType,
    defaultCapacityProfileId: row.defaultCapacityProfileId,
    operationalStatus: row.operationalStatus,
    serviceabilityStatus: row.serviceabilityStatus,
    baseStationId: row.baseStationId,
    currentStationId: row.currentStationId,
    lastMaintenanceCheckAt: row.lastMaintenanceCheckAt,
    nextMaintenanceDueAt: row.nextMaintenanceDueAt,
    serviceabilityNote: row.serviceabilityNote,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class AircraftRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: AircraftListQuery): Promise<AircraftDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(aircraft.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(aircraft.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(aircraft.registrationNumber, term),
          like(aircraft.aircraftType, term),
          like(aircraft.manufacturer, term),
          like(aircraft.model, term),
          like(aircraft.serviceabilityNote, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(aircraft)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(aircraft.registrationNumber));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<AircraftDto | null> {
    const row = await this.db.select().from(aircraft).where(eq(aircraft.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: AircraftInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(aircraft)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: AircraftInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(aircraft)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(aircraft.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(aircraft)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(aircraft.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<AircraftOption[]> {
    return await this.db
      .select({
        id: aircraft.id,
        registrationNumber: aircraft.registrationNumber,
        aircraftType: aircraft.aircraftType,
        manufacturer: aircraft.manufacturer,
        model: aircraft.model,
        passengerCapacity: aircraft.passengerCapacity,
        cargoCapacityKg: aircraft.cargoCapacityKg,
        fuelType: aircraft.fuelType,
        serviceabilityStatus: aircraft.serviceabilityStatus,
        baseStationId: aircraft.baseStationId,
        currentStationId: aircraft.currentStationId,
        nextMaintenanceDueAt: aircraft.nextMaintenanceDueAt,
        serviceabilityNote: aircraft.serviceabilityNote
      })
      .from(aircraft)
      .where(eq(aircraft.isActive, true))
      .orderBy(asc(aircraft.registrationNumber));
  }
}
