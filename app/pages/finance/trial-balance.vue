<script setup lang="ts">
import type {
  FinanceReportingPeriodDto,
  FinanceTrialBalanceDto,
  TrialBalanceAccountDto
} from '#shared/features/finance/reporting';

useHead({ title: 'Trial Balance · PT AMA' });

type Category = TrialBalanceAccountDto['accountType'];

const route = useRoute();
const router = useRouter();
const selectedPeriod = ref(typeof route.query.period === 'string' ? route.query.period : '');
const search = ref('');
const selectedCategory = ref<'ALL' | Category>('ALL');
const collapsedGroups = ref<Set<Category>>(new Set());
const refreshing = ref(false);
const categoryOrder: Category[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const categoryLabels: Record<Category, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expenses'
};

const { data: periods, error: periodsError } = await useAsyncData('finance-reporting-periods', () =>
  fetchApi<FinanceReportingPeriodDto[]>('/api/finance/reporting/periods')
);
if (!selectedPeriod.value) selectedPeriod.value = periods.value?.[0]?.code ?? '';

const {
  data: report,
  pending,
  error,
  refresh
} = await useAsyncData(
  'finance-trial-balance',
  () =>
    fetchApi<FinanceTrialBalanceDto>('/api/finance/reporting/trial-balance', {
      query: selectedPeriod.value ? { period: selectedPeriod.value } : {}
    }),
  { watch: [selectedPeriod] }
);

watch(selectedPeriod, (period) => {
  if (period && route.query.period !== period) {
    void router.replace({ query: { ...route.query, period } });
  }
});

const periodOptions = computed(
  () =>
    periods.value?.map((period) => ({
      title: `${period.name} (${period.status})`,
      value: period.code
    })) ?? []
);
const categoryItems = computed(() => [
  { title: 'All account types', value: 'ALL' as const },
  ...categoryOrder.map((value: Category) => ({ title: categoryLabels[value], value }))
]);
const accounts = computed(() => report.value?.accounts ?? []);
const filteredAccounts = computed(() => {
  const query = search.value.trim().toLowerCase();
  return accounts.value.filter((account) => {
    const matchesCategory =
      selectedCategory.value === 'ALL' || account.accountType === selectedCategory.value;
    const matchesSearch =
      !query ||
      [account.code, account.name, categoryLabels[account.accountType]].some((value) =>
        value.toLowerCase().includes(query)
      );
    return matchesCategory && matchesSearch;
  });
});
const groupedAccounts = computed(() =>
  categoryOrder
    .map((category) => ({
      category,
      rows: filteredAccounts.value.filter((account) => account.accountType === category)
    }))
    .filter((group) => group.rows.length > 0)
);

function groupSubtotal(rows: TrialBalanceAccountDto[]) {
  return rows.reduce(
    (result, account) => {
      result.debit += account.debitMinor;
      result.credit += account.creditMinor;
      result.balance += account.balanceMinor;
      return result;
    },
    { debit: 0, credit: 0, balance: 0 }
  );
}

function toggleGroup(category: Category) {
  const next = new Set(collapsedGroups.value);
  if (next.has(category)) next.delete(category);
  else next.add(category);
  collapsedGroups.value = next;
}

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: report.value?.currencyCode ?? 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

function accountingNumber(value: number) {
  if (value === 0) return '—';
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(
    Math.abs(value)
  );
  return value < 0 ? `(${formatted})` : formatted;
}

async function refreshReport() {
  refreshing.value = true;
  try {
    await refresh();
  } finally {
    refreshing.value = false;
  }
}

