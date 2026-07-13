import { randomUUID } from 'node:crypto';
import type {
  ChartOfAccountInput,
  ChartOfAccountListQuery
} from '../../../../shared/features/finance/chart-of-accounts';
import { DomainError, notFound } from '../../../utils/errors';
import { ChartOfAccountRepository } from './repository';

export class ChartOfAccountService {
  constructor(private readonly repository: ChartOfAccountRepository) {}
  list(query: ChartOfAccountListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('ChartOfAccount', id);
    return row;
  }
  async create(input: ChartOfAccountInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'chart-of-accounts-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: ChartOfAccountInput) {
    await this.get(id);
    await this.validate(input, id);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('ChartOfAccount', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('ChartOfAccount', id);
    return row;
  }
  private async validate(input: ChartOfAccountInput, id?: string) {
    if (
      input.parentAccountId &&
      !(await this.repository.hasActiveParentAccountId(input.parentAccountId as string))
    )
      throw new DomainError(
        'CHART_OF_ACCOUNTS_PARENT_ACCOUNT_ID_INVALID',
        'Parent account must reference an active record.',
        422
      );
    if (!input.parentAccountId) return;
    if (id && input.parentAccountId === id)
      throw new DomainError('COA_PARENT_SELF', 'Parent account cannot reference itself.', 422);
    const visited = new Set(id ? [id] : []);
    let cursor: string | null = input.parentAccountId;
    while (cursor) {
      if (visited.has(cursor))
        throw new DomainError(
          'COA_PARENT_CIRCULAR',
          'Chart of accounts parent relationship is circular.',
          422
        );
      visited.add(cursor);
      cursor = await this.repository.getParentId(cursor);
    }
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'CHART_OF_ACCOUNTS_DUPLICATE',
        'ChartOfAccount code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError(
        'CHART_OF_ACCOUNTS_RELATION_INVALID',
        'A related record is invalid.',
        422
      );
    throw error;
  }
}
