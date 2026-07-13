<script setup lang="ts">
import type { CustomerDto } from '#shared/features/commercial/customers';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('customers-' + pageRoute.params.id, () =>
  fetchApi<CustomerDto>('/api/master-data/customers/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/customers" variant="text">Customers</VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.accountName }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Account type</strong>
              <div>{{ display(record.accountType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Account code</strong>
              <div>{{ display(record.accountCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Account name</strong>
              <div>{{ display(record.accountName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Primary contact person</strong>
              <div>{{ display(record.contactPerson) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Phone</strong>
              <div>{{ display(record.phone) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Primary email</strong>
              <div>{{ display(record.email) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Billing address</strong>
              <div>{{ display(record.billingAddress) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Payment term</strong>
              <div>{{ display(record.paymentTermId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Credit limit</strong>
              <div>{{ display(record.creditLimit) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
