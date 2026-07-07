import type { MasterDataEntityConfig } from './common';

export const vendorsMasterDataConfig = {
  key: 'vendors',
  domain: 'finance',
  slug: 'vendors',
  title: 'Vendors',
  shortTitle: 'Vendors',
  description: 'Non-fuel vendors used by operating and finance workflows.',
  tableName: 'ref_vendors',
  routePath: '/master-data/vendors',
  apiPath: '/api/master-data/vendors',
  codeField: 'vendor_code',
  labelField: 'vendor_name',
  searchFields: ['vendor_code', 'vendor_name', 'contact_person', 'email'],
  optionLabelFields: ['vendor_code', 'vendor_name'],
  fields: [
    { key: 'vendor_code', label: 'Vendor code', type: 'text', required: true, uppercase: true },
    { key: 'vendor_name', label: 'Vendor name', type: 'text', required: true },
    {
      key: 'vendor_type',
      label: 'Vendor type',
      type: 'select',
      required: true,
      options: [
        'HANDLING',
        'PARKING',
        'ACCOMMODATION',
        'TRANSPORT',
        'CATERING',
        'MAINTENANCE',
        'GENERAL'
      ]
    },
    { key: 'station_id', label: 'Station', type: 'relation', relation: 'stations', nullable: true },
    { key: 'contact_person', label: 'Contact person', type: 'text', nullable: true },
    { key: 'phone', label: 'Phone', type: 'text', nullable: true },
    { key: 'email', label: 'Email', type: 'email', nullable: true },
    {
      key: 'payment_term_id',
      label: 'Payment term',
      type: 'relation',
      relation: 'payment_terms',
      nullable: true
    }
  ],
  displayColumns: [
    'vendor_code',
    'vendor_name',
    'vendor_type',
    { key: 'station_id', label: 'Station', type: 'relation', relation: 'stations' },
    { key: 'payment_term_id', label: 'Payment term', type: 'relation', relation: 'payment_terms' }
  ]
} as const satisfies MasterDataEntityConfig;

export const fuelSuppliersMasterDataConfig = {
  key: 'fuel_suppliers',
  domain: 'finance',
  slug: 'fuel-suppliers',
  title: 'Fuel Suppliers',
  shortTitle: 'Fuel Suppliers',
  description: 'Mock fuel suppliers for future Fuel Control demo flows.',
  tableName: 'ref_fuel_suppliers',
  routePath: '/master-data/fuel-suppliers',
  apiPath: '/api/master-data/fuel-suppliers',
  codeField: 'supplier_code',
  labelField: 'supplier_name',
  searchFields: ['supplier_code', 'supplier_name', 'fuel_type', 'contact_person'],
  optionLabelFields: ['supplier_code', 'supplier_name'],
  disclaimer:
    'Fuel suppliers in this demo are mock reference data and are not a live vendor integration.',
  fields: [
    { key: 'supplier_code', label: 'Supplier code', type: 'text', required: true, uppercase: true },
    { key: 'supplier_name', label: 'Supplier name', type: 'text', required: true },
    { key: 'station_id', label: 'Station', type: 'relation', relation: 'stations', required: true },
    {
      key: 'fuel_type',
      label: 'Fuel type',
      type: 'select',
      required: true,
      options: ['AVTUR', 'AVGAS']
    },
    {
      key: 'reference_price_per_litre',
      label: 'Reference price per litre minor unit',
      type: 'money',
      required: true,
      min: 0
    },
    {
      key: 'currency_id',
      label: 'Currency',
      type: 'relation',
      relation: 'currencies',
      required: true
    },
    { key: 'contact_person', label: 'Contact person', type: 'text', nullable: true },
    { key: 'phone', label: 'Phone', type: 'text', nullable: true }
  ],
  displayColumns: [
    'supplier_code',
    'supplier_name',
    { key: 'station_id', label: 'Station', type: 'relation', relation: 'stations' },
    'fuel_type',
    { key: 'reference_price_per_litre', label: 'Reference price', type: 'money' },
    { key: 'mock', label: 'Integration', type: 'mock_badge' }
  ]
} as const satisfies MasterDataEntityConfig;

