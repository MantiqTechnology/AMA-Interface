import { and, desc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { regulatoryComplianceReports } from '../../../db/schema';
import type {
  RegulatoryReportDto,
  RegulatoryReportInput,
  RegulatoryReportListQuery,
  RegulatoryReportStatus
} from './types';

function toDto(row: typeof regulatoryComplianceReports.$inferSelect): RegulatoryReportDto {
  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    sourceReportId: row.sourceReportId,
    reportType: row.reportType as RegulatoryReportDto['reportType'],
    targetAuthority: row.targetAuthority,
    generatedByUserId: row.generatedByUserId,
    generatedAt: row.generatedAt,
    submittedAt: row.submittedAt,
    authorityReceiptNumber: row.authorityReceiptNumber,
    status: row.status as RegulatoryReportStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class RegulatoryReportRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: RegulatoryReportListQuery): Promise<RegulatoryReportDto[]> {
    const conditions: SQL[] = [];

    if (query.status) conditions.push(eq(regulatoryComplianceReports.status, query.status));
    if (query.reportType)
      conditions.push(eq(regulatoryComplianceReports.reportType, query.reportType));

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(regulatoryComplianceReports.referenceNumber, term),
          like(regulatoryComplianceReports.authorityReceiptNumber, term)
        ) as SQL
      );
    }

    const rows = await this.db
      .select()
      .from(regulatoryComplianceReports)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(regulatoryComplianceReports.generatedAt));

    return rows.map(toDto);
  }

  async getById(id: string): Promise<RegulatoryReportDto | null> {
    const row = await this.db
      .select()
      .from(regulatoryComplianceReports)
      .where(eq(regulatoryComplianceReports.id, id))
      .get();
    return row ? toDto(row) : null;
  }

  async create(
    id: string,
    referenceNumber: string,
    input: RegulatoryReportInput,
    timestamp: string
  ) {
    const row = await this.db
      .insert(regulatoryComplianceReports)
      .values({
        id,
        referenceNumber,
        sourceReportId: input.sourceReportId,
        reportType: input.reportType ?? 'MOR',
        targetAuthority: input.targetAuthority ?? 'DKUPPU',
        generatedByUserId: input.generatedByUserId,
        generatedAt: timestamp,
        status: 'GENERATED',
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async markAsSubmitted(id: string, receiptNumber: string | null, timestamp: string) {
    const row = await this.db
      .update(regulatoryComplianceReports)
      .set({
        status: receiptNumber ? 'ACKNOWLEDGED' : 'SUBMITTED',
        submittedAt: timestamp,
        authorityReceiptNumber: receiptNumber,
        updatedAt: timestamp
      })
      .where(eq(regulatoryComplianceReports.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }
}
