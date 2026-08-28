import { and, desc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { capaTickets } from '../../../db/schema';
import type { CapaTicketDto, CapaTicketInput, CapaListQuery } from './types';

function toDto(row: typeof capaTickets.$inferSelect): CapaTicketDto {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    sourceReportId: row.sourceReportId,
    subject: row.subject,
    description: row.description,
    status: row.status as CapaTicketDto['status'],
    priority: row.priority as CapaTicketDto['priority'],
    assignedToUserId: row.assignedToUserId,
    dueDate: row.dueDate,
    isOverdueEscalated: row.isOverdueEscalated,
    escalatedToUserId: row.escalatedToUserId,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class CapaTicketRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: CapaListQuery): Promise<CapaTicketDto[]> {
    const conditions: SQL[] = [];

    if (query.status) conditions.push(eq(capaTickets.status, query.status));
    if (query.priority) conditions.push(eq(capaTickets.priority, query.priority));
    if (query.assignedToUserId)
      conditions.push(eq(capaTickets.assignedToUserId, query.assignedToUserId));
    if (query.isOverdueEscalated !== undefined)
      conditions.push(eq(capaTickets.isOverdueEscalated, query.isOverdueEscalated));

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(like(capaTickets.ticketNumber, term), like(capaTickets.subject, term)) as SQL
      );
    }

    const rows = await this.db
      .select()
      .from(capaTickets)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(capaTickets.dueDate)); // Urutkan berdasarkan tenggat waktu terdekat

    return rows.map(toDto);
  }

  async getById(id: string): Promise<CapaTicketDto | null> {
    const row = await this.db.select().from(capaTickets).where(eq(capaTickets.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, ticketNumber: string, input: CapaTicketInput, timestamp: string) {
    const row = await this.db
      .insert(capaTickets)
      .values({
        id,
        ticketNumber,
        sourceReportId: input.sourceReportId,
        subject: input.subject,
        description: input.description,
        priority: input.priority ?? 'MEDIUM',
        assignedToUserId: input.assignedToUserId,
        dueDate: input.dueDate,
        status: 'NEW',
        isOverdueEscalated: false,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async updateStatus(id: string, status: CapaTicketDto['status'], timestamp: string) {
    const resolvedAt = status === 'VERIFIED' || status === 'CLOSED' ? timestamp : null;
    const row = await this.db
      .update(capaTickets)
      .set({ status, resolvedAt, updatedAt: timestamp })
      .where(eq(capaTickets.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async escalate(id: string, escalatedToUserId: string, timestamp: string) {
    const row = await this.db
      .update(capaTickets)
      .set({
        isOverdueEscalated: true,
        escalatedToUserId,
        updatedAt: timestamp
      })
      .where(eq(capaTickets.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }
}
