import { randomUUID } from 'node:crypto';
import type {
  DgCategoryInput,
  DgCategoryListQuery
} from '../../../../shared/features/cargo/dg-categories';
import { DomainError, notFound } from '../../../utils/errors';
import { DgCategoryRepository } from './repository';

export class DgCategoryService {
  constructor(private readonly repository: DgCategoryRepository) {}
  list(query: DgCategoryListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('DgCategory', id);
    return row;
  }
  async create(input: DgCategoryInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'dg-categories-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: DgCategoryInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('DgCategory', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('DgCategory', id);
    return row;
  }
  private async validate(input: DgCategoryInput) {
    void input;
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'DG_CATEGORIES_DUPLICATE',
        'DgCategory code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('DG_CATEGORIES_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
