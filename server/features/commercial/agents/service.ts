import { randomUUID } from 'node:crypto';
import type { AgentInput, AgentListQuery } from '../../../../shared/features/commercial/agents';
import { DomainError, notFound } from '../../../utils/errors';
import { StationsRepository } from '../../operations/stations/repository';
import { AgentRepository } from './repository';

export class AgentService {
  constructor(
    private readonly repository: AgentRepository,
    private readonly stationsRepository: StationsRepository
  ) {}
  list(query: AgentListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Agent', id);
    return row;
  }
  async create(input: AgentInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'agents-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: AgentInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('Agent', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('Agent', id);
    return row;
  }
  private async validate(input: AgentInput) {
    if (input.stationId && !(await this.stationsRepository.getById(input.stationId))?.isActive)
      throw new DomainError(
        'AGENTS_STATION_ID_INVALID',
        'Station must reference an active record.',
        422
      );
    if (input.agentType === 'STATION_COUNTER' && !input.stationId)
      throw new DomainError(
        'AGENT_STATION_REQUIRED',
        'Station counter agents require a station.',
        422
      );
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'AGENTS_DUPLICATE',
        'Agent code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('AGENTS_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
