import { rateCardsMasterDataConfig } from '../../../shared/contracts/master-data';
import {
  SqliteMasterDataRepository,
  type MasterDataFilters
} from '../../repositories/master-data.repository';
import { DomainError, notFound } from '../../utils/errors';
import {
  assertDateOrder,
  buildLookups,
  normalizeInput,
  sqliteDomainError,
  validateRelations,
  type MasterDataInput
} from './helpers';

const CONFIG = rateCardsMasterDataConfig;

export class RateCardsService {
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
    const id = `ref-rate-cards-${crypto.randomUUID()}`;

    validateRelations(this.repository, CONFIG, input);
    this.validateRateCardRules(input);

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
    this.validateRateCardRules(input);

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

  private validateRateCardRules(input: MasterDataInput) {
    if (input.origin_station_id === input.destination_station_id) {
      throw new DomainError(
        'RATE_STATIONS_MATCH',
        'Origin and destination cannot be the same.',
        422
      );
    }
    assertDateOrder(input, 'effective_from', 'effective_to');
  }
}
