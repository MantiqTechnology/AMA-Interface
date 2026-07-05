import { z } from 'zod';
import { isoDateTimeSchema, paginationQuerySchema } from './common';

export const aircraftStatusSchema = z.enum(['available', 'in_maintenance', 'grounded']);
export const flightStatusSchema = z.enum([
  'draft',
  'scheduled',
  'ready',
  'dispatched',
  'completed',
  'cancelled'
]);

export const aircraftDtoSchema = z.object({
  id: z.string(),
  tailNumber: z.string(),
  type: z.string(),
  displayName: z.string(),
  capacity: z.number().int().positive(),
  status: aircraftStatusSchema
});

export const stationDtoSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  province: z.string(),
  isActive: z.boolean()
});

export const routeDtoSchema = z.object({
  id: z.string(),
  origin: stationDtoSchema,
  destination: stationDtoSchema,
  distanceNm: z.number().int().positive(),
  estimatedBlockMinutes: z.number().int().positive()
});

export const customerDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['charter', 'government', 'medevac', 'cargo']),
  contactEmail: z.string().email()
});

export const manifestPassengerDtoSchema = z.object({
  id: z.string(),
  passengerName: z.string(),
  documentNumber: z.string(),
  seatNumber: z.string(),
  weightKg: z.number().nonnegative(),
  remarks: z.string().nullable()
});

export const flightSummaryDtoSchema = z.object({
  id: z.string(),
  flightNumber: z.string(),
  orderNumber: z.string(),
  status: flightStatusSchema,
  scheduledDeparture: isoDateTimeSchema,
  scheduledArrival: isoDateTimeSchema,
  customer: customerDtoSchema,
  aircraft: aircraftDtoSchema,
  route: routeDtoSchema,
  manifestCount: z.number().int().nonnegative(),
  quotedAmount: z.number().nonnegative(),
  currency: z.string().length(3)
});

export const flightDetailDtoSchema = flightSummaryDtoSchema.extend({
  purpose: z.string(),
  manifest: z.array(manifestPassengerDtoSchema)
});

export const listFlightsQuerySchema = paginationQuerySchema.extend({
  status: flightStatusSchema.optional(),
  station: z.string().optional()
});

export const createFlightOrderBodySchema = z.object({
  flightNumber: z.string().min(3),
  orderNumber: z.string().min(3),
  customerId: z.string().min(1),
  routeId: z.string().min(1),
  aircraftId: z.string().min(1),
  scheduledDeparture: isoDateTimeSchema,
  scheduledArrival: isoDateTimeSchema,
  purpose: z.string().min(3),
  quotedAmount: z.number().nonnegative(),
  currency: z.string().length(3).default('IDR')
});

export type AircraftDto = z.infer<typeof aircraftDtoSchema>;
export type StationDto = z.infer<typeof stationDtoSchema>;
export type RouteDto = z.infer<typeof routeDtoSchema>;
export type CustomerDto = z.infer<typeof customerDtoSchema>;
export type FlightSummaryDto = z.infer<typeof flightSummaryDtoSchema>;
export type FlightDetailDto = z.infer<typeof flightDetailDtoSchema>;
export type ListFlightsQuery = z.infer<typeof listFlightsQuerySchema>;
export type CreateFlightOrderBody = z.infer<typeof createFlightOrderBodySchema>;
export type FlightStatus = z.infer<typeof flightStatusSchema>;
