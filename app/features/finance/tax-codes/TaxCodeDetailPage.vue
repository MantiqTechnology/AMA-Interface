<script setup lang="ts">
import type { TaxCodeDto } from '#shared/features/finance/tax-codes';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('tax-codes-' + pageRoute.params.id, () =>
  fetchApi<TaxCodeDto>('/api/master-data/tax-codes/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/tax-codes" variant="text">Tax Codes</VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.taxName }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Tax code</strong>
              <div>{{ display(record.taxCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Tax name</strong>
              <div>{{ display(record.taxName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Tax rate</strong>
              <div>{{ display(record.taxRateBasisPoints) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Tax type</strong>
              <div>{{ display(record.taxType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Effective from</strong>
              <div>{{ display(record.effectiveFrom) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Effective to</strong>
              <div>{{ display(record.effectiveTo) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
