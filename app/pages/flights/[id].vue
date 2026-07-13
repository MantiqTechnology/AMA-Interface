<script setup lang="ts">
import FlightReasonSelect from '../../features/operations/flight-reasons/FlightReasonSelect.vue';
import StationSelect from '../../features/operations/stations/StationSelect.vue';
import type { AircraftOption } from '#shared/features/operations/aircraft';
import type { StationOption } from '#shared/features/operations/stations';
import type {
  FlightOperationDetailDto,
  FlightReadinessCheckDto,
  FlightStatusHistoryDto
} from '#shared/contracts/flight-operations';

const route = useRoute();
const id = computed(() => String(route.params.id));
const activeTab = ref('overview');
const actionError = ref('');
const actionLoading = ref(false);
const reasonDialog = ref(false);
const reasonAction = ref<'cancel' | 'divert' | 'reopen'>('cancel');
const reasonId = ref('');
const reasonNote = ref('');
const diversionStationId = ref('');
const issueDrawer = ref(false);
const selectedIssue = ref<FlightReadinessCheckDto | null>(null);
const historyFilter = ref('ALL');

const { data: aircraftOptions } = await useAsyncData(
  'aircraft-options',
  () => fetchApi<AircraftOption[]>('/api/master-data/aircraft/options'),
  { default: () => [] }
);
const { data: stationOptions } = await useAsyncData(
  'station-options',
  () => fetchApi<StationOption[]>('/api/master-data/stations/options'),
  { default: () => [] }
);
const {
  data: flight,
  pending,
  error,
  refresh
} = await useAsyncData(`flight-order-${id.value}`, () =>
  fetchApi<FlightOperationDetailDto>(`/api/flight-operations/flights/${id.value}`)
);

const lifecycle = [
  'DRAFT',
  'PENDING_READINESS',
  'READY_FOR_APPROVAL',
  'APPROVED',
  'SCHEDULED',
  'IN_PROGRESS',
  'LANDED',
  'PENDING_CLOSURE',
  'CLOSED'
] as const;

const validActions = computed(() => {
  const status = flight.value?.currentStatus;
  if (!status) return [];
  const actions: Array<{
    label: string;
    icon: string;
    action: string;
    color?: string;
    disabled?: boolean;
  }> = [];
  if (status === 'DRAFT' || status === 'REOPENED_FOR_CORRECTION') {
    actions.push({
      label: 'Submit Order',
      icon: 'mdi-send-outline',
      action: 'submit',
      color: 'secondary'
    });
  }
  if (status === 'PENDING_READINESS' || status === 'BLOCKED') {
    actions.push({ label: 'Run Readiness Check', icon: 'mdi-playlist-check', action: 'evaluate' });
  }
  if (status === 'READY_FOR_APPROVAL') {
    actions.push({
      label: 'Approve Flight',
      icon: 'mdi-check-decagram-outline',
      action: 'approve',
      color: 'success'
    });
  }
  if (status === 'APPROVED') {
    actions.push({ label: 'Schedule', icon: 'mdi-calendar-check-outline', action: 'schedule' });
  }
  if (status === 'SCHEDULED') {
    actions.push({
      label: 'Open Check-in',
      icon: 'mdi-account-check-outline',
      action: 'open-check-in'
    });
  }
  if (status === 'CHECK_IN_OPEN') {
    actions.push({ label: 'Record Departure', icon: 'mdi-airplane-takeoff', action: 'depart' });
  }
  if (status === 'IN_PROGRESS') {
    actions.push({
      label: 'Record Landing',
      icon: 'mdi-airplane-landing',
      action: 'land',
      color: 'success'
    });
  }
  if (status === 'LANDED') {
    actions.push({
      label: 'Start Closure',
      icon: 'mdi-clipboard-check-outline',
      action: 'pending-closure'
    });
  }
  if (status === 'PENDING_CLOSURE') {
    actions.push({
      label: 'Close Flight',
      icon: 'mdi-lock-check-outline',
      action: 'close',
      color: 'success',
      disabled: !flight.value?.closureReadiness.allowed
    });
  }
  return actions;
});

const aircraft = computed(() =>
  aircraftOptions.value.find((item) => item.id === flight.value?.aircraftId)
);
function aircraftStationCode(item: AircraftOption | undefined) {
  const stationId = item?.currentStationId ?? item?.baseStationId;
  return stationOptions.value.find((station) => station.id === stationId)?.stationCode ?? '-';
}
const passengerManifest = computed(() =>
  flight.value?.manifests.find((item) => item.manifestType === 'PASSENGER')
);
const cargoManifest = computed(() =>
  flight.value?.manifests.find((item) => item.manifestType === 'CARGO')
);
const fuel = computed(() => flight.value?.fuelRequests[0]);
const blockingIssues = computed(() =>
  (flight.value?.readinessChecks ?? []).filter((item) => item.blocking)
);
const warningIssues = computed(() =>
  (flight.value?.crewAssignments ?? []).filter((item) => item.availabilityStatus === 'WARNING')
);
const assignmentIssues = computed(() =>
  blockingIssues.value.filter((item) => ['AIRCRAFT', 'CREW'].includes(item.category))
);
const handlingConfirmedCount = computed(
  () => flight.value?.stationServices.filter((item) => item.status === 'CONFIRMED').length ?? 0
);
const currentApprovalOwner = computed(
  () =>
    flight.value?.approvals.find((item) => item.status === 'PENDING')?.assignedRole ??
    'Operation Manager'
);
const readinessCompleted = computed(
  () =>
    (flight.value?.readinessChecks ?? []).filter((item) =>
      ['PASS', 'NOT_APPLICABLE'].includes(item.status)
    ).length
);
const readinessGroups = computed(() => {
  const groups = [
    'AIRCRAFT',
    'CREW',
    'MANIFEST',
    'FUEL',
    'STATION',
    'FINANCE',
    'DOCUMENTS'
  ] as const;
  return groups.map((category) => ({
    category,
    items: (flight.value?.readinessChecks ?? []).filter((item) => item.category === category)
  }));
});
const operationalCost = computed(() => {
  if (!flight.value) return 0;
  return (
    flight.value.fuelRequests.reduce((sum, item) => sum + (item.totalCost ?? 0), 0) +
    flight.value.stationCosts.reduce((sum, item) => sum + item.amount, 0) +
    flight.value.maintenanceHandoffs.reduce((sum, item) => sum + item.maintenanceCost, 0)
  );
});
const fuelCost = computed(
  () => flight.value?.fuelRequests.reduce((sum, item) => sum + (item.totalCost ?? 0), 0) ?? 0
);
const stationCostTotal = computed(
  () => flight.value?.stationCosts.reduce((sum, item) => sum + item.amount, 0) ?? 0
);
const maintenanceCost = computed(
  () => flight.value?.maintenanceHandoffs.reduce((sum, item) => sum + item.maintenanceCost, 0) ?? 0
);
const stationEstimate = computed(
  () => flight.value?.stationServices.reduce((sum, item) => sum + (item.referenceRate ?? 0), 0) ?? 0
);
const estimatedMargin = computed(
  () => (flight.value?.estimatedRevenue ?? 0) - operationalCost.value
);
const closureItems = computed(() => {
  const item = flight.value;
  if (!item) return [];
  const missing = new Set(item.closureReadiness.missing);
  return [
    ['Actual departure and arrival', 'actual departure/arrival'],
    ['Final manifest', 'final manifest'],
    ['Actual fuel uplift', 'actual fuel uplift'],
    ['Approved station cost', 'approved station cost'],
    ['Maintenance review', 'maintenance review']
  ].map(([label, requirement]) => ({ label, done: !missing.has(requirement) }));
});
const filteredHistory = computed(() => {
  if (historyFilter.value === 'ALL') return flight.value?.histories ?? [];
  return (flight.value?.histories ?? []).filter((item) => {
    if (historyFilter.value === 'STATUS') return true;
    if (historyFilter.value === 'APPROVAL') return item.actionType === 'APPROVE';
    if (historyFilter.value === 'READINESS') {
      return ['READINESS_EVALUATED', 'BLOCK'].includes(item.actionType);
    }
    return false;
  });
});

