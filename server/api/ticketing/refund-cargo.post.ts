import { eq } from 'drizzle-orm';
import { getDbClient } from '../../db/client';
import { cargoBookings } from '../../db/schema';
import { defineApiEventHandler } from '../../utils/api-response';

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db, sqlite } = getDbClient(config.dbPath);
  const body = await readBody(event);

  if (!body.cargoId) {
    throw createError({ statusCode: 400, message: 'Missing cargoId' });
  }

  const row = await db.select().from(cargoBookings).where(eq(cargoBookings.id, body.cargoId)).get();
  if (!row) {
    throw createError({ statusCode: 404, message: 'Cargo AWB not found' });
  }

  // Update status to CANCELLED and payment to REFUNDED
  await db
    .update(cargoBookings)
    .set({
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED'
    })
    .where(eq(cargoBookings.id, body.cargoId));

  // Sync to OCC flight manifests - remove the cargo entry to release payload capacity
  try {
    sqlite
      .prepare('DELETE FROM flight_manifest_cargo_items WHERE id = ?')
      .run(`cargo-sync-${body.cargoId}`);
  } catch (e) {
    console.error('Failed to remove cargo from OCC manifest sync:', e);
  }

  return {
    success: true,
    cargo: {
      ...row,
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED'
    }
  };
});
