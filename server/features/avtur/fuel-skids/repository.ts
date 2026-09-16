import { and, desc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { avturAssets } from '../../../db/schema';
import type { FuelSkidDto, FuelSkidListQuery } from './types';

function toDto(row: typeof avturAssets.$inferSelect): FuelSkidDto {
  return {
    id: row.id,
    stationId: row.stationId,
    assetCode: row.assetCode,
    assetName: row.assetName,
    brandModel: row.brandModel,
    serialNumberPhysical: row.serialNumberPhysical,
    operationalStatus: row.operationalStatus as FuelSkidDto['operationalStatus'],
    installedAt: row.installedAt,
    lastCalibratedAt: row.lastCalibratedAt
  };
}

export class FuelSkidRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: FuelSkidListQuery): Promise<FuelSkidDto[]> {
    const conditions: SQL[] = [eq(avturAssets.category, 'SKID_ASSEMBLY')];

    if (query.stationId) conditions.push(eq(avturAssets.stationId, query.stationId));
    if (query.operationalStatus) conditions.push(eq(avturAssets.operationalStatus, query.operationalStatus));

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(like(avturAssets.assetCode, term), like(avturAssets.assetName, term)) as SQL
      );
    }

    const rows = await this.db
      .select()
      .from(avturAssets)
      .where(and(...conditions))
      .orderBy(desc(avturAssets.assetCode));

    return rows.map(toDto);
  }

  async getById(id: string): Promise<FuelSkidDto | null> {
    const row = await this.db
      .select()
      .from(avturAssets)
      .where(and(eq(avturAssets.id, id), eq(avturAssets.category, 'SKID_ASSEMBLY')))
      .get();
    return row ? toDto(row) : null;
  }
}