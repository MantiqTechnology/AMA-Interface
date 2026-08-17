<script setup lang="ts">
import AircraftSelect from '../../features/operations/aircraft/AircraftSelect.vue';
import RouteSelect from '../../features/operations/routes/RouteSelect.vue';
import StationSelect from '../../features/operations/stations/StationSelect.vue';
import type {
  FlightOperationLookupsDto,
  FlightOperationOverviewDto,
  FlightOperationStatus
} from '#shared/contracts/flight-operations';
import { flightOperationStatuses } from '#shared/contracts/flight-operations';

const search = ref('');
const currentRoute = useRoute();
const router = useRouter();
const status = ref<FlightOperationStatus | undefined>(
  typeof currentRoute.query.status === 'string' &&
    flightOperationStatuses.includes(currentRoute.query.status as FlightOperationStatus)
    ? (currentRoute.query.status as FlightOperationStatus)
    : undefined
);
const flightTypeId = ref<string | undefined>();
const routeId = ref<string | null>(
  typeof currentRoute.query.routeId === 'string' ? currentRoute.query.routeId : null
);
const aircraftId = ref<string | null>(null);
const customerId = ref<string | undefined>();
const stationId = ref<string | null>(
  typeof currentRoute.query.stationId === 'string' ? currentRoute.query.stationId : null
);
const dateFrom = ref(
  typeof currentRoute.query.dateFrom === 'string' ? currentRoute.query.dateFrom : ''
);
const dateTo = ref(typeof currentRoute.query.dateTo === 'string' ? currentRoute.query.dateTo : '');
const pageOffset = ref(0);
const dashboardQuery = computed(() => ({
  lifecycle:
    typeof currentRoute.query.lifecycle === 'string' ? currentRoute.query.lifecycle : undefined,
  readinessBand:
    typeof currentRoute.query.readinessBand === 'string'
      ? currentRoute.query.readinessBand
      : undefined,
  cohort: typeof currentRoute.query.cohort === 'string' ? currentRoute.query.cohort : undefined,
  attention: currentRoute.query.attention === 'true' ? true : undefined,
  departed: currentRoute.query.departed === 'true' ? true : undefined,
  departurePerformance:
    typeof currentRoute.query.departurePerformance === 'string'
      ? currentRoute.query.departurePerformance
      : undefined,
  age: typeof currentRoute.query.age === 'string' ? currentRoute.query.age : undefined,
  approvalAge:
    typeof currentRoute.query.approvalAge === 'string' ? currentRoute.query.approvalAge : undefined
}));

const { data: lookups } = await useAsyncData('flight-operation-lookups', () =>
  fetchApi<FlightOperationLookupsDto>('/api/flight-operations/lookups')
);

const { data, pending, error, refresh } = await useAsyncData(
  'flight-operation-board',
  () =>
    fetchApi<FlightOperationOverviewDto>('/api/flight-operations/flights', {
      query: {
        search: search.value,
        status: status.value,
        flightTypeId: flightTypeId.value,
        routeId: routeId.value ?? undefined,
        stationId: stationId.value ?? undefined,
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined,
        aircraftId: aircraftId.value ?? undefined,
        customerId: customerId.value,
        ...dashboardQuery.value,
        limit: 100,
        offset: pageOffset.value
      }
    }),
  {
    watch: [
      search,
      status,
      flightTypeId,
      routeId,
      stationId,
      dateFrom,
      dateTo,
      aircraftId,
      customerId,
      dashboardQuery,
      pageOffset
    ]
  }
);

const statusOptions = computed(() => lookups.value?.flightOperationStatuses ?? []);
const flightTypeOptions = computed(() => lookups.value?.flightTypes ?? []);

const filteredFlights = computed(() => data.value?.flights ?? []);

const hasDashboardDrilldown = computed(() =>
  [
    'lifecycle',
    'readinessBand',
    'cohort',
    'departurePerformance',
    'attention',
    'departed',
    'age',
    'approvalAge'
  ].some((key) => typeof currentRoute.query[key] === 'string')
);

function clearDashboardDrilldown() {
  const query = { ...currentRoute.query };
  for (const key of [
    'lifecycle',
    'readinessBand',
    'cohort',
    'departurePerformance',
    'attention',
    'departed',
    'age',
    'approvalAge'
  ])
    delete query[key];
  void router.replace({ query });
}

