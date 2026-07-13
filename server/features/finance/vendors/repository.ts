import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { vendors } from '../../../db/schema';
import type {
  VendorDto,
  VendorInput,
  VendorListQuery,
  VendorOption
} from '../../../../shared/features/finance/vendors';

function toDto(row: typeof vendors.$inferSelect): VendorDto {
  return {
    id: row.id,
    vendorCode: row.vendorCode,
    vendorName: row.vendorName,
    vendorType: row.vendorType,
    stationId: row.stationId,
    contactPerson: row.contactPerson,
    phone: row.phone,
    email: row.email,
    paymentTermId: row.paymentTermId,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class VendorRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: VendorListQuery): Promise<VendorDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(vendors.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(vendors.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(vendors.vendorCode, term),
          like(vendors.vendorName, term),
          like(vendors.contactPerson, term),
          like(vendors.email, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(vendors)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(vendors.vendorCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<VendorDto | null> {
    const row = await this.db.select().from(vendors).where(eq(vendors.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: VendorInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(vendors)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: VendorInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(vendors)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(vendors.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(vendors)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(vendors.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<VendorOption[]> {
    return await this.db
      .select({ id: vendors.id, vendorCode: vendors.vendorCode, vendorName: vendors.vendorName })
      .from(vendors)
      .where(eq(vendors.isActive, true))
      .orderBy(asc(vendors.vendorCode));
  }
}
