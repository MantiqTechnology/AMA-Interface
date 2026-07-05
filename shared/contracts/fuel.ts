import { z } from 'zod';
import { isoDateTimeSchema, paginationQuerySchema } from './common';
import { aircraftDtoSchema, flightSummaryDtoSchema, stationDtoSchema } from './flights';

export const fuelRequestStatusSchema = z.enum(['draft', 'requested', 'approved', 'uplifted', 'rejected']);

export const fuelRequestDtoSchema = z.object({
  id: z.string(),
  status: fuelRequestStatusSchema,
  requestedLiters: z.number().positive(),
  requestedBy: z.string(),
  requiredAt: isoDateTimeSchema,
  notes: z.string().nullable(),
  flight: flightSummaryDtoSchema,
  station: stationDtoSchema,
  aircraft: aircraftDtoSchema
});

export const fuelUpliftDtoSchema = z.object({
  id: z.string(),
  fuelRequestId: z.string(),
  supplier: z.string(),
  liters: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  currency: z.string().length(3),
  upliftedAt: isoDateTimeSchema,
  receiptPath: z.string().nullable()
});

export const listFuelRequestsQuerySchema = paginationQuerySchema.extend({
  status: fuelRequestStatusSchema.optional()
});

export const createFuelRequestBodySchema = z.object({
  flightOrderId: z.string().min(1),
  stationId: z.string().min(1),
  aircraftId: z.string().min(1),
  requestedLiters: z.number().positive(),
  requestedBy: z.string().min(2),
  requiredAt: isoDateTimeSchema,
  notes: z.string().optional()
});

export const recordFuelUpliftBodySchema = z.object({
  supplier: z.string().min(2),
  liters: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  currency: z.string().length(3).default('IDR'),
  upliftedAt: isoDateTimeSchema,
  receiptPath: z.string().optional()
});

export type FuelRequestDto = z.infer<typeof fuelRequestDtoSchema>;
export type FuelUpliftDto = z.infer<typeof fuelUpliftDtoSchema>;
export type CreateFuelRequestBody = z.infer<typeof createFuelRequestBodySchema>;
export type RecordFuelUpliftBody = z.infer<typeof recordFuelUpliftBodySchema>;
