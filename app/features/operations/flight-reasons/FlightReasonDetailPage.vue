<script setup lang="ts">
import type { FlightReasonDto } from '#shared/features/operations/flight-reasons';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('flight-reasons-' + pageRoute.params.id, () =>
  fetchApi<FlightReasonDto>('/api/master-data/flight-reasons/' + pageRoute.params.id)
);
const display = (value: unknown) =>
  Array.isArray(value)
    ? value.join(', ')
    : typeof value === 'boolean'
      ? value
        ? 'Yes'
        : 'No'
      : (value ?? '-');
</script>
<template>
  <VContainer class="px-3 py-5" fluid>
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/flight-reasons" variant="text">
      Flight Reasons
    </VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.reasonName }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Reason code</strong>
              <div>{{ display(record.reasonCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Reason name</strong>
              <div>{{ display(record.reasonName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Reason type</strong>
              <div>{{ display(record.reasonType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Category</strong>
              <div>{{ display(record.category) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Description</strong>
              <div>{{ display(record.description) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Require operator note</strong>
              <div>{{ display(record.requiresNote) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Operational KPI impact</strong>
              <div>{{ display(record.affectsOperationalKpi) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Require finance review</strong>
              <div>{{ display(record.affectsFinanceReview) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Operational severity</strong>
              <div>{{ display(record.dashboardSeverity) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
