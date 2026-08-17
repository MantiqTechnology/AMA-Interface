<script setup lang="ts">
import ActualTimeDialog from '../../../features/operations/flight-operations/ActualTimeDialog.vue';
import type { FlightOperationDetailDto } from '#shared/contracts/flight-operations';
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import type { ApiStationFlight } from '../../../features/station-operations/types/stationOperations';

const loadingId = ref('');
const actionError = ref('');
const actualTimeDialog = ref(false);
const actualTimeAction = ref<'depart' | 'land'>('depart');
const selectedActualFlight = ref<ApiStationFlight | null>(null);
const { can } = useAuthorization();
const { context, pending, workbenchFlights, load } = useStationOperationsPageData();

const rows = computed(() =>
  workbenchFlights.value.filter((flight) =>
    [
      'SCHEDULED',
      'CHECK_IN_OPEN',
      'READY_FOR_DEPARTURE',
      'IN_PROGRESS',
      'LANDED',
      'DIVERTED',
      'PENDING_CLOSURE'
    ].includes(flight.currentStatusCode)
  )
);

function nextAction(flight: ApiStationFlight) {
  const stationCode = context.selectedStationCode.value;
  const atOrigin = flight.originStationCode === stationCode;
  const atDestination = flight.destinationStationCode === stationCode;

  if (flight.currentStatusCode === 'SCHEDULED' && atOrigin && can('flight.schedule').allowed) {
    return { label: 'Buka check-in', action: 'open-check-in', icon: 'mdi-account-check-outline' };
  }
  if (
    flight.currentStatusCode === 'READY_FOR_DEPARTURE' &&
    atOrigin &&
    can('flight.departure.execute').allowed
  ) {
    return { label: 'Catat keberangkatan', action: 'depart', icon: 'mdi-airplane-takeoff' };
  }
  if (
    flight.currentStatusCode === 'IN_PROGRESS' &&
    atDestination &&
    can('flight.movement.update').allowed
  ) {
    return { label: 'Catat kedatangan', action: 'land', icon: 'mdi-airplane-landing' };
  }
  if (
    ['LANDED', 'DIVERTED'].includes(flight.currentStatusCode) &&
    atDestination &&
    can('flight.movement.update').allowed
  ) {
    return {
      label: 'Ajukan closure',
      action: 'pending-closure',
      icon: 'mdi-clipboard-check-outline'
    };
  }
  if (flight.currentStatusCode === 'PENDING_CLOSURE' && can('flight.closure.execute').allowed) {
    return { label: 'Tutup flight', action: 'close', icon: 'mdi-lock-check-outline' };
  }
  return null;
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  );
}

async function runAction(flight: ApiStationFlight, action: string) {
  if (action === 'depart' || action === 'land') {
    selectedActualFlight.value = flight;
    actualTimeAction.value = action;
    actualTimeDialog.value = true;
    return;
  }
  loadingId.value = `${flight.flightId}-${action}`;
  actionError.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(
      `/api/flight-operations/flights/${flight.flightId}/actions/${action}`,
      {
        method: 'POST',
        body: {}
      }
    );
    await load();
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
  loadingId.value = `${flight.flightId}-${actualTimeAction.value}`;
  actionError.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(
      `/api/flight-operations/flights/${flight.flightId}/actions/${actualTimeAction.value}`,
      { method: 'POST', body }
    );
    actualTimeDialog.value = false;
    selectedActualFlight.value = null;
    await load();
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Actual time failed';
  } finally {
    loadingId.value = '';
  }
}
</script>

