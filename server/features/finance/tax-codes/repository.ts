import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { taxCodes } from '../../../db/schema';
import type {
  TaxCodeDto,
  TaxCodeInput,
  TaxCodeListQuery,
  TaxCodeOption
} from '../../../../shared/features/finance/tax-codes';

function toDto(row: typeof taxCodes.$inferSelect): TaxCodeDto {
  return {
    id: row.id,
    taxCode: row.taxCode,
    taxName: row.taxName,
    taxRateBasisPoints: row.taxRateBasisPoints,
    taxType: row.taxType,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class TaxCodeRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: TaxCodeListQuery): Promise<TaxCodeDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(taxCodes.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(taxCodes.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(taxCodes.taxCode, term),
          like(taxCodes.taxName, term),
          like(taxCodes.taxType, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(taxCodes)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(taxCodes.taxCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<TaxCodeDto | null> {
    const row = await this.db.select().from(taxCodes).where(eq(taxCodes.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: TaxCodeInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(taxCodes)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: TaxCodeInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(taxCodes)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(taxCodes.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(taxCodes)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(taxCodes.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<TaxCodeOption[]> {
    return await this.db
      .select({ id: taxCodes.id, taxCode: taxCodes.taxCode, taxName: taxCodes.taxName })
      .from(taxCodes)
      .where(eq(taxCodes.isActive, true))
      .orderBy(asc(taxCodes.taxCode));
  }
}
