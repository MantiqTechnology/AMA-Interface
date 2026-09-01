<script setup lang="ts">
import type ApexCharts from 'apexcharts';
import type {
  ApexAxisChartSeries,
  ApexChartEventOpts,
  ApexNonAxisChartSeries,
  ApexOptions
} from 'apexcharts';
import type { FlightControlDashboardDto } from '#shared/contracts/operational-dashboards';
import { AMA_THEME_HEX } from '../../constants/themeColors';

const { period, anchorDate, stationId, query, periodOptions } = useOperationalDashboardFilters();
const { can } = useAuthorization();
const { data, pending, error, refresh } = await useAsyncData(
  'flight-control-overview-dashboard',
  () =>
    fetchApi<FlightControlDashboardDto>('/api/flight-operations/dashboard', { query: query.value }),
  { watch: [query] }
);

function safeHref(href: string) {
  const needsFallback =
    (href.startsWith('/flights/readiness') && !can('readiness.view').allowed) ||
    (href.startsWith('/flights/manifest') && !can('flight.manifest.view').allowed) ||
    (href.startsWith('/flights/fuel') && !can('flight.fuel.update').allowed);
  if (needsFallback) {
    const original = new URL(href, 'https://ama.local');
    const params = original.searchParams;
    if (href.startsWith('/flights/manifest') && params.has('status')) {
      params.set('manifestStatus', String(params.get('status')));
      params.delete('status');
    }
    if (href.startsWith('/flights/fuel') && params.has('status')) {
      params.set('fuelStatus', String(params.get('status')));
      params.delete('status');
    }
    if (data.value) {
      params.set('dateFrom', data.value.meta.dateFrom);
      params.set('dateTo', data.value.meta.dateTo);
      if (data.value.meta.stationId) params.set('stationId', data.value.meta.stationId);
      else params.delete('stationId');
    }
    return `/flights?${params.toString()}`;
  }
  return href;
}
function safeSection<T extends { source: { href: string } }>(section: T) {
  return { ...section, source: { ...section.source, href: safeHref(section.source.href) } };
}
const metrics = computed(() =>
  (data.value?.metrics ?? []).map((metric) => ({ ...metric, to: safeHref(metric.href) }))
);
const controlAlerts = computed(() => data.value?.actions.data ?? []);
const visibleControlAlerts = computed(() => controlAlerts.value.slice(0, 5));
const hiddenControlAlertCount = computed(() =>
  Math.max(0, controlAlerts.value.length - visibleControlAlerts.value.length)
);
const criticalControlAlertCount = computed(
  () => controlAlerts.value.filter((alert) => alert.severity === 'critical').length
);
const stationOptions = computed(() =>
  (data.value?.stationOptions ?? []).map((item) => ({
    ...item,
    label: `${item.code} · ${item.name}`
  }))
);
const lifecycleEmpty = computed(() =>
  (data.value?.lifecycle.data ?? []).every((point) => point.value === 0)
);
const readinessEmpty = computed(() =>
  (data.value?.readiness.data ?? []).every((point) => point.value === 0)
);
const activityEmpty = computed(() =>
  (data.value?.activity.data ?? []).every((series) =>
    series.points.every((point) => point.value === 0)
  )
);
const manifestEmpty = computed(() =>
  (data.value?.manifestWorkflow.data ?? []).every((point) => point.value === 0)
);
const fuelEmpty = computed(() =>
  (data.value?.fuelWorkflow.data ?? []).every((point) => point.value === 0)
);
const queueEmpty = computed(() =>
  [
    ...(data.value?.queueAging.data.approvals ?? []),
    ...(data.value?.queueAging.data.closures ?? [])
  ].every((point) => point.value === 0)
);

function donutOptions(
  points: () => Array<{ label: string; href: string }>,
  colors: string[],
  totalLabel: string
): ApexOptions {
  return {
    chart: {
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
      events: {
        dataPointSelection: (
          _event: MouseEvent,
          _context?: ApexCharts,
          config?: ApexChartEventOpts
        ) => {
          const point = points()[config?.dataPointIndex ?? -1];
          if (point) void navigateTo(safeHref(point.href));
        }
      }
    },
    colors,
    labels: points().map((point) => point.label),
    legend: { position: 'bottom' },
    plotOptions: {
      pie: {
        donut: { size: '68%', labels: { show: true, total: { show: true, label: totalLabel } } }
      }
    },
    stroke: { width: 0 }
  };
}

