<script setup lang="ts">
import type { HandlingParkingSupplierDto } from '#shared/features/finance/handling-parking-suppliers';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData(
  'handling-parking-suppliers-' + pageRoute.params.id,
  () =>
    fetchApi<HandlingParkingSupplierDto>(
      '/api/master-data/handling-parking-suppliers/' + pageRoute.params.id
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/handling-parking-suppliers" variant="text">
      Handling & Parking
    </VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.supplierName }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Supplier code</strong>
              <div>{{ display(record.supplierCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Supplier name</strong>
              <div>{{ display(record.supplierName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Station</strong>
              <div>{{ display(record.stationId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Service type</strong>
              <div>{{ display(record.serviceType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Reference rate</strong>
              <div>{{ display(record.referenceRate) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Currency</strong>
              <div>{{ display(record.currencyId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Contact person</strong>
              <div>{{ display(record.contactPerson) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Phone</strong>
              <div>{{ display(record.phone) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
