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

const keyRatios = [
  { label: 'Gross Margin', value: '68.4%', change: '2.1 pp', direction: 'up' },
  { label: 'Operating Margin', value: '31.2%', change: '1.4 pp', direction: 'up' },
  { label: 'AR Days Outstanding', value: '24.6 days', change: '2.3 days', direction: 'bad-up' },
  { label: 'AP Days Outstanding', value: '38.1 days', change: '1.8 days', direction: 'down' },
  { label: 'Cash Conversion Cycle', value: '24.1 days', change: '4.1 days', direction: 'bad-up' }
];

const selectedPeriodLabel = computed(() => {
  const period =
    dashboard.value?.period ?? periods.value?.find((item) => item.code === selectedPeriod.value);
  return period ? `${period.code} (${period.status})` : 'Select period';
});

const asOfLabel = computed(() => {
  if (!dashboard.value?.asOf) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(dashboard.value.asOf));
});

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
  if (metric.changePercent === null) return 'Scope baseline';
  return `${Math.abs(metric.changePercent).toFixed(1)}% vs previous`;
}

function metricTrendIcon(metric: FinanceMetricDto) {
  if (metric.direction === 'UP') return 'mdi-arrow-up';
  if (metric.direction === 'DOWN') return 'mdi-arrow-down';
  return 'mdi-minus';
}

function controlToneClass(status: FinanceControlDto['status']) {
  if (status === 'SUCCESS') return 'control-success';
  if (status === 'WARNING') return 'control-warning';
  if (status === 'DANGER') return 'control-danger';
  return 'control-info';
}

function controlStatusLabel(status: FinanceControlDto['status']) {
  if (status === 'WARNING') return 'Warning';
  if (status === 'DANGER') return 'Risk';
  return 'Success';
}

function actionValue(item: FinanceActionDto) {
  if (item.id === 'overdue-ar') return money(Number(item.value));
  return item.value;
}
</script>

