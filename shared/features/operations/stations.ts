import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

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
  cityOrRegion: z.string().trim().min(1),
  province: z.string().trim().min(1),
  airportType: z.enum(['AIRPORT', 'AIRSTRIP', 'STOL_AIRFIELD']),
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

export type StationDto = Omit<StationInput, 'airportType'> & {
  id: string;
  airportType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StationOption = {
  id: string;
  stationCode: string;
  stationName: string;
  cityOrRegion: string;
};
