<script setup lang="ts">
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import {
  formatDateDisplay,
  numberFormat
} from '../../../features/station-operations/utils/stationOperationsFormatters';

const { context, pending, dataset } = useStationOperationsPageData();

const donutSegments = computed(() => {
  const source = dataset.value.flightsByType;
  const total = source.passenger.pct + source.cargo.pct + source.positioning.pct || 1;
  let offset = 0;
  return [
    {
      label: 'Passenger',
      count: source.passenger.count,
      pct: source.passenger.pct,
      color: 'rgb(var(--v-theme-primary))'
    },
    {
      label: 'Cargo',
      count: source.cargo.count,
      pct: source.cargo.pct,
      color: 'rgb(var(--v-theme-success))'
    },
    {
      label: 'Positioning',
      count: source.positioning.count,
      pct: source.positioning.pct,
      color: 'rgb(var(--v-theme-warning))'
    }
  ].map((item) => {
    const result = { ...item, offset, length: (item.pct / total) * 100 };
    offset += result.length;
    return result;
  });
});

const exceptionItems = computed(() => [
  {
    label: 'Delay > 15m',
    value: dataset.value.exceptions.delayOver15,
    icon: 'mdi-clock-alert-outline'
  },
  {
    label: 'Services Overdue',
    value: dataset.value.exceptions.servicesOverdue,
    icon: 'mdi-toolbox-outline'
  },
  { label: 'Cost Overdue', value: dataset.value.exceptions.costOverdue, icon: 'mdi-cash-clock' },
  {
    label: 'Manifest Issue',
    value: dataset.value.exceptions.manifestIssue,
    icon: 'mdi-account-alert-outline'
  },
  {
    label: 'Tech Log Open',
    value: dataset.value.exceptions.techLogOpen,
    icon: 'mdi-book-alert-outline'
  }
]);

