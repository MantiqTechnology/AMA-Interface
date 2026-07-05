<script setup lang="ts">
import { formatJayapuraDateTime, formatRouteCode } from '#operations/formatters';
const store = useAmaDemoStore();
const { can } = useAuthorization();

const readableRequests = computed(() =>
  store.data.value.flightRequests.filter(
    (request) =>
      can('flight_request.read', {
        flightRequest: request,
        route: store.routeForRequest(request)
      }).allowed
  )
);

const activeFlights = computed(() =>
  store.data.value.flights.filter((flight) => !['CLOSED', 'CANCELLED'].includes(flight.status))
);

const metrics = computed(() => ({
  requestsToday: readableRequests.value.length,
  readyForApproval: readableRequests.value.filter((request) => request.status === 'READY_FOR_APPROVAL')
    .length,
  blocked: readableRequests.value.filter((request) => request.status === 'BLOCKED').length,
  activeFlights: activeFlights.value.length,
  criticalAlerts: store.data.value.alerts.filter((alert) => alert.severity === 'CRITICAL' && !alert.isRead)
    .length,
  aircraftAvailable: store.data.value.aircraft.filter((aircraft) => aircraft.operationalStatus === 'AVAILABLE')
    .length
}));

const requestHeaders = [
  { title: 'Request', key: 'requestNumber', sortable: true },
  { title: 'Route', key: 'route', sortable: false },
  { title: 'Schedule', key: 'plannedDepartureAt', sortable: true },
  { title: 'Priority', key: 'priority', sortable: true },
  { title: 'Readiness', key: 'readiness', sortable: false },
  { title: 'Status', key: 'status', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'end' }
] as const;

const aircraftHeaders = [
  { title: 'Aircraft', key: 'registration' },
  { title: 'Model', key: 'model' },
  { title: 'Station', key: 'station' },
  { title: 'Status', key: 'operationalStatus' }
] as const;

