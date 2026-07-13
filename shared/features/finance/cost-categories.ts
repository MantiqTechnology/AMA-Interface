import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const costCategoriesListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const costCategoriesIdParamsSchema = z.object({ id: z.string().min(1) });
export const costCategoriesStatusSchema = z.object({ isActive: z.boolean() });
export const costCategoriesInputSchema = z.object({
  categoryCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  categoryName: z.string().trim().min(1),
  costGroup: z.string().trim().min(1),
  defaultCoaId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
});

export type CostCategoryListQuery = z.infer<typeof costCategoriesListQuerySchema>;
export type CostCategoryInput = z.infer<typeof costCategoriesInputSchema>;
export type CostCategoryDto = {
  id: string;
  categoryCode: string;
  categoryName: string;
  costGroup: string;
  defaultCoaId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type CostCategoryOption = {
  id: string;
  categoryCode: string;
  categoryName: string;
};
