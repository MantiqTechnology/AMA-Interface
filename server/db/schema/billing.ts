import { real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { customers } from './commercial';
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
    issuedAt: text('issued_at').notNull(),
    dueAt: text('due_at').notNull()
  },
  (table) => [uniqueIndex('invoices_flight_operation_unique').on(table.flightOperationId)]
);

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
export type PaymentRecord = typeof payments.$inferSelect;
