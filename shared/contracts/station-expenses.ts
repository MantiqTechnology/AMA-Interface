import { z } from 'zod';
import { isoDateTimeSchema, paginationQuerySchema } from './common';
import { flightSummaryDtoSchema, stationDtoSchema } from './flights';

export const stationExpenseCategorySchema = z.enum([
  'handling',
  'landing_fee',
  'crew_transport',
  'catering',
  'security',
  'other'
]);

export const stationExpenseStatusSchema = z.enum(['draft', 'submitted', 'approved', 'reimbursed', 'rejected']);

export const stationExpenseDtoSchema = z.object({
  id: z.string(),
  category: stationExpenseCategorySchema,
  description: z.string(),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  status: stationExpenseStatusSchema,
  receiptPath: z.string().nullable(),
  incurredAt: isoDateTimeSchema,
  submittedBy: z.string(),
  station: stationDtoSchema,
  flight: flightSummaryDtoSchema.nullable()
});

export const listStationExpensesQuerySchema = paginationQuerySchema.extend({
  status: stationExpenseStatusSchema.optional(),
  stationId: z.string().optional()
});

export const createStationExpenseBodySchema = z.object({
  stationId: z.string().min(1),
  flightOrderId: z.string().optional(),
  category: stationExpenseCategorySchema,
  description: z.string().min(3),
  amount: z.number().nonnegative(),
  currency: z.string().length(3).default('IDR'),
  incurredAt: isoDateTimeSchema,
  submittedBy: z.string().min(2),
  receiptPath: z.string().optional()
});

export type StationExpenseDto = z.infer<typeof stationExpenseDtoSchema>;
export type CreateStationExpenseBody = z.infer<typeof createStationExpenseBodySchema>;
