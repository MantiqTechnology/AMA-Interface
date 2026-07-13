import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const chartOfAccountsListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const chartOfAccountsIdParamsSchema = z.object({ id: z.string().min(1) });
export const chartOfAccountsStatusSchema = z.object({ isActive: z.boolean() });
export const chartOfAccountsInputSchema = z.object({
  accountCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  accountName: z.string().trim().min(1),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  normalBalance: z.enum(['DEBIT', 'CREDIT']),
  parentAccountId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  isPostable: z.boolean().optional().default(true)
});

export type ChartOfAccountListQuery = z.infer<typeof chartOfAccountsListQuerySchema>;
export type ChartOfAccountInput = z.infer<typeof chartOfAccountsInputSchema>;
export type ChartOfAccountDto = {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  parentAccountId: string | null;
  isPostable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type ChartOfAccountOption = {
  id: string;
  accountCode: string;
  accountName: string;
};
