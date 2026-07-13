import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { chartOfAccounts } from '../../../db/schema';
import type {
  ChartOfAccountDto,
  ChartOfAccountInput,
  ChartOfAccountListQuery,
  ChartOfAccountOption
} from '../../../../shared/features/finance/chart-of-accounts';

function toDto(row: typeof chartOfAccounts.$inferSelect): ChartOfAccountDto {
  return {
    id: row.id,
    accountCode: row.accountCode,
    accountName: row.accountName,
    accountType: row.accountType,
    normalBalance: row.normalBalance,
    parentAccountId: row.parentAccountId,
    isPostable: row.isPostable,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class ChartOfAccountRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: ChartOfAccountListQuery): Promise<ChartOfAccountDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(chartOfAccounts.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(chartOfAccounts.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(chartOfAccounts.accountCode, term),
          like(chartOfAccounts.accountName, term),
          like(chartOfAccounts.accountType, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(chartOfAccounts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(chartOfAccounts.accountCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<ChartOfAccountDto | null> {
    const row = await this.db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.id, id))
      .get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: ChartOfAccountInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(chartOfAccounts)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: ChartOfAccountInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(chartOfAccounts)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(chartOfAccounts.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(chartOfAccounts)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(chartOfAccounts.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<ChartOfAccountOption[]> {
    return await this.db
      .select({
        id: chartOfAccounts.id,
        accountCode: chartOfAccounts.accountCode,
        accountName: chartOfAccounts.accountName
      })
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.isActive, true))
      .orderBy(asc(chartOfAccounts.accountCode));
  }

  async hasActiveParentAccountId(id: string) {
    return Boolean(
      await this.db
        .select({ id: chartOfAccounts.id })
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.id, id), eq(chartOfAccounts.isActive, true)))
        .get()
    );
  }

  async getParentId(id: string) {
    return (
      (
        await this.db
          .select({ parentAccountId: chartOfAccounts.parentAccountId })
          .from(chartOfAccounts)
          .where(eq(chartOfAccounts.id, id))
          .get()
      )?.parentAccountId ?? null
    );
  }
}
