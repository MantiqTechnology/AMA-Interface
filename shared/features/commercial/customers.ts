import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const customersListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const customersIdParamsSchema = z.object({ id: z.string().min(1) });
export const customersStatusSchema = z.object({ isActive: z.boolean() });
export const customersInputSchema = z.object({
  accountType: z.enum(['INDIVIDUAL', 'CORPORATE', 'GOVERNMENT', 'AGENCY']),
  accountCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  accountName: z.string().trim().min(1),
  contactPerson: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  phone: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  email: z.preprocess(emptyToNull, z.string().trim().email().nullable()).optional().default(null),
  billingAddress: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  paymentTermId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  creditLimit: z
    .preprocess(emptyToNull, z.coerce.number().int().min(0).nullable())
    .optional()
    .default(null)
});

export type CustomerListQuery = z.infer<typeof customersListQuerySchema>;
export type CustomerInput = z.infer<typeof customersInputSchema>;
export type CustomerDto = {
  id: string;
  accountType: string;
  accountCode: string;
  accountName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
  paymentTermId: string | null;
  creditLimit: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type CustomerOption = {
  id: string;
  accountCode: string;
  accountName: string;
};
