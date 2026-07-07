import type {
  MasterDataEntityConfig,
  MasterDataValue
} from '../../../shared/contracts/master-data';
import { getMasterDataEntityConfig } from '../../../shared/contracts/master-data';
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

export class GenericMasterDataService {
  constructor(
    protected readonly repository: SqliteMasterDataRepository,
    protected readonly config: MasterDataEntityConfig
  ) {}

  get(id: string) {
    const row = this.repository.getById(this.config, id);
    if (!row) throw notFound(this.config.title, id);
    return { entity: this.config.key, row, lookups: buildLookups(this.repository, this.config) };
  }

  list(filters: MasterDataFilters) {
    const rows = this.repository.list(this.config, filters);
    return { entity: this.config.key, rows, lookups: buildLookups(this.repository, this.config) };
  }

  create(rawInput: unknown) {
    const input = normalizeInput(this.config, rawInput);
    const id = `ref-${this.config.key.replaceAll('_', '-')}-${crypto.randomUUID()}`;

    validateRelations(this.repository, this.config, input);
    this.validateBusinessRules(input, id);

    try {
      const created = this.repository.create(this.config, id, input, new Date().toISOString());
      if (!created) throw notFound(this.config.title, id);
      return created;
    } catch (error) {
      sqliteDomainError(error);
    }
  }

  update(id: string, rawInput: unknown) {
    const existing = this.repository.getById(this.config, id);
    if (!existing) throw notFound(this.config.title, id);

    const input = normalizeInput(this.config, rawInput);
    validateRelations(this.repository, this.config, input);
    this.validateBusinessRules(input, id);

    try {
      const updated = this.repository.update(this.config, id, input, new Date().toISOString());
      if (!updated) throw notFound(this.config.title, id);
      return updated;
    } catch (error) {
      sqliteDomainError(error);
    }
  }

  setActive(id: string, isActive: boolean) {
    if (!this.repository.getById(this.config, id)) throw notFound(this.config.title, id);

    const updated = this.repository.setActive(this.config, id, isActive, new Date().toISOString());
    if (!updated) throw notFound(this.config.title, id);
    return updated;
  }

  protected validateBusinessRules(...args: [MasterDataInput, string]) {
    void args;
  }
}

export class CustomerMasterDataService extends GenericMasterDataService {
  protected override validateBusinessRules(input: MasterDataInput) {
    const needsContact = input.account_type === 'CORPORATE' || input.account_type === 'GOVERNMENT';

    if (needsContact && !input.contact_person) {
      throw new DomainError(
        'CUSTOMER_CONTACT_REQUIRED',
        'Corporate and government accounts require a contact person.',
        422
      );
    }
  }
}

export class AgentMasterDataService extends GenericMasterDataService {
  protected override validateBusinessRules(input: MasterDataInput) {
    if (input.agent_type === 'STATION_COUNTER' && !input.station_id) {
      throw new DomainError(
        'AGENT_STATION_REQUIRED',
        'Station counter agents require a station.',
        422
      );
    }
  }
}

export class CostCategoryMasterDataService extends GenericMasterDataService {
  protected override validateBusinessRules(input: MasterDataInput) {
    if (!input.default_coa_id) return;

    const coa = this.readRelated('chart_of_accounts', String(input.default_coa_id));

    if (coa?.account_type !== 'EXPENSE') {
      throw new DomainError(
        'COST_CATEGORY_EXPENSE_COA_REQUIRED',
        'Default COA for a cost category must be an active expense account.',
        422
      );
    }
  }

  private readRelated(key: Parameters<typeof getMasterDataEntityConfig>[0], id: string) {
    const config = getMasterDataEntityConfig(key);
    return config ? this.repository.getById(config, id) : null;
  }
}

export class ChartOfAccountsMasterDataService extends GenericMasterDataService {
  protected override validateBusinessRules(input: MasterDataInput, id: string) {
    if (!input.parent_account_id) return;

    if (input.parent_account_id === id) {
      throw new DomainError('COA_PARENT_SELF', 'Parent account cannot reference itself.', 422);
    }

    const config = getMasterDataEntityConfig('chart_of_accounts');
    if (!config) return;

    const visited = new Set<string>([id]);
    let cursor: string | null = String(input.parent_account_id);

    while (cursor) {
      if (visited.has(cursor)) {
        throw new DomainError(
          'COA_PARENT_CIRCULAR',
          'Chart of accounts parent relationship is circular.',
          422
        );
      }

      visited.add(cursor);
      const parent = this.repository.getById(config, cursor);
      const nextParent: MasterDataValue | undefined = parent?.parent_account_id;
      cursor = typeof nextParent === 'string' ? nextParent : null;
    }
  }
}

export class TaxCodesMasterDataService extends GenericMasterDataService {
  protected override validateBusinessRules(input: MasterDataInput) {
    assertDateOrder(input, 'effective_from', 'effective_to');
  }
}
