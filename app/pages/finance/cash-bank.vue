<script setup lang="ts">
import type { CashBookTransactionDto } from '#shared/features/finance/reconciliation';
type CashAccount = {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  currencyCode: string;
  glAccountCode: string;
  balanceMinor: number;
};
useHead({ title: 'Cash and Bank - PT AMA' });
const selectedAccount = ref<string>();
const {
  data: accounts,
  pending,
  error
} = await useAsyncData(
  'finance-cash-accounts',
  () => fetchApi<CashAccount[]>('/api/finance/cash-bank/accounts'),
  { default: () => [] }
);
watchEffect(() => {
  if (!selectedAccount.value && accounts.value[0]) selectedAccount.value = accounts.value[0].id;
});
const {
  data: transactions,
  pending: transactionsPending,
  error: transactionsError,
  refresh
} = await useAsyncData(
  'finance-cash-book',
  () =>
    selectedAccount.value
      ? fetchApi<CashBookTransactionDto[]>('/api/finance/cash-bank/book-transactions', {
          query: { accountId: selectedAccount.value }
        })
      : Promise.resolve([]),
  { default: () => [], watch: [selectedAccount] }
);
function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}
</script>
<template>
  <VContainer class="px-3 py-5" fluid>
    <header class="mb-4 d-flex flex-wrap align-end ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold">Cash & Bank</h1>
        <p class="text-body-2 text-text-secondary">
          Book transactions are projected from posted cash/bank journal lines.
        </p>
      </div>
      <VSpacer /><VSelect
        v-model="selectedAccount"
        hide-details
        item-title="accountName"
        item-value="id"
        :items="accounts"
        label="Account"
        style="max-width: 300px"
        variant="outlined"
      /><VBtn
        aria-label="Refresh cash book"
        icon="mdi-refresh"
        :loading="pending || transactionsPending"
        variant="tonal"
        @click="refresh"
      />
    </header>
    <VAlert
      v-if="error || transactionsError"
      class="mb-4"
      color="error"
      title="Cash book unavailable"
      variant="tonal"
    >
      {{ error?.message || transactionsError?.message }}
    </VAlert>
    <section class="mb-4 d-flex flex-wrap ga-3">
      <VCard
        v-for="account in accounts"
        :key="account.id"
        border
        class="pa-4"
        min-width="260"
        rounded="lg"
      >
        <div class="text-caption text-text-secondary">
          {{ account.accountCode }} · GL {{ account.glAccountCode }}
        </div>
        <div class="font-weight-medium">{{ account.accountName }}</div>
        <div class="text-h6 font-weight-bold">{{ money(account.balanceMinor) }}</div>
      </VCard>
    </section>
    <VCard border rounded="lg">
      <VTable>
        <thead>
          <tr>
            <th>Posting date</th>
            <th>Journal</th>
            <th>Source</th>
            <th>Reference</th>
            <th class="text-right">Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in transactions" :key="item.journalLineId">
            <td>{{ item.postingDate }}</td>
            <td>
              <NuxtLink
                :to="`/finance/accounting?tab=general-journal&journal=${item.journalEntryId}`"
              >
                {{ item.journalNumber }}
              </NuxtLink>
            </td>
            <td>{{ item.sourceType }}</td>
            <td>{{ item.sourceReference }}</td>
            <td class="text-right" :class="item.amountMinor < 0 ? 'text-error' : 'text-success'">
              {{ money(item.amountMinor) }}
            </td>
            <td><DsStatusBadge :value="item.reconciled ? 'RECONCILED' : 'UNMATCHED'" /></td>
          </tr>
          <tr v-if="!transactions.length">
            <td class="py-10 text-center text-text-secondary" colspan="6">
              No posted cash/bank transactions for this account.
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </VContainer>
</template>
