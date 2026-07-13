import { randomUUID } from 'node:crypto';
import type {
  CustomerInput,
  CustomerListQuery
} from '../../../../shared/features/commercial/customers';
import { DomainError, notFound } from '../../../utils/errors';
import { PaymentTermRepository } from '../../finance/payment-terms/repository';
import { CustomerRepository } from './repository';

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
  async create(input: CustomerInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'customers-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: CustomerInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('Customer', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('Customer', id);
    return row;
  }
  private async validate(input: CustomerInput) {
    if (
      input.paymentTermId &&
      !(await this.paymentTermsRepository.getById(input.paymentTermId))?.isActive
    )
      throw new DomainError(
        'CUSTOMERS_PAYMENT_TERM_ID_INVALID',
        'Payment term must reference an active record.',
        422
      );
    if (
      (input.accountType === 'CORPORATE' || input.accountType === 'GOVERNMENT') &&
      !input.contactPerson
    )
      throw new DomainError(
        'CUSTOMER_CONTACT_REQUIRED',
        'Corporate and government accounts require a contact person.',
        422
      );
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'CUSTOMERS_DUPLICATE',
        'Customer code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('CUSTOMERS_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
