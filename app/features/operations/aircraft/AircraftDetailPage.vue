<script setup lang="ts">
import type { AircraftDto } from '#shared/features/operations/aircraft';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('aircraft-' + pageRoute.params.id, () =>
  fetchApi<AircraftDto>('/api/master-data/aircraft/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/aircraft" variant="text">Aircraft</VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.registrationNumber }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Registration number</strong>
              <div>{{ display(record.registrationNumber) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Serial number / MSN</strong>
              <div>{{ display(record.serialNumber) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Aircraft type</strong>
              <div>{{ display(record.aircraftType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Manufacturer</strong>
              <div>{{ display(record.manufacturer) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Model</strong>
              <div>{{ display(record.model) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Fleet code</strong>
              <div>{{ display(record.fleetCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Passenger capacity</strong>
              <div>{{ display(record.passengerCapacity) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Cargo capacity kg</strong>
              <div>{{ display(record.cargoCapacityKg) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Fuel type</strong>
              <div>{{ display(record.fuelType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Default capacity profile</strong>
              <div>{{ display(record.defaultCapacityProfileId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Operational status</strong>
              <div>{{ display(record.operationalStatus) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Serviceability</strong>
              <div>{{ display(record.serviceabilityStatus) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Home base</strong>
              <div>{{ display(record.baseStationId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Current station</strong>
              <div>{{ display(record.currentStationId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Last inspection date</strong>
              <div>{{ display(record.lastMaintenanceCheckAt) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Next scheduled maintenance date</strong>
              <div>{{ display(record.nextMaintenanceDueAt) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Operational restriction or maintenance note</strong>
              <div>{{ display(record.serviceabilityNote) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
