<script setup lang="ts">
import type { ApexAxisChartSeries, ApexNonAxisChartSeries, ApexOptions } from 'apexcharts';
import { hppBusinessLinesDemo, type HppBusinessLine } from '../../composables/useFinanceDemoData';

useHead({ title: 'Breakdown HPP · PT AMA' });

const selectedPeriod = ref('2026-07');
const expanded = ref<Set<string>>(new Set(['charter']));
const { data: source, refresh } = await useAsyncData(
  'hpp-business-lines-demo',
  async () => hppBusinessLinesDemo
);
const businessLines = computed(() => source.value ?? hppBusinessLinesDemo);

const palette = {
  green: '#27805B',
  amber: '#D9951A',
  red: '#B9473B',
  slate: '#94A3B8',
  grid: '#E2E8F0'
};

const comparisonSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Gross Margin',
    data: businessLines.value.map((line) => line.grossMargin)
  }
]);

const comparisonOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  colors: businessLines.value.map((line) => marginColor(line.grossMargin)),
  dataLabels: {
    enabled: true,
    formatter: (value) => `${Number(value).toFixed(1)}%`,
    offsetY: -18,
    style: { colors: ['#334155'], fontSize: '12px', fontWeight: 700 }
  },
  grid: { borderColor: palette.grid, strokeDashArray: 3 },
  legend: { show: false },
  plotOptions: {
    bar: {
      borderRadius: 5,
      columnWidth: '48%',
      distributed: true,
      dataLabels: { position: 'top' }
    }
  },
  tooltip: { y: { formatter: (value) => `${value.toFixed(1)}%` } },
  xaxis: {
    categories: businessLines.value.map((line) => line.label),
    axisBorder: { color: palette.grid },
    axisTicks: { color: palette.grid },
    labels: { style: { colors: '#64748B', fontWeight: 600 } }
  },
  yaxis: {
    min: 0,
    max: 35,
    tickAmount: 7,
    labels: { formatter: (value) => `${value.toFixed(0)}%` }
  }
}));

function marginColor(margin: number) {
  if (margin >= 20) return palette.green;
  if (margin >= 12) return palette.amber;
  return palette.red;
}

function marginTone(margin: number): 'success' | 'warning' | 'danger' {
  if (margin >= 20) return 'success';
  if (margin >= 12) return 'warning';
  return 'danger';
}

function donutSeries(line: HppBusinessLine): ApexNonAxisChartSeries {
  return [line.breakdown.direct, line.breakdown.indirect, line.breakdown.nonOperating];
}

function donutOptions(line: HppBusinessLine): ApexOptions {
  return {
    chart: { toolbar: { show: false }, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    colors: [palette.green, palette.amber, palette.red],
    dataLabels: { enabled: false },
    labels: ['Direct Cost', 'Indirect Cost', 'Non-Operating Cost'],
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            name: { show: true, fontSize: '11px', color: '#64748B' },
            value: {
              show: true,
              fontSize: '17px',
              fontWeight: 700,
              color: '#0F172A',
              formatter: (value) => `${value}%`
            },
            total: {
              show: true,
              label: 'HPP',
              formatter: () => rupiahCompact(line.hpp)
            }
          }
        }
      }
    },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (value) => `${value}% dari HPP` } }
  };
}

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

function rupiahCompact(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}

function costValue(line: HppBusinessLine, percentage: number) {
  return line.hpp * (percentage / 100);
}

function toggleExpanded(id: string) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}
</script>

