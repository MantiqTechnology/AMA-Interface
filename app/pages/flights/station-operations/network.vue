<script setup lang="ts">
import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import type {
  DashboardMetric,
  StationNetworkAttention,
  StationNetworkDashboardDto
} from '#shared/contracts/operational-dashboards';
import { AMA_THEME_HEX } from '../../../constants/themeColors';
import {
  formatLastUpdated,
  money
} from '../../../features/station-operations/utils/stationOperationsFormatters';

useHead({ title: 'Network Dashboard - PT AMA' });

const { period, anchorDate, query, periodOptions } = useOperationalDashboardFilters();
const activeTab = ref<'overview' | 'performance' | 'financial'>('overview');
const {
  data: dashboard,
  pending,
  error,
  refresh
} = await useAsyncData(
  'station-network-dashboard',
  () =>
    fetchApi<StationNetworkDashboardDto>('/api/flight-operations/station-network-dashboard', {
      query: query.value
    }),
  { watch: [query] }
);

const activityEmpty = computed(() =>
  (dashboard.value?.performance.activity ?? []).every((series) =>
    series.points.every((point) => point.value === 0)
  )
);
const hasForeignCostExposure = computed(() =>
  (dashboard.value?.financial.pendingCostExposureByCurrency ?? []).some(
    (item) => !item.includedInIdrTotal
  )
);
const activitySeries = computed<ApexAxisChartSeries>(() =>
  (dashboard.value?.performance.activity ?? []).map((series) => ({
    name: series.label,
    data: series.points.map((point) => point.value)
  }))
);
const activityOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: [AMA_THEME_HEX.info, AMA_THEME_HEX.secondary, AMA_THEME_HEX.success],
  dataLabels: { enabled: false },
  grid: { borderColor: '#E6ECF2', strokeDashArray: 3 },
  legend: { position: 'top', horizontalAlign: 'left' },
  markers: { size: 4, strokeWidth: 0 },
  stroke: { curve: 'smooth', width: [2, 3, 3] },
  xaxis: {
    categories:
      dashboard.value?.performance.activity[0]?.points.map((point) =>
        new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(
          new Date(`${point.label}T12:00:00`)
        )
      ) ?? []
  },
  yaxis: { min: 0, forceNiceScale: true }
}));
const riskSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Flight berisiko',
    data: (dashboard.value?.performance.stations ?? [])
      .filter((station) => station.flightsAtRisk > 0)
      .slice(0, 8)
      .map((station) => station.flightsAtRisk)
  }
]);
const riskOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: [AMA_THEME_HEX.danger],
  dataLabels: { enabled: true },
  plotOptions: { bar: { borderRadius: 4, horizontal: true } },
  xaxis: {
    categories: (dashboard.value?.performance.stations ?? [])
      .filter((station) => station.flightsAtRisk > 0)
      .slice(0, 8)
      .map((station) => station.stationCode)
  }
}));
const financialSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Margin posted',
    data: (dashboard.value?.financial.stations ?? [])
      .slice(0, 8)
      .map((station) => station.marginMinor)
  }
]);
const financialOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: [AMA_THEME_HEX.secondary],
  dataLabels: { enabled: false },
  grid: { borderColor: '#E6ECF2', strokeDashArray: 3 },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '52%' } },
  xaxis: {
    categories: (dashboard.value?.financial.stations ?? [])
      .slice(0, 8)
      .map((station) => station.stationCode)
  },
  yaxis: { labels: { formatter: (value) => compactMoney(value) } }
}));

// Demo-only visual micro-data. Core values remain sourced from station-network-dashboard API.
const metricSparklineSeeds: Record<string, number[]> = {
  TOTAL_FLIGHTS: [2, 3, 6, 4, 3, 4, 8, 4, 7, 7],
  ON_TIME_PERFORMANCE: [3, 4, 8, 6, 7, 4, 4, 10, 5, 8, 9],
  FLIGHTS_AT_RISK: [2, 3, 5, 3, 4, 4, 8, 3, 5, 6],
  PENDING_VERIFICATION: [2, 3, 3, 5, 3, 2, 7, 3, 4, 4],
  PENDING_SERVICES: [1, 2, 1, 3, 1, 4, 2, 3, 1, 2],
  POSTED_MARGIN: [1, 2, 1, 3, 1, 3, 3, 1, 2, 1]
};

const metricColorByTone: Record<DashboardMetric['tone'], string> = {
  neutral: '#2F7DF6',
  success: '#2AA66A',
  warning: '#F59E25',
  danger: '#E5534B'
};

