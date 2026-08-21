<script setup lang="ts">
import type {
  BalanceSheetDto,
  FinanceReportingPeriodDto,
  ProfitAndLossDto
} from '#shared/features/finance/reporting';

useHead({ title: 'Financial Statements - PT AMA' });
const selectedPeriod = ref('');
const tab = ref<'pnl' | 'balance-sheet'>('pnl');
const { data: periods } = await useAsyncData(
  'statement-periods',
  () => fetchApi<FinanceReportingPeriodDto[]>('/api/finance/reporting/periods'),
  { default: () => [] }
);
if (!selectedPeriod.value) selectedPeriod.value = periods.value[0]?.code ?? '';
const query = computed(() => ({ period: selectedPeriod.value }));
const {
  data: pnl,
  pending: pnlPending,
  error: pnlError,
  refresh: refreshPnl
} = await useAsyncData(
  'finance-pnl',
  () => fetchApi<ProfitAndLossDto>('/api/finance/reporting/profit-loss', { query: query.value }),
  { watch: [query] }
);
const {
  data: balanceSheet,
  pending: bsPending,
  error: bsError,
  refresh: refreshBs
} = await useAsyncData(
  'finance-balance-sheet',
  () => fetchApi<BalanceSheetDto>('/api/finance/reporting/balance-sheet', { query: query.value }),
  { watch: [query] }
);
const periodOptions = computed(() =>
  periods.value.map((period) => ({
    title: `${period.name} (${period.status})`,
    value: period.code
  }))
);
function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}
async function refresh() {
  await Promise.all([refreshPnl(), refreshBs()]);
}
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <header class="mb-5 d-flex flex-wrap align-end ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold">Financial Statements</h1>
        <p class="text-body-2 text-text-secondary">
          Period statements calculated from posted general-ledger lines.
        </p>
      </div>
      <VSpacer /><VSelect
        v-model="selectedPeriod"
        hide-details
        :items="periodOptions"
        label="Accounting period"
        style="max-width: 260px"
        variant="outlined"
      /><VBtn
        aria-label="Refresh statements"
        icon="mdi-refresh"
        :loading="pnlPending || bsPending"
        variant="tonal"
        @click="refresh"
      />
    </header>
    <VAlert
      v-if="pnlError || bsError"
      class="mb-4"
      color="error"
      title="Financial statements unavailable"
      variant="tonal"
    >
      {{ pnlError?.message || bsError?.message }}
    </VAlert>
    <VTabs v-model="tab" class="mb-4">
      <VTab value="pnl">Profit & Loss</VTab><VTab value="balance-sheet">Balance Sheet</VTab>
    </VTabs>
    <VSkeletonLoader v-if="(pnlPending || bsPending) && !pnl" type="table" />
    <VWindow v-else v-model="tab">
      <VWindowItem value="pnl">
        <VCard v-if="pnl" border rounded="lg">
          <VTable>
            <thead>
              <tr>
                <th>Account</th>
                <th>Classification</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in pnl.lines" :key="line.accountCode">
                <td>{{ line.accountCode }} · {{ line.accountName }}</td>
                <td>{{ line.accountType }}</td>
                <td class="text-right">{{ money(line.amountMinor) }}</td>
              </tr>
              <tr class="font-weight-bold">
                <td colspan="2">Profit / Loss</td>
                <td class="text-right">{{ money(pnl.totals.profitLossMinor) }}</td>
              </tr>
            </tbody>
          </VTable>
        </VCard>
      </VWindowItem>
      <VWindowItem value="balance-sheet">
        <template v-if="balanceSheet">
          <VAlert
            class="mb-3"
            :color="balanceSheet.totals.balanced ? 'success' : 'error'"
            variant="tonal"
          >
            Assets {{ money(balanceSheet.totals.assetsMinor) }} · Liabilities + Equity
            {{ money(balanceSheet.totals.liabilitiesMinor + balanceSheet.totals.equityMinor) }} ·
            Difference {{ money(balanceSheet.totals.differenceMinor) }}
          </VAlert><VCard
            v-for="section in balanceSheet.sections"
            :key="section.code"
            border
            class="mb-3"
            rounded="lg"
          >
            <VCardTitle>
              {{ section.label
              }}<span class="float-right">{{ money(section.amountMinor) }}</span>
            </VCardTitle><VTable>
              <tbody>
                <tr v-for="line in section.accounts" :key="line.accountCode">
                  <td>{{ line.accountCode }} · {{ line.accountName }}</td>
                  <td class="text-right">{{ money(line.amountMinor) }}</td>
                </tr>
                <tr v-if="section.code === 'EQUITY'">
                  <td>Current earnings</td>
                  <td class="text-right">{{ money(balanceSheet.currentEarningsMinor) }}</td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </template>
      </VWindowItem>
    </VWindow>
  </VContainer>
</template>
