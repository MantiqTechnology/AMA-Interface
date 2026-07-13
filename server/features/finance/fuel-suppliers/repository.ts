import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { fuelSuppliers } from '../../../db/schema';
import type {
  FuelSupplierDto,
  FuelSupplierInput,
  FuelSupplierListQuery,
  FuelSupplierOption
} from '../../../../shared/features/finance/fuel-suppliers';

function toDto(row: typeof fuelSuppliers.$inferSelect): FuelSupplierDto {
  return {
    id: row.id,
    supplierCode: row.supplierCode,
    supplierName: row.supplierName,
    stationId: row.stationId,
    fuelType: row.fuelType,
    referencePricePerLitre: row.referencePricePerLitre,
    currencyId: row.currencyId,
    contactPerson: row.contactPerson,
    phone: row.phone,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class FuelSupplierRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: FuelSupplierListQuery): Promise<FuelSupplierDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(fuelSuppliers.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(fuelSuppliers.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(fuelSuppliers.supplierCode, term),
          like(fuelSuppliers.supplierName, term),
          like(fuelSuppliers.fuelType, term),
          like(fuelSuppliers.contactPerson, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(fuelSuppliers)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(fuelSuppliers.supplierCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<FuelSupplierDto | null> {
    const row = await this.db.select().from(fuelSuppliers).where(eq(fuelSuppliers.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: FuelSupplierInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(fuelSuppliers)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: FuelSupplierInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(fuelSuppliers)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(fuelSuppliers.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(fuelSuppliers)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(fuelSuppliers.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<FuelSupplierOption[]> {
    return await this.db
      .select({
        id: fuelSuppliers.id,
        supplierCode: fuelSuppliers.supplierCode,
        supplierName: fuelSuppliers.supplierName
      })
      .from(fuelSuppliers)
      .where(eq(fuelSuppliers.isActive, true))
      .orderBy(asc(fuelSuppliers.supplierCode));
  }
}