const generatedAtLabel = computed(() =>
  formatLastUpdated(dashboard.value ? new Date(dashboard.value.meta.generatedAt) : null)
);
const coverageCards = computed(() => {
  if (!dashboard.value) return [];
  return [
    {
      key: 'active-stations',
      label: 'Station aktif',
      value: dashboard.value.performance.stations.length,
      detail: 'Dari total jaringan',
      icon: 'mdi-office-building-outline',
      tone: 'blue'
    },
    {
      key: 'pending-exposure',
      label: 'Exposure pending',
      value: money(dashboard.value.financial.pendingCostExposureMinor),
      detail: 'Total komitmen belum posted',
      icon: 'mdi-database-clock-outline',
      tone: 'green'
    },
    {
      key: 'posted-revenue',
      label: 'Revenue posted',
      value: money(dashboard.value.financial.actual.revenueMinor),
      detail: 'Nilai journal posted',
      icon: 'mdi-file-chart-outline',
      tone: 'purple'
    },
    {
      key: 'posted-margin',
      label: 'Margin posted',
      value: money(dashboard.value.financial.actual.marginMinor),
      detail: 'Dari journal posted',
      icon: 'mdi-chart-line-variant',
      tone: 'red'
    }
  ];
});

function compactMoney(value: number) {
  return new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function performanceTone(value: number | null) {
  if (value === null) return 'text-text-secondary';
  if (value >= 85) return 'text-success';
  if (value >= 70) return 'text-warning';
  return 'text-error';
}

function metricToneClass(tone: DashboardMetric['tone']) {
  return `network-metric--${tone}`;
}

function sparklineColor(metric: DashboardMetric) {
  return metricColorByTone[metric.tone] ?? metricColorByTone.neutral;
}

function sparklinePath(metric: DashboardMetric) {
  const values = metricSparklineSeeds[metric.key] ?? [2, 3, 2, 4, 3, 5, 4, 6];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const width = 116;
  const height = 34;
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function severityClass(severity: StationNetworkAttention['severity']) {
  if (severity === 'critical') return 'network-priority--critical';
  if (severity === 'warning') return 'network-priority--warning';
  return 'network-priority--info';
}

function severityLabel(severity: StationNetworkAttention['severity']) {
  if (severity === 'critical') return 'Kritis';
  if (severity === 'warning') return 'Tinggi';
  return 'Info';
}
</script>

<template>
  <VContainer class="network-dashboard" fluid>
    <section class="network-hero">
      <div class="network-hero__identity">
        <div class="network-hero__mark" aria-hidden="true">
          <VIcon icon="mdi-earth" size="56" />
          <VIcon class="network-hero__plane" icon="mdi-airplane" size="24" />
        </div>
        <div>
          <p class="network-eyebrow">Station Operations · Executive View</p>
          <h1>Network Dashboard</h1>
          <p class="network-hero__description">
            Ringkasan kesehatan operasi, performa station, dan actual finansial posted untuk seluruh
            jaringan station.
          </p>
        </div>
      </div>

      <div class="network-hero__controls">
        <div class="network-dashboard__filters">
          <VSelect
            v-model="period"
            density="comfortable"
            hide-details
            :items="periodOptions"
            label="Periode"
            variant="outlined"
          />
          <VTextField
            v-model="anchorDate"
            density="comfortable"
            hide-details
            label="Tanggal acuan"
            type="date"
            variant="outlined"
          />
        </div>
        <div class="network-hero__actions">
          <VBtn
            class="network-refresh"
            prepend-icon="mdi-refresh"
            :loading="pending"
            text="Perbarui"
            variant="tonal"
            @click="refresh"
          />
          <span class="network-updated">
            <VIcon icon="mdi-clock-outline" size="15" />
            {{ generatedAtLabel }}
          </span>
        </div>
      </div>
    </section>

    <VAlert
      v-if="error"
      class="mb-4"
      color="error"
      title="Network dashboard tidak tersedia"
      variant="tonal"
    >
      {{ error.message }}
    </VAlert>

    <template v-else-if="pending && !dashboard">
      <section class="network-metric-grid mb-4" aria-label="Loading station network metrics">
        <VCard v-for="item in 6" :key="item" border class="pa-4" rounded="lg">
          <VSkeletonLoader type="list-item-two-line" />
        </VCard>
      </section>
      <VCard border class="pa-4" rounded="lg"><VSkeletonLoader type="article" /></VCard>
    </template>

    <template v-else-if="dashboard">
      <section class="network-metric-grid" aria-label="Station network metrics">
        <NuxtLink
          v-for="metric in dashboard.metrics"
          :key="metric.key"
          class="network-metric"
          :class="metricToneClass(metric.tone)"
          :to="metric.href"
        >
          <div class="network-metric__top">
            <span class="network-metric__icon">
              <VIcon :icon="metric.icon" size="28" />
            </span>
            <div class="network-metric__copy">
              <p>{{ metric.label }}</p>
              <strong>{{ metric.value }}</strong>
            </div>
          </div>
          <p class="network-metric__detail">{{ metric.detail }}</p>
          <svg class="network-metric__sparkline" viewBox="0 0 116 36" aria-hidden="true">
            <path
              :d="sparklinePath(metric)"
              fill="none"
              :stroke="sparklineColor(metric)"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.4"
            />
          </svg>
        </NuxtLink>
      </section>

      <VCard border class="network-tabs-card" rounded="lg">
        <VTabs v-model="activeTab" class="network-tabs" color="primary" show-arrows>
          <VTab value="overview"><VIcon icon="mdi-view-dashboard-outline" start />Overview</VTab>
          <VTab value="performance"><VIcon icon="mdi-chart-line" start />Performance</VTab>
          <VTab value="financial"><VIcon icon="mdi-cash-multiple" start />Financial</VTab>
        </VTabs>
        <VDivider />

        <VWindow v-model="activeTab">
          <VWindowItem value="overview">
            <div class="network-overview-grid">
              <section class="network-panel network-priority-panel">
                <div class="network-panel__heading">
                  <h2>Prioritas network</h2>
                  <p>
                    Station diurutkan menurut flight berisiko dan pekerjaan station yang masih
                    terbuka.
                  </p>
                </div>

                <div v-if="dashboard.overview.attention.length" class="network-priority-list">
                  <NuxtLink
                    v-for="item in dashboard.overview.attention"
                    :key="item.id"
                    class="network-priority"
                    :class="severityClass(item.severity)"
                    :to="item.href"
                  >
                    <span class="network-priority__icon">
                      <VIcon
                        :icon="
                          item.severity === 'critical'
                            ? 'mdi-alert-octagon-outline'
                            : 'mdi-alert-outline'
                        "
                        size="20"
                      />
                    </span>
                    <strong class="network-priority__code">{{ item.stationCode }}</strong>
                    <span class="network-priority__copy">
                      <strong>{{ item.title }}</strong>
                      <small>{{ item.detail }}</small>
                    </span>
                    <span class="network-priority__badge">{{ severityLabel(item.severity) }}</span>
                    <VIcon icon="mdi-chevron-right" size="21" />
                  </NuxtLink>
                </div>
                <VAlert v-else class="mx-4 mb-4" color="success" variant="tonal">
                  Tidak ada station yang memerlukan perhatian pada periode ini.
                </VAlert>

                <div class="network-priority-footer">
                  <span>Data diperoleh dari record kanonis</span>
                  <VBtn
                    append-icon="mdi-open-in-new"
                    color="primary"
                    size="small"
                    to="/flights/station-operations"
                    variant="text"
                  >
                    Lihat semua station
                  </VBtn>
                </div>
              </section>

              <section class="network-panel network-coverage-panel">
                <div class="network-panel__heading">
                  <h2>Cakupan dan data</h2>
                  <p>
                    Seluruh station aktif dalam jaringan. Actual finansial hanya memakai jurnal
                    posted.
                  </p>
                </div>

                <div class="network-coverage-grid">
                  <div
                    v-for="card in coverageCards"
                    :key="card.key"
                    class="network-summary"
                    :class="`network-summary--${card.tone}`"
                  >
                    <span class="network-summary__icon">
                      <VIcon :icon="card.icon" size="25" />
                    </span>
                    <span>
                      <p>{{ card.label }}</p>
                      <strong>{{ card.value }}</strong>
                      <small>{{ card.detail }}</small>
                    </span>
                  </div>
                </div>

                <VAlert
                  class="network-finance-note"
                  color="primary"
                  density="comfortable"
                  icon="mdi-information"
                  variant="tonal"
                >
                  Actual finansial hanya berdasarkan jurnal posted.
                  <span v-if="hasForeignCostExposure">
                    Mata uang non-IDR ditampilkan terpisah dan belum dikonversi.
                  </span>
                </VAlert>
              </section>
            </div>
          </VWindowItem>

          <VWindowItem value="performance">
            <div class="network-secondary-grid">
              <DashboardOperationalChartCard
                class="network-chart-card network-chart-card--wide"
                :empty="activityEmpty"
                :source="{ label: 'Flight Operations', href: '/flights' }"
                title="Trend operasi network"
                description="Flight direncanakan, sudah berangkat, dan closed menurut tanggal operasi."
              >
                <FeatureApexChart :options="activityOptions" :series="activitySeries" type="line" />
              </DashboardOperationalChartCard>
              <DashboardOperationalChartCard
                class="network-chart-card"
                :empty="riskSeries[0].data.length === 0"
                empty-text="Tidak ada flight berisiko pada periode ini."
                :source="{ label: 'Flight Control', href: '/flights/dashboard' }"
                title="Station dengan flight berisiko"
                description="Flight blocked, readiness belum lengkap, atau pending closure."
              >
                <FeatureApexChart :options="riskOptions" :series="riskSeries" type="bar" />
              </DashboardOperationalChartCard>
            </div>

            <div class="network-table-wrap">
              <VTable density="comfortable" hover>
                <thead>
                  <tr>
                    <th>Station</th>
                    <th class="text-right">Flight</th>
                    <th class="text-right">OTP</th>
                    <th class="text-right">Berisiko</th>
                    <th class="text-right">Verifikasi</th>
                    <th class="text-right">Layanan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="station in dashboard.performance.stations"
                    :key="station.stationId"
                    class="cursor-pointer"
                    @click="navigateTo(station.href)"
                  >
                    <td>
                      <strong>{{ station.stationCode }}</strong>
                      <div class="text-caption text-text-secondary">{{ station.stationName }}</div>
                    </td>
                    <td class="text-right">{{ station.flights }}</td>
                    <td class="text-right" :class="performanceTone(station.onTimePercent)">
                      {{ station.onTimePercent === null ? '-' : `${station.onTimePercent}%` }}
                    </td>
                    <td class="text-right">{{ station.flightsAtRisk }}</td>
                    <td class="text-right">{{ station.pendingVerification }}</td>
                    <td class="text-right">{{ station.pendingServices }}</td>
                  </tr>
                </tbody>
              </VTable>
            </div>
          </VWindowItem>

          <VWindowItem value="financial">
            <div class="network-secondary-grid">
              <VCard border class="network-actual-card" rounded="lg">
                <h2>Actual posted</h2>
                <p>Basis: posted GL dimensions · IDR</p>
                <dl class="network-dashboard__financial-summary">
                  <div>
                    <dt>Revenue</dt>
                    <dd>{{ money(dashboard.financial.actual.revenueMinor) }}</dd>
                  </div>
                  <div>
                    <dt>Cost</dt>
                    <dd>{{ money(dashboard.financial.actual.costMinor) }}</dd>
                  </div>
                  <div>
                    <dt>Margin</dt>
                    <dd>{{ money(dashboard.financial.actual.marginMinor) }}</dd>
                  </div>
                  <div>
                    <dt>Margin rate</dt>
                    <dd>
                      {{
                        dashboard.financial.actual.marginPercent === null
                          ? '-'
                          : `${dashboard.financial.actual.marginPercent}%`
                      }}
                    </dd>
                  </div>
                </dl>
                <VAlert
                  class="mt-4"
                  color="warning"
                  density="compact"
                  icon="mdi-cash-clock"
                  variant="tonal"
                >
                  {{ money(dashboard.financial.pendingCostExposureMinor) }} biaya station IDR masih
                  draft/submitted dan belum masuk actual.
                </VAlert>
              </VCard>
              <DashboardOperationalChartCard
                class="network-chart-card network-chart-card--wide"
                :empty="financialSeries[0].data.length === 0"
                :source="{ label: 'HPP & Margin', href: '/finance/hpp' }"
                title="Margin posted per station"
                description="Kontribusi margin berdasarkan jurnal posted yang telah memiliki dimensi flight dan station."
              >
                <FeatureApexChart
                  :options="financialOptions"
                  :series="financialSeries"
                  type="bar"
                />
              </DashboardOperationalChartCard>
            </div>

            <div class="network-table-wrap">
              <VTable density="comfortable" hover>
                <thead>
                  <tr>
                    <th>Station</th>
                    <th class="text-right">Revenue</th>
                    <th class="text-right">Cost</th>
                    <th class="text-right">Margin</th>
                    <th class="text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="station in dashboard.financial.stations"
                    :key="station.stationId"
                    class="cursor-pointer"
                    @click="navigateTo(station.href)"
                  >
                    <td>
                      <strong>{{ station.stationCode }}</strong>
                      <div class="text-caption text-text-secondary">{{ station.stationName }}</div>
                    </td>
                    <td class="text-right">{{ money(station.revenueMinor) }}</td>
                    <td class="text-right">{{ money(station.costMinor) }}</td>
                    <td class="text-right">{{ money(station.marginMinor) }}</td>
                    <td class="text-right" :class="performanceTone(station.marginPercent)">
                      {{ station.marginPercent === null ? '-' : `${station.marginPercent}%` }}
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
          </VWindowItem>
        </VWindow>
      </VCard>
    </template>
  </VContainer>
</template>

<style scoped>
.network-dashboard {
  min-width: 0;
  padding: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(247, 249, 250, 0.96) 320px), #f7f9fa;
  color: #0d1d35;
}

.network-hero,
.network-metric,
.network-tabs-card,
.network-panel,
.network-actual-card {
  border: 1px solid #dce5ef !important;
  background: #ffffff !important;
  box-shadow: 0 10px 26px rgba(10, 31, 68, 0.055);
}

.network-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.42fr);
  gap: 22px;
  margin-bottom: 14px;
  padding: 24px;
  border-radius: 8px;
  border-left: 4px solid #1265c7 !important;
}

