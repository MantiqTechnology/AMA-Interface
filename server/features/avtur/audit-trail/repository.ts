import { desc } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { avturTransactions } from '../../../db/schema';
import type { AvturAuditLogDto } from './types';

export class AvturAuditTrailRepository {
  constructor(private readonly db: AppDatabase) {}

  async getRecentLogs(limitCount = 50): Promise<AvturAuditLogDto[]> {
    const rows = await this.db
      .select({
        transactionId: avturTransactions.id,
        transactionNo: avturTransactions.transactionNo,
        workflowType: avturTransactions.workflowType,
        operatorId: avturTransactions.operatorId,
        createdTimestamp: avturTransactions.createdTimestamp
      })
      .from(avturTransactions)
      .orderBy(desc(avturTransactions.createdTimestamp))
      .limit(limitCount);

    return rows;
  }
}