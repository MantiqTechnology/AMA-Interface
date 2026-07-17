import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const flightScheduleTemplatesListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default(''),
  routeId: z.string().trim().min(1).optional()
});
export const flightScheduleTemplatesIdParamsSchema = z.object({ id: z.string().min(1) });
export const flightScheduleTemplatesStatusSchema = z.object({ isActive: z.boolean() });
export const flightScheduleTemplatesInputSchema = z.object({
  templateCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  routeId: z.string().trim().min(1),
  serviceTypeId: z.enum([
    'flight-service-type-charter-cargo',
    'flight-service-type-charter-passenger',
    'flight-service-type-scheduled-passenger',
    'flight-service-type-medevac',
    'flight-service-type-positioning'
  ]),
  defaultAircraftId: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  operatingDays: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])).min(1),
  departureTimeLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u, 'Expected HH:mm'),
  arrivalTimeLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u, 'Expected HH:mm'),
  bookingOpenHoursBefore: z.coerce.number().int().min(0).optional().default(72),
  bookingCloseMinutesBefore: z.coerce.number().int().min(0).optional().default(60),
  scheduleNote: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
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
  operatingDays: string[];
  departureTimeLocal: string;
  arrivalTimeLocal: string;
  bookingOpenHoursBefore: number;
  bookingCloseMinutesBefore: number;
  scheduleNote: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type FlightScheduleTemplateOption = {
  id: string;
  templateCode: string;
  routeId: string;
  serviceTypeId: string;
  defaultAircraftId: string | null;
  operatingDays: string[];
  departureTimeLocal: string;
  arrivalTimeLocal: string;
  bookingOpenHoursBefore: number;
  bookingCloseMinutesBefore: number;
  scheduleNote: string | null;
};
