<script setup lang="ts">
import type { PersonnelDto } from '#shared/features/operations/personnel';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('personnel-' + pageRoute.params.id, () =>
  fetchApi<PersonnelDto>('/api/master-data/personnel/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/personnel" variant="text">
      Pilot & Crew
    </VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.fullName }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Employee code</strong>
              <div>{{ display(record.employeeCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Full legal name</strong>
              <div>{{ display(record.fullName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Crew role</strong>
              <div>{{ display(record.crewRole) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Primary license type</strong>
              <div>{{ display(record.licenseType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Primary license number</strong>
              <div>{{ display(record.licenseNumber) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>License expiry</strong>
              <div>{{ display(record.licenseExpiryDate) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Medical certificate expiry</strong>
              <div>{{ display(record.medicalExpiryDate) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Base station</strong>
              <div>{{ display(record.baseStationId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Availability</strong>
              <div>{{ display(record.availabilityStatus) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Duty station</strong>
              <div>{{ display(record.dutyStationId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Operational note</strong>
              <div>{{ display(record.readinessNote) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Unit</strong>
              <div>{{ display(record.unit) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Employment status</strong>
              <div>{{ display(record.employmentStatus) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
