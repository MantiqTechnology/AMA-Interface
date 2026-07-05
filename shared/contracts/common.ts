import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().min(1)
});

export const moneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3).default('IDR')
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(25),
  offset: z.coerce.number().int().nonnegative().default(0)
});

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const stationCodeSchema = z.string().min(3).max(6).toUpperCase();
