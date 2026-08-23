import { and, desc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { safetyCommunications } from '../../../db/schema';
import type { SafetyCommunicationDto, SafetyCommunicationInput, SafetyCommListQuery, CommStatus } from './types';

function toDto(row: typeof safetyCommunications.$inferSelect): SafetyCommunicationDto {
  return {
    id: row.id,
    commType: row.commType as SafetyCommunicationDto['commType'],
    urgency: row.urgency as SafetyCommunicationDto['urgency'],
    title: row.title,
    content: row.content,
    status: row.status as CommStatus,
    documentId: row.documentId,
    authorUserId: row.authorUserId,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class SafetyCommunicationRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: SafetyCommListQuery): Promise<SafetyCommunicationDto[]> {
    const conditions: SQL[] = [];
    
    if (query.status) conditions.push(eq(safetyCommunications.status, query.status));
    if (query.commType) conditions.push(eq(safetyCommunications.commType, query.commType));
    if (query.urgency) conditions.push(eq(safetyCommunications.urgency, query.urgency));

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(like(safetyCommunications.title, term), like(safetyCommunications.content, term)) as SQL
      );
    }

    const rows = await this.db
      .select()
      .from(safetyCommunications)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(safetyCommunications.createdAt));

    return rows.map(toDto);
  }

  async getById(id: string): Promise<SafetyCommunicationDto | null> {
    const row = await this.db.select().from(safetyCommunications).where(eq(safetyCommunications.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: SafetyCommunicationInput, timestamp: string) {
    const row = await this.db
      .insert(safetyCommunications)
      .values({
        id,
        commType: input.commType,
        urgency: input.urgency ?? 'NORMAL',
        title: input.title,
        content: input.content,
        documentId: input.documentId,
        authorUserId: input.authorUserId,
        status: 'DRAFT',
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async publish(id: string, timestamp: string) {
    const row = await this.db
      .update(safetyCommunications)
      .set({ status: 'PUBLISHED', publishedAt: timestamp, updatedAt: timestamp })
      .where(eq(safetyCommunications.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }
}