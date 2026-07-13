import { randomUUID } from 'node:crypto';
import type {
  CurrencyInput,
  CurrencyListQuery
} from '../../../../shared/features/finance/currencies';
import { DomainError, notFound } from '../../../utils/errors';
import { CurrencyRepository } from './repository';

export class CurrencyService {
  constructor(private readonly repository: CurrencyRepository) {}
  list(query: CurrencyListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Currency', id);
    return row;
  }
  async create(input: CurrencyInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'currencies-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: CurrencyInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('Currency', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('Currency', id);
    return row;
  }
  private async validate(input: CurrencyInput) {
    void input;
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'CURRENCIES_DUPLICATE',
        'Currency code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('CURRENCIES_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
