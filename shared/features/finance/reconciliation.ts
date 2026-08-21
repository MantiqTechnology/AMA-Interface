import { z } from 'zod';

export const cashBankQuerySchema = z.object({ accountId: z.string().trim().min(1) });
export const bankStatementBodySchema = z.object({
  cashBankAccountId: z.string().trim().min(1),
  statementNumber: z.string().trim().min(1),
  periodStart: z.string().trim().min(10),
  periodEnd: z.string().trim().min(10),
  openingBalanceMinor: z.number().int(),
  closingBalanceMinor: z.number().int(),
  lines: z
    .array(
      z.object({
        bookingDate: z.string().trim().min(10),
        valueDate: z.string().nullable(),
        reference: z.string().nullable(),
        description: z.string().trim().min(1),
        amountMinor: z
          .number()
          .int()
          .refine((value) => value !== 0),
        balanceMinor: z.number().int().nullable()
      })
    )
    .min(1)
});

export type CashBookTransactionDto = {
  journalLineId: string;
  journalEntryId: string;
  journalNumber: string;
  postingDate: string;
  amountMinor: number;
  sourceType: string;
  sourceId: string;
  sourceReference: string;
  description: string;
  reconciled: boolean;
};

export type BankStatementDto = {
  id: string;
  cashBankAccountId: string;
  statementNumber: string;
  periodStart: string;
  periodEnd: string;
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  status: string;
  summary: { totalLines: number; reconciledLines: number; unmatchedLines: number };
  lines: Array<{
    id: string;
    bookingDate: string;
    valueDate: string | null;
    reference: string | null;
    description: string;
    amountMinor: number;
    balanceMinor: number | null;
    status: string;
    journalLineId: string | null;
  }>;
};