.network-hero__identity {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.network-hero__mark {
  position: relative;
  display: grid;
  width: 86px;
  height: 86px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #dce7f3;
  border-radius: 12px;
  background: linear-gradient(135deg, #edf5ff, #ffffff);
  color: #1265c7;
}

.network-hero__plane {
  position: absolute;
  top: 19px;
  right: 17px;
}

.network-eyebrow {
  margin: 0 0 7px;
  color: #0458b9;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.network-hero h1 {
  margin: 0;
  color: #07172e;
  font-size: 1.92rem;
  font-weight: 820;
  letter-spacing: 0;
  line-height: 1.13;
}

.network-hero__description {
  max-width: 620px;
  margin: 12px 0 0;
  color: #465771;
  font-size: 0.94rem;
  line-height: 1.65;
}

.network-hero__controls {
  display: grid;
  align-content: start;
  gap: 12px;
}

.network-dashboard__filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.34fr);
  gap: 12px;
}

.network-hero__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.network-refresh {
  min-width: 112px;
}

.network-updated {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #52647c;
  font-size: 0.76rem;
}

.network-metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.network-metric {
  display: grid;
  min-height: 144px;
  align-content: start;
  gap: 10px;
  padding: 16px;
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
}

.network-metric__top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.network-metric__icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
}

