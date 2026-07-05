import { z } from 'zod';
import { demoRoleSchema } from './auth';
import { isoDateTimeSchema, paginationQuerySchema } from './common';

export const approvalStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export const approvalDomainSchema = z.enum([
  'flight_order',
  'fuel_request',
  'station_expense',
  'invoice',
  'maintenance_work_order'
]);

export const approvalDtoSchema = z.object({
  id: z.string(),
  domainEntity: approvalDomainSchema,
  entityId: z.string(),
  requestedBy: z.string(),
  roleRequired: demoRoleSchema,
  status: approvalStatusSchema,
  decidedBy: z.string().nullable(),
  decidedAt: isoDateTimeSchema.nullable(),
  reason: z.string().nullable(),
  createdAt: isoDateTimeSchema
});

export const listApprovalsQuerySchema = paginationQuerySchema.extend({
  status: approvalStatusSchema.optional(),
  roleRequired: demoRoleSchema.optional()
});

export const decideApprovalBodySchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  decidedBy: z.string().min(2),
  reason: z.string().optional()
});

export type ApprovalDto = z.infer<typeof approvalDtoSchema>;
export type DecideApprovalBody = z.infer<typeof decideApprovalBodySchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
