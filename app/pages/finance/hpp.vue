<script setup lang="ts">
import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import type {
  FinanceProfitabilityDto,
  FinanceReportingPeriodDto
} from '#shared/features/finance/reporting';
import { AMA_THEME_HEX } from '../../constants/themeColors';

useHead({ title: 'Profitability & HPP · PT AMA' });

const route = useRoute();
const router = useRouter();
const selectedPeriod = ref(typeof route.query.period === 'string' ? route.query.period : '');
const refreshing = ref(false);

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
  'finance-profitability',
  () =>
    fetchApi<FinanceProfitabilityDto>('/api/finance/reporting/profitability', {
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
const activeLines = computed(
  () => report.value?.lines.filter((line) => line.revenueMinor || line.costMinor) ?? []
);
const comparisonSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Revenue',
    data: activeLines.value.map((line) => line.revenueMinor)
  },
  {
    name: 'Allocated cost',
    data: activeLines.value.map((line) => line.costMinor)
  }
]);
const comparisonOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false } },
  colors: [AMA_THEME_HEX.secondary, AMA_THEME_HEX.warning],
  dataLabels: { enabled: false },
  grid: { borderColor: AMA_THEME_HEX.borderDefault, strokeDashArray: 3 },
  legend: { position: 'top', horizontalAlign: 'left' },
  noData: { text: 'No profitability data for this period.' },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '46%' } },
  tooltip: { y: { formatter: (value) => money(value) } },
  xaxis: {
    categories: activeLines.value.map((line) => line.label),
    axisBorder: { color: AMA_THEME_HEX.borderDefault },
    axisTicks: { color: AMA_THEME_HEX.borderDefault }
  },
  yaxis: {
    labels: { formatter: (value) => moneyCompact(value) }
  }
}));

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: report.value?.currencyCode ?? 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

function moneyCompact(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: report.value?.currencyCode ?? 'IDR',
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}

function marginTone(value: number | null): 'success' | 'warning' | 'danger' | 'neutral' {
  if (value === null) return 'neutral';
  if (value >= 20) return 'success';
  if (value >= 10) return 'warning';
  return 'danger';
}

