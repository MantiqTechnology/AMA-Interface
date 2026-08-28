import { z } from 'zod';
import { isoDateTimeSchema } from './common';

export const uploadStatusSchema = z.enum(['DRAFT', 'ATTACHED']);

export const localUploadSchema = z.object({
  id: z.string().min(1),
  originalName: z.string().min(1),
  filename: z.string().min(1),
  path: z.string().min(1),
  viewUrl: z.string().min(1),
  downloadUrl: z.string().min(1),
  size: z.number().int().nonnegative(),
  contentType: z.string().min(1),
  isImage: z.boolean(),
  uploadedAt: isoDateTimeSchema,
  uploadedBy: z.string().min(1).default('AMA System Administrator'),
  status: uploadStatusSchema.default('ATTACHED'),
  stationScopes: z.array(z.string().min(1)).default(['ALL']),
  purpose: z.string().min(1).default('DOCUMENT'),
  ownerType: z.string().min(1).optional(),
  ownerId: z.string().min(1).optional()
});

export type LocalUploadDto = z.infer<typeof localUploadSchema>;
export type UploadStatus = z.infer<typeof uploadStatusSchema>;
