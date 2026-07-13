import { randomUUID } from 'node:crypto';
import type {
  CostCategoryInput,
  CostCategoryListQuery
} from '../../../../shared/features/finance/cost-categories';
import { DomainError, notFound } from '../../../utils/errors';
import { ChartOfAccountRepository } from '../chart-of-accounts/repository';
import { CostCategoryRepository } from './repository';

export class CostCategoryService {
  constructor(
    private readonly repository: CostCategoryRepository,
    private readonly accountsRepository: ChartOfAccountRepository
  ) {}
  list(query: CostCategoryListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('CostCategory', id);
    return row;
  }
  async create(input: CostCategoryInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'cost-categories-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: CostCategoryInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('CostCategory', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('CostCategory', id);
    return row;
  }
  private async validate(input: CostCategoryInput) {
    const defaultAccount = input.defaultCoaId
      ? await this.accountsRepository.getById(input.defaultCoaId)
      : null;
    if (input.defaultCoaId && !defaultAccount?.isActive)
      throw new DomainError(
        'COST_CATEGORIES_DEFAULT_COA_ID_INVALID',
        'Default expense COA must reference an active record.',
        422
      );
    if (input.defaultCoaId && defaultAccount?.accountType !== 'EXPENSE')
      throw new DomainError(
        'COST_CATEGORY_EXPENSE_COA_REQUIRED',
        'Default COA for a cost category must be an active expense account.',
        422
      );
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'COST_CATEGORIES_DUPLICATE',
        'CostCategory code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError(
        'COST_CATEGORIES_RELATION_INVALID',
        'A related record is invalid.',
        422
      );
    throw error;
  }
}
