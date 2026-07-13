<script setup lang="ts">
import type { VendorDto } from '#shared/features/finance/vendors';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('vendors-' + pageRoute.params.id, () =>
  fetchApi<VendorDto>('/api/master-data/vendors/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/vendors" variant="text">Vendors</VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.vendorName }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Vendor code</strong>
              <div>{{ display(record.vendorCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Vendor name</strong>
              <div>{{ display(record.vendorName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Vendor type</strong>
              <div>{{ display(record.vendorType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Coverage station</strong>
              <div>{{ display(record.stationId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Contact person</strong>
              <div>{{ display(record.contactPerson) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Phone</strong>
              <div>{{ display(record.phone) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Email</strong>
              <div>{{ display(record.email) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Payment term</strong>
              <div>{{ display(record.paymentTermId) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
