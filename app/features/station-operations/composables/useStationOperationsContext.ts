import { fetchApi } from '../../../composables/useApiEnvelope';
import type { StationOption as MasterStationOption } from '#shared/features/operations/stations';
import type {
  StationOperationsContext,
  StationOperationsRouteTarget,
  StationOption
} from '../types/stationOperations';
import { isoDateToLocalDate, localDateToIso, todayIso } from '../utils/stationOperationsDate';

const StationOperationsContextKey = Symbol('StationOperationsContext');

function cleanQuery(query: Record<string, unknown>): Record<string, string | number> {
  const result: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string' || typeof value === 'number') {
      result[key] = value;
    }
  }

  return result;
}

export function provideStationOperationsContext(): StationOperationsContext {
  const route = useRoute();
  const router = useRouter();
  const { currentPersona } = useDemoSession();
  const { can } = useAuthorization();

  const {
    data: masterStationOptions,
    pending: stationOptionsPending,
    error: stationOptionsError
  } = useAsyncData(
    'station-operations-station-options-v2',
    () => fetchApi<MasterStationOption[]>('/api/master-data/stations/options'),
    {
      default: () => [] as MasterStationOption[]
    }
  );

  const stationMaster = computed<StationOption[]>(() =>
    masterStationOptions.value.map((station) => ({
      id: station.id,
      code: station.stationCode,
      name: station.stationName
    }))
  );

  const stationScope = computed<string[]>(() =>
    currentPersona.value.stationScope.includes('ALL')
      ? stationMaster.value.map((station) => station.code)
      : currentPersona.value.stationScope
  );

  const requestedStation =
    typeof route.query.stationCode === 'string' ? route.query.stationCode : undefined;

  const initialStation =
    (requestedStation && stationScope.value.includes(requestedStation)
      ? requestedStation
      : undefined) ??
    (stationScope.value.includes('DJJ') ? 'DJJ' : stationScope.value[0]) ??
    'DJJ';

  const initialDate = typeof route.query.date === 'string' ? route.query.date : todayIso();

  const selectedStationCode = ref<string>(initialStation);
  const operationalDateModel = ref<Date | null>(isoDateToLocalDate(initialDate));
  const operationalDateIso = computed<string>(() => localDateToIso(operationalDateModel.value));
  const canChangeStation = computed<boolean>(() => stationScope.value.length > 1);
  const stationOptions = computed<StationOption[]>(() =>
    stationMaster.value.filter((station) => stationScope.value.includes(station.code))
  );
  const selectedStationLabel = computed<string>(() => {
    const found = stationMaster.value.find((station) => station.code === selectedStationCode.value);

    return found ? `${found.code} - ${found.name}` : selectedStationCode.value;
  });
  const selectedStationId = computed<string>(
    () =>
      stationMaster.value.find((station) => station.code === selectedStationCode.value)?.id ?? ''
  );
  const canReadAssets = computed<boolean>(() => can('asset.read').allowed);

  const lastUpdated = ref<Date | null>(null);
  const refreshing = ref<boolean>(false);
  const error = ref<string>('');
  const actionError = ref<string>('');
  const actionSuccess = ref<string>('');
  const refreshHandler = ref<(() => Promise<void>) | null>(null);

  watch(
    [stationOptionsPending, stationOptionsError, stationMaster],
    ([isPending, loadError, stations]) => {
      if (isPending) return;
      if (loadError || stations.length === 0) {
        error.value =
          loadError instanceof Error
            ? loadError.message
            : 'Station master data is unavailable. Refresh before continuing.';
      }
    },
    { immediate: true }
  );

  function registerRefreshHandler(handler: (() => Promise<void>) | null): void {
    refreshHandler.value = handler;
  }

  async function refreshCurrentPage(): Promise<void> {
    if (!refreshHandler.value || refreshing.value) return;

    refreshing.value = true;

    try {
      await refreshHandler.value();
    } finally {
      refreshing.value = false;
    }
  }

  function withContext(
    path: string,
    extraQuery: Record<string, string | number | undefined | null> = {}
  ): StationOperationsRouteTarget {
    const query: Record<string, string | number> = {
      stationCode: selectedStationCode.value,
      date: operationalDateIso.value
    };

    for (const [key, value] of Object.entries(extraQuery)) {
      if (typeof value === 'string' || typeof value === 'number') {
        query[key] = value;
      }
    }

    return { path, query };
  }

  watch(
    stationScope,
    (scope: string[]) => {
      if (!scope.includes(selectedStationCode.value)) {
        selectedStationCode.value = scope[0] ?? 'DJJ';
      }
    },
    { immediate: true }
  );

  watch(
    () => [route.query.stationCode, route.query.date] as const,
    ([stationCode, date]) => {
      if (
        typeof stationCode === 'string' &&
        stationScope.value.includes(stationCode) &&
        stationCode !== selectedStationCode.value
      ) {
        selectedStationCode.value = stationCode;
      }

      if (typeof date === 'string' && date !== operationalDateIso.value) {
        operationalDateModel.value = isoDateToLocalDate(date);
      }
    }
  );

  watch(
    [selectedStationCode, operationalDateIso],
    async ([stationCode, date]: [string, string]) => {
      const currentStation =
        typeof route.query.stationCode === 'string' ? route.query.stationCode : undefined;
      const currentDate = typeof route.query.date === 'string' ? route.query.date : undefined;

      if (currentStation === stationCode && currentDate === date) return;

      await router.replace({
        path: route.path,
        query: {
          ...cleanQuery(route.query),
          stationCode,
          date
        }
      });
    },
    { flush: 'post' }
  );

  const context: StationOperationsContext = {
    selectedStationCode,
    operationalDateModel,
    operationalDateIso,
    stationMaster,
    stationOptions,
    stationOptionsPending,
    selectedStationLabel,
    selectedStationId,
    canChangeStation,
    canReadAssets,
    lastUpdated,
    refreshing,
    error,
    actionError,
    actionSuccess,
    registerRefreshHandler,
    refreshCurrentPage,
    withContext
  };

  provide(StationOperationsContextKey, context);

  return context;
}

export function useStationOperationsContext(): StationOperationsContext {
  const context = inject<StationOperationsContext>(StationOperationsContextKey);

  if (!context) {
    throw new Error(
      'Station Operations context is unavailable. Render this page below station-operations.vue.'
    );
  }

  return context;
}
