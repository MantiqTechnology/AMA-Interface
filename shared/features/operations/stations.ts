import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const stationAirportTypes = ['AIRPORT', 'AIRSTRIP', 'STOL_AIRFIELD'] as const;
export type StationAirportType = (typeof stationAirportTypes)[number];

export const stationOperationalStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type StationOperationalStatus = (typeof stationOperationalStatuses)[number];

export const stationSurfaceTypes = ['ASPHALT', 'CONCRETE', 'GRASS', 'GRAVEL', 'SAND'] as const;
export type StationSurfaceType = (typeof stationSurfaceTypes)[number];

export const stationListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});

export const stationIdParamsSchema = z.object({ id: z.string().min(1) });
export const stationStatusSchema = z.object({ isActive: z.boolean() });

export const stationInputSchema = z.object({
  stationCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  stationName: z.string().trim().min(1),
  iataCode: z
    .preprocess(emptyToNull, z.string().trim().length(3).nullable())
    .optional()
    .default(null),
  icaoCode: z
    .preprocess(emptyToNull, z.string().trim().length(4).nullable())
    .optional()
    .default(null),
  airportType: z.enum(stationAirportTypes).nullable().optional().default(null),
  operationalStatus: z.enum(stationOperationalStatuses).optional().default('ACTIVE'),
  city: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  province: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  countryCode: z
    .preprocess(emptyToNull, z.string().trim().length(2).nullable())
    .optional()
    .default(null),
  timezone: z.string().trim().optional().default('Asia/Jayapura'),
  latitude: z.number().min(-90).max(90).nullable().optional().default(null),
  longitude: z.number().min(-180).max(180).nullable().optional().default(null),
  elevationFt: z.number().int().nullable().optional().default(null),
  surfaceType: z.enum(stationSurfaceTypes).nullable().optional().default(null),
  runwayLengthM: z.number().int().positive().nullable().optional().default(null),
  runwayWidthM: z.number().int().positive().nullable().optional().default(null),
  stationPicName: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  stationPicPhone: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  operationalNotes: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  isRemoteStation: z.boolean().optional().default(false),
  lowConnectivityMode: z.boolean().optional().default(false),
  hasFuelService: z.boolean().optional().default(false),
  hasHandlingService: z.boolean().optional().default(false),
  hasParkingService: z.boolean().optional().default(false)
});

export type StationListQuery = z.infer<typeof stationListQuerySchema>;
export type StationInput = z.infer<typeof stationInputSchema>;

export type StationPicDto = {
  name: string | null;
  phone: string | null;
};

export type StationDto = {
  id: string;
  stationCode: string;
  stationName: string;
  iataCode: string | null;
  icaoCode: string | null;
  airportType: StationAirportType | null;
  operationalStatus: StationOperationalStatus;
  city: string | null;
  province: string | null;
  countryCode: string | null;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  elevationFt: number | null;
  surfaceType: StationSurfaceType | null;
  runwayLengthM: number | null;
  runwayWidthM: number | null;
  stationPic: StationPicDto;
  operationalNotes: string | null;
  isRemoteStation: boolean;
  lowConnectivityMode: boolean;
  hasFuelService: boolean;
  hasHandlingService: boolean;
  hasParkingService: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StationOption = {
  id: string;
  stationCode: string;
  stationName: string;
  city: string | null;
};
