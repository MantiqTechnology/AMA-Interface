import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const crewListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const crewIdParamsSchema = z.object({ id: z.string().min(1) });
export const crewStatusSchema = z.object({ isActive: z.boolean() });
export const crewInputSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  fullName: z.string().trim().min(1),
  crewRole: z.enum([
    'PILOT_IN_COMMAND',
    'CO_PILOT',
    'CABIN_CREW',
    'FLIGHT_OPERATIONS',
    'GROUND_CREW'
  ]),
  licenseType: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  licenseNumber: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  licenseExpiryDate: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
        .nullable()
    )
    .optional()
    .default(null),
  medicalExpiryDate: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
        .nullable()
    )
    .optional()
    .default(null),
  baseStationId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  availabilityStatus: z
    .enum(['AVAILABLE', 'ON_DUTY', 'ASSIGNED_OTHER_FLIGHT', 'ON_LEAVE', 'UNAVAILABLE'])
    .optional()
    .default('AVAILABLE'),
  dutyStationId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  readinessNote: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  unit: z.string().trim().min(1),
  employmentStatus: z.enum(['PERMANENT', 'CONTRACT', 'ON_LEAVE', 'INACTIVE'])
});

export type PersonnelListQuery = z.infer<typeof crewListQuerySchema>;
export type PersonnelInput = z.infer<typeof crewInputSchema>;
export type PersonnelDto = {
  id: string;
  employeeCode: string;
  fullName: string;
  crewRole: string;
  licenseType: string | null;
  licenseNumber: string | null;
  licenseExpiryDate: string | null;
  medicalExpiryDate: string | null;
  baseStationId: string | null;
  availabilityStatus: string;
  dutyStationId: string | null;
  readinessNote: string | null;
  unit: string;
  employmentStatus: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type PersonnelOption = {
  id: string;
  employeeCode: string;
  fullName: string;
  crewRole: string;
  licenseExpiryDate: string | null;
  medicalExpiryDate: string | null;
  baseStationId: string | null;
  dutyStationId: string | null;
  availabilityStatus: string;
  readinessNote: string | null;
};
