import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const vendorsListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const vendorsIdParamsSchema = z.object({ id: z.string().min(1) });
export const vendorsStatusSchema = z.object({ isActive: z.boolean() });
export const vendorsInputSchema = z.object({
  vendorCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  vendorName: z.string().trim().min(1),
  vendorType: z.enum([
    'HANDLING',
    'PARKING',
    'ACCOMMODATION',
    'TRANSPORT',
    'CATERING',
    'MAINTENANCE',
    'GENERAL'
  ]),
  stationId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  contactPerson: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  phone: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  email: z.preprocess(emptyToNull, z.string().trim().email().nullable()).optional().default(null),
  paymentTermId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null)
});

export type VendorListQuery = z.infer<typeof vendorsListQuerySchema>;
export type VendorInput = z.infer<typeof vendorsInputSchema>;
export type VendorDto = {
  id: string;
  vendorCode: string;
  vendorName: string;
  vendorType: string;
  stationId: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  paymentTermId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type VendorOption = {
  id: string;
  vendorCode: string;
  vendorName: string;
};
