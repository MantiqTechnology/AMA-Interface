<script setup lang="ts">
import type { FlightSummaryDto } from '#shared/contracts/flights';

const props = defineProps<{
  flights: FlightSummaryDto[];
}>();

const headers = [
  { title: 'Flight', key: 'flightNumber', sortable: true },
  { title: 'Route', key: 'route', sortable: false },
  { title: 'Aircraft', key: 'aircraft', sortable: false },
  { title: 'Customer', key: 'customer', sortable: false },
  { title: 'Departure', key: 'scheduledDeparture', sortable: true },
  { title: 'Status', key: 'status', sortable: true, align: 'end' }
] as const;

const itemsLength = computed(() => props.flights.length);

function formatDeparture(value: string) {
  return new Date(value).toLocaleString('id-ID');
}
</script>

<template>
  <CommonTableExpanded
    density="comfortable"
    fixed-header
    gridlines="horizontal"
    hide-default-footer
    hover
    item-value="id"
    :headers="headers"
    :items="flights"
    :items-length="itemsLength"
    :items-per-page="Math.max(itemsLength, 1)"
  >
    <template #[`item.flightNumber`]="{ item }">
      <NuxtLink class="text-text-primary text-decoration-none" :to="`/flights/${item.id}`">
        <strong>{{ item.flightNumber }}</strong>
        <div class="text-text-muted">{{ item.orderNumber }}</div>
      </NuxtLink>
    </template>

    <template #[`item.route`]="{ item }">
      {{ item.route.origin.code }} -> {{ item.route.destination.code }}
      <div class="text-text-muted">{{ item.route.estimatedBlockMinutes }} min</div>
    </template>

    <template #[`item.aircraft`]="{ item }">
      {{ item.aircraft.tailNumber }}
      <div class="text-text-muted">{{ item.aircraft.type }}</div>
    </template>

    <template #[`item.customer`]="{ item }">
      {{ item.customer.name }}
    </template>

    <template #[`item.scheduledDeparture`]="{ item }">
      {{ formatDeparture(item.scheduledDeparture) }}
    </template>

    <template #[`item.status`]="{ item }">
      <DsStatusBadge :value="item.status" />
    </template>
  </CommonTableExpanded>
</template>