<template>
  <VContainer class="finance-report px-3 py-4 md:px-5" fluid>
    <header class="report-header">
      <div class="report-heading">
        <h1>Finance Dashboard</h1>
        <p>Posted GL, canonical subledgers, and finance control exceptions.</p>
      </div>

      <div class="period-controls">
        <VSelect
          v-model="selectedPeriod"
          :disabled="periodsPending"
          density="comfortable"
          hide-details
          :items="periodOptions"
          label="Accounting period"
          variant="outlined"
        />
        <VBtn
          aria-label="Refresh Finance dashboard"
          class="refresh-button"
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

    <VSkeletonLoader v-if="pending && !dashboard" class="report-skeleton" type="card, card, card" />

    <template v-else-if="dashboard">
      <section class="metric-grid" aria-label="Finance metrics">
        <article
          v-for="metric in dashboard.metrics"
          :key="metric.key"
          class="metric-card"
          :class="metricToneClass[metric.tone]"
        >
          <div class="metric-icon">
            <VIcon :icon="metricIcons[metric.key] ?? 'mdi-finance'" size="24" />
          </div>
          <div class="metric-copy">
            <p class="metric-label">{{ metric.label }}</p>
            <p class="metric-value">{{ money(metric.valueMinor) }}</p>
            <p class="metric-caption">{{ metric.caption }}</p>
            <div class="metric-trend">
              <VIcon :icon="metricTrendIcon(metric)" size="12" />
              <span>{{ metricTrendLabel(metric) }}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="report-main-grid">
        <VCard border class="report-panel controls-panel" rounded="lg">
          <div class="panel-heading">
            <div>
              <h2>Accounting Controls</h2>
              <p>Current backend workflow and ledger state.</p>
            </div>
          </div>

          <div class="control-grid">
            <template v-for="control in dashboard.controls" :key="control.label">
              <NuxtLink
                v-if="control.route"
                class="control-tile"
                :class="controlToneClass(control.status)"
                :to="control.route"
              >
                <div>
                  <p>{{ control.label }}</p>
                  <strong>{{ control.value }}</strong>
                </div>
                <span class="control-state">
                  <VIcon :icon="controlIcons[control.status]" size="22" />
                  <small>{{ controlStatusLabel(control.status) }}</small>
                </span>
              </NuxtLink>
              <div v-else class="control-tile" :class="controlToneClass(control.status)">
                <div>
                  <p>{{ control.label }}</p>
                  <strong>{{ control.value }}</strong>
                </div>
                <span class="control-state">
                  <VIcon :icon="controlIcons[control.status]" size="22" />
                  <small>{{ controlStatusLabel(control.status) }}</small>
                </span>
              </div>
            </template>
          </div>
        </VCard>

        <VCard border class="report-panel trend-panel" rounded="lg">
          <div class="panel-heading compact">
            <div>
              <h2>GL Activity Trend</h2>
              <p>Demo trend view using the selected period's ledger totals.</p>
            </div>
            <VSelect
              density="compact"
              hide-details
              :items="['Last 6 months']"
              model-value="Last 6 months"
              variant="outlined"
            />
          </div>

          <ClientOnly>
            <FeatureApexChart
              height="240"
              :options="trendOptions"
              :series="demoTrendSeries"
              type="area"
            />
          </ClientOnly>
        </VCard>

        <VCard border class="report-panel attention-panel" rounded="lg">
          <div class="panel-heading">
            <div>
              <h2>Requires Attention</h2>
              <p>Open finance controls with a valid destination and backend condition.</p>
            </div>
          </div>

          <div v-if="dashboard.actions.length" class="attention-list">
            <NuxtLink
              v-for="item in dashboard.actions"
              :key="item.id"
              class="attention-row"
              :to="item.route"
            >
              <span class="attention-icon" :class="item.tone === 'DANGER' ? 'risk' : 'warning'">
                <VIcon :icon="actionIcons[item.id] ?? 'mdi-alert-outline'" size="22" />
              </span>
              <span class="attention-copy">
                <strong>{{ item.title }}</strong>
                <small>{{ item.detail }}</small>
              </span>
              <span class="attention-value" :class="item.tone === 'DANGER' ? 'risk' : 'warning'">
                {{ actionValue(item) }}
              </span>
            </NuxtLink>
          </div>
          <VAlert v-else color="success" variant="tonal">
            No finance control items require attention for {{ selectedPeriodLabel }}.
          </VAlert>
        </VCard>

        <VCard border class="report-panel activities-panel" rounded="lg">
          <div class="panel-heading row-heading">
            <div>
              <h2>Recent Activities</h2>
            </div>
            <VBtn color="primary" size="small" variant="text">View all</VBtn>
          </div>

          <div class="activity-list">
            <div v-for="activity in recentActivities" :key="activity.id" class="activity-row">
              <span class="activity-icon" :class="activity.tone">
                <VIcon :icon="activity.icon" size="19" />
              </span>
              <span class="activity-copy">
                <strong>{{ activity.title }}</strong>
                <small>{{ activity.detail }}</small>
              </span>
              <time>{{ activity.time }}</time>
            </div>
          </div>
        </VCard>
      </section>

      <VCard border class="report-panel ratios-panel mt-4" rounded="lg">
        <div class="panel-heading row-heading">
          <div class="ratio-title">
            <h2>Key Ratios</h2>
            <span>(vs Jul 2026)</span>
          </div>
          <VBtn size="small" variant="tonal">View all ratios</VBtn>
        </div>

        <div class="ratio-grid">
          <div v-for="ratio in keyRatios" :key="ratio.label" class="ratio-cell">
            <p>{{ ratio.label }}</p>
            <strong>{{ ratio.value }}</strong>
            <small :class="ratio.direction === 'bad-up' ? 'ratio-bad' : 'ratio-good'">
              <VIcon
                :icon="ratio.direction === 'down' ? 'mdi-arrow-down' : 'mdi-arrow-up'"
                size="12"
              />
              {{ ratio.change }}
            </small>
          </div>
        </div>
      </VCard>

      <p class="as-of">
        As of {{ asOfLabel }}
        <VIcon class="ml-1" icon="mdi-information-outline" size="16" />
      </p>
    </template>
  </VContainer>
