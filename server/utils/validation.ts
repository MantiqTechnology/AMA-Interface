import { getQuery, readBody, type H3Event } from 'h3';
import type { z } from 'zod';

export function parseParams<T extends z.ZodTypeAny>(event: H3Event, schema: T): z.infer<T> {
  return schema.parse(event.context.params ?? {});
}

export function parseQuery<T extends z.ZodTypeAny>(event: H3Event, schema: T): z.infer<T> {
  return schema.parse(getQuery(event));
}

export async function parseBody<T extends z.ZodTypeAny>(
  event: H3Event,
  schema: T
): Promise<z.infer<T>> {
  const body = await readBody(event);
  return schema.parse(body ?? {});
}
