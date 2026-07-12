import { eq } from 'drizzle-orm';
import { getDbClient } from '../../db/client';
import { cargoBookings } from '../../db/schema';
import { defineApiEventHandler } from '../../utils/api-response';

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db } = getDbClient(config.dbPath);
  const query = getQuery(event);

  let rows: (typeof cargoBookings.$inferSelect)[] = [];
  if (query.id) {
    const row = await db
      .select()
      .from(cargoBookings)
      .where(eq(cargoBookings.id, String(query.id)))
      .get();
    rows = row ? [row] : [];
  } else if (query.flightOrderId) {
    rows = await db
      .select()
      .from(cargoBookings)
      .where(eq(cargoBookings.flightOrderId, String(query.flightOrderId)));
  } else {
    rows = await db.select().from(cargoBookings);
  }

  const list = rows.map((row) => ({
    id: row.id,
    senderName: row.senderName,
    receiverName: row.receiverName,
    flightOrderId: row.flightOrderId,
    actualWeightKg: row.actualWeightKg,
    lengthCm: row.lengthCm,
    widthCm: row.widthCm,
    heightCm: row.heightCm,
    isDangerous: Boolean(row.isDangerous),
    dgClass: row.dgClass,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    agentId: row.agentId,
    totalTariff: row.totalTariff,
    status: row.status,
    createdAt: row.createdAt
  }));

  return query.id ? list[0] || null : list;
});
