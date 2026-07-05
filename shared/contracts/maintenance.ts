import { z } from 'zod';
import { isoDateTimeSchema, paginationQuerySchema } from './common';
import { aircraftDtoSchema } from './flights';

export const maintenancePrioritySchema = z.enum(['low', 'normal', 'high', 'aog']);
export const maintenanceStatusSchema = z.enum(['open', 'in_progress', 'waiting_parts', 'closed']);
export const partStatusSchema = z.enum(['available', 'installed', 'quarantined', 'scrapped']);

export const serializedPartDtoSchema = z.object({
  id: z.string(),
  aircraftId: z.string(),
  partNumber: z.string(),
  serialNumber: z.string(),
  description: z.string(),
  status: partStatusSchema,
  installedAt: isoDateTimeSchema.nullable(),
  workOrderId: z.string().nullable()
});

export const maintenanceWorkOrderDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: maintenancePrioritySchema,
  status: maintenanceStatusSchema,
  openedAt: isoDateTimeSchema,
  closedAt: isoDateTimeSchema.nullable(),
  dueAt: isoDateTimeSchema,
  aircraft: aircraftDtoSchema,
  parts: z.array(serializedPartDtoSchema)
});

export const listWorkOrdersQuerySchema = paginationQuerySchema.extend({
  status: maintenanceStatusSchema.optional(),
  aircraftId: z.string().optional()
});

export const createWorkOrderBodySchema = z.object({
  aircraftId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().min(3),
  priority: maintenancePrioritySchema.default('normal'),
  dueAt: isoDateTimeSchema
});

export const closeWorkOrderBodySchema = z.object({
  closedAt: isoDateTimeSchema,
  closingNotes: z.string().optional()
});

export type MaintenanceWorkOrderDto = z.infer<typeof maintenanceWorkOrderDtoSchema>;
export type SerializedPartDto = z.infer<typeof serializedPartDtoSchema>;
export type CreateWorkOrderBody = z.infer<typeof createWorkOrderBodySchema>;
export type CloseWorkOrderBody = z.infer<typeof closeWorkOrderBodySchema>;
