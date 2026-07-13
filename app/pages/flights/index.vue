<script setup lang="ts">
import AircraftSelect from '../../features/operations/aircraft/AircraftSelect.vue';
import RouteSelect from '../../features/operations/routes/RouteSelect.vue';
import type {
  FlightOperationLookupsDto,
  FlightOperationOverviewDto,
  FlightOperationStatus
} from '#shared/contracts/flight-operations';

const search = ref('');
const statusId = ref<string | undefined>();
const flightTypeId = ref<string | undefined>();
const routeId = ref<string | null>(null);
const aircraftId = ref<string | null>(null);
const customerId = ref<string | undefined>();

const { data: lookups } = await useAsyncData('flight-operation-lookups', () =>
  fetchApi<FlightOperationLookupsDto>('/api/flight-operations/lookups')
);

const { data, pending, error, refresh } = await useAsyncData(
  'flight-operation-board',
  () =>
    fetchApi<FlightOperationOverviewDto>('/api/flight-operations/flights', {
      query: {
        search: search.value,
        statusId: statusId.value,
        flightTypeId: flightTypeId.value,
        routeId: routeId.value ?? undefined,
        aircraftId: aircraftId.value ?? undefined,
        customerId: customerId.value
      }
    }),
  {
    watch: [search, statusId, flightTypeId, routeId, aircraftId, customerId]
  }
);

const statusOptions = computed(() => lookups.value?.flightOperationStatuses ?? []);
const flightTypeOptions = computed(() => lookups.value?.flightTypes ?? []);

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
                {{ data?.summary[card.status] ?? 0 }}
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
              v-model="statusId"
              density="compact"
              hide-details
              clearable
              item-title="title"
              item-value="value"
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
      <FlightsFlightOperationTable :flights="data?.flights ?? []" :loading="pending" />
    </VCard>
  </VContainer>
</template>
