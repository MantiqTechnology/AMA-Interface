<script setup lang="ts">
import type { OperationalFlightMonitorDto } from '#shared/contracts/operations-monitoring';

const date = ref('');
const status = ref<string | null>(null);
const statuses = [
  'SCHEDULED',
  'CHECK_IN_OPEN',
  'IN_PROGRESS',
  'LANDED',
  'PENDING_CLOSURE',
  'CLOSED',
  'BLOCKED',
  'CANCELLED'
];
const query = computed(() => ({
  date: date.value || undefined,
  status: status.value || undefined
}));
const {
  data: flights,
  pending,
  refresh
} = await useAsyncData(
  'flight-following',
  () =>
    fetchApi<OperationalFlightMonitorDto[]>('/api/flight-operations/flight-following', {
      query: query.value
    }),
  { default: () => [], watch: [query] }
);

function time(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Flight Following</h1>
        <p class="text-text-secondary">Live operational timeline from canonical flight records.</p>
      </div>
      <VSpacer />
      <VTextField
        v-model="date"
        density="compact"
        hide-details
        label="Flight date"
        style="width: 170px"
        type="date"
        variant="outlined"
      />
      <VSelect
        v-model="status"
        clearable
        density="compact"
        hide-details
        :items="statuses"
        label="Status"
        style="width: 210px"
        variant="outlined"
      />
      <VBtn icon="mdi-refresh" :loading="pending" variant="tonal" @click="refresh" />
    </div>

    <VCard border>
      <div class="overflow-x-auto">
        <VTable density="comfortable">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Route</th>
              <th>STD / ATD</th>
              <th>STA / ATA</th>
              <th>Aircraft</th>
              <th>Status</th>
              <th>Readiness</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td class="py-8 text-center" colspan="8">Loading flight following...</td>
            </tr>
            <tr v-else-if="!flights.length">
              <td class="py-8 text-center text-text-secondary" colspan="8">No flights found.</td>
            </tr>
            <tr v-for="flight in flights" v-else :key="flight.id">
              <td>
                <div class="font-weight-medium">{{ flight.flightNumber }}</div>
                <div class="text-caption text-text-secondary">{{ flight.flightDate }}</div>
              </td>
              <td>{{ flight.originCode }} -> {{ flight.destinationCode }}</td>
              <td>
                {{ time(flight.scheduledDepartureAt) }} / {{ time(flight.actualDepartureAt) }}
              </td>
              <td>{{ time(flight.scheduledArrivalAt) }} / {{ time(flight.actualArrivalAt) }}</td>
              <td>{{ flight.aircraftRegistration ?? '-' }}</td>
              <td><FlightsFlightStatusChip :status="flight.currentStatus" /></td>
              <td style="min-width: 130px">
                <VProgressLinear
                  color="secondary"
                  height="7"
                  :model-value="flight.readinessPercent"
                  rounded
                />
              </td>
              <td>
                <VBtn
                  aria-label="Open flight"
                  icon="mdi-arrow-right"
                  size="small"
                  :to="`/flights/${flight.id}`"
                  variant="text"
                />
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </VCard>
  </VContainer>
</template>
