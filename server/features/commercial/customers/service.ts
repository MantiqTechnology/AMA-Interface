import { randomUUID } from 'node:crypto';
import type {
  CustomerContactInput,
  CustomerInput,
  CustomerListQuery
} from '../../../../shared/features/commercial/customers';
import { DomainError, notFound } from '../../../utils/errors';
import { getApplicationNow } from '../../../utils/time';
import { PaymentTermRepository } from '../../finance/payment-terms/repository';
import { CustomerRepository } from './repository';

type ActorContext = {
  actorId?: string | null;
  actorName?: string | null;
};

export class CustomerService {
  constructor(
    private readonly repository: CustomerRepository,
    private readonly paymentTermsRepository: PaymentTermRepository
  ) {}

  list(query: CustomerListQuery) {
    return this.repository.list(query);
  }

  options() {
    return this.repository.options();
  }

  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Customer', id);
    return row;
  }

  async getDetail(id: string, includeFinancial: boolean) {
    const row = await this.repository.getDetailById(id, includeFinancial);
    if (!row) throw notFound('Customer', id);
    return row;
  }

  async create(input: CustomerInput, actor: ActorContext = {}) {
    await this.validate(input);
    const timestamp = getApplicationNow();
    try {
      const record = await this.repository.create('customers-' + randomUUID(), input, timestamp);
      if (input.contactPerson) {
        await this.repository.createContact(
          'customer-contact-' + record.id,
          record.id,
          {
            contactName: input.contactPerson,
            roleTitle: null,
            email: input.email,
            phone: input.phone,
            contactType: 'PRIMARY',
            isPrimary: true,
            isActive: true,
            notes: null
          },
          timestamp
        );
      }
      await this.audit(
        record.id,
        'CUSTOMER_CREATED',
        ['accountCode', 'accountName'],
        actor,
        timestamp
      );
      return record;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async update(id: string, input: CustomerInput, actor: ActorContext = {}) {
    const existing = await this.get(id);
    await this.validate(input, id);
    if (input.expectedVersion && existing.version !== input.expectedVersion) {
      throw new DomainError(
        'CUSTOMER_VERSION_CONFLICT',
        'Customer was updated by another user. Refresh before saving changes.',
        409
      );
    }
    const timestamp = getApplicationNow();
    try {
      const row = await this.repository.update(id, input, timestamp);
      if (!row) {
        throw new DomainError(
          'CUSTOMER_VERSION_CONFLICT',
          'Customer was updated by another user. Refresh before saving changes.',
          409
        );
      }
      await this.audit(id, 'CUSTOMER_UPDATED', this.changedFields(existing, row), actor, timestamp);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async setActive(id: string, isActive: boolean, actor: ActorContext = {}) {
    await this.get(id);
    const timestamp = getApplicationNow();
    const row = await this.repository.setActive(id, isActive, timestamp);
    if (!row) throw notFound('Customer', id);
    await this.audit(
      id,
      isActive ? 'CUSTOMER_ACTIVATED' : 'CUSTOMER_DEACTIVATED',
      ['lifecycleStatus', 'isActive'],
      actor,
      timestamp
    );
    return row;
  }

  async changeStatus(
    id: string,
    input: { lifecycleStatus: string; reason: string; expectedVersion?: number },
    actor: ActorContext = {}
  ) {
    const existing = await this.get(id);
    if (input.expectedVersion && existing.version !== input.expectedVersion) {
      throw new DomainError('CUSTOMER_VERSION_CONFLICT', 'Customer version conflict.', 409);
    }
    const timestamp = getApplicationNow();
    const row = await this.repository.changeLifecycleStatus(
      id,
      input.lifecycleStatus,
      input.expectedVersion,
      timestamp
    );
    if (!row) throw new DomainError('CUSTOMER_VERSION_CONFLICT', 'Customer version conflict.', 409);
    await this.audit(id, 'CUSTOMER_STATUS_CHANGED', ['lifecycleStatus'], actor, timestamp, {
      reason: input.reason
    });
    return row;
  }

  async archive(id: string, actor: ActorContext = {}) {
    return await this.changeStatus(
      id,
      { lifecycleStatus: 'ARCHIVED', reason: 'Archived from customer account detail.' },
      actor
    );
  }

  async placeCreditHold(
    id: string,
    input: { reason: string; expectedVersion?: number },
    actor: ActorContext = {}
  ) {
    return await this.changeCreditHold(id, 'ON_HOLD', 'PLACE_HOLD', input, actor);
  }

  async releaseCreditHold(
    id: string,
    input: { reason: string; expectedVersion?: number },
    actor: ActorContext = {}
  ) {
    return await this.changeCreditHold(id, 'NORMAL', 'RELEASE_HOLD', input, actor);
  }

  async listContacts(id: string) {
    await this.get(id);
    return await this.repository.listContacts(id);
  }

  async createContact(id: string, input: CustomerContactInput, actor: ActorContext = {}) {
    await this.get(id);
    const timestamp = getApplicationNow();
    const contact = await this.repository.createContact(
      'customer-contact-' + randomUUID(),
      id,
      input,
      timestamp
    );
    await this.audit(id, 'CUSTOMER_CONTACT_ADDED', ['contacts'], actor, timestamp);
    return contact;
  }

  async updateContact(
    id: string,
    contactId: string,
    input: CustomerContactInput,
    actor: ActorContext = {}
  ) {
    await this.ensureContact(id, contactId);
    const timestamp = getApplicationNow();
    const contact = await this.repository.updateContact(id, contactId, input, timestamp);
    if (!contact) throw notFound('Customer contact', contactId);
    await this.audit(id, 'CUSTOMER_CONTACT_UPDATED', ['contacts'], actor, timestamp);
    return contact;
  }

  async setPrimaryContact(id: string, contactId: string, actor: ActorContext = {}) {
    const contact = await this.ensureContact(id, contactId);
    if (!contact.isActive) {
      throw new DomainError('CUSTOMER_CONTACT_INACTIVE', 'Primary contact must be active.', 422);
    }
    const timestamp = getApplicationNow();
    const updated = await this.repository.setPrimaryContact(id, contactId, timestamp);
    if (!updated) throw notFound('Customer contact', contactId);
    await this.audit(
      id,
      'CUSTOMER_PRIMARY_CONTACT_CHANGED',
      ['primaryContactId'],
      actor,
      timestamp
    );
    return updated;
  }

  async deactivateContact(id: string, contactId: string, actor: ActorContext = {}) {
    const existing = await this.ensureContact(id, contactId);
    const timestamp = getApplicationNow();
    const updated = await this.repository.deactivateContact(id, contactId, timestamp);
    if (!updated) throw notFound('Customer contact', contactId);
    if (existing.isPrimary) {
      await this.repository.setPrimaryContactReference(id, null, timestamp);
    }
    await this.audit(id, 'CUSTOMER_CONTACT_DEACTIVATED', ['contacts'], actor, timestamp);
    return updated;
  }

  async getFinancialSummary(id: string) {
    const row = await this.repository.getRecordById(id);
    if (!row) throw notFound('Customer', id);
    return this.repository.getFinancialSummary(row);
  }

  async getOperationalSummary(id: string) {
    await this.get(id);
    return this.repository.getOperationalSummary(id);
  }

  async listRates(id: string) {
    await this.get(id);
    return await this.repository.listRates(id);
  }

  async listContracts(id: string) {
    await this.get(id);
    return await this.repository.listContracts(id);
  }

  async listActivity(id: string) {
    await this.get(id);
    return this.repository.listActivity(id);
  }

  async listNotes(id: string, includeFinancial: boolean) {
    await this.get(id);
    return await this.repository.listNotes(id, includeFinancial);
  }

  async listHistory(id: string) {
    await this.get(id);
    return await this.repository.listHistory(id);
  }

  private async changeCreditHold(
    id: string,
    creditStatus: 'ON_HOLD' | 'NORMAL',
    action: 'PLACE_HOLD' | 'RELEASE_HOLD',
    input: { reason: string; expectedVersion?: number },
    actor: ActorContext
  ) {
    if (!input.reason.trim()) {
      throw new DomainError(
        'CUSTOMER_CREDIT_HOLD_REASON_REQUIRED',
        'Credit hold reason is required.',
        422
      );
    }
    const existing = await this.get(id);
    if (input.expectedVersion && existing.version !== input.expectedVersion) {
      throw new DomainError('CUSTOMER_VERSION_CONFLICT', 'Customer version conflict.', 409);
    }
    const timestamp = getApplicationNow();
    const row = await this.repository.setCreditStatus(
      id,
      creditStatus,
      input.expectedVersion,
      timestamp
    );
    if (!row) throw new DomainError('CUSTOMER_VERSION_CONFLICT', 'Customer version conflict.', 409);
    await this.repository.recordCreditAction(
      'customer-credit-action-' + randomUUID(),
      id,
      action,
      input.reason,
      actor.actorId ?? null,
      actor.actorName ?? null,
      timestamp
    );
    await this.audit(
      id,
      action === 'PLACE_HOLD' ? 'CUSTOMER_CREDIT_HOLD_PLACED' : 'CUSTOMER_CREDIT_HOLD_RELEASED',
      ['creditStatus'],
      actor,
      timestamp,
      { reason: input.reason }
    );
    return row;
  }

  private async validate(input: CustomerInput, customerId?: string) {
    if (
      input.paymentTermId &&
      !(await this.paymentTermsRepository.getById(input.paymentTermId))?.isActive
    ) {
      throw new DomainError(
        'CUSTOMERS_PAYMENT_TERM_ID_INVALID',
        'Payment term must reference an active record.',
        422
      );
    }
    if (!this.repository.getCurrencyCode(input.defaultCurrencyCode)) {
      throw new DomainError('CUSTOMER_CURRENCY_INVALID', 'Default currency must be active.', 422);
    }
    if (input.primaryContactId && customerId) {
      const contact = await this.repository.getContactById(customerId, input.primaryContactId);
      if (!contact || !contact.isActive) {
        throw new DomainError(
          'CUSTOMER_PRIMARY_CONTACT_INVALID',
          'Primary contact must belong to this customer and be active.',
          422
        );
      }
    }
    if (
      (input.accountType === 'CORPORATE' || input.accountType === 'GOVERNMENT') &&
      !input.contactPerson &&
      !input.primaryContactId
    ) {
      throw new DomainError(
        'CUSTOMER_CONTACT_REQUIRED',
        'Corporate and government accounts require a contact person.',
        422
      );
    }
  }

  private async ensureContact(customerId: string, contactId: string) {
    await this.get(customerId);
    const contact = await this.repository.getContactById(customerId, contactId);
    if (!contact) throw notFound('Customer contact', contactId);
    return contact;
  }

  private async audit(
    customerId: string,
    action: string,
    changedFields: string[],
    actor: ActorContext,
    timestamp: string,
    metadata?: unknown
  ) {
    await this.repository.recordAudit(
      'customer-audit-' + randomUUID(),
      customerId,
      action,
      changedFields,
      actor.actorId ?? null,
      actor.actorName ?? null,
      timestamp,
      metadata
    );
  }

  private changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
    const fields = [
      'accountType',
      'accountCode',
      'accountName',
      'billingAddress',
      'paymentTermId',
      'creditLimit',
      'defaultCurrencyCode',
      'primaryContactId',
      'commercialNote'
    ];
    return fields.filter((field) => before[field] !== after[field]);
  }

  private rethrowWriteError(error: unknown): never {
    if (error instanceof DomainError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      throw new DomainError(
        'CUSTOMERS_DUPLICATE',
        'Customer code or unique combination already exists.',
        409
      );
    }
    if (message.includes('FOREIGN KEY constraint failed')) {
      throw new DomainError('CUSTOMERS_RELATION_INVALID', 'A related record is invalid.', 422);
    }
    throw error;
  }
}
