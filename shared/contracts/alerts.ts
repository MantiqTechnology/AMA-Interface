import { z } from 'zod';
import { isoDateTimeSchema } from './common';

export const alertSeveritySchema = z.enum(['info', 'warning', 'critical']);

export const alertDtoSchema = z.object({
  id: z.string(),
  severity: alertSeveritySchema,
  title: z.string(),
  message: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: isoDateTimeSchema
});

export type AlertDto = z.infer<typeof alertDtoSchema>;
