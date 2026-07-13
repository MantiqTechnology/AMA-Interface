<script setup lang="ts">
import type { FuelSupplierDto } from '#shared/features/finance/fuel-suppliers';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('fuel-suppliers-' + pageRoute.params.id, () =>
  fetchApi<FuelSupplierDto>('/api/master-data/fuel-suppliers/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/fuel-suppliers" variant="text">
      Fuel Suppliers
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
              <strong>Fuel type</strong>
              <div>{{ display(record.fuelType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Reference price per litre</strong>
              <div>{{ display(record.referencePricePerLitre) }}</div>
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
