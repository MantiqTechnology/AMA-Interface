import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const flightCapacityProfilesListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const flightCapacityProfilesIdParamsSchema = z.object({ id: z.string().min(1) });
export const flightCapacityProfilesStatusSchema = z.object({ isActive: z.boolean() });
export const flightCapacityProfilesInputSchema = z.object({
  profileCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  profileName: z.string().trim().min(1).optional().default('Capacity Profile'),
  aircraftId: z.string().trim().min(1),
  routeId: z.string().trim().min(1),
  serviceTypeId: z.enum([
    'flight-service-type-charter-cargo',
    'flight-service-type-charter-passenger',
    'flight-service-type-scheduled-passenger',
    'flight-service-type-medevac',
    'flight-service-type-positioning'
  ]),
  seatCapacity: z.coerce.number().int().min(0),
  cargoCapacityKg: z.coerce.number().int().min(0),
  reservedSeatCount: z.coerce.number().int().min(0).optional().default(0),
  reservedCargoKg: z.coerce.number().int().min(0).optional().default(0),
  capacityNote: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
});

export type FlightCapacityProfileListQuery = z.infer<typeof flightCapacityProfilesListQuerySchema>;
export type FlightCapacityProfileInput = z.infer<typeof flightCapacityProfilesInputSchema>;
export type FlightCapacityProfileDto = {
  id: string;
  profileCode: string;
  profileName: string;
  aircraftId: string;
  routeId: string;
  serviceTypeId: string;
  seatCapacity: number;
  cargoCapacityKg: number;
  reservedSeatCount: number;
  reservedCargoKg: number;
  capacityNote: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type FlightCapacityProfileOption = {
  id: string;
  profileCode: string;
  profileName: string;
  aircraftId: string;
  routeId: string;
  serviceTypeId: string;
  seatCapacity: number;
  cargoCapacityKg: number;
  reservedSeatCount: number;
  reservedCargoKg: number;
  capacityNote: string | null;
};
