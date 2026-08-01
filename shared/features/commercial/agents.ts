import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const agentsListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const agentsIdParamsSchema = z.object({ id: z.string().min(1) });
export const agentsStatusSchema = z.object({ isActive: z.boolean() });
export const agentTypeSchema = z.enum([
  'TICKET_AGENT',
  'CARGO_AGENT',
  'STATION_COUNTER',
  'OTA',
  'TRAVEL_AGENCY',
  'SALES_AGENT',
  'CORPORATE_AGENT',
  'ONLINE_CHANNEL',
  'OTHER'
]);
export const agentLifecycleStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'INACTIVE',
  'ARCHIVED'
]);
export const agentContactTypeSchema = z.enum([
  'PRIMARY',
  'OPERATIONS',
  'SALES',
  'BOOKING',
  'FINANCE',
  'CONTRACT',
  'OTHER'
]);
export const agentCommissionTypeSchema = z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'HYBRID']);
export const commissionBasisTypeSchema = z.enum([
  'BASE_FARE',
  'NET_FARE',
  'TOTAL_BEFORE_TAX',
  'CARGO_CHARGE',
  'FIXED_PER_BOOKING',
  'FIXED_PER_SEGMENT'
]);
export const commissionRuleStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']);
export const agentsInputSchema = z.object({
  expectedVersion: z.coerce.number().int().positive().optional(),
  agentCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  agentName: z.string().trim().min(1),
  agentType: agentTypeSchema,
  stationId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  customerAccountId: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  responsiblePersonnelId: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  primaryContactId: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  bookingChannelCode: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  defaultCurrencyCode: z
    .preprocess(emptyToNull, z.string().trim().toUpperCase().nullable())
    .optional()
    .default('IDR'),
  operationalNote: z
    .preprocess(emptyToNull, z.string().trim().max(2000).nullable())
    .optional()
    .default(null),
  commissionBasisPoints: z
    .preprocess(emptyToNull, z.coerce.number().int().min(0).nullable())
    .optional()
    .default(null),
  contactPerson: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  phone: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
});
export const agentContactInputSchema = z.object({
  contactName: z.string().trim().min(1),
  roleTitle: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  department: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  email: z.preprocess(emptyToNull, z.string().trim().email().nullable()).optional().default(null),
  phone: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  contactType: agentContactTypeSchema.default('OTHER'),
  isPrimary: z.coerce.boolean().optional().default(false),
  isActive: z.coerce.boolean().optional().default(true),
  notes: z.preprocess(emptyToNull, z.string().trim().max(1000).nullable()).optional().default(null)
});
export const agentContactIdParamsSchema = agentsIdParamsSchema.extend({
  contactId: z.string().min(1)
});
export const agentCommissionRuleInputSchema = z.object({
  commissionType: agentCommissionTypeSchema.default('PERCENTAGE'),
  percentageBasisPoints: z
    .preprocess(emptyToNull, z.coerce.number().int().min(0).max(10000).nullable())
    .optional()
    .default(null),
  fixedAmountMinor: z
    .preprocess(emptyToNull, z.string().regex(/^\d+$/u).nullable())
    .optional()
    .default(null),
  currencyCode: z
    .preprocess(emptyToNull, z.string().trim().toUpperCase().nullable())
    .optional()
    .default(null),
  basisType: commissionBasisTypeSchema.default('BASE_FARE'),
  serviceTypeId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  routeId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  rateAgreementId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  effectiveUntil: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/u)
        .nullable()
    )
    .optional()
    .default(null),
  lifecycleStatus: commissionRuleStatusSchema.default('DRAFT'),
  priority: z.coerce.number().int().min(0).default(100)
});
export const agentCommissionRuleIdParamsSchema = agentsIdParamsSchema.extend({
  ruleId: z.string().min(1)
});
export const agentLifecycleCommandSchema = z.object({
  reason: z.string().trim().min(1).optional(),
  expectedVersion: z.coerce.number().int().positive().optional()
});

export type AgentListQuery = z.infer<typeof agentsListQuerySchema>;
export type AgentInput = z.infer<typeof agentsInputSchema>;
export type AgentContactInput = z.infer<typeof agentContactInputSchema>;
export type AgentCommissionRuleInput = z.infer<typeof agentCommissionRuleInputSchema>;
export type AgentDto = {
  id: string;
  agentCode: string;
  agentName: string;
  agentType: string;
  stationId: string | null;
  customerAccountId: string | null;
  responsiblePersonnelId: string | null;
  primaryContactId: string | null;
  bookingChannelCode: string | null;
  defaultCurrencyCode: string | null;
  operationalNote: string | null;
  commissionBasisPoints: number | null;
  contactPerson: string | null;
  phone: string | null;
  isActive: boolean;
  lifecycleStatus: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type AgentOption = {
  id: string;
  agentCode: string;
  agentName: string;
};
export type AgentContactDto = {
  id: string;
  agentId: string;
  contactName: string;
  roleTitle: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  contactType: string;
  isPrimary: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
export type AgentCommissionRuleDto = {
  id: string;
  agentId: string;
  commissionType: string;
  percentageBasisPoints: number | null;
  fixedAmountMinor: string | null;
  currencyCode: string | null;
  basisType: string;
  serviceTypeId: string | null;
  routeId: string | null;
  rateAgreementId: string | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  lifecycleStatus: string;
  priority: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type AgentDetailDto = AgentDto & {
  station: { id: string; stationCode: string; stationName: string } | null;
  customerAccount: {
    id: string;
    accountCode: string;
    accountName: string;
    accountType: string;
  } | null;
  responsiblePersonnel: { id: string; employeeCode: string; fullLegalName: string } | null;
  primaryContact: Pick<
    AgentContactDto,
    'id' | 'contactName' | 'roleTitle' | 'department' | 'phone' | 'email'
  > | null;
  defaultCommission: Pick<
    AgentCommissionRuleDto,
    | 'id'
    | 'commissionType'
    | 'percentageBasisPoints'
    | 'fixedAmountMinor'
    | 'currencyCode'
    | 'effectiveFrom'
    | 'effectiveUntil'
  > | null;
  quickSummary: {
    activeContractCount: number | null;
    linkedRateCount: number | null;
    totalBookingCount: number | null;
    lastBookingAt: string | null;
    lastActivityAt: string | null;
    outstandingCommissionMinor: string | null;
    currencyCode: string | null;
    asOf: string;
  } | null;
};
export type AgentRateDto = {
  id: string;
  rateCode: string;
  serviceType: string;
  route: string | null;
  currencyCode: string;
  baseRateMinor: string;
  rateUnit: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
};
export type AgentActivityItemDto = {
  id: string;
  activityType: string;
  title: string;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  occurredAt: string;
};
export type AgentHistoryItemDto = {
  id: string;
  action: string;
  actorName: string | null;
  changedFields: string[];
  occurredAt: string;
  requestId?: string | null;
};
export type AgentNoteDto = {
  id: string;
  agentId: string;
  noteType: string;
  visibility: string;
  note: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};
export type AgentContractDto = {
  id: string;
  agentId: string;
  contractNumber: string;
  contractType: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  status: string;
  signedDate: string | null;
  documentId: string | null;
  renewalStatus: string | null;
  createdAt: string;
  updatedAt: string;
};
