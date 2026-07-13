import { z } from 'zod';
import type { TicketRefundSummaryDto } from './refunds';

export const passengerTicketIdParamsSchema = z.object({ id: z.string().trim().min(1) });

const emptyQueryValue = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const passengerTicketListQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  flightOrderId: z.preprocess(emptyQueryValue, z.string().trim().min(1).optional()),
  paymentStatus: z.preprocess(emptyQueryValue, z.enum(['UNPAID', 'PAID']).optional()),
  checkInStatus: z.preprocess(emptyQueryValue, z.enum(['PENDING', 'CHECKED_IN']).optional())
});

export const createPassengerTicketSchema = z.object({
  flightOrderId: z.string().trim().min(1),
  passengerName: z.string().trim().min(2).max(120),
  documentType: z.enum(['KTP', 'PASSPORT', 'OTHER']).default('KTP'),
  documentNumber: z.string().trim().min(3).max(80),
  seatNumber: z
    .string()
    .trim()
    .regex(/^\d+[A-C]$/u, 'Seat number must use a format such as 1A.'),
  passengerWeightKg: z.coerce.number().positive().max(250),
  baggageWeightKg: z.coerce.number().nonnegative().max(100).default(0),
  loyaltyMemberId: z.string().trim().max(80).optional().nullable(),
  agentId: z.string().trim().min(1).optional().nullable()
});

export const payPassengerTicketSchema = z.object({
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'CARD', 'QRIS'])
});

export const reschedulePassengerTicketSchema = z.object({
  flightOrderId: z.string().trim().min(1),
  seatNumber: z
    .string()
    .trim()
    .regex(/^\d+[A-C]$/u, 'Seat number must use a format such as 1A.')
});

export type PassengerTicketListQuery = z.infer<typeof passengerTicketListQuerySchema>;
export type CreatePassengerTicketInput = z.infer<typeof createPassengerTicketSchema>;
export type PayPassengerTicketInput = z.infer<typeof payPassengerTicketSchema>;
export type ReschedulePassengerTicketInput = z.infer<typeof reschedulePassengerTicketSchema>;

export type PassengerRescheduleOptionDto = {
  flightOrderId: string;
  flightNumber: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  originCode: string;
  destinationCode: string;
  aircraftRegistration: string;
  availableSeats: string[];
};

export type PassengerTicketDto = {
  id: string;
  flightOrderId: string;
  flightNumber: string;
  originCode: string;
  destinationCode: string;
  scheduledDeparture: string;
  passengerName: string;
  documentType: string;
  documentNumber: string;
  seatNumber: string;
  passengerWeightKg: number;
  baggageWeightKg: number;
  ticketPrice: number;
  currencyCode: string;
  ticketStatus: 'ACTIVE' | 'REFUNDED';
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: string | null;
  paidAt: string | null;
  checkInStatus: 'PENDING' | 'CHECKED_IN';
  checkedInAt: string | null;
  loyaltyMemberId: string | null;
  agentId: string | null;
  agentName: string | null;
  refundRequest: TicketRefundSummaryDto | null;
  createdAt: string;
  updatedAt: string;
};