function exportDailyReportCsv(): void {
  const report = dataset.value.dailyReport;
  const rows: Array<Array<string | number>> = [
    ['Station', context.selectedStationCode.value],
    ['Operational Date', context.operationalDateIso.value],
    [],
    ['Flights', 'Total', report.flights.total],
    ['Flights', 'On Time', report.flights.onTime],
    ['Flights', 'Delayed', report.flights.delayed],
    [],
    ['Passengers', 'Check-in', report.passengers.checkedIn],
    ['Passengers', 'Boarded', report.passengers.boarded],
    ['Passengers', 'Load Factor (%)', report.passengers.loadFactor],
    [],
    ['Cargo', 'Total Weight (kg)', report.cargo.totalWeightKg],
    ['Cargo', 'Total Volume (m3)', report.cargo.totalVolumeM3],
    ['Cargo', 'Shipments', report.cargo.shipments],
    [],
    ['Services', 'Requested', report.services.requested],
    ['Services', 'Confirmed', report.services.confirmed],
    ['Services', 'Completed', report.services.completed],
    [],
    ['Costs', 'Total', report.costs.total],
    ['Costs', 'Approved (%)', report.costs.approvedPct],
    ['Costs', 'Approved Amount (IDR)', report.costs.approvedAmount],
    ['Costs', 'Positioning Amount (IDR)', report.costs.positioningAmount]
  ];
  const content = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `station-daily-report-${context.selectedStationCode.value}-${context.operationalDateIso.value}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="text-h6 font-weight-bold">Operational Reports</h2>
      <p class="text-caption text-text-secondary">
        {{ context.selectedStationLabel.value }} ·
        {{ formatDateDisplay(context.operationalDateIso.value) }}
      </p>
    </div>
    <VBtn
      color="primary"
      prepend-icon="mdi-tray-arrow-down"
      :disabled="pending"
      @click="exportDailyReportCsv"
    >
      Export CSV
    </VBtn>
  </div>

  <div v-if="pending" class="grid grid-cols-1 gap-4 xl:grid-cols-12">
    <VCard border class="pa-4 xl:col-span-8"><VSkeletonLoader type="article" /></VCard><VCard border class="pa-4 xl:col-span-4"><VSkeletonLoader type="image" /></VCard>
  </div>
  <template v-else>
    <div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
      <VCard border class="pa-4 xl:col-span-8">
        <h3 class="mb-4 text-subtitle-1 font-weight-bold">Daily Report Summary</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div class="rounded-lg border pa-3">
            <div class="mb-2 text-caption font-weight-medium text-text-secondary">Flights</div>
            <div>
              Total <strong class="float-right">{{ dataset.dailyReport.flights.total }}</strong>
            </div>
            <div>
              On Time <strong class="float-right">{{ dataset.dailyReport.flights.onTime }}</strong>
            </div>
            <div>
              Delayed <strong class="float-right">{{ dataset.dailyReport.flights.delayed }}</strong>
            </div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="mb-2 text-caption font-weight-medium text-text-secondary">Passengers</div>
            <div>
              Check-in
              <strong class="float-right">{{
                numberFormat(dataset.dailyReport.passengers.checkedIn)
              }}</strong>
            </div>
            <div>
              Boarded
              <strong class="float-right">{{
                numberFormat(dataset.dailyReport.passengers.boarded)
              }}</strong>
            </div>
            <div>
              Load Factor
              <strong class="float-right">{{ dataset.dailyReport.passengers.loadFactor }}%</strong>
            </div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="mb-2 text-caption font-weight-medium text-text-secondary">Cargo</div>
            <div>
              Weight
              <strong class="float-right">{{ numberFormat(dataset.dailyReport.cargo.totalWeightKg) }} kg</strong>
            </div>
            <div>
              Volume
              <strong class="float-right">{{ dataset.dailyReport.cargo.totalVolumeM3 }} m³</strong>
            </div>
            <div>
              Shipments
              <strong class="float-right">{{ dataset.dailyReport.cargo.shipments }}</strong>
            </div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="mb-2 text-caption font-weight-medium text-text-secondary">Services</div>
            <div>
              Requested
              <strong class="float-right">{{ dataset.dailyReport.services.requested }}</strong>
            </div>
            <div>
              Confirmed
              <strong class="float-right">{{ dataset.dailyReport.services.confirmed }}</strong>
            </div>
            <div>
              Completed
              <strong class="float-right">{{ dataset.dailyReport.services.completed }}</strong>
            </div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="mb-2 text-caption font-weight-medium text-text-secondary">Costs</div>
            <div>
              Total <strong class="float-right">{{ dataset.dailyReport.costs.total }}</strong>
            </div>
            <div>
              Approved
              <strong class="float-right">{{ dataset.dailyReport.costs.approvedPct }}%</strong>
            </div>
            <div>
              Amount
              <strong class="float-right">{{
                numberFormat(dataset.dailyReport.costs.approvedAmount)
              }}</strong>
            </div>
          </div>
        </div>
      </VCard>

      <VCard border class="pa-4 xl:col-span-4">
        <h3 class="mb-4 text-subtitle-1 font-weight-bold">Flights by Type</h3>
        <div class="flex justify-center">
          <svg viewBox="0 0 120 120" width="150" height="150">
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="rgb(var(--v-theme-surface-variant))"
              stroke-width="16"
            />
            <circle
              v-for="segment in donutSegments"
              :key="segment.label"
              cx="60"
              cy="60"
              r="45"
              fill="none"
              :stroke="segment.color"
              stroke-width="16"
              :stroke-dasharray="`${(segment.length / 100) * 282.7} 282.7`"
              :stroke-dashoffset="`${-(segment.offset / 100) * 282.7}`"
              transform="rotate(-90 60 60)"
            />
          </svg>
        </div>
        <div class="mt-4 flex flex-col gap-2">
          <div
            v-for="segment in donutSegments"
            :key="`legend-${segment.label}`"
            class="flex items-center justify-between text-caption"
          >
            <span>{{ segment.label }}</span><strong>{{ segment.count }} ({{ segment.pct }}%)</strong>
          </div>
        </div>
      </VCard>
    </div>

    <VCard border class="pa-4">
      <h3 class="mb-4 text-subtitle-1 font-weight-bold">Exceptions</h3>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div v-for="item in exceptionItems" :key="item.label" class="rounded-lg border pa-3">
          <div class="flex items-center gap-2 text-caption text-text-secondary">
            <VIcon :icon="item.icon" size="16" />{{ item.label }}
          </div>
          <div class="mt-1 text-h6 font-weight-bold">{{ item.value }}</div>
        </div>
      </div>
    </VCard>
  </template>
</template>
