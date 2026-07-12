import { eq } from 'drizzle-orm';
import { getDbClient } from '../../db/client';
import { cargoBookings } from '../../db/schema';
import { defineApiEventHandler } from '../../utils/api-response';

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db } = getDbClient(config.dbPath);
  const body = await readBody(event);

  if (!body.awbNumber) {
    throw createError({ statusCode: 400, message: 'Missing awbNumber' });
  }

  const row = await db
    .select()
    .from(cargoBookings)
    .where(eq(cargoBookings.id, body.awbNumber))
    .get();
  if (!row) {
    throw createError({ statusCode: 404, message: 'AWB not found' });
  }

  await db
    .update(cargoBookings)
    .set({ paymentStatus: 'PAID' })
    .where(eq(cargoBookings.id, body.awbNumber));

  return {
    success: true,
    cargo: {
      ...row,
      paymentStatus: 'PAID'
    }
  };
});