export const handlingParkingSuppliersMasterDataConfig = {
  key: 'handling_parking_suppliers',
  domain: 'finance',
  slug: 'handling-parking-suppliers',
  title: 'Handling & Parking Suppliers',
  shortTitle: 'Handling & Parking',
  description: 'Mock handling and parking suppliers for future Station Operations flows.',
  tableName: 'ref_station_service_suppliers',
  routePath: '/master-data/handling-parking-suppliers',
  apiPath: '/api/master-data/handling-parking-suppliers',
  codeField: 'supplier_code',
  labelField: 'supplier_name',
  searchFields: ['supplier_code', 'supplier_name', 'service_type', 'contact_person'],
  optionLabelFields: ['supplier_code', 'supplier_name'],
  disclaimer:
    'Handling and parking providers in this demo are mock reference data and are not live integrations.',
  fields: [
    { key: 'supplier_code', label: 'Supplier code', type: 'text', required: true, uppercase: true },
    { key: 'supplier_name', label: 'Supplier name', type: 'text', required: true },
    { key: 'station_id', label: 'Station', type: 'relation', relation: 'stations', required: true },
    {
      key: 'service_type',
      label: 'Service type',
      type: 'select',
      required: true,
      options: ['HANDLING', 'PARKING', 'BOTH']
    },
    {
      key: 'reference_rate',
      label: 'Reference rate minor unit',
      type: 'money',
      nullable: true,
      min: 0
    },
    {
      key: 'currency_id',
      label: 'Currency',
      type: 'relation',
      relation: 'currencies',
      nullable: true
    },
    { key: 'contact_person', label: 'Contact person', type: 'text', nullable: true },
    { key: 'phone', label: 'Phone', type: 'text', nullable: true }
  ],
  displayColumns: [
    'supplier_code',
    'supplier_name',
    { key: 'station_id', label: 'Station', type: 'relation', relation: 'stations' },
    { key: 'service_type', label: 'Service', type: 'status' },
    { key: 'reference_rate', label: 'Reference rate', type: 'money' },
    { key: 'mock', label: 'Integration', type: 'mock_badge' }
  ]
} as const satisfies MasterDataEntityConfig;

export const costCategoriesMasterDataConfig = {
  key: 'cost_categories',
  domain: 'finance',
  slug: 'cost-categories',
  title: 'Cost Categories',
  shortTitle: 'Cost Categories',
  description: 'Operational cost groupings for station, fuel, maintenance, and emergency expenses.',
  tableName: 'ref_cost_categories',
  routePath: '/master-data/cost-categories',
  apiPath: '/api/master-data/cost-categories',
  codeField: 'category_code',
  labelField: 'category_name',
  searchFields: ['category_code', 'category_name', 'cost_group'],
  optionLabelFields: ['category_code', 'category_name'],
  fields: [
    { key: 'category_code', label: 'Category code', type: 'text', required: true, uppercase: true },
    { key: 'category_name', label: 'Category name', type: 'text', required: true },
    { key: 'cost_group', label: 'Cost group', type: 'text', required: true },
    {
      key: 'default_coa_id',
      label: 'Default expense COA',
      type: 'relation',
      relation: 'chart_of_accounts',
      nullable: true
    }
  ],
  displayColumns: [
    'category_code',
    'category_name',
    'cost_group',
    { key: 'default_coa_id', label: 'Default COA', type: 'relation', relation: 'chart_of_accounts' }
  ]
} as const satisfies MasterDataEntityConfig;

export const chartOfAccountsMasterDataConfig = {
  key: 'chart_of_accounts',
  domain: 'finance',
  slug: 'chart-of-accounts',
  title: 'Chart of Accounts',
  shortTitle: 'Chart of Accounts',
  description: 'Minimal chart of accounts for journal preview demos, not a full general ledger.',
  tableName: 'ref_chart_of_accounts',
  routePath: '/master-data/chart-of-accounts',
  apiPath: '/api/master-data/chart-of-accounts',
  codeField: 'account_code',
  labelField: 'account_name',
  searchFields: ['account_code', 'account_name', 'account_type'],
  optionLabelFields: ['account_code', 'account_name'],
  fields: [
    { key: 'account_code', label: 'Account code', type: 'text', required: true, uppercase: true },
    { key: 'account_name', label: 'Account name', type: 'text', required: true },
    {
      key: 'account_type',
      label: 'Account type',
      type: 'select',
      required: true,
      options: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']
    },
    {
      key: 'normal_balance',
      label: 'Normal balance',
      type: 'select',
      required: true,
      options: ['DEBIT', 'CREDIT']
    },
    {
      key: 'parent_account_id',
      label: 'Parent account',
      type: 'relation',
      relation: 'chart_of_accounts',
      nullable: true
    },
    { key: 'is_postable', label: 'Postable account', type: 'boolean', default: true }
  ],
  displayColumns: [
    'account_code',
    'account_name',
    'account_type',
    'normal_balance',
    {
      key: 'parent_account_id',
      label: 'Parent account',
      type: 'relation',
      relation: 'chart_of_accounts'
    },
    'is_postable'
  ]
} as const satisfies MasterDataEntityConfig;