.network-metric__copy {
  min-width: 0;
}

.network-metric__copy p,
.network-metric__detail,
.network-panel__heading p,
.network-summary p,
.network-summary small,
.network-priority__copy small,
.network-priority-footer,
.network-actual-card p,
.network-dashboard__financial-summary dt {
  color: #56677e;
}

.network-metric__copy p,
.network-metric__detail {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.42;
}

.network-metric__copy p {
  color: #253047;
  font-weight: 740;
}

.network-metric__copy strong {
  display: block;
  margin-top: 4px;
  color: #07172e;
  font-size: 1.44rem;
  font-weight: 820;
  letter-spacing: 0;
  line-height: 1;
}

.network-metric__sparkline {
  width: min(116px, 100%);
  height: 36px;
  justify-self: end;
  margin-top: auto;
}

.network-metric--neutral .network-metric__icon {
  background: #edf5ff;
  color: #1265c7;
}

.network-metric--success .network-metric__icon {
  background: #e9f8f1;
  color: #20935a;
}

.network-metric--warning .network-metric__icon {
  background: #fff3e5;
  color: #ef8614;
}

.network-metric--danger .network-metric__icon {
  background: #fdeceb;
  color: #dc433b;
}

.network-tabs-card {
  overflow: hidden;
  border-radius: 8px !important;
}

