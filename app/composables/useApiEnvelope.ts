import type { ApiError, ApiMeta, ApiResponse } from '#shared/contracts/api';

export class ApiClientError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly requestId?: string;
  readonly data: ApiError;

  constructor(error: ApiError, statusCode: number, meta?: ApiMeta) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.statusCode = statusCode;
    this.details = error.details;
    this.requestId = meta?.requestId;
    this.data = error;
  }
}

export async function fetchApi<T>(
  request: Parameters<typeof $fetch>[0],
  options?: Parameters<typeof $fetch>[1]
) {
  const response = await $fetch.raw<ApiResponse<T>>(request, {
    ...options,
    // API endpoints return a typed failure envelope. Let this function read it
    // before turning it into an Error that UI components can display.
    ignoreResponseError: true
  });
  const payload = response._data;

  if (!payload) {
    throw new ApiClientError(
      {
        code: 'EMPTY_API_RESPONSE',
        message: 'The server returned an empty response.'
      },
      response.status
    );
  }

  if (!payload.ok) {
    throw new ApiClientError(payload.error, response.status, payload.meta);
  }

  return payload.data;
}
