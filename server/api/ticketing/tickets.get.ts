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
  refundReason?: string | null;
}

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db } = getDbClient(config.dbPath);
  const query = getQuery(event);

  let rows: (typeof manifests.$inferSelect)[] = [];
  if (query.id) {
    const row = await db
      .select()
      .from(manifests)
      .where(eq(manifests.id, String(query.id)))
      .get();
    rows = row ? [row] : [];
  } else if (query.flightOrderId) {
    rows = await db
      .select()
      .from(manifests)
      .where(eq(manifests.flightOrderId, String(query.flightOrderId)));
  } else {
    rows = await db.select().from(manifests);
  }

  const ticketsList = rows.map((row) => {
    let remarksObj: TicketRemarks = {};
    if (row.remarks) {
      try {
        remarksObj = JSON.parse(row.remarks) as TicketRemarks;
      } catch {
        remarksObj = {};
      }
    }

    return {
      id: row.id,
      flightOrderId: row.flightOrderId,
      passengerName: row.passengerName,
      documentNumber: row.documentNumber,
      seatNumber: row.seatNumber,
      weightKg: row.weightKg,
      ticketPrice: remarksObj.ticketPrice || 0,
      paymentStatus: remarksObj.paymentStatus || 'UNPAID',
      checkInStatus: remarksObj.checkInStatus || 'PENDING',
      loyaltyMemberId: remarksObj.loyaltyMemberId || null,
      agentId: remarksObj.agentId || null,
      createdAt: remarksObj.createdAt || null,
      refundReason: remarksObj.refundReason || null
    };
  });

  return query.id ? ticketsList[0] || null : ticketsList;
});
