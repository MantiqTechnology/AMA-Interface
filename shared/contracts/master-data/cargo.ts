import type { MasterDataEntityConfig } from './common';

export const dgCategoriesMasterDataConfig = {
  key: 'dg_categories',
  domain: 'cargo',
  slug: 'dg-categories',
  title: 'DG Categories',
  shortTitle: 'DG Categories',
  description: 'Dangerous Goods category references for future manifest demo flows.',
  tableName: 'ref_dg_categories',
  routePath: '/master-data/dg-categories',
  apiPath: '/api/master-data/dg-categories',
  codeField: 'dg_code',
  labelField: 'description',
  searchFields: ['dg_code', 'dg_class', 'description'],
  optionLabelFields: ['dg_code', 'description'],
  disclaimer:
    'Data DG pada demo hanya untuk simulasi alur UI dan bukan pengganti regulasi, pelatihan, klasifikasi, atau approval Dangerous Goods resmi.',
  fields: [
    { key: 'dg_code', label: 'DG code', type: 'text', required: true, uppercase: true },
    { key: 'dg_class', label: 'DG class', type: 'text', required: true },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      required: true,
      formWidth: 'full'
    },
    {
      key: 'handling_instruction',
      label: 'Handling instruction',
      type: 'textarea',
      required: true,
      formWidth: 'full'
    },
    {
      key: 'requires_special_approval',
      label: 'Requires special approval',
      type: 'boolean',
      default: false
    }
  ],
  displayColumns: [
    'dg_code',
    'dg_class',
    'description',
    'handling_instruction',
    'requires_special_approval'
  ]
} as const satisfies MasterDataEntityConfig;

export const cargoMasterDataEntities = [
  dgCategoriesMasterDataConfig
] as const satisfies readonly MasterDataEntityConfig[];
