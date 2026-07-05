<script setup lang="ts">
import type { FlightStatus } from '#shared/types/ops-demo';
import { formatJayapuraDateTime, formatRouteCode } from '#operations/formatters';

const route = useRoute();
const store = useAmaDemoStore();
const { canTransitionFlight } = useAuthorization();

const flightId = computed(() => String(route.params.id));
const flight = computed(() => store.getFlight(flightId.value));
const routeData = computed(() => store.routeForFlight(flight.value));
const origin = computed(() => store.getStation(routeData.value?.originStationId));
const destination = computed(() => store.getStation(routeData.value?.destinationStationId));
const aircraft = computed(() => store.getAircraft(flight.value?.aircraftId));
const crew = computed(() => (flight.value ? store.getCrew(flight.value.crewIds) : []));

function routeLabel() {
  return origin.value && destination.value
    ? formatRouteCode(origin.value.code, destination.value.code)
    : '-';
}

function nextStatus(status: FlightStatus) {
  return store.data.value.accessControl.flightTransitionMatrix[status]?.[0];
}

function updateToNext() {
  if (!flight.value) return;
  const next = nextStatus(flight.value.status);
  if (next) store.updateFlightStatus(flight.value.id, next, `Manual flight detail update to ${next}.`);
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <VAlert v-if="!flight" color="warning" variant="tonal">Flight tidak ditemukan.</VAlert>

    <template v-else>
      <div class="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h1 class="text-3xl font-bold text-text-primary">{{ flight.flightNumber }}</h1>
          <p class="text-text-muted">{{ routeLabel() }} | {{ aircraft?.registration }}</p>
          <div class="mt-2 flex gap-2">
            <DsStatusBadge :value="flight.status" />
            <VChip v-if="flight.delay.isDelayed" color="warning" size="small" variant="tonal">
              Delay {{ flight.delay.minutes }} min
            </VChip>
          </div>
        </div>
        <VSpacer />
        <VBtn color="primary" to="/ops/flight-following" variant="text">Following Board</VBtn>
        <VBtn
          v-if="nextStatus(flight.status)"
          color="secondary"
          :disabled="!canTransitionFlight(flight, nextStatus(flight.status)!).allowed"
          @click="updateToNext"
        >
          Move to {{ nextStatus(flight.status) }}
        </VBtn>
        <VBtn color="success" :to="`/ops/flight-closure/${flight.id}`" variant="tonal">
          Closure
        </VBtn>
      </div>

      <VRow>
        <VCol cols="12" md="4">
          <VCard border class="h-full">
            <VCardTitle class="text-text-primary">Schedule</VCardTitle>
            <VCardText>
              <div class="text-sm text-text-muted">Planned departure</div>
              <div class="font-semibold">{{ formatJayapuraDateTime(flight.plannedDepartureAt) }}</div>
              <div class="mt-3 text-sm text-text-muted">Actual departure</div>
              <div class="font-semibold">{{ formatJayapuraDateTime(flight.actualDepartureAt) }}</div>
              <div class="mt-3 text-sm text-text-muted">Actual arrival</div>
              <div class="font-semibold">{{ formatJayapuraDateTime(flight.actualArrivalAt) }}</div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard border class="h-full">
            <VCardTitle class="text-text-primary">Aircraft & Crew</VCardTitle>
            <VCardText>
              <div class="font-semibold">{{ aircraft?.registration }}</div>
              <div class="text-text-muted">{{ aircraft?.manufacturer }} {{ aircraft?.model }}</div>
              <VDivider class="my-3" />
              <div v-for="member in crew" :key="member.id" class="mb-2">
                <div class="font-medium">{{ member.name }}</div>
                <div class="text-sm text-text-muted">{{ member.role }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard border class="h-full">
            <VCardTitle class="text-text-primary">Manifest Summary</VCardTitle>
            <VCardText>
              <div class="text-3xl font-bold text-text-primary">
                {{ flight.manifestSummary.passengerCount }}
              </div>
              <div class="text-text-muted">Passengers</div>
              <div class="mt-4 text-3xl font-bold text-text-primary">
                {{ flight.manifestSummary.cargoWeightKg }} kg
              </div>
              <div class="text-text-muted">Cargo</div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <VCard border class="mt-4">
        <VCardTitle class="text-text-primary">Timeline</VCardTitle>
        <VTimeline density="compact" side="end">
          <VTimelineItem v-for="item in flight.timeline" :key="`${item.at}-${item.event}`" dot-color="secondary">
            <div class="font-semibold">{{ item.event }}</div>
            <div class="text-sm text-text-muted">{{ formatJayapuraDateTime(item.at) }} by {{ item.actor }}</div>
            <div>{{ item.note }}</div>
          </VTimelineItem>
        </VTimeline>
      </VCard>

      <VCard v-if="flight.status === 'CLOSED' && flight.closure" border class="mt-4">
        <VCardTitle class="text-text-primary">Finance & Maintenance Handoff Preview</VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <div class="text-sm text-text-muted">Finance handoff</div>
              <DsStatusBadge :value="flight.closure.financeHandoffStatus" />
              <p class="mt-2">Fuel used {{ flight.closure.fuelUsedLiters }} L.</p>
            </VCol>
            <VCol cols="12" md="6">
              <div class="text-sm text-text-muted">Maintenance handoff</div>
              <DsStatusBadge :value="flight.closure.maintenanceHandoffStatus" />
              <p class="mt-2">Incident reported: {{ flight.closure.incidentReported ? 'Yes' : 'No' }}</p>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
