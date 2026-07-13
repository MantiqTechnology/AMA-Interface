import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { costCategories } from '../../../db/schema';
import type {
  CostCategoryDto,
  CostCategoryInput,
  CostCategoryListQuery,
  CostCategoryOption
} from '../../../../shared/features/finance/cost-categories';

function toDto(row: typeof costCategories.$inferSelect): CostCategoryDto {
  return {
    id: row.id,
    categoryCode: row.categoryCode,
    categoryName: row.categoryName,
    costGroup: row.costGroup,
    defaultCoaId: row.defaultCoaId,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class CostCategoryRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: CostCategoryListQuery): Promise<CostCategoryDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(costCategories.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(costCategories.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(costCategories.categoryCode, term),
          like(costCategories.categoryName, term),
          like(costCategories.costGroup, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(costCategories)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(costCategories.categoryCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<CostCategoryDto | null> {
    const row = await this.db.select().from(costCategories).where(eq(costCategories.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: CostCategoryInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(costCategories)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: CostCategoryInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(costCategories)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(costCategories.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(costCategories)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(costCategories.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<CostCategoryOption[]> {
    return await this.db
      .select({
        id: costCategories.id,
        categoryCode: costCategories.categoryCode,
        categoryName: costCategories.categoryName
      })
      .from(costCategories)
      .where(eq(costCategories.isActive, true))
      .orderBy(asc(costCategories.categoryCode));
  }
}
