<script setup lang="ts">
import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import type {
  FinanceDashboardDto,
  FinanceReportingPeriodDto
} from '#shared/features/finance/reporting';
import { AMA_THEME_HEX } from '../../constants/themeColors';

useHead({ title: 'Finance Dashboard · PT AMA' });

const route = useRoute();
const router = useRouter();
const selectedPeriod = ref(typeof route.query.period === 'string' ? route.query.period : '');
const refreshing = ref(false);

const { data: periods, error: periodsError } = await useAsyncData('finance-reporting-periods', () =>
  fetchApi<FinanceReportingPeriodDto[]>('/api/finance/reporting/periods')
);

if (!selectedPeriod.value) selectedPeriod.value = periods.value?.[0]?.code ?? '';

const {
  data: dashboard,
  pending,
  error,
  refresh
} = await useAsyncData(
  'finance-reporting-dashboard',
  () =>
    fetchApi<FinanceDashboardDto>('/api/finance/reporting/dashboard', {
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

const marginSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Gross margin',
    data: (dashboard.value?.profitability ?? []).map((line) => line.grossMarginPercent ?? 0)
  }
]);

const marginOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false } },
  colors: (dashboard.value?.profitability ?? []).map((line) => {
    const margin = line.grossMarginPercent ?? 0;
    return margin >= 20
      ? AMA_THEME_HEX.success
      : margin >= 10
        ? AMA_THEME_HEX.warning
        : AMA_THEME_HEX.danger;
  }),
  dataLabels: {
    enabled: true,
    formatter: (value) => `${Number(value).toFixed(1)}%`,
    offsetX: 8,
    style: { colors: [AMA_THEME_HEX.textPrimary], fontSize: '12px', fontWeight: 600 }
  },
  grid: { borderColor: AMA_THEME_HEX.borderDefault, strokeDashArray: 3 },
  legend: { show: false },
  noData: { text: 'No profitability data for this period.' },
  plotOptions: {
    bar: { borderRadius: 4, distributed: true, horizontal: true, barHeight: '52%' }
  },
  tooltip: { y: { formatter: (value) => `${value.toFixed(1)}%` } },
  xaxis: {
    categories: (dashboard.value?.profitability ?? []).map((line) => line.label),
    labels: { formatter: (value) => `${value}%` }
  }
}));

function moneyCompact(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: dashboard.value?.currencyCode ?? 'IDR',
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}

function actionValue(item: FinanceDashboardDto['actions'][number]) {
  if (item.id === 'overdue-ar') return moneyCompact(Number(item.value));
  return item.value;
}

