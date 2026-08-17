<script setup lang="ts">
import type {
  ApiStationFlight,
  ReadinessStatus,
  StationAuditRow,
  StationCostRow,
  StationDataset,
  StationFlightRow,
  StationOperationsContext,
  StationServiceRow,
  StationTaskRow
} from '../../../features/station-operations/types/stationOperations';
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import { numberFormat } from '../../../features/station-operations/utils/stationOperationsFormatters';

const { context, pending, dataset, stationTasks } = useStationOperationsPageData();

const kpiCards = computed(() => [
  {
    label: 'Flight hari ini',
    value: numberFormat(dataset.value.flights.length),
    icon: 'mdi-airplane'
  },
  {
    label: 'Belum siap',
    value: numberFormat(dataset.value.kpi.flightsNeedingAction),
    icon: 'mdi-airplane-alert',
    tone: 'danger' as const,
    to: '/flights/station-operations/flights?readiness=NOT_READY'
  },
  {
    label: 'Verifikasi tertunda',
    value: numberFormat(stationTasks.value.filter((task) => task.status !== 'VERIFIED').length),
    icon: 'mdi-clipboard-check-outline',
    tone: 'warning' as const,
    to: '/flights/station-operations/verification'
  },
  {
    label: 'Layanan tertunda',
    value: numberFormat(dataset.value.kpi.pendingServices),
    icon: 'mdi-toolbox-outline',
    to: '/flights/station-operations/services'
  },
  {
    label: 'Biaya perlu tindakan',
    value: numberFormat(dataset.value.kpi.pendingCosts),
    icon: 'mdi-cash-clock',
    tone: 'warning' as const,
    to: '/flights/station-operations/costs'
  }
]);
export interface StationOperationsPageData {
  context: StationOperationsContext;
  pending: Ref<boolean>;
  dataset: Ref<StationDataset>;
  workbenchFlights: Ref<ApiStationFlight[]>;
  stationTasks: ComputedRef<StationTaskRow[]>;
  workbenchAudit: ComputedRef<StationAuditRow[]>;
  load: () => Promise<void>;
}
const readinessPriority: Record<ReadinessStatus, number> = {
  NOT_READY: 0,
  CHECK: 1,
  READY: 2
};

const priorityFlights = computed<StationFlightRow[]>(() => {
  const flights: StationFlightRow[] = dataset.value.flights;

  return [...flights]
    .sort((left: StationFlightRow, right: StationFlightRow) => {
      const readinessDifference =
        readinessPriority[left.readiness] - readinessPriority[right.readiness];

      if (readinessDifference !== 0) {
        return readinessDifference;
      }

      if (left.status === 'DELAYED' && right.status !== 'DELAYED') {
        return -1;
      }

      if (right.status === 'DELAYED' && left.status !== 'DELAYED') {
        return 1;
      }

      return left.scheduledTime.localeCompare(right.scheduledTime);
    })
    .slice(0, 8);
});

const pendingServiceCount = computed<number>(
  () =>
    dataset.value.services.filter((service: StationServiceRow) => service.status === 'REQUESTED')
      .length
);

const pendingCostCount = computed<number>(
  () =>
    dataset.value.costs.filter(
      (cost: StationCostRow) => cost.status === 'DRAFT' || cost.status === 'SUBMITTED'
    ).length
);

const flightsNotReadyCount = computed<number>(
  () =>
    dataset.value.flights.filter((flight: StationFlightRow) => flight.readiness !== 'READY').length
);

const originTaskCount = computed(
  () =>
    stationTasks.value.filter(
      (task) => task.phase === 'ORIGIN_DEPARTURE' && task.status !== 'VERIFIED'
    ).length
);
const arrivalTaskCount = computed(
  () =>
    stationTasks.value.filter(
      (task) => task.phase === 'DESTINATION_ARRIVAL' && task.status !== 'VERIFIED'
    ).length
);
const closureTaskCount = computed(
  () =>
    stationTasks.value.filter(
      (task) => task.phase === 'DESTINATION_CLOSURE' && task.status !== 'VERIFIED'
    ).length
);
const evidencePendingCount = computed(
  () =>
    stationTasks.value.filter(
      (task) =>
        task.requiresEvidence &&
        task.evidenceCount === 0 &&
        ['PENDING', 'IN_PROGRESS'].includes(task.status)
    ).length
);
const occSignoffCount = computed(
  () =>
    stationTasks.value.filter(
      (task) => task.stationDecision === 'VERIFIED' && task.occDecision !== 'APPROVED'
    ).length
);
const attentionItems = computed(() =>
  [
    {
      label: 'Persiapan keberangkatan',
      value: originTaskCount.value,
      icon: 'mdi-airplane-takeoff',
      tone: 'warning',
      to: '/flights/station-operations/verification',
      query: { phase: 'ORIGIN_DEPARTURE' }
    },
    {
      label: 'Penyelesaian kedatangan',
      value: arrivalTaskCount.value,
      icon: 'mdi-airplane-landing',
      tone: 'info',
      to: '/flights/station-operations/verification',
      query: { phase: 'DESTINATION_ARRIVAL' }
    },
    {
      label: 'Dependensi penutupan',
      value: closureTaskCount.value,
      icon: 'mdi-lock-clock-outline',
      tone: 'warning',
      to: '/flights/station-operations/verification',
      query: { phase: 'DESTINATION_CLOSURE' }
    },
    {
      label: 'Bukti belum lengkap',
      value: evidencePendingCount.value,
      icon: 'mdi-file-alert-outline',
      tone: 'error',
      to: '/flights/station-operations/verification',
      query: {}
    },
    {
      label: 'Menunggu sign-off OCC',
      value: occSignoffCount.value,
      icon: 'mdi-shield-check-outline',
      tone: 'secondary',
      to: '/flights/station-operations/verification',
      query: {}
    },
    {
      label: 'Layanan menunggu konfirmasi',
      value: pendingServiceCount.value,
      icon: 'mdi-toolbox-outline',
      tone: 'info',
      to: '/flights/station-operations/services',
      query: {}
    },
    {
      label: 'Biaya menunggu tindakan',
      value: pendingCostCount.value,
      icon: 'mdi-cash-clock',
      tone: 'warning',
      to: '/flights/station-operations/costs',
      query: {}
    },
    {
      label: 'Flight belum siap',
      value: flightsNotReadyCount.value,
      icon: 'mdi-airplane-alert',
      tone: 'error',
      to: '/flights/station-operations/flights',
      query: {}
    }
  ]
    .filter((item) => item.value > 0)
    .slice(0, 5)
);