function formatDate(value: string | null, dateOnly = false) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: dateOnly ? 'medium' : undefined,
    day: dateOnly ? undefined : '2-digit',
    month: dateOnly ? undefined : 'short',
    year: dateOnly ? undefined : 'numeric',
    hour: dateOnly ? undefined : '2-digit',
    minute: dateOnly ? undefined : '2-digit',
    timeZone: 'Asia/Jayapura',
    timeZoneName: dateOnly ? undefined : 'short'
  }).format(new Date(value));
}

function duration() {
  if (!flight.value?.scheduledDepartureAt || !flight.value.scheduledArrivalAt) return '-';
  const minutes = Math.round(
    (new Date(flight.value.scheduledArrivalAt).getTime() -
      new Date(flight.value.scheduledDepartureAt).getTime()) /
      60_000
  );
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function money(value: number | null, currency = 'IDR') {
  if (value === null) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function statusColor(status: string) {
  if (['PASS', 'APPROVED', 'CONFIRMED', 'AVAILABLE', 'CLOSED'].includes(status)) return 'success';
  if (['FAIL', 'BLOCKED', 'REJECTED', 'CANCELLED'].includes(status)) return 'error';
  if (['PENDING', 'DRAFT', 'REQUESTED', 'WARNING'].includes(status)) return 'warning';
  return 'info';
}

function readinessIcon(category: FlightReadinessCheckDto['category']) {
  return {
    AIRCRAFT: 'mdi-airplane-cog',
    CREW: 'mdi-account-group-outline',
    MANIFEST: 'mdi-clipboard-text-outline',
    FUEL: 'mdi-fuel',
    STATION: 'mdi-airport',
    FINANCE: 'mdi-cash-check',
    DOCUMENTS: 'mdi-file-document-check-outline'
  }[category];
}

function openIssue(item: FlightReadinessCheckDto) {
  selectedIssue.value = item;
  issueDrawer.value = true;
}

function actionUrl(action: string) {
  return `/api/flight-operations/flights/${id.value}/actions/${action}`;
}

async function runAction(action: string) {
  actionError.value = '';
  if (['cancel', 'divert', 'reopen'].includes(action)) {
    reasonAction.value = action as typeof reasonAction.value;
    reasonDialog.value = true;
    return;
  }
  actionLoading.value = true;
  try {
    const body =
      action === 'depart' || action === 'land' ? { actualAt: new Date().toISOString() } : {};
    await fetchApi<FlightOperationDetailDto>(actionUrl(action), { method: 'POST', body });
    await refresh();
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Action failed';
  } finally {
    actionLoading.value = false;
  }
}

async function submitReasonAction() {
  actionLoading.value = true;
  actionError.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(actionUrl(reasonAction.value), {
      method: 'POST',
      body: {
        reasonId: reasonId.value,
        reasonNote: reasonNote.value,
        diversionStationId: diversionStationId.value || undefined
      }
    });
    reasonDialog.value = false;
    reasonId.value = '';
    reasonNote.value = '';
    diversionStationId.value = '';
    await refresh();
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Action failed';
  } finally {
    actionLoading.value = false;
  }
}

function historyActor(item: FlightStatusHistoryDto) {
  if (item.changedByUserId === 'USR-DEMO-ADMIN') return 'Sinta - Operation Manager';
  if (item.changedByUserId === 'USR-001') return 'Rian - OCC Staff';
  return item.changedByUserId ?? 'System';
}
</script>

<template>
  <VContainer class="flight-workspace px-3 py-4 md:px-5" fluid>
    <VBreadcrumbs
      class="mb-2 px-0 py-1 text-sm"
      :items="[
        { title: 'Flight Control', to: '/flights' },
        { title: 'Flight Orders', to: '/flights' },
        { title: flight?.flightNumber ?? 'Flight' }
      ]"
    />

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load flight order.
    </VAlert>
    <VAlert v-if="actionError" closable class="mb-4" type="error" variant="tonal">
      {{ actionError }}
    </VAlert>
    <VAlert
      v-if="flight?.currentStatus === 'PENDING_CLOSURE' && !flight.closureReadiness.allowed"
      class="mb-4"
      type="warning"
      variant="tonal"
    >
      Close Flight is unavailable. Complete:
      {{ flight.closureReadiness.missing.join(', ') }}.
    </VAlert>

    <div v-if="pending" class="py-12">
      <VSkeletonLoader type="heading, paragraph, table" />
    </div>

    <template v-else-if="flight">
      <section class="flight-summary mb-3 border bg-surface px-4 py-3">
        <div class="flex flex-wrap items-start gap-x-6 gap-y-3">
          <div class="min-w-[230px]">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-h5 font-weight-bold text-text-primary">{{ flight.flightNumber }}</h1>
              <FlightsFlightStatusChip :status="flight.currentStatus" />
              <VChip color="neutral" size="small" variant="outlined">
                {{ flight.orderNumber }}
              </VChip>
            </div>
            <div class="mt-1 text-sm text-text-secondary">
              {{ flight.originStationCode }}
              <VIcon class="mx-1" icon="mdi-arrow-right" size="16" />
              {{ flight.destinationStationCode }} · {{ flight.serviceType.replaceAll('_', ' ') }}
            </div>
          </div>

          <div class="summary-field">
            <span>Flight date</span>
            <strong>{{ formatDate(`${flight.flightDate}T00:00:00+09:00`, true) }}</strong>
          </div>
          <div class="summary-field">
            <span>ETD / ETA</span>
            <strong>{{ formatDate(flight.scheduledDepartureAt) }}</strong>
            <small>{{ formatDate(flight.scheduledArrivalAt) }}</small>
          </div>
          <div class="summary-field">
            <span>Aircraft</span>
            <strong>{{ flight.aircraftRegistration ?? 'Unassigned' }}</strong>
            <small>{{ aircraft?.aircraftType ?? '-' }}</small>
          </div>
          <div class="summary-field">
            <span>PIC</span>
            <strong>{{ flight.pilotInCommandName ?? 'Unassigned' }}</strong>
          </div>
          <div class="summary-field min-w-[150px]">
            <span>Readiness</span>
            <div class="flex items-center gap-2">
              <VProgressLinear
                class="w-20"
                color="secondary"
                height="7"
                :model-value="flight.readinessPercent"
                rounded
              />
              <strong>{{ readinessCompleted }}/{{ flight.readinessChecks.length }}</strong>
            </div>
          </div>

          <VSpacer />
          <div class="flex flex-wrap gap-2">
            <VBtn
              v-for="action in validActions"
              :key="action.action"
              :color="action.color"
              :disabled="action.disabled"
              :loading="actionLoading"
              :prepend-icon="action.icon"
              size="small"
              :variant="action.color ? 'flat' : 'tonal'"
              @click="runAction(action.action)"
            >
              {{ action.label }}
            </VBtn>
            <VMenu>
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  aria-label="More flight actions"
                  icon="mdi-dots-vertical"
                  size="small"
                  variant="text"
                />
              </template>
              <VList density="compact">
                <VListItem
                  prepend-icon="mdi-cancel"
                  title="Cancel flight"
                  @click="runAction('cancel')"
                />
                <VListItem
                  v-if="flight.currentStatus === 'IN_PROGRESS'"
                  prepend-icon="mdi-map-marker-alert-outline"
                  title="Divert flight"
                  @click="runAction('divert')"
                />
                <VListItem
                  v-if="flight.currentStatus === 'CLOSED'"
                  prepend-icon="mdi-lock-open-outline"
                  title="Reopen for correction"
                  @click="runAction('reopen')"
                />
              </VList>
            </VMenu>
          </div>
        </div>

        <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div class="status-strip">
            <VIcon icon="mdi-account-box-multiple-outline" />
            <span>Manifest</span>
            <strong>{{ cargoManifest?.status ?? 'NOT STARTED' }}</strong>
          </div>
          <div class="status-strip">
            <VIcon icon="mdi-fuel" />
            <span>Fuel</span>
            <strong>{{ fuel?.status ?? 'NOT STARTED' }}</strong>
          </div>
          <div class="status-strip">
            <VIcon icon="mdi-airport" />
            <span>Handling</span>
            <strong>
              {{ handlingConfirmedCount ? 'PARTIAL' : 'PENDING' }}
            </strong>
          </div>
          <div class="status-strip">
            <VIcon icon="mdi-cash-check" />
            <span>Finance</span>
            <strong>{{
              flight.currentStatus === 'CLOSED' ? 'BILLABLE' : 'NOT YET BILLABLE'
            }}</strong>
          </div>
        </div>
      </section>

      <VTabs v-model="activeTab" class="workspace-tabs mb-4 border-b bg-background" show-arrows>
        <VTab value="overview">Overview</VTab>
        <VTab value="readiness">Readiness</VTab>
        <VTab value="assignment">Assignment</VTab>
        <VTab value="approval">Status & Approval</VTab>
        <VTab value="records">Related Records</VTab>
        <VTab value="history">History</VTab>
      </VTabs>

      <VWindow v-model="activeTab">
        <VWindowItem value="overview">
          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div class="space-y-4">
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-airplane-settings" />
                  <h2>Flight Information</h2>
                </div>
                <div class="detail-grid">
                  <div>
                    <span>Flight number</span>
                    <strong>{{ flight.flightNumber }}</strong>
                  </div>
                  <div>
                    <span>Flight type</span>
                    <strong>{{ flight.serviceType.replaceAll('_', ' ') }}</strong>
                  </div>
                  <div>
                    <span>Operational date</span>
                    <strong>{{ flight.flightDate }}</strong>
                  </div>
                  <div>
                    <span>Duration</span>
                    <strong>{{ duration() }}</strong>
                  </div>
                  <div>
                    <span>Departure</span>
                    <strong>{{ flight.originStationCode }}</strong>
                  </div>
                  <div>
                    <span>Arrival</span>
                    <strong>{{ flight.destinationStationCode }}</strong>
                  </div>
                  <div>
                    <span>Customer</span>
                    <strong>{{ flight.customerName ?? '-' }}</strong>
                  </div>
                  <div>
                    <span>Request source</span>
                    <strong>{{ flight.requestSource }}</strong>
                  </div>
                  <div>
                    <span>Priority</span>
                    <FlightsFlightStatusChip :status="flight.priority" />
                  </div>
                  <div class="sm:col-span-2 lg:col-span-3">
                    <span>Operational notes</span>
                    <strong>{{ flight.remarks ?? '-' }}</strong>
                  </div>
                </div>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-account-tie-hat-outline" />
                  <h2>Aircraft & Crew Summary</h2>
                </div>
                <div class="detail-grid">
                  <div>
                    <span>Registration</span>
                    <strong>{{ aircraft?.registrationNumber ?? '-' }}</strong>
                  </div>
                  <div>
                    <span>Aircraft type</span>
                    <strong>{{ aircraft?.aircraftType ?? '-' }}</strong>
                  </div>
                  <div>
                    <span>Capacity</span>
                    <strong>
                      {{ aircraft?.passengerCapacity ?? 0 }} pax /
                      {{ aircraft?.cargoCapacityKg ?? 0 }} kg
                    </strong>
                  </div>
                  <div>
                    <span>Current station</span>
                    <strong>{{ aircraftStationCode(aircraft) }}</strong>
                  </div>
                  <div>
                    <span>Serviceability</span>
                    <FlightsFlightStatusChip
                      :status="aircraft?.serviceabilityStatus ?? 'UNKNOWN'"
                    />
                  </div>
                  <div>
                    <span>Fuel type</span>
                    <strong>{{ aircraft?.fuelType ?? '-' }}</strong>
                  </div>
                  <div>
                    <span>Maintenance due</span>
                    <strong>{{ aircraft?.nextMaintenanceDueAt ?? '-' }}</strong>
                  </div>
                  <div v-for="member in flight.crewAssignments" :key="member.id">
                    <span>{{ member.assignmentRole.replaceAll('_', ' ') }}</span>
                    <strong>{{ member.crewName }}</strong>
                  </div>
                </div>
              </section>

              <section>
                <div class="mb-2 flex items-center justify-between">
                  <h2 class="text-subtitle-1 font-weight-bold">Operational Snapshot</h2>
                  <span class="text-xs text-text-secondary">Flight-linked records</span>
                </div>
                <div class="snapshot-grid">
                  <div>
                    <VIcon icon="mdi-account-multiple-outline" />
                    <span>Passenger manifest</span>
                    <strong>{{ passengerManifest?.passengerCount ?? 0 }} pax</strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-package-variant-closed" />
                    <span>Cargo manifest</span>
                    <strong>
                      {{ cargoManifest?.cargoActualWeightKg ?? 0 }} /
                      {{ aircraft?.cargoCapacityKg ?? 0 }} kg
                    </strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-fuel" />
                    <span>Fuel request</span>
                    <strong>{{ fuel?.requestedQuantityLitre ?? 0 }} L</strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-airport" />
                    <span>Station handling</span>
                    <strong>
                      {{ handlingConfirmedCount }}/{{ flight.stationServices.length }} confirmed
                    </strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-playlist-check" />
                    <span>Readiness</span>
                    <strong>
                      {{ readinessCompleted }}/{{ flight.readinessChecks.length }} complete
                    </strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-account-check-outline" />
                    <span>Approval owner</span>
                    <strong>{{ currentApprovalOwner }}</strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-lock-clock-outline" />
                    <span>Closure</span>
                    <strong>{{
                      flight.currentStatus === 'CLOSED' ? 'Complete' : 'Not started'
                    }}</strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-cash-multiple" />
                    <span>Revenue estimate</span>
                    <strong>{{ money(flight.estimatedRevenue) }}</strong>
                  </div>
                </div>
              </section>
            </div>

            <aside class="space-y-4">
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon color="warning" icon="mdi-alert-outline" />
                  <h2>Alerts & Exceptions</h2>
                  <VChip color="error" size="x-small" variant="tonal">
                    {{ blockingIssues.length }}
                  </VChip>
                </div>
                <div v-if="blockingIssues.length === 0" class="empty-compact">
                  <VIcon color="success" icon="mdi-check-circle-outline" />
                  No blocking issue
                </div>
                <button
                  v-for="item in blockingIssues"
                  :key="item.id"
                  class="alert-row"
                  type="button"
                  @click="openIssue(item)"
                >
                  <VIcon :color="statusColor(item.status)" icon="mdi-alert-circle-outline" />
                  <span>
                    <strong>{{ item.checkName }}</strong>
                    <small>{{ item.resultNote }}</small>
                  </span>
                  <VIcon icon="mdi-chevron-right" />
                </button>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-timeline-clock-outline" />
                  <h2>Lifecycle</h2>
                </div>
                <div class="lifecycle-mini">
                  <div
                    v-for="(status, index) in lifecycle"
                    :key="status"
                    :class="{
                      active: status === flight.currentStatus,
                      complete:
                        lifecycle.indexOf(flight.currentStatus as (typeof lifecycle)[number]) >
                        index
                    }"
                  >
                    <span />
                    <small>{{ status.replaceAll('_', ' ') }}</small>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </VWindowItem>

        <VWindowItem value="readiness">
          <section class="readiness-summary mb-4">
            <div>
              <span>Overall readiness</span>
              <strong>{{ readinessCompleted }} of {{ flight.readinessChecks.length }}</strong>
            </div>
            <div>
              <span>Status</span>
              <FlightsFlightStatusChip :status="blockingIssues.length ? 'BLOCKED' : 'READY'" />
            </div>
            <div>
              <span>Blocking issues</span>
              <strong class="text-error">{{ blockingIssues.length }}</strong>
            </div>
            <div>
              <span>Warnings</span>
              <strong class="text-warning">{{ warningIssues.length }}</strong>
            </div>
            <VSpacer />
            <VBtn prepend-icon="mdi-playlist-check" variant="tonal" @click="runAction('evaluate')">
              Run Readiness Check
            </VBtn>
            <VTooltip
              :text="
                blockingIssues.length
                  ? 'Clear blocking issues before requesting approval.'
                  : 'Request approval'
              "
            >
              <template #activator="{ props }">
                <span v-bind="props">
                  <VBtn
                    color="secondary"
                    :disabled="blockingIssues.length > 0"
                    prepend-icon="mdi-send-check-outline"
                  >
                    Request Approval
                  </VBtn>
                </span>
              </template>
            </VTooltip>
          </section>

          <div class="grid gap-4 lg:grid-cols-2">
            <section v-for="group in readinessGroups" :key="group.category" class="workspace-panel">
              <div class="panel-title">
                <VIcon :icon="readinessIcon(group.category)" />
                <h2>{{ group.category }} Readiness</h2>
              </div>
              <button
                v-for="item in group.items"
                :key="item.id"
                class="check-row"
                type="button"
                @click="openIssue(item)"
              >
                <VIcon
                  :color="statusColor(item.status)"
                  :icon="
                    item.status === 'PASS'
                      ? 'mdi-check-circle'
                      : item.status === 'FAIL'
                        ? 'mdi-close-circle'
                        : 'mdi-clock-alert-outline'
                  "
                />
                <span>
                  <strong>{{ item.checkName }}</strong>
                  <small>{{ item.resultNote }}</small>
                </span>
                <FlightsFlightStatusChip :status="item.status" />
                <VIcon icon="mdi-chevron-right" size="18" />
              </button>
              <div v-if="group.items.length === 0" class="empty-compact">No check configured.</div>
            </section>
          </div>
        </VWindowItem>

        <VWindowItem value="assignment">
          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div class="space-y-4">
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-airplane-edit" />
                  <h2>Aircraft Assignment</h2>
                  <VSpacer />
                  <VBtn disabled prepend-icon="mdi-swap-horizontal" size="small" variant="tonal">
                    Change Aircraft
                  </VBtn>
                </div>
                <div class="assignment-hero">
                  <div class="registration">{{ aircraft?.registrationNumber ?? '-' }}</div>
                  <div>
                    <strong>{{ aircraft?.aircraftType }}</strong>
                    <span>{{ aircraft?.manufacturer }} {{ aircraft?.model }}</span>
                  </div>
                  <div>
                    <span>Current station</span>
                    <strong>{{ aircraftStationCode(aircraft) }}</strong>
                  </div>
                  <div>
                    <span>Capacity</span>
                    <strong>
                      {{ aircraft?.passengerCapacity }} pax / {{ aircraft?.cargoCapacityKg }} kg
                    </strong>
                  </div>
                  <div>
                    <span>Maintenance due</span>
                    <strong>{{ aircraft?.nextMaintenanceDueAt ?? '-' }}</strong>
                  </div>
                </div>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-airplane-search" />
                  <h2>Aircraft Alternatives</h2>
                </div>
                <VTable density="compact" hover>
                  <thead>
                    <tr>
                      <th>Aircraft</th>
                      <th>Station</th>
                      <th>Capacity</th>
                      <th>Serviceability</th>
                      <th>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in aircraftOptions" :key="item.id">
                      <td>
                        <strong>{{ item.registrationNumber }}</strong>
                        <div class="text-xs">{{ item.aircraftType }}</div>
                      </td>
                      <td>{{ aircraftStationCode(item) }}</td>
                      <td>{{ item.passengerCapacity }} pax / {{ item.cargoCapacityKg }} kg</td>
                      <td><FlightsFlightStatusChip :status="item.serviceabilityStatus" /></td>
                      <td>
                        <VChip
                          :color="
                            item.id === flight.aircraftId
                              ? 'success'
                              : item.serviceabilityStatus === 'SERVICEABLE'
                                ? 'info'
                                : 'warning'
                          "
                          size="small"
                          variant="tonal"
                        >
                          {{
                            item.id === flight.aircraftId
                              ? 'Recommended'
                              : item.serviceabilityStatus === 'SERVICEABLE'
                                ? 'Available'
                                : 'Not recommended'
                          }}
                        </VChip>
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-account-group-outline" />
                  <h2>Crew Assignment</h2>
                </div>
                <VTable density="compact" hover>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Crew</th>
                      <th>License</th>
                      <th>Medical</th>
                      <th>Station</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="member in flight.crewAssignments" :key="member.id">
                      <td>{{ member.assignmentRole.replaceAll('_', ' ') }}</td>
                      <td>
                        <strong>{{ member.crewName }}</strong>
                        <div class="text-xs">{{ member.employeeCode }}</div>
                      </td>
                      <td>{{ member.licenseExpiryDate ?? '-' }}</td>
                      <td>{{ member.medicalExpiryDate ?? '-' }}</td>
                      <td>{{ member.dutyStationCode ?? member.baseStationCode ?? '-' }}</td>
                      <td><FlightsFlightStatusChip :status="member.availabilityStatus" /></td>
                    </tr>
                  </tbody>
                </VTable>
              </section>
            </div>

            <aside class="workspace-panel self-start">
              <div class="panel-title">
                <VIcon color="warning" icon="mdi-alert-decagram-outline" />
                <h2>Conflict Detector</h2>
              </div>
              <div v-for="item in assignmentIssues" :key="item.id" class="conflict-item">
                <FlightsFlightStatusChip :status="item.status" />
                <strong>{{ item.checkName }}</strong>
                <p>{{ item.resultNote }}</p>
                <small>{{ item.recommendedAction }}</small>
                <VBtn class="mt-2" size="small" variant="text" @click="openIssue(item)">
                  Review conflict
                </VBtn>
              </div>
              <div v-if="assignmentIssues.length === 0" class="empty-compact">
                No assignment conflict.
              </div>
              <VDivider class="my-4" />
              <VTextarea label="Dispatch note" rows="2" variant="outlined" />
              <VTextarea label="Crew instruction" rows="2" variant="outlined" />
            </aside>
          </div>
        </VWindowItem>

        <VWindowItem value="approval">
          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div class="space-y-4">
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-timeline-check-outline" />
                  <h2>Lifecycle Timeline</h2>
                </div>
                <div class="lifecycle-full">
                  <div
                    v-for="(status, index) in lifecycle"
                    :key="status"
                    :class="{
                      active: status === flight.currentStatus,
                      complete:
                        lifecycle.indexOf(flight.currentStatus as (typeof lifecycle)[number]) >
                        index
                    }"
                  >
                    <span>{{ Number(index) + 1 }}</span>
                    <strong>{{ status.replaceAll('_', ' ') }}</strong>
                  </div>
                </div>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-shield-check-outline" />
                  <h2>Approval Stages</h2>
                </div>
                <div
                  v-for="(approval, index) in flight.approvals"
                  :key="approval.id"
                  class="approval-row"
                >
                  <span class="approval-index">{{ Number(index) + 1 }}</span>
                  <div>
                    <strong>{{ approval.approvalType.replaceAll('_', ' ') }}</strong>
                    <small>Approver: {{ approval.assignedRole }}</small>
                  </div>
                  <div>
                    <span>Requested</span>
                    <strong>{{ formatDate(approval.requestedAt) }}</strong>
                  </div>
                  <FlightsFlightStatusChip :status="approval.status" />
                </div>
              </section>
            </div>

            <aside class="space-y-4">
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-state-machine" />
                  <h2>Current Status</h2>
                </div>
                <div class="detail-stack">
                  <span>Current state</span>
                  <FlightsFlightStatusChip :status="flight.currentStatus" />
                  <span>Next allowed action</span>
                  <strong>{{ validActions[0]?.label ?? 'No forward action' }}</strong>
                  <span>Blocking reason</span>
                  <strong>{{
                    flight.blockingReason ?? (blockingIssues[0]?.resultNote || 'None')
                  }}</strong>
                </div>
              </section>
              <VAlert type="info" variant="tonal">
                <strong>Separation of duties</strong>
                <div class="mt-2 text-sm">
                  The request creator cannot approve the same flight. Finance reviewers cannot
                  change flight actuals.
                </div>
              </VAlert>
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-form-select" />
                  <h2>Status Controls</h2>
                </div>
                <VBtn
                  v-for="action in validActions"
                  :key="action.action"
                  block
                  class="mb-2"
                  :color="action.color"
                  :disabled="action.disabled"
                  :prepend-icon="action.icon"
                  :variant="action.color ? 'flat' : 'tonal'"
                  @click="runAction(action.action)"
                >
                  {{ action.label }}
                </VBtn>
              </section>
            </aside>
          </div>
        </VWindowItem>

        <VWindowItem value="records">
          <div class="records-grid">
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-account-multiple-outline" />
                <h2>Passenger Manifest</h2>
                <FlightsFlightStatusChip :status="passengerManifest?.status ?? 'NOT_STARTED'" />
              </div>
              <dl>
                <dt>Passenger count</dt>
                <dd>
                  {{ passengerManifest?.passengerCount ?? 0 }} /
                  {{ aircraft?.passengerCapacity ?? 0 }}
                </dd>
                <dt>Baggage</dt>
                <dd>{{ passengerManifest?.passengerWeightKg ?? 0 }} kg total weight</dd>
                <dt>Check-in</dt>
                <dd>{{ flight.currentStatus === 'CHECK_IN_OPEN' ? 'Open' : 'Not opened' }}</dd>
              </dl>
              <VBtn
                append-icon="mdi-open-in-new"
                size="small"
                to="/flights/manifest"
                variant="text"
              >
                Open Passenger Manifest
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-package-variant-closed" />
                <h2>Cargo Manifest</h2>
                <FlightsFlightStatusChip :status="cargoManifest?.status ?? 'NOT_STARTED'" />
              </div>
              <dl>
                <dt>Total cargo</dt>
                <dd>
                  {{ cargoManifest?.cargoActualWeightKg ?? 0 }} /
                  {{ aircraft?.cargoCapacityKg ?? 0 }} kg
                </dd>
                <dt>AWB count</dt>
                <dd>{{ cargoManifest?.cargoCount ?? 0 }}</dd>
                <dt>Dangerous Goods</dt>
                <dd>{{ cargoManifest?.dgPendingCount ? 'Pending review' : 'No pending DG' }}</dd>
              </dl>
              <VBtn
                append-icon="mdi-open-in-new"
                size="small"
                to="/flights/manifest"
                variant="text"
              >
                Open Cargo Manifest
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-fuel" />
                <h2>Fuel Request</h2>
                <FlightsFlightStatusChip :status="fuel?.status ?? 'NOT_STARTED'" />
              </div>
              <dl>
                <dt>Supplier</dt>
                <dd>{{ fuel?.supplierName ?? '-' }}</dd>
                <dt>Requested</dt>
                <dd>{{ fuel?.requestedQuantityLitre ?? 0 }} L</dd>
                <dt>Approved</dt>
                <dd>{{ fuel?.approvedQuantityLitre ?? 'Pending' }}</dd>
                <dt>Estimated cost</dt>
                <dd>{{ money(fuel?.totalCost ?? null) }}</dd>
              </dl>
              <VBtn append-icon="mdi-open-in-new" size="small" to="/flights/fuel" variant="text">
                Open Fuel Request
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-airport" />
                <h2>Station Handling</h2>
              </div>
              <div v-for="service in flight.stationServices" :key="service.id" class="service-line">
                <span>{{ service.stationCode }} · {{ service.serviceType }}</span>
                <FlightsFlightStatusChip :status="service.status" />
              </div>
              <dl>
                <dt>Estimated station cost</dt>
                <dd>{{ money(stationEstimate) }}</dd>
              </dl>
              <VBtn
                append-icon="mdi-open-in-new"
                size="small"
                to="/flights/station-operations"
                variant="text"
              >
                Open Station Handling
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-airplane-clock" />
                <h2>Flight Actual</h2>
              </div>
              <dl>
                <dt>Actual departure</dt>
                <dd>{{ formatDate(flight.actualDepartureAt) }}</dd>
                <dt>Actual arrival</dt>
                <dd>{{ formatDate(flight.actualArrivalAt) }}</dd>
                <dt>Status</dt>
                <dd>{{ flight.actualArrivalAt ? 'Recorded' : 'Not started' }}</dd>
              </dl>
              <VBtn
                append-icon="mdi-open-in-new"
                size="small"
                to="/flights/actual-closure"
                variant="text"
              >
                Record Flight Actual
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-lock-check-outline" />
                <h2>Closure Summary</h2>
                <FlightsFlightStatusChip
                  :status="flight.currentStatus === 'CLOSED' ? 'CLOSED' : 'NOT_STARTED'"
                />
              </div>
              <div v-for="item in closureItems" :key="item.label" class="closure-line">
                <VIcon
                  :color="item.done ? 'success' : 'warning'"
                  :icon="item.done ? 'mdi-check-circle' : 'mdi-clock-outline'"
                />
                <span>{{ item.label }}</span>
              </div>
              <VBtn
                append-icon="mdi-open-in-new"
                size="small"
                to="/flights/actual-closure"
                variant="text"
              >
                Start Flight Closure
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-calculator-variant-outline" />
                <h2>Cost Summary</h2>
              </div>
              <dl>
                <dt>Fuel cost</dt>
                <dd>{{ money(fuelCost) }}</dd>
                <dt>Station cost</dt>
                <dd>{{ money(stationCostTotal) }}</dd>
                <dt>Maintenance</dt>
                <dd>{{ money(maintenanceCost) }}</dd>
                <dt>Total operational cost</dt>
                <dd class="font-weight-bold">{{ money(operationalCost) }}</dd>
              </dl>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-file-document-outline" />
                <h2>Billing & Invoice</h2>
                <FlightsFlightStatusChip
                  :status="flight.currentStatus === 'CLOSED' ? 'READY' : 'NOT_YET_BILLABLE'"
                />
              </div>
              <dl>
                <dt>Customer</dt>
                <dd>{{ flight.customerName }}</dd>
                <dt>Estimated revenue</dt>
                <dd>{{ money(flight.estimatedRevenue) }}</dd>
                <dt>Estimated margin</dt>
                <dd>{{ money(estimatedMargin) }}</dd>
                <dt>Invoice</dt>
                <dd>{{ flight.currentStatus === 'CLOSED' ? 'Ready for draft' : '-' }}</dd>
              </dl>
            </section>
            <section class="record-panel xl:col-span-2">
              <div class="record-head">
                <VIcon icon="mdi-paperclip" />
                <h2>Attachments</h2>
              </div>
              <div class="attachment-grid">
                <div v-for="item in flight.attachments" :key="item.id">
                  <VIcon icon="mdi-file-document-outline" />
                  <span>
                    <strong>{{ item.fileName }}</strong>
                    <small>{{ item.documentType.replaceAll('_', ' ') }}</small>
                  </span>
                  <FlightsFlightStatusChip :status="item.status" />
                </div>
              </div>
            </section>
          </div>
        </VWindowItem>

        <VWindowItem value="history">
          <section class="workspace-panel">
            <div class="panel-title">
              <VIcon icon="mdi-history" />
              <h2>Operational Audit Trail</h2>
              <VSpacer />
              <VBtnToggle
                v-model="historyFilter"
                color="secondary"
                density="compact"
                mandatory
                variant="outlined"
              >
                <VBtn value="ALL">All</VBtn>
                <VBtn value="STATUS">Status</VBtn>
                <VBtn value="READINESS">Readiness</VBtn>
                <VBtn value="APPROVAL">Approval</VBtn>
              </VBtnToggle>
            </div>
            <VTable density="comfortable" hover>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User / Role</th>
                  <th>Activity</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredHistory" :key="item.id">
                  <td>{{ formatDate(item.changedAt) }}</td>
                  <td>{{ historyActor(item) }}</td>
                  <td>{{ item.actionType.replaceAll('_', ' ') }}</td>
                  <td>{{ item.fromStatus?.replaceAll('_', ' ') ?? 'None' }}</td>
                  <td><FlightsFlightStatusChip :status="item.toStatus" /></td>
                  <td>{{ item.reasonNote ?? item.reasonLabel ?? '-' }}</td>
                </tr>
              </tbody>
            </VTable>
          </section>
        </VWindowItem>
      </VWindow>

      <VNavigationDrawer v-model="issueDrawer" location="right" temporary width="430">
        <div v-if="selectedIssue" class="pa-5">
          <div class="mb-5 flex items-start gap-3">
            <VIcon
              :color="statusColor(selectedIssue.status)"
              icon="mdi-alert-circle-outline"
              size="30"
            />
            <div>
              <div class="text-xs text-text-secondary">{{ selectedIssue.category }}</div>
              <h2 class="text-h6">{{ selectedIssue.checkName }}</h2>
            </div>
            <VSpacer />
            <VBtn
              aria-label="Close issue drawer"
              icon="mdi-close"
              variant="text"
              @click="issueDrawer = false"
            />
          </div>
          <VAlert :type="selectedIssue.status === 'FAIL' ? 'error' : 'warning'" variant="tonal">
            {{ selectedIssue.resultNote }}
          </VAlert>
          <div class="detail-stack mt-5">
            <span>Affected data</span>
            <strong>{{ selectedIssue.sourceReference ?? '-' }}</strong>
            <span>Owner role</span>
            <strong>{{ selectedIssue.ownerRole }}</strong>
            <span>Recommended action</span>
            <strong>{{ selectedIssue.recommendedAction }}</strong>
          </div>
          <VBtn
            v-if="selectedIssue.actionHref"
            block
            class="mt-6"
            color="secondary"
            :to="selectedIssue.actionHref"
          >
            Open affected module
          </VBtn>
        </div>
      </VNavigationDrawer>

      <VDialog v-model="reasonDialog" max-width="540">
        <VCard>
          <VCardTitle class="text-capitalize">
            {{ reasonAction.replace('-', ' ') }} flight
          </VCardTitle>
          <VCardText>
            <VAlert class="mb-4" type="warning" variant="tonal">
              This action is recorded in the flight audit trail.
            </VAlert>
            <FlightReasonSelect v-model="reasonId" :allow-create="true" label="Reason" />
            <StationSelect
              v-if="reasonAction === 'divert'"
              v-model="diversionStationId"
              :allow-create="true"
              label="New destination"
            />
            <VTextarea v-model="reasonNote" label="Operational note" rows="3" variant="outlined" />
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="reasonDialog = false">Back</VBtn>
            <VBtn
              color="error"
              :disabled="!reasonId"
              :loading="actionLoading"
              @click="submitReasonAction"
            >
              Confirm action
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </template>
  </VContainer>
