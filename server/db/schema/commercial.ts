import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { currencies, paymentTerms, taxCodes } from './finance';
import { aircraft, routes, stations } from './operations';

export const customers = sqliteTable(
  'customers',
  {
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
    lifecycleStatus: text('lifecycle_status').notNull().default('ACTIVE'),
    creditStatus: text('credit_status').notNull().default('NORMAL'),
    defaultCurrencyCode: text('default_currency_code').notNull().default('IDR'),
    primaryContactId: text('primary_contact_id'),
    commercialNote: text('commercial_note'),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_customers_account_type').on(table.accountType),
    index('idx_customers_lifecycle_status').on(table.lifecycleStatus),
    index('idx_customers_credit_status').on(table.creditStatus),
    index('idx_customers_payment_term').on(table.paymentTermId),
    index('idx_customers_primary_contact').on(table.primaryContactId)
  ]
);

export const customerContacts = sqliteTable(
  'customer_contacts',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    contactName: text('contact_name').notNull(),
    roleTitle: text('role_title'),
    email: text('email'),
    phone: text('phone'),
    contactType: text('contact_type').notNull().default('OTHER'),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_customer_contacts_customer').on(table.customerId),
    index('idx_customer_contacts_primary').on(table.customerId, table.isPrimary)
  ]
);

export const customerNotes = sqliteTable(
  'customer_notes',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    noteType: text('note_type').notNull().default('GENERAL'),
    visibility: text('visibility').notNull().default('INTERNAL'),
    note: text('note').notNull(),
    authorId: text('author_id'),
    authorName: text('author_name'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [index('idx_customer_notes_customer').on(table.customerId)]
);

export const customerCreditActions = sqliteTable(
  'customer_credit_actions',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    reason: text('reason').notNull(),
    actorId: text('actor_id'),
    actorName: text('actor_name'),
    occurredAt: text('occurred_at').notNull()
  },
  (table) => [index('idx_customer_credit_actions_customer').on(table.customerId)]
);

export const customerAuditLogs = sqliteTable(
  'customer_audit_logs',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    actorId: text('actor_id'),
    actorName: text('actor_name'),
    changedFields: text('changed_fields').notNull().default('[]'),
    metadata: text('metadata'),
    requestId: text('request_id'),
    occurredAt: text('occurred_at').notNull()
  },
  (table) => [index('idx_customer_audit_logs_customer').on(table.customerId)]
);

export const customerContracts = sqliteTable(
  'customer_contracts',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    contractNumber: text('contract_number').notNull(),
    contractType: text('contract_type').notNull(),
    effectiveFrom: text('effective_from'),
    effectiveUntil: text('effective_until'),
    status: text('status').notNull().default('DRAFT'),
    signedDate: text('signed_date'),
    documentId: text('document_id'),
    renewalStatus: text('renewal_status'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [index('idx_customer_contracts_customer').on(table.customerId)]
);

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  agentCode: text('agent_code').notNull().unique(),
  agentName: text('agent_name').notNull(),
  agentType: text('agent_type').notNull(),
  stationId: text('station_id').references(() => stations.id),
  customerAccountId: text('customer_account_id').references(() => customers.id),
  responsiblePersonnelId: text('responsible_personnel_id'),
  primaryContactId: text('primary_contact_id'),
  bookingChannelCode: text('booking_channel_code'),
  defaultCurrencyCode: text('default_currency_code').notNull().default('IDR'),
  operationalNote: text('operational_note'),
  commissionBasisPoints: integer('commission_basis_points'),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lifecycleStatus: text('lifecycle_status').notNull().default('ACTIVE'),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const agentContacts = sqliteTable(
  'agent_contacts',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    contactName: text('contact_name').notNull(),
    roleTitle: text('role_title'),
    department: text('department'),
    email: text('email'),
    phone: text('phone'),
    contactType: text('contact_type').notNull().default('OTHER'),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_agent_contacts_agent').on(table.agentId),
    index('idx_agent_contacts_primary').on(table.agentId, table.isPrimary)
  ]
);