<template>
  <section>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h2 class="text-h5 font-weight-bold text-text-primary">Actual & Closure Station</h2>
        <p class="text-medium-emphasis">
          Catat pergerakan aktual dan siapkan flight closure sesuai kewenangan station aktif.
        </p>
      </div>
      <VSpacer />
      <VBtn prepend-icon="mdi-refresh" variant="tonal" @click="load">Perbarui</VBtn>
    </div>

    <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">{{ actionError }}</VAlert>

    <VCard border class="d-none d-lg-block">
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Route</th>
            <th>Status</th>
            <th>Jadwal</th>
            <th>Aktual berangkat</th>
            <th>Aktual tiba</th>
            <th>Kesiapan closure</th>
            <th class="text-right">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="8" class="py-6 text-center text-text-secondary">
              Memuat antrean actual dan closure...
            </td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="8" class="py-6 text-center text-text-secondary">
              Tidak ada flight pada tahap actual atau closure.
            </td>
          </tr>
          <tr v-for="flight in rows" v-else :key="flight.flightId">
            <td>
              <div class="font-weight-medium">{{ flight.flightNumber }}</div>
              <div class="text-xs text-text-secondary">{{ flight.aircraftRegistration }}</div>
            </td>
            <td>{{ flight.originStationCode }} → {{ flight.destinationStationCode }}</td>
            <td><FlightsFlightStatusChip :status="flight.currentStatusCode" /></td>
            <td>{{ formatDate(flight.scheduledDepartureAt) }}</td>
            <td>{{ formatDate(flight.actualDepartureAt) }}</td>
            <td>{{ formatDate(flight.actualArrivalAt) }}</td>
            <td>
              <DsStatusBadge :value="flight.technicalReadiness.status" />
              <div class="mt-1 text-caption text-medium-emphasis">
                {{ flight.technicalReadiness.blockerLabel ?? 'Tidak ada blocker teknis' }}
              </div>
            </td>
            <td class="text-right">
              <VTooltip text="Buka workspace flight">
                <template #activator="{ props }">
                  <VBtn
                    v-bind="props"
                    :aria-label="`Buka workspace ${flight.flightNumber}`"
                    class="mr-1"
                    density="comfortable"
                    icon="mdi-open-in-new"
                    :to="`/flights/station-operations/${flight.flightId}?tab=arrival`"
                    variant="text"
                  />
                </template>
              </VTooltip>
              <VTooltip v-if="nextAction(flight)" :text="String(nextAction(flight)?.label)">
                <template #activator="{ props }">
                  <VBtn
                    v-bind="props"
                    color="secondary"
                    density="comfortable"
                    :prepend-icon="nextAction(flight)?.icon"
                    :loading="loadingId === `${flight.flightId}-${nextAction(flight)?.action}`"
                    variant="tonal"
                    @click="runAction(flight, String(nextAction(flight)?.action))"
                  >
                    {{ nextAction(flight)?.label }}
                  </VBtn>
                </template>
              </VTooltip>
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <div class="d-grid d-lg-none ga-3">
      <VSkeletonLoader v-if="pending" type="article@3" />
      <VCard v-for="flight in rows" v-else :key="flight.flightId" border>
        <VCardText>
          <div class="d-flex align-start justify-space-between ga-3">
            <div>
              <strong>{{ flight.flightNumber }}</strong>
              <div>{{ flight.originStationCode }} → {{ flight.destinationStationCode }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ flight.aircraftRegistration }} · {{ formatDate(flight.scheduledDepartureAt) }}
              </div>
            </div>
            <FlightsFlightStatusChip :status="flight.currentStatusCode" />
          </div>
          <VDivider class="my-3" />
          <div class="d-flex align-center ga-2">
            <DsStatusBadge :value="flight.technicalReadiness.status" />
            <span class="text-body-2">
              {{ flight.technicalReadiness.blockerLabel ?? 'Tidak ada blocker teknis' }}
            </span>
          </div>
        </VCardText>
        <VCardActions class="flex-wrap">
          <VBtn
            :to="`/flights/station-operations/${flight.flightId}?tab=arrival`"
            size="small"
            variant="text"
          >
            Buka workspace
          </VBtn>
          <VBtn
            v-if="nextAction(flight)"
            color="secondary"
            :loading="loadingId === `${flight.flightId}-${nextAction(flight)?.action}`"
            size="small"
            variant="tonal"
            @click="runAction(flight, String(nextAction(flight)?.action))"
          >
            {{ nextAction(flight)?.label }}
          </VBtn>
        </VCardActions>
      </VCard>
      <VCard v-if="!pending && rows.length === 0" border class="pa-8 text-center">
        <VIcon class="mb-2" icon="mdi-airplane-check" size="38" />
        <div>Tidak ada flight pada tahap actual atau closure.</div>
      </VCard>
    </div>

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
  </section>
</template>
