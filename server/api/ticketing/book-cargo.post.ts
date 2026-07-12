import { getDbClient } from '../../db/client';
import { cargoBookings } from '../../db/schema';
import { defineApiEventHandler } from '../../utils/api-response';

// Helper to generate a random AWB number
function generateAwbNumber() {
  const chars = '0123456789';
  let result = 'AWB-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db, sqlite } = getDbClient(config.dbPath);
  const body = await readBody(event);

  if (!body.flightOrderId || !body.senderName || !body.receiverName || !body.actualWeightKg) {
    throw createError({ statusCode: 400, message: 'Missing required cargo fields' });
  }

  const awbId = generateAwbNumber();
  const values = {
    id: awbId,
    senderName: body.senderName,
    receiverName: body.receiverName,
    flightOrderId: body.flightOrderId,
    actualWeightKg: Number(body.actualWeightKg),
    lengthCm: Number(body.lengthCm || 30),
    widthCm: Number(body.widthCm || 30),
    heightCm: Number(body.heightCm || 30),
    isDangerous: Boolean(body.isDangerous),
    dgClass: body.isDangerous ? body.dgClass : null,
    paymentMethod: body.paymentMethod || 'TRANSFER',
    paymentStatus: 'UNPAID',
    agentId: body.agentId || null,
    totalTariff: Number(body.totalTariff || 0),
    status: 'BOOKED',
    createdAt: new Date().toISOString()
  };

  await db.insert(cargoBookings).values(values);

  // Sync to OCC flight manifests
  try {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO flight_manifests (id, flight_id, manifest_type, status, created_at, updated_at)
         VALUES (?, ?, 'CARGO', 'DRAFT', ?, ?)`
      )
      .run(`manifest-${body.flightOrderId}-cargo`, body.flightOrderId, now, now);

    const volWeight =
      Math.round(
        ((Number(body.lengthCm || 30) * Number(body.widthCm || 30) * Number(body.heightCm || 30)) /
          6000) *
          10
      ) / 10;
    const chargeableWeight = Math.max(Number(body.actualWeightKg), volWeight);
    const dgStatus = body.isDangerous ? 'PENDING' : 'NOT_APPLICABLE';

    sqlite
      .prepare(
        `INSERT INTO flight_manifest_cargo_items (
           id, manifest_id, description, sender_name, receiver_name, actual_weight_kg,
           volume_weight_kg, chargeable_weight_kg, dg_category_id, dg_acceptance_status,
           remarks, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`
      )
      .run(
        `cargo-sync-${awbId}`,
        `manifest-${body.flightOrderId}-cargo`,
        'Cargo Shipment AWB',
        body.senderName,
        body.receiverName,
        Number(body.actualWeightKg),
        volWeight,
        chargeableWeight,
        dgStatus,
        'Sync from Ticketing',
        now,
        now
      );
  } catch (syncError) {
    console.error('Failed to sync cargo to OCC manifest:', syncError);
  }

  return {
    success: true,
    cargo: values
  };
});
