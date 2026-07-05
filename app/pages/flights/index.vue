<script setup lang="ts">
import type { FlightSummaryDto } from '#shared/contracts/flights';

const status = ref('');
const statusOptions = [
  { title: 'All', value: '' },
  { title: 'Draft', value: 'draft' },
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Ready', value: 'ready' },
  { title: 'Dispatched', value: 'dispatched' },
  { title: 'Completed', value: 'completed' }
];

const { data: flights, refresh } = await useAsyncData('flights', () =>
  fetchApi<FlightSummaryDto[]>('/api/flights', {
    query: status.value ? { status: status.value } : undefined
  })
);

watch(status, () => refresh());
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Flights</h1>
        <p class="text-text-muted">
          Orders, aircraft assignment, route, manifest count, and dispatch status.
        </p>
      </div>
      <VSpacer />
      <VSelect
        v-model="status"
        density="compact"
        hide-details
        item-title="title"
        item-value="value"
        label="Status"
        max-width="220"
        :items="statusOptions"
        variant="outlined"
      />
    </div>

    <VCard border>
      <FeatureFlightTable :flights="flights ?? []" />
    </VCard>
  </VContainer>
</template>
