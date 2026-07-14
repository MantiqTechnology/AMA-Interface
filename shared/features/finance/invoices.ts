import { z } from 'zod';
import { isoDateTimeSchema } from '../../contracts/common';

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const invoiceStatusSchema = z.enum([
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'overdue',
  'void'
]);

export const invoiceListQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, invoiceStatusSchema.optional()),
  customerId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  flightId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  due: z.preprocess(emptyToUndefined, z.enum(['all', 'upcoming', 'overdue']).default('all')),
  search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  limit: z.coerce.number().int().positive().max(100).default(25),
  offset: z.coerce.number().int().nonnegative().default(0)
});

export const invoiceIdParamsSchema = z.object({ id: z.string().trim().min(1) });
export const approveInvoiceBodySchema = z.object({}).strict();
export const processFinanceHandoffBodySchema = z.object({
  flightId: z.string().trim().min(1)
});

export const recordPaymentBodySchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default('IDR'),
  paidAt: isoDateTimeSchema,
  method: z.enum(['bank_transfer', 'cash', 'card']).default('bank_transfer'),
  reference: z.string().min(2)
});

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
export type RecordPaymentBody = z.infer<typeof recordPaymentBodySchema>;

export type PaymentDto = {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  paidAt: string;
  method: 'bank_transfer' | 'cash' | 'card';
  reference: string;
};

export type InvoiceLineItemDto = {
  id: string;
  sourceType: 'PASSENGER_TICKET' | 'CARGO_BOOKING' | 'CHARTER';
  sourceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  rateCardId: string | null;
  taxCodeId: string | null;
  taxCode: string | null;
  taxRateBasisPoints: number;
  taxAmount: number;
  total: number;
};

export type InvoiceFinanceSnapshotDto = {
  ticketRevenue: number;
  cargoRevenue: number;
  charterRevenue: number;
  totalRevenue: number;
  fuelCost: number;
  stationCost: number;
  maintenanceCost: number;
  totalOperationalCost: number;
  taxAmount: number;
  invoiceTotal: number;
  grossMargin: number;
  currencyCode: string;
  capturedAt: string;
};

export type InvoiceHandoffDto = {
  id: string;
  sourceType: string;
  sourceId: string | null;
  eventType: string;
  status: string;
  summary: string;
  amount: number | null;
  currencyCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceSummaryDto = {
  id: string;
  flightOperationId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  createdByUserId: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  paidAmount: number;
  balanceDue: number;
  customer: {
    id: string;
    name: string;
    contactEmail: string | null;
  };
  flight: {
    id: string;
    flightNumber: string;
    orderNumber: string;
    currentStatus: string;
    originCode: string;
    destinationCode: string;
    scheduledDepartureAt: string | null;
    scheduledArrivalAt: string | null;
  };
  finance: InvoiceFinanceSnapshotDto;
};

export type InvoiceDetailDto = InvoiceSummaryDto & {
  lineItems: InvoiceLineItemDto[];
  payments: PaymentDto[];
  handoffs: InvoiceHandoffDto[];
};
