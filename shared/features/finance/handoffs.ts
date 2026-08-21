import { z } from 'zod';

export const financeHandoffStatusSchema = z.enum([
  'RECEIVED',
  'VALIDATING',
  'VALIDATED',
  'ACCEPTED',
  'ACCOUNTING_EVENT_CREATED',
  'JOURNAL_CREATED',
  'POSTED',
  'EXCEPTION',
  'REJECTED'
]);

export type FinanceHandoffStatus = z.infer<typeof financeHandoffStatusSchema>;

export const financeHandoffListQuerySchema = z.object({
  search: z.string().trim().optional(),
  sourceModule: z.string().trim().optional(),
  status: financeHandoffStatusSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(250).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export type FinanceHandoffListQuery = z.infer<typeof financeHandoffListQuerySchema>;

export type FinanceHandoffDto = {
  id: string;
  sourceModule: string;
  sourceType: string;
  sourceId: string;
  sourceEventId: string;
  transactionDate: string;
  currencyCode: string;
  amountMinor: number;
  dimensions: Record<string, string>;
  status: FinanceHandoffStatus;
  accountingEventId: string | null;
  journalId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  receivedAt: string;
  validatedAt: string | null;
  acceptedAt: string | null;
  createdBy: string;
  updatedAt: string;
};

export type ReceiveFinanceHandoffInput = {
  sourceModule: string;
  sourceType: string;
  sourceId: string;
  sourceEventId: string;
  transactionDate: string;
  currencyCode: string;
  amountMinor: number;
  dimensions?: Record<string, string | null | undefined>;
  payload: Record<string, unknown>;
  createdBy: string;
};

export const receiveFinanceHandoffBodySchema = z.object({
  sourceModule: z.string().trim().min(1),
  sourceType: z.string().trim().min(1),
  sourceId: z.string().trim().min(1),
  sourceEventId: z.string().trim().min(1),
  transactionDate: z.string().trim().min(1),
  currencyCode: z.string().trim().min(3).max(3),
  amountMinor: z.number().int(),
  dimensions: z.record(z.string(), z.string().nullable()).optional(),
  payload: z.record(z.string(), z.unknown()).default({})
});

export const financeHandoffIdParamsSchema = z.object({ id: z.string().trim().min(1) });
