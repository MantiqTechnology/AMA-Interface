import { z } from 'zod';

export const currenciesListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const currenciesIdParamsSchema = z.object({ id: z.string().min(1) });
export const currenciesStatusSchema = z.object({ isActive: z.boolean() });
export const currenciesInputSchema = z.object({
  currencyCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  currencyName: z.string().trim().min(1),
  symbol: z.string().trim().min(1),
  decimalPlaces: z.coerce.number().int().min(0)
});

export type CurrencyListQuery = z.infer<typeof currenciesListQuerySchema>;
export type CurrencyInput = z.infer<typeof currenciesInputSchema>;
export type CurrencyDto = {
  id: string;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type CurrencyOption = {
  id: string;
  currencyCode: string;
  currencyName: string;
};
