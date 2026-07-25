<script setup lang="ts">
import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import { financeDashboardDemo } from '../../composables/useFinanceDemoData';

useHead({ title: 'Finance Dashboard · PT AMA' });

const selectedPeriod = ref('2026-07');
const refreshing = ref(false);

const { data: source, refresh } = await useAsyncData('finance-dashboard-demo', async () => {
  return financeDashboardDemo;
});

const dashboard = computed(() => source.value ?? financeDashboardDemo);

const chartPalette = {
  green: '#27805B',
  greenSoft: '#73A98C',
  amber: '#D9951A',
  red: '#B9473B',
  slate: '#64748B',
  grid: '#E2E8F0'
};

const marginSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Gross Margin',
    data: dashboard.value.margins.map((item) => item.value)
  }
]);

const marginOptions = computed<ApexOptions>(() => ({
  chart: {
    toolbar: { show: false },
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
  },
  colors: dashboard.value.margins.map((item) =>
    item.value >= 20 ? chartPalette.green : item.value >= 12 ? chartPalette.amber : chartPalette.red
  ),
  dataLabels: {
    enabled: true,
    formatter: (value) => `${Number(value).toFixed(1)}%`,
    offsetX: 8,
    style: { colors: ['#334155'], fontSize: '12px', fontWeight: 600 }
  },
  grid: {
    borderColor: chartPalette.grid,
    strokeDashArray: 3,
    padding: { left: 4, right: 30 }
  },
  legend: { show: false },
  plotOptions: {
    bar: {
      borderRadius: 4,
      distributed: true,
      horizontal: true,
      barHeight: '54%'
    }
  },
  tooltip: {
    y: { formatter: (value) => `${value.toFixed(1)}%` }
  },
  xaxis: {
    categories: dashboard.value.margins.map((item) => item.label),
    labels: { formatter: (value) => `${value}%` },
    max: 35
  },
  yaxis: {
    labels: { style: { colors: chartPalette.slate, fontWeight: 600 } }
  }
}));

