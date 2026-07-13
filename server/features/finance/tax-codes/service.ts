import { randomUUID } from 'node:crypto';
import type { TaxCodeInput, TaxCodeListQuery } from '../../../../shared/features/finance/tax-codes';
import { DomainError, notFound } from '../../../utils/errors';
import { TaxCodeRepository } from './repository';

export class TaxCodeService {
  constructor(private readonly repository: TaxCodeRepository) {}
  list(query: TaxCodeListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('TaxCode', id);
    return row;
  }
  async create(input: TaxCodeInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'tax-codes-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: TaxCodeInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('TaxCode', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('TaxCode', id);
    return row;
  }
  private async validate(input: TaxCodeInput) {
    if (input.effectiveTo && input.effectiveTo < input.effectiveFrom)
      throw new DomainError(
        'INVALID_EFFECTIVE_DATE',
        'Effective end date cannot be before start date.',
        422
      );
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'TAX_CODES_DUPLICATE',
        'TaxCode code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('TAX_CODES_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
