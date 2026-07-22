import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { stations } from './operations';

export const currencies = sqliteTable('currencies', {
  id: text('id').primaryKey(),
  currencyCode: text('currency_code').notNull().unique(),
  currencyName: text('currency_name').notNull(),
  symbol: text('symbol').notNull(),
  decimalPlaces: integer('decimal_places').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const paymentTerms = sqliteTable('payment_terms', {
  id: text('id').primaryKey(),
  termCode: text('term_code').notNull().unique(),
  termName: text('term_name').notNull(),
  dueDays: integer('due_days').notNull(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const chartOfAccounts = sqliteTable('chart_of_accounts', {
  id: text('id').primaryKey(),
  accountCode: text('account_code').notNull().unique(),
  accountName: text('account_name').notNull(),
  accountType: text('account_type').notNull(),
  normalBalance: text('normal_balance').notNull(),
  parentAccountId: text('parent_account_id'),
  isPostable: integer('is_postable', { mode: 'boolean' }).notNull().default(true),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const costCategories = sqliteTable('cost_categories', {
  id: text('id').primaryKey(),
  categoryCode: text('category_code').notNull().unique(),
  categoryName: text('category_name').notNull(),
  costGroup: text('cost_group').notNull(),
  defaultCoaId: text('default_coa_id').references(() => chartOfAccounts.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const vendors = sqliteTable('vendors', {
  id: text('id').primaryKey(),
  vendorCode: text('vendor_code').notNull().unique(),
  vendorName: text('vendor_name').notNull(),
  vendorType: text('vendor_type').notNull(),
  stationId: text('station_id').references(() => stations.id),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  paymentTermId: text('payment_term_id').references(() => paymentTerms.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const fuelSuppliers = sqliteTable('fuel_suppliers', {
  id: text('id').primaryKey(),
  supplierCode: text('supplier_code').notNull().unique(),
  supplierName: text('supplier_name').notNull(),
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  fuelType: text('fuel_type').notNull(),
  referencePricePerLitre: integer('reference_price_per_litre').notNull(),
  currencyId: text('currency_id')
    .notNull()
    .references(() => currencies.id),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const stationServiceSuppliers = sqliteTable('station_service_suppliers', {
  id: text('id').primaryKey(),
  supplierCode: text('supplier_code').notNull().unique(),
  supplierName: text('supplier_name').notNull(),
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  serviceType: text('service_type').notNull(),
  referenceRate: integer('reference_rate'),
  currencyId: text('currency_id').references(() => currencies.id),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const taxCodes = sqliteTable('tax_codes', {
  id: text('id').primaryKey(),
  taxCode: text('tax_code').notNull().unique(),
  taxName: text('tax_name').notNull(),
  taxRateBasisPoints: integer('tax_rate_basis_points').notNull(),
  taxType: text('tax_type').notNull(),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const accountingPeriods = sqliteTable('accounting_periods', {
  id: text('id').primaryKey(),
  periodCode: text('period_code').notNull().unique(),
  periodName: text('period_name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status').notNull().default('OPEN'),
  lockedAt: text('locked_at'),
  lockedByUserId: text('locked_by_user_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const accountingPolicies = sqliteTable('accounting_policies', {
  id: text('id').primaryKey(),
  policyCode: text('policy_code').notNull().unique(),
  policyName: text('policy_name').notNull(),
  eventType: text('event_type').notNull(),
  productAccountingProfileId: text('product_accounting_profile_id'),
  debitAccountId: text('debit_account_id')
    .notNull()
    .references(() => chartOfAccounts.id),
  creditAccountId: text('credit_account_id')
    .notNull()
    .references(() => chartOfAccounts.id),
  treatment: text('treatment').notNull(),
  capitalizationCandidate: integer('capitalization_candidate', { mode: 'boolean' })
    .notNull()
    .default(false),
  requiredDimensionsJson: text('required_dimensions_json').notNull().default('[]'),
  priority: integer('priority').notNull().default(100),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  approvalStatus: text('approval_status').notNull().default('APPROVED'),
  version: integer('version').notNull().default(1),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const productAccountingProfiles = sqliteTable('product_accounting_profiles', {
  id: text('id').primaryKey(),
  profileCode: text('profile_code').notNull().unique(),
  profileName: text('profile_name').notNull(),
  productType: text('product_type').notNull(),
  accountingClass: text('accounting_class').notNull(),
  inventoryAccountId: text('inventory_account_id').references(() => chartOfAccounts.id),
  expenseAccountId: text('expense_account_id').references(() => chartOfAccounts.id),
  assetAccountId: text('asset_account_id').references(() => chartOfAccounts.id),
  revenueAccountId: text('revenue_account_id').references(() => chartOfAccounts.id),
  deferredRevenueAccountId: text('deferred_revenue_account_id').references(
    () => chartOfAccounts.id
  ),
  taxProfileId: text('tax_profile_id').references(() => taxCodes.id),
  capitalizationCandidate: integer('capitalization_candidate', { mode: 'boolean' })
    .notNull()
    .default(false),
  allowedTreatmentsJson: text('allowed_treatments_json').notNull().default('[]'),
  requiredDimensionsJson: text('required_dimensions_json').notNull().default('[]'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const accountingEvents = sqliteTable('accounting_events', {
  id: text('id').primaryKey(),
  eventNumber: text('event_number').notNull().unique(),
  eventType: text('event_type').notNull(),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  productAccountingProfileId: text('product_accounting_profile_id').references(
    () => productAccountingProfiles.id
  ),
  policyId: text('policy_id').references(() => accountingPolicies.id),
  policyCode: text('policy_code'),
  policyVersion: integer('policy_version'),
  accountingDate: text('accounting_date').notNull(),
  transactionDate: text('transaction_date').notNull(),
  documentDate: text('document_date'),
  serviceDate: text('service_date'),
  amountMinor: integer('amount_minor').notNull(),
  currencyId: text('currency_id').references(() => currencies.id),
  currencyCode: text('currency_code').notNull(),
  exchangeRateToIdrMicros: integer('exchange_rate_to_idr_micros').notNull().default(1000000),
  baseAmountIdr: integer('base_amount_idr').notNull(),
  postingStatus: text('posting_status').notNull().default('DRAFT'),
  journalEntryId: text('journal_entry_id'),
  stationId: text('station_id'),
  aircraftId: text('aircraft_id'),
  flightId: text('flight_id'),
  workOrderReference: text('work_order_reference'),
  costCenterId: text('cost_center_id'),
  payloadJson: text('payload_json').notNull().default('{}'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const accountingExceptions = sqliteTable('accounting_exceptions', {
  id: text('id').primaryKey(),
  accountingEventId: text('accounting_event_id').references(() => accountingEvents.id, {
    onDelete: 'cascade'
  }),
  eventType: text('event_type').notNull(),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  reasonCode: text('reason_code').notNull(),
  message: text('message').notNull(),
  contextSnapshotJson: text('context_snapshot_json').notNull().default('{}'),
  status: text('status').notNull().default('OPEN'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  journalNumber: text('journal_number').notNull().unique(),
  accountingEventId: text('accounting_event_id')
    .notNull()
    .unique()
    .references(() => accountingEvents.id),
  periodId: text('period_id')
    .notNull()
    .references(() => accountingPeriods.id),
  status: text('status').notNull().default('DRAFT'),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  transactionDate: text('transaction_date').notNull(),
  documentDate: text('document_date'),
  postingDate: text('posting_date'),
  serviceDate: text('service_date'),
  currencyCode: text('currency_code').notNull(),
  exchangeRateToIdrMicros: integer('exchange_rate_to_idr_micros').notNull().default(1000000),
  policyCode: text('policy_code').notNull(),
  policyVersion: integer('policy_version').notNull(),
  reversalOfJournalEntryId: text('reversal_of_journal_entry_id'),
  createdByUserId: text('created_by_user_id').notNull(),
  approvedByUserId: text('approved_by_user_id'),
  postedByUserId: text('posted_by_user_id'),
  postedAt: text('posted_at'),
  memo: text('memo').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const journalLines = sqliteTable('journal_lines', {
  id: text('id').primaryKey(),
  journalEntryId: text('journal_entry_id')
    .notNull()
    .references(() => journalEntries.id, { onDelete: 'cascade' }),
  lineNumber: integer('line_number').notNull(),
  accountId: text('account_id')
    .notNull()
    .references(() => chartOfAccounts.id),
  debitMinor: integer('debit_minor').notNull().default(0),
  creditMinor: integer('credit_minor').notNull().default(0),
  baseDebitIdr: integer('base_debit_idr').notNull().default(0),
  baseCreditIdr: integer('base_credit_idr').notNull().default(0),
  stationId: text('station_id'),
  aircraftId: text('aircraft_id'),
  flightId: text('flight_id'),
  workOrderReference: text('work_order_reference'),
  costCenterId: text('cost_center_id'),
  description: text('description').notNull()
});

export const assetRegister = sqliteTable(
  'asset_register',
  {
    id: text('id').primaryKey(),
    assetNumber: text('asset_number').notNull().unique(),
    sourceJournalEntryId: text('source_journal_entry_id')
      .notNull()
      .references(() => journalEntries.id),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    assetAccountId: text('asset_account_id')
      .notNull()
      .references(() => chartOfAccounts.id),
    assetName: text('asset_name').notNull(),
    aircraftId: text('aircraft_id'),
    inventoryPartId: text('inventory_part_id'),
    componentSerialId: text('component_serial_id'),
    serialNumber: text('serial_number'),
    acquisitionDate: text('acquisition_date').notNull(),
    readyForUseDate: text('ready_for_use_date'),
    costMinor: integer('cost_minor').notNull(),
    currencyCode: text('currency_code').notNull(),
    usefulLifeMonths: integer('useful_life_months').notNull().default(60),
    status: text('status').notNull().default('ACTIVE'),
    reversalJournalEntryId: text('reversal_journal_entry_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [uniqueIndex('asset_register_source_journal_unique').on(table.sourceJournalEntryId)]
);

export const depreciationSchedules = sqliteTable('depreciation_schedules', {
  id: text('id').primaryKey(),
  assetId: text('asset_id')
    .notNull()
    .references(() => assetRegister.id, { onDelete: 'cascade' }),
  periodId: text('period_id')
    .notNull()
    .references(() => accountingPeriods.id),
  depreciationAmountMinor: integer('depreciation_amount_minor').notNull(),
  status: text('status').notNull().default('SCHEDULED'),
  journalEntryId: text('journal_entry_id').references(() => journalEntries.id),
  createdAt: text('created_at').notNull()
});
