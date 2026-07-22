import { z } from 'zod';

export const accountingPostDemoEventsSchema = z
  .object({
    source: z.enum(['all', 'inventory', 'ticketing', 'flight']).optional().default('all')
  })
  .default({ source: 'all' });

export const accountingListQuerySchema = z.object({
  status: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(250).default(100),
  offset: z.coerce.number().int().nonnegative().default(0)
});

export const journalIdParamsSchema = z.object({ id: z.string().trim().min(1) });

export const reverseJournalBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
  postingDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .optional()
});

export const processInventoryEventsBodySchema = z
  .object({
    batchSize: z.coerce.number().int().positive().max(100).default(25)
  })
  .default({ batchSize: 25 });

export const actorReferenceSchema = z.object({
  id: z.string(),
  label: z.string()
});

export const dimensionReferenceSchema = z.object({
  id: z.string(),
  label: z.string(),
  technicalValue: z.string().nullable(),
  route: z.string().nullable()
});

export const matchedPolicyConditionSchema = z.object({
  id: z.string(),
  label: z.string(),
  field: z.string(),
  operator: z.string(),
  expected: z.string(),
  actual: z.string(),
  result: z.enum(['MATCHED', 'NOT_MATCHED', 'MISSING'])
});

export const journalEvidenceItemSchema = z.object({
  type: z.string(),
  label: z.string(),
  reference: z.string().nullable(),
  status: z.enum(['VERIFIED', 'AVAILABLE', 'MISSING', 'NOT_REQUIRED']),
  recordedAt: z.string().nullable(),
  recordedBy: actorReferenceSchema.nullable(),
  sourceRoute: z.string().nullable(),
  metadata: z.record(z.unknown()).optional()
});

export const journalAuditEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  timestamp: z.string().nullable(),
  actor: actorReferenceSchema.nullable(),
  source: z.enum(['SYSTEM', 'USER', 'POLICY_ENGINE']),
  status: z.enum(['SUCCESS', 'INFO', 'WARNING', 'FAILED']),
  relatedResource: z
    .object({
      type: z.string(),
      id: z.string(),
      label: z.string(),
      route: z.string().nullable()
    })
    .optional()
});

export const accountingJournalDetailSchema = z.object({
  id: z.string(),
  journalNumber: z.string(),
  status: z.string(),
  journalType: z.enum(['SYSTEM', 'MANUAL', 'REVERSAL']),
  documentDate: z.string().nullable(),
  transactionDate: z.string(),
  postingDate: z.string().nullable(),
  description: z.string(),
  currency: z.string(),
  event: z
    .object({
      id: z.string(),
      eventType: z.string(),
      eventLabel: z.string(),
      sourceType: z.string(),
      sourceId: z.string(),
      sourceLabel: z.string().nullable(),
      sourceRoute: z.string().nullable(),
      occurredAt: z.string(),
      accountingDate: z.string()
    })
    .nullable(),
  policy: z
    .object({
      code: z.string(),
      name: z.string(),
      version: z.union([z.number(), z.string()]),
      treatment: z.string(),
      effectiveFrom: z.string().nullable(),
      effectiveTo: z.string().nullable(),
      priority: z.number().nullable(),
      approvalStatus: z.string().nullable(),
      approvalRequired: z.boolean(),
      debitAccountCode: z.string().nullable(),
      creditAccountCode: z.string().nullable(),
      snapshot: z.unknown(),
      isHistoricalSnapshot: z.boolean()
    })
    .nullable(),
  dimensions: z.object({
    station: dimensionReferenceSchema.nullable(),
    aircraft: dimensionReferenceSchema.nullable(),
    flight: dimensionReferenceSchema.nullable(),
    ticket: dimensionReferenceSchema.nullable(),
    workOrder: dimensionReferenceSchema.nullable(),
    component: dimensionReferenceSchema.nullable(),
    costCenter: dimensionReferenceSchema.nullable()
  }),
  lines: z.array(
    z.object({
      id: z.string(),
      lineNumber: z.number(),
      accountId: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      debitMinor: z.number(),
      creditMinor: z.number(),
      description: z.string().nullable(),
      dimensions: z.array(dimensionReferenceSchema)
    })
  ),
  totals: z.object({
    debitMinor: z.number(),
    creditMinor: z.number(),
    balanced: z.boolean()
  }),
  evidence: z.array(journalEvidenceItemSchema),
  matchedConditions: z.array(matchedPolicyConditionSchema),
  auditTrail: z.array(journalAuditEventSchema),
  approval: z.object({
    createdBy: actorReferenceSchema.nullable(),
    approvedBy: actorReferenceSchema.nullable(),
    postedBy: actorReferenceSchema.nullable()
  }),
  reversal: z
    .object({
      originalJournalId: z.string().optional(),
      originalJournalNumber: z.string().optional(),
      reversalJournalId: z.string().optional(),
      reversalJournalNumber: z.string().optional(),
      reversedAt: z.string().nullable(),
      reversedBy: actorReferenceSchema.nullable()
    })
    .nullable(),
  asset: z
    .object({
      id: z.string(),
      assetNumber: z.string(),
      status: z.string(),
      sourceRoute: z.string().nullable(),
      depreciationScheduleCount: z.number(),
      scheduledCount: z.number(),
      cancelledCount: z.number()
    })
    .nullable(),
  costBasis: z
    .object({
      heading: z.string(),
      amountLabel: z.string(),
      amountMinor: z.number(),
      currency: z.string(),
      items: z.array(z.object({ label: z.string(), value: z.string() }))
    })
    .nullable(),
  actions: z.object({
    canReverse: z.boolean(),
    canViewGeneralLedger: z.boolean()
  })
});

