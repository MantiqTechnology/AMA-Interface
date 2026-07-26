import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD');
const moneyMinorSchema = z.coerce.number().int().min(0);

export const rateLifecycleStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']);
export const ratePricingScopeSchema = z.enum([
  'PUBLIC',
  'PUBLIC_COUNTER',
  'CUSTOMER_CONTRACT',
  'CORPORATE_CONTRACT',
  'AGENT_CONTRACT',
  'CARGO_CONTRACT',
  'CHARTER_CONTRACT',
  'ROUTE',
  'STATION_PAIR',
  'INTERNAL'
]);
export const rateUnitSchema = z.enum([
  'PER_FLIGHT',
  'PER_KG',
  'PER_PIECE',
  'PER_PASSENGER',
  'PER_SEGMENT',
  'FLAT'
]);
export const rateBookingChannelSchema = z.enum([
  'COUNTER',
  'AGENT',
  'CORPORATE',
  'CARGO',
  'CHARTER',
  'WEBSITE',
  'INTERNAL_OPERATIONS',
  'API_PARTNER'
]);
export const cargoPriceBasisSchema = z.enum([
  'ACTUAL_WEIGHT',
  'VOLUME_WEIGHT',
  'VOLUMETRIC_WEIGHT',
  'CHARGEABLE_WEIGHT',
  'PIECE',
  'FLAT'
]);

export const rateCardsListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const rateCardsIdParamsSchema = z.object({ id: z.string().min(1) });
export const rateCardsStatusSchema = z.object({ isActive: z.boolean() });

export const rateCardsInputSchema = z.object({
  expectedVersion: z.coerce.number().int().positive().optional(),
  rateCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  rateName: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  serviceType: z.enum(['CHARTER', 'PASSENGER', 'CARGO']),
  lifecycleStatus: rateLifecycleStatusSchema.optional(),
  originStationId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  destinationStationId: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  routeId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  customerId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  agentId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  contractId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  aircraftType: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  aircraftTypeId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  currencyId: z.string().trim().min(1),
  taxCodeId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  baseRate: moneyMinorSchema,
  rateUnit: rateUnitSchema,
  pricingScope: ratePricingScopeSchema.optional().default('PUBLIC_COUNTER'),
  bookingChannel: rateBookingChannelSchema.optional().default('COUNTER'),
  passengerType: z
    .preprocess(emptyToNull, z.enum(['ADULT', 'CHILD', 'INFANT']).nullable())
    .optional()
    .default(null),
  cargoPriceBasis: z
    .preprocess(emptyToNull, cargoPriceBasisSchema.nullable())
    .optional()
    .default(null),
  ratePriority: z.coerce.number().int().min(0).max(10_000).optional().default(100),
  minimumCharge: z.preprocess(emptyToNull, moneyMinorSchema.nullable()).optional().default(null),
  demoUsageNote: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  publicNote: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  internalPricingNote: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  effectiveFrom: dateOnlySchema,
  effectiveTo: z.preprocess(emptyToNull, dateOnlySchema.nullable()).optional().default(null)
});

export const duplicateRateCardSchema = z.object({
  rateCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  effectiveFrom: z.preprocess(emptyToNull, dateOnlySchema.nullable()).optional().default(null)
});

export const ratePreviewRequestSchema = z.object({
  serviceDate: dateOnlySchema,
  originStationId: z.string().trim().min(1),
  destinationStationId: z.string().trim().min(1),
  customerId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  agentId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  contractId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  bookingChannelCode: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  cargo: z
    .object({
      actualWeightGrams: z.coerce.number().int().nonnegative(),
      volumetricWeightGrams: z.coerce.number().int().nonnegative().nullable().optional(),
      chargeableWeightGrams: z.coerce.number().int().nonnegative()
    })
    .optional()
});

export type RateCardListQuery = z.infer<typeof rateCardsListQuerySchema>;
export type RateCardInput = z.infer<typeof rateCardsInputSchema>;
export type DuplicateRateCardInput = z.infer<typeof duplicateRateCardSchema>;
export type RatePreviewRequestDto = z.infer<typeof ratePreviewRequestSchema>;

