import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { agents } from '../../../db/schema';
import type {
  AgentDto,
  AgentInput,
  AgentListQuery,
  AgentOption
} from '../../../../shared/features/commercial/agents';

function toDto(row: typeof agents.$inferSelect): AgentDto {
  return {
    id: row.id,
    agentCode: row.agentCode,
    agentName: row.agentName,
    agentType: row.agentType,
    stationId: row.stationId,
    commissionBasisPoints: row.commissionBasisPoints,
    contactPerson: row.contactPerson,
    phone: row.phone,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class AgentRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: AgentListQuery): Promise<AgentDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(agents.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(agents.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(agents.agentCode, term),
          like(agents.agentName, term),
          like(agents.contactPerson, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(agents)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(agents.agentCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<AgentDto | null> {
    const row = await this.db.select().from(agents).where(eq(agents.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: AgentInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(agents)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: AgentInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(agents)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(agents.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(agents)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(agents.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<AgentOption[]> {
    return await this.db
      .select({ id: agents.id, agentCode: agents.agentCode, agentName: agents.agentName })
      .from(agents)
      .where(eq(agents.isActive, true))
      .orderBy(asc(agents.agentCode));
  }
}
