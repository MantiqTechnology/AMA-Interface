<script setup lang="ts">
import type { LocalUploadDto } from '#shared/contracts/uploads';
import {
  normalizeStationWorkspaceTab,
  type StationWorkspaceTab
} from '../../../utils/operations/station-workspace-navigation';

type Task = {
  id: string;
  stationId: string;
  stationCode: string;
  taskCode: string;
  taskTitle: string;
  status: string;
  phase: string;
  requiresEvidence: boolean;
  notes: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  version: number;
  evidenceCount: number;
  stationDecision: string | null;
  occDecision: string | null;
};

type WorkbenchFlight = {
  flightId: string;
  flightNumber: string;
  flightDate: string;
  aircraftType: string;
  originStationId: string;
  originStationCode: string;
  destinationStationId: string;
  destinationStationCode: string;
  scheduledDepartureAt: string;
  actualDepartureAt: string | null;
  actualArrivalAt: string | null;
  currentStatusCode: string;
  serviceTypeCode: string;
  passengerTotal: number;
  passengerActual: number;
  cargoWeightKg: number;
  tasks: Task[];
  services: Array<{
    id: string;
    stationId: string;
    stationCode: string;
    serviceSupplierId: string;
    serviceType: string;
    serviceTypeId: string;
    supplierName: string;
    status: string;
    referenceRate: number | null;
    confirmedAt: string | null;
    confirmedByUserId: string | null;
    rejectionNote: string | null;
    version: number;
  }>;
  costs: Array<{
    id: string;
    stationId: string;
    stationCode: string;
    vendorId: string | null;
    vendorName: string | null;
    costCategoryId: string;
    costCategoryName: string;
    description: string;
    amount: number;
    currencyId: string;
    currencyCode: string;
    status: string;
    submittedByUserId: string | null;
    approvedByUserId: string | null;
    approvedAt: string | null;
    version: number;
  }>;
  evidence: Array<{
    id: string;
    stationTaskId: string | null;
    uploadId: string | null;
    taskCode: string | null;
    documentType: string;
    fileName: string;
    notes: string | null;
    uploadedByUserId: string;
    uploadedAt: string;
  }>;
  reconciliation: {
    plannedPassengers: number;
    actualPassengers: number;
    plannedCargoKg: number;
    actualCargoKg: number;
    noShowPassengers: number;
    offloadedCargoKg: number;
    totalDiscrepancyNote: string | null;
    version: number;
  } | null;
  audit: Array<{
    id: string;
    actorUserId: string;
    actorRole: string;
    module: string;
    action: string;
    beforeStatus: string | null;
    afterStatus: string | null;
    reason: string | null;
    timestamp: string;
  }>;
};

const route = useRoute();
const flightId = computed(() => String(route.params.flightId));
const selectedPhase = ref(
  typeof route.query.phase === 'string' ? route.query.phase : 'ORIGIN_DEPARTURE'
);
const activeTab = computed<StationWorkspaceTab>({
  get: () => normalizeStationWorkspaceTab(route.query.tab),
  set: (tab) => {
    if (route.query.tab === tab) return;
    void navigateTo({ query: { ...route.query, tab } });
  }
});
const loadingId = ref('');
const actionError = ref('');
const actionSuccess = ref('');
const { can } = useAuthorization();

