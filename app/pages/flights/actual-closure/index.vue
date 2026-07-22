<script setup lang="ts">
import ActualTimeDialog from '../../../features/operations/flight-operations/ActualTimeDialog.vue';
import type {
  FlightOperationDetailDto,
  FlightOperationOverviewDto
} from '#shared/contracts/flight-operations';

const loadingId = ref('');
const actionError = ref('');
const actualTimeDialog = ref(false);
const actualTimeAction = ref<'depart' | 'land'>('depart');
const selectedActualFlight = ref<FlightOperationOverviewDto['flights'][number] | null>(null);

const { data, pending, error, refresh } = await useAsyncData('flight-actual-closure', () =>
  fetchApi<FlightOperationOverviewDto>('/api/flight-operations/flights', {
    query: { limit: 100 }
  })
);

const rows = computed(() =>
  (data.value?.flights ?? []).filter((flight) =>
    ['SCHEDULED', 'CHECK_IN_OPEN', 'IN_PROGRESS', 'LANDED', 'DIVERTED', 'PENDING_CLOSURE'].includes(
      flight.currentStatus
    )
  )
);

function nextAction(status: string) {
  if (status === 'SCHEDULED')
    return { label: 'Open Check-in', action: 'open-check-in', icon: 'mdi-account-check-outline' };
  if (status === 'CHECK_IN_OPEN')
    return { label: 'Depart', action: 'depart', icon: 'mdi-airplane-takeoff' };
  if (status === 'IN_PROGRESS')
    return { label: 'Land', action: 'land', icon: 'mdi-airplane-landing' };
  if (status === 'LANDED')
    return {
      label: 'Pending Closure',
      action: 'pending-closure',
      icon: 'mdi-clipboard-check-outline'
    };
  if (status === 'DIVERTED')
    return {
      label: 'Diversion Closure',
      action: 'pending-closure',
      icon: 'mdi-map-marker-check-outline'
    };
  if (status === 'PENDING_CLOSURE')
    return { label: 'Close', action: 'close', icon: 'mdi-lock-check-outline' };
  return null;
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  );
}

async function runAction(id: string, action: string) {
  if (action === 'depart' || action === 'land') {
    selectedActualFlight.value = rows.value.find((flight) => flight.id === id) ?? null;
    actualTimeAction.value = action;
    actualTimeDialog.value = true;
    return;
  }
  loadingId.value = `${id}-${action}`;
  actionError.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(
      `/api/flight-operations/flights/${id}/actions/${action}`,
      {
        method: 'POST',
        body: {}
      }
    );
    await refresh();
  } catch (errorValue) {
    actionError.value =
      errorValue instanceof Error ? errorValue.message : 'Actual and closure action failed';
  } finally {
    loadingId.value = '';
  }
}

async function submitActualTime(body: { actualAt: string; stationId: string; note?: string }) {
  const flight = selectedActualFlight.value;
  if (!flight) return;
  loadingId.value = `${flight.id}-${actualTimeAction.value}`;
  actionError.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(
      `/api/flight-operations/flights/${flight.id}/actions/${actualTimeAction.value}`,
      { method: 'POST', body }
    );
    actualTimeDialog.value = false;
    selectedActualFlight.value = null;
    await refresh();
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Actual time failed';
  } finally {
    loadingId.value = '';
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Flight Actual & Closure</h1>
        <p class="text-text-muted">
          Dispatch, actual time capture, landing, pending closure, and closing gate.
        </p>
      </div>
      <VSpacer />
      <VTooltip text="Refresh worklist">
        <template #activator="{ props }">
          <VBtn
            v-bind="props"
            aria-label="Refresh worklist"
            icon="mdi-refresh"
            variant="text"
            @click="refresh"
          />
        </template>
      </VTooltip>
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load actual and closure worklist.
    </VAlert>
    <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">{{ actionError }}</VAlert>

    <VCard border>
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Route</th>
            <th>Status</th>
            <th>Scheduled Departure</th>
            <th>Actual Departure</th>
            <th>Actual Arrival</th>
            <th>Closure</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="8" class="py-6 text-center text-text-secondary">
              Loading actual flights...
            </td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="8" class="py-6 text-center text-text-secondary">
              No flight is in actual or closure stage.
            </td>
          </tr>
          <tr v-for="flight in rows" v-else :key="flight.id">
            <td>
              <div class="font-weight-medium">{{ flight.flightNumber }}</div>
              <div class="text-xs text-text-secondary">
                {{ flight.customerName ?? 'No customer' }}
              </div>
            </td>
            <td>{{ flight.originStationCode }} -> {{ flight.destinationStationCode }}</td>
            <td><FlightsFlightStatusChip :status="flight.currentStatus" /></td>
            <td>{{ formatDate(flight.scheduledDepartureAt) }}</td>
            <td>{{ formatDate(flight.actualDepartureAt) }}</td>
            <td>{{ formatDate(flight.actualArrivalAt) }}</td>
            <td>{{ flight.isLocked ? 'Locked' : (flight.blockingReason ?? 'Open') }}</td>
            <td class="text-right">
              <VTooltip text="Open flight detail">
                <template #activator="{ props }">
                  <VBtn
                    v-bind="props"
                    aria-label="Open flight detail"
                    class="mr-1"
                    density="comfortable"
                    icon="mdi-open-in-new"
                    :to="`/flights/${flight.id}`"
                    variant="text"
                  />
                </template>
              </VTooltip>
              <VTooltip
                v-if="nextAction(flight.currentStatus)"
                :text="String(nextAction(flight.currentStatus)?.label)"
              >
                <template #activator="{ props }">
                  <VBtn
                    v-bind="props"
                    color="secondary"
                    density="comfortable"
                    :prepend-icon="nextAction(flight.currentStatus)?.icon"
                    :loading="
                      loadingId === `${flight.id}-${nextAction(flight.currentStatus)?.action}`
                    "
                    variant="tonal"
                    @click="runAction(flight.id, String(nextAction(flight.currentStatus)?.action))"
                  >
                    {{ nextAction(flight.currentStatus)?.label }}
                  </VBtn>
                </template>
              </VTooltip>
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <ActualTimeDialog
      v-if="selectedActualFlight"
      v-model="actualTimeDialog"
      :action="actualTimeAction"
      :flight-number="selectedActualFlight.flightNumber"
      :loading="Boolean(loadingId)"
      :station-code="
        actualTimeAction === 'depart'
          ? selectedActualFlight.originStationCode
          : selectedActualFlight.destinationStationCode
      "
      :station-id="
        actualTimeAction === 'depart'
          ? selectedActualFlight.originStationId
          : selectedActualFlight.destinationStationId
      "
      @submit="submitActualTime"
    />
  </VContainer>
</template>
