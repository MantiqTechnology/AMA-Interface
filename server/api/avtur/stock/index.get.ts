import { eq, sql } from 'drizzle-orm'
import { avturTransactions } from '../../../db/schema/avtur'
import { getDbClient } from '../../../db/client'

const { db } = getDbClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { sourceAssetId } = query

  // Kalkulasi total BBM yang dituang per aset/tangki/drum
  const conditions = sourceAssetId ? eq(avturTransactions.sourceAssetId, String(sourceAssetId)) : undefined

  const summary = await db
    .select({
      sourceAssetId: avturTransactions.sourceAssetId,
      totalDispensedLiters: sql<number>`SUM(${avturTransactions.totalVolumeLiters})`,
      totalTransactions: sql<number>`COUNT(${avturTransactions.id})`,
    })
    .from(avturTransactions)
    .where(conditions)
    .groupBy(avturTransactions.sourceAssetId)

  return {
    success: true,
    data: summary,
  }
})