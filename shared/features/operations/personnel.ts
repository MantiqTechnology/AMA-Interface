import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const crewListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const crewIdParamsSchema = z.object({ id: z.string().min(1) });
export const licenseIdParamsSchema = crewIdParamsSchema.extend({
  licenseId: z.string().min(1)
});
export const medicalCertificateIdParamsSchema = crewIdParamsSchema.extend({
  certificateId: z.string().min(1)
});
export const qualificationIdParamsSchema = crewIdParamsSchema.extend({
  qualificationId: z.string().min(1)
});
export const crewStatusSchema = z.object({ isActive: z.boolean() });
export const personnelAvailabilityChangeSchema = z.object({
  availabilityStatus: z.enum([
    'AVAILABLE',
    'ON_DUTY',
    'ASSIGNED_OTHER_FLIGHT',
    'ON_LEAVE',
    'UNAVAILABLE'
  ]),
  note: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
});
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
  departmentId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  employmentStatus: z.enum(['PERMANENT', 'CONTRACT', 'ON_LEAVE', 'INACTIVE'])
});

export const personnelUpdateSchema = crewInputSchema.partial().extend({
  expectedVersion: z.number().int().positive().optional()
});

export const personnelLicenseInputSchema = z
  .object({
    licenseType: z.string().trim().min(1),
    licenseNumber: z.string().trim().min(1),
    issuingAuthority: z
      .preprocess(emptyToNull, z.string().trim().nullable())
      .optional()
      .default(null),
    issueDate: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
          .nullable()
      )
      .optional()
      .default(null),
    expiryDate: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
          .nullable()
      )
      .optional()
      .default(null),
    isPrimary: z.boolean().optional().default(false),
    status: z
      .enum(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED', 'SUPERSEDED'])
      .optional()
      .default('ACTIVE'),
    documentId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
  })
  .refine((value) => !value.issueDate || !value.expiryDate || value.issueDate <= value.expiryDate, {
    message: 'Issue date cannot be after expiry date.',
    path: ['issueDate']
  });

export const personnelMedicalCertificateInputSchema = z
  .object({
    certificateType: z.string().trim().min(1),
    certificateNumber: z
      .preprocess(emptyToNull, z.string().trim().nullable())
      .optional()
      .default(null),
    issueDate: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
          .nullable()
      )
      .optional()
      .default(null),
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD'),
    status: z
      .enum(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED', 'SUPERSEDED'])
      .optional()
      .default('ACTIVE'),
    restrictions: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
    issuingAuthority: z
      .preprocess(emptyToNull, z.string().trim().nullable())
      .optional()
      .default(null),
    documentId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
  })
  .refine((value) => !value.issueDate || value.issueDate <= value.expiryDate, {
    message: 'Issue date cannot be after expiry date.',
    path: ['issueDate']
  });

export const personnelQualificationInputSchema = z
  .object({
    qualificationType: z.string().trim().min(1),
    referenceType: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
    referenceId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
    issuedAt: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
          .nullable()
      )
      .optional()
      .default(null),
    expiresAt: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
          .nullable()
      )
      .optional()
      .default(null),
    status: z.enum(['VALID', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED']).optional().default('VALID'),
    notes: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
    documentId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
  })
  .refine((value) => !value.issuedAt || !value.expiresAt || value.issuedAt <= value.expiresAt, {
    message: 'Issue date cannot be after expiry date.',
    path: ['issuedAt']
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
  departmentId?: string | null;
  employmentStatus: string;
  lifecycleStatus?: string;
  version?: number;
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

export type PersonnelUpdateInput = z.infer<typeof personnelUpdateSchema>;
export type PersonnelLicenseInput = z.infer<typeof personnelLicenseInputSchema>;
export type PersonnelMedicalCertificateInput = z.infer<
  typeof personnelMedicalCertificateInputSchema
>;
export type PersonnelQualificationInput = z.infer<typeof personnelQualificationInputSchema>;
export type PersonnelAvailabilityChange = z.infer<typeof personnelAvailabilityChangeSchema>;

export type PersonnelRelationSummary = {
  id: string;
  stationCode?: string;
  stationName?: string;
  unitCode?: string | null;
  unitName?: string;
  employeeCode?: string;
  fullName?: string;
  crewRole?: string | null;
};

export type PersonnelLicenseDto = {
  id: string;
  personnelId: string;
  licenseType: string;
  licenseNumber: string;
  issuingAuthority: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  isPrimary: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | 'SUPERSEDED';
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonnelMedicalCertificateDto = {
  id: string;
  personnelId: string;
  certificateType: string;
  certificateNumber: string | null;
  issueDate: string | null;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | 'SUPERSEDED';
  restrictions: string | null;
  issuingAuthority: string | null;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonnelQualificationDto = {
  id: string;
  personnelId: string;
  qualificationType: string;
  referenceType: string | null;
  referenceId: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED';
  notes: string | null;
  documentId: string | null;
};

export type PersonnelFlyingHoursDto = {
  personnelId: string;
  totalMinutes: number | null;
  captainMinutes: number | null;
  coPilotMinutes: number | null;
  otherMinutes: number | null;
  asOf: string;
};

export type PersonnelReadinessDto = {
  personnelId: string;
  ready: boolean;
  blockers: Array<{
    code: string;
    message: string;
    severity: 'WARNING' | 'CRITICAL';
  }>;
  evaluatedAt: string;
};

export type PersonnelHistoryItemDto = {
  id: string;
  action: string;
  actorName: string | null;
  changedFields: string[];
  occurredAt: string;
  requestId?: string | null;
};

export type PersonnelDetailDto = PersonnelDto & {
  dateOfBirth: string | null;
  nationalityCode: string | null;
  nationalityName: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  lifecycleStatus: string;
  version: number;
  baseStation: PersonnelRelationSummary | null;
  dutyStation: PersonnelRelationSummary | null;
  unitSummary: PersonnelRelationSummary | null;
  supervisor: PersonnelRelationSummary | null;
  primaryLicense: PersonnelLicenseDto | null;
  currentMedicalCertificate: PersonnelMedicalCertificateDto | null;
  flyingHoursSummary: {
    totalMinutes: number | null;
    asOf: string;
  } | null;
  readiness: PersonnelReadinessDto;
};