const {
  data: flights,
  pending,
  error,
  refresh
} = await useAsyncData(
  () => `station-flight-workspace-${flightId.value}`,
  () =>
    fetchApi<WorkbenchFlight[]>('/api/flight-operations/station-operations', {
      query: { flightId: flightId.value }
    }),
  { default: () => [] }
);
const flight = computed(() => flights.value[0] ?? null);
const sourceRecordId = computed(() =>
  typeof route.query.sourceRecordId === 'string' ? route.query.sourceRecordId : null
);
const selectedService = computed(
  () => flight.value?.services.find((service) => service.id === sourceRecordId.value) ?? null
);
const selectedCost = computed(
  () => flight.value?.costs.find((cost) => cost.id === sourceRecordId.value) ?? null
);
const detailDrawerOpen = computed({
  get: () => Boolean(selectedService.value || selectedCost.value),
  set: (open) => {
    if (open) return;
    const query = { ...route.query };
    delete query.sourceRecordId;
    void navigateTo({ query }, { replace: true });
  }
});
const stationCode = computed(() =>
  selectedPhase.value.startsWith('ORIGIN')
    ? flight.value?.originStationCode
    : flight.value?.destinationStationCode
);
const tasks = computed(() =>
  (flight.value?.tasks ?? []).filter((task) => task.phase === selectedPhase.value)
);
const signoffTasks = computed(() =>
  tasks.value.filter((task) => task.taskCode.endsWith('STATION_SIGNOFF'))
);
function taskBlocker(task: Task) {
  if (task.requiresEvidence && task.evidenceCount === 0) {
    return 'Attach evidence before verification.';
  }
  if (task.taskCode === 'ORIGIN_HANDLING') {
    const handlingReady = flight.value?.services.some(
      (service) =>
        service.stationCode === task.stationCode &&
        service.serviceType === 'HANDLING' &&
        ['CONFIRMED', 'COMPLETED'].includes(service.status)
    );
    if (!handlingReady) return 'Confirm the origin handling service first.';
  }
  if (task.taskCode.endsWith('STATION_SIGNOFF')) {
    const prefix = task.taskCode.startsWith('ORIGIN_') ? 'ORIGIN_' : 'DESTINATION_';
    const incomplete = (flight.value?.tasks ?? []).filter(
      (candidate) =>
        candidate.id !== task.id &&
        candidate.stationId === task.stationId &&
        candidate.taskCode.startsWith(prefix) &&
        candidate.status !== 'VERIFIED'
    );
    if (incomplete.length) return `Complete ${incomplete.length} remaining station task(s) first.`;
  }
  return null;
}
const phaseOptions = computed(() => {
  const phases = new Set((flight.value?.tasks ?? []).map((task) => task.phase));
  return [...phases].map((value) => ({
    value,
    title:
      value === 'ORIGIN_DEPARTURE'
        ? `Origin Departure · ${flight.value?.originStationCode}`
        : value === 'DESTINATION_ARRIVAL'
          ? `Destination Arrival · ${flight.value?.destinationStationCode}`
          : `Destination Closure · ${flight.value?.destinationStationCode}`
  }));
});
watch(
  phaseOptions,
  (options) => {
    if (options.length && !options.some((option) => option.value === selectedPhase.value)) {
      selectedPhase.value = options[0]!.value;
    }
  },
  { immediate: true }
);
function detailQuery(tab: 'services' | 'costs', id: string) {
  return {
    query: {
      ...route.query,
      tab,
      sourceRecordId: id
    }
  };
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}
function money(value: number, currency: string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(value);
}

async function taskAction(task: Task, action: 'start' | 'verify' | 'approve-occ') {
  loadingId.value = `${task.id}-${action}`;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    await fetchApi(`/api/flight-operations/station-tasks/${task.id}/actions/${action}`, {
      method: 'POST',
      body:
        action === 'approve-occ'
          ? {
              expectedVersion: task.version,
              decision: 'APPROVED',
              reason: 'Reviewed from the flight station workspace.'
            }
          : action === 'verify'
            ? {
                expectedVersion: task.version,
                reason: 'Verified against attached station evidence.'
              }
            : { expectedVersion: task.version }
    });
    await refresh();
    actionSuccess.value =
      action === 'approve-occ'
        ? 'OCC sign-off approval recorded.'
        : action === 'verify'
          ? 'Station task verified.'
          : 'Station task started.';
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : 'Task action failed.';
  } finally {
    loadingId.value = '';
  }
}

