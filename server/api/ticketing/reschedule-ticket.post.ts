import { eq, and, sql } from 'drizzle-orm';
import { getDbClient } from '../../db/client';
import { manifests, flightOrders, aircraft } from '../../db/schema';
import { defineApiEventHandler } from '../../utils/api-response';

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db, sqlite } = getDbClient(config.dbPath);
  const body = await readBody(event);

  if (!body.ticketId || !body.newFlightOrderId || !body.newSeatNumber) {
    throw createError({
      statusCode: 400,
      message: 'Missing ticketId, newFlightOrderId, or newSeatNumber'
    });
  }

  // 1. Retrieve the existing ticket
  const ticket = await db.select().from(manifests).where(eq(manifests.id, body.ticketId)).get();
  if (!ticket) {
    throw createError({ statusCode: 404, message: 'Ticket not found' });
  }

  // 2. Validate seat occupancy on the target flight
  const occupiedSeat = await db
    .select()
    .from(manifests)
    .where(
      and(
        eq(manifests.flightOrderId, body.newFlightOrderId),
        eq(manifests.seatNumber, body.newSeatNumber),
        sql`remarks NOT LIKE '%"paymentStatus":"REFUNDED"%'`
      )
    )
    .get();

  if (occupiedSeat) {
    throw createError({
      statusCode: 400,
      message: `Kursi ${body.newSeatNumber} sudah terisi pada penerbangan tujuan.`
    });
  }

  // 3. Validate target flight aircraft capacity
  const targetFlight = await db
    .select({
      aircraft: aircraft,
      manifestCount: sql<number>`(
        SELECT COUNT(*) FROM manifests 
        WHERE manifests.flight_order_id = ${flightOrders.id}
        AND remarks NOT LIKE '%"paymentStatus":"REFUNDED"%'
      )`
    })
    .from(flightOrders)
    .innerJoin(aircraft, eq(flightOrders.aircraftId, aircraft.id))
    .where(eq(flightOrders.id, body.newFlightOrderId))
    .get();

  if (!targetFlight) {
    throw createError({ statusCode: 404, message: 'Target flight not found.' });
  }

  if (targetFlight.manifestCount >= targetFlight.aircraft.capacity) {
    throw createError({
      statusCode: 400,
      message: `Kapasitas pesawat tujuan penuh (Maksimal ${targetFlight.aircraft.capacity} penumpang).`
    });
  }

  // 4. Update commercial manifests table
  await db
    .update(manifests)
    .set({
      flightOrderId: body.newFlightOrderId,
      seatNumber: body.newSeatNumber
    })
    .where(eq(manifests.id, body.ticketId));

  // 5. Sync to OCC flight manifests
  try {
    const now = new Date().toISOString();

    // Remove passenger from old OCC flight manifest
    sqlite
      .prepare('DELETE FROM flight_manifest_passengers WHERE id = ?')
      .run(`pax-sync-${body.ticketId}`);

    // Ensure new flight manifest header exists in OCC
    let manifestId = '';
    const existingManifest = sqlite
      .prepare('SELECT id FROM flight_manifests WHERE flight_id = ? AND manifest_type = ?')
      .get(body.newFlightOrderId, 'PASSENGER') as { id: string } | undefined;

    if (existingManifest) {
      manifestId = existingManifest.id;
    } else {
      manifestId = `${body.newFlightOrderId}-manifest-pax`;
      sqlite
        .prepare(
          `INSERT INTO flight_manifests (id, flight_id, manifest_type, status, created_at, updated_at)
           VALUES (?, ?, 'PASSENGER', 'DRAFT', ?, ?)`
        )
        .run(manifestId, body.newFlightOrderId, now, now);
    }

    // Insert passenger into new OCC flight manifest
    sqlite
      .prepare(
        `INSERT INTO flight_manifest_passengers (
           id, manifest_id, full_name, identity_type, identity_number, weight_kg, seat_number,
           baggage_weight_kg, remarks, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
      )
      .run(
        `pax-sync-${body.ticketId}`,
        manifestId,
        ticket.passengerName,
        'KTP',
        ticket.documentNumber,
        ticket.weightKg,
        body.newSeatNumber,
        'Rescheduled to new flight',
        now,
        now
      );
  } catch (e) {
    console.error('Failed to sync rescheduled ticket to OCC manifests:', e);
  }

  return {
    success: true,
    ticketId: body.ticketId,
    newFlightOrderId: body.newFlightOrderId,
    newSeatNumber: body.newSeatNumber
  };
});
