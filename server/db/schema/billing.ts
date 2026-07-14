import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { customers, rateCards } from './commercial';
import { taxCodes } from './finance';
import { flightOperations } from './flight-operations';

export const invoices = sqliteTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    flightOperationId: text('flight_operation_id')
      .notNull()
      .references(() => flightOperations.id),
    invoiceNumber: text('invoice_number').notNull().unique(),
    status: text('status').notNull().default('draft'),
    subtotal: real('subtotal').notNull(),
    tax: real('tax').notNull(),
    total: real('total').notNull(),
    currency: text('currency').notNull().default('IDR'),
    createdByUserId: text('created_by_user_id').notNull(),
    approvedByUserId: text('approved_by_user_id'),
    approvedAt: text('approved_at'),
    issuedAt: text('issued_at'),
    dueAt: text('due_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [uniqueIndex('invoices_flight_operation_unique').on(table.flightOperationId)]
);

export const invoiceLineItems = sqliteTable(
  'invoice_line_items',
  {
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    sourceType: text('source_type')
      .$type<'PASSENGER_TICKET' | 'CARGO_BOOKING' | 'CHARTER'>()
      .notNull(),
    sourceId: text('source_id').notNull(),
    description: text('description').notNull(),
    quantity: real('quantity').notNull(),
    unitPrice: integer('unit_price').notNull(),
    subtotal: integer('subtotal').notNull(),
    rateCardId: text('rate_card_id').references(() => rateCards.id),
    taxCodeId: text('tax_code_id').references(() => taxCodes.id),
    taxCode: text('tax_code'),
    taxRateBasisPoints: integer('tax_rate_basis_points').notNull().default(0),
    taxAmount: integer('tax_amount').notNull().default(0),
    total: integer('total').notNull()
  },
  (table) => [
    uniqueIndex('invoice_line_items_source_unique').on(
      table.invoiceId,
      table.sourceType,
      table.sourceId
    )
  ]
);

export const invoiceFinanceSnapshots = sqliteTable('invoice_finance_snapshots', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .unique()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  flightOperationId: text('flight_operation_id')
    .notNull()
    .unique()
    .references(() => flightOperations.id),
  ticketRevenue: integer('ticket_revenue').notNull().default(0),
  cargoRevenue: integer('cargo_revenue').notNull().default(0),
  charterRevenue: integer('charter_revenue').notNull().default(0),
  totalRevenue: integer('total_revenue').notNull(),
  fuelCost: integer('fuel_cost').notNull().default(0),
  stationCost: integer('station_cost').notNull().default(0),
  maintenanceCost: integer('maintenance_cost').notNull().default(0),
  totalOperationalCost: integer('total_operational_cost').notNull(),
  taxAmount: integer('tax_amount').notNull(),
  invoiceTotal: integer('invoice_total').notNull(),
  grossMargin: integer('gross_margin').notNull(),
  currencyCode: text('currency_code').notNull(),
  capturedAt: text('captured_at').notNull()
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('IDR'),
  paidAt: text('paid_at').notNull(),
  method: text('method').notNull(),
  reference: text('reference').notNull()
});

export type InvoiceRecord = typeof invoices.$inferSelect;
export type InvoiceLineItemRecord = typeof invoiceLineItems.$inferSelect;
export type InvoiceFinanceSnapshotRecord = typeof invoiceFinanceSnapshots.$inferSelect;
export type PaymentRecord = typeof payments.$inferSelect;