export const taxCodesMasterDataConfig = {
  key: 'tax_codes',
  domain: 'finance',
  slug: 'tax-codes',
  title: 'Tax Codes',
  shortTitle: 'Tax Codes',
  description: 'Demo tax configuration for transaction selection.',
  tableName: 'ref_tax_codes',
  routePath: '/master-data/tax-codes',
  apiPath: '/api/master-data/tax-codes',
  codeField: 'tax_code',
  labelField: 'tax_name',
  searchFields: ['tax_code', 'tax_name', 'tax_type'],
  optionLabelFields: ['tax_code', 'tax_name'],
  disclaimer:
    'Tax configuration is dummy demo data and is not a statement of current tax compliance rules.',
  fields: [
    { key: 'tax_code', label: 'Tax code', type: 'text', required: true, uppercase: true },
    { key: 'tax_name', label: 'Tax name', type: 'text', required: true },
    {
      key: 'tax_rate_basis_points',
      label: 'Rate basis points',
      type: 'number',
      required: true,
      min: 0
    },
    {
      key: 'tax_type',
      label: 'Tax type',
      type: 'select',
      required: true,
      options: ['NON_TAX', 'VAT', 'WITHHOLDING']
    },
    { key: 'effective_from', label: 'Effective from', type: 'date', required: true },
    { key: 'effective_to', label: 'Effective to', type: 'date', nullable: true }
  ],
  displayColumns: [
    'tax_code',
    'tax_name',
    'tax_rate_basis_points',
    'tax_type',
    { key: 'effective_from', label: 'Status', type: 'rate_status' }
  ]
} as const satisfies MasterDataEntityConfig;

export const paymentTermsMasterDataConfig = {
  key: 'payment_terms',
  domain: 'finance',
  slug: 'payment-terms',
  title: 'Payment Terms',
  shortTitle: 'Payment Terms',
  description: 'Payment due-day rules for customer and vendor accounts.',
  tableName: 'ref_payment_terms',
  routePath: '/master-data/payment-terms',
  apiPath: '/api/master-data/payment-terms',
  codeField: 'term_code',
  labelField: 'term_name',
  searchFields: ['term_code', 'term_name', 'description'],
  optionLabelFields: ['term_code', 'term_name'],
  fields: [
    { key: 'term_code', label: 'Term code', type: 'text', required: true, uppercase: true },
    { key: 'term_name', label: 'Term name', type: 'text', required: true },
    { key: 'due_days', label: 'Due days', type: 'number', required: true, min: 0 },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      nullable: true,
      formWidth: 'full'
    }
  ],
  displayColumns: ['term_code', 'term_name', 'due_days', 'description']
} as const satisfies MasterDataEntityConfig;

export const currenciesMasterDataConfig = {
  key: 'currencies',
  domain: 'finance',
  slug: 'currencies',
  title: 'Currencies',
  shortTitle: 'Currencies',
  description: 'Currency codes used by commercial and finance references.',
  tableName: 'ref_currencies',
  routePath: '/master-data/currencies',
  apiPath: '/api/master-data/currencies',
  codeField: 'currency_code',
  labelField: 'currency_name',
  searchFields: ['currency_code', 'currency_name', 'symbol'],
  optionLabelFields: ['currency_code', 'currency_name'],
  fields: [
    { key: 'currency_code', label: 'Currency code', type: 'text', required: true, uppercase: true },
    { key: 'currency_name', label: 'Currency name', type: 'text', required: true },
    { key: 'symbol', label: 'Symbol', type: 'text', required: true },
    { key: 'decimal_places', label: 'Decimal places', type: 'number', required: true, min: 0 }
  ],
  displayColumns: ['currency_code', 'currency_name', 'symbol', 'decimal_places']
} as const satisfies MasterDataEntityConfig;

export const financeMasterDataEntities = [
  vendorsMasterDataConfig,
  fuelSuppliersMasterDataConfig,
  handlingParkingSuppliersMasterDataConfig,
  costCategoriesMasterDataConfig,
  chartOfAccountsMasterDataConfig,
  taxCodesMasterDataConfig,
  paymentTermsMasterDataConfig,
  currenciesMasterDataConfig
] as const satisfies readonly MasterDataEntityConfig[];