export type RateCardDto = {
  id: string;
  rateCode: string;
  rateName: string | null;
  serviceType: string;
  lifecycleStatus: string;
  pricingScope: string;
  originStationId: string | null;
  destinationStationId: string | null;
  routeId: string | null;
  customerId: string | null;
  agentId: string | null;
  contractId: string | null;
  aircraftType: string | null;
  aircraftTypeId: string | null;
  currencyId: string;
  taxCodeId: string | null;
  baseRate: number;
  rateUnit: string;
  bookingChannel: string;
  passengerType: string | null;
  cargoPriceBasis: string | null;
  ratePriority: number;
  minimumCharge: number | null;
  demoUsageNote: string | null;
  publicNote: string | null;
  internalPricingNote: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  rateFamilyId: string | null;
  supersedesRateId: string | null;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialRateDetailDto = RateCardDto & {
  origin: { id: string; stationCode: string; stationName: string } | null;
  destination: { id: string; stationCode: string; stationName: string } | null;
  route: { id: string; routeCode: string; displayName: string } | null;
  customer: { id: string; accountCode: string; accountName: string } | null;
  agent: { id: string; agentCode: string; agentName: string } | null;
  contract: {
    id: string;
    contractNumber: string;
    contractName: string | null;
    status: string;
  } | null;
  aircraftTypeSummary: { id: string; typeCode: string; typeName: string } | null;
  currency: { code: string; name: string; minorUnit: number };
  taxRule: { id: string; code: string; name: string; rateBasisPoints: number } | null;
  quickSummary: {
    activeContractCount: number | null;
    linkedBookingChannelCount: number | null;
    appliedTransactionCount: number | null;
    lastAppliedAt: string | null;
    asOf: string;
  } | null;
};

export type RateBookingChannelDto = {
  id: string;
  bookingChannelCode: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  status: string;
};

export type RateContractDto = {
  id: string;
  contractNumber: string;
  customerName: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  status: string;
  rateScope: string | null;
  documentId: string | null;
};

export type RateCoverageDto = {
  origin: CommercialRateDetailDto['origin'];
  destination: CommercialRateDetailDto['destination'];
  route: CommercialRateDetailDto['route'];
  applicableSectors: string[];
  aircraftType: CommercialRateDetailDto['aircraftTypeSummary'];
  serviceType: string;
  customer: CommercialRateDetailDto['customer'];
  agent: CommercialRateDetailDto['agent'];
  contract: CommercialRateDetailDto['contract'];
  bookingChannelCode: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type RateHistoryItemDto = {
  id: string;
  action: string;
  actorName: string | null;
  changedFields: string[];
  occurredAt: string;
  requestId?: string | null;
};

export type RateUsageSummaryDto = NonNullable<CommercialRateDetailDto['quickSummary']>;

export type RatePreviewDto = {
  rateCardId: string;
  rateVersion: number;
  currencyCode: string;
  chargeableWeightGrams: number | null;
  baseRateMinor: string;
  variableChargeMinor: string;
  minimumChargeMinor: string | null;
  appliedBaseChargeMinor: string;
  surchargeLines: Array<{ code: string; description: string; amountMinor: string }>;
  subtotalMinor: string;
  taxMinor: string;
  totalMinor: string;
  calculationTrace: string[];
};

export type SelectedRateSnapshotDto = {
  rateCardId: string;
  rateVersion: number;
  rateCodeSnapshot: string;
  currencySnapshot: string;
  baseRateSnapshot: number;
  minimumChargeSnapshot: number | null;
  rateUnitSnapshot: string;
  priceBasisSnapshot: string | null;
  taxRuleSnapshot: string | null;
  pricingScopeSnapshot: string;
  taxRateBasisPoints: number;
};

export type RateCardOption = {
  id: string;
  rateCode: string;
  serviceType: string;
};
