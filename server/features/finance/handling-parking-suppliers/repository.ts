import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { stationServiceSuppliers } from '../../../db/schema';
import type {
  HandlingParkingSupplierDto,
  HandlingParkingSupplierInput,
  HandlingParkingSupplierListQuery,
  HandlingParkingSupplierOption
} from '../../../../shared/features/finance/handling-parking-suppliers';

function toDto(row: typeof stationServiceSuppliers.$inferSelect): HandlingParkingSupplierDto {
  return {
    id: row.id,
    supplierCode: row.supplierCode,
    supplierName: row.supplierName,
    stationId: row.stationId,
    serviceType: row.serviceType,
    referenceRate: row.referenceRate,
    currencyId: row.currencyId,
    contactPerson: row.contactPerson,
    phone: row.phone,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class HandlingParkingSupplierRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: HandlingParkingSupplierListQuery): Promise<HandlingParkingSupplierDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(stationServiceSuppliers.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(stationServiceSuppliers.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(stationServiceSuppliers.supplierCode, term),
          like(stationServiceSuppliers.supplierName, term),
          like(stationServiceSuppliers.serviceType, term),
          like(stationServiceSuppliers.contactPerson, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(stationServiceSuppliers)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(stationServiceSuppliers.supplierCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<HandlingParkingSupplierDto | null> {
    const row = await this.db
      .select()
      .from(stationServiceSuppliers)
      .where(eq(stationServiceSuppliers.id, id))
      .get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: HandlingParkingSupplierInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(stationServiceSuppliers)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: HandlingParkingSupplierInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(stationServiceSuppliers)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(stationServiceSuppliers.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(stationServiceSuppliers)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(stationServiceSuppliers.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<HandlingParkingSupplierOption[]> {
    return await this.db
      .select({
        id: stationServiceSuppliers.id,
        supplierCode: stationServiceSuppliers.supplierCode,
        supplierName: stationServiceSuppliers.supplierName
      })
      .from(stationServiceSuppliers)
      .where(eq(stationServiceSuppliers.isActive, true))
      .orderBy(asc(stationServiceSuppliers.supplierCode));
  }
}
