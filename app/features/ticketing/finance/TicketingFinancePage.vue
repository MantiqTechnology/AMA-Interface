<script setup lang="ts">
import type { TicketingLedgerDto } from '#shared/features/ticketing/finance';
import { formatTicketingCurrency, formatTicketingDateTime } from '../formatters';

const {
  data: ledger,
  pending,
  error
} = await useAsyncData(
  'ticketing-finance-ledger',
  () => fetchApi<TicketingLedgerDto>('/api/ticketing/ledger'),
  {
    default: () => ({
      totals: [],
      unpaidCount: 0,
      entries: []
    })
  }
);
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <div class="mb-5">
      <h1 class="text-h4 font-weight-bold">Station Ledger</h1>
      <p class="text-text-secondary">
        Passenger and cargo collections from ticketing transactions.
      </p>
    </div>
    <VAlert v-if="error" class="mb-4" color="error">{{ error.message }}</VAlert>
    <VRow class="mb-4">
      <VCol v-for="total in ledger.totals" :key="total.currencyCode" cols="12" sm="6" lg="4">
        <VCard border>
          <VCardText>
            <div class="text-sm text-text-secondary">{{ total.currencyCode }} collected</div>
            <div class="mt-2 text-h5 font-weight-bold">
              {{ formatTicketingCurrency(total.totalRevenue, total.currencyCode) }}
            </div>
            <div class="mt-2 text-xs text-text-secondary">
              Passenger {{ formatTicketingCurrency(total.passengerRevenue, total.currencyCode) }} ·
              Cargo {{ formatTicketingCurrency(total.cargoRevenue, total.currencyCode) }}
            </div>
            <div class="mt-1 text-xs text-error">
              Refunds {{ formatTicketingCurrency(total.refunds, total.currencyCode) }}
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" sm="6" lg="4">
        <VCard border>
          <VCardText>
            <div class="text-sm text-text-secondary">Awaiting payment</div>
            <div class="mt-2 text-h5 font-weight-bold">{{ ledger.unpaidCount }}</div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
    <VCard border>
      <VCardTitle>Transaction ledger</VCardTitle><VDivider />
      <VCardText>
        <VSkeletonLoader v-if="pending" type="table" />
        <VTable v-else class="ledger-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Type</th>
              <th>Flight</th>
              <th>Party</th>
              <th>Agent</th>
              <th>Date</th>
              <th>Status</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in ledger.entries" :key="`${entry.entryType}-${entry.id}`">
              <td>
                <strong>{{ entry.referenceNumber }}</strong>
              </td>
              <td>
                <VChip size="small" variant="tonal">{{ entry.entryType }}</VChip>
              </td>
              <td>
                {{ entry.flightNumber }}
                <div class="text-xs text-text-secondary">{{ entry.routeLabel }}</div>
              </td>
              <td>{{ entry.customerName }}</td>
              <td>{{ entry.agentName || 'Direct' }}</td>
              <td>{{ formatTicketingDateTime(entry.occurredAt) }}</td>
              <td>
                <VChip
                  :color="
                    entry.paymentStatus === 'PAID'
                      ? 'success'
                      : entry.paymentStatus === 'REFUNDED'
                        ? 'error'
                        : 'warning'
                  "
                  size="small"
                >
                  {{ entry.paymentStatus }}
                </VChip>
              </td>
              <td :class="['text-right font-weight-bold', entry.amount < 0 ? 'text-error' : '']">
                {{ formatTicketingCurrency(entry.amount, entry.currencyCode) }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>
  </VContainer>
</template>

<style scoped>
.ledger-table {
  min-width: 980px;
}
</style>
