<script setup lang="ts">
import type { ChartOfAccountDto } from '#shared/features/finance/chart-of-accounts';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('chart-of-accounts-' + pageRoute.params.id, () =>
  fetchApi<ChartOfAccountDto>('/api/master-data/chart-of-accounts/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/chart-of-accounts" variant="text">
      Chart of Accounts
    </VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.accountName }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Account code</strong>
              <div>{{ display(record.accountCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Account name</strong>
              <div>{{ display(record.accountName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Account type</strong>
              <div>{{ display(record.accountType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Normal balance</strong>
              <div>{{ display(record.normalBalance) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Parent account</strong>
              <div>{{ display(record.parentAccountId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Postable account</strong>
              <div>{{ display(record.isPostable) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
