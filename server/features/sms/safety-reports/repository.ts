import { and, desc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { safetyReports } from '../../../db/schema';
import type {
  SafetyReportDto,
  SafetyReportInput,
  SafetyReportListQuery
} from './types'; 

function toDto(row: typeof safetyReports.$inferSelect): SafetyReportDto {
  return {
    id: row.id,
    reportNumber: row.reportNumber,
    reportCategory: row.reportCategory as SafetyReportDto['reportCategory'],
    stationId: row.stationId,
    aircraftId: row.aircraftId,
    flightOperationId: row.flightOperationId,
    description: row.description,
    isAnonymous: row.isAnonymous,
    reportedByUserId: row.isAnonymous ? null : row.reportedByUserId,
    evidenceIdsJson: row.evidenceIdsJson,
    status: row.status as SafetyReportDto['status'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class SafetyReportRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: SafetyReportListQuery): Promise<SafetyReportDto[]> {
    const conditions: SQL[] = [];
    
    if (query.status) conditions.push(eq(safetyReports.status, query.status));
    if (query.category) conditions.push(eq(safetyReports.reportCategory, query.category));
    if (query.stationId) conditions.push(eq(safetyReports.stationId, query.stationId));

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(safetyReports.reportNumber, term),
          like(safetyReports.description, term)
        ) as SQL
      );
    }

    const rows = await this.db
      .select()
      .from(safetyReports)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(safetyReports.createdAt));

    return rows.map(toDto);
  }

  async getById(id: string): Promise<SafetyReportDto | null> {
    const row = await this.db.select().from(safetyReports).where(eq(safetyReports.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, reportNumber: string, input: SafetyReportInput, timestamp: string) {
    const row = await this.db
      .insert(safetyReports)
      .values({
        id,
        reportNumber,
        reportCategory: input.reportCategory,
        stationId: input.stationId,
        aircraftId: input.aircraftId,
        flightOperationId: input.flightOperationId,
        description: input.description,
        isAnonymous: input.isAnonymous ?? false,
        reportedByUserId: input.isAnonymous ? null : input.reportedByUserId,
        evidenceIdsJson: input.evidenceIdsJson ?? '[]',
        status: 'SUBMITTED',
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async updateStatus(id: string, status: SafetyReportDto['status'], timestamp: string) {
    const row = await this.db
      .update(safetyReports)
      .set({ status, updatedAt: timestamp })
      .where(eq(safetyReports.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }
}