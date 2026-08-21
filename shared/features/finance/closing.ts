import { z } from 'zod';

export const periodCodeParamsSchema = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/u) });
export const closingRunParamsSchema = z.object({ id: z.string().min(1) });
export const closingItemBodySchema = z.object({
  itemCode: z.string().min(1),
  status: z.enum(['CLEARED', 'BLOCKED']),
  note: z.string().trim().min(3)
});
export const reopenRequestBodySchema = z.object({ reason: z.string().trim().min(5).max(500) });
export const accrualBodySchema = z.object({
  accountingDate: z.string().date(),
  amountMinor: z.number().int().positive(),
  currencyCode: z.string().length(3).default('IDR'),
  description: z.string().trim().min(3).max(500),
  evidenceReference: z.string().trim().min(1).nullable().default(null),
  stationId: z.string().nullable().default(null),
  flightId: z.string().nullable().default(null),
  aircraftId: z.string().nullable().default(null),
  costCenterId: z.string().nullable().default(null)
});
export const prepaymentBodySchema = z.object({
  paymentDate: z.string().date(),
  amountMinor: z.number().int().positive(),
  currencyCode: z.string().length(3).default('IDR'),
  description: z.string().trim().min(3).max(500),
  cashBankAccountId: z.string().min(1),
  recognitionStartDate: z.string().date(),
  recognitionPeriods: z.number().int().min(1).max(120),
  evidenceReference: z.string().trim().min(1).nullable().default(null),
  costCenterId: z.string().nullable().default(null)
});
export const adjustmentIdParamsSchema = z.object({ id: z.string().min(1) });
export const prepaymentScheduleParamsSchema = z.object({ id: z.string().min(1) });
export const depreciationRunBodySchema = z.object({
  periodCode: z.string().regex(/^\d{4}-\d{2}$/u)
});

export type ClosingChecklistItemDto = {
  code: string;
  label: string;
  status: 'PENDING' | 'CLEARED' | 'BLOCKED';
  blocker: string | null;
  sourceReference: string | null;
  note: string | null;
  checkedBy: string | null;
  checkedAt: string | null;
};

export type PeriodClosingRunDto = {
  id: string;
  periodCode: string;
  periodStatus: string;
  status: string;
  startedBy: string;
  startedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  items: ClosingChecklistItemDto[];
};

export type PeriodReopenRequestDto = {
  id: string;
  periodCode: string;
  periodStatus: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  requesterId: string;
  requestedAt: string;
  approverId: string | null;
  approvedAt: string | null;
  reopenedAt: string | null;
};

export type FinanceAdjustmentDto = {
  id: string;
  number: string;
  type: 'ACCRUAL' | 'PREPAYMENT';
  accountingDate: string;
  amountMinor: number;
  currencyCode: string;
  description: string;
  status: string;
  journalId: string | null;
  reversalJournalId: string | null;
  recognizedMinor: number;
  schedule: Array<{
    id: string;
    recognitionDate: string;
    amountMinor: number;
    status: string;
    journalId: string | null;
  }>;
};
