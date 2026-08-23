import { sql, inArray } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { safetyReports, capaTickets } from '../../../db/schema';

export class SpiAnalyticsRepository {
  constructor(private readonly db: AppDatabase) {}

  async getTotalReportsCount(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`cast(count(${safetyReports.id}) as integer)` })
      .from(safetyReports);
    return result[0]?.count || 0;
  }

  // Menghitung laporan yang sifatnya insiden atau *occurrence* (kejadian nyata)
  async getIncidentCount(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`cast(count(${safetyReports.id}) as integer)` })
      .from(safetyReports)
      .where(inArray(safetyReports.reportCategory, ['INCIDENT', 'OCCURRENCE']));
    return result[0]?.count || 0;
  }

  // Menghitung tiket CAPA yang belum berstatus 'CLOSED' atau 'VERIFIED'
  async getOpenCapaCount(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`cast(count(${capaTickets.id}) as integer)` })
      .from(capaTickets)
      .where(inArray(capaTickets.status, ['NEW', 'INVESTIGATION', 'ACTION']));
    return result[0]?.count || 0;
  }

  // Menghitung kelompok bahaya terbanyak
  async getReportsByCategory() {
    return await this.db
      .select({
        category: safetyReports.reportCategory,
        count: sql<number>`cast(count(${safetyReports.id}) as integer)`
      })
      .from(safetyReports)
      .groupBy(safetyReports.reportCategory);
  }
}