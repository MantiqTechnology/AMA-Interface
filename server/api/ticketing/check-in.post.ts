import { eq } from 'drizzle-orm';
import { getDbClient } from '../../db/client';
import { manifests } from '../../db/schema';
import { defineApiEventHandler } from '../../utils/api-response';

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db } = getDbClient(config.dbPath);
  const body = await readBody(event);

  if (!body.ticketId) {
    throw createError({ statusCode: 400, message: 'Missing ticketId' });
  }

  const row = await db.select().from(manifests).where(eq(manifests.id, body.ticketId)).get();
  if (!row) {
    throw createError({ statusCode: 404, message: 'Ticket not found' });
  }

  interface TicketRemarks {
    ticketPrice?: number;
    paymentStatus?: string;
    checkInStatus?: string;
    loyaltyMemberId?: string | null;
    agentId?: string | null;
    createdAt?: string | null;
  }

  let remarksObj: TicketRemarks = {};
  if (row.remarks) {
    try {
      remarksObj = JSON.parse(row.remarks) as TicketRemarks;
    } catch {
      remarksObj = {};
    }
  }

  if (remarksObj.paymentStatus !== 'PAID') {
    throw createError({ statusCode: 400, message: 'Tiket belum dibayar!' });
  }

  remarksObj.checkInStatus = 'CHECKED_IN';
  const updatedRemarks = JSON.stringify(remarksObj);

  await db
    .update(manifests)
    .set({ remarks: updatedRemarks })
    .where(eq(manifests.id, body.ticketId));

  return {
    success: true,
    ticket: {
      ...row,
      ...remarksObj,
      remarks: undefined
    }
  };
});
