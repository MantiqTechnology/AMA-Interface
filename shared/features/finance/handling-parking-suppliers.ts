import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const handlingParkingSuppliersListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const handlingParkingSuppliersIdParamsSchema = z.object({ id: z.string().min(1) });
export const handlingParkingSuppliersStatusSchema = z.object({ isActive: z.boolean() });
export const handlingParkingSuppliersInputSchema = z.object({
  supplierCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  supplierName: z.string().trim().min(1),
  stationId: z.string().trim().min(1),
  serviceType: z.enum(['HANDLING', 'PARKING', 'BOTH']),
  referenceRate: z
    .preprocess(emptyToNull, z.coerce.number().int().min(0).nullable())
    .optional()
    .default(null),
  currencyId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  contactPerson: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  phone: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
});

export type HandlingParkingSupplierListQuery = z.infer<
  typeof handlingParkingSuppliersListQuerySchema
>;
export type HandlingParkingSupplierInput = z.infer<typeof handlingParkingSuppliersInputSchema>;
export type HandlingParkingSupplierDto = {
  id: string;
  supplierCode: string;
  supplierName: string;
  stationId: string;
  serviceType: string;
  referenceRate: number | null;
  currencyId: string | null;
  contactPerson: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type HandlingParkingSupplierOption = {
  id: string;
  supplierCode: string;
  supplierName: string;
};
