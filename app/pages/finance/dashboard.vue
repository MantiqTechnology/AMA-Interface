<script setup lang="ts">
import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import { AMA_THEME_HEX } from '../../constants/themeColors';

useHead({ title: 'Finance Dashboard · PT AMA' });

/**
 * ------------------------------------------------------------------
 * DEMO MODE — tidak ada pemanggilan backend di sini.
 * Semua data di bawah ini adalah data dummy untuk keperluan demo UI.
 * Struktur data sengaja dibuat menyerupai FinanceDashboardDto supaya
 * mudah disambungkan ke API sungguhan nanti.
 * ------------------------------------------------------------------
 */

type Tone = 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO';

interface FinancePeriod {
  code: string;
  name: string;
  status: string;
}

interface FinanceMetric {
  key: string;
  label: string;
  value: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  trendValue: string;
  trendUp: boolean;
}

interface FinanceControl {
  label: string;
  value: string;
  status: Tone;
  route?: string;
}

interface FinanceProfitabilityLine {
  label: string;
  grossMarginPercent: number;
}

interface FinanceRoute {
  rank: number;
  route: string;
  revenueMinor: number;
}

interface FinanceAction {
  id: string;
  title: string;
  detail: string;
  value: string | number;
  tone: 'DANGER' | 'WARNING';
  route: string;
}

interface FinanceDashboard {
  currencyCode: string;
  asOf: string;
  metrics: FinanceMetric[];
  controls: FinanceControl[];
  profitability: FinanceProfitabilityLine[];
  busiestRoutes: FinanceRoute[];
  quietestRoutes: FinanceRoute[];
  actions: FinanceAction[];
}

const periods = ref<FinancePeriod[]>([
  { code: '2026-07', name: 'July 2026', status: 'OPEN' },
  { code: '2026-06', name: 'June 2026', status: 'CLOSED' },
  { code: '2026-05', name: 'May 2026', status: 'CLOSED' }
]);

const selectedPeriod = ref(periods.value[0]?.code ?? '');

