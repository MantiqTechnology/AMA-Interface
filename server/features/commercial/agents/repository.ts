import type Database from 'better-sqlite3';
import { and, asc, desc, eq, like, ne, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import {
  agentAuditLogs,
  agentCommissionRules,
  agentContacts,
  agentContracts,
  agentNotes,
  agents
} from '../../../db/schema';
import { getApplicationNow } from '../../../utils/time';
import type {
  AgentActivityItemDto,
  AgentCommissionRuleDto,
  AgentCommissionRuleInput,
  AgentContactDto,
  AgentContactInput,
  AgentContractDto,
  AgentDetailDto,
  AgentDto,
  AgentHistoryItemDto,
  AgentInput,
  AgentListQuery,
  AgentNoteDto,
  AgentOption,
  AgentRateDto
} from '../../../../shared/features/commercial/agents';

type AgentRecord = typeof agents.$inferSelect;
type AgentContactRecord = typeof agentContacts.$inferSelect;
type AgentCommissionRuleRecord = typeof agentCommissionRules.$inferSelect;
type AgentContractRecord = typeof agentContracts.$inferSelect;
type AgentNoteRecord = typeof agentNotes.$inferSelect;

function toDto(row: AgentRecord): AgentDto {
  return {
    id: row.id,
    agentCode: row.agentCode,
    agentName: row.agentName,
    agentType: row.agentType,
    stationId: row.stationId,
    customerAccountId: row.customerAccountId,
    responsiblePersonnelId: row.responsiblePersonnelId,
    primaryContactId: row.primaryContactId,
    bookingChannelCode: row.bookingChannelCode,
    defaultCurrencyCode: row.defaultCurrencyCode,
    operationalNote: row.operationalNote,
    commissionBasisPoints: row.commissionBasisPoints,
    contactPerson: row.contactPerson,
    phone: row.phone,
    isActive: row.isActive,
    lifecycleStatus: row.lifecycleStatus,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toContactDto(row: AgentContactRecord): AgentContactDto {
  return {
    id: row.id,
    agentId: row.agentId,
    contactName: row.contactName,
    roleTitle: row.roleTitle,
    department: row.department,
    email: row.email,
    phone: row.phone,
    contactType: row.contactType,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toRuleDto(row: AgentCommissionRuleRecord): AgentCommissionRuleDto {
  return {
    id: row.id,
    agentId: row.agentId,
    commissionType: row.commissionType,
    percentageBasisPoints: row.percentageBasisPoints,
    fixedAmountMinor: row.fixedAmountMinor,
    currencyCode: row.currencyCode,
    basisType: row.basisType,
    serviceTypeId: row.serviceTypeId,
    routeId: row.routeId,
    rateAgreementId: row.rateAgreementId,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    lifecycleStatus: row.lifecycleStatus,
    priority: row.priority,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toContractDto(row: AgentContractRecord): AgentContractDto {
  return {
    id: row.id,
    agentId: row.agentId,
    contractNumber: row.contractNumber,
    contractType: row.contractType,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    status: row.status,
    signedDate: row.signedDate,
    documentId: row.documentId,
    renewalStatus: row.renewalStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toNoteDto(row: AgentNoteRecord): AgentNoteDto {
  return {
    id: row.id,
    agentId: row.agentId,
    noteType: row.noteType,
    visibility: row.visibility,
    note: row.note,
    authorId: row.authorId,
    authorName: row.authorName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class AgentRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly sqlite?: Database.Database
  ) {}

  async list(query: AgentListQuery): Promise<AgentDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(ne(agents.lifecycleStatus, 'ARCHIVED'));
    if (query.active === 'inactive') conditions.push(eq(agents.lifecycleStatus, 'INACTIVE'));
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

  async getRecordById(id: string) {
    return await this.db.select().from(agents).where(eq(agents.id, id)).get();
  }

  async getDetailById(id: string): Promise<AgentDetailDto | null> {
    const row = await this.getRecordById(id);
    if (!row) return null;
    const primaryContact = row.primaryContactId
      ? await this.getContactById(id, row.primaryContactId)
      : await this.getPrimaryContact(id);
    const defaultCommission = await this.getActiveCommissionRule(id);
    return {
      ...toDto(row),
      station: this.getStationSummary(row.stationId),
      customerAccount: this.getCustomerSummary(row.customerAccountId),
      responsiblePersonnel: this.getPersonnelSummary(row.responsiblePersonnelId),
      primaryContact: primaryContact
        ? {
            id: primaryContact.id,
            contactName: primaryContact.contactName,
            roleTitle: primaryContact.roleTitle,
            department: primaryContact.department,
            phone: primaryContact.phone,
            email: primaryContact.email
          }
        : null,
      defaultCommission: defaultCommission
        ? {
            id: defaultCommission.id,
            commissionType: defaultCommission.commissionType,
            percentageBasisPoints: defaultCommission.percentageBasisPoints,
            fixedAmountMinor: defaultCommission.fixedAmountMinor,
            currencyCode: defaultCommission.currencyCode,
            effectiveFrom: defaultCommission.effectiveFrom,
            effectiveUntil: defaultCommission.effectiveUntil
          }
        : null,
      quickSummary: this.getQuickSummary(id)
    };
  }

  async create(id: string, input: AgentInput, timestamp: string) {
    const row = await this.db
      .insert(agents)
      .values({
        id,
        agentCode: input.agentCode,
        agentName: input.agentName,
        agentType: input.agentType,
        stationId: input.stationId,
        customerAccountId: input.customerAccountId,
        responsiblePersonnelId: input.responsiblePersonnelId,
        primaryContactId: input.primaryContactId,
        bookingChannelCode: input.bookingChannelCode,
        defaultCurrencyCode: input.defaultCurrencyCode ?? 'IDR',
        operationalNote: input.operationalNote,
        commissionBasisPoints: input.commissionBasisPoints,
        contactPerson: input.contactPerson,
        phone: input.phone,
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: AgentInput, timestamp: string) {
    const values = {
      agentCode: input.agentCode,
      agentName: input.agentName,
      agentType: input.agentType,
      stationId: input.stationId,
      customerAccountId: input.customerAccountId,
      responsiblePersonnelId: input.responsiblePersonnelId,
      primaryContactId: input.primaryContactId,
      bookingChannelCode: input.bookingChannelCode,
      defaultCurrencyCode: input.defaultCurrencyCode ?? 'IDR',
      operationalNote: input.operationalNote,
      commissionBasisPoints: input.commissionBasisPoints,
      contactPerson: input.contactPerson,
      phone: input.phone,
      updatedAt: timestamp
    };
    const updateValues = input.expectedVersion
      ? { ...values, version: input.expectedVersion + 1 }
      : values;
    const row = await this.db
      .update(agents)
      .set(updateValues)
      .where(
        input.expectedVersion
          ? and(eq(agents.id, id), eq(agents.version, input.expectedVersion))
          : eq(agents.id, id)
      )
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(agents)
      .set({ isActive, lifecycleStatus: isActive ? 'ACTIVE' : 'INACTIVE', updatedAt: timestamp })
      .where(eq(agents.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setLifecycleStatus(
    id: string,
    lifecycleStatus: string,
    expectedVersion: number | undefined,
    timestamp: string
  ) {
    const values = expectedVersion
      ? {
          lifecycleStatus,
          isActive: lifecycleStatus === 'ACTIVE',
          version: expectedVersion + 1,
          updatedAt: timestamp
        }
      : { lifecycleStatus, isActive: lifecycleStatus === 'ACTIVE', updatedAt: timestamp };
    const row = await this.db
      .update(agents)
      .set(values)
      .where(
        expectedVersion
          ? and(eq(agents.id, id), eq(agents.version, expectedVersion))
          : eq(agents.id, id)
      )
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<AgentOption[]> {
    return await this.db
      .select({ id: agents.id, agentCode: agents.agentCode, agentName: agents.agentName })
      .from(agents)
      .where(eq(agents.lifecycleStatus, 'ACTIVE'))
      .orderBy(asc(agents.agentCode));
  }

  async listContacts(agentId: string) {
    const rows = await this.db
      .select()
      .from(agentContacts)
      .where(eq(agentContacts.agentId, agentId))
      .orderBy(desc(agentContacts.isPrimary), asc(agentContacts.contactName));
    return rows.map(toContactDto);
  }

  async getContactById(agentId: string, contactId: string) {
    const row = await this.db
      .select()
      .from(agentContacts)
      .where(and(eq(agentContacts.agentId, agentId), eq(agentContacts.id, contactId)))
      .get();
    return row ? toContactDto(row) : null;
  }

  async getPrimaryContact(agentId: string) {
    const row = await this.db
      .select()
      .from(agentContacts)
      .where(and(eq(agentContacts.agentId, agentId), eq(agentContacts.isPrimary, true)))
      .get();
    return row ? toContactDto(row) : null;
  }

  async createContact(id: string, agentId: string, input: AgentContactInput, timestamp: string) {
    if (input.isPrimary) await this.clearPrimaryContacts(agentId, timestamp);
    const row = await this.db
      .insert(agentContacts)
      .values({ id, agentId, ...input, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    if (input.isPrimary) await this.setPrimaryContactReference(agentId, row.id, timestamp);
    return toContactDto(row);
  }

  async updateContact(
    agentId: string,
    contactId: string,
    input: AgentContactInput,
    timestamp: string
  ) {
    if (input.isPrimary) await this.clearPrimaryContacts(agentId, timestamp);
    const row = await this.db
      .update(agentContacts)
      .set({ ...input, updatedAt: timestamp })
      .where(and(eq(agentContacts.agentId, agentId), eq(agentContacts.id, contactId)))
      .returning()
      .get();
    if (row && input.isPrimary) await this.setPrimaryContactReference(agentId, row.id, timestamp);
    return row ? toContactDto(row) : null;
  }

  async setPrimaryContact(agentId: string, contactId: string, timestamp: string) {
    await this.clearPrimaryContacts(agentId, timestamp);
    const row = await this.db
      .update(agentContacts)
      .set({ isPrimary: true, isActive: true, updatedAt: timestamp })
      .where(and(eq(agentContacts.agentId, agentId), eq(agentContacts.id, contactId)))
      .returning()
      .get();
    if (row) await this.setPrimaryContactReference(agentId, row.id, timestamp);
    return row ? toContactDto(row) : null;
  }

  async deactivateContact(agentId: string, contactId: string, timestamp: string) {
    const row = await this.db
      .update(agentContacts)
      .set({ isPrimary: false, isActive: false, updatedAt: timestamp })
      .where(and(eq(agentContacts.agentId, agentId), eq(agentContacts.id, contactId)))
      .returning()
      .get();
    return row ? toContactDto(row) : null;
  }

  async setPrimaryContactReference(agentId: string, contactId: string | null, timestamp: string) {
    await this.db
      .update(agents)
      .set({ primaryContactId: contactId, updatedAt: timestamp })
      .where(eq(agents.id, agentId));
  }

  async clearPrimaryContacts(agentId: string, timestamp: string) {
    await this.db
      .update(agentContacts)
      .set({ isPrimary: false, updatedAt: timestamp })
      .where(eq(agentContacts.agentId, agentId));
  }

  async listCommissionRules(agentId: string) {
    const rows = await this.db
      .select()
      .from(agentCommissionRules)
      .where(eq(agentCommissionRules.agentId, agentId))
      .orderBy(
        desc(agentCommissionRules.lifecycleStatus),
        asc(agentCommissionRules.priority),
        desc(agentCommissionRules.effectiveFrom)
      );
    return rows.map(toRuleDto);
  }

  async getCommissionRuleById(agentId: string, ruleId: string) {
    const row = await this.db
      .select()
      .from(agentCommissionRules)
      .where(and(eq(agentCommissionRules.agentId, agentId), eq(agentCommissionRules.id, ruleId)))
      .get();
    return row ? toRuleDto(row) : null;
  }

  async getActiveCommissionRule(agentId: string) {
    const today = getApplicationNow().slice(0, 10);
    const row = await this.db
      .select()
      .from(agentCommissionRules)
      .where(
        and(
          eq(agentCommissionRules.agentId, agentId),
          eq(agentCommissionRules.lifecycleStatus, 'ACTIVE')
        )
      )
      .orderBy(asc(agentCommissionRules.priority), desc(agentCommissionRules.effectiveFrom))
      .then((rows) =>
        rows.find(
          (rule) =>
            rule.effectiveFrom <= today && (!rule.effectiveUntil || rule.effectiveUntil >= today)
        )
      );
    return row ? toRuleDto(row) : null;
  }

  async createCommissionRule(
    id: string,
    agentId: string,
    input: AgentCommissionRuleInput,
    timestamp: string
  ) {
    const row = await this.db
      .insert(agentCommissionRules)
      .values({ id, agentId, ...input, version: 1, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toRuleDto(row);
  }

  async updateCommissionRule(
    agentId: string,
    ruleId: string,
    input: AgentCommissionRuleInput,
    timestamp: string
  ) {
    const row = await this.db
      .update(agentCommissionRules)
      .set({ ...input, version: 2, updatedAt: timestamp })
      .where(and(eq(agentCommissionRules.agentId, agentId), eq(agentCommissionRules.id, ruleId)))
      .returning()
      .get();
    return row ? toRuleDto(row) : null;
  }

  async setCommissionRuleStatus(
    agentId: string,
    ruleId: string,
    lifecycleStatus: string,
    timestamp: string
  ) {
    const row = await this.db
      .update(agentCommissionRules)
      .set({ lifecycleStatus, updatedAt: timestamp })
      .where(and(eq(agentCommissionRules.agentId, agentId), eq(agentCommissionRules.id, ruleId)))
      .returning()
      .get();
    return row ? toRuleDto(row) : null;
  }

  getCommissionSnapshot(agentId: string, basisAmount: number, currencyCode: string) {
    const sqlite = this.getSqlite();
    const rule = sqlite
      .prepare(
        `SELECT id, commission_type AS commissionType, percentage_basis_points AS percentageBasisPoints,
          fixed_amount_minor AS fixedAmountMinor, currency_code AS currencyCode, basis_type AS basisType,
          version
         FROM agent_commission_rules
         WHERE agent_id = ?
           AND lifecycle_status = 'ACTIVE'
           AND effective_from <= date('now')
           AND (effective_until IS NULL OR effective_until >= date('now'))
         ORDER BY priority ASC, effective_from DESC
         LIMIT 1`
      )
      .get(agentId) as
      | {
          id: string;
          commissionType: string;
          percentageBasisPoints: number | null;
          fixedAmountMinor: string | null;
          currencyCode: string | null;
          basisType: string;
          version: number;
        }
      | undefined;
    const agent = sqlite
      .prepare(`SELECT agent_code AS agentCode, agent_name AS agentName FROM agents WHERE id = ?`)
      .get(agentId) as { agentCode: string; agentName: string } | undefined;
    if (!agent) return null;
    const percentageAmount = rule?.percentageBasisPoints
      ? Math.floor((basisAmount * rule.percentageBasisPoints) / 10_000)
      : 0;
    const fixedAmount = rule?.fixedAmountMinor ? Number(rule.fixedAmountMinor) : 0;
    const commissionAmount =
      rule?.commissionType === 'FIXED_AMOUNT'
        ? fixedAmount
        : rule?.commissionType === 'HYBRID'
          ? percentageAmount + fixedAmount
          : percentageAmount;
    return {
      agentCodeSnapshot: agent.agentCode,
      agentNameSnapshot: agent.agentName,
      commissionRuleId: rule?.id ?? null,
      commissionRuleVersion: rule?.version ?? null,
      commissionBasisType: rule?.basisType ?? null,
      commissionBasisAmount: rule ? basisAmount : null,
      commissionAmount: rule ? commissionAmount : null,
      commissionCurrency: rule?.currencyCode ?? currencyCode
    };
  }

  listRates(agentId: string): AgentRateDto[] {
    const sqlite = this.getSqlite();
    return sqlite
      .prepare(
        `SELECT rate.id, rate.rate_code AS rateCode, rate.service_type AS serviceType,
          origin.station_code || ' · ' || origin.station_name || ' → ' || destination.station_code || ' · ' || destination.station_name AS route,
          currency.currency_code AS currencyCode, rate.base_rate AS baseRateMinor, rate.rate_unit AS rateUnit,
          rate.effective_from AS effectiveFrom, rate.effective_to AS effectiveTo, rate.is_active AS isActive
        FROM rate_cards rate
        JOIN currencies currency ON currency.id = rate.currency_id
        JOIN stations origin ON origin.id = rate.origin_station_id
        JOIN stations destination ON destination.id = rate.destination_station_id
        JOIN agents agent ON agent.id = ?
        WHERE rate.booking_channel IN ('AGENT', 'CARGO')
          OR (agent.agent_type = 'CARGO_AGENT' AND rate.service_type = 'CARGO')`
      )
      .all(agentId) as AgentRateDto[];
  }

  listActivity(agentId: string): AgentActivityItemDto[] {
    const sqlite = this.getSqlite();
    const rows = sqlite
      .prepare(
        `SELECT id, 'AGENT_CREATED' AS activityType, 'Agent created' AS title, agent_name AS description,
          'AGENT' AS sourceType, id AS sourceId, created_at AS occurredAt FROM agents WHERE id = ?
        UNION ALL
        SELECT id, 'PASSENGER_BOOKING_CREATED', 'Passenger ticket created', passenger_name,
          'PASSENGER_TICKET', id, created_at FROM passenger_tickets WHERE agent_id = ?
        UNION ALL
        SELECT id, 'CARGO_BOOKING_CREATED', 'Cargo booking created', description,
          'CARGO_BOOKING', id, created_at FROM cargo_bookings WHERE agent_id = ?`
      )
      .all(agentId, agentId, agentId) as AgentActivityItemDto[];
    return rows.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async listContracts(agentId: string) {
    const rows = await this.db
      .select()
      .from(agentContracts)
      .where(eq(agentContracts.agentId, agentId))
      .orderBy(desc(agentContracts.effectiveFrom));
    return rows.map(toContractDto);
  }

  async listNotes(agentId: string, includeSensitive: boolean) {
    const rows = await this.db
      .select()
      .from(agentNotes)
      .where(eq(agentNotes.agentId, agentId))
      .orderBy(desc(agentNotes.createdAt));
    return rows
      .filter(
        (row) => includeSensitive || !['FINANCE_ONLY', 'COMPLIANCE_ONLY'].includes(row.visibility)
      )
      .map(toNoteDto);
  }

  async listHistory(agentId: string): Promise<AgentHistoryItemDto[]> {
    const rows = await this.db
      .select()
      .from(agentAuditLogs)
      .where(eq(agentAuditLogs.agentId, agentId))
      .orderBy(desc(agentAuditLogs.occurredAt));
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorName: row.actorName,
      changedFields: JSON.parse(row.changedFields || '[]') as string[],
      occurredAt: row.occurredAt,
      requestId: row.requestId
    }));
  }

  async recordAudit(
    id: string,
    agentId: string,
    action: string,
    changedFields: string[],
    actorId: string | null,
    actorName: string | null,
    timestamp: string,
    metadata?: unknown
  ) {
    await this.db.insert(agentAuditLogs).values({
      id,
      agentId,
      action,
      actorId,
      actorName,
      changedFields: JSON.stringify(changedFields),
      metadata: metadata ? JSON.stringify(metadata) : null,
      requestId: null,
      occurredAt: timestamp
    });
  }

  getQuickSummary(agentId: string) {
    const sqlite = this.getSqlite();
    const summary = sqlite
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM agent_contracts WHERE agent_id = ? AND status = 'ACTIVE') AS activeContractCount,
          (SELECT COUNT(*) FROM passenger_tickets WHERE agent_id = ?) +
          (SELECT COUNT(*) FROM cargo_bookings WHERE agent_id = ?) AS totalBookingCount,
          MAX(lastBookingAt) AS lastBookingAt
         FROM (
           SELECT MAX(created_at) AS lastBookingAt FROM passenger_tickets WHERE agent_id = ?
           UNION ALL
           SELECT MAX(created_at) AS lastBookingAt FROM cargo_bookings WHERE agent_id = ?
         )`
      )
      .get(agentId, agentId, agentId, agentId, agentId) as
      | { activeContractCount: number; totalBookingCount: number; lastBookingAt: string | null }
      | undefined;
    const linkedRateCount = this.listRates(agentId).length;
    return {
      activeContractCount: summary?.activeContractCount ?? 0,
      linkedRateCount,
      totalBookingCount: summary?.totalBookingCount ?? 0,
      lastBookingAt: summary?.lastBookingAt ?? null,
      lastActivityAt: summary?.lastBookingAt ?? null,
      outstandingCommissionMinor: null,
      currencyCode: null,
      asOf: getApplicationNow()
    };
  }

  private getStationSummary(stationId: string | null) {
    if (!stationId || !this.sqlite) return null;
    return (
      (this.sqlite
        .prepare(
          `SELECT id, station_code AS stationCode, station_name AS stationName FROM stations WHERE id = ?`
        )
        .get(stationId) as { id: string; stationCode: string; stationName: string } | undefined) ??
      null
    );
  }

  private getCustomerSummary(customerId: string | null) {
    if (!customerId || !this.sqlite) return null;
    return (
      (this.sqlite
        .prepare(
          `SELECT id, account_code AS accountCode, account_name AS accountName, account_type AS accountType
           FROM customers WHERE id = ?`
        )
        .get(customerId) as
        | { id: string; accountCode: string; accountName: string; accountType: string }
        | undefined) ?? null
    );
  }

  private getPersonnelSummary(personnelId: string | null) {
    if (!personnelId || !this.sqlite) return null;
    return (
      (this.sqlite
        .prepare(
          `SELECT id, employee_code AS employeeCode, full_legal_name AS fullLegalName
           FROM personnel WHERE id = ?`
        )
        .get(personnelId) as
        { id: string; employeeCode: string; fullLegalName: string } | undefined) ?? null
    );
  }

  private getSqlite() {
    if (!this.sqlite) throw new Error('Agent repository read model requires a sqlite connection.');
    return this.sqlite;
  }
}