</template>

<style scoped>
.finance-report {
  min-width: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(247, 249, 250, 0.96) 280px), #f7f9fa;
  color: #102033;
}

.report-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.report-heading h1 {
  margin: 0;
  color: #081937;
  font-size: 1.35rem;
  font-weight: 760;
  letter-spacing: 0;
  line-height: 1.2;
}

.report-heading p,
.panel-heading p,
.metric-caption,
.activity-copy small,
.attention-copy small {
  color: #56667d;
}

.report-heading p {
  margin: 6px 0 0;
  font-size: 0.86rem;
}

.period-controls {
  display: grid;
  grid-template-columns: minmax(210px, 280px) 48px;
  gap: 10px;
  align-items: center;
}

.refresh-button {
  min-width: 48px;
}

.report-skeleton {
  border-radius: 8px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.metric-card {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
  min-height: 148px;
  padding: 16px 14px;
  border: 1px solid #dde6ee;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgba(8, 25, 55, 0.06);
}

.metric-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 8px;
}

.metric-copy {
  min-width: 0;
}

.metric-label,
.metric-caption,
.metric-trend,
.control-tile p,
.control-state small,
.ratio-cell p,
.ratio-cell small {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.35;
}

.metric-label {
  color: #43516a;
  font-weight: 650;
}

.metric-value {
  margin: 3px 0 4px;
  overflow-wrap: anywhere;
  color: #071a32;
  font-size: 1.02rem;
  font-weight: 780;
  letter-spacing: 0;
  line-height: 1.2;
}

.metric-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  font-weight: 700;
}

.tone-success .metric-icon,
.activity-green,
.control-success .control-state {
  background: #eaf8f1;
  color: #1f9d62;
}

.tone-warning .metric-icon,
.activity-orange,
.control-warning .control-state {
  background: #fff3e8;
  color: #f47a1f;
}

.tone-danger .metric-icon,
.control-danger .control-state {
  background: #fdeceb;
  color: #ce2d2d;
}

.tone-info .metric-icon,
.activity-blue,
.control-info .control-state {
  background: #edf4ff;
  color: #2f6fdd;
}

.tone-success .metric-trend {
  color: #1f9d62;
}

.tone-warning .metric-trend {
  color: #f47a1f;
}

.tone-danger .metric-trend {
  color: #ce2d2d;
}

.tone-info .metric-trend {
  color: #2f6fdd;
}

.report-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(360px, 1fr);
  gap: 12px;
}

.report-panel {
  overflow: hidden;
  border-color: #dde6ee !important;
  background: #ffffff !important;
  box-shadow: 0 8px 24px rgba(8, 25, 55, 0.055);
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px 12px;
}

.panel-heading.compact {
  align-items: center;
}

.panel-heading.compact :deep(.v-input) {
  width: 150px;
  flex: 0 0 auto;
}

.panel-heading h2 {
  margin: 0;
  color: #0d1c3a;
  font-size: 1rem;
  font-weight: 760;
  letter-spacing: 0;
  line-height: 1.25;
}

.panel-heading p {
  margin: 5px 0 0;
  font-size: 0.82rem;
}

.row-heading {
  align-items: center;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 0 16px 16px;
}

.control-tile {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border: 1px solid #dde6ee;
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 150ms ease,
    transform 150ms ease,
    box-shadow 150ms ease;
}

.control-tile:hover {
  border-color: #b9c8d7;
  box-shadow: 0 8px 18px rgba(8, 25, 55, 0.08);
  transform: translateY(-1px);
}