const dashboard = ref<FinanceDashboard>({
  currencyCode: 'IDR',
  asOf: new Date().toISOString(),
  metrics: [
    {
      key: 'revenue',
      label: 'Total Revenue',
      value: 'IDR 82.4 B',
      icon: 'mdi-cash-multiple',
      iconColor: '#3B5BFF',
      iconBg: '#EDF0FF',
      trendValue: '6%',
      trendUp: true
    },
    {
      key: 'expense',
      label: 'Total Expense',
      value: 'IDR 58.1 B',
      icon: 'mdi-receipt-text-outline',
      iconColor: '#E5484D',
      iconBg: '#FDECEC',
      trendValue: '3%',
      trendUp: false
    },
    {
      key: 'net-profit',
      label: 'Net Profit',
      value: 'IDR 24.3 B',
      icon: 'mdi-chart-line',
      iconColor: '#22B07D',
      iconBg: '#E7F8F1',
      trendValue: '9%',
      trendUp: true
    },
    {
      key: 'outstanding-ar',
      label: 'Outstanding AR',
      value: 'IDR 6.8 B',
      icon: 'mdi-file-clock-outline',
      iconColor: '#F5A623',
      iconBg: '#FEF3E2',
      trendValue: '4%',
      trendUp: false
    },
    {
      key: 'cash-balance',
      label: 'Cash Balance',
      value: 'IDR 31.9 B',
      icon: 'mdi-bank-outline',
      iconColor: '#8B5CF6',
      iconBg: '#F2ECFF',
      trendValue: '2%',
      trendUp: true
    }
  ],
  controls: [
    {
      label: 'Unposted Journals',
      value: '3 entries',
      status: 'WARNING',
      route: '/finance/journals'
    },
    {
      label: 'Bank Reconciliation',
      value: 'Matched',
      status: 'SUCCESS',
      route: '/finance/reconciliation'
    },
    { label: 'Tax Filing Status', value: 'Overdue', status: 'DANGER', route: '/finance/tax' },
    { label: 'Period Closing', value: 'On schedule', status: 'INFO' }
  ],
  profitability: [
    { label: 'Cargo', grossMarginPercent: 26.4 },
    { label: 'Charter', grossMarginPercent: 18.9 },
    { label: 'Passenger', grossMarginPercent: 14.2 },
    { label: 'Ground Handling', grossMarginPercent: 9.6 },
    { label: 'MRO', grossMarginPercent: 6.1 }
  ],
  busiestRoutes: [
    { rank: 1, route: 'CGK - DPS', revenueMinor: 4_520_000_000 },
    { rank: 2, route: 'CGK - SUB', revenueMinor: 3_910_000_000 },
    { rank: 3, route: 'CGK - UPG', revenueMinor: 3_240_000_000 },
    { rank: 4, route: 'DPS - BPN', revenueMinor: 2_680_000_000 },
    { rank: 5, route: 'SUB - DPS', revenueMinor: 2_115_000_000 }
  ],
  quietestRoutes: [
    { rank: 1, route: 'PLM - BTH', revenueMinor: 214_000_000 },
    { rank: 2, route: 'SOC - JOG', revenueMinor: 268_000_000 },
    { rank: 3, route: 'PDG - PKU', revenueMinor: 312_000_000 },
    { rank: 4, route: 'MDC - GTO', revenueMinor: 359_000_000 },
    { rank: 5, route: 'BPN - TRK', revenueMinor: 401_000_000 }
  ],
  actions: [
    {
      id: 'overdue-ar',
      title: 'Overdue Receivables',
      detail: '7 invoices past due date across 4 corporate accounts.',
      value: 1_240_000_000,
      tone: 'DANGER',
      route: '/finance/ar'
    },
    {
      id: 'pending-approval',
      title: 'Pending Approval Invoices',
      detail: 'Vendor invoices waiting for finance manager approval.',
      value: '5 invoices',
      tone: 'WARNING',
      route: '/finance/ap'
    },
    {
      id: 'unmatched-bank',
      title: 'Unmatched Bank Transactions',
      detail: 'Bank statement lines with no matching journal entry.',
      value: '3 transactions',
      tone: 'WARNING',
      route: '/finance/reconciliation'
    }
  ]
});

const refreshing = ref(false);

const periodOptions = computed(
  () =>
    periods.value.map((period) => ({
      title: `${period.name} (${period.status})`,
      value: period.code
    })) ?? []
);

const marginSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Gross margin',
    data: dashboard.value.profitability.map((line) => line.grossMarginPercent ?? 0)
  }
]);

const marginOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false } },
  colors: dashboard.value.profitability.map((line) => {
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
    categories: dashboard.value.profitability.map((line) => line.label),
    labels: { formatter: (value) => `${value}%` }
  }
}));

function moneyCompact(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: dashboard.value.currencyCode ?? 'IDR',
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}

function actionValue(item: FinanceAction) {
  if (item.id === 'overdue-ar') return moneyCompact(Number(item.value));
  return item.value;
}

function controlIcon(status: Tone) {
  if (status === 'SUCCESS') return 'mdi-check-circle-outline';
  if (status === 'DANGER') return 'mdi-alert-circle-outline';
  if (status === 'WARNING') return 'mdi-alert-outline';
  return 'mdi-information-outline';
}

function controlColor(status: Tone) {
  if (status === 'SUCCESS') return 'success';
  if (status === 'DANGER') return 'error';
  if (status === 'WARNING') return 'warning';
  return 'primary';
}

// Simulasi refresh — di demo ini hanya menunggu sebentar lalu memperbarui timestamp.
async function refreshDashboard() {
  refreshing.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    dashboard.value.asOf = new Date().toISOString();
  } finally {
    refreshing.value = false;
  }
}
</script>

