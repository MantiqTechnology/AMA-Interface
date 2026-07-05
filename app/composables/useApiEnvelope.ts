import type { ApiResponse } from '#shared/contracts/api';

export async function fetchApi<T>(request: Parameters<typeof $fetch>[0], options?: Parameters<typeof $fetch>[1]) {
  const response = await $fetch<ApiResponse<T>>(request, options);

  if (!response.ok) {
    throw createError({
      statusCode: 500,
      statusMessage: response.error.message,
      data: response.error
    });
  }

  return response.data;
}
