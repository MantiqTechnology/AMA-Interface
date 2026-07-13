<script setup lang="ts">
import type { CurrencyDto } from '#shared/features/finance/currencies';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('currencies-' + pageRoute.params.id, () =>
  fetchApi<CurrencyDto>('/api/master-data/currencies/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/currencies" variant="text">
      Currencies
    </VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.currencyName }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Currency code</strong>
              <div>{{ display(record.currencyCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Currency name</strong>
              <div>{{ display(record.currencyName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Symbol</strong>
              <div>{{ display(record.symbol) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Decimal places</strong>
              <div>{{ display(record.decimalPlaces) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
