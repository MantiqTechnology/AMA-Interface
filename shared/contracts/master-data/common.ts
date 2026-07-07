import { z } from 'zod';

export const masterDataDomains = ['operations', 'commercial', 'finance', 'cargo'] as const;

export const masterDataEntityKeys = [
  'aircraft',
  'stations',
  'routes',
  'crew',
  'flight_reasons',
  'customers',
  'agents',
  'rate_cards',
  'vendors',
  'fuel_suppliers',
  'handling_parking_suppliers',
  'cost_categories',
  'chart_of_accounts',
  'tax_codes',
  'payment_terms',
  'currencies',
  'dg_categories'
] as const;

export const masterDataDomainSchema = z.enum(masterDataDomains);
export const masterDataEntityKeySchema = z.enum(masterDataEntityKeys);

export type MasterDataDomain = (typeof masterDataDomains)[number];
export type MasterDataEntityKey = (typeof masterDataEntityKeys)[number];

export type MasterDataFieldType =
  'text' | 'textarea' | 'email' | 'number' | 'money' | 'date' | 'boolean' | 'select' | 'relation';

export type MasterDataDisplayColumn =
  | string
  | {
      key: string;
      label: string;
      type?:
        | 'text'
        | 'money'
        | 'boolean'
        | 'status'
        | 'relation'
        | 'date'
        | 'route'
        | 'facilities'
        | 'expiry'
        | 'rate_status'
        | 'mock_badge';
      relation?: MasterDataEntityKey;
    };

export type MasterDataFieldConfig = {
  key: string;
  label: string;
  type: MasterDataFieldType;
  required?: boolean;
  nullable?: boolean;
  uppercase?: boolean;
  min?: number;
  max?: number;
  default?: string | number | boolean | null;
  options?: readonly string[];
  relation?: MasterDataEntityKey;
  description?: string;
  formWidth?: 'full' | 'half';
};

export type MasterDataEntityConfig = {
  key: MasterDataEntityKey;
  domain: MasterDataDomain;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  tableName: string;
  routePath: string;
  apiPath: string;
  codeField: string;
  labelField: string;
  searchFields: readonly string[];
  fields: readonly MasterDataFieldConfig[];
  displayColumns: readonly MasterDataDisplayColumn[];
  optionLabelFields: readonly string[];
  disclaimer?: string;
};

export type MasterDataValue = string | number | boolean | null;

export type MasterDataRecord = {
  id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
} & Record<string, MasterDataValue>;

export type MasterDataOption = {
  value: string;
  title: string;
  subtitle?: string;
  isActive: boolean;
};

export type MasterDataListResponse = {
  entity: MasterDataEntityKey;
  rows: MasterDataRecord[];
  lookups: Partial<Record<MasterDataEntityKey, MasterDataOption[]>>;
};

export type MasterDataDetailResponse = {
  entity: MasterDataEntityKey;
  row: MasterDataRecord;
  lookups: Partial<Record<MasterDataEntityKey, MasterDataOption[]>>;
};

export type MasterDataOverviewCard = {
  domain: MasterDataDomain;
  title: string;
  description: string;
  activeRecords: number;
  dataTypes: string[];
  shortcut: string;
};

export type MasterDataOverviewResponse = {
  title: 'Master Data';
  cards: MasterDataOverviewCard[];
};

export const activeFilterSchema = z.enum(['active', 'inactive', 'all']).default('active');

export const masterDataListQuerySchema = z.object({
  active: activeFilterSchema,
  search: z.string().trim().max(80).optional().default('')
});

export const masterDataRouteParamsSchema = z.object({
  entity: z.string().min(1)
});

export const masterDataIdRouteParamsSchema = masterDataRouteParamsSchema.extend({
  id: z.string().min(1)
});

export const masterDataStatusBodySchema = z.object({
  is_active: z.boolean()
});
