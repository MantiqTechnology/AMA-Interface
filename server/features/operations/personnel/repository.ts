import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { crews } from '../../../db/schema';
import type {
  PersonnelDto,
  PersonnelInput,
  PersonnelListQuery,
  PersonnelOption
} from '../../../../shared/features/operations/personnel';

function toDto(row: typeof crews.$inferSelect): PersonnelDto {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    crewRole: row.crewRole,
    licenseType: row.licenseType,
    licenseNumber: row.licenseNumber,
    licenseExpiryDate: row.licenseExpiryDate,
    medicalExpiryDate: row.medicalExpiryDate,
    baseStationId: row.baseStationId,
    availabilityStatus: row.availabilityStatus,
    dutyStationId: row.dutyStationId,
    readinessNote: row.readinessNote,
    unit: row.unit,
    employmentStatus: row.employmentStatus,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class PersonnelRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: PersonnelListQuery): Promise<PersonnelDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(crews.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(crews.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(crews.employeeCode, term),
          like(crews.fullName, term),
          like(crews.licenseNumber, term),
          like(crews.unit, term),
          like(crews.readinessNote, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(crews)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(crews.employeeCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<PersonnelDto | null> {
    const row = await this.db.select().from(crews).where(eq(crews.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: PersonnelInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(crews)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: PersonnelInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(crews)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(crews.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(crews)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(crews.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<PersonnelOption[]> {
    return await this.db
      .select({
        id: crews.id,
        employeeCode: crews.employeeCode,
        fullName: crews.fullName,
        crewRole: crews.crewRole,
        licenseExpiryDate: crews.licenseExpiryDate,
        medicalExpiryDate: crews.medicalExpiryDate,
        baseStationId: crews.baseStationId,
        dutyStationId: crews.dutyStationId,
        availabilityStatus: crews.availabilityStatus,
        readinessNote: crews.readinessNote
      })
      .from(crews)
      .where(eq(crews.isActive, true))
      .orderBy(asc(crews.employeeCode));
  }
}
