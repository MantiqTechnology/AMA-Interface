// server/features/sms/safety-assurance/repository.ts

import { desc, inArray } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { safetyAudits, safetyMocs } from '../../../db/schema';
import type { SafetyAuditDto, SafetyMocDto } from './types';

// Pemetaan data mentah dari database ke bentuk DTO yang bersih
function toAuditDto(row: typeof safetyAudits.$inferSelect): SafetyAuditDto {
  return {
    id: row.id,
    auditNumber: row.auditNumber,
    subject: row.subject,
    auditorName: row.auditorName,
    auditType: row.auditType as SafetyAuditDto['auditType'],
    scheduledFrom: row.scheduledFrom,
    scheduledTo: row.scheduledTo,
    findingsCount: row.findingsCount,
    status: row.status as SafetyAuditDto['status'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toMocDto(row: typeof safetyMocs.$inferSelect): SafetyMocDto {
  return {
    id: row.id,
    mocNumber: row.mocNumber,
    title: row.title,
    sponsorDepartment: row.sponsorDepartment,
    progressPercentage: row.progressPercentage,
    status: row.status as SafetyMocDto['status'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class SafetyAssuranceRepository {
  constructor(private readonly db: AppDatabase) {}

  async getRecentAudits(): Promise<SafetyAuditDto[]> {
    const rows = await this.db
      .select()
      .from(safetyAudits)
      .orderBy(desc(safetyAudits.createdAt))
      .limit(20);
    return rows.map(toAuditDto);
  }

  async getActiveMocs(): Promise<SafetyMocDto[]> {
    const rows = await this.db
      .select()
      .from(safetyMocs)
      // Hanya ambil MOC yang sedang berjalan (bukan yang sudah tutup/batal)
      .where(inArray(safetyMocs.status, ['INITIATED', 'RISK_ASSESSMENT', 'IMPLEMENTATION']))
      .orderBy(desc(safetyMocs.createdAt))
      .limit(20);
    return rows.map(toMocDto);
  }
}
