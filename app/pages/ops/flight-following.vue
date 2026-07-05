<script setup lang="ts">
import type { FlightStatus } from '#shared/types/ops-demo';
import { formatJayapuraDateTime, formatRouteCode } from '#operations/formatters';

const store = useAmaDemoStore();
const { canTransitionFlight } = useAuthorization();

const headers = [
  { title: 'Flight', key: 'flightNumber', sortable: true },
  { title: 'Route', key: 'route', sortable: false },
  { title: 'Planned', key: 'plannedDepartureAt', sortable: true },
  { title: 'Actual', key: 'actual', sortable: false },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Delay', key: 'delay', sortable: false },
  { title: 'Next', key: 'next', sortable: false, align: 'end' }
] as const;

const statusFlow: FlightStatus[] = [
  'SCHEDULED',
  'READY',
  'APPROVED',
  'BOARDING',
  'DEPARTED',
  'AIRBORNE',
  'LANDED',
  'CLOSED'
];

const flights = computed(() => store.data.value.flights);

function routeLabel(routeId: string) {
  const route = store.getRoute(routeId);
  const origin = store.getStation(route?.originStationId);
  const destination = store.getStation(route?.destinationStationId);
  return route && origin && destination ? formatRouteCode(origin.code, destination.code) : '-';
}

function nextStatus(status: FlightStatus) {
  return store.data.value.accessControl.flightTransitionMatrix[status]?.[0];
}

function updateToNext(flightId: string, status: FlightStatus) {
  const next = nextStatus(status);
  if (next) store.updateFlightStatus(flightId, next, `Manual following update to ${next}.`);
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5">
      <h1 class="text-3xl font-bold text-text-primary">Flight Following</h1>
      <p class="text-text-muted">
        Status manual demo. Real tracking intentionally out of scope for phase one.
      </p>
    </div>

    <VCard border class="mb-4">
      <VCardText>
        <div class="flex flex-wrap gap-2">
          <VChip v-for="status in statusFlow" :key="status" color="secondary" variant="tonal">
            {{ status }}
          </VChip>
        </div>
      </VCardText>
    </VCard>

    <VCard border>
      <VDataTableServer
        density="comfortable"
        fixed-header
        hover
        item-value="id"
        :headers="headers"
        :items="flights"
        :items-length="flights.length"
        :items-per-page="Math.max(flights.length, 1)"
      >
        <template #[`item.flightNumber`]="{ item }">
          <NuxtLink class="font-semibold text-text-primary no-underline" :to="`/ops/flights/${item.id}`">
            {{ item.flightNumber }}
          </NuxtLink>
          <div class="text-sm text-text-muted">
            {{ store.getAircraft(item.aircraftId)?.registration ?? '-' }}
          </div>
        </template>
        <template #[`item.route`]="{ item }">
          {{ routeLabel(item.routeId) }}
        </template>
        <template #[`item.plannedDepartureAt`]="{ item }">
          <div>{{ formatJayapuraDateTime(item.plannedDepartureAt) }}</div>
          <div class="text-sm text-text-muted">{{ formatJayapuraDateTime(item.plannedArrivalAt) }}</div>
        </template>
        <template #[`item.actual`]="{ item }">
          <div>{{ item.actualDepartureAt ? formatJayapuraDateTime(item.actualDepartureAt) : '-' }}</div>
          <div class="text-sm text-text-muted">
            {{ item.actualArrivalAt ? formatJayapuraDateTime(item.actualArrivalAt) : '-' }}
          </div>
        </template>
        <template #[`item.status`]="{ item }">
          <DsStatusBadge :value="item.status" />
          <div class="mt-1 text-sm text-text-muted">{{ item.currentPositionText }}</div>
        </template>
        <template #[`item.delay`]="{ item }">
          <span v-if="item.delay.isDelayed">{{ item.delay.minutes }} min</span>
          <span v-else>-</span>
          <div class="text-sm text-text-muted">{{ item.delay.reasonText }}</div>
        </template>
        <template #[`item.next`]="{ item }">
          <VBtn
            v-if="nextStatus(item.status)"
            color="primary"
            size="small"
            :disabled="!canTransitionFlight(item, nextStatus(item.status)!).allowed"
            variant="tonal"
            @click="updateToNext(item.id, item.status)"
          >
            {{ nextStatus(item.status) }}
          </VBtn>
        </template>
      </VDataTableServer>
    </VCard>
  </VContainer>
</template>