export const agentCommissionRules = sqliteTable(
  'agent_commission_rules',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    commissionType: text('commission_type').notNull().default('PERCENTAGE'),
    percentageBasisPoints: integer('percentage_basis_points'),
    fixedAmountMinor: text('fixed_amount_minor'),
    currencyCode: text('currency_code'),
    basisType: text('basis_type').notNull().default('BASE_FARE'),
    serviceTypeId: text('service_type_id'),
    routeId: text('route_id'),
    rateAgreementId: text('rate_agreement_id'),
    effectiveFrom: text('effective_from').notNull(),
    effectiveUntil: text('effective_until'),
    lifecycleStatus: text('lifecycle_status').notNull().default('DRAFT'),
    priority: integer('priority').notNull().default(100),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_agent_commission_rules_agent').on(table.agentId),
    index('idx_agent_commission_rules_status').on(table.lifecycleStatus),
    index('idx_agent_commission_rules_effective').on(
      table.agentId,
      table.effectiveFrom,
      table.effectiveUntil
    )
  ]
);

export const agentNotes = sqliteTable(
  'agent_notes',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    noteType: text('note_type').notNull().default('GENERAL'),
    visibility: text('visibility').notNull().default('INTERNAL'),
    note: text('note').notNull(),
    authorId: text('author_id'),
    authorName: text('author_name'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [index('idx_agent_notes_agent').on(table.agentId)]
);

export const agentAuditLogs = sqliteTable(
  'agent_audit_logs',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    actorId: text('actor_id'),
    actorName: text('actor_name'),
    changedFields: text('changed_fields').notNull().default('[]'),
    metadata: text('metadata'),
    requestId: text('request_id'),
    occurredAt: text('occurred_at').notNull()
  },
  (table) => [index('idx_agent_audit_logs_agent').on(table.agentId)]
);

