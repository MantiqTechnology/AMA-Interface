export function useAircraftImageUrl() {
  const runtimeConfig = useRuntimeConfig();
  const baseUrl = computed(() =>
    String(runtimeConfig.public.aircraftImageBaseUrl || '').replace(/\/+$/u, '')
  );

  function resolveAircraftImageUrl(value: string | null | undefined) {
    if (!value) return null;
    if (/^(https?:)?\/\//u.test(value) || value.startsWith('/')) return value;
    if (!baseUrl.value) return null;

    const imagePath = value.replace(/^\/+/u, '');
    const baseSegments = baseUrl.value.split('/').filter(Boolean);
    const [firstImageSegment] = imagePath.split('/');
    const lastBaseSegment = baseSegments.at(-1);
    const relativePath =
      firstImageSegment && lastBaseSegment === firstImageSegment
        ? imagePath.slice(firstImageSegment.length).replace(/^\/+/u, '')
        : imagePath;

    return `${baseUrl.value}/${relativePath}`;
  }

  return {
    aircraftImageBaseUrl: baseUrl,
    resolveAircraftImageUrl
  };
}
