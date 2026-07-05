<script setup lang="ts">
import type { InvoiceDetailDto, PaymentDto } from '#shared/contracts/invoices';

const route = useRoute();
const id = computed(() => String(route.params.id));

const { data: invoice, refresh } = await useAsyncData(`invoice-${id.value}`, () =>
  fetchApi<InvoiceDetailDto>(`/api/invoices/${id.value}`)
);

async function recordSamplePayment() {
  if (!invoice.value) return;

  const payment = Math.min(invoice.value.balanceDue, 25000000);
  if (payment <= 0) return;

  await fetchApi<PaymentDto>(`/api/invoices/${id.value}/actions/record-payment`, {
    method: 'POST',
    body: {
      amount: payment,
      currency: invoice.value.currency,
      paidAt: new Date().toISOString(),
      method: 'bank_transfer',
      reference: `DEMO-${Date.now()}`
    }
  });
  await refresh();
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div v-if="invoice" class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">
          {{ invoice.invoiceNumber }}
        </h1>
        <p class="text-text-muted">
          {{ invoice.customer.name }} - {{ invoice.flight.flightNumber }}
        </p>
      </div>
      <VSpacer />
      <VBtn color="primary" @click="recordSamplePayment">
        Record Payment
      </VBtn>
    </div>

    <template v-if="invoice">
      <VRow>
        <VCol cols="12" md="4">
          <DsStatCard label="Invoice Total" :value="invoice.total.toLocaleString('id-ID')" />
        </VCol>
        <VCol cols="12" md="4">
          <DsStatCard
            label="Balance Due"
            :value="invoice.balanceDue.toLocaleString('id-ID')"
            tone="warning"
          />
        </VCol>
        <VCol cols="12" md="4">
          <VCard border>
            <VCardTitle class="text-text-primary">Status</VCardTitle>
            <VCardText>
              <DsStatusBadge :value="invoice.status" />
              <p class="mt-2 text-text-muted">
                Due {{ new Date(invoice.dueAt).toLocaleDateString('id-ID') }}
              </p>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <VCard border class="mt-4">
        <VCardTitle class="text-text-primary">Payments</VCardTitle>
        <VTable density="comfortable">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Date</th>
              <th>Method</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="payment in invoice.payments" :key="payment.id">
              <td>{{ payment.reference }}</td>
              <td>{{ new Date(payment.paidAt).toLocaleString('id-ID') }}</td>
              <td>{{ payment.method.replaceAll('_', ' ') }}</td>
              <td>{{ payment.currency }} {{ payment.amount.toLocaleString('id-ID') }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </template>
  </VContainer>
</template>
