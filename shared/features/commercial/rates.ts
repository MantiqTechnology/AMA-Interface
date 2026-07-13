import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const rateCardsListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const rateCardsIdParamsSchema = z.object({ id: z.string().min(1) });
export const rateCardsStatusSchema = z.object({ isActive: z.boolean() });
export const rateCardsInputSchema = z.object({
  rateCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  serviceType: z.enum(['CHARTER', 'PASSENGER', 'CARGO']),
  originStationId: z.string().trim().min(1),
  destinationStationId: z.string().trim().min(1),
  customerId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  aircraftType: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  currencyId: z.string().trim().min(1),
  taxCodeId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  baseRate: z.coerce.number().int().min(0),
  rateUnit: z.enum(['PER_FLIGHT', 'PER_PASSENGER', 'PER_KG']),
  pricingScope: z
    .enum(['PUBLIC_COUNTER', 'CORPORATE_CONTRACT', 'CARGO_CONTRACT', 'CHARTER_CONTRACT'])
    .optional()
    .default('PUBLIC_COUNTER'),
  bookingChannel: z
    .enum(['COUNTER', 'AGENT', 'CORPORATE', 'CARGO', 'CHARTER'])
    .optional()
    .default('COUNTER'),
  passengerType: z
    .preprocess(emptyToNull, z.enum(['ADULT', 'CHILD', 'INFANT']).nullable())
    .optional()
    .default(null),
  cargoPriceBasis: z
    .preprocess(
      emptyToNull,
      z.enum(['ACTUAL_WEIGHT', 'VOLUME_WEIGHT', 'CHARGEABLE_WEIGHT']).nullable()
    )
    .optional()
    .default(null),
  ratePriority: z.coerce.number().int().min(0).optional().default(100),
  minimumCharge: z
    .preprocess(emptyToNull, z.coerce.number().int().min(0).nullable())
    .optional()
    .default(null),
  demoUsageNote: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
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

export type RateCardListQuery = z.infer<typeof rateCardsListQuerySchema>;
export type RateCardInput = z.infer<typeof rateCardsInputSchema>;
export type RateCardDto = {
  id: string;
  rateCode: string;
  serviceType: string;
  originStationId: string;
  destinationStationId: string;
  customerId: string | null;
  aircraftType: string | null;
  currencyId: string;
  taxCodeId: string | null;
  baseRate: number;
  rateUnit: string;
  pricingScope: string;
  bookingChannel: string;
  passengerType: string | null;
  cargoPriceBasis: string | null;
  ratePriority: number;
  minimumCharge: number | null;
  demoUsageNote: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type RateCardOption = {
  id: string;
  rateCode: string;
  serviceType: string;
};
