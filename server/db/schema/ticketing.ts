import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { flightOperations } from './flight-operations';

export const ticketingSales = sqliteTable(
  'ticketing_sales',
  {
    id: text('id').primaryKey(),
    flightOperationId: text('flight_operation_id')
      .notNull()
      .references(() => flightOperations.id, { onDelete: 'cascade' }),
    serviceType: text('service_type').$type<'PASSENGER' | 'CARGO'>().notNull(),
    openedByUserId: text('opened_by_user_id').notNull(),
    openedAt: text('opened_at').notNull()
  },
  (table) => [uniqueIndex('ticketing_sales_flight_operation_unique').on(table.flightOperationId)]
);

export const passengerTickets = sqliteTable(
  'passenger_tickets',
  {
    id: text('id').primaryKey(),
    flightOperationId: text('flight_operation_id')
      .notNull()
      .references(() => flightOperations.id, { onDelete: 'cascade' }),
    passengerName: text('passenger_name').notNull(),
    documentType: text('document_type').notNull().default('KTP'),
    documentNumber: text('document_number').notNull(),
    seatNumber: text('seat_number').notNull(),
    passengerWeightKg: real('passenger_weight_kg').notNull(),
    baggageWeightKg: real('baggage_weight_kg').notNull().default(0),
    ticketPrice: integer('ticket_price').notNull(),
    ticketStatus: text('ticket_status').$type<'ACTIVE' | 'REFUNDED'>().notNull().default('ACTIVE'),
    paymentStatus: text('payment_status').$type<'UNPAID' | 'PAID'>().notNull().default('UNPAID'),
    paymentMethod: text('payment_method'),
    paidAt: text('paid_at'),
    checkInStatus: text('check_in_status')
      .$type<'PENDING' | 'CHECKED_IN'>()
      .notNull()
      .default('PENDING'),
    checkedInAt: text('checked_in_at'),
    loyaltyMemberId: text('loyalty_member_id'),
    agentId: text('agent_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('passenger_tickets_flight_seat_unique')
      .on(table.flightOperationId, table.seatNumber)
      .where(sql`${table.ticketStatus} = 'ACTIVE'`)
  ]
);

export const cargoBookings = sqliteTable('cargo_bookings', {
  id: text('id').primaryKey(),
  flightOperationId: text('flight_operation_id')
    .notNull()
    .references(() => flightOperations.id, { onDelete: 'cascade' }),
  senderName: text('sender_name').notNull(),
  receiverName: text('receiver_name').notNull(),
  description: text('description').notNull(),
  actualWeightKg: real('actual_weight_kg').notNull(),
  lengthCm: real('length_cm').notNull(),
  widthCm: real('width_cm').notNull(),
  heightCm: real('height_cm').notNull(),
  volumeWeightKg: real('volume_weight_kg').notNull(),
  chargeableWeightKg: real('chargeable_weight_kg').notNull(),
  isDangerous: integer('is_dangerous', { mode: 'boolean' }).notNull().default(false),
  dgCategoryId: text('dg_category_id'),
  dgAcceptanceStatus: text('dg_acceptance_status')
    .$type<'NOT_APPLICABLE' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>()
    .notNull()
    .default('NOT_APPLICABLE'),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').$type<'UNPAID' | 'PAID'>().notNull().default('UNPAID'),
  paidAt: text('paid_at'),
  agentId: text('agent_id'),
  tariffRate: integer('tariff_rate').notNull(),
  totalTariff: integer('total_tariff').notNull(),
  status: text('status').$type<'BOOKED' | 'DELIVERED'>().notNull().default('BOOKED'),
  deliveredTo: text('delivered_to'),
  deliveredAt: text('delivered_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const ticketingRefundRequests = sqliteTable(
  'ticketing_refund_requests',
  {
    id: text('id').primaryKey(),
    flightOperationId: text('flight_operation_id')
      .notNull()
      .references(() => flightOperations.id, { onDelete: 'cascade' }),
    subjectType: text('subject_type').$type<'PASSENGER' | 'CARGO'>().notNull(),
    passengerTicketId: text('passenger_ticket_id').references(() => passengerTickets.id, {
      onDelete: 'cascade'
    }),
    cargoBookingId: text('cargo_booking_id').references(() => cargoBookings.id, {
      onDelete: 'cascade'
    }),
    reason: text('reason').notNull(),
    status: text('status')
      .$type<'REQUESTED' | 'APPROVED' | 'REJECTED'>()
      .notNull()
      .default('REQUESTED'),
    amount: integer('amount').notNull(),
    currencyCode: text('currency_code').notNull(),
    requestedByUserId: text('requested_by_user_id').notNull(),
    requestedAt: text('requested_at').notNull(),
    decidedByUserId: text('decided_by_user_id'),
    decidedAt: text('decided_at'),
    decisionNote: text('decision_note'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_ticketing_refunds_status').on(table.status),
    index('idx_ticketing_refunds_flight_operation').on(table.flightOperationId),
    index('idx_ticketing_refunds_passenger').on(table.passengerTicketId),
    index('idx_ticketing_refunds_cargo').on(table.cargoBookingId)
  ]
);

export const passengerTicketReschedules = sqliteTable(
  'passenger_ticket_reschedules',
  {
    id: text('id').primaryKey(),
    passengerTicketId: text('passenger_ticket_id')
      .notNull()
      .references(() => passengerTickets.id, { onDelete: 'cascade' }),
    previousFlightOperationId: text('previous_flight_operation_id')
      .notNull()
      .references(() => flightOperations.id),
    newFlightOperationId: text('new_flight_operation_id')
      .notNull()
      .references(() => flightOperations.id),
    previousSeatNumber: text('previous_seat_number').notNull(),
    newSeatNumber: text('new_seat_number').notNull(),
    rescheduledByUserId: text('rescheduled_by_user_id').notNull(),
    rescheduledAt: text('rescheduled_at').notNull()
  },
  (table) => [
    index('idx_passenger_reschedules_ticket').on(table.passengerTicketId),
    index('idx_passenger_reschedules_time').on(table.rescheduledAt)
  ]
);

export type TicketingSaleRecord = typeof ticketingSales.$inferSelect;
export type PassengerTicketRecord = typeof passengerTickets.$inferSelect;
export type CargoBookingRecord = typeof cargoBookings.$inferSelect;
export type TicketingRefundRequestRecord = typeof ticketingRefundRequests.$inferSelect;
export type PassengerTicketRescheduleRecord = typeof passengerTicketReschedules.$inferSelect;
