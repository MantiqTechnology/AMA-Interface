import {
  agentsMasterDataConfig,
  chartOfAccountsMasterDataConfig,
  costCategoriesMasterDataConfig,
  customersMasterDataConfig,
  flightReasonsMasterDataConfig,
  fuelSuppliersMasterDataConfig,
  handlingParkingSuppliersMasterDataConfig,
  currenciesMasterDataConfig,
  dgCategoriesMasterDataConfig,
  getMasterDataEntityConfig,
  masterDataEntities,
  masterDataNavigation,
  paymentTermsMasterDataConfig,
  stationsMasterDataConfig,
  taxCodesMasterDataConfig,
  vendorsMasterDataConfig
} from '../../../shared/contracts/master-data';
import type {
  MasterDataDetailResponse,
  MasterDataListResponse,
  MasterDataRecord
} from '../../../shared/contracts/master-data';
import {
  SqliteMasterDataRepository,
  type MasterDataFilters
} from '../../repositories/master-data.repository';
import { DomainError } from '../../utils/errors';
import { AircraftService } from './aircraft.service';
import { CrewService } from './crew.service';
import {
  AgentMasterDataService,
  ChartOfAccountsMasterDataService,
  CostCategoryMasterDataService,
  CustomerMasterDataService,
  GenericMasterDataService,
  TaxCodesMasterDataService
} from './generic.service';
import { RateCardsService } from './rate-card.service';
import { RoutesService } from './route.service';

type MasterDataEntityService = {
  get(id: string): MasterDataDetailResponse;
  list(filters: MasterDataFilters): MasterDataListResponse;
  create(rawInput: unknown): MasterDataRecord;
  update(id: string, rawInput: unknown): MasterDataRecord;
  setActive(id: string, isActive: boolean): MasterDataRecord;
};

export class MasterDataService {
  private readonly servicesBySlug: Map<string, MasterDataEntityService>;

  constructor(private readonly repository: SqliteMasterDataRepository) {
    const servicePairs: Array<[string, MasterDataEntityService]> = [
      ['aircraft', new AircraftService(repository)],
      ['stations', new GenericMasterDataService(repository, stationsMasterDataConfig)],
      ['routes', new RoutesService(repository)],
      ['personnel', new CrewService(repository)],
      ['flight-reasons', new GenericMasterDataService(repository, flightReasonsMasterDataConfig)],
      ['customers', new CustomerMasterDataService(repository, customersMasterDataConfig)],
      ['agents', new AgentMasterDataService(repository, agentsMasterDataConfig)],
      ['rates', new RateCardsService(repository)],
      ['vendors', new GenericMasterDataService(repository, vendorsMasterDataConfig)],
      ['fuel-suppliers', new GenericMasterDataService(repository, fuelSuppliersMasterDataConfig)],
      [
        'handling-parking-suppliers',
        new GenericMasterDataService(repository, handlingParkingSuppliersMasterDataConfig)
      ],
      [
        'cost-categories',
        new CostCategoryMasterDataService(repository, costCategoriesMasterDataConfig)
      ],
      [
        'chart-of-accounts',
        new ChartOfAccountsMasterDataService(repository, chartOfAccountsMasterDataConfig)
      ],
      ['tax-codes', new TaxCodesMasterDataService(repository, taxCodesMasterDataConfig)],
      ['payment-terms', new GenericMasterDataService(repository, paymentTermsMasterDataConfig)],
      ['currencies', new GenericMasterDataService(repository, currenciesMasterDataConfig)],
      ['dg-categories', new GenericMasterDataService(repository, dgCategoriesMasterDataConfig)]
    ];

    this.servicesBySlug = new Map(servicePairs);
  }

  getConfig(slug: string) {
    return this.requireConfig(slug);
  }

  get(slug: string, id: string) {
    return this.requireService(slug).get(id);
  }

  list(slug: string, filters: MasterDataFilters) {
    return this.requireService(slug).list(filters);
  }

  create(slug: string, rawInput: unknown) {
    return this.requireService(slug).create(rawInput);
  }

  update(slug: string, id: string, rawInput: unknown) {
    return this.requireService(slug).update(id, rawInput);
  }

  setActive(slug: string, id: string, isActive: boolean) {
    return this.requireService(slug).setActive(id, isActive);
  }

  overview() {
    return {
      title: 'Master Data',
      cards: masterDataNavigation.map((domain) => ({
        domain: domain.domain,
        title: domain.title,
        description: domain.description,
        shortcut: domain.shortcut,
        dataTypes: domain.entityKeys.map((key) => this.requireConfigByKey(key).shortTitle),
        activeRecords: domain.entityKeys.reduce((total, key) => {
          return total + this.repository.countActive(this.requireConfigByKey(key));
        }, 0)
      }))
    };
  }

  private requireService(slug: string) {
    const service = this.servicesBySlug.get(slug);

    if (!service) {
      throw new DomainError(
        'MASTER_DATA_ENTITY_NOT_FOUND',
        `Master data page ${slug} was not found`,
        404
      );
    }

    return service;
  }

  private requireConfig(slug: string) {
    const config = masterDataEntities.find((entity) => entity.slug === slug);

    if (!config) {
      throw new DomainError(
        'MASTER_DATA_ENTITY_NOT_FOUND',
        `Master data page ${slug} was not found`,
        404
      );
    }

    return config;
  }

  private requireConfigByKey(key: Parameters<typeof getMasterDataEntityConfig>[0]) {
    const config = getMasterDataEntityConfig(key);

    if (!config) {
      throw new DomainError(
        'MASTER_DATA_ENTITY_NOT_FOUND',
        `Master data ${key} was not found`,
        404
      );
    }

    return config;
  }
}
