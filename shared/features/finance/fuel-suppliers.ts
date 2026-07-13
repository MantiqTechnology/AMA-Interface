import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const fuelSuppliersListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const fuelSuppliersIdParamsSchema = z.object({ id: z.string().min(1) });
export const fuelSuppliersStatusSchema = z.object({ isActive: z.boolean() });
export const fuelSuppliersInputSchema = z.object({
  supplierCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  supplierName: z.string().trim().min(1),
  stationId: z.string().trim().min(1),
  fuelType: z.enum(['AVTUR', 'AVGAS']),
  referencePricePerLitre: z.coerce.number().int().min(0),
  currencyId: z.string().trim().min(1),
  contactPerson: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  phone: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
});

export type FuelSupplierListQuery = z.infer<typeof fuelSuppliersListQuerySchema>;
export type FuelSupplierInput = z.infer<typeof fuelSuppliersInputSchema>;
export type FuelSupplierDto = {
  id: string;
  supplierCode: string;
  supplierName: string;
  stationId: string;
  fuelType: string;
  referencePricePerLitre: number;
  currencyId: string;
  contactPerson: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type FuelSupplierOption = {
  id: string;
  supplierCode: string;
  supplierName: string;
};
