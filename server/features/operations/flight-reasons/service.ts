import { randomUUID } from 'node:crypto';
import type {
  FlightReasonInput,
  FlightReasonListQuery
} from '../../../../shared/features/operations/flight-reasons';
import { DomainError, notFound } from '../../../utils/errors';
import { FlightReasonRepository } from './repository';

export class FlightReasonService {
  constructor(private readonly repository: FlightReasonRepository) {}
  list(query: FlightReasonListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('FlightReason', id);
    return row;
  }
  async create(input: FlightReasonInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'flight-reasons-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: FlightReasonInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('FlightReason', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('FlightReason', id);
    return row;
  }
  private async validate(input: FlightReasonInput) {
    void input;
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'FLIGHT_REASONS_DUPLICATE',
        'FlightReason code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('FLIGHT_REASONS_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
