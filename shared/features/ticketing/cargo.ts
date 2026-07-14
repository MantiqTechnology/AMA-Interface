import { z } from 'zod';
import type { TicketRefundSummaryDto } from './refunds';

export const cargoBookingIdParamsSchema = z.object({ id: z.string().trim().min(1) });

const emptyQueryValue = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const cargoBookingListQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  flightOperationId: z.preprocess(emptyQueryValue, z.string().trim().min(1).optional()),
  paymentStatus: z.preprocess(emptyQueryValue, z.enum(['UNPAID', 'PAID']).optional()),
  status: z.preprocess(emptyQueryValue, z.enum(['BOOKED', 'DELIVERED']).optional())
});

export const createCargoBookingSchema = z
  .object({
    flightOperationId: z.string().trim().min(1),
    senderName: z.string().trim().min(2).max(120),
    receiverName: z.string().trim().min(2).max(120),
    description: z.string().trim().min(3).max(200),
    actualWeightKg: z.coerce.number().positive().max(5000),
    lengthCm: z.coerce.number().positive().max(1000),
    widthCm: z.coerce.number().positive().max(1000),
    heightCm: z.coerce.number().positive().max(1000),
    isDangerous: z.boolean().default(false),
    dgCategoryId: z.string().trim().min(1).optional().nullable(),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CARD', 'QRIS']),
    agentId: z.string().trim().min(1).optional().nullable()
  })
  .superRefine((value, context) => {
    if (value.isDangerous && !value.dgCategoryId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dgCategoryId'],
        message: 'DG category is required for dangerous cargo.'
      });
    }
  });

export const payCargoBookingSchema = z.object({
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'CARD', 'QRIS'])
});

export const deliverCargoBookingSchema = z.object({
  deliveredTo: z.string().trim().min(2).max(120)
});

export type CargoBookingListQuery = z.infer<typeof cargoBookingListQuerySchema>;
export type CreateCargoBookingInput = z.infer<typeof createCargoBookingSchema>;
export type PayCargoBookingInput = z.infer<typeof payCargoBookingSchema>;
export type DeliverCargoBookingInput = z.infer<typeof deliverCargoBookingSchema>;

export type CargoBookingDto = {
  id: string;
  flightOperationId: string;
  flightNumber: string;
  originCode: string;
  destinationCode: string;
  scheduledDeparture: string;
  senderName: string;
  receiverName: string;
  description: string;
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeWeightKg: number;
  chargeableWeightKg: number;
  isDangerous: boolean;
  dgCategoryId: string | null;
  dgCategoryCode: string | null;
  dgAcceptanceStatus: 'NOT_APPLICABLE' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
  paymentMethod: string;
  paymentStatus: 'UNPAID' | 'PAID';
  paidAt: string | null;
  agentId: string | null;
  agentName: string | null;
  tariffRate: number;
  totalTariff: number;
  currencyCode: string;
  status: 'BOOKED' | 'DELIVERED';
  deliveredTo: string | null;
  deliveredAt: string | null;
  refundRequest: TicketRefundSummaryDto | null;
  createdAt: string;
  updatedAt: string;
};
