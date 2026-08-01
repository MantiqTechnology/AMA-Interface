import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const scheduleOperatingDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export const scheduleTemplateStatuses = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;

export type ScheduleOperatingDay = (typeof scheduleOperatingDays)[number];
export type ScheduleTemplateStatus = (typeof scheduleTemplateStatuses)[number];

export const flightScheduleTemplatesListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default(''),
  routeId: z.string().trim().min(1).optional()
});
export const flightScheduleTemplatesIdParamsSchema = z.object({ id: z.string().min(1) });
export const flightScheduleTemplatesStatusSchema = z.object({ isActive: z.boolean() });
const serviceTypeIdSchema = z.enum([
  'flight-service-type-charter-cargo',
  'flight-service-type-charter-passenger',
  'flight-service-type-scheduled-passenger',
  'flight-service-type-medevac',
  'flight-service-type-positioning'
]);

const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u, 'Expected HH:mm');
const nullableDateSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
    .nullable()
);

export const flightScheduleTemplatesInputSchema = z
  .object({
    templateCode: z
      .string()
      .trim()
      .min(1)
      .transform((value) => value.toUpperCase()),
    expectedVersion: z.coerce.number().int().positive().optional(),
    routeId: z.string().trim().min(1),
    serviceTypeId: serviceTypeIdSchema,
    defaultAircraftId: z
      .preprocess(emptyToNull, z.string().trim().nullable())
      .optional()
      .default(null),
    capacityProfileId: z
      .preprocess(emptyToNull, z.string().trim().nullable())
      .optional()
      .default(null),
    operatingDays: z.array(z.enum(scheduleOperatingDays)).min(1),
    departureTimeLocal: localTimeSchema,
    arrivalTimeLocal: localTimeSchema,
    arrivalDayOffset: z.coerce.number().int().min(0).max(2).optional().default(0),
    bookingOpenMinutesBefore: z.coerce.number().int().min(0).nullable().optional(),
    bookingOpenHoursBefore: z.coerce.number().int().min(0).optional(),
    bookingCloseMinutesBefore: z.coerce.number().int().min(0).nullable().optional().default(60),
    effectiveFrom: nullableDateSchema.optional().default(null),
    effectiveUntil: nullableDateSchema.optional().default(null),
    scheduleNote: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
    internalOperationalNote: z
      .preprocess(emptyToNull, z.string().trim().nullable())
      .optional()
      .default(null)
  })
  .superRefine((value, context) => {
    const operatingDays = new Set(value.operatingDays);
    if (operatingDays.size !== value.operatingDays.length) {
      context.addIssue({
        code: 'custom',
        message: 'Operating days cannot contain duplicates.',
        path: ['operatingDays']
      });
    }

    const openMinutes = value.bookingOpenMinutesBefore ?? (value.bookingOpenHoursBefore ?? 72) * 60;
    const closeMinutes = value.bookingCloseMinutesBefore ?? 60;
    if (openMinutes <= closeMinutes) {
      context.addIssue({
        code: 'custom',
        message: 'Booking open offset must be greater than booking close offset.',
        path: ['bookingOpenMinutesBefore']
      });
    }

    if (value.effectiveFrom && value.effectiveUntil && value.effectiveUntil < value.effectiveFrom) {
      context.addIssue({
        code: 'custom',
        message: 'Effective until must be on or after effective from.',
        path: ['effectiveUntil']
      });
    }
  })
  .transform((value) => {
    const bookingOpenMinutesBefore =
      value.bookingOpenMinutesBefore ?? (value.bookingOpenHoursBefore ?? 72) * 60;
    return {
      ...value,
      bookingOpenMinutesBefore,
      bookingOpenHoursBefore: Math.floor(bookingOpenMinutesBefore / 60),
      bookingCloseMinutesBefore: value.bookingCloseMinutesBefore ?? 60
    };
  });

export const duplicateScheduleTemplateSchema = z.object({
  templateCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  effectiveFrom: nullableDateSchema.optional().default(null)
});

export type FlightScheduleTemplateListQuery = z.infer<
  typeof flightScheduleTemplatesListQuerySchema
>;
export type FlightScheduleTemplateInput = z.infer<typeof flightScheduleTemplatesInputSchema>;
export type FlightScheduleTemplateDto = {
  id: string;
  templateCode: string;
  routeId: string;
  serviceTypeId: string;
  defaultAircraftId: string | null;
  capacityProfileId: string | null;
  operatingDays: ScheduleOperatingDay[];
  departureTimeLocal: string;
  arrivalTimeLocal: string;
  arrivalDayOffset: number;
  bookingOpenMinutesBefore: number;
  bookingOpenHoursBefore: number;
  bookingCloseMinutesBefore: number;
  lifecycleStatus: ScheduleTemplateStatus;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  scheduleNote: string | null;
  internalOperationalNote: string | null;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleTemplateStationSummaryDto = {
  id: string;
  stationCode: string;
  stationName: string;
  timezone: string;
};

export type FlightScheduleTemplateDetailDto = FlightScheduleTemplateDto & {
  route: {
    id: string;
    routeCode: string;
    origin: ScheduleTemplateStationSummaryDto;
    destination: ScheduleTemplateStationSummaryDto;
    estimatedDurationMinutes: number | null;
    distanceKm: number | null;
    status: string | null;
    isActive: boolean;
  };
  serviceType: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  defaultAircraft: {
    id: string;
    registration: string;
    aircraftTypeName: string | null;
    model: string | null;
    passengerCapacity: number | null;
    cargoCapacityKg: number | null;
    operationalStatus: string | null;
    serviceabilityStatus: string | null;
    isActive: boolean;
  } | null;
  capacityProfile: {
    id: string;
    code: string;
    name: string;
    seatCapacity: number;
    cargoCapacityKg: number;
    isActive: boolean;
  } | null;
};

export type FlightScheduleTemplateOption = {
  id: string;
  templateCode: string;
  routeId: string;
  serviceTypeId: string;
  defaultAircraftId: string | null;
  capacityProfileId: string | null;
  operatingDays: ScheduleOperatingDay[];
  departureTimeLocal: string;
  arrivalTimeLocal: string;
  arrivalDayOffset: number;
  bookingOpenMinutesBefore: number;
  bookingOpenHoursBefore: number;
  bookingCloseMinutesBefore: number;
  scheduleNote: string | null;
};

export type DuplicateScheduleTemplateInput = z.infer<typeof duplicateScheduleTemplateSchema>;

export type ScheduleTemplateHistoryItemDto = {
  id: string;
  action: string;
  actorName: string | null;
  changedFields: string[];
  occurredAt: string;
  requestId?: string | null;
};
