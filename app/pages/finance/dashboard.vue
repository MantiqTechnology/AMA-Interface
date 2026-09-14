<script setup lang="ts">
import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import type {
  FinanceActionDto,
  FinanceControlDto,
  FinanceDashboardDto,
  FinanceMetricDto,
  FinanceReportingPeriodDto
} from '#shared/features/finance/reporting';

useHead({ title: 'Finance Dashboard - PT AMA' });

const selectedPeriod = ref<string>();
const {
  data: periods,
  pending: periodsPending,
  error: periodsError
} = await useAsyncData('finance-periods', () =>
  fetchApi<FinanceReportingPeriodDto[]>('/api/finance/reporting/periods')
);

watchEffect(() => {
  if (!selectedPeriod.value && periods.value?.[0]) selectedPeriod.value = periods.value[0].code;
});

const query = computed(() => (selectedPeriod.value ? { period: selectedPeriod.value } : {}));
const {
  data: dashboard,
  pending,
  error,
  refresh
} = await useAsyncData(
  'finance-phase-one-dashboard',
  () => fetchApi<FinanceDashboardDto>('/api/finance/reporting/dashboard', { query: query.value }),
  { watch: [query] }
);

const periodOptions = computed(() =>
  (periods.value ?? []).map((period) => ({
    title: `${period.code} (${period.status})`,
    value: period.code
  }))
);

const metricIcons: Record<FinanceMetricDto['key'], string> = {
  REVENUE: 'mdi-chart-line-variant',
  EXPENSE: 'mdi-trending-up',
  NET_INCOME: 'mdi-scale-balance',
  CASH: 'mdi-bank-outline',
  OVERDUE_AR: 'mdi-account-alert-outline',
  AR: 'mdi-account-cash-outline',
  AP: 'mdi-file-document-arrow-right-outline'
};

const metricToneClass: Record<FinanceMetricDto['tone'], string> = {
  SUCCESS: 'tone-success',
  WARNING: 'tone-warning',
  DANGER: 'tone-danger',
  NEUTRAL: 'tone-info'
};

const controlIcons: Record<FinanceControlDto['status'], string> = {
  SUCCESS: 'mdi-check-circle-outline',
  WARNING: 'mdi-alert-outline',
  DANGER: 'mdi-alert-circle-outline',
  NEUTRAL: 'mdi-information-outline'
};

const actionIcons: Record<FinanceActionDto['id'], string> = {
  'overdue-ar': 'mdi-account-alert-outline',
  'accounting-exceptions': 'mdi-clipboard-alert-outline',
  'subsidy-absorption': 'mdi-briefcase-variant-outline',
  'period-status': 'mdi-lock-clock'
};

// Demo-only visual panels. Core KPI/control/action values still come from /api/finance/reporting/dashboard.
const demoTrendMonths = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
const demoTrendSeries = computed<ApexAxisChartSeries>(() => {
  const metrics = dashboard.value?.metrics ?? [];
  const revenue = Math.max(metricValue(metrics, 'REVENUE'), 30_100_000);
  const expense = Math.max(metricValue(metrics, 'EXPENSE'), 950_000);
  const profit = metricValue(metrics, 'NET_INCOME') || revenue - expense;

  return [
    { name: 'Revenue', data: trendFrom(revenue, [0.55, 0.74, 0.77, 0.91, 1.06, 1]) },
    { name: 'Operating Expense', data: trendFrom(expense, [0.34, 0.52, 0.72, 0.81, 0.96, 1]) },
    { name: 'Profit / Loss', data: trendFrom(profit, [0.25, 0.59, 0.56, 0.66, 0.82, 1]) }
  ];
});

const trendOptions = computed<ApexOptions>(() => ({
  chart: {
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI"'
  },
  colors: ['#20A66A', '#F47A1F', '#2F6FDD'],
  dataLabels: { enabled: false },
  fill: {
    type: 'gradient',
    gradient: { opacityFrom: 0.16, opacityTo: 0.02, stops: [0, 100] }
  },
  grid: { borderColor: '#E6ECF2', strokeDashArray: 0 },
  legend: {
    position: 'top',
    horizontalAlign: 'center',
    fontSize: '12px',
    markers: { size: 6, strokeWidth: 0 }
  },
  markers: { size: 3, strokeWidth: 0, hover: { size: 5 } },
  stroke: { curve: 'smooth', width: [3, 2, 3] },
  tooltip: {
    y: {
      formatter: (value) => compactMoney(value * 1_000_000)
    }
  },
  xaxis: {
    categories: demoTrendMonths,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#506074', fontSize: '11px' } }
  },
  yaxis: {
    labels: {
      formatter: (value) => `${Math.round(value)}M`,
      style: { colors: '#506074', fontSize: '11px' }
    }
  }
}));

