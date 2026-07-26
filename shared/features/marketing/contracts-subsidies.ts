import { z } from 'zod';

export const contractsSubsidiesQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  status: z.string().trim().max(40).optional()
});

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
  unbilledExposureMinor: string | null;
  currencyCode: string;
  asOf: string;
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
