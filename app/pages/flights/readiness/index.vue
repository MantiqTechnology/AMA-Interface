<script setup lang="ts">
import type {
  FlightOperationDetailDto,
  FlightOperationOverviewDto
} from '#shared/contracts/flight-operations';

const search = ref('');
const loadingId = ref('');
const actionError = ref('');

const { data, pending, error, refresh } = await useAsyncData(
  'flight-readiness-worklist',
  () =>
    fetchApi<FlightOperationOverviewDto>('/api/flight-operations/flights', {
      query: { search: search.value, limit: 100 }
    }),
  { watch: [search] }
);

const rows = computed(() =>
  (data.value?.flights ?? []).filter((flight) =>
    ['PENDING_READINESS', 'BLOCKED', 'READY_FOR_APPROVAL'].includes(flight.currentStatus)
  )
);

async function runAction(id: string, action: 'evaluate' | 'approve') {
  loadingId.value = `${id}-${action}`;
  actionError.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(
      `/api/flight-operations/flights/${id}/actions/${action}`,
      {
        method: 'POST'
      }
    );
    await refresh();
  } catch (errorValue) {
    actionError.value =
      errorValue instanceof Error ? errorValue.message : 'Readiness action failed';
  } finally {
    loadingId.value = '';
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Readiness & Approvals</h1>
        <p class="text-text-muted">
          Operational gate for aircraft, crew, manifest, fuel, handling, and duty separation.
        </p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" @click="refresh" />
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load readiness worklist.
    </VAlert>
    <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">{{ actionError }}</VAlert>

    <VCard border class="mb-4">
      <VCardText>
        <VTextField
          v-model="search"
          density="compact"
          hide-details
          label="Search flight/customer"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
      </VCardText>
    </VCard>

    <VCard border>
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Route</th>
            <th>Aircraft</th>
            <th>PIC</th>
            <th>Status</th>
            <th>Readiness</th>
            <th>Blocking Reason</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="8" class="py-6 text-center text-text-secondary">Loading readiness...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="8" class="py-6 text-center text-text-secondary">
              No readiness item needs action.
            </td>
          </tr>
          <tr v-for="flight in rows" v-else :key="flight.id">
            <td>
              <div class="font-weight-medium">{{ flight.flightNumber }}</div>
              <div class="text-xs text-text-secondary">{{ flight.flightDate }}</div>
            </td>
            <td>{{ flight.originStationCode }} -> {{ flight.destinationStationCode }}</td>
            <td>{{ flight.aircraftRegistration ?? '-' }}</td>
            <td>{{ flight.pilotInCommandName ?? '-' }}</td>
            <td><FlightsFlightStatusChip :status="flight.currentStatus" /></td>
            <td>
              <div class="min-w-36">
                <VProgressLinear
                  color="secondary"
                  height="8"
                  rounded
                  :model-value="flight.readinessPercent"
                />
                <div class="mt-1 text-xs text-text-secondary">{{ flight.readinessSummary }}</div>
              </div>
            </td>
            <td class="max-w-72">{{ flight.blockingReason ?? '-' }}</td>
            <td class="text-right">
              <VBtn
                class="mr-1"
                density="comfortable"
                icon="mdi-open-in-new"
                :to="`/flights/${flight.id}`"
                variant="text"
              />
              <VBtn
                class="mr-1"
                density="comfortable"
                icon="mdi-refresh"
                :loading="loadingId === `${flight.id}-evaluate`"
                variant="tonal"
                @click="runAction(flight.id, 'evaluate')"
              />
              <VBtn
                v-if="flight.currentStatus === 'READY_FOR_APPROVAL'"
                color="success"
                density="comfortable"
                icon="mdi-check-decagram-outline"
                :loading="loadingId === `${flight.id}-approve`"
                variant="flat"
                @click="runAction(flight.id, 'approve')"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </VContainer>
</template>
