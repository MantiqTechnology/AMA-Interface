import { z } from 'zod';

export const aircraftPositionStatusSchema = z.enum(['ON_GROUND', 'AIRBORNE', 'UNKNOWN']);

export const positionReportBodySchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  positionStatus: aircraftPositionStatusSchema.default('AIRBORNE'),
  altitudeFt: z.number().finite().min(0).max(60_000).nullable().optional(),
  groundSpeedKt: z.number().finite().min(0).max(800).nullable().optional(),
  headingDeg: z.number().finite().min(0).max(359.999).nullable().optional(),
  recordedAt: z.string().datetime().optional(),
  expectedVersion: z.number().int().positive().nullable().optional()
});

export const flightTrackingIdParamsSchema = z.object({
  id: z.string().trim().min(1)
});

export type PositionReportBody = z.infer<typeof positionReportBodySchema>;
export type AircraftPositionStatus = z.infer<typeof aircraftPositionStatusSchema>;

export type AircraftPositionDto = {
  latitude: number;
  longitude: number;
  positionStatus: AircraftPositionStatus;
  altitudeFt: number | null;
  groundSpeedKt: number | null;
  headingDeg: number | null;
  source: 'MANUAL' | 'DEMO_SIMULATION' | 'SYSTEM_DEPARTURE' | 'SYSTEM_ARRIVAL';
  recordedAt: string;
  version: number;
  progressPercent: number | null;
  isStale: boolean;
};