export type AccountingPostDemoEventsInput = z.infer<typeof accountingPostDemoEventsSchema>;
export type AccountingListQuery = z.infer<typeof accountingListQuerySchema>;
export type ReverseJournalInput = z.infer<typeof reverseJournalBodySchema>;
export type ProcessInventoryEventsInput = z.infer<typeof processInventoryEventsBodySchema>;
export type ActorReference = z.infer<typeof actorReferenceSchema>;
export type DimensionReference = z.infer<typeof dimensionReferenceSchema>;
export type MatchedPolicyCondition = z.infer<typeof matchedPolicyConditionSchema>;
export type JournalEvidenceItem = z.infer<typeof journalEvidenceItemSchema>;
export type JournalAuditEvent = z.infer<typeof journalAuditEventSchema>;
export type AccountingJournalDetail = z.infer<typeof accountingJournalDetailSchema>;

export type AccountingPostSummaryDto = {
  eventsCreated: number;
  journalsPosted: number;
  skipped: number;
};

export type InventoryAccountingProcessSummaryDto = {
  processed: number;
  skipped: number;
  exceptions: number;
  duplicates: number;
};

export type JournalEntryDto = {
  id: string;
  journalNumber: string;
  accountingEventId: string;
  status: string;
  sourceType: string;
  sourceId: string;
  transactionDate: string;
  postingDate: string | null;
  serviceDate: string | null;
  currencyCode: string;
  policyCode: string;
  policyVersion: number;
  reversalOfJournalEntryId: string | null;
  memo: string;
};

export type GeneralLedgerLineDto = {
  journalLineId: string;
  journalEntryId: string;
  journalNumber: string;
  postingDate: string;
  transactionDate: string;
  serviceDate: string | null;
  sourceType: string;
  sourceId: string;
  policyCode: string;
  periodCode: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitMinor: number;
  creditMinor: number;
  stationId: string | null;
  aircraftId: string | null;
  flightId: string | null;
  workOrderReference: string | null;
  costCenterId: string | null;
  description: string;
};

export type AccountingExceptionDto = {
  id: string;
  accountingEventId: string | null;
  eventType: string;
  sourceType: string;
  sourceId: string;
  reasonCode:
    | 'NO_MATCHING_POLICY'
    | 'AMBIGUOUS_POLICY'
    | 'MISSING_CONTEXT'
    | 'INVALID_ACCOUNT'
    | 'CLOSED_PERIOD'
    | 'UNBALANCED_JOURNAL'
    | 'MANUAL_REVIEW_REQUIRED';
  message: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
};

export type AccountingPolicyDto = {
  id: string;
  policyCode: string;
  policyName: string;
  eventType: string;
  productAccountingProfileId: string | null;
  debitAccountCode: string;
  debitAccountName: string;
  creditAccountCode: string;
  creditAccountName: string;
  treatment: string;
  capitalizationCandidate: boolean;
  requiredDimensions: string[];
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  approvalStatus: string;
  version: number;
  isActive: boolean;
};

export type AccountingAssetDto = {
  id: string;
  assetNumber: string;
  sourceJournalEntryId: string;
  sourceType: string;
  sourceId: string;
  assetName: string;
  aircraftId: string | null;
  componentSerialId: string | null;
  acquisitionDate: string;
  costMinor: number;
  currencyCode: string;
  usefulLifeMonths: number;
  status: string;
  depreciationPreview: Array<{
    periodCode: string;
    depreciationAmountMinor: number;
    status: string;
  }>;
};