async function refreshReport() {
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
      subtitle="Revenue and operational cost allocation from immutable invoice finance snapshots."
      title="Profitability & HPP"
      @refresh="refreshReport"
    />

    <VAlert v-if="periodsError || error" color="error" variant="tonal">
      <div class="font-weight-bold">Unable to load profitability reporting</div>
      <div class="mt-1">Invoice snapshots and operational cost data could not be retrieved.</div>
      <template #append><VBtn variant="text" @click="refreshReport">Retry</VBtn></template>
    </VAlert>

    <template v-else-if="pending || !report">
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <VSkeletonLoader v-for="index in 4" :key="index" type="article" />
      </section>
      <VSkeletonLoader type="image, table-heading, table-row@3" />
    </template>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Profitability totals">
        <article class="rounded-lg border border-border-default bg-bg-surface p-4">
          <p class="text-xs font-medium text-text-secondary">Revenue</p>
          <p class="mt-2 font-mono text-xl font-semibold tabular-nums text-text-primary">
            {{ moneyCompact(report.totals.revenueMinor) }}
          </p>
        </article>
        <article class="rounded-lg border border-border-default bg-bg-surface p-4">
          <p class="text-xs font-medium text-text-secondary">Operational cost</p>
          <p class="mt-2 font-mono text-xl font-semibold tabular-nums text-text-primary">
            {{ moneyCompact(report.totals.costMinor) }}
          </p>
        </article>
        <article class="rounded-lg border border-border-default bg-bg-surface p-4">
          <p class="text-xs font-medium text-text-secondary">Gross profit</p>
          <p
            class="mt-2 font-mono text-xl font-semibold tabular-nums"
            :class="report.totals.grossProfitMinor >= 0 ? 'text-success' : 'text-danger'"
          >
            {{ moneyCompact(report.totals.grossProfitMinor) }}
          </p>
        </article>
        <article class="rounded-lg border border-border-default bg-bg-surface p-4">
          <p class="text-xs font-medium text-text-secondary">Gross margin</p>
          <div class="mt-2 flex items-center gap-2">
            <p class="font-mono text-xl font-semibold tabular-nums text-text-primary">
              {{
                report.totals.grossMarginPercent === null
                  ? '—'
                  : `${report.totals.grossMarginPercent.toFixed(1)}%`
              }}
            </p>
            <FinanceStatusBadge
              :tone="marginTone(report.totals.grossMarginPercent)"
              :value="
                report.totals.grossMarginPercent === null
                  ? 'No revenue'
                  : report.totals.grossMarginPercent >= 20
                    ? 'Healthy'
                    : 'Review'
              "
            />
          </div>
        </article>
      </section>

      <div class="grid min-w-0 items-start gap-5">
        <FinancePanel
          class="min-w-0"
          subtitle="Revenue compared with allocated fuel, station, and maintenance cost."
          title="Revenue vs HPP"
        >
          <ChartsFeatureApexChart
            :height="330"
            :options="comparisonOptions"
            :series="comparisonSeries"
            type="bar"
          />
        </FinancePanel>

        <FinancePanel
          :padded="false"
          class="min-w-0"
          subtitle="Costs are allocated to business lines within each flight snapshot."
          title="Business Line Breakdown"
        >
          <div v-if="activeLines.length" class="min-w-0 overflow-x-auto">
            <table class="w-full min-w-[760px] border-collapse text-sm">
              <thead class="bg-bg-canvas text-left text-xs text-text-secondary">
                <tr>
                  <th class="p-3">Business line</th>
                  <th class="p-3 text-right">Revenue</th>
                  <th class="p-3 text-right">HPP</th>
                  <th class="p-3 text-right">Gross profit</th>
                  <th class="p-3 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="line in activeLines"
                  :key="line.id"
                  class="border-t border-border-default text-text-primary"
                >
                  <td class="p-3 font-semibold">{{ line.label }}</td>
                  <td class="p-3 text-right font-mono tabular-nums">
                    {{ money(line.revenueMinor) }}
                  </td>
                  <td class="p-3 text-right font-mono tabular-nums">
                    {{ money(line.costMinor) }}
                  </td>
                  <td
                    class="p-3 text-right font-mono font-semibold tabular-nums"
                    :class="line.grossProfitMinor >= 0 ? 'text-success' : 'text-danger'"
                  >
                    {{ money(line.grossProfitMinor) }}
                  </td>
                  <td class="p-3 text-right">
                    <FinanceStatusBadge
                      :tone="marginTone(line.grossMarginPercent)"
                      :value="
                        line.grossMarginPercent === null
                          ? '—'
                          : `${line.grossMarginPercent.toFixed(1)}%`
                      "
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="py-12 text-center text-sm text-text-secondary">
            No invoiced revenue or operational cost is available for this period.
          </div>
        </FinancePanel>
      </div>

      <FinancePanel
        subtitle="Canonical cost components retained in each invoice finance snapshot."
        title="Cost Composition"
      >
        <div v-if="activeLines.length" class="grid gap-4 lg:grid-cols-3">
          <section
            v-for="line in activeLines"
            :key="line.id"
            class="rounded-lg border border-border-default bg-bg-canvas p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-sm font-semibold text-text-primary">{{ line.label }}</h3>
              <span class="font-mono text-xs font-semibold tabular-nums text-text-secondary">
                {{ moneyCompact(line.costMinor) }}
              </span>
            </div>
            <dl class="mt-4 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-4">
                <dt class="text-text-secondary">Fuel</dt>
                <dd class="font-mono font-medium tabular-nums text-text-primary">
                  {{ money(line.costs.fuelMinor) }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-text-secondary">Station services</dt>
                <dd class="font-mono font-medium tabular-nums text-text-primary">
                  {{ money(line.costs.stationMinor) }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-text-secondary">Maintenance</dt>
                <dd class="font-mono font-medium tabular-nums text-text-primary">
                  {{ money(line.costs.maintenanceMinor) }}
                </dd>
              </div>
            </dl>
          </section>
        </div>
        <div v-else class="py-8 text-center text-sm text-text-secondary">
          No cost composition is available.
        </div>
      </FinancePanel>

      <VAlert color="info" icon="mdi-information-outline" variant="tonal">
        HPP uses the immutable Finance snapshot captured at invoice finalization. Shared flight
        costs are allocated to Charter, Passenger, and Cargo by each line's revenue share within
        that flight. This report does not rewrite invoices or posted journals.
      </VAlert>

      <p class="text-right text-xs text-text-secondary">
        As of
        {{
          new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short'
          }).format(new Date(report.asOf))
        }}
      </p>
    </template>
  </div>
</template>
