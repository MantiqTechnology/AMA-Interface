import { eq } from 'drizzle-orm';
import { getDbClient } from '../../db/client';
import { manifests } from '../../db/schema';
import { defineApiEventHandler } from '../../utils/api-response';

interface TicketRemarks {
  ticketPrice?: number;
  paymentStatus?: string;
  checkInStatus?: string;
  loyaltyMemberId?: string | null;
  agentId?: string | null;
  createdAt?: string | null;
}

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db, sqlite } = getDbClient(config.dbPath);
  const body = await readBody(event);

  if (!body.ticketId) {
    throw createError({ statusCode: 400, message: 'Missing ticketId' });
  }

  const row = await db.select().from(manifests).where(eq(manifests.id, body.ticketId)).get();
  if (!row) {
    throw createError({ statusCode: 404, message: 'Ticket not found' });
  }

  let remarksObj: TicketRemarks = {};
  if (row.remarks) {
    try {
      remarksObj = JSON.parse(row.remarks) as TicketRemarks;
    } catch {
      remarksObj = {};
    }
  }

  // Update status to REFUNDED
  remarksObj.paymentStatus = 'REFUNDED';
  remarksObj.checkInStatus = 'REFUNDED';
  const updatedRemarks = JSON.stringify(remarksObj);

  await db
    .update(manifests)
    .set({ remarks: updatedRemarks })
    .where(eq(manifests.id, body.ticketId));

  // Sync to OCC flight manifests - remove the passenger entry to release weight & space
  try {
    sqlite
      .prepare('DELETE FROM flight_manifest_passengers WHERE id = ?')
      .run(`pax-sync-${body.ticketId}`);
  } catch (e) {
    console.error('Failed to remove passenger from OCC manifest sync:', e);
  }

  return {
    success: true,
    ticket: {
      ...row,
      ...remarksObj,
      remarks: undefined
    }
  };
});