export const agentContracts = sqliteTable(
  'agent_contracts',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    contractNumber: text('contract_number').notNull(),
    contractType: text('contract_type').notNull(),
    effectiveFrom: text('effective_from'),
    effectiveUntil: text('effective_until'),
    status: text('status').notNull().default('DRAFT'),
    signedDate: text('signed_date'),
    documentId: text('document_id'),
    renewalStatus: text('renewal_status'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [index('idx_agent_contracts_agent').on(table.agentId)]
);

export const rateCards = sqliteTable('rate_cards', {
  id: text('id').primaryKey(),
  rateCode: text('rate_code').notNull().unique(),
  rateName: text('rate_name'),
  serviceType: text('service_type').notNull(),
  lifecycleStatus: text('lifecycle_status').notNull().default('ACTIVE'),
  originStationId: text('origin_station_id')
    .notNull()
    .references(() => stations.id),
  destinationStationId: text('destination_station_id')
    .notNull()
    .references(() => stations.id),
  routeId: text('route_id').references(() => routes.id),
  customerId: text('customer_id').references(() => customers.id),
  agentId: text('agent_id').references(() => agents.id),
  contractId: text('contract_id'),
  aircraftType: text('aircraft_type'),
  aircraftTypeId: text('aircraft_type_id').references(() => aircraft.id),
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
  publicNote: text('public_note'),
  internalPricingNote: text('internal_pricing_note'),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  rateFamilyId: text('rate_family_id'),
  supersedesRateId: text('supersedes_rate_id'),
  version: integer('version').notNull().default(1),
  createdBy: text('created_by'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const rateBookingChannels = sqliteTable(
  'rate_booking_channels',
  {
    id: text('id').primaryKey(),
    rateCardId: text('rate_card_id')
      .notNull()
      .references(() => rateCards.id, { onDelete: 'cascade' }),
    bookingChannelCode: text('booking_channel_code').notNull(),
    effectiveFrom: text('effective_from').notNull(),
    effectiveUntil: text('effective_until'),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_rate_booking_channels_rate').on(table.rateCardId),
    index('idx_rate_booking_channels_code').on(table.bookingChannelCode)
  ]
);

export const rateContractLinks = sqliteTable(
  'rate_contract_links',
  {
    id: text('id').primaryKey(),
    rateCardId: text('rate_card_id')
      .notNull()
      .references(() => rateCards.id, { onDelete: 'cascade' }),
    customerId: text('customer_id').references(() => customers.id),
    contractNumber: text('contract_number').notNull(),
    contractName: text('contract_name'),
    effectiveFrom: text('effective_from'),
    effectiveUntil: text('effective_until'),
    status: text('status').notNull().default('ACTIVE'),
    rateScope: text('rate_scope'),
    documentId: text('document_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_rate_contract_links_rate').on(table.rateCardId),
    index('idx_rate_contract_links_customer').on(table.customerId)
  ]
);

export const rateAuditLogs = sqliteTable(
  'rate_audit_logs',
  {
    id: text('id').primaryKey(),
    rateCardId: text('rate_card_id')
      .notNull()
      .references(() => rateCards.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    actorId: text('actor_id'),
    actorName: text('actor_name'),
    changedFields: text('changed_fields').notNull().default('[]'),
    metadata: text('metadata'),
    requestId: text('request_id'),
    occurredAt: text('occurred_at').notNull()
  },
  (table) => [index('idx_rate_audit_logs_rate').on(table.rateCardId)]
);

export const contractSubsidyPrograms = sqliteTable(
  'contract_subsidy_programs',
  {
    id: text('id').primaryKey(),
    programCode: text('program_code').notNull().unique(),
    programName: text('program_name').notNull(),
    sponsorName: text('sponsor_name').notNull(),
    serviceScope: text('service_scope').notNull(),
    routeScope: text('route_scope'),
    customerId: text('customer_id').references(() => customers.id),
    contractNumber: text('contract_number'),
    currencyCode: text('currency_code').notNull().default('IDR'),
    allocatedBudgetMinor: integer('allocated_budget_minor').notNull().default(0),
    effectiveFrom: text('effective_from').notNull(),
    effectiveUntil: text('effective_until'),
    lifecycleStatus: text('lifecycle_status').notNull().default('ACTIVE'),
    renewalStatus: text('renewal_status'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_contract_subsidy_programs_status').on(table.lifecycleStatus),
    index('idx_contract_subsidy_programs_customer').on(table.customerId),
    index('idx_contract_subsidy_programs_effective').on(table.effectiveFrom, table.effectiveUntil)
  ]
);

export const contractSubsidyConsumptions = sqliteTable(
  'contract_subsidy_consumptions',
  {
    id: text('id').primaryKey(),
    programId: text('program_id')
      .notNull()
      .references(() => contractSubsidyPrograms.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id'),
    description: text('description').notNull(),
    amountMinor: integer('amount_minor').notNull().default(0),
    currencyCode: text('currency_code').notNull().default('IDR'),
    status: text('status').notNull().default('RECOGNIZED'),
    consumedAt: text('consumed_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_contract_subsidy_consumptions_program').on(table.programId),
    index('idx_contract_subsidy_consumptions_source').on(table.sourceType, table.sourceId),
    index('idx_contract_subsidy_consumptions_consumed_at').on(table.consumedAt)
  ]
);

export const contractSubsidyAuditLogs = sqliteTable(
  'contract_subsidy_audit_logs',
  {
    id: text('id').primaryKey(),
    programId: text('program_id').references(() => contractSubsidyPrograms.id, {
      onDelete: 'cascade'
    }),
    action: text('action').notNull(),
    actorId: text('actor_id'),
    actorName: text('actor_name'),
    changedFields: text('changed_fields').notNull().default('[]'),
    metadata: text('metadata'),
    requestId: text('request_id'),
    occurredAt: text('occurred_at').notNull()
  },
  (table) => [index('idx_contract_subsidy_audit_logs_program').on(table.programId)]
);
