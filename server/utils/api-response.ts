import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { setResponseStatus, type H3Event } from 'h3';
import type { ApiFailure, ApiMeta, ApiResponse } from '../../shared/contracts/api';
import { DomainError } from './errors';

function isDemoMode() {
  try {
    return String(useRuntimeConfig().demoMode) === 'true';
  } catch {
    return process.env.DEMO_MODE !== 'false';
  }
}

export function apiOk<T>(event: H3Event, data: T, meta: ApiMeta = {}): ApiResponse<T> {
  return {
    ok: true,
    data,
    meta: {
      requestId: event.context.requestId,
      demoMode: isDemoMode(),
      ...(Array.isArray(data) ? { count: data.length } : {}),
      ...meta
    }
  };
}

export function apiFail(
  event: H3Event,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): ApiFailure {
  setResponseStatus(event, statusCode);
  return {
    ok: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      requestId: event.context.requestId,
      demoMode: isDemoMode()
    }
  };
}

export function defineApiEventHandler<T>(handler: (event: H3Event) => Promise<T> | T) {
  return defineEventHandler(async (event) => {
    event.context.requestId ??= randomUUID();

    try {
      const data = await handler(event);
      return apiOk(event, data);
    } catch (error) {
      if (error instanceof ZodError) {
        return apiFail(event, 422, 'VALIDATION_ERROR', 'Request validation failed', error.flatten());
      }

      if (error instanceof DomainError) {
        return apiFail(event, error.statusCode, error.code, error.message, error.details);
      }

      const message = error instanceof Error ? error.message : 'Unexpected server error';
      return apiFail(event, 500, 'INTERNAL_SERVER_ERROR', message);
    }
  });
}
