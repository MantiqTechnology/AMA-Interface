<script setup lang="ts">
import type ApexCharts from 'apexcharts';
import type {
  ApexAxisChartSeries,
  ApexChartEventOpts,
  ApexNonAxisChartSeries,
  ApexOptions
} from 'apexcharts';
import type { OpsDashboardDto } from '#shared/contracts/operational-dashboards';
import { AMA_THEME_HEX } from '../../constants/themeColors';

const { period, anchorDate, stationId, query, periodOptions } = useOperationalDashboardFilters();
const { can } = useAuthorization();
const { data, pending, error, refresh } = await useAsyncData(
  'ops-overview-dashboard',
  () => fetchApi<OpsDashboardDto>('/api/operations/dashboard', { query: query.value }),
  { watch: [query] }
);

function safeHref(href: string) {
  const inaccessible =
    (href.startsWith('/flights/readiness') && !can('readiness.view').allowed) ||
    (href.startsWith('/master-data') && !can('platform.module.manage').allowed);
  return inaccessible ? '' : href;
}
function safeSection<T extends { source: { href: string } }>(section: T) {
  return { ...section, source: { ...section.source, href: safeHref(section.source.href) } };
}
const metrics = computed(() =>
  (data.value?.metrics ?? []).map((metric) => ({
    ...metric,
    to: safeHref(metric.href) || undefined
  }))
);
const stationOptions = computed(() =>
  (data.value?.stationOptions ?? []).map((item) => ({
    ...item,
    label: `${item.code} · ${item.name}`
  }))
);
const activityEmpty = computed(() =>
  (data.value?.activity.data ?? []).every((series) =>
    series.points.every((point) => point.value === 0)
  )
);
const trackingEmpty = computed(() =>
  (data.value?.trackingHealth.data ?? []).every((point) => point.value === 0)
);
const capabilityEmpty = computed(() =>
  (data.value?.capabilityCoverage.data ?? []).every((item) => item.total === 0)
);
const activitySeries = computed<ApexAxisChartSeries>(() =>
  (data.value?.activity.data ?? []).map((series) => ({
    name: series.label,
    data: series.points.map((point) => point.value)
  }))
);
const activityOptions = computed<ApexOptions>(() => ({
  chart: {
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
    events: {
      dataPointSelection: (
        _event: MouseEvent,
        _context?: ApexCharts,
        config?: ApexChartEventOpts
      ) => {
        const point =
          data.value?.activity.data[config?.seriesIndex ?? -1]?.points[
            config?.dataPointIndex ?? -1
          ];
        const href = point ? safeHref(point.href) : '';
        if (href) void navigateTo(href);
      }
    }
  },
  colors: [AMA_THEME_HEX.info, AMA_THEME_HEX.secondary, AMA_THEME_HEX.success],
  dataLabels: { enabled: false },
  grid: { borderColor: AMA_THEME_HEX.borderDefault, strokeDashArray: 4 },
  legend: { position: 'top', horizontalAlign: 'left' },
  markers: { size: 4, strokeWidth: 0 },
  stroke: { curve: 'straight', width: [2, 3, 3] },
  tooltip: { shared: true },
  xaxis: {
    categories: data.value?.activity.data[0]?.points.map((point) => shortDate(point.label)) ?? [],
    labels: { rotate: -35 }
  },
  yaxis: { min: 0, forceNiceScale: true }
}));

const trackingSeries = computed<ApexNonAxisChartSeries>(() =>
  (data.value?.trackingHealth.data ?? []).map((point) => point.value)
);
const trackingOptions = computed<ApexOptions>(() => ({
  chart: {
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
    events: {
      dataPointSelection: (
        _event: MouseEvent,
        _context?: ApexCharts,
        config?: ApexChartEventOpts
      ) => {
        const point = data.value?.trackingHealth.data[config?.dataPointIndex ?? -1];
        const href = point ? safeHref(point.href) : '';
        if (href) void navigateTo(href);
      }
    }
  },
  colors: [AMA_THEME_HEX.success, AMA_THEME_HEX.warning, AMA_THEME_HEX.textSecondary],
  labels: data.value?.trackingHealth.data.map((point) => point.label) ?? [],
  legend: { position: 'bottom' },
  plotOptions: {
    pie: {
      donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Flight aktif' } } }
    }
  },
  stroke: { width: 0 }
}));

const routeSeries = computed<ApexAxisChartSeries>(() => [
  { name: 'Flight', data: (data.value?.routeTraffic.data ?? []).map((point) => point.value) }
]);
const routeOptions = computed<ApexOptions>(() => ({
  chart: {
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
    events: {
      dataPointSelection: (
        _event: MouseEvent,
        _context?: ApexCharts,
        config?: ApexChartEventOpts
      ) => {
        const point = data.value?.routeTraffic.data[config?.dataPointIndex ?? -1];
        const href = point ? safeHref(point.href) : '';
        if (href) void navigateTo(href);
      }
    }
  },
  colors: [AMA_THEME_HEX.primary],
  dataLabels: { enabled: true },
  plotOptions: { bar: { borderRadius: 4, horizontal: true } },
  xaxis: { categories: data.value?.routeTraffic.data.map((point) => point.label) ?? [] }
}));

const movementSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Keberangkatan',
    data: (data.value?.stationMovements.data ?? []).map((item) => item.departures)
  },
  {
    name: 'Kedatangan',
    data: (data.value?.stationMovements.data ?? []).map((item) => item.arrivals)
  }
]);
const movementOptions = computed<ApexOptions>(() => ({
  chart: {
    stacked: true,
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
    events: {
      dataPointSelection: (
        _event: MouseEvent,
        _context?: ApexCharts,
        config?: ApexChartEventOpts
      ) => {
        const point = data.value?.stationMovements.data[config?.dataPointIndex ?? -1];
        const href = point ? safeHref(point.href) : '';
        if (href) void navigateTo(href);
      }
    }
  },
  colors: [AMA_THEME_HEX.secondary, AMA_THEME_HEX.info],
  dataLabels: { enabled: false },
  legend: { position: 'top', horizontalAlign: 'left' },
  plotOptions: { bar: { borderRadius: 3, columnWidth: '52%' } },
  xaxis: { categories: data.value?.stationMovements.data.map((item) => item.label) ?? [] }
}));

const capabilitySeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Tersedia',
    data: (data.value?.capabilityCoverage.data ?? []).map((item) => item.available)
  },
  {
    name: 'Belum tersedia',
    data: (data.value?.capabilityCoverage.data ?? []).map((item) => item.total - item.available)
  }
]);
const capabilityOptions = computed<ApexOptions>(() => ({
  chart: {
    stacked: true,
    stackType: '100%',
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif'
  },
  colors: [AMA_THEME_HEX.secondary, AMA_THEME_HEX.borderDefault],
  dataLabels: { enabled: true },
  legend: { position: 'bottom' },
  plotOptions: { bar: { borderRadius: 4, horizontal: true } },
  xaxis: {
    categories: data.value?.capabilityCoverage.data.map((item) => item.label) ?? [],
    max: 100
  }
}));

function shortDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00Z`));
}

function updatedAt(value: string | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

function advisoryColor(severity: string) {
  if (severity === 'BLOCKING') return 'error';
  if (severity === 'WARNING') return 'warning';
  return 'info';
}
</script>

<template>
  <VContainer class="operational-dashboard px-3 py-5 md:px-4" fluid>
    <DsOperationalPageHeader
      eyebrow="Network operations"
      title="Ops Overview"
      description="Pantau pulse jaringan, kesehatan tracking, traffic route, dan capability station dari satu layar."
      :updated-at="updatedAt(data?.meta.generatedAt)"
    >
      <template #context>
        <div class="dashboard-filter-row">
          <VBtnToggle
            v-model="period"
            color="secondary"
            density="compact"
            mandatory
            variant="outlined"
          >
            <VBtn v-for="item in periodOptions" :key="item.value" :value="item.value">
              {{ item.title }}
            </VBtn>
          </VBtnToggle>
          <VTextField
            v-model="anchorDate"
            aria-label="Tanggal acuan"
            density="compact"
            hide-details
            type="date"
            variant="outlined"
          />
          <VSelect
            v-model="stationId"
            clearable
            density="compact"
            hide-details
            item-title="label"
            item-value="id"
            :items="stationOptions"
            label="Station"
            variant="outlined"
          />
        </div>
      </template>
      <template #actions>
        <VChip prepend-icon="mdi-clock-outline" size="small" variant="tonal">Asia/Jayapura</VChip>
        <VBtn
          aria-label="Muat ulang Ops Overview"
          icon="mdi-refresh"
          :loading="pending"
          size="small"
          variant="tonal"
          @click="refresh"
        />
      </template>
    </DsOperationalPageHeader>

    <VAlert v-if="error" class="mt-4" type="error" variant="tonal">
      Ops Overview tidak dapat dimuat. Periksa filter atau muat ulang halaman.
    </VAlert>

    <template v-if="pending && !data">
      <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <VCard v-for="item in 6" :key="item" border class="pa-4">
          <VSkeletonLoader type="list-item-two-line" />
        </VCard>
      </div>
      <VCard border class="mt-4 pa-4"><VSkeletonLoader type="image, article" /></VCard>
    </template>

    <template v-else-if="data">
      <div class="dashboard-context-band mt-4">
        <span class="dashboard-context-band__signal"><i /> OPERATIONAL PULSE</span>
        <strong>{{ data.meta.stationLabel }}</strong>
        <span>{{ shortDate(data.meta.dateFrom) }} — {{ shortDate(data.meta.dateTo) }}</span>
        <span>Snapshot {{ updatedAt(data.meta.generatedAt) }} WIT</span>
      </div>

      <DsMetricStrip class="mt-3" :items="metrics" />

      <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardOperationalChartCard
          class="xl:col-span-8"
          v-bind="data.activity"
          :empty="activityEmpty"
        >
          <FeatureApexChart
            height="320"
            :options="activityOptions"
            :series="activitySeries"
            type="line"
          />
        </DashboardOperationalChartCard>
        <DashboardOperationalChartCard
          class="xl:col-span-4"
          v-bind="data.trackingHealth"
          :empty="trackingEmpty"
        >
          <FeatureApexChart
            height="320"
            :options="trackingOptions"
            :series="trackingSeries"
            type="donut"
          />
        </DashboardOperationalChartCard>

        <DashboardOperationalChartCard
          class="xl:col-span-6"
          v-bind="safeSection(data.routeTraffic)"
          :empty="data.routeTraffic.data.length === 0"
        >
          <FeatureApexChart height="330" :options="routeOptions" :series="routeSeries" type="bar" />
          <div class="route-otp-strip">
            <NuxtLink
              v-for="route in data.routeTraffic.data.slice(0, 4)"
              :key="route.key"
              :to="route.href"
            >
              <strong>{{ route.label }}</strong>
              <span>{{
                route.onTimeRate === null
                  ? 'OTP belum tersedia'
                  : `OTP ${route.onTimeRate}% · n=${route.eligibleDepartures}`
              }}</span>
            </NuxtLink>
          </div>
        </DashboardOperationalChartCard>
        <DashboardOperationalChartCard
          class="xl:col-span-6"
          v-bind="safeSection(data.stationMovements)"
          :empty="data.stationMovements.data.length === 0"
        >
          <FeatureApexChart
            height="350"
            :options="movementOptions"
            :series="movementSeries"
            type="bar"
          />
        </DashboardOperationalChartCard>

        <DashboardOperationalChartCard
          class="xl:col-span-5"
          v-bind="safeSection(data.capabilityCoverage)"
          :empty="capabilityEmpty"
        >
          <FeatureApexChart
            height="290"
            :options="capabilityOptions"
            :series="capabilitySeries"
            type="bar"
          />
        </DashboardOperationalChartCard>
        <DashboardOperationalChartCard
          class="xl:col-span-7"
          v-bind="safeSection(data.advisories)"
          :empty="data.advisories.data.length === 0"
          empty-text="Tidak ada advisory aktif pada scope dan periode ini."
        >
          <VList lines="three">
            <VListItem
              v-for="item in data.advisories.data"
              :key="item.id"
              :to="safeHref(item.href) || undefined"
            >
              <template #prepend>
                <VAvatar :color="advisoryColor(item.severity)" size="36" variant="tonal">
                  <VIcon icon="mdi-alert-outline" size="19" />
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-bold">{{ item.summary }}</VListItemTitle>
              <VListItemSubtitle>
                {{ item.type }} · berlaku sampai {{ shortDate(item.validUntil.slice(0, 10))
                }}<br>{{ item.limitation ?? 'Tidak ada limitation tambahan.' }}
              </VListItemSubtitle>
              <template #append>
                <VChip :color="advisoryColor(item.severity)" size="small" variant="tonal">
                  {{ item.severity }}
                </VChip>
              </template>
            </VListItem>
          </VList>
        </DashboardOperationalChartCard>
      </div>
    </template>
  </VContainer>
</template>

<style scoped>
.operational-dashboard {
  max-width: 1760px;
}
.dashboard-filter-row {
  display: grid;
  grid-template-columns: auto 150px minmax(210px, 1fr);
  gap: 8px;
  min-width: min(720px, 72vw);
}
.dashboard-context-band {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 22px;
  min-height: 42px;
  padding: 8px 14px;
  border-radius: 9px;
  background: rgb(var(--v-theme-primary));
  color: white;
  font-size: 0.78rem;
}
.dashboard-context-band__signal {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.dashboard-context-band__signal i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-secondary));
  box-shadow: 0 0 0 4px rgba(14, 140, 138, 0.23);
}
.route-otp-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 0 4px 8px;
}
.route-otp-strip a {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  color: inherit;
  font-size: 0.72rem;
  text-decoration: none;
}
.route-otp-strip span {
  color: rgba(var(--v-theme-on-surface), 0.62);
}
@media (max-width: 900px) {
  .dashboard-filter-row {
    grid-template-columns: 1fr;
    min-width: min(100%, 78vw);
  }
  .dashboard-filter-row :deep(.v-btn-toggle) {
    overflow-x: auto;
  }
}
@media (prefers-reduced-motion: reduce) {
  .dashboard-context-band__signal i {
    box-shadow: none;
  }
}
</style>
