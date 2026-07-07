import type { MasterDataEntityConfig } from './common';

export const customersMasterDataConfig = {
  key: 'customers',
  domain: 'commercial',
  slug: 'customers',
  title: 'Customers & Corporate Accounts',
  shortTitle: 'Customers',
  description: 'Individual, corporate, government, and agency customer accounts.',
  tableName: 'ref_customers',
  routePath: '/master-data/customers',
  apiPath: '/api/master-data/customers',
  codeField: 'account_code',
  labelField: 'account_name',
  searchFields: ['account_code', 'account_name', 'contact_person', 'email'],
  optionLabelFields: ['account_code', 'account_name'],
  fields: [
    { key: 'account_code', label: 'Account code', type: 'text', required: true, uppercase: true },
    { key: 'account_name', label: 'Account name', type: 'text', required: true },
    {
      key: 'account_type',
      label: 'Account type',
      type: 'select',
      required: true,
      options: ['INDIVIDUAL', 'CORPORATE', 'GOVERNMENT', 'AGENCY']
    },
    { key: 'contact_person', label: 'Contact person', type: 'text', nullable: true },
    { key: 'phone', label: 'Phone', type: 'text', nullable: true },
    { key: 'email', label: 'Email', type: 'email', nullable: true },
    {
      key: 'billing_address',
      label: 'Billing address',
      type: 'textarea',
      nullable: true,
      formWidth: 'full'
    },
    {
      key: 'payment_term_id',
      label: 'Payment term',
      type: 'relation',
      relation: 'payment_terms',
      nullable: true
    },
    { key: 'credit_limit', label: 'Credit limit minor unit', type: 'money', nullable: true, min: 0 }
  ],
  displayColumns: [
    'account_code',
    'account_name',
    'account_type',
    'contact_person',
    { key: 'payment_term_id', label: 'Payment term', type: 'relation', relation: 'payment_terms' },
    { key: 'credit_limit', label: 'Credit limit', type: 'money' }
  ]
} as const satisfies MasterDataEntityConfig;

export const agentsMasterDataConfig = {
  key: 'agents',
  domain: 'commercial',
  slug: 'agents',
  title: 'Agents & Counters',
  shortTitle: 'Agents',
  description: 'Sales agents, station counters, and cargo partners.',
  tableName: 'ref_agents',
  routePath: '/master-data/agents',
  apiPath: '/api/master-data/agents',
  codeField: 'agent_code',
  labelField: 'agent_name',
  searchFields: ['agent_code', 'agent_name', 'contact_person'],
  optionLabelFields: ['agent_code', 'agent_name'],
  fields: [
    { key: 'agent_code', label: 'Agent code', type: 'text', required: true, uppercase: true },
    { key: 'agent_name', label: 'Agent name', type: 'text', required: true },
    {
      key: 'agent_type',
      label: 'Agent type',
      type: 'select',
      required: true,
      options: ['TICKET_AGENT', 'CARGO_AGENT', 'STATION_COUNTER']
    },
    { key: 'station_id', label: 'Station', type: 'relation', relation: 'stations', nullable: true },
    {
      key: 'commission_basis_points',
      label: 'Commission basis points',
      type: 'number',
      nullable: true,
      min: 0
    },
    { key: 'contact_person', label: 'Contact person', type: 'text', nullable: true },
    { key: 'phone', label: 'Phone', type: 'text', nullable: true }
  ],
  displayColumns: [
    'agent_code',
    'agent_name',
    'agent_type',
    { key: 'station_id', label: 'Station', type: 'relation', relation: 'stations' },
    'commission_basis_points'
  ]
} as const satisfies MasterDataEntityConfig;

export const rateCardsMasterDataConfig = {
  key: 'rate_cards',
  domain: 'commercial',
  slug: 'rates',
  title: 'Fare & Rate Cards',
  shortTitle: 'Fare & Rate Cards',
  description: 'Demo passenger, cargo, and charter rates for future billing references.',
  tableName: 'ref_rate_cards',
  routePath: '/master-data/rates',
  apiPath: '/api/master-data/rates',
  codeField: 'rate_code',
  labelField: 'rate_code',
  searchFields: ['rate_code', 'service_type', 'aircraft_type'],
  optionLabelFields: ['rate_code', 'service_type'],
  fields: [
    { key: 'rate_code', label: 'Rate code', type: 'text', required: true, uppercase: true },
    {
      key: 'service_type',
      label: 'Service type',
      type: 'select',
      required: true,
      options: ['CHARTER', 'PASSENGER', 'CARGO']
    },
    {
      key: 'origin_station_id',
      label: 'Origin',
      type: 'relation',
      relation: 'stations',
      required: true
    },
    {
      key: 'destination_station_id',
      label: 'Destination',
      type: 'relation',
      relation: 'stations',
      required: true
    },
    {
      key: 'customer_id',
      label: 'Customer',
      type: 'relation',
      relation: 'customers',
      nullable: true
    },
    { key: 'aircraft_type', label: 'Aircraft type', type: 'text', nullable: true },
    {
      key: 'currency_id',
      label: 'Currency',
      type: 'relation',
      relation: 'currencies',
      required: true
    },
    { key: 'base_rate', label: 'Base rate minor unit', type: 'money', required: true, min: 0 },
    {
      key: 'rate_unit',
      label: 'Rate unit',
      type: 'select',
      required: true,
      options: ['PER_FLIGHT', 'PER_PASSENGER', 'PER_KG']
    },
    { key: 'effective_from', label: 'Effective from', type: 'date', required: true },
    { key: 'effective_to', label: 'Effective to', type: 'date', nullable: true }
  ],
  displayColumns: [
    'rate_code',
    { key: 'route', label: 'Route', type: 'route' },
    'service_type',
    { key: 'base_rate', label: 'Base rate', type: 'money' },
    { key: 'currency_id', label: 'Currency', type: 'relation', relation: 'currencies' },
    'rate_unit',
    { key: 'effective_from', label: 'Rate status', type: 'rate_status' }
  ]
} as const satisfies MasterDataEntityConfig;

export const commercialMasterDataEntities = [
  customersMasterDataConfig,
  agentsMasterDataConfig,
  rateCardsMasterDataConfig
] as const satisfies readonly MasterDataEntityConfig[];
