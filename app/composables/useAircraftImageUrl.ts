export function useAircraftImageUrl() {
  const runtimeConfig = useRuntimeConfig();
  const baseUrl = computed(() =>
    String(runtimeConfig.public.aircraftImageBaseUrl || '').replace(/\/+$/u, '')
  );

  function resolveAircraftImageUrl(value: string | null | undefined) {
    if (!value) return null;
    if (/^(https?:)?\/\//u.test(value) || value.startsWith('/')) return value;
    if (!baseUrl.value) return null;
    return `${baseUrl.value}/${value.replace(/^\/+/u, '')}`;
  }

  return {
    aircraftImageBaseUrl: baseUrl,
    resolveAircraftImageUrl
  };
}
