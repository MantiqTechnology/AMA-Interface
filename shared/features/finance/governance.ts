import { z } from 'zod';

export const financialExportBodySchema = z.object({
  reportType: z.enum([
    'JOURNAL',
    'GENERAL_LEDGER',
    'TRIAL_BALANCE',
    'AR',
    'AP',
    'BANK_RECONCILIATION',
    'PROFIT_LOSS',
    'BALANCE_SHEET'
  ]),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/u)
    .optional()
});
export const traceabilityQuerySchema = z
  .object({
    journalId: z.string().min(1).optional(),
    sourceType: z.string().min(1).optional(),
    sourceId: z.string().min(1).optional()
  })
  .refine((value) => Boolean(value.journalId || (value.sourceType && value.sourceId)), {
    message: 'journalId or sourceType and sourceId are required'
  });
export const financialAuditQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).default(250)
});
export const financialExportQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export type FinancialReportType = z.infer<typeof financialExportBodySchema>['reportType'];
export type FinancialExportSummaryDto = {
  id: string;
  reportType: FinancialReportType;
  format: string;
  periodCode: string | null;
  requestedBy: string;
  requestedRole: string;
  rowCount: number;
  filename: string;
  contentHash: string;
  createdAt: string;
};
export type FinanceTraceabilityDto = {
  source: { type: string; id: string; route: string | null };
  handoff: { id: string; status: string } | null;
  accountingEvent: { id: string; eventType: string; postingStatus: string } | null;
  journal: { id: string; journalNumber: string; status: string } | null;
  journalLines: Array<{ id: string; accountCode: string; debitMinor: number; creditMinor: number }>;
  reportLinks: string[];
};
