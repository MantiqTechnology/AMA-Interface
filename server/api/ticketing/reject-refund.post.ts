import { eq } from 'drizzle-orm';
import { getDbClient } from '../../db/client';
import { manifests, cargoBookings } from '../../db/schema';
import { defineApiEventHandler } from '../../utils/api-response';

interface TicketRemarks {
  ticketPrice?: number;
  paymentStatus?: string;
  checkInStatus?: string;
  loyaltyMemberId?: string | null;
  agentId?: string | null;
  createdAt?: string | null;
  refundReason?: string | null;
}

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db } = getDbClient(config.dbPath);
  const body = await readBody(event);

  if (!body.type || !body.id) {
    throw createError({ statusCode: 400, message: 'Missing type or id' });
  }

  if (body.type === 'ticket') {
    const row = await db.select().from(manifests).where(eq(manifests.id, body.id)).get();
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

    remarksObj.paymentStatus = 'PAID';
    remarksObj.refundReason = null;
    const updatedRemarks = JSON.stringify(remarksObj);

    await db.update(manifests).set({ remarks: updatedRemarks }).where(eq(manifests.id, body.id));

    return {
      success: true,
      message: 'Penolakan refund tiket berhasil diproses',
      ticket: {
        ...row,
        ...remarksObj,
        remarks: undefined
      }
    };
  } else if (body.type === 'cargo') {
    const row = await db.select().from(cargoBookings).where(eq(cargoBookings.id, body.id)).get();
    if (!row) {
      throw createError({ statusCode: 404, message: 'Cargo AWB not found' });
    }

    await db
      .update(cargoBookings)
      .set({
        paymentStatus: 'PAID',
        status: 'BOOKED'
      })
      .where(eq(cargoBookings.id, body.id));

    return {
      success: true,
      message: 'Penolakan refund kargo berhasil diproses',
      cargo: {
        ...row,
        paymentStatus: 'PAID',
        status: 'BOOKED'
      }
    };
  } else {
    throw createError({ statusCode: 400, message: 'Invalid type parameter' });
  }
});
