import { and, desc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { avturAssets } from '../../../db/schema';
import type { BleDeviceListQuery, BleUltrasonicDeviceDto, BleUltrasonicDeviceInput } from './types';

function toDto(row: typeof avturAssets.$inferSelect): BleUltrasonicDeviceDto {
  return {
    id: row.id,
    stationId: row.stationId,
    assetCode: row.assetCode,
    assetName: row.assetName,
    category: row.category,
    brandModel: row.brandModel,
    serialNumberPhysical: row.serialNumberPhysical,
    serialNumberCoc: row.serialNumberCoc,
    exRating: row.exRating,
    cocStatus: row.cocStatus,
    operationalStatus: row.operationalStatus,
    installedAt: row.installedAt,
    lastCalibratedAt: row.lastCalibratedAt
  };
}

export class BleIotDeviceRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: BleDeviceListQuery): Promise<BleUltrasonicDeviceDto[]> {
    const conditions: SQL[] = [];

    if (query.stationId) conditions.push(eq(avturAssets.stationId, query.stationId));
    if (query.category) conditions.push(eq(avturAssets.category, query.category));
    if (query.operationalStatus) conditions.push(eq(avturAssets.operationalStatus, query.operationalStatus));

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(avturAssets.assetCode, term),
          like(avturAssets.assetName, term),
          like(avturAssets.serialNumberPhysical, term)
        ) as SQL
      );
    }

    const rows = await this.db
      .select()
      .from(avturAssets)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(avturAssets.assetCode));

    return rows.map(toDto);
  }

  async getById(id: string): Promise<BleUltrasonicDeviceDto | null> {
    const row = await this.db
      .select()
      .from(avturAssets)
      .where(eq(avturAssets.id, id))
      .get();
    return row ? toDto(row) : null;
  }

  async getByAssetCode(assetCode: string): Promise<BleUltrasonicDeviceDto | null> {
    const row = await this.db
      .select()
      .from(avturAssets)
      .where(eq(avturAssets.assetCode, assetCode))
      .get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: BleUltrasonicDeviceInput, timestamp: string): Promise<BleUltrasonicDeviceDto> {
    const row = await this.db
      .insert(avturAssets)
      .values({
        id,
        assetCode: input.assetCode,
        assetName: input.assetName,
        category: input.category ?? 'FLOWMETER_BLE',
        brandModel: input.brandModel ?? null,
        serialNumberPhysical: input.serialNumberPhysical,
        serialNumberCoc: input.serialNumberCoc,
        exRating: input.exRating ?? 'ATEX Zone 1',
        stationId: input.stationId,
        cocStatus: input.cocStatus ?? 'PENDING',
        operationalStatus: input.operationalStatus ?? 'ACTIVE',
        installedAt: timestamp,
        lastCalibratedAt: input.lastCalibratedAt ?? null
      })
      .returning()
      .get();

    return toDto(row);
  }

  async updateOperationalStatus(
    id: string,
    operationalStatus: BleUltrasonicDeviceDto['operationalStatus'],
    lastCalibratedAt?: string
  ): Promise<BleUltrasonicDeviceDto | null> {
    const row = await this.db
      .update(avturAssets)
      .set({
        operationalStatus,
        lastCalibratedAt: lastCalibratedAt ?? undefined
      })
      .where(eq(avturAssets.id, id))
      .returning()
      .get();

    return row ? toDto(row) : null;
  }
}