<template>
  <div class="page-wrap">
    <!-- Header -->
    <div class="d-flex align-start justify-space-between flex-wrap mb-5" style="gap: 12px">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Finance Dashboard</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Posted ledger performance, receivable risk, and operational profitability.
        </p>
      </div>
      <div class="d-flex align-center flex-wrap" style="gap: 10px">
        <VSelect
          v-model="selectedPeriod"
          :items="periodOptions"
          density="compact"
          hide-details
          item-title="title"
          item-value="value"
          label="Period"
          rounded="lg"
          style="min-width: 220px"
          variant="outlined"
        />
        <VBtn
          :loading="refreshing"
          color="primary"
          prepend-icon="mdi-refresh"
          rounded="lg"
          variant="tonal"
          @click="refreshDashboard"
        >
          Refresh
        </VBtn>
      </div>
    </div>

    <!-- KPI Cards -->
    <section class="kpi-grid mb-5" aria-label="Finance metrics">
      <VCard
        v-for="metric in dashboard.metrics"
        :key="metric.key"
        border
        class="pa-4 kpi-card"
        elevation="0"
        rounded="lg"
      >
        <div class="d-flex justify-space-between align-start">
          <div class="min-w-0">
            <div class="text-caption text-medium-emphasis mb-1 text-truncate">
              {{ metric.label }}
            </div>
            <div class="text-h6 font-weight-bold">{{ metric.value }}</div>
          </div>
          <div class="kpi-icon" :style="{ background: metric.iconBg, color: metric.iconColor }">
            <VIcon :icon="metric.icon" size="20" />
          </div>
        </div>

        <div class="text-caption mt-2 d-flex align-center" style="gap: 4px">
          <span class="text-medium-emphasis">vs last month</span>
          <span
            class="d-flex align-center font-weight-medium"
            :class="metric.trendUp ? 'text-success' : 'text-error'"
          >
            <VIcon :icon="metric.trendUp ? 'mdi-arrow-up' : 'mdi-arrow-down'" size="14" />
            {{ metric.trendValue }}
          </span>
        </div>
      </VCard>
    </section>

    <!-- Ledger Control -->
    <VCard border class="pa-4 mt-4 mb-5" elevation="0" rounded="lg">
      <h2 class="text-subtitle-1 font-weight-bold mb-1">Ledger Control</h2>
      <p class="text-caption text-medium-emphasis mb-4">
        Control signals are derived from posted journals and accounting workflow state.
      </p>

      <VRow>
        <VCol v-for="control in dashboard.controls" :key="control.label" cols="12" md="3" sm="6">
          <component
            :is="control.route ? resolveComponent('NuxtLink') : 'div'"
            :to="control.route"
            class="control-tile"
          >
            <div class="d-flex align-start justify-space-between" style="gap: 10px">
              <div>
                <p class="text-caption text-medium-emphasis mb-1">{{ control.label }}</p>
                <p class="text-body-1 font-weight-semibold mb-0">{{ control.value }}</p>
              </div>
              <VIcon
                :color="controlColor(control.status)"
                :icon="controlIcon(control.status)"
                size="20"
              />
            </div>
          </component>
        </VCol>
      </VRow>
    </VCard>

    <!-- Margin chart + Route revenue -->
    <VRow class="mb-1">
      <VCol cols="12" xl="7">
        <VCard border class="pa-4" elevation="0" height="100%" rounded="lg">
          <h2 class="text-subtitle-1 font-weight-bold mb-1">Gross Margin by Business Line</h2>
          <p class="text-caption text-medium-emphasis mb-3">
            Revenue and allocated operational cost from immutable invoice snapshots.
          </p>
          <ChartsFeatureApexChart
            :height="300"
            :options="marginOptions"
            :series="marginSeries"
            type="bar"
          />
          <VBtn class="mt-2" prepend-icon="mdi-chart-box-outline" to="/finance/hpp" variant="text">
            Open profitability breakdown
          </VBtn>
        </VCard>
      </VCol>

      <VCol cols="12" xl="5">
        <VCard border class="pa-4" elevation="0" height="100%" rounded="lg">
          <h2 class="text-subtitle-1 font-weight-bold mb-1">Route Revenue</h2>
          <p class="text-caption text-medium-emphasis mb-3">
            IDR revenue from flight invoice snapshots in the selected period.
          </p>

          <div
            v-if="dashboard.busiestRoutes.length || dashboard.quietestRoutes.length"
            class="grid gap-5 md:grid-cols-2"
          >
            <section>
              <h3 class="text-caption font-weight-bold text-medium-emphasis text-uppercase mb-2">
                Highest revenue
              </h3>
              <ol class="route-list">
                <li v-for="item in dashboard.busiestRoutes" :key="item.route" class="route-row">
                  <span class="route-rank">{{ item.rank }}</span>
                  <span class="route-name text-truncate">{{ item.route }}</span>
                  <span class="route-value">{{ moneyCompact(item.revenueMinor) }}</span>
                </li>
              </ol>
            </section>
            <section>
              <h3 class="text-caption font-weight-bold text-medium-emphasis text-uppercase mb-2">
                Lowest revenue
              </h3>
              <ol class="route-list">
                <li v-for="item in dashboard.quietestRoutes" :key="item.route" class="route-row">
                  <span class="route-rank">{{ item.rank }}</span>
                  <span class="route-name text-truncate">{{ item.route }}</span>
                  <span class="route-value">{{ moneyCompact(item.revenueMinor) }}</span>
                </li>
              </ol>
            </section>
          </div>
          <div v-else class="py-10 text-center text-body-2 text-medium-emphasis">
            No invoiced route revenue is available for this period.
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Requires Attention -->
    <VCard border class="pa-4 mt-4 mb-4" elevation="0" rounded="lg">
      <h2 class="text-subtitle-1 font-weight-bold mb-1">Requires Attention</h2>
      <p class="text-caption text-medium-emphasis mb-4">
        Items with a valid destination and a current backend condition.
      </p>

      <VRow v-if="dashboard.actions.length">
        <VCol v-for="item in dashboard.actions" :key="item.id" cols="12" md="4">
          <NuxtLink :to="item.route" class="action-tile">
            <div class="d-flex align-start" style="gap: 12px">
              <div
                class="kpi-icon"
                :style="
                  item.tone === 'DANGER'
                    ? { background: '#FDECEC', color: '#E5484D' }
                    : { background: '#FEF3E2', color: '#F5A623' }
                "
              >
                <VIcon
                  :icon="item.tone === 'DANGER' ? 'mdi-alert-circle-outline' : 'mdi-alert-outline'"
                  size="20"
                />
              </div>
              <div class="min-w-0">
                <h3 class="text-body-1 font-weight-semibold mb-1">{{ item.title }}</h3>
                <p class="text-body-2 text-medium-emphasis mb-2">{{ item.detail }}</p>
                <p class="text-body-1 font-weight-bold mb-0">{{ actionValue(item) }}</p>
              </div>
            </div>
          </NuxtLink>
        </VCol>
      </VRow>
      <div v-else class="py-8 text-center text-body-2 text-medium-emphasis">
        No Finance items require immediate attention.
      </div>
    </VCard>

    <p class="text-right text-caption text-medium-emphasis">
      As of
      {{
        new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(dashboard.asOf)
        )
      }}
    </p>
  </div>
</template>

<style scoped>
.page-wrap {
  padding: 20px 16px;
}

.kpi-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 960px) {
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .kpi-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

.min-w-0 {
  min-width: 0;
}

.kpi-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-tile {
  display: block;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  padding: 14px 16px;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

a.control-tile:hover {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.action-tile {
  display: block;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  padding: 16px;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.action-tile:hover {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.route-list {
  display: flex;
  flex-direction: column;
}

.route-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.route-row:last-child {
  border-bottom: none;
}

.route-rank {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.route-name {
  font-size: 14px;
  font-weight: 500;
}

.route-value {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 960px) {
  .page-wrap {
    padding: 16px 12px;
  }
}
</style>
