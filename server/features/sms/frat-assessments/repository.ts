import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { fratAssessments } from '../../../db/schema';
import type { FratAssessmentDto, RiskZone, FratStatus } from './types';

function toDto(row: typeof fratAssessments.$inferSelect): FratAssessmentDto {
  return {
    id: row.id,
    flightOperationId: row.flightOperationId,
    picEmployeeId: row.picEmployeeId,
    crewFatigueScore: row.crewFatigueScore,
    weatherRiskScore: row.weatherRiskScore,
    airstripRatingScore: row.airstripRatingScore,
    totalRiskScore: row.totalRiskScore,
    riskZone: row.riskZone as RiskZone,
    isHardLocked: row.isHardLocked,
    overrideSignoffByUserId: row.overrideSignoffByUserId,
    overrideReason: row.overrideReason,
    status: row.status as FratStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class FratAssessmentRepository {
  constructor(private readonly db: AppDatabase) {}

  async getById(id: string): Promise<FratAssessmentDto | null> {
    const row = await this.db
      .select()
      .from(fratAssessments)
      .where(eq(fratAssessments.id, id))
      .get();
    return row ? toDto(row) : null;
  }

  // 1 Penerbangan = 1 Assesment FRAT (Relasi 1:1)
  async getByFlightOperationId(flightOperationId: string): Promise<FratAssessmentDto | null> {
    const row = await this.db
      .select()
      .from(fratAssessments)
      .where(eq(fratAssessments.flightOperationId, flightOperationId))
      .get();
    return row ? toDto(row) : null;
  }

  async create(
    id: string,
    input: Omit<
      FratAssessmentDto,
      'id' | 'overrideSignoffByUserId' | 'overrideReason' | 'createdAt' | 'updatedAt'
    >,
    timestamp: string
  ) {
    const row = await this.db
      .insert(fratAssessments)
      .values({
        id,
        flightOperationId: input.flightOperationId,
        picEmployeeId: input.picEmployeeId,
        crewFatigueScore: input.crewFatigueScore,
        weatherRiskScore: input.weatherRiskScore,
        airstripRatingScore: input.airstripRatingScore,
        totalRiskScore: input.totalRiskScore,
        riskZone: input.riskZone,
        isHardLocked: input.isHardLocked,
        status: input.status,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async overrideHardLock(id: string, approverId: string, reason: string, timestamp: string) {
    const row = await this.db
      .update(fratAssessments)
      .set({
        overrideSignoffByUserId: approverId,
        overrideReason: reason,
        status: 'OVERRIDDEN',
        updatedAt: timestamp
      })
      .where(eq(fratAssessments.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }
}
