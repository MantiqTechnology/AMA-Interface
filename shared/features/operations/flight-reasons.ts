import { z } from 'zod';

export const flightReasonsListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const flightReasonsIdParamsSchema = z.object({ id: z.string().min(1) });
export const flightReasonsStatusSchema = z.object({ isActive: z.boolean() });
export const flightReasonsInputSchema = z.object({
  reasonCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  reasonName: z.string().trim().min(1).optional().default('Flight Reason'),
  reasonType: z.enum(['DELAY', 'CANCELLED', 'DIVERTED', 'REOPENED_FOR_CORRECTION']),
  category: z.string().trim().min(1),
  description: z.string().trim().min(1),
  requiresNote: z.boolean().optional().default(false),
  affectsOperationalKpi: z.boolean().optional().default(true),
  affectsFinanceReview: z.boolean().optional().default(false),
  dashboardSeverity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional().default('WARNING')
});

export type FlightReasonListQuery = z.infer<typeof flightReasonsListQuerySchema>;
export type FlightReasonInput = z.infer<typeof flightReasonsInputSchema>;
export type FlightReasonDto = {
  id: string;
  reasonCode: string;
  reasonName: string;
  reasonType: string;
  category: string;
  description: string;
  requiresNote: boolean;
  affectsOperationalKpi: boolean;
  affectsFinanceReview: boolean;
  dashboardSeverity: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type FlightReasonOption = {
  id: string;
  reasonCode: string;
  reasonName: string;
};