function routeLabel(routeId: string) {
  const route = store.getRoute(routeId);
  const origin = store.getStation(route?.originStationId);
  const destination = store.getStation(route?.destinationStationId);
  return route && origin && destination ? formatRouteCode(origin.code, destination.code) : '-';
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-3xl font-bold text-text-primary">Operations Command Center</h1>
        <p class="text-text-muted">
          Alur demo: request komersial, readiness, dispatch approval, following, dan closure.
        </p>
      </div>
      <VSpacer />
      <VBtn color="primary" prepend-icon="mdi-refresh" @click="store.resetDemo">
        Reset Demo
      </VBtn>
    </div>

    <VRow>
      <VCol cols="12" sm="6" lg="2">
        <DsStatCard label="Request Hari Ini" :value="metrics.requestsToday" />
      </VCol>
      <VCol cols="12" sm="6" lg="2">
        <DsStatCard label="Ready Approval" :value="metrics.readyForApproval" tone="success" />
      </VCol>
      <VCol cols="12" sm="6" lg="2">
        <DsStatCard label="Blocked" :value="metrics.blocked" tone="danger" />
      </VCol>
      <VCol cols="12" sm="6" lg="2">
        <DsStatCard label="Active Flights" :value="metrics.activeFlights" />
      </VCol>
      <VCol cols="12" sm="6" lg="2">
        <DsStatCard label="Critical Alerts" :value="metrics.criticalAlerts" tone="danger" />
      </VCol>
      <VCol cols="12" sm="6" lg="2">
        <DsStatCard label="Aircraft Available" :value="metrics.aircraftAvailable" tone="success" />
      </VCol>
    </VRow>

    <VRow class="mt-1">
        <VCol cols="12" lg="8">
          <VCard border>
            <VCardTitle class="flex items-center gap-3 text-text-primary">
              Today's Flight Request Board
              <VChip color="secondary" size="small" variant="tonal">Asia/Jayapura</VChip>
            </VCardTitle>
            <CommonTableExpanded
              ref="requestTableRef"
              density="comfortable"
              fixed-header
              hide-default-footer
              hover
              item-value="id"
              :headers="requestHeaders"
              :items="readableRequests"
              :items-length="readableRequests.length"
              :items-per-page="Math.max(readableRequests.length, 1)"
              :fetch-detail="fetchFlightRequestDetail"
              :cache-ttl="60_000"
            >
              <template #[`item.requestNumber`]="{ item }">
                <NuxtLink
                  class="font-semibold text-text-primary no-underline"
                  :to="`/ops/flight-requests/${item.id}`"
                >
                  {{ item.requestNumber }}
                </NuxtLink>
                <div class="text-sm text-text-muted">{{ item.title }}</div>
              </template>

              <template #[`item.route`]="{ item }">
                {{ routeLabel(item.routeId) }}
              </template>

              <template #[`item.plannedDepartureAt`]="{ item }">
                {{ formatJayapuraDateTime(item.plannedDepartureAt) }}
              </template>

              <template #[`item.priority`]="{ item }">
                <DsStatusBadge :value="item.priority" />
              </template>

              <template #[`item.readiness`]="{ item }">
                <DsStatusBadge :value="store.getReadinessForRequest(item.id)?.overallState ?? 'PENDING'" />
              </template>

              <template #[`item.status`]="{ item }">
                <DsStatusBadge :value="item.status" />
              </template>

              <template #[`item.actions`]="{ item }">
                <VBtn
                  color="primary"
                  icon="mdi-open-in-new"
                  size="small"
                  :to="`/ops/flight-requests/${item.id}`"
                  variant="text"
                />
              </template>
              <template #detail="{ item, detail }">
                <VRow dense>
                  <VCol cols="12" md="4">
                    <div class="text-sm text-text-muted">Aircraft</div>
                    <div class="font-medium">{{ detail?.aircraftReg ?? '-' }}</div>
                  </VCol>
                  <VCol cols="12" md="4">
                    <div class="text-sm text-text-muted">Crew</div>
                    <div class="font-medium">{{ detail?.crewNames?.join(', ') ?? '-' }}</div>
                  </VCol>
                  <VCol cols="12" md="4">
                    <div class="text-sm text-text-muted">Cargo / Payload</div>
                    <div class="font-medium">{{ detail?.payloadKg ?? 0 }} kg</div>
                  </VCol>
                  <VCol cols="12">
                    <div class="text-sm text-text-muted">Notes</div>
                    <div>{{ detail?.notes ?? '—' }}</div>
                  </VCol>
                </VRow>
              </template>
            </CommonTableExpanded>
          </VCard>
        </VCol>

      <VCol cols="12" lg="4">
        <VCard border class="mb-4">
          <VCardTitle class="text-text-primary">Priority Alerts</VCardTitle>
          <VList lines="two">
            <VListItem
              v-for="alert in store.data.value.alerts"
              :key="alert.id"
              :to="
                alert.scopeType === 'FLIGHT_REQUEST'
                  ? `/ops/flight-requests/${alert.scopeId}`
                  : `/ops/flights/${alert.scopeId}`
              "
            >
              <template #prepend>
                <DsStatusBadge :value="alert.severity" />
              </template>
              <VListItemTitle>{{ alert.title }}</VListItemTitle>
              <VListItemSubtitle>{{ alert.message }}</VListItemSubtitle>
            </VListItem>
          </VList>
        </VCard>

        <VCard border>
          <VCardTitle class="text-text-primary">Aircraft Availability</VCardTitle>
          <VDataTableServer
            density="compact"
            hide-default-footer
            hover
            item-value="id"
            :headers="aircraftHeaders"
            :items="store.data.value.aircraft"
            :items-length="store.data.value.aircraft.length"
            :items-per-page="store.data.value.aircraft.length"
          >
            <template #[`item.registration`]="{ item }">
              <strong>{{ item.registration }}</strong>
            </template>
            <template #[`item.station`]="{ item }">
              {{ store.getStation(item.currentStationId)?.code ?? '-' }}
            </template>
            <template #[`item.operationalStatus`]="{ item }">
              <DsStatusBadge :value="item.operationalStatus" />
            </template>
          </VDataTableServer>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
