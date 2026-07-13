import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const agentsListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const agentsIdParamsSchema = z.object({ id: z.string().min(1) });
export const agentsStatusSchema = z.object({ isActive: z.boolean() });
export const agentsInputSchema = z.object({
  agentCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  agentName: z.string().trim().min(1),
  agentType: z.enum(['TICKET_AGENT', 'CARGO_AGENT', 'STATION_COUNTER']),
  stationId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  commissionBasisPoints: z
    .preprocess(emptyToNull, z.coerce.number().int().min(0).nullable())
    .optional()
    .default(null),
  contactPerson: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  phone: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
});

export type AgentListQuery = z.infer<typeof agentsListQuerySchema>;
export type AgentInput = z.infer<typeof agentsInputSchema>;
export type AgentDto = {
  id: string;
  agentCode: string;
  agentName: string;
  agentType: string;
  stationId: string | null;
  commissionBasisPoints: number | null;
  contactPerson: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type AgentOption = {
  id: string;
  agentCode: string;
  agentName: string;
};
