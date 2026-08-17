import { fetchApi } from '../../../composables/useApiEnvelope';
import type {
  ApiStationFlight,
  StationAuditRow,
  StationDataset,
  StationTaskRow
} from '../types/stationOperations';
import { useStationOperationsContext } from './useStationOperationsContext';
import {
  buildDatasetFromApi,
  createEmptyDataset,
  flattenAudit,
  flattenStationTasks
} from '../utils/stationOperationsTransformers';
import { isoDateToLocalDate } from '../utils/stationOperationsDate';
import type { StationOperationsPageData } from 'app/pages/flights/station-operations/index.vue';
export function useStationOperationsPageData(): StationOperationsPageData {
  const context = useStationOperationsContext();
  const route = useRoute();

  const pending = ref<boolean>(false);
  const workbenchFlights = ref<ApiStationFlight[]>([]);
  const dataset = ref<StationDataset>(createEmptyDataset());

  let requestSequence = 0;

  const stationTasks = computed<StationTaskRow[]>(() =>
    flattenStationTasks(context.selectedStationId.value, workbenchFlights.value)
  );

  const workbenchAudit = computed<StationAuditRow[]>(() => flattenAudit(workbenchFlights.value));

  async function load(): Promise<void> {
    const currentRequest = ++requestSequence;
    pending.value = true;
    context.error.value = '';

    try {
      const hasExplicitDate = typeof route.query.date === 'string';
      const flights = await fetchApi<ApiStationFlight[]>(
        '/api/flight-operations/station-operations',
        {
          query: {
            stationCode: context.selectedStationCode.value,
            operationalDate: hasExplicitDate ? context.operationalDateIso.value : undefined,
            phase: typeof route.query.phase === 'string' ? route.query.phase : undefined
          }
        }
      );

      if (currentRequest !== requestSequence) return;
      let scopedFlights = flights;

      // Demo data is intentionally deterministic and may not use today's date.
      // Without an explicit URL date, anchor the workspace to the latest available
      // operational day so the first screen always contains an actionable shift.
      if (!hasExplicitDate && flights.length > 0) {
        const latestDate = flights.reduce(
          (latest, flight) => (flight.flightDate > latest ? flight.flightDate : latest),
          flights[0]!.flightDate
        );

        if (latestDate !== context.operationalDateIso.value) {
          context.operationalDateModel.value = isoDateToLocalDate(latestDate);
          return;
        }

        scopedFlights = flights.filter((flight) => flight.flightDate === latestDate);
      }

      workbenchFlights.value = scopedFlights;
      dataset.value = buildDatasetFromApi(context.selectedStationCode.value, scopedFlights);
      context.lastUpdated.value = new Date();
    } catch (error) {
      if (currentRequest !== requestSequence) return;

      context.error.value =
        error instanceof Error ? error.message : 'Gagal memuat data Station Operations.';
    } finally {
      if (currentRequest === requestSequence) {
        pending.value = false;
      }
    }
  }

  const stopWatch = watch(
    [context.selectedStationCode, context.operationalDateIso],
    () => void load(),
    { immediate: true }
  );

  onMounted(() => {
    context.registerRefreshHandler(load);
  });

  onBeforeUnmount(() => {
    stopWatch();
    context.registerRefreshHandler(null);
  });

  return {
    context,
    pending,
    dataset,
    workbenchFlights,
    stationTasks,
    workbenchAudit,
    load
  };
}