const evidenceDialog = ref(false);
const selectedTask = ref<Task | null>(null);
const evidenceFile = ref<File | File[] | null>(null);
const evidenceNotes = ref('');
function openEvidence(task: Task) {
  selectedTask.value = task;
  evidenceFile.value = null;
  evidenceNotes.value = '';
  evidenceDialog.value = true;
}
function selectedEvidenceFile() {
  return Array.isArray(evidenceFile.value) ? evidenceFile.value[0] : evidenceFile.value;
}
async function saveEvidence() {
  const file = selectedEvidenceFile();
  if (!selectedTask.value || !file) return;
  loadingId.value = `${selectedTask.value.id}-evidence`;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    const form = new FormData();
    form.append('file', file);
    const upload = await fetchApi<LocalUploadDto>('/api/uploads', {
      method: 'POST',
      body: form
    });
    await fetchApi(`/api/flight-operations/station-tasks/${selectedTask.value.id}/evidence`, {
      method: 'POST',
      body: {
        expectedVersion: selectedTask.value.version,
        uploadId: upload.id,
        fileName: upload.originalName,
        documentType: 'STATION_OPERATION_EVIDENCE',
        notes: evidenceNotes.value || undefined
      }
    });
    evidenceDialog.value = false;
    await refresh();
    actionSuccess.value = 'Evidence added to the station task.';
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : 'Evidence could not be saved.';
  } finally {
    loadingId.value = '';
  }
}

async function serviceAction(
  service: WorkbenchFlight['services'][number],
  action: 'confirm' | 'reject'
) {
  loadingId.value = `${service.id}-${action}`;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    await fetchApi(`/api/flight-operations/station-services/${service.id}/actions/${action}`, {
      method: 'POST',
      body:
        action === 'confirm'
          ? { expectedVersion: service.version, note: 'Confirmed in flight workspace.' }
          : {
              expectedVersion: service.version,
              reason: 'Service rejected in flight workspace.'
            }
    });
    await refresh();
    actionSuccess.value =
      action === 'confirm' ? 'Station service confirmed.' : 'Station service rejected.';
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : 'Service action failed.';
  } finally {
    loadingId.value = '';
  }
}

async function costAction(cost: WorkbenchFlight['costs'][number], action: 'submit' | 'approve') {
  loadingId.value = `${cost.id}-${action}`;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    await fetchApi(`/api/flight-operations/station-costs/${cost.id}/actions/${action}`, {
      method: 'POST',
      body: { expectedVersion: cost.version }
    });
    await refresh();
    actionSuccess.value =
      action === 'submit' ? 'Station cost submitted.' : 'Station cost approved.';
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : 'Cost action failed.';
  } finally {
    loadingId.value = '';
  }
}

