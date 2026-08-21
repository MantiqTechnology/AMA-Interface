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

export const approvalAuthorityRules = sqliteTable('approval_authority_rules', {
  id: text('id').primaryKey(),
  transactionType: text('transaction_type').notNull(),
  amountFromBaseIdr: integer('amount_from_base_idr').notNull(),
  amountToBaseIdr: integer('amount_to_base_idr'),
  requiredRole: text('required_role').notNull(),
  requiredApprovalLevel: integer('required_approval_level').notNull(),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const approvalDecisions = sqliteTable('approval_decisions', {
  id: text('id').primaryKey(),
  transactionType: text('transaction_type').notNull(),
  transactionId: text('transaction_id').notNull(),
  ruleId: text('rule_id')
    .notNull()
    .references(() => approvalAuthorityRules.id),
  amountMinor: integer('amount_minor').notNull(),
  currencyCode: text('currency_code').notNull(),
  exchangeRateToIdrMicros: integer('exchange_rate_to_idr_micros').notNull(),
  baseAmountIdr: integer('base_amount_idr').notNull(),
  decision: text('decision').notNull(),
  actorUserId: text('actor_user_id').notNull(),
  actorRole: text('actor_role').notNull(),
  decidedAt: text('decided_at').notNull(),
  reason: text('reason')
});

export const accountingPolicies = sqliteTable('accounting_policies', {
  id: text('id').primaryKey(),
  policyCode: text('policy_code').notNull().unique(),
  policyName: text('policy_name').notNull(),
  sourceModule: text('source_module'),
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

export const financialDimensionValues = sqliteTable(
  'financial_dimension_values',
  {
    id: text('id').primaryKey(),
    ownerType: text('owner_type').notNull(),
    ownerId: text('owner_id').notNull(),
    dimensionType: text('dimension_type').notNull(),
    dimensionValue: text('dimension_value').notNull(),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    uniqueIndex('financial_dimension_owner_type_unique').on(
      table.ownerType,
      table.ownerId,
      table.dimensionType
    )
  ]
);

export const financeHandoffs = sqliteTable(
  'finance_handoffs',
  {
    id: text('id').primaryKey(),
    sourceModule: text('source_module').notNull(),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    sourceEventId: text('source_event_id').notNull(),
    transactionDate: text('transaction_date').notNull(),
    currencyCode: text('currency_code').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    stationId: text('station_id'),
    flightId: text('flight_id'),
    aircraftId: text('aircraft_id'),
    routeId: text('route_id'),
    costCenterId: text('cost_center_id'),
    payloadJson: text('payload_json').notNull().default('{}'),
    status: text('status').notNull().default('RECEIVED'),
    receivedAt: text('received_at').notNull(),
    validatedAt: text('validated_at'),
    acceptedAt: text('accepted_at'),
    rejectedAt: text('rejected_at'),
    accountingEventId: text('accounting_event_id').references(() => accountingEvents.id),
    journalId: text('journal_id').references(() => journalEntries.id),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('finance_handoff_source_event_unique').on(
      table.sourceModule,
      table.sourceType,
      table.sourceEventId
    )
  ]
);

export const financeHandoffStatusHistory = sqliteTable('finance_handoff_status_history', {
  id: text('id').primaryKey(),
  handoffId: text('handoff_id')
    .notNull()
    .references(() => financeHandoffs.id, { onDelete: 'cascade' }),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  actorId: text('actor_id').notNull(),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull()
});

export const cashBankAccounts = sqliteTable('cash_bank_accounts', {
  id: text('id').primaryKey(),
  accountCode: text('account_code').notNull().unique(),
  accountName: text('account_name').notNull(),
  accountType: text('account_type').notNull(),
  currencyCode: text('currency_code').notNull(),
  glAccountId: text('gl_account_id')
    .notNull()
    .references(() => chartOfAccounts.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const customerReceipts = sqliteTable('customer_receipts', {
  id: text('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(),
  customerId: text('customer_id').notNull(),
  receiptDate: text('receipt_date').notNull(),
  currencyCode: text('currency_code').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  paymentMethod: text('payment_method').notNull(),
  cashBankAccountId: text('cash_bank_account_id')
    .notNull()
    .references(() => cashBankAccounts.id),
  reference: text('reference').notNull().unique(),
  evidenceDocumentId: text('evidence_document_id'),
  status: text('status').notNull().default('UNALLOCATED'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const arAllocations = sqliteTable(
  'ar_allocations',
  {
    id: text('id').primaryKey(),
    receiptId: text('receipt_id')
      .notNull()
      .references(() => customerReceipts.id),
    invoiceId: text('invoice_id').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    status: text('status').notNull().default('PROCESSING'),
    accountingEventId: text('accounting_event_id').references(() => accountingEvents.id),
    journalId: text('journal_id').references(() => journalEntries.id),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('ar_allocation_receipt_invoice_unique').on(table.receiptId, table.invoiceId)
  ]
);

export const supplierInvoices = sqliteTable('supplier_invoices', {
  id: text('id').primaryKey(),
  supplierId: text('supplier_id')
    .notNull()
    .references(() => vendors.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  invoiceDate: text('invoice_date').notNull(),
  dueDate: text('due_date').notNull(),
  currencyCode: text('currency_code').notNull(),
  subtotalMinor: integer('subtotal_minor').notNull(),
  taxMinor: integer('tax_minor').notNull().default(0),
  totalMinor: integer('total_minor').notNull(),
  sourceType: text('source_type').notNull(),
  purchaseOrderId: text('purchase_order_id'),
  goodsReceiptId: text('goods_receipt_id'),
  expenseAccountId: text('expense_account_id').references(() => chartOfAccounts.id),
  matchStatus: text('match_status').notNull(),
  matchDetailsJson: text('match_details_json').notNull().default('{}'),
  lifecycleStatus: text('lifecycle_status').notNull().default('DRAFT'),
  accountingEventId: text('accounting_event_id').references(() => accountingEvents.id),
  journalId: text('journal_id').references(() => journalEntries.id),
  evidenceDocumentId: text('evidence_document_id'),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const supplierPaymentRequests = sqliteTable('supplier_payment_requests', {
  id: text('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(),
  supplierInvoiceId: text('supplier_invoice_id')
    .notNull()
    .references(() => supplierInvoices.id),
  amountMinor: integer('amount_minor').notNull(),
  currencyCode: text('currency_code').notNull(),
  cashBankAccountId: text('cash_bank_account_id')
    .notNull()
    .references(() => cashBankAccounts.id),
  status: text('status').notNull().default('DRAFT'),
  createdBy: text('created_by').notNull(),
  submittedBy: text('submitted_by'),
  approvedBy: text('approved_by'),
  approvedAt: text('approved_at'),
  executedBy: text('executed_by'),
  executedAt: text('executed_at'),
  accountingEventId: text('accounting_event_id').references(() => accountingEvents.id),
  journalId: text('journal_id').references(() => journalEntries.id),
  reversalJournalId: text('reversal_journal_id').references(() => journalEntries.id),
  reversedAt: text('reversed_at'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const bankStatements = sqliteTable('bank_statements', {
  id: text('id').primaryKey(),
  cashBankAccountId: text('cash_bank_account_id')
    .notNull()
    .references(() => cashBankAccounts.id),
  statementNumber: text('statement_number').notNull().unique(),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  openingBalanceMinor: integer('opening_balance_minor').notNull(),
  closingBalanceMinor: integer('closing_balance_minor').notNull(),
  status: text('status').notNull().default('IMPORTED'),
  importedBy: text('imported_by').notNull(),
  importedAt: text('imported_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const bankStatementLines = sqliteTable('bank_statement_lines', {
  id: text('id').primaryKey(),
  statementId: text('statement_id')
    .notNull()
    .references(() => bankStatements.id, { onDelete: 'cascade' }),
  lineNumber: integer('line_number').notNull(),
  bookingDate: text('booking_date').notNull(),
  valueDate: text('value_date'),
  reference: text('reference'),
  description: text('description').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  balanceMinor: integer('balance_minor'),
  status: text('status').notNull().default('UNMATCHED'),
  createdAt: text('created_at').notNull()
});

export const bankReconciliationMatches = sqliteTable(
  'bank_reconciliation_matches',
  {
    id: text('id').primaryKey(),
    statementLineId: text('statement_line_id')
      .notNull()
      .references(() => bankStatementLines.id),
    journalLineId: text('journal_line_id')
      .notNull()
      .references(() => journalLines.id),
    matchedAmountMinor: integer('matched_amount_minor').notNull(),
    matchMethod: text('match_method').notNull(),
    status: text('status').notNull().default('RECONCILED'),
    matchedBy: text('matched_by').notNull(),
    matchedAt: text('matched_at').notNull()
  },
  (table) => [
    uniqueIndex('bank_reconciliation_statement_line_unique').on(table.statementLineId),
    uniqueIndex('bank_reconciliation_journal_line_unique').on(table.journalLineId)
  ]
);

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

export const financeAdjustments = sqliteTable('finance_adjustments', {
  id: text('id').primaryKey(),
  adjustmentNumber: text('adjustment_number').notNull().unique(),
  adjustmentType: text('adjustment_type').notNull(),
  accountingDate: text('accounting_date').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currencyCode: text('currency_code').notNull(),
  description: text('description').notNull(),
  evidenceReference: text('evidence_reference'),
  cashBankAccountId: text('cash_bank_account_id').references(() => cashBankAccounts.id),
  stationId: text('station_id'),
  flightId: text('flight_id'),
  aircraftId: text('aircraft_id'),
  costCenterId: text('cost_center_id'),
  status: text('status').notNull().default('DRAFT'),
  accountingEventId: text('accounting_event_id').references(() => accountingEvents.id),
  journalId: text('journal_id').references(() => journalEntries.id),
  reversalJournalId: text('reversal_journal_id').references(() => journalEntries.id),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const prepaymentSchedules = sqliteTable('prepayment_schedules', {
  id: text('id').primaryKey(),
  adjustmentId: text('adjustment_id')
    .notNull()
    .references(() => financeAdjustments.id, { onDelete: 'cascade' }),
  periodId: text('period_id')
    .notNull()
    .references(() => accountingPeriods.id),
  recognitionDate: text('recognition_date').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  status: text('status').notNull().default('SCHEDULED'),
  accountingEventId: text('accounting_event_id').references(() => accountingEvents.id),
  journalId: text('journal_id').references(() => journalEntries.id),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  recognizedBy: text('recognized_by'),
  recognizedAt: text('recognized_at'),
  createdAt: text('created_at').notNull()
});

export const depreciationRuns = sqliteTable('depreciation_runs', {
  id: text('id').primaryKey(),
  periodId: text('period_id')
    .notNull()
    .references(() => accountingPeriods.id),
  status: text('status').notNull().default('PROCESSING'),
  postedCount: integer('posted_count').notNull().default(0),
  skippedCount: integer('skipped_count').notNull().default(0),
  exceptionCount: integer('exception_count').notNull().default(0),
  runBy: text('run_by').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at')
});

export const periodClosingRuns = sqliteTable('period_closing_runs', {
  id: text('id').primaryKey(),
  periodId: text('period_id')
    .notNull()
    .references(() => accountingPeriods.id),
  status: text('status').notNull().default('IN_PROGRESS'),
  startedBy: text('started_by').notNull(),
  startedAt: text('started_at').notNull(),
  closedBy: text('closed_by'),
  closedAt: text('closed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const periodClosingChecklistItems = sqliteTable('period_closing_checklist_items', {
  id: text('id').primaryKey(),
  closingRunId: text('closing_run_id')
    .notNull()
    .references(() => periodClosingRuns.id, { onDelete: 'cascade' }),
  itemCode: text('item_code').notNull(),
  itemLabel: text('item_label').notNull(),
  status: text('status').notNull().default('PENDING'),
  blocker: text('blocker'),
  sourceReference: text('source_reference'),
  note: text('note'),
  checkedBy: text('checked_by'),
  checkedAt: text('checked_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const periodReopenRequests = sqliteTable('period_reopen_requests', {
  id: text('id').primaryKey(),
  periodId: text('period_id')
    .notNull()
    .references(() => accountingPeriods.id),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('REQUESTED'),
  requesterId: text('requester_id').notNull(),
  requestedAt: text('requested_at').notNull(),
  approverId: text('approver_id'),
  approvedAt: text('approved_at'),
  reopenedAt: text('reopened_at')
});

export const financialAuditLogs = sqliteTable('financial_audit_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').notNull(),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  reason: text('reason'),
  sourceReference: text('source_reference'),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  occurredAt: text('occurred_at').notNull()
});

export const financialExports = sqliteTable('financial_exports', {
  id: text('id').primaryKey(),
  reportType: text('report_type').notNull(),
  format: text('format').notNull(),
  periodCode: text('period_code'),
  requestedBy: text('requested_by').notNull(),
  requestedRole: text('requested_role').notNull(),
  rowCount: integer('row_count').notNull(),
  filename: text('filename').notNull(),
  contentHash: text('content_hash').notNull(),
  createdAt: text('created_at').notNull()
});
