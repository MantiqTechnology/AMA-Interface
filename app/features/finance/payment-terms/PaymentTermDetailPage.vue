<script setup lang="ts">
import type { PaymentTermDto } from '#shared/features/finance/payment-terms';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('payment-terms-' + pageRoute.params.id, () =>
  fetchApi<PaymentTermDto>('/api/master-data/payment-terms/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/payment-terms" variant="text">
      Payment Terms
    </VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.termName }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Term code</strong>
              <div>{{ display(record.termCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Term name</strong>
              <div>{{ display(record.termName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Due days</strong>
              <div>{{ display(record.dueDays) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Description</strong>
              <div>{{ display(record.description) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
