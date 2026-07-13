import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { ApprovalStatus } from '../../shared/contracts/approvals';
import type { FlightStatus } from '../../shared/contracts/flights';

import {
  aircraft,
  crews,
  flightCapacityProfiles,
  flightReasons,
  flightScheduleTemplates,
  routes,
  stations
} from './schema/operations';
import { agents, customers, rateCards } from './schema/commercial';
import {
  chartOfAccounts,
  costCategories,
  currencies,
  fuelSuppliers,
  paymentTerms,
  stationServiceSuppliers,
  taxCodes,
  vendors
} from './schema/finance';
import { dgCategories } from './schema/cargo';
import { cargoBookings, passengerTickets, ticketingSales } from './schema/ticketing';
export * from './schema/operations';
export * from './schema/commercial';
export * from './schema/finance';
export * from './schema/cargo';
export * from './schema/ticketing';
export const flightOrders = sqliteTable('flight_orders', {
  id: text('id').primaryKey(),
  flightNumber: text('flight_number').notNull().unique(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id),
  routeId: text('route_id')
    .notNull()
    .references(() => routes.id),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  status: text('status').$type<FlightStatus>().notNull().default('draft'),
  scheduledDeparture: text('scheduled_departure').notNull(),
  scheduledArrival: text('scheduled_arrival').notNull(),
  purpose: text('purpose').notNull(),
  quotedAmount: real('quoted_amount').notNull(),
  currency: text('currency').notNull().default('IDR')
});

export const manifests = sqliteTable('manifests', {
  id: text('id').primaryKey(),
  flightOrderId: text('flight_order_id')
    .notNull()
    .references(() => flightOrders.id, { onDelete: 'cascade' }),
  passengerName: text('passenger_name').notNull(),
  documentNumber: text('document_number').notNull(),
  seatNumber: text('seat_number').notNull(),
  weightKg: real('weight_kg').notNull(),
  remarks: text('remarks')
});

export const fuelRequests = sqliteTable('fuel_requests', {
  id: text('id').primaryKey(),
  flightOrderId: text('flight_order_id')
    .notNull()
    .references(() => flightOrders.id),
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  requestedLiters: real('requested_liters').notNull(),
  status: text('status').notNull().default('requested'),
  requestedBy: text('requested_by').notNull(),
  requiredAt: text('required_at').notNull(),
  notes: text('notes')
});

export const fuelUplifts = sqliteTable('fuel_uplifts', {
  id: text('id').primaryKey(),
  fuelRequestId: text('fuel_request_id')
    .notNull()
    .references(() => fuelRequests.id, { onDelete: 'cascade' }),
  supplier: text('supplier').notNull(),
  liters: real('liters').notNull(),
  unitPrice: real('unit_price').notNull(),
  total: real('total').notNull(),
  currency: text('currency').notNull().default('IDR'),
  upliftedAt: text('uplifted_at').notNull(),
  receiptPath: text('receipt_path')
});

export const stationExpenses = sqliteTable('station_expenses', {
  id: text('id').primaryKey(),
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  flightOrderId: text('flight_order_id').references(() => flightOrders.id),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('IDR'),
  status: text('status').notNull().default('draft'),
  receiptPath: text('receipt_path'),
  incurredAt: text('incurred_at').notNull(),
  submittedBy: text('submitted_by').notNull()
});

export const maintenanceWorkOrders = sqliteTable('maintenance_work_orders', {
  id: text('id').primaryKey(),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull().default('normal'),
  status: text('status').notNull().default('open'),
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
  dueAt: text('due_at').notNull()
});

export const serializedParts = sqliteTable('serialized_parts', {
  id: text('id').primaryKey(),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  partNumber: text('part_number').notNull(),
  serialNumber: text('serial_number').notNull().unique(),
  description: text('description').notNull(),
  status: text('status').notNull().default('available'),
  installedAt: text('installed_at'),
  workOrderId: text('work_order_id').references(() => maintenanceWorkOrders.id)
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id),
  flightOrderId: text('flight_order_id')
    .notNull()
    .references(() => flightOrders.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  status: text('status').notNull().default('draft'),
  subtotal: real('subtotal').notNull(),
  tax: real('tax').notNull(),
  total: real('total').notNull(),
  currency: text('currency').notNull().default('IDR'),
  issuedAt: text('issued_at').notNull(),
  dueAt: text('due_at').notNull()
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

export const approvals = sqliteTable('approvals', {
  id: text('id').primaryKey(),
  domainEntity: text('domain_entity').notNull(),
  entityId: text('entity_id').notNull(),
  requestedBy: text('requested_by').notNull(),
  roleRequired: text('role_required').notNull(),
  status: text('status').$type<ApprovalStatus>().notNull().default('pending'),
  decidedBy: text('decided_by'),
  decidedAt: text('decided_at'),
  reason: text('reason'),
  createdAt: text('created_at').notNull()
});

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  severity: text('severity').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull()
});

export type AircraftRecord = typeof aircraft.$inferSelect;
export type StationRecord = typeof stations.$inferSelect;
export type RouteRecord = typeof routes.$inferSelect;
export type CustomerRecord = typeof customers.$inferSelect;
export type FlightOrderRecord = typeof flightOrders.$inferSelect;
export type ManifestRecord = typeof manifests.$inferSelect;
export type FuelRequestRecord = typeof fuelRequests.$inferSelect;
export type FuelUpliftRecord = typeof fuelUplifts.$inferSelect;
export type StationExpenseRecord = typeof stationExpenses.$inferSelect;
export type MaintenanceWorkOrderRecord = typeof maintenanceWorkOrders.$inferSelect;
export type SerializedPartRecord = typeof serializedParts.$inferSelect;
export type InvoiceRecord = typeof invoices.$inferSelect;
export type PaymentRecord = typeof payments.$inferSelect;
export type ApprovalRecord = typeof approvals.$inferSelect;
export type AlertRecord = typeof alerts.$inferSelect;
export type FlightScheduleTemplateRecord = typeof flightScheduleTemplates.$inferSelect;
export type FlightCapacityProfileRecord = typeof flightCapacityProfiles.$inferSelect;
export type CrewRecord = typeof crews.$inferSelect;
export type FlightReasonRecord = typeof flightReasons.$inferSelect;
export type AgentRecord = typeof agents.$inferSelect;
export type RateCardRecord = typeof rateCards.$inferSelect;
export type VendorRecord = typeof vendors.$inferSelect;
export type FuelSupplierRecord = typeof fuelSuppliers.$inferSelect;
export type StationServiceSupplierRecord = typeof stationServiceSuppliers.$inferSelect;
export type CostCategoryRecord = typeof costCategories.$inferSelect;
export type ChartOfAccountRecord = typeof chartOfAccounts.$inferSelect;
export type TaxCodeRecord = typeof taxCodes.$inferSelect;
export type PaymentTermRecord = typeof paymentTerms.$inferSelect;
export type CurrencyRecord = typeof currencies.$inferSelect;
export type DgCategoryRecord = typeof dgCategories.$inferSelect;
export type TicketingSaleRecord = typeof ticketingSales.$inferSelect;
export type PassengerTicketRecord = typeof passengerTickets.$inferSelect;
export type CargoBookingRecord = typeof cargoBookings.$inferSelect;
