import { and, eq } from 'drizzle-orm';
import { getDbClient } from '../../db/client';
import { manifests } from '../../db/schema';
import { defineApiEventHandler } from '../../utils/api-response';

// Helper to generate a random ticket ID
function generateTicketId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'TKT-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db, sqlite } = getDbClient(config.dbPath);
  const body = await readBody(event);

  if (!body.flightOrderId || !body.passengerName || !body.documentNumber || !body.seatNumber) {
    throw createError({ statusCode: 400, message: 'Missing required passenger fields' });
  }

  // Check if seat is already occupied
  const existingTicket = await db
    .select()
    .from(manifests)
    .where(
      and(
        eq(manifests.flightOrderId, body.flightOrderId),
        eq(manifests.seatNumber, body.seatNumber)
      )
    )
    .get();

  if (existingTicket) {
    throw createError({
      statusCode: 400,
      message: `Kursi ${body.seatNumber} sudah terisi. Silakan pilih kursi lain.`
    });
  }

  const ticketId = generateTicketId();
  const remarksObj = {
    ticketPrice: body.ticketPrice || 0,
    paymentStatus: 'UNPAID',
    checkInStatus: 'PENDING',
    loyaltyMemberId: body.loyaltyMemberId || null,
    agentId: body.agentId || null,
    createdAt: new Date().toISOString()
  };

  const remarks = JSON.stringify(remarksObj);

  const values = {
    id: ticketId,
    flightOrderId: body.flightOrderId,
    passengerName: body.passengerName,
    documentNumber: body.documentNumber,
    seatNumber: body.seatNumber,
    weightKg: Number(body.weightKg || 70),
    remarks
  };

  await db.insert(manifests).values(values);

  // Sync to OCC flight manifests
  try {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO flight_manifests (id, flight_id, manifest_type, status, created_at, updated_at)
         VALUES (?, ?, 'PASSENGER', 'DRAFT', ?, ?)`
      )
      .run(`manifest-${body.flightOrderId}-passenger`, body.flightOrderId, now, now);

    sqlite
      .prepare(
        `INSERT INTO flight_manifest_passengers (
           id, manifest_id, full_name, identity_type, identity_number, weight_kg, seat_number,
           baggage_weight_kg, remarks, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
      )
      .run(
        `pax-sync-${ticketId}`,
        `manifest-${body.flightOrderId}-passenger`,
        body.passengerName,
        'KTP',
        body.documentNumber,
        Number(body.weightKg || 70),
        body.seatNumber,
        'Sync from Ticketing',
        now,
        now
      );
  } catch (syncError) {
    console.error('Failed to sync passenger to OCC manifest:', syncError);
  }

  return {
    success: true,
    ticket: {
      ...values,
      ...remarksObj,
      remarks: undefined
    }
  };
});