const recentActivities = [
  {
    id: 'act-journal-posted',
    icon: 'mdi-note-check-outline',
    tone: 'activity-blue',
    title: 'Journal #JV-2026-000123 posted',
    detail: 'GL Journal',
    time: 'Today, 09:41 AM'
  },
  {
    id: 'act-bank-reconciliation',
    icon: 'mdi-bank-check',
    tone: 'activity-green',
    title: 'Bank reconciliation completed',
    detail: 'Bank Reconciliation',
    time: 'Today, 08:15 AM'
  },
  {
    id: 'act-invoice-issued',
    icon: 'mdi-file-document-outline',
    tone: 'activity-orange',
    title: 'Invoice #INV-2026-000567 issued',
    detail: 'Accounts Receivable',
    time: 'Yesterday, 04:30 PM'
  },
  {
    id: 'act-payment-recorded',
    icon: 'mdi-cash-check',
    tone: 'activity-purple',
    title: 'Payment #PAY-2026-000789 recorded',
    detail: 'Accounts Payable',
    time: 'Yesterday, 11:02 AM'
  },
  {
    id: 'act-period-closed',
    icon: 'mdi-calendar-lock',
    tone: 'activity-blue',
    title: 'Period 2026-07 closed',
    detail: 'Period Closing',
    time: 'Aug 23, 2026'
  }
];

const executiveRatioCards = computed(() => {
  const r = dashboard.value?.executiveRatios;
  if (!r) return [];
  return [
    {
      category: 'FINANCIAL_HEALTH',
      label: 'Current Ratio (Likuiditas)',
      value: r.currentRatio != null ? `${r.currentRatio.toFixed(2)}x` : 'N/A',
      caption: 'Aset Lancar ÷ Liabilitas Lancar (PSAK 1)',
      status: (r.currentRatio ?? 0) >= 1.5 ? 'Sehat (≥1.5x)' : 'Perhatian',
      tone: (r.currentRatio ?? 0) >= 1.5 ? 'success' : 'warning',
      icon: 'mdi-scale-balance'
    },
    {
      category: 'FINANCIAL_HEALTH',
      label: 'Debt to Equity / DER (Solvabilitas)',
      value: r.debtToEquityRatio != null ? `${r.debtToEquityRatio.toFixed(2)}x` : 'N/A',
      caption: 'Total Utang ÷ Ekuitas Modal',
      status: (r.debtToEquityRatio ?? 99) <= 1.0 ? 'Aman (≤1.0x)' : 'Leveraged',
      tone: (r.debtToEquityRatio ?? 99) <= 1.0 ? 'success' : 'warning',
      icon: 'mdi-bank-outline'
    },
    {
      category: 'PROFITABILITY',
      label: 'Gross Profit Margin',
      value: r.grossMarginPercent != null ? `${r.grossMarginPercent.toFixed(1)}%` : 'N/A',
      caption: 'Laba Kotor Operasional ÷ Pendapatan',
      status: (r.grossMarginPercent ?? 0) >= 30 ? 'Prima' : 'Ketat',
      tone: (r.grossMarginPercent ?? 0) >= 30 ? 'success' : 'info',
      icon: 'mdi-chart-line'
    },
    {
      category: 'PROFITABILITY',
      label: 'Net Profit Margin',
      value: r.netMarginPercent != null ? `${r.netMarginPercent.toFixed(1)}%` : 'N/A',
      caption: 'Laba Bersih Akhir ÷ Pendapatan',
      status: (r.netMarginPercent ?? 0) >= 10 ? 'Menguntungkan' : 'Tipis',
      tone: (r.netMarginPercent ?? 0) >= 10 ? 'success' : 'warning',
      icon: 'mdi-cash-plus'
    },
    {
      category: 'AVIATION_METRICS',
      label: 'Cost per Flight Hour (CPFH)',
      value: r.costPerFlightHourMinor != null ? compactMoney(r.costPerFlightHourMinor) : 'N/A',
      caption: `${r.totalFlightHours} FH dari ${r.totalFlights} penerbangan`,
      status: 'Efisiensi Ops',
      tone: 'info',
      icon: 'mdi-airplane-clock'
    },
    {
      category: 'AVIATION_METRICS',
      label: 'Revenue per Flight Hour (RPFH)',
      value:
        r.revenuePerFlightHourMinor != null ? compactMoney(r.revenuePerFlightHourMinor) : 'N/A',
      caption: 'Yield pendapatan per jam terbang',
      status: 'Hasil Aviasi',
      tone: 'success',
      icon: 'mdi-cash-fast'
    },
    {
      category: 'AVIATION_METRICS',
      label: 'Fuel Cost Ratio',
      value: r.fuelCostRatioPercent != null ? `${r.fuelCostRatioPercent.toFixed(1)}%` : '0%',
      caption: 'Porsi beban avtur thd biaya langsung',
      status: (r.fuelCostRatioPercent ?? 0) <= 40 ? 'Normal (≤40%)' : 'Tinggi',
      tone: (r.fuelCostRatioPercent ?? 0) <= 40 ? 'success' : 'warning',
      icon: 'mdi-fuel'
    },
    {
      category: 'AVIATION_METRICS',
      label: 'Maintenance Cost Ratio',
      value:
        r.maintenanceCostRatioPercent != null
          ? `${r.maintenanceCostRatioPercent.toFixed(1)}%`
          : '0%',
      caption: 'Porsi beban MRO thd biaya langsung',
      status: 'MRO Service',
      tone: 'info',
      icon: 'mdi-wrench-clock'
    }
  ];
});

