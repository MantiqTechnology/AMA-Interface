import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const paymentTermsListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const paymentTermsIdParamsSchema = z.object({ id: z.string().min(1) });
export const paymentTermsStatusSchema = z.object({ isActive: z.boolean() });
export const paymentTermsInputSchema = z.object({
  termCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  termName: z.string().trim().min(1),
  dueDays: z.coerce.number().int().min(0),
  description: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
});

export type PaymentTermListQuery = z.infer<typeof paymentTermsListQuerySchema>;
export type PaymentTermInput = z.infer<typeof paymentTermsInputSchema>;
export type PaymentTermDto = {
  id: string;
  termCode: string;
  termName: string;
  dueDays: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type PaymentTermOption = {
  id: string;
  termCode: string;
  termName: string;
};
