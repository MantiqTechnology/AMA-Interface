type LocalizedApiError = {
  code?: string;
  message?: string;
  messageKey?: string;
  messageParams?: Record<string, string | number | boolean | null | undefined>;
};

function extractApiError(error: unknown): LocalizedApiError | null {
  if (!error || typeof error !== 'object') return null;
  const direct = error as { data?: unknown; message?: unknown; code?: unknown };
  if (direct.data && typeof direct.data === 'object') return direct.data as LocalizedApiError;
  return {
    code: typeof direct.code === 'string' ? direct.code : undefined,
    message: typeof direct.message === 'string' ? direct.message : undefined
  };
}

export function useApiErrorMessage() {
  const { t } = useI18n();

  function errorMessage(error: unknown, fallbackKeyOrText = 'errors.fallbackActionFailed') {
    const apiError = extractApiError(error);
    if (apiError?.messageKey) {
      const translated = t(apiError.messageKey, apiError.messageParams);
      if (translated !== apiError.messageKey) return translated;
    }
    const fallback = fallbackKeyOrText.includes('.') ? t(fallbackKeyOrText) : fallbackKeyOrText;
    return apiError?.message ?? fallback;
  }

  return {
    errorMessage
  };
}