const selectedPeriodLabel = computed(() => {
  const period =
    dashboard.value?.period ?? periods.value?.find((item) => item.code === selectedPeriod.value);
  return period ? `${period.code} (${period.status})` : 'Pilih Periode';
});

const asOfLabel = computed(() => {
  if (!dashboard.value?.asOf) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(dashboard.value.asOf));
});

const primaryMetrics = computed(() => {
  const metrics = dashboard.value?.metrics ?? [];
  const primaryKeys = ['REVENUE', 'EXPENSE', 'NET_INCOME', 'CASH'];
  return primaryKeys
    .map((key) => metrics.find((m) => m.key === key))
    .filter((m): m is FinanceMetricDto => Boolean(m));
});

const workingCapitalMetrics = computed(() => {
  const metrics = dashboard.value?.metrics ?? [];
  const secondaryKeys = ['AR', 'AP', 'OVERDUE_AR'];
  return secondaryKeys
    .map((key) => metrics.find((m) => m.key === key))
    .filter((m): m is FinanceMetricDto => Boolean(m));
});

const aviationRatios = computed(() =>
  executiveRatioCards.value.filter((ratio) => ratio.category === 'AVIATION_METRICS')
);

const financialHealthRatios = computed(() =>
  executiveRatioCards.value.filter((ratio) => ratio.category !== 'AVIATION_METRICS')
);

function metricValue(metrics: FinanceMetricDto[], key: FinanceMetricDto['key']) {
  return metrics.find((metric) => metric.key === key)?.valueMinor ?? 0;
}

function trendFrom(valueMinor: number, factors: number[]) {
  const valueMillions = Math.max(Math.abs(valueMinor) / 1_000_000, 0.2);
  return factors.map((factor) => Math.round(valueMillions * factor * 10) / 10);
}

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  })
    .format(value)
    .replace(/\s+/gu, ' ');
}

function compactMoney(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1
  })
    .format(value)
    .replace(/\s+/gu, ' ');
}

function metricTrendLabel(metric: FinanceMetricDto) {
  if (metric.changePercent === null) return 'Baseline pembukuan';
  return `${Math.abs(metric.changePercent).toFixed(1)}% vs periode lalu`;
}

function metricTrendIcon(metric: FinanceMetricDto) {
  if (metric.direction === 'UP') return 'mdi-arrow-up';
  if (metric.direction === 'DOWN') return 'mdi-arrow-down';
  return 'mdi-minus';
}

function metricTrendToneClass(metric: FinanceMetricDto) {
  if (metric.direction === 'UP') return metric.key === 'EXPENSE' ? 'text-warning' : 'text-success';
  if (metric.direction === 'DOWN')
    return metric.key === 'EXPENSE' ? 'text-success' : 'text-warning';
  return 'text-medium-emphasis';
}