</template>

<style scoped>
.flight-workspace {
  max-width: 1680px;
}
.flight-summary {
  position: sticky;
  top: 64px;
  z-index: 8;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgb(15 23 42 / 7%);
}
.workspace-tabs {
  position: sticky;
  top: 202px;
  z-index: 7;
}
.summary-field {
  display: flex;
  min-width: 120px;
  flex-direction: column;
  gap: 1px;
}
.summary-field span,
.detail-grid span,
.detail-stack > span,
.readiness-summary span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
  text-transform: uppercase;
}
.summary-field strong {
  font-size: 13px;
}
.summary-field small {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
}
.status-strip {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  border-left: 3px solid rgb(var(--v-theme-secondary));
  background: rgb(var(--v-theme-background));
  padding: 6px 10px;
  font-size: 11px;
}
.status-strip strong {
  font-size: 11px;
}
.workspace-panel,
.record-panel {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  padding: 16px;
}
.panel-title,
.record-head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
}
.panel-title h2,
.record-head h2 {
  font-size: 14px;
  font-weight: 700;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 22px;
}
.detail-grid > div,
.detail-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-grid strong {
  font-size: 13px;
}
.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.snapshot-grid > div {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 2px 8px;
  min-height: 76px;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 6px;
  padding: 12px;
}
.snapshot-grid span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
}
.snapshot-grid strong {
  grid-column: 2;
  font-size: 14px;
}
.alert-row,
.check-row {
  display: grid;
  width: 100%;
  align-items: center;
  border-top: 1px solid rgb(var(--v-theme-border));
  text-align: left;
}
.alert-row {
  grid-template-columns: 24px 1fr 20px;
  gap: 8px;
  padding: 11px 2px;
}
.check-row {
  grid-template-columns: 28px 1fr auto 20px;
  gap: 8px;
  padding: 10px 2px;
}
.alert-row span,
.check-row span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.alert-row strong,
.check-row strong {
  font-size: 12px;
}
.alert-row small,
.check-row small {
  overflow: hidden;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 84px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 12px;
}
.lifecycle-mini {
  display: flex;
  flex-direction: column;
}
.lifecycle-mini > div {
  display: grid;
  grid-template-columns: 18px 1fr;
  min-height: 27px;
  color: rgb(var(--v-theme-text-secondary));
}
.lifecycle-mini > div span {
  width: 9px;
  height: 9px;
  margin-top: 3px;
  border: 2px solid rgb(var(--v-theme-border));
  border-radius: 50%;
}
.lifecycle-mini > div:not(:last-child) span::after {
  display: block;
  width: 1px;
  height: 20px;
  margin: 7px 0 0 2px;
  background: rgb(var(--v-theme-border));
  content: '';
}
.lifecycle-mini .complete span {
  border-color: rgb(var(--v-theme-success));
  background: rgb(var(--v-theme-success));
}
.lifecycle-mini .active {
  color: rgb(var(--v-theme-secondary));
  font-weight: 700;
}
.lifecycle-mini .active span {
  border-color: rgb(var(--v-theme-secondary));
}
.readiness-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  padding: 14px 16px;
}
.readiness-summary > div {
  display: flex;
  min-width: 100px;
  flex-direction: column;
}
.readiness-summary strong {
  font-size: 18px;
}
.assignment-hero {
  display: grid;
  grid-template-columns: 120px repeat(4, minmax(0, 1fr));
  align-items: center;
  gap: 18px;
}
.assignment-hero > div {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}
.assignment-hero .registration {
  color: rgb(var(--v-theme-brand-primary));
  font-size: 24px;
  font-weight: 800;
}
.conflict-item {
  border-left: 3px solid rgb(var(--v-theme-warning));
  padding: 10px 12px;
  background: rgb(var(--v-theme-background));
}
.conflict-item strong,
.conflict-item small {
  display: block;
  margin-top: 6px;
}
.conflict-item p {
  margin-top: 4px;
  font-size: 12px;
}
.lifecycle-full {
  display: grid;
  grid-template-columns: repeat(9, minmax(70px, 1fr));
  overflow-x: auto;
}
.lifecycle-full > div {
  position: relative;
  display: flex;
  min-width: 100px;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  color: rgb(var(--v-theme-text-secondary));
  text-align: center;
}
.lifecycle-full > div::before {
  position: absolute;
  top: 14px;
  right: 50%;
  left: -50%;
  height: 2px;
  background: rgb(var(--v-theme-border));
  content: '';
}
.lifecycle-full > div:first-child::before {
  display: none;
}
.lifecycle-full span {
  z-index: 1;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 2px solid rgb(var(--v-theme-border));
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  font-size: 11px;
}
.lifecycle-full strong {
  font-size: 10px;
}
.lifecycle-full .complete span {
  border-color: rgb(var(--v-theme-success));
  background: rgb(var(--v-theme-success));
  color: white;
}
.lifecycle-full .active span {
  border-color: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-secondary));
}
.approval-row {
  display: grid;
  grid-template-columns: 30px minmax(220px, 1fr) minmax(150px, 0.5fr) auto;
  align-items: center;
  gap: 12px;
  border-top: 1px solid rgb(var(--v-theme-border));
  padding: 12px 0;
}
.approval-index {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 50%;
  background: rgb(var(--v-theme-background));
  font-size: 11px;
}
.approval-row > div {
  display: flex;
  flex-direction: column;
}
.approval-row small,
.approval-row div > span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
}
.records-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.record-head {
  min-height: 28px;
}
.record-head h2 {
  flex: 1;
}
.record-panel dl {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 7px 12px;
  margin-bottom: 8px;
  font-size: 12px;
}
.record-panel dt {
  color: rgb(var(--v-theme-text-secondary));
}
.record-panel dd {
  text-align: right;
}
.service-line,
.closure-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid rgb(var(--v-theme-border));
  padding: 8px 0;
  font-size: 12px;
}
.closure-line {
  justify-content: flex-start;
}
.attachment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}
.attachment-grid > div {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: center;
  gap: 8px;
  border-top: 1px solid rgb(var(--v-theme-border));
  padding: 9px 0;
}
.attachment-grid span {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}
.attachment-grid small {
  color: rgb(var(--v-theme-text-secondary));
}
@media (max-width: 1200px) {
  .snapshot-grid,
  .records-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .assignment-hero {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .workspace-tabs {
    top: 250px;
  }
}
@media (max-width: 700px) {
  .flight-summary {
    position: static;
  }
  .workspace-tabs {
    position: static;
  }
  .detail-grid,
  .snapshot-grid,
  .records-grid,
  .attachment-grid {
    grid-template-columns: 1fr;
  }
  .assignment-hero {
    grid-template-columns: 1fr 1fr;
  }
  .approval-row {
    grid-template-columns: 30px 1fr auto;
  }
  .approval-row > div:nth-child(3) {
    display: none;
  }
}
</style>