async function refreshDashboard() {
  refreshing.value = true;
  try {
    await refresh();
  } finally {
    refreshing.value = false;
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-4 md:p-6">
    <FinancePageHeader
      v-model:period="selectedPeriod"
      :period-options="periodOptions"
      :refreshing="refreshing"
      subtitle="Posted ledger performance, receivable risk, and operational profitability."
      title="Finance Dashboard"
      @refresh="refreshDashboard"
    />

    <VAlert v-if="periodsError || error" color="error" variant="tonal">
      <div class="font-weight-bold">Unable to load Finance reporting</div>
      <div class="mt-1">Posted ledger and reporting data could not be retrieved.</div>
      <template #append>
        <VBtn variant="text" @click="refreshDashboard">Retry</VBtn>
      </template>
    </VAlert>

    <template v-else-if="pending || !dashboard">
      <VSkeletonLoader type="heading, paragraph" />
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <VSkeletonLoader v-for="index in 5" :key="index" type="article" />
      </section>
      <div class="grid gap-5 xl:grid-cols-2">
        <VSkeletonLoader type="image, paragraph" />
        <VSkeletonLoader type="table-heading, table-row@4" />
      </div>
    </template>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Finance metrics">
        <FinanceKpiCard v-for="metric in dashboard.metrics" :key="metric.key" :metric="metric" />
      </section>

      <FinancePanel
        subtitle="Control signals are derived from posted journals and accounting workflow state."
        title="Ledger Control"
      >
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <template v-for="control in dashboard.controls" :key="control.label">
            <NuxtLink
              v-if="control.route"
              class="rounded-lg border border-border-default bg-bg-canvas p-4 text-text-primary transition hover:border-brand-secondary"
              :to="control.route"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-medium text-text-secondary">{{ control.label }}</p>
                  <p class="mt-1 text-base font-semibold">{{ control.value }}</p>
                </div>
                <VIcon
                  :color="
                    control.status === 'SUCCESS'
                      ? 'success'
                      : control.status === 'DANGER'
                        ? 'error'
                        : control.status === 'WARNING'
                          ? 'warning'
                          : 'primary'
                  "
                  :icon="
                    control.status === 'SUCCESS'
                      ? 'mdi-check-circle-outline'
                      : control.status === 'DANGER'
                        ? 'mdi-alert-circle-outline'
                        : 'mdi-information-outline'
                  "
                />
              </div>
            </NuxtLink>
            <div
              v-else
              class="rounded-lg border border-border-default bg-bg-canvas p-4 text-text-primary"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-medium text-text-secondary">{{ control.label }}</p>
                  <p class="mt-1 text-base font-semibold">{{ control.value }}</p>
                </div>
                <VIcon
                  :color="
                    control.status === 'SUCCESS'
                      ? 'success'
                      : control.status === 'DANGER'
                        ? 'error'
                        : control.status === 'WARNING'
                          ? 'warning'
                          : 'primary'
                  "
                  :icon="
                    control.status === 'SUCCESS'
                      ? 'mdi-check-circle-outline'
                      : control.status === 'DANGER'
                        ? 'mdi-alert-circle-outline'
                        : 'mdi-information-outline'
                  "
                />
              </div>
            </div>
          </template>
        </div>
      </FinancePanel>

      <div class="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <FinancePanel
          subtitle="Revenue and allocated operational cost from immutable invoice snapshots."
          title="Gross Margin by Business Line"
        >
          <ChartsFeatureApexChart
            :height="300"
            :options="marginOptions"
            :series="marginSeries"
            type="bar"
          />
          <VBtn class="mt-2" prepend-icon="mdi-chart-box-outline" to="/finance/hpp" variant="text">
            Open profitability breakdown
          </VBtn>
        </FinancePanel>

        <FinancePanel
          subtitle="IDR revenue from flight invoice snapshots in the selected period."
          title="Route Revenue"
        >
          <div
            v-if="dashboard.busiestRoutes.length || dashboard.quietestRoutes.length"
            class="grid gap-5 md:grid-cols-2"
          >
            <section>
              <h3 class="text-sm font-semibold text-text-primary">Highest revenue</h3>
              <ol class="mt-3 divide-y divide-border-default">
                <li
                  v-for="item in dashboard.busiestRoutes"
                  :key="item.route"
                  class="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 py-3"
                >
                  <span class="font-mono text-xs text-text-secondary">{{ item.rank }}</span>
                  <span class="truncate text-sm font-medium text-text-primary">{{
                    item.route
                  }}</span>
                  <span class="font-mono text-xs font-semibold tabular-nums text-text-primary">
                    {{ moneyCompact(item.revenueMinor) }}
                  </span>
                </li>
              </ol>
            </section>
            <section>
              <h3 class="text-sm font-semibold text-text-primary">Lowest revenue</h3>
              <ol class="mt-3 divide-y divide-border-default">
                <li
                  v-for="item in dashboard.quietestRoutes"
                  :key="item.route"
                  class="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 py-3"
                >
                  <span class="font-mono text-xs text-text-secondary">{{ item.rank }}</span>
                  <span class="truncate text-sm font-medium text-text-primary">{{
                    item.route
                  }}</span>
                  <span class="font-mono text-xs font-semibold tabular-nums text-text-primary">
                    {{ moneyCompact(item.revenueMinor) }}
                  </span>
                </li>
              </ol>
            </section>
          </div>
          <div v-else class="py-10 text-center text-sm text-text-secondary">
            No invoiced route revenue is available for this period.
          </div>
        </FinancePanel>
      </div>

      <FinancePanel
        subtitle="Items with a valid destination and a current backend condition."
        title="Requires Attention"
      >
        <div v-if="dashboard.actions.length" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <NuxtLink
            v-for="item in dashboard.actions"
            :key="item.id"
            class="rounded-lg border border-border-default bg-bg-canvas p-4 text-text-primary transition hover:border-brand-secondary"
            :to="item.route"
          >
            <div class="flex items-start gap-3">
              <VIcon
                :color="item.tone === 'DANGER' ? 'error' : 'warning'"
                :icon="item.tone === 'DANGER' ? 'mdi-alert-circle-outline' : 'mdi-alert-outline'"
              />
              <div class="min-w-0">
                <h3 class="text-sm font-semibold">{{ item.title }}</h3>
                <p class="mt-1 text-sm leading-5 text-text-secondary">{{ item.detail }}</p>
                <p class="mt-3 font-mono text-sm font-semibold tabular-nums">
                  {{ actionValue(item) }}
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>
        <div v-else class="py-8 text-center text-sm text-text-secondary">
          No Finance items require immediate attention.
        </div>
      </FinancePanel>

      <p class="text-right text-xs text-text-secondary">
        As of
        {{
          new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(dashboard.asOf)
          )
        }}
      </p>
    </template>
  </div>
</template>