function controlToneClass(status: FinanceControlDto['status']) {
  if (status === 'SUCCESS') return 'control-success';
  if (status === 'WARNING') return 'control-warning';
  if (status === 'DANGER') return 'control-danger';
  return 'control-info';
}

function actionValue(item: FinanceActionDto) {
  if (item.id === 'overdue-ar') return money(Number(item.value));
  return item.value;
}
</script>

<template>
  <VContainer class="finance-overview-container px-3 py-4 md:px-5" fluid>
    <!-- 1. Executive Header Bar -->
    <header class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
      <div>
        <div class="d-flex align-center ga-2 mb-1">
          <h1 class="text-h5 font-weight-bold text-text-primary">Finance Overview</h1>
          <VChip color="primary" density="compact" size="small" variant="tonal">
            PT AMA · Executive Ledger
          </VChip>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Ringkasan eksekutif posisi keuangan, arus kas, dan kinerja operasional penerbangan
          perintis.
        </p>
      </div>

      <div class="d-flex align-center ga-2">
        <VSelect
          v-model="selectedPeriod"
          :disabled="periodsPending"
          density="compact"
          hide-details
          :items="periodOptions"
          label="Periode Pembukuan"
          style="min-width: 220px"
          variant="outlined"
        />
        <VBtn
          aria-label="Refresh Finance dashboard"
          icon="mdi-refresh"
          :loading="pending"
          variant="tonal"
          @click="refresh()"
        />
      </div>
    </header>

    <VAlert
      v-if="error || periodsError"
      class="mb-4"
      color="error"
      title="Finance dashboard unavailable"
      variant="tonal"
    >
      {{ error?.message || periodsError?.message }}
    </VAlert>

    <VSkeletonLoader v-if="pending && !dashboard" class="mb-4" type="card, card, card" />

    <template v-else-if="dashboard">
      <!-- 2. Primary 4 KPI Cards (Lega, Bersih, Sesuai Prinsip KISS) -->
      <VRow class="mb-5" dense>
        <VCol v-for="metric in primaryMetrics" :key="metric.key" cols="12" sm="6" lg="3">
          <VCard
            border
            class="pa-4 fill-height d-flex flex-column justify-space-between elevation-0"
            rounded="lg"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <span
                class="text-caption font-weight-bold text-uppercase text-medium-emphasis letter-spacing-wide"
              >
                {{ metric.label }}
              </span>
              <div class="metric-icon-wrap" :class="metricToneClass[metric.tone]">
                <VIcon :icon="metricIcons[metric.key] ?? 'mdi-finance'" size="20" />
              </div>
            </div>

            <div class="my-1">
              <div class="text-h5 font-weight-bold text-text-primary">
                {{ money(metric.valueMinor) }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{ metric.caption }}
              </div>
            </div>

            <div
              class="d-flex align-center ga-1 pt-2 mt-2 border-t text-caption font-weight-medium"
              :class="metricTrendToneClass(metric)"
            >
              <VIcon :icon="metricTrendIcon(metric)" size="14" />
              <span>{{ metricTrendLabel(metric) }}</span>
            </div>
          </VCard>
        </VCol>
      </VRow>

      <!-- 3. Dua Pilar Analisis Berdampingan: Aviasi AMA vs Finansial PSAK -->
      <VRow class="mb-5">
        <!-- Pilar A: Kinerja Operasional Aviasi PT AMA -->
        <VCol cols="12" lg="6">
          <VCard border class="fill-height pa-4 elevation-0" rounded="lg">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="d-flex align-center ga-2">
                <div class="section-icon-badge bg-blue-lighten-5 text-primary">
                  <VIcon icon="mdi-airplane" size="20" />
                </div>
                <div>
                  <h2 class="text-subtitle-1 font-weight-bold mb-0">Kinerja Operasional Aviasi</h2>
                  <p class="text-caption text-medium-emphasis mb-0">
                    Efisiensi penerbangan dan biaya jam terbang
                  </p>
                </div>
              </div>
              <VChip color="primary" density="compact" size="small" variant="tonal">
                {{ dashboard.executiveRatios?.totalFlightHours ?? 0 }} FH ·
                {{ dashboard.executiveRatios?.totalFlights ?? 0 }} Penerbangan
              </VChip>
            </div>

            <VRow dense>
              <VCol v-for="ratio in aviationRatios" :key="ratio.label" cols="12" sm="6">
                <div class="ratio-subcard pa-3 rounded-lg border">
                  <div class="d-flex align-center justify-space-between mb-1">
                    <span
                      class="text-caption font-weight-medium text-medium-emphasis d-flex align-center ga-1"
                    >
                      <VIcon :icon="ratio.icon" size="14" />
                      {{ ratio.label }}
                    </span>
                    <VChip :color="ratio.tone" density="compact" size="x-small" variant="tonal">
                      {{ ratio.status }}
                    </VChip>
                  </div>
                  <div class="text-h6 font-weight-bold my-1 text-text-primary">
                    {{ ratio.value }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ ratio.caption }}
                  </div>
                </div>
              </VCol>
            </VRow>
          </VCard>
        </VCol>

        <!-- Pilar B: Kesehatan Finansial & Standar PSAK -->
        <VCol cols="12" lg="6">
          <VCard border class="fill-height pa-4 elevation-0" rounded="lg">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="d-flex align-center ga-2">
                <div class="section-icon-badge bg-green-lighten-5 text-success">
                  <VIcon icon="mdi-shield-check-outline" size="20" />
                </div>
                <div>
                  <h2 class="text-subtitle-1 font-weight-bold mb-0">Kesehatan Finansial & PSAK</h2>
                  <p class="text-caption text-medium-emphasis mb-0">
                    Likuiditas, struktur solvabilitas, dan margin laba
                  </p>
                </div>
              </div>
              <VBtn
                color="primary"
                density="compact"
                prepend-icon="mdi-chart-box-outline"
                size="small"
                to="/finance/statements?tab=ratios"
                variant="text"
              >
                Analisis Lengkap
              </VBtn>
            </div>

            <VRow dense>
              <VCol v-for="ratio in financialHealthRatios" :key="ratio.label" cols="12" sm="6">
                <div class="ratio-subcard pa-3 rounded-lg border">
                  <div class="d-flex align-center justify-space-between mb-1">
                    <span
                      class="text-caption font-weight-medium text-medium-emphasis d-flex align-center ga-1"
                    >
                      <VIcon :icon="ratio.icon" size="14" />
                      {{ ratio.label }}
                    </span>
                    <VChip :color="ratio.tone" density="compact" size="x-small" variant="tonal">
                      {{ ratio.status }}
                    </VChip>
                  </div>
                  <div class="text-h6 font-weight-bold my-1 text-text-primary">
                    {{ ratio.value }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ ratio.caption }}
                  </div>
                </div>
              </VCol>
            </VRow>
          </VCard>
        </VCol>
      </VRow>

      <!-- 4. Grafik Tren Buku Besar & Kontrol Akuntansi / Piutang (7 : 5 Grid) -->
      <VRow class="mb-5">
        <!-- Kolom Kiri: Tren GL 6 Bulan -->
        <VCol cols="12" lg="7">
          <VCard border class="pa-4 fill-height elevation-0" rounded="lg">
            <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-3">
              <div>
                <h2 class="text-subtitle-1 font-weight-bold mb-0">
                  Tren Aktivitas Buku Besar (GL)
                </h2>
                <p class="text-caption text-medium-emphasis mb-0">
                  Perbandingan pendapatan operasional, beban penerbangan, dan laba
                </p>
              </div>
              <VChip density="compact" size="small" variant="outlined"> 6 Bulan Terakhir </VChip>
            </div>
            <ClientOnly>
              <FeatureApexChart
                height="270"
                :options="trendOptions"
                :series="demoTrendSeries"
                type="area"
              />
            </ClientOnly>
          </VCard>
        </VCol>

        <!-- Kolom Kanan: Modal Kerja & Kontrol Akuntansi -->
        <VCol cols="12" lg="5">
          <VCard border class="pa-4 fill-height d-flex flex-column elevation-0" rounded="lg">
            <div class="d-flex align-center justify-space-between mb-3">
              <div>
                <h2 class="text-subtitle-1 font-weight-bold mb-0">Kontrol Akuntansi & Piutang</h2>
                <p class="text-caption text-medium-emphasis mb-0">
                  Integritas buku besar dan saldo akun kontrol
                </p>
              </div>
            </div>

            <!-- Saldo Akun Kontrol Mini Strip (Piutang AR & Utang AP) -->
            <div class="d-flex ga-2 mb-3">
              <div
                v-for="wc in workingCapitalMetrics"
                :key="wc.key"
                class="flex-1-1 pa-2 rounded-lg border bg-surface-variant-light text-center"
              >
                <div class="text-caption text-medium-emphasis font-weight-medium">
                  {{ wc.label }}
                </div>
                <div class="text-subtitle-2 font-weight-bold text-text-primary mt-1">
                  {{ money(wc.valueMinor) }}
                </div>
              </div>
            </div>

            <!-- Daftar Kontrol & Navigasi Cepat -->
            <div class="control-list-wrap flex-grow-1 d-flex flex-column ga-2">
              <template v-for="control in dashboard.controls" :key="control.label">
                <NuxtLink
                  v-if="control.route"
                  class="control-row-link pa-2 px-3 rounded-lg border d-flex align-center justify-space-between text-decoration-none"
                  :class="controlToneClass(control.status)"
                  :to="control.route"
                >
                  <div class="d-flex align-center ga-2">
                    <VIcon
                      :color="control.status === 'SUCCESS' ? 'success' : 'warning'"
                      :icon="controlIcons[control.status]"
                      size="18"
                    />
                    <span class="text-body-2 font-weight-medium text-text-primary">{{
                      control.label
                    }}</span>
                  </div>
                  <div class="d-flex align-center ga-2">
                    <span class="text-caption font-weight-bold">{{ control.value }}</span>
                    <VIcon class="text-medium-emphasis" icon="mdi-chevron-right" size="16" />
                  </div>
                </NuxtLink>
                <div
                  v-else
                  class="control-row-link pa-2 px-3 rounded-lg border d-flex align-center justify-space-between"
                  :class="controlToneClass(control.status)"
                >
                  <div class="d-flex align-center ga-2">
                    <VIcon
                      :color="control.status === 'SUCCESS' ? 'success' : 'warning'"
                      :icon="controlIcons[control.status]"
                      size="18"
                    />
                    <span class="text-body-2 font-weight-medium text-text-primary">{{
                      control.label
                    }}</span>
                  </div>
                  <span class="text-caption font-weight-bold">{{ control.value }}</span>
                </div>
              </template>
            </div>
          </VCard>
        </VCol>
      </VRow>

      <!-- 5. Perlu Perhatian (Action Items) & Aktivitas Terakhir (Grid Seimbang) -->
      <VRow>
        <VCol cols="12" md="6">
          <VCard border class="pa-4 fill-height elevation-0" rounded="lg">
            <div class="d-flex align-center justify-space-between mb-3">
              <div>
                <h2 class="text-subtitle-1 font-weight-bold mb-0">
                  Perlu Perhatian (Action Items)
                </h2>
                <p class="text-caption text-medium-emphasis mb-0">
                  Pengecualian pembukuan dan tagihan tertunda
                </p>
              </div>
              <VChip
                :color="dashboard.actions.length ? 'warning' : 'success'"
                density="compact"
                size="small"
                variant="tonal"
              >
                {{
                  dashboard.actions.length ? `${dashboard.actions.length} Tindakan` : 'Semua Beres'
                }}
              </VChip>
            </div>

            <div v-if="dashboard.actions.length" class="d-flex flex-column ga-2">
              <NuxtLink
                v-for="item in dashboard.actions"
                :key="item.id"
                class="action-item-link pa-3 rounded-lg border d-flex align-center justify-space-between text-decoration-none"
                :to="item.route"
              >
                <div class="d-flex align-center ga-3 min-width-0">
                  <div
                    class="action-icon-circle"
                    :class="item.tone === 'DANGER' ? 'risk' : 'warning'"
                  >
                    <VIcon :icon="actionIcons[item.id] ?? 'mdi-alert-outline'" size="18" />
                  </div>
                  <div class="min-width-0">
                    <div class="text-body-2 font-weight-bold text-text-primary text-truncate">
                      {{ item.title }}
                    </div>
                    <div class="text-caption text-medium-emphasis text-truncate">
                      {{ item.detail }}
                    </div>
                  </div>
                </div>
                <div
                  class="text-caption font-weight-bold ml-2 text-no-wrap"
                  :class="item.tone === 'DANGER' ? 'text-error' : 'text-warning'"
                >
                  {{ actionValue(item) }}
                </div>
              </NuxtLink>
            </div>
            <VAlert v-else color="success" density="comfortable" variant="tonal">
              Tidak ada item pengecualian atau tindakan tertunda pada periode
              {{ selectedPeriodLabel }}.
            </VAlert>
          </VCard>
        </VCol>

        <VCol cols="12" md="6">
          <VCard border class="pa-4 fill-height elevation-0" rounded="lg">
            <div class="d-flex align-center justify-space-between mb-3">
              <div>
                <h2 class="text-subtitle-1 font-weight-bold mb-0">Aktivitas Terakhir Sistem</h2>
                <p class="text-caption text-medium-emphasis mb-0">
                  Log pencatatan jurnal, invoice, dan rekonsiliasi
                </p>
              </div>
              <VBtn color="primary" density="compact" size="small" variant="text"> Semua Log </VBtn>
            </div>

            <div class="d-flex flex-column ga-2">
              <div
                v-for="act in recentActivities"
                :key="act.id"
                class="pa-2 px-3 rounded-lg border d-flex align-center justify-space-between"
              >
                <div class="d-flex align-center ga-3 min-width-0">
                  <div class="act-icon-box" :class="act.tone">
                    <VIcon :icon="act.icon" size="16" />
                  </div>
                  <div class="min-width-0">
                    <div class="text-caption font-weight-bold text-text-primary text-truncate">
                      {{ act.title }}
                    </div>
                    <div class="text-caption text-medium-emphasis text-truncate">
                      {{ act.detail }}
                    </div>
                  </div>
                </div>
                <span class="text-caption text-medium-emphasis text-no-wrap ml-2">{{
                  act.time
                }}</span>
              </div>
            </div>
          </VCard>
        </VCol>
      </VRow>

      <!-- Footer As Of -->
      <footer class="d-flex justify-end align-center ga-1 mt-4 text-caption text-medium-emphasis">
        <span>Buku Besar terintegrasi per {{ asOfLabel }}</span>
        <VIcon icon="mdi-database-check-outline" size="14" />
      </footer>
    </template>
  </VContainer>
