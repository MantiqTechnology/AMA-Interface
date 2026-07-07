export * from './common';
export * from './operations';
export * from './commercial';
export * from './finance';
export * from './cargo';

import type { MasterDataEntityConfig, MasterDataEntityKey } from './common';
import {
  aircraftMasterDataConfig,
  crewMasterDataConfig,
  operationsMasterDataEntities,
  routesMasterDataConfig,
  stationsMasterDataConfig
} from './operations';
import { commercialMasterDataEntities, customersMasterDataConfig } from './commercial';
import { financeMasterDataEntities, vendorsMasterDataConfig } from './finance';
import { cargoMasterDataEntities, dgCategoriesMasterDataConfig } from './cargo';

export const masterDataEntities = [
  ...operationsMasterDataEntities,
  ...commercialMasterDataEntities,
  ...financeMasterDataEntities,
  ...cargoMasterDataEntities
] as const satisfies readonly MasterDataEntityConfig[];

export const masterDataNavigation = [
  {
    domain: 'operations',
    title: 'Operations Master Data',
    description: 'Aircraft, stations, routes, crew, and flight change reasons.',
    shortcut: aircraftMasterDataConfig.routePath,
    entityKeys: ['aircraft', 'stations', 'routes', 'crew', 'flight_reasons']
  },
  {
    domain: 'commercial',
    title: 'Commercial Master Data',
    description: 'Customers, sales agents, counters, and fare or rate cards.',
    shortcut: customersMasterDataConfig.routePath,
    entityKeys: ['customers', 'agents', 'rate_cards']
  },
  {
    domain: 'finance',
    title: 'Finance Master Data',
    description: 'Vendors, suppliers, categories, accounts, taxes, terms, and currencies.',
    shortcut: vendorsMasterDataConfig.routePath,
    entityKeys: [
      'vendors',
      'fuel_suppliers',
      'handling_parking_suppliers',
      'cost_categories',
      'chart_of_accounts',
      'tax_codes',
      'payment_terms',
      'currencies'
    ]
  },
  {
    domain: 'cargo',
    title: 'Cargo & Compliance Master Data',
    description: 'Dangerous Goods categories for future cargo manifest checks.',
    shortcut: dgCategoriesMasterDataConfig.routePath,
    entityKeys: ['dg_categories']
  }
] as const;

const masterDataDetailRoutePrefixes: Partial<Record<MasterDataEntityKey, string>> = {
  aircraft: aircraftMasterDataConfig.routePath,
  crew: crewMasterDataConfig.routePath,
  stations: stationsMasterDataConfig.routePath,
  vendors: vendorsMasterDataConfig.routePath,
  customers: customersMasterDataConfig.routePath,
  routes: routesMasterDataConfig.routePath
};

export function getMasterDataDetailPath(key: MasterDataEntityKey, id: string) {
  const prefix = masterDataDetailRoutePrefixes[key];
  return prefix ? `${prefix}/${encodeURIComponent(id)}` : null;
}

export function getMasterDataEntityConfig(key: MasterDataEntityKey) {
  return masterDataEntities.find((entity) => entity.key === key);
}

export function getMasterDataEntityBySlug(slug: string) {
  return masterDataEntities.find((entity) => entity.slug === slug);
}

export function requireMasterDataEntityBySlug(slug: string) {
  const config = getMasterDataEntityBySlug(slug);

  if (!config) {
    throw new Error(`Unknown master data route: ${slug}`);
  }

  return config;
}

export function getMasterDataField(config: MasterDataEntityConfig, key: string) {
  return config.fields.find((field) => field.key === key);
}
