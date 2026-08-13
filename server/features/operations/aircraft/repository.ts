import { and, asc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { aircraft } from '../../../db/schema';
import type {
  AircraftDto,
  AircraftInput,
  AircraftListQuery,
  AircraftOption
} from '../../../../shared/features/operations/aircraft';

function toDto(row: typeof aircraft.$inferSelect): AircraftDto {
  const maintenanceDue = Boolean(
    row.nextMaintenanceDueAt && row.nextMaintenanceDueAt <= new Date().toISOString().slice(0, 10)
  );
  return {
    id: row.id,
    registrationNumber: row.registrationNumber,
    serialNumber: row.serialNumber,
    aircraftType: row.aircraftType,
    manufacturer: row.manufacturer,
    model: row.model,
    fleetCode: row.fleetCode,
    imageUrl: row.imageUrl,
    passengerCapacity: row.passengerCapacity,
    cargoCapacityKg: row.cargoCapacityKg,
    fuelType: row.fuelType,
    engineCategory: row.engineCategory,
    usableFuelCapacityLitre: row.usableFuelCapacityLitre,
    fuelCapacityBasis: row.fuelCapacityBasis,
    cruiseFuelBurnLitrePerHour: row.cruiseFuelBurnLitrePerHour,
    holdingFuelBurnLitrePerHour: row.holdingFuelBurnLitrePerHour,
    taxiFuelBurnLitrePerHour: row.taxiFuelBurnLitrePerHour,
    fuelProfileSource: row.fuelProfileSource,
    fuelProfileReference: row.fuelProfileReference,
    fuelProfileEffectiveFrom: row.fuelProfileEffectiveFrom,
    fuelProfileAdvisoryOnly: row.fuelProfileAdvisoryOnly,
    defaultCapacityProfileId: row.defaultCapacityProfileId,
    operationalStatus: row.operationalStatus as AircraftDto['operationalStatus'],
    serviceabilityStatus: row.serviceabilityStatus as AircraftDto['serviceabilityStatus'],
    baseStationId: row.baseStationId,
    currentStationId: row.currentStationId,
    lastMaintenanceCheckAt: row.lastMaintenanceCheckAt,
    nextMaintenanceDueAt: row.nextMaintenanceDueAt,
    serviceabilityNote: row.serviceabilityNote,
    airframeHours: row.airframeHours,
    airframeCycles: row.airframeCycles,
    version: row.version,
    maintenanceDue,
    dueReasons: maintenanceDue
      ? [`Legacy maintenance due on ${row.nextMaintenanceDueAt as string}.`]
      : [],
    technicalEligibility:
      row.serviceabilityStatus === 'UNSERVICEABLE' || maintenanceDue
        ? 'BLOCKED'
        : row.serviceabilityStatus === 'SERVICEABLE_WITH_RESTRICTIONS'
          ? 'RESTRICTED'
          : 'ELIGIBLE',
    openDefectCount: 0,
    activeRestrictionCount: 0,
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
      .values({
        id,
        ...values,
        operationalStatus: 'SUSPENDED',
        serviceabilityStatus: 'UNSERVICEABLE',
        serviceabilityNote: null,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: AircraftInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(aircraft)
      .set({ ...values, version: sql`${aircraft.version} + 1`, updatedAt: timestamp })
      .where(eq(aircraft.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(aircraft)
      .set({ isActive, version: sql`${aircraft.version} + 1`, updatedAt: timestamp })
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
        imageUrl: aircraft.imageUrl,
        passengerCapacity: aircraft.passengerCapacity,
        cargoCapacityKg: aircraft.cargoCapacityKg,
        fuelType: aircraft.fuelType,
        engineCategory: aircraft.engineCategory,
        usableFuelCapacityLitre: aircraft.usableFuelCapacityLitre,
        fuelCapacityBasis: aircraft.fuelCapacityBasis,
        cruiseFuelBurnLitrePerHour: aircraft.cruiseFuelBurnLitrePerHour,
        holdingFuelBurnLitrePerHour: aircraft.holdingFuelBurnLitrePerHour,
        taxiFuelBurnLitrePerHour: aircraft.taxiFuelBurnLitrePerHour,
        fuelProfileSource: aircraft.fuelProfileSource,
        fuelProfileReference: aircraft.fuelProfileReference,
        fuelProfileEffectiveFrom: aircraft.fuelProfileEffectiveFrom,
        fuelProfileAdvisoryOnly: aircraft.fuelProfileAdvisoryOnly,
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