const isEmpty = computed(
  () =>
    !pending.value &&
    dataset.value.flights.length === 0 &&
    dataset.value.services.length === 0 &&
    dataset.value.costs.length === 0
);
</script>

<template>
  <template v-if="pending">
    <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <VCard v-for="item in 6" :key="item" border class="pa-4">
        <VSkeletonLoader type="list-item-two-line" />
      </VCard>
    </div>
    <VCard border class="pa-4"><VSkeletonLoader type="table" /></VCard>
  </template>

  <VCard v-else-if="isEmpty" border class="py-12">
    <div class="flex flex-col items-center gap-2 text-center">
      <VIcon icon="mdi-calendar-blank-outline" size="42" color="grey" />
      <h2 class="text-h6">Tidak ada aktivitas operasional</h2>
      <p class="text-text-secondary">
        Tidak ada data untuk {{ context.selectedStationLabel.value }} pada
        {{ formatDateDisplay(context.operationalDateIso.value) }}.
      </p>
    </div>
  </VCard>

  <template v-else>
    <DsMetricStrip class="mb-4" :items="kpiCards" />

    <div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
      <VCard border class="xl:col-span-8">
        <div class="flex flex-wrap items-center justify-between gap-3 pa-4">
          <div>
            <h2 class="text-subtitle-1 font-weight-bold">Prioritas kesiapan flight</h2>
            <p class="text-caption text-text-secondary">
              Flight dengan blocker paling kritis ditampilkan lebih dahulu.
            </p>
          </div>
          <VBtn
            size="small"
            variant="outlined"
            append-icon="mdi-arrow-right"
            :to="context.withContext('/flights/station-operations/flights')"
          >
            Buka daftar flight
          </VBtn>
        </div>
        <VDivider />
        <div class="overflow-x-auto">
          <VTable density="comfortable" hover>
            <thead>
              <tr>
                <th>Time</th>
                <th>Flight</th>
                <th>Route</th>
                <th>Status</th>
                <th>Readiness</th>
                <th>Blocker / pemilik</th>
                <th class="text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="priorityFlights.length === 0">
                <td colspan="7" class="py-8 text-center text-text-secondary">Tidak ada flight.</td>
              </tr>
              <tr v-for="flight in priorityFlights" v-else :key="flight.id">
                <td>
                  <div class="font-weight-medium">{{ flight.scheduledTime }}</div>
                  <div class="text-caption text-text-secondary">{{ flight.actualTime }}</div>
                </td>
                <td class="font-weight-medium">{{ flight.flightNumber }}</td>
                <td>{{ flight.origin }} → {{ flight.destination }}</td>
                <td><DsStatusBadge :value="flight.status" /></td>
                <td><DsStatusBadge :value="flight.readiness" /></td>
                <td>
                  <div>{{ flight.blockerLabel ?? 'Tidak ada blocker' }}</div>
                  <div v-if="flight.readinessOwner" class="text-caption text-medium-emphasis">
                    Pemilik: {{ flight.readinessOwner }}
                  </div>
                </td>
                <td class="text-right">
                  <DsTooltipIconButton
                    icon="mdi-open-in-new"
                    tooltip="Open station flight workspace"
                    variant="text"
                    :to="`/flights/station-operations/${flight.flightId}`"
                  />
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </VCard>

      <VCard border class="xl:col-span-4">
        <div class="pa-4">
          <h2 class="text-subtitle-1 font-weight-bold">Antrean perhatian</h2>
          <p class="text-caption text-text-secondary">Item aktif yang memerlukan tindak lanjut.</p>
        </div>
        <VDivider />
        <VList lines="two">
          <VListItem
            v-for="item in attentionItems"
            :key="item.label"
            :to="context.withContext(item.to, item.query)"
          >
            <template #prepend>
              <VAvatar :color="item.tone" size="34" variant="tonal">
                <VIcon :icon="item.icon" size="18" />
              </VAvatar>
            </template>
            <VListItemTitle>{{ item.label }}</VListItemTitle>
            <VListItemSubtitle>{{ item.value }} item</VListItemSubtitle>
            <template #append><VIcon icon="mdi-chevron-right" /></template>
          </VListItem>
        </VList>
      </VCard>
    </div>
  </template>
</template>
