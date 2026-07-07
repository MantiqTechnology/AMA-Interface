import { z } from 'zod';
import { isoDateTimeSchema } from './common';
import { localUploadSchema } from './uploads';

export const documentOwnerTypes = [
  'company',
  'aircraft',
  'aircraft_type',
  'personnel',
  'station',
  'airport',
  'vendor',
  'customer',
  'route',
  'flight'
] as const;

export const documentVisibilityValues = ['INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as const;
export const documentVerificationStatusValues = [
  'PENDING_VERIFICATION',
  'VERIFIED',
  'REJECTED'
] as const;
export const documentLifecycleStatusValues = [
  'ACTIVE',
  'EXPIRING',
  'EXPIRED',
  'SUPERSEDED'
] as const;

export const documentOwnerTypeSchema = z.enum(documentOwnerTypes);
export const documentVisibilitySchema = z.enum(documentVisibilityValues);
export const documentVerificationStatusSchema = z.enum(documentVerificationStatusValues);
export const documentLifecycleStatusSchema = z.enum(documentLifecycleStatusValues);

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD');

export const masterDocumentSchema = z.object({
  id: z.string().min(1),
  ownerType: documentOwnerTypeSchema,
  ownerId: z.string().min(1),
  uploadId: z.string().min(1),
  documentType: z.string().min(1),
  title: z.string().min(1),
  documentNumber: z.string().optional(),
  issuer: z.string().optional(),
  issuedAt: dateOnlySchema.optional(),
  validFrom: dateOnlySchema.optional(),
  expiresAt: dateOnlySchema.optional(),
  revision: z.string().optional(),
  verificationStatus: documentVerificationStatusSchema,
  visibility: documentVisibilitySchema,
  notes: z.string().optional(),
  version: z.number().int().positive(),
  replacesDocumentId: z.string().optional(),
  supersededByDocumentId: z.string().optional(),
  uploadedBy: z.string().min(1),
  uploadedAt: isoDateTimeSchema,
  verifiedBy: z.string().optional(),
  verifiedAt: isoDateTimeSchema.optional(),
  rejectionReason: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const masterDocumentDtoSchema = masterDocumentSchema.extend({
  lifecycleStatus: documentLifecycleStatusSchema,
  daysUntilExpiry: z.number().int().optional(),
  upload: localUploadSchema.optional()
});

export const documentListQuerySchema = z.object({
  ownerType: documentOwnerTypeSchema.optional(),
  ownerId: z.string().min(1).optional(),
  lifecycleStatus: documentLifecycleStatusSchema.optional(),
  status: documentLifecycleStatusSchema.optional(),
  verificationStatus: documentVerificationStatusSchema.optional(),
  visibility: documentVisibilitySchema.optional(),
  documentType: z.string().trim().min(1).optional(),
  expiringWithinDays: z.coerce.number().int().positive().max(365).optional(),
  search: z.string().trim().max(100).optional().default('')
});

export const createDocumentBodySchema = z.object({
  ownerType: documentOwnerTypeSchema,
  ownerId: z.string().min(1),
  uploadId: z.string().min(1),
  documentType: z.string().min(1),
  title: z.string().min(1),
  documentNumber: z.string().trim().optional(),
  issuer: z.string().trim().optional(),
  issuedAt: dateOnlySchema.optional(),
  validFrom: dateOnlySchema.optional(),
  expiresAt: dateOnlySchema.optional(),
  revision: z.string().trim().optional(),
  visibility: documentVisibilitySchema.default('INTERNAL'),
  notes: z.string().trim().optional()
});

export const updateDocumentBodySchema = createDocumentBodySchema.partial().omit({
  ownerType: true,
  ownerId: true,
  uploadId: true
});

export const rejectDocumentBodySchema = z.object({
  rejectionReason: z.string().trim().min(1)
});

export const supersedeDocumentBodySchema = createDocumentBodySchema
  .omit({
    ownerType: true,
    ownerId: true
  })
  .extend({
    notes: z.string().trim().optional()
  });

export type DocumentOwnerType = z.infer<typeof documentOwnerTypeSchema>;
export type DocumentVisibility = z.infer<typeof documentVisibilitySchema>;
export type DocumentVerificationStatus = z.infer<typeof documentVerificationStatusSchema>;
export type DocumentLifecycleStatus = z.infer<typeof documentLifecycleStatusSchema>;
export type MasterDocument = z.infer<typeof masterDocumentSchema>;
export type MasterDocumentDto = z.infer<typeof masterDocumentDtoSchema>;
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;
export type CreateDocumentBody = z.infer<typeof createDocumentBodySchema>;
export type UpdateDocumentBody = z.infer<typeof updateDocumentBodySchema>;
export type SupersedeDocumentBody = z.infer<typeof supersedeDocumentBodySchema>;

export function daysUntilDate(date: string, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const target = new Date(`${date}T00:00:00.000Z`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function getDocumentLifecycleStatus(
  document: Pick<MasterDocument, 'expiresAt' | 'supersededByDocumentId'>,
  now = new Date(),
  expiringWithinDays = 30
): DocumentLifecycleStatus {
  if (document.supersededByDocumentId) return 'SUPERSEDED';
  if (!document.expiresAt) return 'ACTIVE';

  const days = daysUntilDate(document.expiresAt, now);
  if (days < 0) return 'EXPIRED';
  if (days <= expiringWithinDays) return 'EXPIRING';
  return 'ACTIVE';
}
