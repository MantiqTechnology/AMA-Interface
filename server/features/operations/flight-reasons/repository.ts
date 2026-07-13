import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { flightReasons } from '../../../db/schema';
import type {
  FlightReasonDto,
  FlightReasonInput,
  FlightReasonListQuery,
  FlightReasonOption
} from '../../../../shared/features/operations/flight-reasons';

function toDto(row: typeof flightReasons.$inferSelect): FlightReasonDto {
  return {
    id: row.id,
    reasonCode: row.reasonCode,
    reasonName: row.reasonName,
    reasonType: row.reasonType,
    category: row.category,
    description: row.description,
    requiresNote: row.requiresNote,
    affectsOperationalKpi: row.affectsOperationalKpi,
    affectsFinanceReview: row.affectsFinanceReview,
    dashboardSeverity: row.dashboardSeverity,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class FlightReasonRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: FlightReasonListQuery): Promise<FlightReasonDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(flightReasons.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(flightReasons.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(flightReasons.reasonCode, term),
          like(flightReasons.reasonName, term),
          like(flightReasons.reasonType, term),
          like(flightReasons.category, term),
          like(flightReasons.description, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(flightReasons)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(flightReasons.reasonCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<FlightReasonDto | null> {
    const row = await this.db.select().from(flightReasons).where(eq(flightReasons.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: FlightReasonInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(flightReasons)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: FlightReasonInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(flightReasons)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(flightReasons.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(flightReasons)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(flightReasons.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<FlightReasonOption[]> {
    return await this.db
      .select({
        id: flightReasons.id,
        reasonCode: flightReasons.reasonCode,
        reasonName: flightReasons.reasonName
      })
      .from(flightReasons)
      .where(eq(flightReasons.isActive, true))
      .orderBy(asc(flightReasons.reasonCode));
  }
}
