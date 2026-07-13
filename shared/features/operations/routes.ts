import { z } from 'zod';

export const routeListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});

export const routeIdParamsSchema = z.object({ id: z.string().min(1) });
export const routeStatusSchema = z.object({ isActive: z.boolean() });

export const routeInputSchema = z.object({
  routeCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  originStationId: z.string().trim().min(1),
  destinationStationId: z.string().trim().min(1),
  estimatedDurationMinutes: z.coerce.number().int().nonnegative(),
  distanceKm: z.coerce.number().int().nonnegative()
});

export type RouteListQuery = z.infer<typeof routeListQuerySchema>;
export type RouteInput = z.infer<typeof routeInputSchema>;

export type RouteDto = RouteInput & {
  id: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RouteOption = {
  id: string;
  routeCode: string;
  originStationId: string;
  destinationStationId: string;
  originStationCode: string;
  destinationStationCode: string;
  estimatedDurationMinutes: number;
  distanceKm: number;
};
