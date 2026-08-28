import { randomUUID } from 'node:crypto';
import type { SafetyCommunicationInput, SafetyCommListQuery } from './types';
import { DomainError, notFound } from '../../../utils/errors';
import { SafetyCommunicationRepository } from './repository';

export class SafetyCommunicationService {
  constructor(private readonly repository: SafetyCommunicationRepository) {}

  list(query: SafetyCommListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Safety Communication', id);
    return row;
  }

  async create(input: SafetyCommunicationInput) {
    if (!input.title || input.title.trim().length < 5) {
      throw new DomainError('TITLE_TOO_SHORT', 'Title must be at least 5 characters long.', 422);
    }
    if (!input.content || input.content.trim().length < 10) {
      throw new DomainError(
        'CONTENT_TOO_SHORT',
        'Content must be at least 10 characters long.',
        422
      );
    }

    try {
      const id = 'scomm-' + randomUUID();
      return await this.repository.create(id, input, new Date().toISOString());
    } catch (error) {
      throw error;
    }
  }

  async publish(id: string) {
    await this.get(id); // Ensure it exists
    const row = await this.repository.publish(id, new Date().toISOString());
    if (!row) throw notFound('Safety Communication', id);
    return row;
  }
}