function sparklineOptions(tone: 'green' | 'amber' | 'red' = 'green'): ApexOptions {
  const color =
    tone === 'amber' ? chartPalette.amber : tone === 'red' ? chartPalette.red : chartPalette.green;
  return {
    chart: {
      animations: { enabled: false },
      sparkline: { enabled: true },
      toolbar: { show: false }
    },
    colors: [color],
    fill: {
      opacity: 0.12,
      type: 'solid'
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    tooltip: { enabled: false }
  };
}

function sparklineSeries(label: string, trend: number[]): ApexAxisChartSeries {
  return [{ name: label, data: trend }];
}

function rupiahCompact(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}

async function refreshDashboard() {
  refreshing.value = true;
  try {
    await refresh();
  } finally {
    window.setTimeout(() => {
      refreshing.value = false;
    }, 300);
  }
}
</script>

<template>
  <div class="finance-page">
    <div class="finance-page-shell">
      <FinanceFinancePageHeader
        v-model:period="selectedPeriod"
        subtitle="Ringkasan kinerja keuangan, risiko, dan profitabilitas PT AMA."
        title="Dashboard Finance"
        @refresh="refreshDashboard"
      >
        <template #actions>
          <span
            v-if="refreshing"
            class="inline-flex h-10 items-center rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-600"
          >
            Memperbarui…
          </span>
        </template>
      </FinanceFinancePageHeader>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <FinanceFinanceKpiCard
          v-for="metric in dashboard.kpis"
          :key="metric.label"
          :metric="metric"
        />
      </section>

      <FinanceFinancePanel
        subtitle="Indikator dihitung dari data ledger dan sub-ledger pada periode terpilih."
        title="Rasio Keuangan"
      >
        <div class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          <article
            v-for="group in dashboard.ratioGroups"
            :key="group.label"
            class="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
          >
            <h3 class="text-sm font-semibold text-slate-900">{{ group.label }}</h3>
            <div class="mt-4 space-y-3">
              <div
                v-for="ratio in group.ratios"
                :key="ratio.label"
                class="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 rounded-lg bg-white px-3 py-3 ring-1 ring-slate-200"
              >
                <div class="min-w-0">
                  <p class="truncate text-xs font-medium text-slate-500">{{ ratio.label }}</p>
                  <p class="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-950">
                    {{ ratio.value }}
                  </p>
                </div>
                <ChartsFeatureApexChart
                  :height="42"
                  :options="sparklineOptions()"
                  :series="sparklineSeries(ratio.label, ratio.trend)"
                  type="area"
                />
              </div>
            </div>
          </article>
        </div>
      </FinanceFinancePanel>

      <div class="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <FinanceFinancePanel
          subtitle="Gross margin setelah HPP per kategori layanan."
          title="Margin per Lini Bisnis"
        >
          <ChartsFeatureApexChart
            :height="310"
            :options="marginOptions"
            :series="marginSeries"
            type="bar"
          />
        </FinanceFinancePanel>

        <FinanceFinancePanel
          subtitle="Revenue rute untuk memindai konsentrasi dan underperformance."
          title="Rute Tersibuk vs Tersepi"
        >
          <div class="grid gap-5 md:grid-cols-2">
            <section>
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-semibold text-slate-900">Top 5 by revenue</h3>
                <span class="text-xs text-slate-500">Tertinggi</span>
              </div>
              <ol class="mt-3 divide-y divide-slate-100">
                <li
                  v-for="route in dashboard.busiestRoutes"
                  :key="route.route"
                  class="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 py-3"
                >
                  <span class="font-mono text-xs text-slate-400">{{ route.rank }}</span>
                  <span class="truncate text-sm font-medium text-slate-700">{{ route.route }}</span>
                  <span class="font-mono text-xs font-semibold tabular-nums text-slate-900">
                    {{ rupiahCompact(route.revenue) }}
                  </span>
                </li>
              </ol>
            </section>

            <section>
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-semibold text-slate-900">Bottom 5 by revenue</h3>
                <span class="text-xs text-slate-500">Terendah</span>
              </div>
              <ol class="mt-3 divide-y divide-slate-100">
                <li
                  v-for="route in dashboard.quietestRoutes"
                  :key="route.route"
                  class="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 py-3"
                >
                  <span class="font-mono text-xs text-slate-400">{{ route.rank }}</span>
                  <span class="truncate text-sm font-medium text-slate-700">{{ route.route }}</span>
                  <span class="font-mono text-xs font-semibold tabular-nums text-rose-700">
                    {{ rupiahCompact(route.revenue) }}
                  </span>
                </li>
              </ol>
            </section>
          </div>
        </FinanceFinancePanel>
      </div>

      <FinanceFinancePanel
        subtitle="Item yang memerlukan tindakan dari Finance, Accounting, atau Marketing."
        title="Perlu Perhatian"
      >
        <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          <NuxtLink
            v-for="item in dashboard.actions"
            :key="item.id"
            class="group rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
            :class="
              item.tone === 'danger'
                ? 'border-rose-200 bg-rose-50/60'
                : 'border-amber-200 bg-amber-50/60'
            "
            :to="item.to"
          >
            <div class="flex items-start gap-3">
              <span
                class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold"
                :class="
                  item.tone === 'danger'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-800'
                "
              >
                !
              </span>
              <div class="min-w-0">
                <h3 class="text-sm font-semibold text-slate-900">{{ item.title }}</h3>
                <p class="mt-1 text-sm leading-5 text-slate-600">{{ item.detail }}</p>
                <p class="mt-3 font-mono text-sm font-semibold tabular-nums text-slate-950">
                  {{ item.value }}
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>
      </FinanceFinancePanel>

      <p class="text-right text-xs text-slate-400">
        Nilai demo · sumber data akhir diarahkan ke Accounting Events, Journal, AR/AP, dan kontrak
        Marketing.
      </p>
    </div>
  </div>
</template>