.network-tabs {
  padding-inline: 8px;
}

.network-overview-grid,
.network-secondary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(360px, 0.88fr);
  gap: 16px;
  padding: 16px;
}

.network-secondary-grid {
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.8fr);
}

.network-chart-card--wide {
  min-width: 0;
}

.network-panel,
.network-actual-card {
  border-radius: 8px;
}

.network-panel__heading {
  padding: 20px 22px 14px;
}

.network-panel__heading h2,
.network-actual-card h2 {
  margin: 0;
  color: #111d34;
  font-size: 1.08rem;
  font-weight: 800;
  letter-spacing: 0;
}

.network-panel__heading p,
.network-actual-card p {
  margin: 8px 0 0;
  font-size: 0.88rem;
  line-height: 1.6;
}

.network-priority-list {
  position: relative;
  display: grid;
  padding: 0 18px 18px;
}

.network-priority-list::before {
  position: absolute;
  top: 0;
  bottom: 18px;
  left: 18px;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, #dc433b 0%, #dc433b 58%, #f3a321 58%, #f3a321 100%);
  content: '';
}

.network-priority {
  display: grid;
  grid-template-columns: 42px 48px minmax(0, 1fr) auto 24px;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 12px 12px 12px 18px;
  border: 1px solid #e3e9f0;
  border-bottom: 0;
  background: #ffffff;
  color: inherit;
  text-decoration: none;
}

