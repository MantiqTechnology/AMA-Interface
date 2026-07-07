import { z } from 'zod';
import { isoDateTimeSchema } from './common';

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
  uploadedAt: isoDateTimeSchema
});

export type LocalUploadDto = z.infer<typeof localUploadSchema>;
