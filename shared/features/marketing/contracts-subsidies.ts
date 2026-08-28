import { z } from 'zod';

const dateOnlySchema = z.string().date();

function querySchema<T extends z.ZodRawShape>(shape: T) {
  return z
    .object({
      from: dateOnlySchema.optional(),
      to: dateOnlySchema.optional(),
      ...shape
    })
    .refine((query) => !query.from || !query.to || query.from <= query.to, {
      message: 'Start date must be on or before end date.',
      path: ['from']
    });
}

const searchField = z.string().trim().max(100).optional().default('');

export const contractsSubsidiesQuerySchema = querySchema({
  search: z.string().trim().max(100).optional().default(''),
  status: z
    .enum(['ACTIVE', 'DRAFT', 'EXPIRED', 'TERMINATED', 'ARCHIVED', 'RECOGNIZED', 'PENDING'])
    .optional(),
  type: z
    .enum([
      'CUSTOMER_CONTRACT',
      'AGENT_CONTRACT',
      'RATE_CONTRACT',
      'PASSENGER',
      'CARGO',
      'CHARTER',
      'FINANCE_READ_MODEL',
      'CONTRACT_SUBSIDY'
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const contractsSubsidiesOverviewQuerySchema = querySchema({});
export const contractsSubsidiesContractsQuerySchema = querySchema({
  search: searchField,
  status: z.enum(['ACTIVE', 'DRAFT', 'EXPIRED', 'TERMINATED']).optional(),
  type: z.enum(['CUSTOMER_CONTRACT', 'AGENT_CONTRACT', 'RATE_CONTRACT']).optional()
});
export const contractsSubsidiesProgramsQuerySchema = querySchema({
  search: searchField,
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  type: z.enum(['PASSENGER', 'CARGO', 'CHARTER']).optional()
});
export const contractsSubsidiesAbsorptionQuerySchema = querySchema({
  status: z.enum(['RECOGNIZED', 'PENDING']).optional(),
  type: z.enum(['FINANCE_READ_MODEL']).optional()
});
export const contractsSubsidiesActivityQuerySchema = querySchema({
  type: z.enum(['CUSTOMER_CONTRACT', 'CONTRACT_SUBSIDY', 'FINANCE_READ_MODEL']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});
export const contractsSubsidiesHistoryQuerySchema = querySchema({});
export const contractsSubsidiesRenewalsQuerySchema = querySchema({ search: searchField });

export type ContractsSubsidiesQuery = z.infer<typeof contractsSubsidiesQuerySchema>;

export type ContractSubsidyOverviewDto = {
  activeContractCount: number;
  expiringContractCount: number;
  activeSubsidyProgramCount: number;
  allocatedBudgetMinor: string;
  consumedBudgetMinor: string;
  remainingBudgetMinor: string;
  absorptionPercent: number | null;
  pendingRenewalCount: number;
  terminatedContractCount: number;
  unbilledExposureMinor: string | null;
  currencyCode: string;
  asOf: string;
  contractSourceMix: ContractSourceMixItemDto[];
  upcomingRenewals: ContractSubsidyRenewalItemDto[];
};

export type ContractSourceMixItemDto = {
  sourceType: CommercialContractPortfolioItemDto['sourceType'];
  label: string;
  count: number;
  percentage: number;
};

export type ContractSubsidyRenewalItemDto = {
  id: string;
  entityType: 'CONTRACT' | 'SUBSIDY';
  sourceType: CommercialContractPortfolioItemDto['sourceType'] | 'SUBSIDY_PROGRAM';
  code: string;
  name: string;
  counterparty: string | null;
  endDate: string;
  daysLeft: number;
  status: string;
  renewalStatus: string | null;
};

export type CommercialContractPortfolioItemDto = {
  id: string;
  sourceType: 'CUSTOMER_CONTRACT' | 'AGENT_CONTRACT' | 'RATE_CONTRACT';
  contractNumber: string;
  partnerName: string | null;
  contractType: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  status: string;
  renewalStatus: string | null;
  linkedRateCode: string | null;
  subsidyProgramCode: string | null;
  documentId: string | null;
};

export type SubsidyProgramDto = {
  id: string;
  programCode: string;
  programName: string;
  sponsorName: string;
  serviceScope: string;
  routeScope: string | null;
  contractNumber: string | null;
  currencyCode: string;
  allocatedBudgetMinor: string;
  consumedBudgetMinor: string;
  remainingBudgetMinor: string;
  absorptionPercent: number | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  lifecycleStatus: string;
  renewalStatus: string | null;
  asOf: string;
};

export type SubsidyAbsorptionLineDto = {
  id: string;
  programCode: string;
  sourceType: string;
  sourceId: string | null;
  description: string;
  amountMinor: string;
  consumedAt: string;
  status: string;
};

export type ContractSubsidyActivityItemDto = {
  id: string;
  activityType: string;
  title: string;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  occurredAt: string;
};

export type ContractSubsidyHistoryItemDto = {
  id: string;
  action: string;
  actorName: string | null;
  changedFields: string[];
  occurredAt: string;
  requestId?: string | null;
};
