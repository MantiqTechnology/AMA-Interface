import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
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
