<script setup lang="ts">
import StationSelect from '../../features/operations/stations/StationSelect.vue';
import type { OperationalFlightMonitorDto } from '#shared/contracts/operations-monitoring';

const date = ref('');
const status = ref<string | null>(null);
const stationId = ref<string | null>(null);
const statuses = [
  'SCHEDULED',
  'CHECK_IN_OPEN',
  'IN_PROGRESS',
  'LANDED',
  'PENDING_CLOSURE',
  'CLOSED',
  'BLOCKED',
  'CANCELLED',
  'DIVERTED'
];
const query = computed(() => ({
  date: date.value || undefined,
  stationId: stationId.value || undefined,
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

function urgencyColor(urgency: OperationalFlightMonitorDto['urgency']) {
  if (urgency === 'critical') return 'error';
  if (urgency === 'warning') return 'warning';
  return 'success';
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
      <div style="width: 220px">
        <StationSelect v-model="stationId" :allow-create="false" clearable label="Station" />
      </div>
      <VTooltip text="Refresh flight following">
        <template #activator="{ props }">
          <VBtn
            v-bind="props"
            aria-label="Refresh flight following"
            icon="mdi-refresh"
            :loading="pending"
            variant="tonal"
            @click="refresh"
          />
        </template>
      </VTooltip>
    </div>

    <VCard border>
      <div class="overflow-x-auto">
        <VTable class="following-table" density="comfortable">
          <thead>
            <tr>
              <th class="flight-column">Flight</th>
              <th class="route-column">Route</th>
              <th class="time-column">STD / ATD</th>
              <th class="time-column">STA / ATA</th>
              <th class="aircraft-column">Aircraft</th>
              <th class="status-column">Status</th>
              <th class="delay-column">Delay</th>
              <th class="readiness-column">Readiness</th>
              <th class="action-column">Next action</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td class="py-8 text-center" colspan="10">Loading flight following...</td>
            </tr>
            <tr v-else-if="!flights.length">
              <td class="py-8 text-center text-text-secondary" colspan="10">No flights found.</td>
            </tr>
            <tr v-for="flight in flights" v-else :key="flight.id">
              <td class="flight-column">
                <div class="font-weight-medium">{{ flight.flightNumber }}</div>
                <div class="text-caption text-text-secondary">{{ flight.flightDate }}</div>
              </td>
              <td class="route-column">
                <div>{{ flight.originCode }} -> {{ flight.plannedDestinationCode }}</div>
                <div
                  v-if="flight.actualArrivalStationCode"
                  class="text-caption text-text-secondary"
                >
                  Actual: {{ flight.actualArrivalStationCode }}
                </div>
              </td>
              <td class="time-column">
                {{ time(flight.scheduledDepartureAt) }} / {{ time(flight.actualDepartureAt) }}
              </td>
              <td class="time-column">
                {{ time(flight.scheduledArrivalAt) }} / {{ time(flight.actualArrivalAt) }}
              </td>
              <td class="aircraft-column">{{ flight.aircraftRegistration ?? '-' }}</td>
              <td class="status-column">
                <FlightsFlightStatusChip :status="flight.currentStatus" />
              </td>
              <td class="delay-column">
                <VChip :color="urgencyColor(flight.urgency)" size="small" variant="tonal">
                  {{ flight.delayMinutes > 0 ? `${flight.delayMinutes} min` : 'On time' }}
                </VChip>
              </td>
              <td class="readiness-column">
                <VProgressLinear
                  color="secondary"
                  height="7"
                  :model-value="flight.readinessPercent"
                  rounded
                />
              </td>
              <td class="action-column">
                <div class="font-weight-medium">{{ flight.nextAction ?? '-' }}</div>
                <div v-if="flight.blockingReason" class="text-caption text-error">
                  {{ flight.blockingReason }}
                </div>
              </td>
              <td>
                <VTooltip :text="flight.nextAction ?? 'Open flight detail'">
                  <template #activator="{ props }">
                    <VBtn
                      v-bind="props"
                      aria-label="Open flight"
                      icon="mdi-arrow-right"
                      size="small"
                      :to="`/flights/${flight.id}`"
                      variant="text"
                    />
                  </template>
                </VTooltip>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </VCard>
  </VContainer>
</template>

<style scoped>
.following-table {
  min-width: 1280px;
  table-layout: fixed;
}

.flight-column {
  width: 145px;
}

.route-column {
  width: 110px;
}

.time-column {
  width: 120px;
  white-space: nowrap;
}

.aircraft-column {
  width: 90px;
}

.status-column {
  width: 210px;
  white-space: nowrap;
}

.delay-column {
  width: 85px;
  white-space: nowrap;
}

.readiness-column {
  width: 140px;
}

.action-column {
  width: 235px;
}
</style>
