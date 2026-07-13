import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { currencies } from '../../../db/schema';
import type {
  CurrencyDto,
  CurrencyInput,
  CurrencyListQuery,
  CurrencyOption
} from '../../../../shared/features/finance/currencies';

function toDto(row: typeof currencies.$inferSelect): CurrencyDto {
  return {
    id: row.id,
    currencyCode: row.currencyCode,
    currencyName: row.currencyName,
    symbol: row.symbol,
    decimalPlaces: row.decimalPlaces,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class CurrencyRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: CurrencyListQuery): Promise<CurrencyDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(currencies.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(currencies.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(currencies.currencyCode, term),
          like(currencies.currencyName, term),
          like(currencies.symbol, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(currencies)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(currencies.currencyCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<CurrencyDto | null> {
    const row = await this.db.select().from(currencies).where(eq(currencies.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: CurrencyInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(currencies)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: CurrencyInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(currencies)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(currencies.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(currencies)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(currencies.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<CurrencyOption[]> {
    return await this.db
      .select({
        id: currencies.id,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName
      })
      .from(currencies)
      .where(eq(currencies.isActive, true))
      .orderBy(asc(currencies.currencyCode));
  }
}
