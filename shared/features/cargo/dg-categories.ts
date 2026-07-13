import { z } from 'zod';

export const dgCategoriesListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const dgCategoriesIdParamsSchema = z.object({ id: z.string().min(1) });
export const dgCategoriesStatusSchema = z.object({ isActive: z.boolean() });
export const dgCategoriesInputSchema = z.object({
  dgCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  dgClass: z.string().trim().min(1),
  description: z.string().trim().min(1),
  handlingInstruction: z.string().trim().min(1),
  requiresSpecialApproval: z.boolean().optional().default(false)
});

export type DgCategoryListQuery = z.infer<typeof dgCategoriesListQuerySchema>;
export type DgCategoryInput = z.infer<typeof dgCategoriesInputSchema>;
export type DgCategoryDto = {
  id: string;
  dgCode: string;
  dgClass: string;
  description: string;
  handlingInstruction: string;
  requiresSpecialApproval: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type DgCategoryOption = {
  id: string;
  dgCode: string;
  description: string;
};