const reconciliation = reactive({
  plannedPassengers: 0,
  actualPassengers: 0,
  plannedCargoKg: 0,
  actualCargoKg: 0,
  noShowPassengers: 0,
  offloadedCargoKg: 0,
  totalDiscrepancyNote: '',
  expectedVersion: 0
});
watch(
  flight,
  (value) => {
    reconciliation.plannedPassengers =
      value?.reconciliation?.plannedPassengers ?? value?.passengerTotal ?? 0;
    reconciliation.actualPassengers =
      value?.reconciliation?.actualPassengers ?? value?.passengerActual ?? 0;
    reconciliation.plannedCargoKg =
      value?.reconciliation?.plannedCargoKg ?? value?.cargoWeightKg ?? 0;
    reconciliation.actualCargoKg =
      value?.reconciliation?.actualCargoKg ?? value?.cargoWeightKg ?? 0;
    reconciliation.noShowPassengers = value?.reconciliation?.noShowPassengers ?? 0;
    reconciliation.offloadedCargoKg = value?.reconciliation?.offloadedCargoKg ?? 0;
    reconciliation.totalDiscrepancyNote = value?.reconciliation?.totalDiscrepancyNote ?? '';
    reconciliation.expectedVersion = value?.reconciliation?.version ?? 0;
  },
  { immediate: true }
);
async function saveReconciliation() {
  loadingId.value = 'reconciliation';
  actionError.value = '';
  actionSuccess.value = '';
  try {
    await fetchApi(`/api/flight-operations/flights/${flightId.value}/actions/reconcile-actuals`, {
      method: 'POST',
      body: reconciliation
    });
    await refresh();
    actionSuccess.value = 'Actual load reconciliation saved.';
  } catch (caught) {
    actionError.value =
      caught instanceof Error ? caught.message : 'Actual reconciliation could not be saved.';
  } finally {
    loadingId.value = '';
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 d-flex flex-wrap align-center ga-3">
      <VBtn icon="mdi-arrow-left" to="/flights/station-operations" variant="text" />
      <div>
        <h1 class="text-h4 font-weight-bold">Station Flight Workspace</h1>
        <p class="text-text-muted">
          {{ flight?.flightNumber ?? 'Flight' }} · {{ flight?.originStationCode }} →
          {{ flight?.destinationStationCode }}
        </p>
      </div>
      <VSpacer />
      <FlightsFlightStatusChip v-if="flight" :status="flight.currentStatusCode" />
      <VBtn icon="mdi-refresh" variant="text" @click="refresh" />
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Flight workspace could not be loaded or is outside your station scope.
    </VAlert>
    <VAlert v-if="actionError" class="mb-4" closable type="error" variant="tonal">
      {{ actionError }}
    </VAlert>
    <VProgressLinear v-if="pending" class="mb-4" indeterminate />

    <template v-if="flight">
      <VCard border class="mb-4">
        <VCardText>
          <VRow>
            <VCol cols="6" md="3">
              <div class="text-caption text-text-muted">Schedule (WIT)</div>
              <div>{{ formatDateTime(flight.scheduledDepartureAt) }}</div>
            </VCol>
            <VCol cols="6" md="3">
              <div class="text-caption text-text-muted">Aircraft</div>
              <div>{{ flight.aircraftType || '-' }}</div>
            </VCol>
            <VCol cols="6" md="3">
              <div class="text-caption text-text-muted">Passengers</div>
              <div>{{ flight.passengerActual }} / {{ flight.passengerTotal }}</div>
            </VCol>
            <VCol cols="6" md="3">
              <div class="text-caption text-text-muted">Cargo</div>
              <div>{{ flight.cargoWeightKg }} kg</div>
            </VCol>
          </VRow>
          <VSelect
            v-model="selectedPhase"
            class="mt-3"
            density="compact"
            hide-details
            :items="phaseOptions"
            label="Operational phase"
            max-width="420"
            variant="outlined"
          />
        </VCardText>
      </VCard>

      <VTabs v-model="activeTab" class="mb-3 border-b bg-background" color="primary" show-arrows>
        <VTab value="tasks">Tasks</VTab>
        <VTab value="services">Services</VTab>
        <VTab value="evidence">Evidence & Sign-off</VTab>
        <VTab value="costs">Costs</VTab>
        <VTab value="arrival">Arrival & Reconciliation</VTab>
        <VTab value="audit">Audit</VTab>
      </VTabs>

      <VWindow v-model="activeTab">
        <VWindowItem value="tasks">
          <VCard border>
            <VList lines="three">
              <VListItem
                v-for="task in tasks"
                :key="task.id"
                :class="{ 'bg-primary-lighten-5': route.query.sourceRecordId === task.id }"
                :subtitle="`${task.taskCode} · evidence ${task.evidenceCount} · v${task.version}`"
                :title="task.taskTitle"
              >
                <template #prepend>
                  <VIcon
                    :color="
                      task.status === 'VERIFIED'
                        ? 'success'
                        : task.status === 'REJECTED'
                          ? 'error'
                          : 'warning'
                    "
                    :icon="
                      task.status === 'VERIFIED'
                        ? 'mdi-check-circle'
                        : 'mdi-clipboard-clock-outline'
                    "
                  />
                </template>
                <template #append>
                  <div class="d-flex ga-1">
                    <VBtn
                      v-if="task.status === 'PENDING' && can('station.task.start').allowed"
                      size="small"
                      variant="text"
                      @click="taskAction(task, 'start')"
                    >
                      Start
                    </VBtn>
                    <VBtn
                      v-if="can('station.evidence.add').allowed"
                      size="small"
                      variant="text"
                      @click="openEvidence(task)"
                    >
                      Evidence
                    </VBtn>
                    <VBtn
                      v-if="
                        ['PENDING', 'IN_PROGRESS'].includes(task.status) &&
                          can('station.task.verify').allowed
                      "
                      color="success"
                      :disabled="Boolean(taskBlocker(task))"
                      size="small"
                      variant="tonal"
                      @click="taskAction(task, 'verify')"
                    >
                      Verify
                    </VBtn>
                  </div>
                </template>
                <div v-if="taskBlocker(task)" class="mt-1 text-caption text-warning">
                  {{ taskBlocker(task) }}
                </div>
              </VListItem>
              <VListItem v-if="tasks.length === 0" title="No task in this phase" />
            </VList>
          </VCard>
        </VWindowItem>

        <VWindowItem value="services">
          <VCard border>
            <VTable>
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Service</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="service in flight.services"
                  :key="service.id"
                  :class="{ 'bg-primary-lighten-5': route.query.sourceRecordId === service.id }"
                >
                  <td>{{ service.stationCode }}</td>
                  <td>{{ service.serviceType }}</td>
                  <td>{{ service.supplierName }}</td>
                  <td><DsStatusBadge :value="service.status" /></td>
                  <td class="text-right">
                    <div class="d-flex justify-end ga-1">
                      <DsTooltipIconButton
                        density="comfortable"
                        icon="mdi-eye-outline"
                        :to="detailQuery('services', service.id)"
                        tooltip="View service details"
                        variant="text"
                      />
                      <VBtn
                        v-if="
                          service.status === 'REQUESTED' && can('station.operation.update').allowed
                        "
                        size="small"
                        variant="tonal"
                        @click="serviceAction(service, 'confirm')"
                      >
                        Confirm
                      </VBtn>
                      <VBtn
                        v-if="
                          service.status === 'REQUESTED' && can('station.operation.update').allowed
                        "
                        color="error"
                        size="small"
                        variant="text"
                        @click="serviceAction(service, 'reject')"
                      >
                        Reject
                      </VBtn>
                    </div>
                  </td>
                </tr>
                <tr v-if="flight.services.length === 0">
                  <td class="py-6 text-center text-text-muted" colspan="5">
                    No station services recorded for this flight.
                  </td>
                </tr>
              </tbody>
            </VTable>
            <VCardActions>
              <VBtn :to="`/flights/station-operations?stationCode=${stationCode}`" variant="text">
                Create service on daily board
              </VBtn>
            </VCardActions>
          </VCard>
        </VWindowItem>

        <VWindowItem value="evidence">
          <VRow>
            <VCol cols="12" lg="7">
              <VCard border>
                <VCardTitle>Evidence register</VCardTitle>
                <VList>
                  <VListItem
                    v-for="item in flight.evidence"
                    :key="item.id"
                    :subtitle="`${item.taskCode ?? 'Flight'} · ${formatDateTime(item.uploadedAt)} · ${item.uploadedByUserId}`"
                    :title="item.fileName"
                  >
                    <template v-if="item.uploadId" #append>
                      <VBtn
                        append-icon="mdi-open-in-new"
                        :href="`/api/uploads/${encodeURIComponent(item.uploadId)}/file`"
                        size="small"
                        target="_blank"
                        variant="text"
                      >
                        View
                      </VBtn>
                    </template>
                  </VListItem>
                  <VListItem v-if="flight.evidence.length === 0" title="No evidence uploaded" />
                </VList>
              </VCard>
            </VCol>
            <VCol cols="12" lg="5">
              <VCard border>
                <VCardTitle>Dual sign-off</VCardTitle>
                <VList>
                  <VListItem
                    v-for="task in signoffTasks"
                    :key="task.id"
                    :subtitle="`Station: ${task.stationDecision ?? 'PENDING'} · OCC: ${task.occDecision ?? 'PENDING'}`"
                    :title="task.taskTitle"
                  >
                    <template #append>
                      <VBtn
                        v-if="
                          task.stationDecision === 'APPROVED' &&
                            task.occDecision !== 'APPROVED' &&
                            can('station.signoff.approve').allowed
                        "
                        color="secondary"
                        size="small"
                        variant="tonal"
                        @click="taskAction(task, 'approve-occ')"
                      >
                        OCC approve
                      </VBtn>
                    </template>
                  </VListItem>
                  <VListItem
                    v-if="signoffTasks.length === 0"
                    subtitle="Select a phase containing an origin or destination sign-off task."
                    title="No sign-off task in this phase"
                  />
                </VList>
              </VCard>
            </VCol>
          </VRow>
        </VWindowItem>

        <VWindowItem value="costs">
          <VCard border>
            <VAlert class="ma-3" type="info" variant="tonal">
              Station costs are financial records and never satisfy operational station sign-off.
            </VAlert>
            <VTable>
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="cost in flight.costs"
                  :key="cost.id"
                  :class="{ 'bg-primary-lighten-5': route.query.sourceRecordId === cost.id }"
                >
                  <td>{{ cost.stationCode }}</td>
                  <td>{{ cost.costCategoryName }}</td>
                  <td>{{ cost.description }}</td>
                  <td>{{ money(cost.amount, cost.currencyCode) }}</td>
                  <td><DsStatusBadge :value="cost.status" /></td>
                  <td class="text-right">
                    <div class="d-flex justify-end ga-1">
                      <DsTooltipIconButton
                        density="comfortable"
                        icon="mdi-eye-outline"
                        :to="detailQuery('costs', cost.id)"
                        tooltip="View cost details"
                        variant="text"
                      />
                      <VBtn
                        v-if="cost.status === 'DRAFT' && can('station.operation.update').allowed"
                        size="small"
                        variant="text"
                        @click="costAction(cost, 'submit')"
                      >
                        Submit
                      </VBtn>
                      <VBtn
                        v-if="cost.status === 'SUBMITTED' && can('station.cost.approve').allowed"
                        size="small"
                        variant="tonal"
                        @click="costAction(cost, 'approve')"
                      >
                        Approve
                      </VBtn>
                    </div>
                  </td>
                </tr>
                <tr v-if="flight.costs.length === 0">
                  <td class="py-6 text-center text-text-muted" colspan="6">
                    No station costs recorded for this flight.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VWindowItem>

        <VWindowItem value="arrival">
          <VCard border>
            <VCardTitle>Actual load reconciliation</VCardTitle>
            <VCardText>
              <VRow>
                <VCol cols="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.plannedPassengers"
                    label="Planned pax"
                    type="number"
                  />
                </VCol>
                <VCol cols="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.actualPassengers"
                    label="Actual pax"
                    type="number"
                  />
                </VCol>
                <VCol cols="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.plannedCargoKg"
                    label="Planned cargo kg"
                    type="number"
                  />
                </VCol>
                <VCol cols="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.actualCargoKg"
                    label="Actual cargo kg"
                    type="number"
                  />
                </VCol>
                <VCol cols="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.noShowPassengers"
                    label="No-show pax"
                    type="number"
                  />
                </VCol>
                <VCol cols="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.offloadedCargoKg"
                    label="Offloaded kg"
                    type="number"
                  />
                </VCol>
                <VCol cols="12">
                  <VTextarea
                    v-model="reconciliation.totalDiscrepancyNote"
                    label="Discrepancy note (required when totals differ)"
                  />
                </VCol>
              </VRow>
            </VCardText>
            <VCardActions>
              <VBtn
                v-if="can('readiness.attest').allowed && selectedPhase.startsWith('DESTINATION_')"
                color="primary"
                :loading="loadingId === 'reconciliation'"
                @click="saveReconciliation"
              >
                Save reconciliation
              </VBtn>
            </VCardActions>
          </VCard>
        </VWindowItem>

        <VWindowItem value="audit">
          <VCard border>
            <VTimeline v-if="flight.audit.length" align="start" density="compact">
              <VTimelineItem
                v-for="entry in flight.audit"
                :key="entry.id"
                dot-color="secondary"
                size="small"
              >
                <div class="font-weight-medium">{{ entry.action }}</div>
                <div class="text-sm">
                  {{ entry.module }} · {{ entry.actorRole }} ({{ entry.actorUserId }})
                </div>
                <div class="text-caption text-text-muted">
                  {{ formatDateTime(entry.timestamp) }} · {{ entry.reason ?? 'No note' }}
                </div>
              </VTimelineItem>
            </VTimeline>
            <VCardText v-else class="py-8 text-center text-text-muted">
              No operational audit events recorded yet.
            </VCardText>
          </VCard>
        </VWindowItem>
      </VWindow>
    </template>

    <VNavigationDrawer
      v-model="detailDrawerOpen"
      aria-labelledby="station-record-detail-title"
      aria-modal="true"
      disable-route-watcher
      location="right"
      role="dialog"
      temporary
      width="460"
    >
      <template v-if="selectedService">
        <div class="pa-4">
          <div class="d-flex align-start ga-3">
            <VAvatar color="primary" variant="tonal">
              <VIcon icon="mdi-handshake-outline" />
            </VAvatar>
            <div class="min-w-0">
              <div class="text-overline text-primary">Station service</div>
              <h2 id="station-record-detail-title" class="text-h6 font-weight-bold">
                {{ selectedService.serviceType }}
              </h2>
              <div class="text-body-2 text-medium-emphasis">
                {{ selectedService.stationCode }} · {{ selectedService.supplierName }}
              </div>
            </div>
            <VSpacer />
            <VBtn
              aria-label="Close service details"
              icon="mdi-close"
              variant="text"
              @click="detailDrawerOpen = false"
            />
          </div>
        </div>
        <VDivider />
        <div class="pa-4">
          <div class="mb-4 d-flex align-center justify-space-between">
            <span class="text-caption text-medium-emphasis">Current status</span>
            <DsStatusBadge :value="selectedService.status" />
          </div>

          <VCard border variant="flat">
            <VList density="compact">
              <VListItem title="Station" :subtitle="selectedService.stationCode" />
              <VListItem title="Service type" :subtitle="selectedService.serviceType" />
              <VListItem title="Supplier" :subtitle="selectedService.supplierName" />
              <VListItem
                title="Reference rate"
                :subtitle="
                  selectedService.referenceRate === null
                    ? 'Not recorded'
                    : money(selectedService.referenceRate, 'IDR')
                "
              />
              <VListItem
                title="Confirmed at"
                :subtitle="formatDateTime(selectedService.confirmedAt)"
              />
              <VListItem
                title="Confirmed by"
                :subtitle="selectedService.confirmedByUserId ?? 'Not confirmed'"
              />
              <VListItem
                v-if="selectedService.rejectionNote"
                title="Rejection note"
                :subtitle="selectedService.rejectionNote"
              />
            </VList>
          </VCard>

          <div class="mt-4 text-caption text-medium-emphasis">
            Record {{ selectedService.id }} · Version {{ selectedService.version }}
          </div>
        </div>
      </template>

      <template v-else-if="selectedCost">
        <div class="pa-4">
          <div class="d-flex align-start ga-3">
            <VAvatar color="secondary" variant="tonal">
              <VIcon icon="mdi-receipt-text-outline" />
            </VAvatar>
            <div class="min-w-0">
              <div class="text-overline text-secondary">Station cost</div>
              <h2 id="station-record-detail-title" class="text-h6 font-weight-bold">
                {{ selectedCost.costCategoryName }}
              </h2>
              <div class="text-body-2 text-medium-emphasis">
                {{ selectedCost.stationCode }} ·
                {{ selectedCost.vendorName ?? 'No vendor assigned' }}
              </div>
            </div>
            <VSpacer />
            <VBtn
              aria-label="Close cost details"
              icon="mdi-close"
              variant="text"
              @click="detailDrawerOpen = false"
            />
          </div>
        </div>
        <VDivider />
        <div class="pa-4">
          <div class="mb-4 d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Amount</div>
              <div class="text-h5 font-weight-bold">
                {{ money(selectedCost.amount, selectedCost.currencyCode) }}
              </div>
            </div>
            <DsStatusBadge :value="selectedCost.status" />
          </div>

          <VAlert class="mb-4" type="info" variant="tonal">
            Financial records do not complete operational station sign-off.
          </VAlert>

          <VCard border variant="flat">
            <VList density="compact">
              <VListItem title="Station" :subtitle="selectedCost.stationCode" />
              <VListItem title="Category" :subtitle="selectedCost.costCategoryName" />
              <VListItem
                title="Vendor"
                :subtitle="selectedCost.vendorName ?? 'No vendor assigned'"
              />
              <VListItem title="Description" :subtitle="selectedCost.description" />
              <VListItem
                title="Submitted by"
                :subtitle="selectedCost.submittedByUserId ?? 'Not submitted'"
              />
              <VListItem
                title="Approved by"
                :subtitle="selectedCost.approvedByUserId ?? 'Not approved'"
              />
              <VListItem title="Approved at" :subtitle="formatDateTime(selectedCost.approvedAt)" />
            </VList>
          </VCard>

          <div class="mt-4 text-caption text-medium-emphasis">
            Record {{ selectedCost.id }} · Version {{ selectedCost.version }}
          </div>
        </div>
      </template>

      <template #append>
        <div
          v-if="selectedService?.status === 'REQUESTED' && can('station.operation.update').allowed"
          class="d-flex align-center justify-space-between ga-2 pa-4"
        >
          <span class="text-caption text-medium-emphasis">Service actions</span>
          <div class="d-flex ga-1">
            <DsConfirmIconButton
              :action="() => serviceAction(selectedService, 'reject')"
              aria-label="Reject station service"
              color="error"
              confirm-icon="mdi-close-circle-outline"
              confirm-text="Reject"
              icon="mdi-close-circle-outline"
              :message="`Reject ${selectedService.serviceType} service from ${selectedService.supplierName}.`"
              title="Reject station service?"
              tone="error"
              tooltip="Reject service"
              variant="tonal"
            />
            <DsConfirmIconButton
              :action="() => serviceAction(selectedService, 'confirm')"
              aria-label="Confirm station service"
              color="success"
              confirm-icon="mdi-check-circle-outline"
              confirm-text="Confirm service"
              icon="mdi-check-circle-outline"
              :message="`Confirm ${selectedService.serviceType} service from ${selectedService.supplierName}.`"
              title="Confirm station service?"
              tone="success"
              tooltip="Confirm service"
              variant="flat"
            />
          </div>
        </div>
        <div v-else-if="selectedCost" class="d-flex align-center justify-space-between ga-2 pa-4">
          <span class="text-caption text-medium-emphasis">Cost actions</span>
          <DsConfirmIconButton
            v-if="selectedCost.status === 'DRAFT' && can('station.operation.update').allowed"
            :action="() => costAction(selectedCost, 'submit')"
            aria-label="Submit station cost"
            color="primary"
            confirm-icon="mdi-send-check-outline"
            confirm-text="Submit cost"
            icon="mdi-send-check-outline"
            :message="`Submit ${money(selectedCost.amount, selectedCost.currencyCode)} station cost for review.`"
            title="Submit station cost?"
            tone="primary"
            tooltip="Submit cost"
            variant="flat"
          />
          <DsConfirmIconButton
            v-if="selectedCost.status === 'SUBMITTED' && can('station.cost.approve').allowed"
            :action="() => costAction(selectedCost, 'approve')"
            aria-label="Approve station cost"
            color="success"
            confirm-icon="mdi-check-decagram-outline"
            confirm-text="Approve cost"
            icon="mdi-check-decagram-outline"
            :message="`Approve ${money(selectedCost.amount, selectedCost.currencyCode)} station cost.`"
            title="Approve station cost?"
            tone="success"
            tooltip="Approve cost"
            variant="flat"
          />
        </div>
      </template>
    </VNavigationDrawer>

    <VDialog v-model="evidenceDialog" max-width="560">
      <VCard>
        <VCardTitle>Add station evidence</VCardTitle>
        <VCardText>
          <VFileInput
            v-model="evidenceFile"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            label="Choose evidence file"
            prepend-icon="mdi-paperclip"
            show-size
            variant="outlined"
          />
          <div class="mb-3 text-caption text-text-muted">
            Maximum 25 MB. The file is stored in the application upload folder.
          </div>
          <VTextarea v-model="evidenceNotes" label="Notes" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="evidenceDialog = false">Cancel</VBtn>
          <VBtn
            color="primary"
            :disabled="!selectedEvidenceFile()"
            :loading="loadingId === `${selectedTask?.id}-evidence`"
            prepend-icon="mdi-upload"
            @click="saveEvidence"
          >
            Upload evidence
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <VSnackbar v-model="actionSuccess" color="success" location="top end" timeout="3000">
      {{ actionSuccess }}
    </VSnackbar>
  </VContainer>
</template>
