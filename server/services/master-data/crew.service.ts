import { crewMasterDataConfig } from '../../../shared/contracts/master-data';
import {
  SqliteMasterDataRepository,
  type MasterDataFilters
} from '../../repositories/master-data.repository';
import { DomainError, notFound } from '../../utils/errors';
import {
  buildLookups,
  normalizeInput,
  sqliteDomainError,
  validateRelations,
  type MasterDataInput
} from './helpers';

const CONFIG = crewMasterDataConfig;

export class CrewService {
  constructor(private readonly repository: SqliteMasterDataRepository) {}

  get(id: string) {
    const row = this.repository.getById(CONFIG, id);
    if (!row) throw notFound(CONFIG.title, id);
    return { entity: CONFIG.key, row, lookups: buildLookups(this.repository, CONFIG) };
  }

  list(filters: MasterDataFilters) {
    const rows = this.repository.list(CONFIG, filters);
    return { entity: CONFIG.key, rows, lookups: buildLookups(this.repository, CONFIG) };
  }

  create(rawInput: unknown) {
    const input = normalizeInput(CONFIG, rawInput);
    const id = `ref-crew-${crypto.randomUUID()}`;

    validateRelations(this.repository, CONFIG, input);
    this.validateLicense(input);

    try {
      const created = this.repository.create(CONFIG, id, input, new Date().toISOString());
      if (!created) throw notFound(CONFIG.title, id);
      return created;
    } catch (error) {
      sqliteDomainError(error);
    }
  }

  update(id: string, rawInput: unknown) {
    const existing = this.repository.getById(CONFIG, id);
    if (!existing) throw notFound(CONFIG.title, id);

    const input = normalizeInput(CONFIG, rawInput);
    validateRelations(this.repository, CONFIG, input);
    this.validateLicense(input);

    try {
      const updated = this.repository.update(CONFIG, id, input, new Date().toISOString());
      if (!updated) throw notFound(CONFIG.title, id);
      return updated;
    } catch (error) {
      sqliteDomainError(error);
    }
  }

  setActive(id: string, isActive: boolean) {
    if (!this.repository.getById(CONFIG, id)) throw notFound(CONFIG.title, id);

    const updated = this.repository.setActive(CONFIG, id, isActive, new Date().toISOString());
    if (!updated) throw notFound(CONFIG.title, id);
    return updated;
  }

  private validateLicense(input: MasterDataInput) {
    if (input.crew_role !== 'PILOT_IN_COMMAND' && input.crew_role !== 'CO_PILOT') return;

    const missing = [
      'license_type',
      'license_number',
      'license_expiry_date',
      'medical_expiry_date'
    ].filter((field) => !input[field]);

    if (missing.length > 0) {
      throw new DomainError(
        'CREW_LICENSE_REQUIRED',
        'Pilot and co-pilot records require license and medical expiry data.',
        422,
        { missing }
      );
    }
  }
}
