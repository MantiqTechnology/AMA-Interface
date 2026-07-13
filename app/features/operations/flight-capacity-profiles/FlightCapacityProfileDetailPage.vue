<script setup lang="ts">
import type { FlightCapacityProfileDto } from '#shared/features/operations/flight-capacity-profiles';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData(
  'flight-capacity-profiles-' + pageRoute.params.id,
  () =>
    fetchApi<FlightCapacityProfileDto>(
      '/api/master-data/flight-capacity-profiles/' + pageRoute.params.id
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/flight-capacity-profiles" variant="text">
      Capacity Profiles
    </VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.profileCode }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Profile code</strong>
              <div>{{ display(record.profileCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Profile name</strong>
              <div>{{ display(record.profileName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Aircraft</strong>
              <div>{{ display(record.aircraftId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Route</strong>
              <div>{{ display(record.routeId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Operation type</strong>
              <div>{{ display(record.serviceTypeId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Total seats</strong>
              <div>{{ display(record.seatCapacity) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Maximum cargo capacity</strong>
              <div>{{ display(record.cargoCapacityKg) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Blocked seats</strong>
              <div>{{ display(record.reservedSeatCount) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Reserved operational cargo</strong>
              <div>{{ display(record.reservedCargoKg) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Capacity note</strong>
              <div>{{ display(record.capacityNote) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
