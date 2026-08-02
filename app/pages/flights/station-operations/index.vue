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
    key: 'inbound',
    label: 'Inbound Flights',
    value: numberFormat(dataset.value.kpi.inboundFlights),
    icon: 'mdi-airplane-landing',
    tone: 'info'
  },
  {
    key: 'outbound',
    label: 'Outbound Flights',
    value: numberFormat(dataset.value.kpi.outboundFlights),
    icon: 'mdi-airplane-takeoff',
    tone: 'success'
  },
  {
    key: 'action',
    label: 'Flights Needing Action',
    value: numberFormat(dataset.value.kpi.flightsNeedingAction),
    icon: 'mdi-alert-outline',
    tone: 'warning'
  },
  {
    key: 'pax',
    label: 'Pax Check-in / Boarded',
    value: `${numberFormat(dataset.value.kpi.paxCheckedIn)} / ${numberFormat(dataset.value.kpi.paxBoarded)}`,
    icon: 'mdi-account-group-outline',
    tone: 'secondary'
  },
  {
    key: 'services',
    label: 'Pending Services',
    value: numberFormat(dataset.value.kpi.pendingServices),
    icon: 'mdi-toolbox-outline',
    tone: 'info'
  },
  {
    key: 'costs',
    label: 'Pending Costs',
    value: numberFormat(dataset.value.kpi.pendingCosts),
    icon: 'mdi-cash-clock',
    tone: 'warning'
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

const draftCostCount = computed<number>(
  () => dataset.value.costs.filter((cost: StationCostRow) => cost.status === 'DRAFT').length
);

const submittedCostCount = computed<number>(
  () => dataset.value.costs.filter((cost: StationCostRow) => cost.status === 'SUBMITTED').length
);

const approvedCostCount = computed<number>(
  () => dataset.value.costs.filter((cost: StationCostRow) => cost.status === 'APPROVED').length
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
const attentionItems = computed(() => [
  {
    label: 'Departure preparation',
    value: originTaskCount.value,
    icon: 'mdi-airplane-takeoff',
    tone: 'warning',
    to: '/flights/station-operations/verification',
    query: { phase: 'ORIGIN_DEPARTURE' }
  },
  {
    label: 'Arrival completion',
    value: arrivalTaskCount.value,
    icon: 'mdi-airplane-landing',
    tone: 'info',
    to: '/flights/station-operations/verification',
    query: { phase: 'DESTINATION_ARRIVAL' }
  },
  {
    label: 'Closure dependency',
    value: closureTaskCount.value,
    icon: 'mdi-lock-clock-outline',
    tone: 'warning',
    to: '/flights/station-operations/verification',
    query: { phase: 'DESTINATION_CLOSURE' }
  },
  {
    label: 'Evidence pending',
    value: evidencePendingCount.value,
    icon: 'mdi-file-alert-outline',
    tone: 'error',
    to: '/flights/station-operations/verification',
    query: {}
  },
  {
    label: 'OCC sign-off pending',
    value: occSignoffCount.value,
    icon: 'mdi-shield-check-outline',
    tone: 'secondary',
    to: '/flights/station-operations/verification',
    query: {}
  },
  {
    label: 'Services awaiting confirmation',
    value: pendingServiceCount.value,
    icon: 'mdi-toolbox-outline',
    tone: 'info',
    to: '/flights/station-operations/services',
    query: {}
  },
  {
    label: 'Costs awaiting action',
    value: pendingCostCount.value,
    icon: 'mdi-cash-clock',
    tone: 'warning',
    to: '/flights/station-operations/costs',
    query: {}
  },
  {
    label: 'Flights not ready',
    value: flightsNotReadyCount.value,
    icon: 'mdi-airplane-alert',
    tone: 'error',
    to: '/flights/station-operations/flights',
    query: {}
  }
]);

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
    <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <VCard v-for="card in kpiCards" :key="card.key" border class="pa-4">
        <div class="mb-3 flex items-start justify-between gap-2">
          <span class="text-caption text-text-secondary">{{ card.label }}</span>
          <VAvatar :color="card.tone" size="32" variant="tonal">
            <VIcon :icon="card.icon" size="18" />
          </VAvatar>
        </div>
        <div class="text-h5 font-weight-bold">{{ card.value }}</div>
        <div class="mt-1 text-caption text-text-secondary">Current operational date</div>
      </VCard>
    </div>

    <div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
      <VCard border class="xl:col-span-8">
        <div class="flex flex-wrap items-center justify-between gap-3 pa-4">
          <div>
            <h2 class="text-subtitle-1 font-weight-bold">Priority Flight Board</h2>
            <p class="text-caption text-text-secondary">
              Flights needing attention are shown first.
            </p>
          </div>
          <VBtn
            size="small"
            variant="outlined"
            append-icon="mdi-arrow-right"
            :to="context.withContext('/flights/station-operations/flights')"
          >
            Open Flights
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
                <th>Pax / Cargo</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="priorityFlights.length === 0">
                <td colspan="7" class="py-8 text-center text-text-secondary">No flights found.</td>
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
                  <span v-if="flight.type === 'PSG'">{{ flight.paxOnboard }} / {{ flight.paxTotal }}</span>
                  <span v-else>{{ numberFormat(flight.cargoWeightKg) }} kg</span>
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
          <h2 class="text-subtitle-1 font-weight-bold">Attention Queue</h2>
          <p class="text-caption text-text-secondary">Operational items requiring follow-up.</p>
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
            <VListItemSubtitle>{{ item.value }} record(s)</VListItemSubtitle>
            <template #append><VIcon icon="mdi-chevron-right" /></template>
          </VListItem>
        </VList>
      </VCard>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <VCard border class="pa-4">
        <h2 class="mb-4 text-subtitle-1 font-weight-bold">Passenger &amp; Cargo</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="rounded-lg border pa-3">
            <div class="text-caption text-text-secondary">Checked in</div>
            <div class="text-h6 font-weight-bold">{{ numberFormat(dataset.kpi.paxCheckedIn) }}</div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="text-caption text-text-secondary">Boarded</div>
            <div class="text-h6 font-weight-bold">{{ numberFormat(dataset.kpi.paxBoarded) }}</div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="text-caption text-text-secondary">Load factor</div>
            <div class="text-h6 font-weight-bold">
              {{ dataset.dailyReport.passengers.loadFactor }}%
            </div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="text-caption text-text-secondary">Cargo weight</div>
            <div class="text-h6 font-weight-bold">
              {{ numberFormat(dataset.kpi.cargoWeightKg) }} kg
            </div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="text-caption text-text-secondary">Shipments</div>
            <div class="text-h6 font-weight-bold">{{ dataset.dailyReport.cargo.shipments }}</div>
          </div>
        </div>
      </VCard>

      <VCard border class="pa-4">
        <h2 class="mb-4 text-subtitle-1 font-weight-bold">Service &amp; Cost Status</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="rounded-lg border pa-3">
            <div class="text-caption text-text-secondary">Requested services</div>
            <div class="text-h6 font-weight-bold">{{ dataset.dailyReport.services.requested }}</div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="text-caption text-text-secondary">Confirmed services</div>
            <div class="text-h6 font-weight-bold">{{ dataset.dailyReport.services.confirmed }}</div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="text-caption text-text-secondary">Completed services</div>
            <div class="text-h6 font-weight-bold">{{ dataset.dailyReport.services.completed }}</div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="text-caption text-text-secondary">Draft costs</div>
            <div class="text-h6 font-weight-bold">{{ draftCostCount }}</div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="text-caption text-text-secondary">Submitted costs</div>
            <div class="text-h6 font-weight-bold">{{ submittedCostCount }}</div>
          </div>
          <div class="rounded-lg border pa-3">
            <div class="text-caption text-text-secondary">Approved costs</div>
            <div class="text-h6 font-weight-bold">{{ approvedCostCount }}</div>
          </div>
        </div>
      </VCard>
    </div>
  </template>
</template>
