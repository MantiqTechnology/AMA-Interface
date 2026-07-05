<script setup lang="ts">
import { formatJayapuraDateTime, formatRouteCode } from '#operations/formatters';

const store = useAmaDemoStore();
const { can } = useAuthorization();

const search = ref('');
const status = ref('');

const statusOptions = [
  { title: 'Semua status', value: '' },
  { title: 'Ready for approval', value: 'READY_FOR_APPROVAL' },
  { title: 'Blocked', value: 'BLOCKED' },
  { title: 'Converted to flight', value: 'CONVERTED_TO_FLIGHT' },
  { title: 'Rejected', value: 'REJECTED' }
];

const headers = [
  { title: 'Request', key: 'requestNumber', sortable: true },
  { title: 'Source', key: 'source', sortable: true },
  { title: 'Route', key: 'route', sortable: false },
  { title: 'Departure', key: 'plannedDepartureAt', sortable: true },
  { title: 'Aircraft', key: 'aircraft', sortable: false },
  { title: 'Blockers', key: 'blockers', sortable: false },
  { title: 'Status', key: 'status', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'end' }
] as const;

const filteredRequests = computed(() =>
  store.data.value.flightRequests
    .filter(
      (request) =>
        can('flight_request.read', {
          flightRequest: request,
          route: store.routeForRequest(request)
        }).allowed
    )
    .filter((request) => (status.value ? request.status === status.value : true))
    .filter((request) => {
      const keyword = search.value.trim().toLowerCase();
      if (!keyword) return true;
      return [request.requestNumber, request.title, request.source, request.priority]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    })
);

function routeLabel(routeId: string) {
  const route = store.getRoute(routeId);
  const origin = store.getStation(route?.originStationId);
  const destination = store.getStation(route?.destinationStationId);
  return route && origin && destination ? formatRouteCode(origin.code, destination.code) : '-';
}

function blockerCount(requestId: string) {
  return (
    store.getReadinessForRequest(requestId)?.items.filter((item) => item.state === 'BLOCKER').length ?? 0
  );
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-3xl font-bold text-text-primary">Flight Requests</h1>
        <p class="text-text-muted">Daftar request operasional dari fixture PT AMA.</p>
      </div>
      <VSpacer />
      <VTextField
        v-model="search"
        density="compact"
        hide-details
        label="Search"
        max-width="280"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
      />
      <VSelect
        v-model="status"
        density="compact"
        hide-details
        item-title="title"
        item-value="value"
        label="Status"
        max-width="240"
        :items="statusOptions"
        variant="outlined"
      />
    </div>

    <VCard border>
      <VDataTableServer
        density="comfortable"
        fixed-header
        hover
        item-value="id"
        :headers="headers"
        :items="filteredRequests"
        :items-length="filteredRequests.length"
        :items-per-page="Math.max(filteredRequests.length, 1)"
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
        <template #[`item.source`]="{ item }">
          <DsStatusBadge :value="item.source" />
        </template>
        <template #[`item.route`]="{ item }">
          {{ routeLabel(item.routeId) }}
        </template>
        <template #[`item.plannedDepartureAt`]="{ item }">
          {{ formatJayapuraDateTime(item.plannedDepartureAt) }}
        </template>
        <template #[`item.aircraft`]="{ item }">
          {{ store.getAircraft(item.assignedAircraftId)?.registration ?? '-' }}
        </template>
        <template #[`item.blockers`]="{ item }">
          {{ blockerCount(item.id) }}
        </template>
        <template #[`item.status`]="{ item }">
          <DsStatusBadge :value="item.status" />
        </template>
        <template #[`item.actions`]="{ item }">
          <VBtn color="primary" size="small" :to="`/ops/flight-requests/${item.id}`" variant="tonal">
            Open
          </VBtn>
        </template>
      </VDataTableServer>
    </VCard>
  </VContainer>
</template>
