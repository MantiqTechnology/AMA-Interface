<script setup lang="ts">
import type {
  FlightOperationOverviewDto,
  FlightOperationRecord,
  FlightOperationStatus
} from '#shared/contracts/flight-operations';

const search = ref('');
const status = ref<FlightOperationStatus | undefined>();
const statusOptions = [
  { title: 'All request statuses', value: undefined },
  { title: 'Draft', value: 'DRAFT' },
  { title: 'Pending Readiness', value: 'PENDING_READINESS' },
  { title: 'Blocked', value: 'BLOCKED' }
] as const;

const { data, pending, error, refresh } = await useAsyncData(
  'flight-requests-list',
  () =>
    fetchApi<FlightOperationOverviewDto>('/api/flight-operations/flights', {
      query: {
        search: search.value,
        status: status.value
      }
    }),
  { watch: [search, status] }
);

const rows = computed(() =>
  (data.value?.flights ?? []).filter((flight) =>
    status.value ? true : ['DRAFT', 'PENDING_READINESS', 'BLOCKED'].includes(flight.currentStatus)
  )
);

function canEdit(flight: FlightOperationRecord) {
  return ['DRAFT', 'BLOCKED', 'REOPENED_FOR_CORRECTION'].includes(flight.currentStatus);
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined
  }).format(new Date(value.includes('T') ? value : `${value}T00:00:00.000+07:00`));
}

async function submitFlight(id: string) {
  await fetchApi(`/api/flight-operations/flights/${id}/actions/submit`, { method: 'POST' });
  await refresh();
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Flight Requests</h1>
        <p class="text-text-muted">
          Create, edit draft, submit readiness, and monitor blocked requests.
        </p>
      </div>
      <VSpacer />
      <VBtn color="secondary" prepend-icon="mdi-plus" to="/flights/requests/new">
        Create Flight Request
      </VBtn>
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">Unable to load requests.</VAlert>

    <VCard border class="mb-4">
      <VCardText>
        <VRow density="comfortable">
          <VCol cols="12" md="8">
            <VTextField
              v-model="search"
              density="compact"
              hide-details
              label="Search flight/customer"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="4">
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
        </VRow>
      </VCardText>
    </VCard>

    <VCard border>
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Date</th>
            <th>Route</th>
            <th>Aircraft</th>
            <th>PIC</th>
            <th>Status</th>
            <th>Readiness</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="8" class="py-6 text-center text-text-secondary">Loading requests...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="8" class="py-6 text-center text-text-secondary">
              No request matches this view.
            </td>
          </tr>
          <tr v-for="flight in rows" v-else :key="flight.id">
            <td>
              <div class="font-weight-medium text-text-primary">{{ flight.flightNumber }}</div>
              <div class="text-xs text-text-secondary">
                {{ flight.customerName ?? 'No customer' }}
              </div>
            </td>
            <td>{{ formatDate(flight.flightDate) }}</td>
            <td>{{ flight.originStationCode }} -> {{ flight.destinationStationCode }}</td>
            <td>{{ flight.aircraftRegistration ?? '-' }}</td>
            <td>{{ flight.pilotInCommandName ?? '-' }}</td>
            <td><FlightsFlightStatusChip :status="flight.currentStatus" /></td>
            <td>
              <div class="min-w-28">
                <VProgressLinear
                  color="secondary"
                  height="8"
                  rounded
                  :model-value="flight.readinessPercent"
                />
                <div class="mt-1 text-xs text-text-secondary">{{ flight.readinessSummary }}</div>
              </div>
            </td>
            <td class="text-right">
              <VBtn
                v-if="canEdit(flight)"
                class="mr-1"
                density="comfortable"
                icon="mdi-pencil"
                :to="`/flights/requests/${flight.id}/edit`"
                variant="text"
              />
              <VBtn
                v-if="flight.currentStatus === 'DRAFT'"
                class="mr-1"
                color="secondary"
                density="comfortable"
                icon="mdi-send"
                variant="tonal"
                @click="submitFlight(flight.id)"
              />
              <VBtn
                density="comfortable"
                icon="mdi-open-in-new"
                :to="`/flights/${flight.id}`"
                variant="text"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </VContainer>
</template>
