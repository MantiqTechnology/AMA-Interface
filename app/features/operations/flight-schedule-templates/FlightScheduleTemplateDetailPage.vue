<script setup lang="ts">
import type { FlightScheduleTemplateDto } from '#shared/features/operations/flight-schedule-templates';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData(
  'flight-schedule-templates-' + pageRoute.params.id,
  () =>
    fetchApi<FlightScheduleTemplateDto>(
      '/api/master-data/flight-schedule-templates/' + pageRoute.params.id
    )
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/flight-schedule-templates" variant="text">
      Schedule Templates
    </VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.templateCode }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Template code</strong>
              <div>{{ display(record.templateCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Route</strong>
              <div>{{ display(record.routeId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Service type</strong>
              <div>{{ display(record.serviceTypeId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Default aircraft</strong>
              <div>{{ display(record.defaultAircraftId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Operating days</strong>
              <div>{{ display(record.operatingDays) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Departure local</strong>
              <div>{{ display(record.departureTimeLocal) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Arrival local</strong>
              <div>{{ display(record.arrivalTimeLocal) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Booking opens before</strong>
              <div>{{ display(record.bookingOpenHoursBefore) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Booking closes before</strong>
              <div>{{ display(record.bookingCloseMinutesBefore) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Schedule note</strong>
              <div>{{ display(record.scheduleNote) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