.network-priority:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.network-priority:last-child {
  border-bottom: 1px solid #e3e9f0;
  border-bottom-right-radius: 8px;
  border-bottom-left-radius: 8px;
}

.network-priority__icon {
  z-index: 1;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
}

.network-priority--critical .network-priority__icon,
.network-priority--critical .network-priority__badge {
  background: #fdeceb;
  color: #d83a32;
}

.network-priority--warning .network-priority__icon,
.network-priority--warning .network-priority__badge {
  background: #fff3dd;
  color: #d98009;
}

.network-priority--info .network-priority__icon,
.network-priority--info .network-priority__badge {
  background: #edf5ff;
  color: #1265c7;
}

.network-priority__code,
.network-priority__copy strong {
  color: #111d34;
  font-size: 0.86rem;
  font-weight: 800;
}

.network-priority__copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.network-priority__copy strong,
.network-priority__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.network-priority__copy small {
  font-size: 0.8rem;
}

.network-priority__badge {
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.network-priority-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 22px 18px;
  border-top: 1px solid #e8eef4;
  font-size: 0.8rem;
}

.network-coverage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 8px 20px 16px;
}

.network-summary {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 12px;
  min-height: 118px;
  padding: 18px 16px;
  border: 1px solid #e0e7ef;
  border-radius: 8px;
}

.network-summary__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 10px;
}

.network-summary p,
.network-summary small {
  margin: 0;
  font-size: 0.78rem;
}

.network-summary strong {
  display: block;
  margin: 8px 0 12px;
  color: #07172e;
  font-size: 1.26rem;
  font-weight: 820;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.network-summary--blue .network-summary__icon {
  background: #edf5ff;
  color: #1265c7;
}

.network-summary--green .network-summary__icon {
  background: #e9f8f1;
  color: #20935a;
}

.network-summary--purple .network-summary__icon {
  background: #f0ebff;
  color: #7b4bd3;
}

.network-summary--red .network-summary__icon {
  background: #fdeceb;
  color: #dc433b;
}

.network-finance-note {
  margin: 0 20px 20px;
}

.network-table-wrap {
  overflow-x: auto;
  padding: 0 16px 16px;
}

.network-actual-card {
  padding: 20px;
}

.network-dashboard__financial-summary {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.network-dashboard__financial-summary div {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.network-dashboard__financial-summary dd {
  margin: 0;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1380px) {
  .network-metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .network-hero,
  .network-overview-grid,
  .network-secondary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .network-dashboard {
    padding: 10px;
  }

  .network-hero {
    padding: 16px;
  }

  .network-hero__identity {
    align-items: flex-start;
  }

  .network-hero__mark {
    width: 64px;
    height: 64px;
  }

  .network-hero h1 {
    font-size: 1.45rem;
  }

  .network-dashboard__filters,
  .network-metric-grid,
  .network-coverage-grid {
    grid-template-columns: 1fr;
  }

  .network-hero__actions,
  .network-priority-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .network-priority {
    grid-template-columns: 34px minmax(0, 1fr) 24px;
    gap: 10px;
  }

  .network-priority__code,
  .network-priority__badge {
    grid-column: 2;
    justify-self: start;
  }

  .network-priority__copy {
    grid-column: 2;
  }

  .network-priority > .v-icon {
    grid-column: 3;
    grid-row: 1 / span 3;
  }
}
</style>
