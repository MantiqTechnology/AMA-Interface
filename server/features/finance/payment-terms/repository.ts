import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { paymentTerms } from '../../../db/schema';
import type {
  PaymentTermDto,
  PaymentTermInput,
  PaymentTermListQuery,
  PaymentTermOption
} from '../../../../shared/features/finance/payment-terms';

function toDto(row: typeof paymentTerms.$inferSelect): PaymentTermDto {
  return {
    id: row.id,
    termCode: row.termCode,
    termName: row.termName,
    dueDays: row.dueDays,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class PaymentTermRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: PaymentTermListQuery): Promise<PaymentTermDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(paymentTerms.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(paymentTerms.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(paymentTerms.termCode, term),
          like(paymentTerms.termName, term),
          like(paymentTerms.description, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(paymentTerms)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(paymentTerms.termCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<PaymentTermDto | null> {
    const row = await this.db.select().from(paymentTerms).where(eq(paymentTerms.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: PaymentTermInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(paymentTerms)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: PaymentTermInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(paymentTerms)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(paymentTerms.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(paymentTerms)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(paymentTerms.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<PaymentTermOption[]> {
    return await this.db
      .select({
        id: paymentTerms.id,
        termCode: paymentTerms.termCode,
        termName: paymentTerms.termName
      })
      .from(paymentTerms)
      .where(eq(paymentTerms.isActive, true))
      .orderBy(asc(paymentTerms.termCode));
  }
}
