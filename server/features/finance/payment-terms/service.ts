import { randomUUID } from 'node:crypto';
import type {
  PaymentTermInput,
  PaymentTermListQuery
} from '../../../../shared/features/finance/payment-terms';
import { DomainError, notFound } from '../../../utils/errors';
import { PaymentTermRepository } from './repository';

export class PaymentTermService {
  constructor(private readonly repository: PaymentTermRepository) {}
  list(query: PaymentTermListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('PaymentTerm', id);
    return row;
  }
  async create(input: PaymentTermInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'payment-terms-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: PaymentTermInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('PaymentTerm', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('PaymentTerm', id);
    return row;
  }
  private async validate(input: PaymentTermInput) {
    void input;
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'PAYMENT_TERMS_DUPLICATE',
        'PaymentTerm code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('PAYMENT_TERMS_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
