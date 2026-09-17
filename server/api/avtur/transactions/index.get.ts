import { eq, and, desc } from 'drizzle-orm'
import { avturTransactions } from '../../../db/schema/avtur'
import { getDbClient } from '../../../db/client'

const { db } = getDbClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { aircraftTailNo, workflowType, operatorId, limit } = query

  const conditions = []
  if (aircraftTailNo) conditions.push(eq(avturTransactions.aircraftTailNo, String(aircraftTailNo)))
  if (workflowType) conditions.push(eq(avturTransactions.workflowType, String(workflowType) as any))
  if (operatorId) conditions.push(eq(avturTransactions.operatorId, String(operatorId)))

  const fetchLimit = limit ? Number(limit) : 50

  const transactions = conditions.length > 0
    ? await db
        .select()
        .from(avturTransactions)
        .where(and(...conditions))
        .orderBy(desc(avturTransactions.createdTimestamp))
        .limit(fetchLimit)
    : await db
        .select()
        .from(avturTransactions)
        .orderBy(desc(avturTransactions.createdTimestamp))
        .limit(fetchLimit)

  return {
    success: true,
    count: transactions.length,
    data: transactions,
  }
})