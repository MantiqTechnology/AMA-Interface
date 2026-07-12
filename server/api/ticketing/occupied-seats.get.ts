import { and, eq, sql } from 'drizzle-orm';
import { getDbClient } from '../../db/client';
import { manifests } from '../../db/schema';
import { defineApiEventHandler } from '../../utils/api-response';

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db } = getDbClient(config.dbPath);
  const query = getQuery(event);

  const flightOrderId = query.flightOrderId;
  if (!flightOrderId) {
    throw createError({ statusCode: 400, message: 'Missing flightOrderId parameter' });
  }

  const rows = await db
    .select({ seatNumber: manifests.seatNumber })
    .from(manifests)
    .where(
      and(
        eq(manifests.flightOrderId, String(flightOrderId)),
        sql`remarks NOT LIKE '%"paymentStatus":"REFUNDED"%'`
      )
    );

  return rows.map((r) => r.seatNumber);
});
