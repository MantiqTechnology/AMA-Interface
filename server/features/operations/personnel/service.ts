import { randomUUID } from 'node:crypto';
import type {
  PersonnelInput,
  PersonnelListQuery
} from '../../../../shared/features/operations/personnel';
import { DomainError, notFound } from '../../../utils/errors';
import { StationsRepository } from '../stations/repository';
import { PersonnelRepository } from './repository';

export class PersonnelService {
  constructor(
    private readonly repository: PersonnelRepository,
    private readonly stationsRepository: StationsRepository
  ) {}
  list(query: PersonnelListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Personnel', id);
    return row;
  }
  async create(input: PersonnelInput) {
    await this.validate(input);
    try {
      return await this.repository.create('crew-' + randomUUID(), input, new Date().toISOString());
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: PersonnelInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('Personnel', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('Personnel', id);
    return row;
  }
  private async validate(input: PersonnelInput) {
    if (
      input.baseStationId &&
      !(await this.stationsRepository.getById(input.baseStationId))?.isActive
    )
      throw new DomainError(
        'CREW_BASE_STATION_ID_INVALID',
        'Base station must reference an active record.',
        422
      );
    if (
      input.dutyStationId &&
      !(await this.stationsRepository.getById(input.dutyStationId))?.isActive
    )
      throw new DomainError(
        'CREW_DUTY_STATION_ID_INVALID',
        'Duty station must reference an active record.',
        422
      );
    if (
      (input.crewRole === 'PILOT_IN_COMMAND' || input.crewRole === 'CO_PILOT') &&
      (!input.licenseType ||
        !input.licenseNumber ||
        !input.licenseExpiryDate ||
        !input.medicalExpiryDate)
    )
      throw new DomainError(
        'CREW_LICENSE_REQUIRED',
        'Pilot and co-pilot records require license and medical expiry data.',
        422
      );
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'CREW_DUPLICATE',
        'Personnel code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('CREW_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
