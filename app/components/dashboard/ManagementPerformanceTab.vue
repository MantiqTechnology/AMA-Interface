<script setup lang="ts">
import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import type {
  AviationDashboardTone,
  AviationManagementDashboardDto,
  DashboardDeltaMetric
} from '#shared/contracts/aviation-dashboard';
import { AMA_THEME_HEX } from '../../constants/themeColors';

const props = defineProps<{
  data: AviationManagementDashboardDto;
  sections: Record<string, boolean>;
}>();

const visibleGroups = computed(() =>
  props.data.metricGroups.filter((group) => group.key !== 'safety' || props.sections.safetyInsights)
);
const operationalTrendAvailable = computed(
  () => props.data.trend.filter((point) => point.scheduled > 0).length >= 2
);
const financeTrendAvailable = computed(
  () =>
    !props.data.isMixedCurrency &&
    props.data.financeDataState !== 'NO_DATA' &&
    props.data.trend.filter((point) => point.financialDataAvailable).length >= 2
);
const totalRevenue = computed(() =>
  props.data.revenueComposition.reduce((sum, point) => sum + point.value, 0)
);

const completionSeries = computed<ApexAxisChartSeries>(() => [
  { name: 'Scheduled', type: 'column', data: props.data.trend.map((point) => point.scheduled) },
  { name: 'Completed', type: 'column', data: props.data.trend.map((point) => point.completed) },
  { name: 'Cancelled', type: 'line', data: props.data.trend.map((point) => point.cancelled) },
  { name: 'OTP', type: 'line', data: props.data.trend.map((point) => point.onTimePercent) }
]);
const completionOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif', stacked: false },
  colors: ['#91A7B6', AMA_THEME_HEX.success, AMA_THEME_HEX.danger, '#2E8BCB'],
  dataLabels: { enabled: false },
  grid: { borderColor: AMA_THEME_HEX.borderDefault },
  legend: { position: 'top', horizontalAlign: 'center', fontSize: '12px', markers: { size: 6 } },
  markers: { size: [0, 0, 3, 3] },
  plotOptions: { bar: { borderRadius: 2, columnWidth: '55%' } },
  stroke: { width: [0, 0, 2, 2], curve: 'smooth' },
  xaxis: {
    categories: props.data.trend.map((point) => shortDate(point.date)),
    labels: { style: { fontSize: '12px' } }
  },
  yaxis: [
    { min: 0, forceNiceScale: true, labels: { style: { fontSize: '12px' } } },
    {
      opposite: true,
      min: 0,
      max: 100,
      labels: { formatter: (value) => `${Math.round(value)}%`, style: { fontSize: '12px' } }
    }
  ],
  tooltip: { shared: true }
}));

const financeSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Revenue',
    type: 'column',
    data: props.data.trend.map((point) => (point.financialDataAvailable ? point.revenue : null))
  },
  {
    name: 'Operational Cost',
    type: 'column',
    data: props.data.trend.map((point) =>
      point.financialDataAvailable ? point.operationalCost : null
    )
  },
  {
    name: 'Gross Margin %',
    type: 'line',
    data: props.data.trend.map((point) =>
      point.financialDataAvailable ? point.marginPercent : null
    )
  }
]);
const financeOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif', stacked: false },
  colors: [AMA_THEME_HEX.success, '#2F77B5', AMA_THEME_HEX.accent],
  dataLabels: { enabled: false },
  grid: { borderColor: AMA_THEME_HEX.borderDefault },
  legend: { position: 'top', horizontalAlign: 'center', fontSize: '12px', markers: { size: 6 } },
  markers: { size: [0, 0, 3] },
  plotOptions: { bar: { borderRadius: 2, columnWidth: '50%' } },
  stroke: { width: [0, 0, 2], curve: 'smooth' },
  xaxis: {
    categories: props.data.trend.map((point) => shortDate(point.date)),
    labels: { style: { fontSize: '12px' } }
  },
  yaxis: [
    { labels: { formatter: compactNumber, style: { fontSize: '12px' } } },
    {
      opposite: true,
      min: -100,
      max: 100,
      labels: { formatter: (value) => `${Math.round(value)}%`, style: { fontSize: '12px' } }
    }
  ],
  tooltip: { shared: true }
}));

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: props.data.currencyCode,
    maximumFractionDigits: 0
  })
    .format(value)
    .replace(/\s+/gu, ' ');
}
function compactNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value
  );
}
function metricValue(metric: DashboardDeltaMetric) {
  if (metric.dataState === 'NO_DATA') return 'Data unavailable';
  return metricComparableValue(metric, metric.value);
}
function metricComparableValue(metric: DashboardDeltaMetric, value: number | string) {
  if (
    typeof value === 'number' &&
    ['REVENUE', 'COST', 'MARGIN', 'INVOICED', 'PAID', 'AR'].includes(metric.key)
  )
    return money(value);
  if (metric.key === 'UTILIZATION' && typeof value === 'number') return `${value} FH`;
  if (
    typeof value === 'number' &&
    ['COMPLETION', 'OTP', 'AVAILABILITY', 'DISPATCH_RELIABILITY'].includes(metric.key)
  )
    return `${value}%`;
  return value;
}
function metricPreviousLabel(metric: DashboardDeltaMetric) {
  if (
    metric.dataState === 'NO_DATA' ||
    metric.previousValue === null ||
    metric.previousValue === undefined
  )
    return null;
  return `Previous period: ${metricComparableValue(metric, metric.previousValue)}`;
}
function metricDeltaLabel(metric: DashboardDeltaMetric) {
  if (metric.comparisonValue === null || metric.comparisonValue === undefined)
    return 'No comparison baseline';
  if (metric.comparisonValue === 0) return 'Unchanged vs previous period';
  const unit =
    metric.comparisonUnit === 'PERCENTAGE_POINT'
      ? ' pp'
      : metric.comparisonUnit === 'ABSOLUTE'
        ? ''
        : '%';
  const direction = metric.comparisonValue > 0 ? 'increased' : 'decreased';
  return `${direction} ${Math.abs(metric.comparisonValue)}${unit} vs previous period`;
}
function metricDeltaTone(metric: DashboardDeltaMetric): AviationDashboardTone {
  if (
    metric.comparisonValue === null ||
    metric.comparisonValue === undefined ||
    metric.direction === 'FLAT'
  )
    return 'neutral';
  return metric.direction === metric.favorableDirection ? 'success' : 'danger';
}
function metricStateTone(metric: DashboardDeltaMetric): AviationDashboardTone {
  if (metric.dataState === 'NO_DATA') return 'neutral';
  if (metric.dataState === 'STALE') return 'warning';
  if (metric.dataState === 'DISCONNECTED') return 'danger';
  return metric.tone;
}
function metricStateLabel(metric: DashboardDeltaMetric) {
  if (metric.dataState === 'NO_DATA') return 'NO DATA';
  if (metric.dataState === 'STALE') return 'STALE DATA';
  if (metric.dataState === 'DISCONNECTED') return 'DISCONNECTED';
  return metric.tone === 'danger'
    ? 'REQUIRES ATTENTION'
    : metric.tone === 'warning'
      ? 'REVIEW'
      : 'CURRENT';
}
function toneColor(tone: AviationDashboardTone) {
  return tone === 'neutral' ? 'secondary' : tone;
}
function toneIcon(tone: AviationDashboardTone) {
  return tone === 'danger'
    ? 'mdi-alert-circle'
    : tone === 'warning'
      ? 'mdi-alert'
      : tone === 'success'
        ? 'mdi-check-circle'
        : 'mdi-information';
}
function shortDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00Z`));
}
function formatMinutes(value: number | null | undefined) {
  return value === null || value === undefined ? 'No data' : `${value} min`;
}
</script>

<template>
  <div class="management-dashboard">
    <section class="management-context" aria-label="Management reporting context">
      <VIcon color="info" icon="mdi-calendar-range" size="21" />
      <strong>{{ shortDate(data.meta.dateFrom) }} – {{ shortDate(data.meta.dateTo) }}</strong>
      <span>{{ data.meta.stationLabel }}</span><span>{{
        data.meta.operationType === 'ALL' ? 'All operations' : data.meta.operationType
      }}</span>
      <DashboardStateBadge
        v-if="data.meta.comparisonDateFrom"
        compact
        icon="mdi-compare"
        :label="`Compared with ${shortDate(data.meta.comparisonDateFrom)} – ${shortDate(data.meta.comparisonDateTo!)}`"
        tone="info"
      />
      <DashboardStateBadge
        v-else
        compact
        icon="mdi-compare-off"
        label="No comparison period"
        tone="neutral"
      />
    </section>

    <div v-if="sections.managementMetrics" class="metric-groups">
      <VCard v-for="group in visibleGroups" :key="group.key" border class="panel-card metric-group">
        <div class="panel-heading">
          <VIcon color="primary" :icon="group.icon" size="23" />
          <div>
            <h2>{{ group.label }}</h2>
            <p>Current result, comparison baseline, and status</p>
          </div>
        </div>
        <div class="metric-grid">
          <NuxtLink
            v-for="metric in group.metrics"
            :key="metric.key"
            class="management-metric"
            :class="`management-metric--${metric.tone}`"
            :to="metric.href || undefined"
            :title="metric.detail"
          >
            <div class="management-metric__value">
              <strong>{{ metricValue(metric) }}</strong><DashboardStateBadge
                compact
                :icon="toneIcon(metricStateTone(metric))"
                :label="metricStateLabel(metric)"
                :tone="metricStateTone(metric)"
              />
            </div>
            <span>{{ metric.label }}</span>
            <small :class="`text-${toneColor(metricDeltaTone(metric))}`">{{
              metricDeltaLabel(metric)
            }}</small>
            <small v-if="metricPreviousLabel(metric)" class="management-metric__baseline">{{
              metricPreviousLabel(metric)
            }}</small>
            <em
              v-if="metric.target"
              :class="metric.target.status === 'MET' ? 'text-success' : 'text-danger'"
            >{{ metric.target.label }} ·
              {{ metric.target.status === 'MET' ? 'On target' : 'Below target' }}</em>
          </NuxtLink>
        </div>
      </VCard>
    </div>

    <VCard v-if="sections.safetyInsights" border class="panel-card insights-card">
      <div class="panel-heading">
        <VIcon color="primary" icon="mdi-lightbulb-on-outline" size="23" />
        <div>
          <h2>Key Insights</h2>
          <p>Data-derived changes and conditions requiring review</p>
        </div>
      </div>
      <div v-if="data.insights.length" class="insight-grid">
        <NuxtLink
          v-for="item in data.insights"
          :key="item.id"
          :to="item.href || undefined"
          :class="`insight--${item.tone}`"
        >
          <VIcon :color="toneColor(item.tone)" :icon="toneIcon(item.tone)" size="21" />
          <div>
            <span>{{ item.message }}</span><small>{{ shortDate(item.date) }}</small>
          </div>
          <strong>{{ item.actionLabel ?? 'Review insight' }}<VIcon icon="mdi-arrow-right" size="16" /></strong>
        </NuxtLink>
      </div>
      <div v-else class="panel-empty">
        <VIcon icon="mdi-chart-box-outline" />
        <div>
          <strong>No comparison insight available</strong><span>Select a period with a valid baseline to identify changes.</span>
        </div>
      </div>
    </VCard>

    <div class="analytics-grid">
      <VCard v-if="sections.managementCharts" border class="panel-card chart-card">
        <div class="panel-heading">
          <VIcon color="primary" icon="mdi-airplane" size="22" />
          <div>
            <h2>Flight Completion & OTP Trend</h2>
            <p>Operational volume, completion, exceptions, and punctuality</p>
          </div>
        </div>
        <FeatureApexChart
          v-if="operationalTrendAvailable"
          height="300"
          :options="completionOptions"
          :series="completionSeries"
          type="line"
        />
        <div v-else class="panel-empty">
          <VIcon icon="mdi-chart-timeline-variant-shimmer" />
          <div>
            <strong>Insufficient operational history</strong><span>At least two operating days are required to show a trend.</span>
          </div>
        </div>
      </VCard>
      <VCard v-if="sections.managementCharts" border class="panel-card chart-card">
        <div class="panel-heading">
          <VIcon color="primary" icon="mdi-chart-areaspline" size="22" />
          <div>
            <h2>Revenue & Cost Trend</h2>
            <p>Recognized finance snapshots for the selected period</p>
          </div>
        </div>
        <FeatureApexChart
          v-if="financeTrendAvailable"
          height="300"
          :options="financeOptions"
          :series="financeSeries"
          type="line"
        />
        <div v-else class="panel-empty">
          <VIcon icon="mdi-database-off-outline" />
          <div>
            <strong>{{
              data.isMixedCurrency ? 'Combined trend unavailable' : 'Insufficient financial history'
            }}</strong><span>{{
              data.isMixedCurrency
                ? 'The selected period contains multiple currencies and cannot be combined safely.'
                : 'At least two dated finance snapshots are required.'
            }}</span>
          </div>
        </div>
      </VCard>
      <VCard v-if="sections.managementCharts" border class="panel-card revenue-card">
        <div class="panel-heading">
          <VIcon color="primary" icon="mdi-chart-bar" size="22" />
          <div>
            <h2>Revenue Composition</h2>
            <p>Recognized revenue by operating source</p>
          </div>
        </div>
        <div v-if="data.revenueComposition.length" class="revenue-bars">
          <div v-for="point in data.revenueComposition" :key="point.key">
            <span>{{ point.label }}</span><strong>{{ money(point.value) }}</strong><i><b
              :style="{
                width: `${totalRevenue ? (point.value / totalRevenue) * 100 : 0}%`
              }"
            /></i><small>{{ totalRevenue ? Math.round((point.value / totalRevenue) * 100) : 0 }}%</small>
          </div>
        </div>
        <div v-else class="panel-empty">
          <VIcon icon="mdi-database-off-outline" />
          <div>
            <strong>{{
              data.isMixedCurrency
                ? 'Composition unavailable across currencies'
                : 'No recognized revenue data'
            }}</strong><span>No financial amount has been substituted with zero.</span>
          </div>
        </div>
      </VCard>

      <VCard v-if="sections.managementTables" border class="panel-card table-card">
        <div class="panel-heading">
          <VIcon color="primary" icon="mdi-vector-polyline" size="22" />
          <div>
            <h2>Route Performance</h2>
            <p>Neutral comparison; no ranking is implied for small samples</p>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Flights</th>
                <th>Completion</th>
                <th>OTP</th>
                <th>Avg delay</th>
                <th>Revenue</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in data.routes" :key="row.route">
                <td>
                  <NuxtLink :to="row.href">
                    <strong>{{ row.route }}</strong>
                  </NuxtLink>
                </td>
                <td>{{ row.flights }}</td>
                <td>
                  {{ row.completionPercent === null ? 'No data' : `${row.completionPercent}%` }}
                </td>
                <td>{{ row.onTimePercent === null ? 'No data' : `${row.onTimePercent}%` }}</td>
                <td>{{ formatMinutes(row.averageDelayMinutes) }}</td>
                <td>{{ row.financialDataAvailable ? money(row.revenue) : 'Data unavailable' }}</td>
                <td>
                  <DashboardStateBadge
                    compact
                    :icon="row.operationalIssues ? 'mdi-alert' : 'mdi-check-circle'"
                    :label="row.operationalIssues ? `${row.operationalIssues}` : 'Clear'"
                    :tone="row.operationalIssues ? 'warning' : 'success'"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCard>

      <VCard v-if="sections.managementTables" border class="panel-card table-card">
        <div class="panel-heading">
          <VIcon color="primary" icon="mdi-airplane-clock" size="22" />
          <div>
            <h2>Aircraft Utilization</h2>
            <p>Actual flight hours with current technical context</p>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Aircraft</th>
                <th>Type</th>
                <th>Flights</th>
                <th>Actual FH</th>
                <th>Availability</th>
                <th>Relative utilization</th>
                <th>Technical state</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in data.aircraftUtilization" :key="row.registration">
                <td>
                  <NuxtLink :to="row.href">
                    <strong>{{ row.registration }}</strong>
                  </NuxtLink>
                </td>
                <td>{{ row.type }}</td>
                <td>{{ row.flights }}</td>
                <td>{{ row.blockHours }} FH</td>
                <td>
                  {{
                    row.availabilityPercent === null || row.availabilityPercent === undefined
                      ? 'No data'
                      : `${row.availabilityPercent}%`
                  }}
                </td>
                <td>
                  <div class="util-cell">
                    <i><b :style="{ width: `${row.relativeUtilizationPercent}%` }" /></i><small v-if="row.blockHours === 0">{{
                      row.technicalState === 'AOG' ? '0 FH · AOG' : '0 FH recorded'
                    }}</small>
                  </div>
                </td>
                <td>
                  <DashboardStateBadge
                    compact
                    :icon="
                      toneIcon(
                        row.technicalState === 'AOG'
                          ? 'danger'
                          : row.technicalState === 'Limited'
                            ? 'warning'
                            : 'success'
                      )
                    "
                    :label="row.technicalState ?? 'No data'"
                    :tone="
                      row.technicalState === 'AOG'
                        ? 'danger'
                        : row.technicalState === 'Limited'
                          ? 'warning'
                          : row.technicalState
                            ? 'success'
                            : 'neutral'
                    "
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCard>

      <VCard v-if="sections.managementTables" border class="panel-card table-card station-table">
        <div class="panel-heading">
          <VIcon color="primary" icon="mdi-airport" size="22" />
          <div>
            <h2>Station Performance</h2>
            <p>Operational outcome and exception load by station</p>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Station</th>
                <th>Flights</th>
                <th>Completion</th>
                <th>OTP</th>
                <th>Avg turnaround</th>
                <th>Operational attention</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in data.stations.slice(0, 8)" :key="row.id">
                <td>
                  <NuxtLink :to="row.href">
                    <strong>{{ row.code }}</strong>
                  </NuxtLink>
                </td>
                <td>{{ row.flights }}</td>
                <td>
                  {{ row.completionPercent === null ? 'No data' : `${row.completionPercent}%` }}
                </td>
                <td>
                  {{
                    row.onTimePercent === null || row.onTimePercent === undefined
                      ? 'No data'
                      : `${row.onTimePercent}%`
                  }}
                </td>
                <td>{{ formatMinutes(row.averageTurnaroundMinutes) }}</td>
                <td>
                  <DashboardStateBadge
                    compact
                    :icon="row.issues ? 'mdi-alert' : 'mdi-check-circle'"
                    :label="row.issues ? `${row.issues} issues` : 'Clear'"
                    :tone="row.issues ? 'warning' : 'success'"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCard>
    </div>
  </div>
</template>

<style scoped>
.management-dashboard {
  display: grid;
  gap: 16px;
  min-width: 0;
  font-size: 0.875rem;
}
.management-context {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  padding: 8px 14px;
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}
.management-context > span {
  padding-left: 10px;
  border-left: 1px solid rgb(var(--v-theme-border-default));
  color: rgb(var(--v-theme-text-secondary));
}
.management-context > .v-chip {
  margin-left: auto;
}
.metric-groups,
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
  min-width: 0;
}
.metric-group {
  grid-column: span 6;
}
.panel-card {
  overflow: hidden;
  border-color: rgb(var(--v-theme-border-default));
  box-shadow: 0 2px 8px rgba(8, 43, 73, 0.035);
}
.panel-heading {
  display: flex;
  min-height: 64px;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
}
.panel-heading h2 {
  color: rgb(var(--v-theme-primary));
  font-size: 1.0625rem;
  font-weight: 750;
  line-height: 1.25;
}
.panel-heading p {
  margin-top: 3px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.8125rem;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}
.management-metric {
  min-width: 0;
  min-height: 132px;
  padding: 15px 16px;
  border-right: 1px solid rgb(var(--v-theme-border-default));
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  color: inherit;
  text-decoration: none;
}
.management-metric:nth-child(even) {
  border-right: 0;
}
.management-metric__value {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.management-metric strong {
  display: block;
  overflow: hidden;
  color: rgb(var(--v-theme-primary));
  font-size: 1.25rem;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.management-metric > span {
  display: block;
  margin-top: 7px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.8125rem;
  font-weight: 650;
}
.management-metric > small {
  display: block;
  margin-top: 8px;
  font-size: 0.75rem;
  font-weight: 700;
}
.management-metric > .management-metric__baseline {
  margin-top: 3px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.7rem;
  font-weight: 600;
}
.management-metric > em {
  display: block;
  margin-top: 5px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.72rem;
  font-style: normal;
}
.management-metric--danger {
  box-shadow: inset 3px 0 rgb(var(--v-theme-danger));
  background: rgba(var(--v-theme-danger), 0.025);
}
.management-metric--warning {
  box-shadow: inset 3px 0 rgb(var(--v-theme-warning));
}
.insight-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}
.insight-grid a {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 90px;
  padding: 14px 16px;
  border-right: 1px solid rgb(var(--v-theme-border-default));
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  color: inherit;
  text-decoration: none;
}
.insight-grid a:nth-child(even) {
  border-right: 0;
}
.insight-grid a > div {
  display: grid;
  gap: 4px;
}
.insight-grid span {
  line-height: 1.4;
}
.insight-grid small {
  color: rgb(var(--v-theme-text-secondary));
}
.insight-grid a > strong {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgb(var(--v-theme-info));
  font-size: 0.75rem;
  white-space: nowrap;
}
.insight--danger {
  box-shadow: inset 4px 0 rgb(var(--v-theme-danger));
}
.insight--warning {
  box-shadow: inset 4px 0 rgb(var(--v-theme-warning));
}
.chart-card,
.table-card {
  grid-column: span 6;
}
.revenue-card,
.station-table {
  grid-column: 1 / -1;
}
.chart-card :deep(.apexcharts-canvas) {
  margin: 0 auto;
}
.revenue-bars {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  padding: 18px;
}
.revenue-bars > div {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 7px 12px;
}
.revenue-bars span {
  color: rgb(var(--v-theme-text-secondary));
  font-weight: 650;
}
.revenue-bars i {
  grid-column: 1 / -1;
  height: 9px;
  overflow: hidden;
  border-radius: 9px;
  background: rgba(var(--v-theme-info), 0.09);
}
.revenue-bars b {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: rgb(var(--v-theme-success));
}
.revenue-bars small {
  grid-column: 2;
  color: rgb(var(--v-theme-text-secondary));
}
.table-scroll {
  overflow-x: auto;
}
.table-card table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 0.8125rem;
}
.table-card th,
.table-card td {
  height: 46px;
  padding: 9px 12px;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  text-align: left;
  white-space: nowrap;
}
.table-card th {
  background: rgba(var(--v-theme-primary), 0.035);
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  font-weight: 700;
}
.table-card tbody tr:hover {
  background: rgba(var(--v-theme-info), 0.04);
}
.table-card a {
  color: rgb(var(--v-theme-info));
  text-decoration: none;
}
.util-cell {
  display: grid;
  gap: 3px;
}
.util-cell i {
  display: block;
  width: 110px;
  height: 9px;
  overflow: hidden;
  border-radius: 6px;
  background: rgba(var(--v-theme-info), 0.09);
}
.util-cell b {
  display: block;
  height: 100%;
  background: rgb(var(--v-theme-success));
}
.util-cell small {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.7rem;
}
.panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 11px;
  min-height: 112px;
  padding: 20px;
  color: rgb(var(--v-theme-text-secondary));
}
.panel-empty > div {
  display: grid;
  gap: 3px;
}
.panel-empty strong {
  color: rgb(var(--v-theme-text-primary));
}
.panel-empty span {
  font-size: 0.8125rem;
}
:deep(.v-chip.v-chip--size-x-small) {
  min-height: 26px;
  padding-inline: 8px;
  font-size: 0.8125rem;
}
a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-info));
  outline-offset: -2px;
}
@media (max-width: 959px) {
  .metric-group,
  .chart-card,
  .table-card {
    grid-column: 1 / -1;
  }
  .management-context > .v-chip {
    margin-left: 0;
  }
  .revenue-bars {
    grid-template-columns: 1fr;
  }
  .insight-grid {
    grid-template-columns: 1fr;
  }
  .insight-grid a {
    border-right: 0;
  }
}
@media (max-width: 599px) {
  .management-dashboard,
  .metric-groups,
  .analytics-grid {
    gap: 12px;
  }
  .management-context > span {
    width: 100%;
    padding: 0;
    border-left: 0;
  }
  .metric-grid {
    grid-template-columns: 1fr;
  }
  .management-metric {
    min-height: 120px;
    border-right: 0;
  }
  .insight-grid a {
    grid-template-columns: auto 1fr;
  }
  .insight-grid a > strong {
    grid-column: 2;
  }
  .revenue-bars {
    padding: 14px;
  }
}
</style>
