import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const taxCodesListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const taxCodesIdParamsSchema = z.object({ id: z.string().min(1) });
export const taxCodesStatusSchema = z.object({ isActive: z.boolean() });
export const taxCodesInputSchema = z.object({
  taxCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  taxName: z.string().trim().min(1),
  taxRateBasisPoints: z.coerce.number().int().min(0),
  taxType: z.enum(['NON_TAX', 'VAT', 'WITHHOLDING']),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD'),
  effectiveTo: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD')
        .nullable()
    )
    .optional()
    .default(null)
});

export type TaxCodeListQuery = z.infer<typeof taxCodesListQuerySchema>;
export type TaxCodeInput = z.infer<typeof taxCodesInputSchema>;
export type TaxCodeDto = {
  id: string;
  taxCode: string;
  taxName: string;
  taxRateBasisPoints: number;
  taxType: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type TaxCodeOption = {
  id: string;
  taxCode: string;
  taxName: string;
};