const lifecycleSeries = computed<ApexAxisChartSeries>(() => [
  { name: 'Flight', data: (data.value?.lifecycle.data ?? []).map((point) => point.value) }
]);
const lifecycleOptions = computed<ApexOptions>(() => ({
  chart: {
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
    events: {
      dataPointSelection: (
        _event: MouseEvent,
        _context?: ApexCharts,
        config?: ApexChartEventOpts
      ) => {
        const point = data.value?.lifecycle.data[config?.dataPointIndex ?? -1];
        if (point) void navigateTo(safeHref(point.href));
      }
    }
  },
  colors: [AMA_THEME_HEX.primary],
  dataLabels: { enabled: true },
  plotOptions: { bar: { borderRadius: 4, horizontal: true, distributed: true } },
  xaxis: { categories: data.value?.lifecycle.data.map((point) => point.label) ?? [] }
}));

const readinessSeries = computed<ApexNonAxisChartSeries>(() =>
  (data.value?.readiness.data ?? []).map((point) => point.value)
);
const readinessOptions = computed<ApexOptions>(() =>
  donutOptions(
    () => data.value?.readiness.data ?? [],
    [
      AMA_THEME_HEX.success,
      AMA_THEME_HEX.warning,
      AMA_THEME_HEX.danger,
      AMA_THEME_HEX.textSecondary
    ],
    'Flight'
  )
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
        if (point) void navigateTo(safeHref(point.href));
      }
    }
  },
  colors: [AMA_THEME_HEX.info, AMA_THEME_HEX.secondary, AMA_THEME_HEX.success],
  dataLabels: { enabled: false },
  grid: { borderColor: AMA_THEME_HEX.borderDefault, strokeDashArray: 4 },
  legend: { position: 'top', horizontalAlign: 'left' },
  markers: { size: 4, strokeWidth: 0 },
  stroke: { curve: 'straight', width: [2, 3, 3] },
  xaxis: {
    categories: data.value?.activity.data[0]?.points.map((point) => shortDate(point.label)) ?? [],
    labels: { rotate: -35 }
  },
  yaxis: { min: 0, forceNiceScale: true }
}));

const otpSeries = computed<ApexNonAxisChartSeries>(() =>
  (data.value?.onTimePerformance.data.points ?? []).map((point) => point.value)
);
const otpOptions = computed<ApexOptions>(() =>
  donutOptions(
    () => data.value?.onTimePerformance.data.points ?? [],
    [AMA_THEME_HEX.success, AMA_THEME_HEX.warning],
    'Eligible'
  )
);

function workflowOptions(kind: 'manifest' | 'fuel') {
  const points =
    kind === 'manifest'
      ? (data.value?.manifestWorkflow.data ?? [])
      : (data.value?.fuelWorkflow.data ?? []);
  return {
    chart: {
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
      events: {
        dataPointSelection: (
          _event: MouseEvent,
          _context?: ApexCharts,
          config?: ApexChartEventOpts
        ) => {
          const point = points[config?.dataPointIndex ?? -1];
          if (point) void navigateTo(safeHref(point.href));
        }
      }
    },
    colors: [kind === 'manifest' ? AMA_THEME_HEX.secondary : AMA_THEME_HEX.info],
    dataLabels: { enabled: true },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '52%', distributed: true } },
    xaxis: { categories: points.map((point) => point.label), labels: { rotate: -25 } },
    legend: { show: false }
  } satisfies ApexOptions;
}

const manifestSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Record manifest',
    data: (data.value?.manifestWorkflow.data ?? []).map((point) => point.value)
  }
]);
const manifestOptions = computed(() => workflowOptions('manifest'));
const fuelSeries = computed<ApexAxisChartSeries>(() => [
  { name: 'Fuel request', data: (data.value?.fuelWorkflow.data ?? []).map((point) => point.value) }
]);
const fuelOptions = computed(() => workflowOptions('fuel'));

const queueSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Approval',
    data: (data.value?.queueAging.data.approvals ?? []).map((point) => point.value)
  },
  {
    name: 'Closure',
    data: (data.value?.queueAging.data.closures ?? []).map((point) => point.value)
  }
]);
const queueOptions = computed<ApexOptions>(() => ({
  chart: {
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
    events: {
      dataPointSelection: (
        _event: MouseEvent,
        _context?: ApexCharts,
        config?: ApexChartEventOpts
      ) => {
        const series =
          config?.seriesIndex === 0
            ? data.value?.queueAging.data.approvals
            : data.value?.queueAging.data.closures;
        const point = series?.[config?.dataPointIndex ?? -1];
        if (point) void navigateTo(safeHref(point.href));
      }
    }
  },
  colors: [AMA_THEME_HEX.warning, AMA_THEME_HEX.danger],
  dataLabels: { enabled: false },
  legend: { position: 'top', horizontalAlign: 'left' },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '52%' } },
  xaxis: { categories: data.value?.queueAging.data.approvals.map((point) => point.label) ?? [] }
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
function duration(minutes: number) {
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}j ${remainder}m` : `${hours} jam`;
}
function severityColor(severity: string) {
  if (severity === 'critical') return 'error';
  if (severity === 'warning') return 'warning';
  return 'info';
}
</script>

<template>
  <VContainer class="operational-dashboard px-3 py-5 md:px-4" fluid>
    <DsOperationalPageHeader
      eyebrow="OCC control room"
      title="Flight Control Overview"
      description="Kendalikan lifecycle, readiness, departure performance, manifest, fuel, dan closure dari antrean yang sama."
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
          aria-label="Muat ulang Flight Control Overview"
          icon="mdi-refresh"
          :loading="pending"
          size="small"
          variant="tonal"
          @click="refresh"
        />
      </template>
    </DsOperationalPageHeader>

    <VAlert v-if="error" class="mt-4" type="error" variant="tonal">
      Flight Control Overview tidak dapat dimuat. Periksa filter atau muat ulang halaman.
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
        <span class="dashboard-context-band__signal"><i /> FLIGHT CONTROL PULSE</span>
        <strong>{{ data.meta.stationLabel }}</strong>
        <span>{{ shortDate(data.meta.dateFrom) }} — {{ shortDate(data.meta.dateTo) }}</span>
        <span>Snapshot {{ updatedAt(data.meta.generatedAt) }} WIT</span>
      </div>
      <VAlert
        v-if="controlAlerts.length"
        class="mt-3"
        :color="criticalControlAlertCount ? 'error' : 'warning'"
        icon="mdi-bell-alert-outline"
        variant="tonal"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="font-weight-bold">{{ controlAlerts.length }} alert operasional aktif</div>
            <div class="text-caption">
              Flight non-terminal dengan blocker, readiness, atau closure terbuka.
            </div>
          </div>
          <VChip v-if="criticalControlAlertCount" color="error" size="small" variant="flat">
            {{ criticalControlAlertCount }} critical
          </VChip>
        </div>

        <div class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <div v-for="alert in visibleControlAlerts" :key="alert.id" class="dashboard-alert-row">
            <VIcon :color="severityColor(alert.severity)" icon="mdi-alert-outline" size="20" />
            <div class="min-w-0 flex-1">
              <div class="dashboard-alert-row__title">
                {{ alert.flightNumber }} · {{ alert.owner }}
              </div>
              <div class="dashboard-alert-row__message">{{ alert.issue }}</div>
            </div>
            <VBtn
              aria-label="Buka alert flight"
              density="comfortable"
              icon="mdi-open-in-new"
              :to="alert.href"
              variant="text"
            />
          </div>
        </div>

        <div v-if="hiddenControlAlertCount" class="mt-2 text-caption">
          {{ hiddenControlAlertCount }} alert lain ditampilkan di tabel action queue.
        </div>
      </VAlert>
      <DsMetricStrip class="mt-3" :items="metrics" />

      <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardOperationalChartCard
          class="xl:col-span-7"
          v-bind="data.lifecycle"
          :empty="lifecycleEmpty"
        >
          <FeatureApexChart
            height="330"
            :options="lifecycleOptions"
            :series="lifecycleSeries"
            type="bar"
          />
        </DashboardOperationalChartCard>
        <DashboardOperationalChartCard
          class="xl:col-span-5"
          v-bind="safeSection(data.readiness)"
          :empty="readinessEmpty"
        >
          <FeatureApexChart
            height="330"
            :options="readinessOptions"
            :series="readinessSeries"
            type="donut"
          />
        </DashboardOperationalChartCard>

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
          v-bind="data.onTimePerformance"
          :empty="data.onTimePerformance.data.eligibleDepartures === 0"
          empty-text="Belum ada flight dengan scheduled dan actual departure."
        >
          <FeatureApexChart height="280" :options="otpOptions" :series="otpSeries" type="donut" />
          <div class="denominator-note">
            <strong>n={{ data.onTimePerformance.data.eligibleDepartures }}</strong> flight eligible
            · {{ data.onTimePerformance.data.excludedFlights }} dikeluarkan dari denominator
          </div>
        </DashboardOperationalChartCard>

        <DashboardOperationalChartCard
          class="xl:col-span-4"
          v-bind="safeSection(data.manifestWorkflow)"
          :empty="manifestEmpty"
        >
          <FeatureApexChart
            height="290"
            :options="manifestOptions"
            :series="manifestSeries"
            type="bar"
          />
        </DashboardOperationalChartCard>
        <DashboardOperationalChartCard
          class="xl:col-span-4"
          v-bind="safeSection(data.fuelWorkflow)"
          :empty="fuelEmpty"
        >
          <FeatureApexChart height="290" :options="fuelOptions" :series="fuelSeries" type="bar" />
        </DashboardOperationalChartCard>
        <DashboardOperationalChartCard
          class="xl:col-span-4"
          v-bind="safeSection(data.queueAging)"
          :empty="queueEmpty"
        >
          <FeatureApexChart height="290" :options="queueOptions" :series="queueSeries" type="bar" />
        </DashboardOperationalChartCard>

        <DashboardOperationalChartCard
          class="xl:col-span-12"
          v-bind="data.actions"
          :empty="data.actions.data.length === 0"
          empty-text="Tidak ada flight yang memerlukan tindakan dalam scope ini."
        >
          <div class="overflow-x-auto">
            <VTable density="comfortable" hover>
              <thead>
                <tr>
                  <th>Prioritas</th>
                  <th>Flight</th>
                  <th>Route</th>
                  <th>Issue</th>
                  <th>Owner</th>
                  <th>Umur</th>
                  <th class="text-right">Buka</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in data.actions.data" :key="item.id">
                  <td>
                    <VChip :color="severityColor(item.severity)" size="small" variant="tonal">
                      {{ item.severity }}
                    </VChip>
                  </td>
                  <td class="font-weight-bold">{{ item.flightNumber }}</td>
                  <td>{{ item.route }}</td>
                  <td class="action-issue">{{ item.issue }}</td>
                  <td>{{ item.owner }}</td>
                  <td>{{ duration(item.ageMinutes) }}</td>
                  <td class="text-right">
                    <DsTooltipIconButton
                      icon="mdi-open-in-new"
                      tooltip="Buka workspace flight"
                      :to="item.href"
                      variant="text"
                    />
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>
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
  background: rgb(var(--v-theme-accent-cenderawasih));
  box-shadow: 0 0 0 4px rgba(244, 122, 31, 0.2);
}
.denominator-note {
  margin: -8px 4px 10px;
  padding: 9px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.05);
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.74rem;
  text-align: center;
}
.action-issue {
  min-width: 260px;
  max-width: 560px;
}
.dashboard-alert-row {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-surface));
  padding: 10px 12px;
}
.dashboard-alert-row__title {
  overflow: hidden;
  color: rgb(var(--v-theme-text-primary));
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dashboard-alert-row__message {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 12px;
  overflow-wrap: anywhere;
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