</template>

<style scoped>
.finance-overview-container {
  min-width: 0;
  color: #102033;
}

.letter-spacing-wide {
  letter-spacing: 0.04em;
}

.metric-icon-wrap {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 8px;
}

.tone-success {
  background: #eaf8f1;
  color: #1f9d62;
}

.tone-warning {
  background: #fff3e8;
  color: #f47a1f;
}

.tone-danger {
  background: #fdeceb;
  color: #ce2d2d;
}

.tone-info {
  background: #edf4ff;
  color: #2f6fdd;
}

.section-icon-badge {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
}

.ratio-subcard {
  background: #fcfdfe;
  transition: border-color 0.15s ease;
}

.ratio-subcard:hover {
  border-color: #cbd5e1;
}

.bg-surface-variant-light {
  background: #f8fafc;
}

.control-row-link {
  transition: all 0.15s ease;
  background: #ffffff;
}

.control-row-link:hover {
  background: #f8fafc;
  border-color: #94a3b8 !important;
  transform: translateX(2px);
}

.control-success {
  border-left: 3px solid #1f9d62 !important;
}

.control-warning {
  border-left: 3px solid #f47a1f !important;
}

.control-danger {
  border-left: 3px solid #ce2d2d !important;
}

.control-info {
  border-left: 3px solid #2f6fdd !important;
}

.action-item-link {
  background: #ffffff;
  transition: all 0.15s ease;
}

.action-item-link:hover {
  background: #f8fafc;
  border-color: #94a3b8 !important;
}

.action-icon-circle {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.action-icon-circle.warning {
  background: #fff3e8;
  color: #f47a1f;
}

.action-icon-circle.risk {
  background: #fdeceb;
  color: #ce2d2d;
}

.act-icon-box {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 6px;
  flex-shrink: 0;
}

.activity-green {
  background: #eaf8f1;
  color: #1f9d62;
}

.activity-orange {
  background: #fff3e8;
  color: #f47a1f;
}

.activity-blue {
  background: #edf4ff;
  color: #2f6fdd;
}

.activity-purple {
  background: #f0ebff;
  color: #7c4bd9;
}
</style>
