import { randomUUID } from 'node:crypto';
import type {
  AgentCommissionRuleInput,
  AgentContactInput,
  AgentInput,
  AgentListQuery
} from '../../../../shared/features/commercial/agents';
import { DomainError, notFound } from '../../../utils/errors';
import { getApplicationNow } from '../../../utils/time';
import { CustomerRepository } from '../customers/repository';
import { CurrencyRepository } from '../../finance/currencies/repository';
import { StationsRepository } from '../../operations/stations/repository';
import { AgentRepository } from './repository';

type ActorContext = { actorId?: string | null; actorName?: string | null };

export class AgentService {
  constructor(
    private readonly repository: AgentRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly customerRepository?: CustomerRepository,
    private readonly currencyRepository?: CurrencyRepository
  ) {}

  list(query: AgentListQuery) {
    return this.repository.list(query);
  }

  options() {
    return this.repository.options();
  }

  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Agent', id);
    return row;
  }

  async getDetail(id: string) {
    const row = await this.repository.getDetailById(id);
    if (!row) throw notFound('Agent', id);
    return row;
  }

  async create(input: AgentInput, actor: ActorContext = {}) {
    await this.validate(input);
    const timestamp = getApplicationNow();
    try {
      const record = await this.repository.create('agents-' + randomUUID(), input, timestamp);
      if (input.contactPerson) {
        await this.repository.createContact(
          'agent-contact-' + record.id,
          record.id,
          {
            contactName: input.contactPerson,
            roleTitle: null,
            department: null,
            email: null,
            phone: input.phone,
            contactType: 'PRIMARY',
            isPrimary: true,
            isActive: true,
            notes: null
          },
          timestamp
        );
      }
      if (input.commissionBasisPoints !== null) {
        await this.repository.createCommissionRule(
          'agent-commission-rule-' + record.id,
          record.id,
          {
            commissionType: 'PERCENTAGE',
            percentageBasisPoints: input.commissionBasisPoints,
            fixedAmountMinor: null,
            currencyCode: input.defaultCurrencyCode,
            basisType: 'BASE_FARE',
            serviceTypeId: null,
            routeId: null,
            rateAgreementId: null,
            effectiveFrom: timestamp.slice(0, 10),
            effectiveUntil: null,
            lifecycleStatus: 'ACTIVE',
            priority: 100
          },
          timestamp
        );
      }
      await this.audit(record.id, 'AGENT_CREATED', ['agentCode', 'agentName'], actor, timestamp);
      return record;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async update(id: string, input: AgentInput, actor: ActorContext = {}) {
    const existing = await this.get(id);
    await this.validate(input, id);
    if (input.expectedVersion && existing.version !== input.expectedVersion) {
      throw new DomainError('COMMERCIAL_AGENT_VERSION_CONFLICT', 'Agent version conflict.', 409);
    }
    const timestamp = getApplicationNow();
    try {
      const row = await this.repository.update(id, input, timestamp);
      if (!row) {
        throw new DomainError('COMMERCIAL_AGENT_VERSION_CONFLICT', 'Agent version conflict.', 409);
      }
      await this.audit(id, 'AGENT_UPDATED', this.changedFields(existing, row), actor, timestamp);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async setActive(id: string, isActive: boolean, actor: ActorContext = {}) {
    await this.get(id);
    const timestamp = getApplicationNow();
    const row = await this.repository.setActive(id, isActive, timestamp);
    if (!row) throw notFound('Agent', id);
    await this.audit(
      id,
      isActive ? 'AGENT_ACTIVATED' : 'AGENT_DEACTIVATED',
      ['lifecycleStatus'],
      actor,
      timestamp
    );
    return row;
  }

  async activate(id: string, input: { expectedVersion?: number } = {}, actor: ActorContext = {}) {
    const existing = await this.get(id);
    if (existing.lifecycleStatus === 'ARCHIVED') {
      throw new DomainError('AGENT_ARCHIVED', 'Archived agents cannot be activated.', 422);
    }
    if (existing.agentType === 'STATION_COUNTER' && !existing.stationId) {
      throw new DomainError(
        'AGENT_STATION_REQUIRED',
        'Station counter agents require a station.',
        422
      );
    }
    return await this.changeLifecycle(
      id,
      'ACTIVE',
      input.expectedVersion,
      'AGENT_ACTIVATED',
      actor
    );
  }

  async suspend(
    id: string,
    input: { reason?: string; expectedVersion?: number },
    actor: ActorContext = {}
  ) {
    if (!input.reason?.trim()) {
      throw new DomainError('AGENT_SUSPEND_REASON_REQUIRED', 'Suspend reason is required.', 422);
    }
    return await this.changeLifecycle(
      id,
      'SUSPENDED',
      input.expectedVersion,
      'AGENT_SUSPENDED',
      actor,
      {
        reason: input.reason
      }
    );
  }

  async deactivate(
    id: string,
    input: { reason?: string; expectedVersion?: number } = {},
    actor: ActorContext = {}
  ) {
    return await this.changeLifecycle(
      id,
      'INACTIVE',
      input.expectedVersion,
      'AGENT_DEACTIVATED',
      actor,
      {
        reason: input.reason ?? null
      }
    );
  }

  async archive(id: string, actor: ActorContext = {}) {
    return await this.changeLifecycle(id, 'ARCHIVED', undefined, 'AGENT_ARCHIVED', actor);
  }

  async listContacts(id: string) {
    await this.get(id);
    return await this.repository.listContacts(id);
  }

  async createContact(id: string, input: AgentContactInput, actor: ActorContext = {}) {
    await this.get(id);
    const timestamp = getApplicationNow();
    const contact = await this.repository.createContact(
      'agent-contact-' + randomUUID(),
      id,
      input,
      timestamp
    );
    await this.audit(id, 'AGENT_CONTACT_ADDED', ['contacts'], actor, timestamp);
    return contact;
  }

  async updateContact(
    id: string,
    contactId: string,
    input: AgentContactInput,
    actor: ActorContext = {}
  ) {
    await this.ensureContact(id, contactId);
    const timestamp = getApplicationNow();
    const contact = await this.repository.updateContact(id, contactId, input, timestamp);
    if (!contact) throw notFound('Agent contact', contactId);
    await this.audit(id, 'AGENT_CONTACT_UPDATED', ['contacts'], actor, timestamp);
    return contact;
  }

  async setPrimaryContact(id: string, contactId: string, actor: ActorContext = {}) {
    const contact = await this.ensureContact(id, contactId);
    if (!contact.isActive)
      throw new DomainError('AGENT_CONTACT_INACTIVE', 'Primary contact must be active.', 422);
    const timestamp = getApplicationNow();
    const updated = await this.repository.setPrimaryContact(id, contactId, timestamp);
    if (!updated) throw notFound('Agent contact', contactId);
    await this.audit(id, 'AGENT_PRIMARY_CONTACT_CHANGED', ['primaryContactId'], actor, timestamp);
    return updated;
  }

  async deactivateContact(id: string, contactId: string, actor: ActorContext = {}) {
    const existing = await this.ensureContact(id, contactId);
    const timestamp = getApplicationNow();
    const updated = await this.repository.deactivateContact(id, contactId, timestamp);
    if (!updated) throw notFound('Agent contact', contactId);
    if (existing.isPrimary) await this.repository.setPrimaryContactReference(id, null, timestamp);
    await this.audit(id, 'AGENT_CONTACT_DEACTIVATED', ['contacts'], actor, timestamp);
    return updated;
  }

  async listCommissionRules(id: string) {
    await this.get(id);
    return await this.repository.listCommissionRules(id);
  }

  async createCommissionRule(
    id: string,
    input: AgentCommissionRuleInput,
    actor: ActorContext = {}
  ) {
    await this.get(id);
    await this.validateCommissionRule(id, input);
    const timestamp = getApplicationNow();
    const rule = await this.repository.createCommissionRule(
      'agent-commission-rule-' + randomUUID(),
      id,
      input,
      timestamp
    );
    await this.audit(id, 'AGENT_COMMISSION_RULE_CREATED', ['commissionRules'], actor, timestamp);
    return rule;
  }

  async updateCommissionRule(
    id: string,
    ruleId: string,
    input: AgentCommissionRuleInput,
    actor: ActorContext = {}
  ) {
    await this.ensureCommissionRule(id, ruleId);
    await this.validateCommissionRule(id, input, ruleId);
    const timestamp = getApplicationNow();
    const rule = await this.repository.updateCommissionRule(id, ruleId, input, timestamp);
    if (!rule) throw notFound('Agent commission rule', ruleId);
    await this.audit(id, 'AGENT_COMMISSION_RULE_UPDATED', ['commissionRules'], actor, timestamp);
    return rule;
  }

  async activateCommissionRule(id: string, ruleId: string, actor: ActorContext = {}) {
    await this.ensureCommissionRule(id, ruleId);
    const timestamp = getApplicationNow();
    const rule = await this.repository.setCommissionRuleStatus(id, ruleId, 'ACTIVE', timestamp);
    if (!rule) throw notFound('Agent commission rule', ruleId);
    await this.audit(id, 'AGENT_COMMISSION_RULE_ACTIVATED', ['commissionRules'], actor, timestamp);
    return rule;
  }

  async archiveCommissionRule(id: string, ruleId: string, actor: ActorContext = {}) {
    await this.ensureCommissionRule(id, ruleId);
    const timestamp = getApplicationNow();
    const rule = await this.repository.setCommissionRuleStatus(id, ruleId, 'ARCHIVED', timestamp);
    if (!rule) throw notFound('Agent commission rule', ruleId);
    await this.audit(id, 'AGENT_COMMISSION_RULE_ARCHIVED', ['commissionRules'], actor, timestamp);
    return rule;
  }

  async listRates(id: string) {
    await this.get(id);
    return this.repository.listRates(id);
  }

  async listContracts(id: string) {
    await this.get(id);
    return await this.repository.listContracts(id);
  }

  async listActivity(id: string) {
    await this.get(id);
    return this.repository.listActivity(id);
  }

  async listNotes(id: string, includeSensitive: boolean) {
    await this.get(id);
    return await this.repository.listNotes(id, includeSensitive);
  }

  async listHistory(id: string) {
    await this.get(id);
    return await this.repository.listHistory(id);
  }

  getCommissionSummary(id: string) {
    return {
      agentId: id,
      accruedCommissionMinor: null,
      approvedCommissionMinor: null,
      paidCommissionMinor: null,
      outstandingCommissionMinor: null,
      lastSettlementAt: null,
      currencyCode: null,
      asOf: getApplicationNow()
    };
  }

  private async changeLifecycle(
    id: string,
    lifecycleStatus: string,
    expectedVersion: number | undefined,
    action: string,
    actor: ActorContext,
    metadata?: unknown
  ) {
    const existing = await this.get(id);
    if (expectedVersion && existing.version !== expectedVersion) {
      throw new DomainError('COMMERCIAL_AGENT_VERSION_CONFLICT', 'Agent version conflict.', 409);
    }
    const timestamp = getApplicationNow();
    const row = await this.repository.setLifecycleStatus(
      id,
      lifecycleStatus,
      expectedVersion,
      timestamp
    );
    if (!row)
      throw new DomainError('COMMERCIAL_AGENT_VERSION_CONFLICT', 'Agent version conflict.', 409);
    await this.audit(id, action, ['lifecycleStatus'], actor, timestamp, metadata);
    return row;
  }

  private async validate(input: AgentInput, agentId?: string) {
    if (input.stationId && !(await this.stationsRepository.getById(input.stationId))?.isActive) {
      throw new DomainError(
        'AGENTS_STATION_ID_INVALID',
        'Station must reference an active record.',
        422
      );
    }
    if (input.agentType === 'STATION_COUNTER' && !input.stationId) {
      throw new DomainError(
        'AGENT_STATION_REQUIRED',
        'Station counter agents require a station.',
        422
      );
    }
    if (
      input.customerAccountId &&
      this.customerRepository &&
      !(await this.customerRepository.getById(input.customerAccountId))
    ) {
      throw new DomainError(
        'AGENT_CUSTOMER_INVALID',
        'Customer account must reference an existing customer.',
        422
      );
    }
    if (input.primaryContactId && agentId) {
      const contact = await this.repository.getContactById(agentId, input.primaryContactId);
      if (!contact || !contact.isActive) {
        throw new DomainError(
          'AGENT_PRIMARY_CONTACT_INVALID',
          'Primary contact must belong to this agent and be active.',
          422
        );
      }
    }
    if (input.defaultCurrencyCode && this.currencyRepository) {
      const currencies = await this.currencyRepository.options();
      if (!currencies.some((currency) => currency.currencyCode === input.defaultCurrencyCode)) {
        throw new DomainError('AGENT_CURRENCY_INVALID', 'Currency must be active.', 422);
      }
    }
  }

  private async validateCommissionRule(
    agentId: string,
    input: AgentCommissionRuleInput,
    excludeRuleId?: string
  ) {
    if (input.effectiveUntil && input.effectiveUntil < input.effectiveFrom) {
      throw new DomainError(
        'AGENT_COMMISSION_PERIOD_INVALID',
        'Effective until cannot be before effective from.',
        422
      );
    }
    if (input.commissionType === 'PERCENTAGE' && input.percentageBasisPoints === null) {
      throw new DomainError(
        'AGENT_COMMISSION_PERCENTAGE_REQUIRED',
        'Percentage commission requires basis points.',
        422
      );
    }
    if (
      input.commissionType === 'FIXED_AMOUNT' &&
      (!input.fixedAmountMinor || !input.currencyCode)
    ) {
      throw new DomainError(
        'AGENT_COMMISSION_FIXED_REQUIRED',
        'Fixed commission requires amount and currency.',
        422
      );
    }
    if (input.lifecycleStatus === 'ACTIVE') {
      const existing = await this.repository.listCommissionRules(agentId);
      const overlaps = existing.some((rule) => {
        if (rule.id === excludeRuleId || rule.lifecycleStatus !== 'ACTIVE') return false;
        const end = input.effectiveUntil ?? '9999-12-31';
        const ruleEnd = rule.effectiveUntil ?? '9999-12-31';
        return input.effectiveFrom <= ruleEnd && rule.effectiveFrom <= end;
      });
      if (overlaps) {
        throw new DomainError(
          'AGENT_COMMISSION_RULE_OVERLAP',
          'Active commission rules cannot overlap.',
          422
        );
      }
    }
  }

  private async ensureContact(agentId: string, contactId: string) {
    await this.get(agentId);
    const contact = await this.repository.getContactById(agentId, contactId);
    if (!contact) throw notFound('Agent contact', contactId);
    return contact;
  }

  private async ensureCommissionRule(agentId: string, ruleId: string) {
    await this.get(agentId);
    const rule = await this.repository.getCommissionRuleById(agentId, ruleId);
    if (!rule) throw notFound('Agent commission rule', ruleId);
    return rule;
  }

  private async audit(
    agentId: string,
    action: string,
    changedFields: string[],
    actor: ActorContext,
    timestamp: string,
    metadata?: unknown
  ) {
    await this.repository.recordAudit(
      'agent-audit-' + randomUUID(),
      agentId,
      action,
      changedFields,
      actor.actorId ?? null,
      actor.actorName ?? null,
      timestamp,
      metadata
    );
  }

  private changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
    return [
      'agentCode',
      'agentName',
      'agentType',
      'stationId',
      'customerAccountId',
      'responsiblePersonnelId',
      'primaryContactId',
      'bookingChannelCode',
      'defaultCurrencyCode',
      'operationalNote',
      'commissionBasisPoints'
    ].filter((field) => before[field] !== after[field]);
  }

  private rethrowWriteError(error: unknown): never {
    if (error instanceof DomainError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      throw new DomainError(
        'AGENTS_DUPLICATE',
        'Agent code or unique combination already exists.',
        409
      );
    }
    if (message.includes('FOREIGN KEY constraint failed')) {
      throw new DomainError('AGENTS_RELATION_INVALID', 'A related record is invalid.', 422);
    }
    throw error;
  }
}
