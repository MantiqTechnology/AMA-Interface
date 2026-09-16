import { and, desc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { avturTransactions } from '../../../db/schema';
import type { AvturTransactionDto, AvturTransactionListQuery, CreateAvturTransactionInput } from './types';

function toDto(row: typeof avturTransactions.$inferSelect): AvturTransactionDto {
  return {
    id: row.id,
    transactionNo: row.transactionNo,
    workflowType: row.workflowType as AvturTransactionDto['workflowType'],
    sourceAssetId: row.sourceAssetId,
    targetAssetId: row.targetAssetId,
    flightMissionId: row.flightMissionId,
    aircraftTailNo: row.aircraftTailNo,
    flowmeterStartKg: row.flowmeterStartKg,
    flowmeterEndKg: row.flowmeterEndKg,
    totalVolumeLiters: row.totalVolumeLiters,
    densityMeasured: row.densityMeasured,
    temperatureCelsius: row.temperatureCelsius,
    groundingVerified: Boolean(row.groundingVerified),
    swdTestPassed: Boolean(row.swdTestPassed),
    sealIntact: Boolean(row.sealIntact),
    settlingTimePassed: Boolean(row.settlingTimePassed),
    solenoidCutoffTriggered: Boolean(row.solenoidCutoffTriggered),
    operatorId: row.operatorId,
    syncedFromDevice: Boolean(row.syncedFromDevice),
    createdTimestamp: row.createdTimestamp
  };
}

export class FuelTransactionRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: AvturTransactionListQuery): Promise<AvturTransactionDto[]> {
    const conditions: SQL[] = [];

    if (query.workflowType) conditions.push(eq(avturTransactions.workflowType, query.workflowType));
    if (query.sourceAssetId) conditions.push(eq(avturTransactions.sourceAssetId, query.sourceAssetId));
    if (query.operatorId) conditions.push(eq(avturTransactions.operatorId, query.operatorId));
    if (query.aircraftTailNo) conditions.push(eq(avturTransactions.aircraftTailNo, query.aircraftTailNo));

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(avturTransactions.transactionNo, term),
          like(avturTransactions.aircraftTailNo, term)
        ) as SQL
      );
    }

    const rows = await this.db
      .select()
      .from(avturTransactions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(avturTransactions.createdTimestamp));

    return rows.map(toDto);
  }

  async getById(id: string): Promise<AvturTransactionDto | null> {
    const row = await this.db
      .select()
      .from(avturTransactions)
      .where(eq(avturTransactions.id, id))
      .get();
    return row ? toDto(row) : null;
  }

  async create(id: string, transactionNo: string, input: CreateAvturTransactionInput, timestamp: string): Promise<AvturTransactionDto> {
    const row = await this.db
      .insert(avturTransactions)
      .values({
        id,
        transactionNo,
        workflowType: input.workflowType,
        sourceAssetId: input.sourceAssetId,
        targetAssetId: input.targetAssetId ?? null,
        flightMissionId: input.flightMissionId ?? null,
        aircraftTailNo: input.aircraftTailNo ?? null,
        flowmeterStartKg: input.flowmeterStartKg,
        flowmeterEndKg: input.flowmeterEndKg,
        totalVolumeLiters: input.totalVolumeLiters,
        densityMeasured: input.densityMeasured,
        temperatureCelsius: input.temperatureCelsius,
        groundingVerified: input.groundingVerified,
        swdTestPassed: input.swdTestPassed,
        sealIntact: input.sealIntact,
        settlingTimePassed: input.settlingTimePassed,
        solenoidCutoffTriggered: false,
        operatorId: input.operatorId,
        syncedFromDevice: input.syncedFromDevice ?? false,
        createdTimestamp: timestamp
      })
      .returning()
      .get();

    return toDto(row);
  }
}