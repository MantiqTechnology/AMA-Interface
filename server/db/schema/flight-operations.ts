import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { customers } from './commercial';
import { aircraft, crews, routes, stations } from './operations';

export const flightOperations = sqliteTable('flight_operations', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  flightRequestId: text('flight_request_id'),
  flightNumber: text('flight_number').notNull().unique(),
  flightDate: text('flight_date').notNull(),
  flightTypeId: text('flight_type_id').notNull(),
  serviceTypeId: text('service_type_id').notNull(),
  requestSource: text('request_source').notNull().default('Corporate Charter Request'),
  priorityId: text('priority_id').notNull(),
  routeId: text('route_id')
    .notNull()
    .references(() => routes.id),
  originStationId: text('origin_station_id')
    .notNull()
    .references(() => stations.id),
  destinationStationId: text('destination_station_id')
    .notNull()
    .references(() => stations.id),
  customerId: text('customer_id').references(() => customers.id),
  aircraftId: text('aircraft_id').references(() => aircraft.id),
  pilotInCommandId: text('pilot_in_command_id').references(() => crews.id),
  coPilotId: text('co_pilot_id').references(() => crews.id),
  scheduledDepartureAt: text('scheduled_departure_at'),
  scheduledArrivalAt: text('scheduled_arrival_at'),
  actualDepartureAt: text('actual_departure_at'),
  actualArrivalAt: text('actual_arrival_at'),
  currentStatusId: text('current_status_id').notNull(),
  createdByUserId: text('created_by_user_id'),
  approvedByUserId: text('approved_by_user_id'),
  remarks: text('remarks'),
  billingType: text('billing_type').notNull().default('CHARTER'),
  estimatedRevenue: integer('estimated_revenue'),
  currencyCode: text('currency_code').notNull().default('IDR'),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  blockingReason: text('blocking_reason'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type FlightOperationRecord = typeof flightOperations.$inferSelect;
