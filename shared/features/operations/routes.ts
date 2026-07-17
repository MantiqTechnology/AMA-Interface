import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const routeRestrictionLevels = ['NONE', 'ADVISORY', 'BLOCKING'] as const;
export type RouteRestrictionLevel = (typeof routeRestrictionLevels)[number];

export const routeListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});

export const routeIdParamsSchema = z.object({ id: z.string().min(1) });
export const routeStatusSchema = z.object({ isActive: z.boolean() });

export const routeInputSchema = z
  .object({
    routeCode: z
      .string()
      .trim()
      .min(1)
      .transform((value) => value.toUpperCase()),
    originStationId: z.string().trim().min(1),
    destinationStationId: z.string().trim().min(1),
    estimatedDurationMinutes: z.coerce.number().int().positive(),
    distanceKm: z.coerce.number().int().positive(),
    operationalNotes: z
      .preprocess(emptyToNull, z.string().trim().max(1000).nullable())
      .optional()
      .default(null),
    restrictionLevel: z.enum(routeRestrictionLevels).optional().default('NONE'),
    restrictionNote: z
      .preprocess(emptyToNull, z.string().trim().max(1000).nullable())
      .optional()
      .default(null)
  })
  .superRefine((value, context) => {
    if (value.restrictionLevel !== 'NONE' && !value.restrictionNote) {
      context.addIssue({
        code: 'custom',
        message: 'Restriction note is required for advisory or blocking restrictions.',
        path: ['restrictionNote']
      });
    }
  })
  .transform((value) => ({
    ...value,
    restrictionNote: value.restrictionLevel === 'NONE' ? null : value.restrictionNote
  }));

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

export type RouteProfileStationDto = {
  id: string;
  stationCode: string;
  stationName: string;
  cityOrRegion: string;
  province: string;
  airportType: string;
  operationalNotes: string | null;
  isActive: boolean;
};

export type RouteReadinessCheckDto = {
  code: string;
  label: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'NOT_CONFIGURED';
  message: string;
};

export type RouteScheduleSummaryDto = {
  id: string;
  templateCode: string;
  operatingDays: string[];
  departureTimeLocal: string;
  arrivalTimeLocal: string;
  serviceTypeId: string;
  serviceTypeLabel: string;
  defaultAircraftId: string | null;
  defaultAircraftRegistration: string | null;
};

export type RouteAircraftCompatibilityDto = {
  profileId: string;
  profileCode: string;
  profileName: string;
  aircraftId: string;
  registrationNumber: string;
  aircraftType: string;
  serviceabilityStatus: string;
  serviceTypeId: string;
  serviceTypeLabel: string;
  seatCapacity: number;
  cargoCapacityKg: number;
  reservedSeatCount: number;
  reservedCargoKg: number;
};

export type RouteAvailableServiceDto = {
  serviceTypeId: string;
  serviceTypeLabel: string;
  sources: Array<'SCHEDULE_TEMPLATE' | 'CAPACITY_PROFILE' | 'RATE_CARD'>;
};

export type RouteUpcomingFlightDto = {
  id: string;
  flightNumber: string;
  scheduledDepartureAt: string;
  scheduledArrivalAt: string;
  aircraftRegistration: string | null;
  status: string;
  statusLabel: string;
  passengerCount: number | null;
  cargoWeightKg: number | null;
};

export type RouteOperationalProfileDto = {
  route: RouteDto;
  origin: RouteProfileStationDto | null;
  destination: RouteProfileStationDto | null;
  regionLabel: string | null;
  timezone: { code: 'WIT'; ianaName: 'Asia/Jayapura' } | null;
  readiness: {
    status: 'AVAILABLE' | 'NEEDS_CONFIGURATION' | 'NOT_AVAILABLE';
    availableForScheduling: boolean;
    checks: RouteReadinessCheckDto[];
    warnings: string[];
    blockers: string[];
  };
  metrics: {
    activeTemplateCount: number;
    compatibleAircraftCount: number;
    nextFlightAt: string | null;
  };
  scheduleTemplates: RouteScheduleSummaryDto[];
  compatibleAircraft: RouteAircraftCompatibilityDto[];
  availableServices: RouteAvailableServiceDto[];
  upcomingFlights: RouteUpcomingFlightDto[];
  reverseRoute: { id: string; routeCode: string; isActive: boolean } | null;
  evaluatedAt: string;
};