.control-tile strong {
  display: block;
  margin-top: 4px;
  color: #071a32;
  font-size: 0.93rem;
  font-weight: 760;
}

.control-state {
  display: grid;
  justify-items: center;
  gap: 3px;
  flex: 0 0 auto;
}

.control-state small {
  font-size: 0.68rem;
  font-weight: 650;
}

.trend-panel :deep(.apexcharts-canvas) {
  margin: 0 auto;
}

.attention-list,
.activity-list {
  padding: 0 18px 14px;
}

.attention-row,
.activity-row {
  display: grid;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 12px 0;
  border-top: 1px solid #edf1f5;
}

.attention-row {
  grid-template-columns: 42px minmax(0, 1fr) auto;
  color: inherit;
  text-decoration: none;
}

.attention-icon,
.activity-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 50%;
  flex: 0 0 auto;
}

.attention-icon.warning {
  background: #fff3e8;
  color: #f47a1f;
}

.attention-icon.risk {
  background: #fdeceb;
  color: #ce2d2d;
}

.attention-copy,
.activity-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.attention-copy strong,
.activity-copy strong {
  overflow: hidden;
  color: #17223c;
  font-size: 0.84rem;
  font-weight: 720;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attention-value {
  max-width: 150px;
  overflow-wrap: anywhere;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 0.75rem;
  font-weight: 720;
  text-align: right;
}

.attention-value.warning {
  background: #fff3e8;
  color: #d7620f;
}

.attention-value.risk {
  background: #fdeceb;
  color: #ce2d2d;
}

.activity-row {
  grid-template-columns: 36px minmax(0, 1fr) minmax(96px, auto);
}

.activity-purple {
  background: #f0ebff;
  color: #7c4bd9;
}

.activity-row time {
  color: #56667d;
  font-size: 0.78rem;
  text-align: right;
  white-space: nowrap;
}

.ratio-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.ratio-title span {
  color: #56667d;
  font-size: 0.8rem;
}

.ratio-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  padding: 0 18px 18px;
}

.ratio-cell {
  min-width: 0;
  padding: 4px 18px;
  border-left: 1px solid #dde6ee;
}

.ratio-cell:first-child {
  border-left: 0;
}

.ratio-cell p {
  color: #56667d;
  font-weight: 560;
}

.ratio-cell strong {
  display: block;
  margin: 5px 0 6px;
  color: #071a32;
  font-size: 1.05rem;
  font-weight: 780;
}

.ratio-cell small {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 720;
}

.ratio-good {
  color: #1f9d62;
}

.ratio-bad {
  color: #ce2d2d;
}

.as-of {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin: 14px 0 0;
  color: #56667d;
  font-size: 0.78rem;
}

@media (max-width: 1320px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .report-main-grid {
    grid-template-columns: 1fr;
  }

  .control-grid,
  .ratio-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ratio-cell {
    border-left: 0;
    border-top: 1px solid #dde6ee;
  }
}

@media (max-width: 680px) {
  .report-header,
  .panel-heading,
  .panel-heading.compact {
    align-items: stretch;
    flex-direction: column;
  }

  .panel-heading.row-heading {
    align-items: center;
    flex-direction: row;
  }

  .period-controls {
    grid-template-columns: minmax(0, 1fr) 48px;
    width: 100%;
  }

  .metric-grid,
  .control-grid,
  .ratio-grid {
    grid-template-columns: 1fr;
  }

  .metric-card {
    min-height: auto;
  }

  .panel-heading.compact :deep(.v-input) {
    width: 100%;
  }

  .attention-row {
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .attention-value {
    grid-column: 2;
    justify-self: start;
    max-width: 100%;
  }

  .activity-row {
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .activity-row time {
    grid-column: 2;
    text-align: left;
  }

  .ratio-cell {
    padding-inline: 0;
  }
}
</style>