function cardCount(statusValue: FlightOperationStatus) {
  return filteredFlights.value.filter((flight) => flight.currentStatus === statusValue).length;
}

const cards: Array<{ label: string; status: FlightOperationStatus; icon: string }> = [
  { label: 'Draft', status: 'DRAFT', icon: 'mdi-file-outline' },
  { label: 'Pending Readiness', status: 'PENDING_READINESS', icon: 'mdi-clipboard-pulse-outline' },
  { label: 'Blocked', status: 'BLOCKED', icon: 'mdi-alert-octagon-outline' },
  { label: 'Ready Approval', status: 'READY_FOR_APPROVAL', icon: 'mdi-check-decagram-outline' },
  { label: 'Scheduled', status: 'SCHEDULED', icon: 'mdi-calendar-clock' },
  { label: 'In Progress', status: 'IN_PROGRESS', icon: 'mdi-airplane-clock' },
  { label: 'Landed', status: 'LANDED', icon: 'mdi-airplane-landing' },
  { label: 'Pending Closure', status: 'PENDING_CLOSURE', icon: 'mdi-lock-clock' }
];
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Flight Orders</h1>
        <p class="text-text-muted">
          Central operational records from readiness through flight closure.
        </p>
      </div>
      <VSpacer />
      <VBtn color="secondary" prepend-icon="mdi-plus" to="/flights/requests/new">
        New Flight Request
      </VBtn>
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load flight board.
    </VAlert>

    <VRow class="mb-4">
      <VCol v-for="card in cards" :key="card.status" cols="6" md="3">
        <VCard border>
          <VCardText class="flex items-center justify-between">
            <div>
              <div class="text-xs text-text-secondary">{{ card.label }}</div>
              <div class="text-h5 font-weight-bold text-text-primary">
                {{ cardCount(card.status) }}
              </div>
            </div>
            <VIcon color="secondary" :icon="card.icon" size="28" />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VCard border class="mb-4">
      <VCardText>
        <VRow density="comfortable">
          <VCol cols="12" md="3">
            <VTextField
              v-model="search"
              density="compact"
              hide-details
              label="Search flight/customer"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VSelect
              v-model="status"
              density="compact"
              hide-details
              clearable
              item-title="title"
              item-value="code"
              label="Status"
              :items="statusOptions"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VSelect
              v-model="flightTypeId"
              density="compact"
              hide-details
              clearable
              item-title="title"
              item-value="value"
              label="Type"
              :items="flightTypeOptions"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <RouteSelect v-model="routeId" :allow-create="false" label="Route" />
          </VCol>
          <VCol cols="12" md="3">
            <AircraftSelect v-model="aircraftId" :allow-create="false" label="Aircraft" />
          </VCol>
          <VCol cols="12" md="3">
            <StationSelect v-model="stationId" :allow-create="false" label="Station" />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField
              v-model="dateFrom"
              density="compact"
              hide-details
              label="Date from"
              type="date"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField
              v-model="dateTo"
              density="compact"
              hide-details
              label="Date to"
              type="date"
              variant="outlined"
            />
          </VCol>
          <VCol v-if="hasDashboardDrilldown" cols="12" md="2">
            <VBtn
              block
              prepend-icon="mdi-filter-remove-outline"
              variant="tonal"
              @click="clearDashboardDrilldown"
            >
              Clear drill-down
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VCard border>
      <template #title>
        <div class="flex items-center justify-between">
          <span class="text-text-primary">Operational Flight Orders</span>
          <VBtn icon="mdi-refresh" variant="text" @click="refresh" />
        </div>
      </template>
      <FlightsFlightOperationTable :flights="filteredFlights" :loading="pending" />
      <VCardActions class="justify-end">
        <span class="mr-3 text-caption text-text-secondary">
          {{ pageOffset + 1 }}–{{ pageOffset + filteredFlights.length }}
        </span>
        <VBtn
          :disabled="pageOffset === 0"
          prepend-icon="mdi-chevron-left"
          variant="text"
          @click="pageOffset = Math.max(0, pageOffset - 100)"
        >
          Previous
        </VBtn>
        <VBtn
          append-icon="mdi-chevron-right"
          :disabled="!data?.pagination.hasMore"
          variant="text"
          @click="pageOffset += 100"
        >
          Next
        </VBtn>
      </VCardActions>
    </VCard>
  </VContainer>
</template>