<template>
  <div class="finance-page">
    <div class="finance-page-shell">
      <FinanceFinancePageHeader
        v-model:period="selectedPeriod"
        subtitle="Analisis Harga Pokok Penjualan dan gross margin untuk setiap lini bisnis."
        title="Breakdown HPP per Lini Bisnis"
        @refresh="refresh"
      />

      <FinanceFinancePanel
        subtitle="Perbandingan langsung untuk mengidentifikasi kategori yang paling dan paling tidak menguntungkan."
        title="Perbandingan Gross Margin"
      >
        <ChartsFeatureApexChart
          :height="330"
          :options="comparisonOptions"
          :series="comparisonSeries"
          type="bar"
        />
      </FinanceFinancePanel>

      <section class="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <article
          v-for="line in businessLines"
          :key="line.id"
          class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <header class="border-b border-slate-100 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  HPP {{ line.label }}
                </p>
                <p class="mt-2 font-mono text-xl font-semibold tabular-nums text-slate-950">
                  {{ rupiahCompact(line.hpp) }}
                </p>
              </div>
              <FinanceFinanceStatusBadge
                :tone="marginTone(line.grossMargin)"
                :value="`${line.grossMargin.toFixed(1)}% margin`"
              />
            </div>
            <dl class="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
              <div>
                <dt class="text-xs text-slate-500">Pendapatan</dt>
                <dd class="mt-1 font-mono text-sm font-semibold tabular-nums text-slate-900">
                  {{ rupiahCompact(line.revenue) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">Gross Profit</dt>
                <dd class="mt-1 font-mono text-sm font-semibold tabular-nums text-emerald-700">
                  {{ rupiahCompact(line.revenue - line.hpp) }}
                </dd>
              </div>
            </dl>
          </header>

          <div class="p-4">
            <FeatureApexChart
              :height="220"
              :options="donutOptions(line)"
              :series="donutSeries(line)"
              type="donut"
            />

            <div class="mt-2 space-y-3">
              <div class="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
                <div>
                  <p class="text-xs font-medium text-slate-700">Direct Cost</p>
                  <p class="text-[11px] text-slate-500">Fuel, crew, handling, aircraft operation</p>
                </div>
                <div class="text-right">
                  <p class="font-mono text-xs font-semibold tabular-nums text-slate-900">
                    {{ line.breakdown.direct }}%
                  </p>
                  <p class="font-mono text-[11px] tabular-nums text-slate-500">
                    {{ rupiahCompact(costValue(line, line.breakdown.direct)) }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                <div>
                  <p class="text-xs font-medium text-slate-700">Indirect Cost</p>
                  <p class="text-[11px] text-slate-500">Alokasi station, overhead, dan support</p>
                </div>
                <div class="text-right">
                  <p class="font-mono text-xs font-semibold tabular-nums text-slate-900">
                    {{ line.breakdown.indirect }}%
                  </p>
                  <p class="font-mono text-[11px] tabular-nums text-slate-500">
                    {{ rupiahCompact(costValue(line, line.breakdown.indirect)) }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-sm bg-rose-600" />
                <div>
                  <p class="text-xs font-medium text-slate-700">Non-Operating Cost</p>
                  <p class="text-[11px] text-slate-500">Penyesuaian di luar operasi utama</p>
                </div>
                <div class="text-right">
                  <p class="font-mono text-xs font-semibold tabular-nums text-slate-900">
                    {{ line.breakdown.nonOperating }}%
                  </p>
                  <p class="font-mono text-[11px] tabular-nums text-slate-500">
                    {{ rupiahCompact(costValue(line, line.breakdown.nonOperating)) }}
                  </p>
                </div>
              </div>
            </div>

            <button
              class="mt-4 flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              type="button"
              @click="toggleExpanded(line.id)"
            >
              <span>{{ expanded.has(line.id) ? 'Sembunyikan detail' : 'Lihat detail' }}</span>
              <span>{{ expanded.has(line.id) ? '↑' : '↓' }}</span>
            </button>

            <div
              v-if="expanded.has(line.id)"
              class="mt-3 rounded-lg bg-slate-950 p-3 text-sm text-slate-200"
            >
              <dl class="space-y-2">
                <div class="flex justify-between gap-4">
                  <dt class="text-slate-400">Revenue</dt>
                  <dd class="font-mono tabular-nums">{{ rupiah(line.revenue) }}</dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-slate-400">Total HPP</dt>
                  <dd class="font-mono tabular-nums">{{ rupiah(line.hpp) }}</dd>
                </div>
                <div class="flex justify-between gap-4 border-t border-slate-700 pt-2">
                  <dt class="font-semibold text-white">Gross Profit</dt>
                  <dd class="font-mono font-semibold tabular-nums text-emerald-300">
                    {{ rupiah(line.revenue - line.hpp) }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </article>
      </section>

      <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        HPP demo menggunakan tiga kelompok biaya. Pada implementasi produksi, indirect cost
        sebaiknya ditarik dari allocation run yang memiliki policy snapshot dan audit trail.
      </div>
    </div>
  </div>
</template>
