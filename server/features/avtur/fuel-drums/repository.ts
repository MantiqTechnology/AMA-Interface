import { and, desc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { avturAssets } from '../../../db/schema';
import type { FuelDrumDto, FuelDrumListQuery } from './types';

function toDto(row: typeof avturAssets.$inferSelect): FuelDrumDto {
  return {
    id: row.id,
    stationId: row.stationId,
    assetCode: row.assetCode,
    assetName: row.assetName,
    serialNumberPhysical: row.serialNumberPhysical,
    operationalStatus: row.operationalStatus,
    installedAt: row.installedAt
  };
}

export class FuelDrumRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: FuelDrumListQuery): Promise<FuelDrumDto[]> {
    const conditions: SQL[] = [eq(avturAssets.category, 'RFID_TAG')];

    if (query.stationId) conditions.push(eq(avturAssets.stationId, query.stationId));

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

  async getById(id: string): Promise<FuelDrumDto | null> {
    const row = await this.db
      .select()
      .from(avturAssets)
      .where(and(eq(avturAssets.id, id), eq(avturAssets.category, 'RFID_TAG')))
      .get();
    return row ? toDto(row) : null;
  }
}