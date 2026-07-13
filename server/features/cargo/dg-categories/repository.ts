import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { dgCategories } from '../../../db/schema';
import type {
  DgCategoryDto,
  DgCategoryInput,
  DgCategoryListQuery,
  DgCategoryOption
} from '../../../../shared/features/cargo/dg-categories';

function toDto(row: typeof dgCategories.$inferSelect): DgCategoryDto {
  return {
    id: row.id,
    dgCode: row.dgCode,
    dgClass: row.dgClass,
    description: row.description,
    handlingInstruction: row.handlingInstruction,
    requiresSpecialApproval: row.requiresSpecialApproval,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DgCategoryRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: DgCategoryListQuery): Promise<DgCategoryDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(dgCategories.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(dgCategories.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(dgCategories.dgCode, term),
          like(dgCategories.dgClass, term),
          like(dgCategories.description, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(dgCategories)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(dgCategories.dgCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<DgCategoryDto | null> {
    const row = await this.db.select().from(dgCategories).where(eq(dgCategories.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: DgCategoryInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(dgCategories)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: DgCategoryInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(dgCategories)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(dgCategories.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(dgCategories)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(dgCategories.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<DgCategoryOption[]> {
    return await this.db
      .select({
        id: dgCategories.id,
        dgCode: dgCategories.dgCode,
        description: dgCategories.description
      })
      .from(dgCategories)
      .where(eq(dgCategories.isActive, true))
      .orderBy(asc(dgCategories.dgCode));
  }
}