function exportCsv() {
  if (!import.meta.client || !report.value) return;
  const header = [
    'Account Code',
    'Account Name',
    'Account Type',
    'Debit',
    'Credit',
    'Normal Balance',
    'Balance'
  ];
  const rows = report.value.accounts.map((account) => [
    account.code,
    account.name,
    account.accountType,
    account.debitMinor,
    account.creditMinor,
    account.normalBalance,
    account.balanceMinor
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `trial-balance-${report.value.period.code}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-4 md:p-6">
    <FinancePageHeader
      v-model:period="selectedPeriod"
      :period-options="periodOptions"
      :refreshing="refreshing"
      subtitle="Posted balances by Chart of Accounts through the selected period end."
      title="Trial Balance"
      @refresh="refreshReport"
    >
      <template #actions>
        <VBtn
          :disabled="!report"
          prepend-icon="mdi-download-outline"
          variant="tonal"
          @click="exportCsv"
        >
          Export CSV
        </VBtn>
      </template>
    </FinancePageHeader>

    <VAlert v-if="periodsError || error" color="error" variant="tonal">
      <div class="font-weight-bold">Unable to load Trial Balance</div>
      <div class="mt-1">Posted ledger balances could not be retrieved.</div>
      <template #append><VBtn variant="text" @click="refreshReport">Retry</VBtn></template>
    </VAlert>

    <template v-else-if="pending || !report">
      <section class="grid gap-3 md:grid-cols-3">
        <VSkeletonLoader v-for="index in 3" :key="index" type="article" />
      </section>
      <VSkeletonLoader type="table-heading, table-row@8" />
    </template>

    <template v-else>
      <section class="grid gap-3 md:grid-cols-3" aria-label="Trial Balance totals">
        <article class="rounded-lg border border-border-default bg-bg-surface p-4">
          <p class="text-xs font-semibold text-text-secondary">Total debit</p>
          <p class="mt-2 font-mono text-xl font-semibold tabular-nums text-text-primary">
            {{ money(report.totals.debitMinor) }}
          </p>
        </article>
        <article class="rounded-lg border border-border-default bg-bg-surface p-4">
          <p class="text-xs font-semibold text-text-secondary">Total credit</p>
          <p class="mt-2 font-mono text-xl font-semibold tabular-nums text-text-primary">
            {{ money(report.totals.creditMinor) }}
          </p>
        </article>
        <article class="rounded-lg border border-border-default bg-bg-surface p-4">
          <p class="text-xs font-semibold text-text-secondary">Control status</p>
          <div class="mt-2 flex items-center gap-2">
            <VIcon
              :color="report.totals.balanced ? 'success' : 'error'"
              :icon="
                report.totals.balanced ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline'
              "
            />
            <span class="text-base font-semibold text-text-primary">
              {{ report.totals.balanced ? 'Debit and credit balanced' : 'Balance mismatch' }}
            </span>
          </div>
          <p v-if="!report.totals.balanced" class="mt-2 text-sm text-danger">
            Difference: {{ money(report.totals.differenceMinor) }}
          </p>
        </article>
      </section>

      <FinancePanel :padded="false">
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <FinanceStatusBadge
              :tone="report.totals.abnormalAccountCount ? 'danger' : 'success'"
              :value="`${report.totals.abnormalAccountCount} abnormal balances`"
            />
            <FinanceStatusBadge
              :tone="report.totals.negativeCashCount ? 'warning' : 'success'"
              :value="`${report.totals.negativeCashCount} negative cash accounts`"
            />
          </div>
        </template>

        <div
          class="grid gap-3 border-b border-border-default p-4 md:grid-cols-[minmax(240px,1fr)_220px]"
        >
          <VTextField
            v-model="search"
            clearable
            density="compact"
            hide-details
            label="Search account"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
          <VSelect
            v-model="selectedCategory"
            density="compact"
            hide-details
            :items="categoryItems"
            label="Account type"
            variant="outlined"
          />
        </div>

        <div v-if="groupedAccounts.length" class="max-h-[68vh] overflow-auto">
          <table class="w-full min-w-[980px] border-collapse text-sm">
            <thead class="sticky top-0 z-[1] bg-bg-canvas text-left text-xs text-text-secondary">
              <tr>
                <th class="w-10 p-3"><span class="sr-only">Validation</span></th>
                <th class="p-3">Account</th>
                <th class="p-3">Type</th>
                <th class="p-3 text-right">Debit</th>
                <th class="p-3 text-right">Credit</th>
                <th class="p-3 text-center">Normal</th>
                <th class="p-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in groupedAccounts" :key="group.category">
                <tr class="border-t border-border-default bg-bg-canvas">
                  <td colspan="3" class="p-3">
                    <button
                      class="flex w-full items-center gap-2 text-left text-xs font-bold text-text-primary"
                      type="button"
                      @click="toggleGroup(group.category)"
                    >
                      <VIcon
                        :icon="
                          collapsedGroups.has(group.category)
                            ? 'mdi-chevron-right'
                            : 'mdi-chevron-down'
                        "
                        size="18"
                      />
                      {{ categoryLabels[group.category] }}
                    </button>
                  </td>
                  <td class="p-3 text-right font-mono font-semibold tabular-nums">
                    {{ accountingNumber(groupSubtotal(group.rows).debit) }}
                  </td>
                  <td class="p-3 text-right font-mono font-semibold tabular-nums">
                    {{ accountingNumber(groupSubtotal(group.rows).credit) }}
                  </td>
                  <td />
                  <td class="p-3 text-right font-mono font-semibold tabular-nums">
                    {{ accountingNumber(groupSubtotal(group.rows).balance) }}
                  </td>
                </tr>
                <tr
                  v-for="account in collapsedGroups.has(group.category) ? [] : group.rows"
                  :key="account.id"
                  class="border-t border-border-default bg-bg-surface text-text-primary hover:bg-bg-canvas"
                >
                  <td class="p-3">
                    <VTooltip
                      v-if="account.abnormal || account.negativeCash"
                      :text="
                        account.negativeCash
                          ? 'Negative cash balance requires review.'
                          : 'Balance is opposite to the account normal balance.'
                      "
                    >
                      <template #activator="{ props: tooltipProps }">
                        <VIcon
                          v-bind="tooltipProps"
                          :color="account.negativeCash ? 'warning' : 'error'"
                          icon="mdi-alert-outline"
                          size="18"
                        />
                      </template>
                    </VTooltip>
                  </td>
                  <td class="p-3">
                    <p class="font-medium">{{ account.name }}</p>
                    <p class="mt-0.5 font-mono text-xs tabular-nums text-text-secondary">
                      {{ account.code }}
                    </p>
                  </td>
                  <td class="p-3 text-text-secondary">
                    {{ categoryLabels[account.accountType] }}
                  </td>
                  <td class="p-3 text-right font-mono tabular-nums">
                    {{ accountingNumber(account.debitMinor) }}
                  </td>
                  <td class="p-3 text-right font-mono tabular-nums">
                    {{ accountingNumber(account.creditMinor) }}
                  </td>
                  <td class="p-3 text-center">
                    <VChip size="x-small" variant="tonal">
                      {{ account.normalBalance === 'DEBIT' ? 'D' : 'C' }}
                    </VChip>
                  </td>
                  <td
                    class="p-3 text-right font-mono font-semibold tabular-nums"
                    :class="account.abnormal ? 'text-danger' : ''"
                  >
                    {{ accountingNumber(account.balanceMinor) }}
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot class="sticky bottom-0 bg-brand-primary text-white">
              <tr>
                <td colspan="3" class="p-4 font-semibold">Total posted ledger</td>
                <td class="p-4 text-right font-mono font-semibold tabular-nums">
                  {{ accountingNumber(report.totals.debitMinor) }}
                </td>
                <td class="p-4 text-right font-mono font-semibold tabular-nums">
                  {{ accountingNumber(report.totals.creditMinor) }}
                </td>
                <td colspan="2" class="p-4 text-right font-semibold">
                  {{ report.totals.balanced ? 'BALANCED' : 'OUT OF BALANCE' }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div v-else class="py-12 text-center text-sm text-text-secondary">
          No accounts match the selected filters.
        </div>

        <footer
          class="flex flex-wrap gap-x-5 gap-y-2 border-t border-border-default bg-bg-canvas px-4 py-3 text-xs text-text-secondary"
        >
          <span>D = normal debit balance</span>
          <span>C = normal credit balance</span>
          <span>Balances include posted journals through {{ report.period.endDate }}</span>
        </footer>
      </FinancePanel>
    </template>
  </div>
</template>
