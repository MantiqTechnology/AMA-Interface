import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { avturAssets } from '../../../db/schema';
import type { MaintenanceRecordDto } from './types';

export class FuelMaintenanceRepository {
  constructor(private readonly db: AppDatabase) {}

  async updateCalibrationDate(assetId: string, calibratedAt: string): Promise<MaintenanceRecordDto | null> {
    const row = await this.db
      .update(avturAssets)
      .set({
        lastCalibratedAt: calibratedAt,
        operationalStatus: 'ACTIVE'
      })
      .where(eq(avturAssets.id, assetId))
      .returning()
      .get();

    if (!row) return null;

    return {
      assetId: row.id,
      assetCode: row.assetCode,
      operationalStatus: row.operationalStatus,
      lastCalibratedAt: row.lastCalibratedAt
    };
  }
}