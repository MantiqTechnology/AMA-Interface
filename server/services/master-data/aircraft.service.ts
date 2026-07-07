import { aircraftMasterDataConfig } from '../../../shared/contracts/master-data';
import {
  SqliteMasterDataRepository,
  type MasterDataFilters
} from '../../repositories/master-data.repository';
import { notFound } from '../../utils/errors';
import { buildLookups, normalizeInput, sqliteDomainError, validateRelations } from './helpers';

const CONFIG = aircraftMasterDataConfig;

export class AircraftService {
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
    validateRelations(this.repository, CONFIG, input);

    const id = `ref-aircraft-${crypto.randomUUID()}`;

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
}
