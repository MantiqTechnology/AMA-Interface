import { z } from 'zod';
import { isoDateTimeSchema, paginationQuerySchema } from './common';

export const invoiceStatusSchema = z.enum([
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'overdue',
  'void'
]);

export const paymentDtoSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paidAt: isoDateTimeSchema,
  method: z.enum(['bank_transfer', 'cash', 'card']),
  reference: z.string()
});

export const invoiceSummaryDtoSchema = z.object({
  id: z.string(),
  flightOperationId: z.string(),
  invoiceNumber: z.string(),
  status: invoiceStatusSchema,
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative(),
  currency: z.string().length(3),
  issuedAt: isoDateTimeSchema,
  dueAt: isoDateTimeSchema,
  customer: z.object({
    id: z.string(),
    name: z.string(),
    contactEmail: z.string().nullable()
  }),
  flight: z.object({
    id: z.string(),
    flightNumber: z.string(),
    orderNumber: z.string(),
    currentStatus: z.string(),
    originCode: z.string(),
    destinationCode: z.string(),
    scheduledDepartureAt: z.string().nullable(),
    scheduledArrivalAt: z.string().nullable()
  })
});

export const invoiceDetailDtoSchema = invoiceSummaryDtoSchema.extend({
  payments: z.array(paymentDtoSchema),
  balanceDue: z.number().nonnegative()
});

export const listInvoicesQuerySchema = paginationQuerySchema.extend({
  status: invoiceStatusSchema.optional()
});

export const recordPaymentBodySchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default('IDR'),
  paidAt: isoDateTimeSchema,
  method: z.enum(['bank_transfer', 'cash', 'card']).default('bank_transfer'),
  reference: z.string().min(2)
});

export type InvoiceSummaryDto = z.infer<typeof invoiceSummaryDtoSchema>;
export type InvoiceDetailDto = z.infer<typeof invoiceDetailDtoSchema>;
export type PaymentDto = z.infer<typeof paymentDtoSchema>;
export type RecordPaymentBody = z.infer<typeof recordPaymentBodySchema>;
