import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { currencies, paymentTerms, taxCodes } from './finance';
import { stations } from './operations';

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  accountCode: text('account_code').notNull().unique(),
  accountName: text('account_name').notNull(),
  accountType: text('account_type').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  billingAddress: text('billing_address'),
  paymentTermId: text('payment_term_id').references(() => paymentTerms.id),
  creditLimit: integer('credit_limit'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  agentCode: text('agent_code').notNull().unique(),
  agentName: text('agent_name').notNull(),
  agentType: text('agent_type').notNull(),
  stationId: text('station_id').references(() => stations.id),
  commissionBasisPoints: integer('commission_basis_points'),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const rateCards = sqliteTable('rate_cards', {
  id: text('id').primaryKey(),
  rateCode: text('rate_code').notNull().unique(),
  serviceType: text('service_type').notNull(),
  originStationId: text('origin_station_id')
    .notNull()
    .references(() => stations.id),
  destinationStationId: text('destination_station_id')
    .notNull()
    .references(() => stations.id),
  customerId: text('customer_id').references(() => customers.id),
  aircraftType: text('aircraft_type'),
  currencyId: text('currency_id')
    .notNull()
    .references(() => currencies.id),
  taxCodeId: text('tax_code_id').references(() => taxCodes.id),
  baseRate: integer('base_rate').notNull(),
  rateUnit: text('rate_unit').notNull(),
  pricingScope: text('pricing_scope').notNull().default('PUBLIC_COUNTER'),
  bookingChannel: text('booking_channel').notNull().default('COUNTER'),
  passengerType: text('passenger_type'),
  cargoPriceBasis: text('cargo_price_basis'),
  ratePriority: integer('rate_priority').notNull().default(100),
  minimumCharge: integer('minimum_charge'),
  demoUsageNote: text('demo_usage_note'),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});
