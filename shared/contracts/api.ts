import { z } from 'zod';

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional()
});

export const apiMetaSchema = z.object({
  requestId: z.string().optional(),
  count: z.number().int().nonnegative().optional(),
  demoMode: z.boolean().optional()
});

export const apiSuccessSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    ok: z.literal(true),
    data,
    meta: apiMetaSchema.optional()
  });

export const apiFailureSchema = z.object({
  ok: z.literal(false),
  error: apiErrorSchema,
  meta: apiMetaSchema.optional()
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiMeta = z.infer<typeof apiMetaSchema>;
export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: ApiMeta;
};
export type ApiFailure = z.infer<typeof apiFailureSchema>;
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
