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

  if (!body.type || !body.id || !body.reason) {
    throw createError({ statusCode: 400, message: 'Missing type, id, or reason' });
  }

  const cleanReason = String(body.reason).trim();
  if (!cleanReason) {
    throw createError({ statusCode: 400, message: 'Alasan refund wajib diisi' });
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

    if (remarksObj.paymentStatus !== 'PAID') {
      throw createError({
        statusCode: 400,
        message: 'Hanya tiket berstatus PAID yang dapat direfund'
      });
    }

    remarksObj.paymentStatus = 'REFUND_REQUESTED';
    remarksObj.refundReason = cleanReason;
    const updatedRemarks = JSON.stringify(remarksObj);

    await db.update(manifests).set({ remarks: updatedRemarks }).where(eq(manifests.id, body.id));

    return {
      success: true,
      message: 'Permintaan refund tiket berhasil dikirim',
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

    if (row.paymentStatus !== 'PAID') {
      throw createError({
        statusCode: 400,
        message: 'Hanya kargo berstatus PAID yang dapat direfund'
      });
    }

    await db
      .update(cargoBookings)
      .set({
        paymentStatus: 'REFUND_REQUESTED',
        status: `REFUND_REQUESTED: ${cleanReason}`
      })
      .where(eq(cargoBookings.id, body.id));

    return {
      success: true,
      message: 'Permintaan refund kargo berhasil dikirim',
      cargo: {
        ...row,
        paymentStatus: 'REFUND_REQUESTED',
        status: `REFUND_REQUESTED: ${cleanReason}`
      }
    };
  } else {
    throw createError({ statusCode: 400, message: 'Invalid type parameter' });
  }
});
