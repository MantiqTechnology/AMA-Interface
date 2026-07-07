<script setup lang="ts">
import type {
  FlightOperationLookupsDto,
  FlightOperationOverviewDto,
  FlightOperationStatus,
  FlightType
} from '#shared/contracts/flight-operations';

const search = ref('');
const status = ref<FlightOperationStatus | undefined>();
const flightType = ref<FlightType | undefined>();
const routeId = ref<string | undefined>();
const aircraftId = ref<string | undefined>();
const customerId = ref<string | undefined>();

const statusOptions = [
  { title: 'All status', value: undefined },
  { title: 'Draft', value: 'DRAFT' },
  { title: 'Pending Readiness', value: 'PENDING_READINESS' },
  { title: 'Blocked', value: 'BLOCKED' },
  { title: 'Ready for Approval', value: 'READY_FOR_APPROVAL' },
  { title: 'Scheduled', value: 'SCHEDULED' },
  { title: 'In Progress', value: 'IN_PROGRESS' },
  { title: 'Landed', value: 'LANDED' },
  { title: 'Pending Closure', value: 'PENDING_CLOSURE' }
] as const;

const flightTypeOptions = [
  { title: 'All types', value: undefined },
  { title: 'Charter', value: 'CHARTER' },
  { title: 'Passenger', value: 'PASSENGER' },
  { title: 'Cargo', value: 'CARGO' }
] as const;

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
        flightType: flightType.value,
        routeId: routeId.value,
        aircraftId: aircraftId.value,
        customerId: customerId.value
      }
    }),
  {
    watch: [search, status, flightType, routeId, aircraftId, customerId]
  }
);

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
        <h1 class="text-h4 font-weight-bold text-text-primary">Flight Board</h1>
        <p class="text-text-muted">
          Data diperbarui berdasarkan perubahan status dan input user pada demo.
        </p>
      </div>
      <VSpacer />
      <VBtn color="secondary" prepend-icon="mdi-plus" to="/flights/requests/new">
        Create Flight Request
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
              v-model="status"
              density="compact"
              hide-details
              item-title="title"
              item-value="value"
              label="Status"
              :items="statusOptions"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VSelect
              v-model="flightType"
              density="compact"
              hide-details
              item-title="title"
              item-value="value"
              label="Type"
              :items="flightTypeOptions"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VSelect
              v-model="routeId"
              clearable
              density="compact"
              hide-details
              item-title="title"
              item-value="value"
              label="Route"
              :items="lookups?.routes ?? []"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="aircraftId"
              clearable
              density="compact"
              hide-details
              item-title="title"
              item-value="value"
              label="Aircraft"
              :items="lookups?.aircraft ?? []"
              variant="outlined"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VCard border>
      <template #title>
        <div class="flex items-center justify-between">
          <span class="text-text-primary">Operational Flights</span>
          <VBtn icon="mdi-refresh" variant="text" @click="refresh" />
        </div>
      </template>
      <FlightsFlightOperationTable :flights="data?.flights ?? []" :loading="pending" />
    </VCard>
  </VContainer>
</template>
