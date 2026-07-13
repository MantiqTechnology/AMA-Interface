import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const aircraftListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const aircraftIdParamsSchema = z.object({ id: z.string().min(1) });
export const aircraftStatusSchema = z.object({ isActive: z.boolean() });
export const aircraftInputSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  serialNumber: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  aircraftType: z.string().trim().min(1),
  manufacturer: z.string().trim().min(1),
  model: z.string().trim().min(1),
  fleetCode: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .nullable()
    )
    .optional()
    .default(null),
  passengerCapacity: z.coerce.number().int().min(0),
  cargoCapacityKg: z.coerce.number().int().min(0),
  fuelType: z.enum(['AVTUR', 'AVGAS']),
  defaultCapacityProfileId: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  operationalStatus: z.enum(['ACTIVE', 'INACTIVE', 'RETIRED']).optional().default('ACTIVE'),
  serviceabilityStatus: z.enum([
    'SERVICEABLE',
    'SERVICEABLE_WITH_RESTRICTIONS',
    'MAINTENANCE_DUE',
    'UNSERVICEABLE'
  ]),
  baseStationId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  currentStationId: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  lastMaintenanceCheckAt: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
        .nullable()
    )
    .optional()
    .default(null),
  nextMaintenanceDueAt: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
        .nullable()
    )
    .optional()
    .default(null),
  serviceabilityNote: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null)
});

export type AircraftListQuery = z.infer<typeof aircraftListQuerySchema>;
export type AircraftInput = z.infer<typeof aircraftInputSchema>;
export type AircraftDto = {
  id: string;
  registrationNumber: string;
  serialNumber: string | null;
  aircraftType: string;
  manufacturer: string;
  model: string;
  fleetCode: string | null;
  passengerCapacity: number;
  cargoCapacityKg: number;
  fuelType: string;
  defaultCapacityProfileId: string | null;
  operationalStatus: string;
  serviceabilityStatus: string;
  baseStationId: string | null;
  currentStationId: string | null;
  lastMaintenanceCheckAt: string | null;
  nextMaintenanceDueAt: string | null;
  serviceabilityNote: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type AircraftOption = {
  id: string;
  registrationNumber: string;
  aircraftType: string;
  manufacturer: string;
  model: string;
  passengerCapacity: number;
  cargoCapacityKg: number;
  fuelType: string;
  serviceabilityStatus: string;
  baseStationId: string | null;
  currentStationId: string | null;
  nextMaintenanceDueAt: string | null;
  serviceabilityNote: string | null;
};
