<script setup lang="ts">
import type { LocalUploadDto } from '#shared/contracts/uploads';
import type {
  StationMaintenanceRequestDto,
  StationMaintenanceRequestInput,
  StationTechnicalReadinessDto
} from '#shared/contracts/station-maintenance';
import MaintenanceRequestDialog from '../../../components/station-operations/MaintenanceRequestDialog.vue';
import { fetchApi } from '../../../composables/useApiEnvelope';
import {
  normalizeStationWorkspaceTab,
  type StationWorkspaceTab
} from '../../../features/station-operations/utils/station-workspace-navigation';

const { t } = useI18n();

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED' | string;
type ServiceStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | string;
type CostStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'VOID' | string;

type Task = {
  id: string;
  stationId: string;
  stationCode: string;
  taskCode: string;
  taskTitle: string;
  status: TaskStatus;
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

type StationService = {
  id: string;
  stationId: string;
  stationCode: string;
  serviceSupplierId: string;
  serviceType: string;
  serviceTypeId: string;
  supplierName: string;
  status: ServiceStatus;
  referenceRate: number | null;
  confirmedAt: string | null;
  confirmedByUserId: string | null;
  rejectionNote: string | null;
  version: number;
};

type StationCost = {
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
  status: CostStatus;
  submittedByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  version: number;
};

type StationEvidence = {
  id: string;
  stationTaskId: string | null;
  uploadId: string | null;
  taskCode: string | null;
  stationCode: string | null;
  documentType: string;
  evidenceCategory: 'OPERATIONAL' | 'EXTERNAL_REPORT';
  sourceParty: 'PT_AMA_STATION' | 'AVSEC' | 'AUTHORITY' | 'OTHER' | null;
  sourcePartyName: string | null;
  receivedAt: string | null;
  receivedByStationId: string | null;
  fileName: string;
  notes: string | null;
  uploadedByUserId: string;
  uploadedAt: string;
};

type AuditEntry = {
  id: string;
  actorUserId: string;
  actorRole: string;
  module: string;
  action: string;
  beforeStatus: string | null;
  afterStatus: string | null;
  reason: string | null;
  timestamp: string;
};

type WorkbenchFlight = {
  flightId: string;
  flightNumber: string;
  flightDate: string;
  aircraftType: string;
  aircraftRegistration: string;
  aircraftVersion: number;
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
  technicalReadiness: StationTechnicalReadinessDto;
  maintenanceRequests: StationMaintenanceRequestDto[];
  tasks: Task[];
  services: StationService[];
  costs: StationCost[];
  evidence: StationEvidence[];
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
  audit: AuditEntry[];
};

type PhaseOption = {
  value: string;
  title: string;
  stationCode: string;
};

const route = useRoute();
const router = useRouter();
const { can } = useAuthorization();

const flightId = computed<string>(() => String(route.params.flightId));
const loadingId = ref<string>('');
const actionError = ref<string>('');
const actionSuccess = ref<string>('');
const maintenanceDialog = ref(false);

const {
  data: flights,
  pending,
  error,
  refresh
} = await useAsyncData<WorkbenchFlight[]>(
  `station-flight-workspace-${flightId.value}`,
  () =>
    fetchApi<WorkbenchFlight[]>('/api/flight-operations/station-operations', {
      query: { flightId: flightId.value }
    }),
  { default: () => [] }
);

const flight = computed<WorkbenchFlight | null>(() => flights.value[0] ?? null);

async function createMaintenanceRequest(input: StationMaintenanceRequestInput): Promise<void> {
  if (!flight.value) return;
  loadingId.value = 'maintenance-request';
  clearActionMessages();
  try {
    await fetchApi(`/api/flight-operations/flights/${flight.value.flightId}/maintenance-requests`, {
      method: 'POST',
      body: input
    });
    actionSuccess.value = 'Maintenance request diteruskan ke MRO.';
    maintenanceDialog.value = false;
    await refreshWorkspace();
    activeTab.value = 'maintenance';
  } catch (value) {
    actionError.value =
      value instanceof Error ? value.message : 'Maintenance request gagal dibuat.';
  } finally {
    loadingId.value = '';
  }
}

async function refreshWorkspace(): Promise<void> {
  await refresh();
}

watch(flightId, () => {
  void refreshWorkspace();
});

function normalizeQueryValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function replaceWorkspaceQuery(
  patch: Record<string, string | undefined>,
  options: { replace?: boolean } = {}
): void {
  const query: Record<string, string> = {};

  for (const [key, value] of Object.entries(route.query)) {
    if (typeof value === 'string') query[key] = value;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete query[key];
    else query[key] = value;
  }

  const target = { path: route.path, query };

  if (options.replace) {
    void router.replace(target);
  } else {
    void router.push(target);
  }
}

const activeTab = computed<StationWorkspaceTab>({
  get: () => normalizeStationWorkspaceTab(route.query.tab),
  set: (tab: StationWorkspaceTab) => {
    if (normalizeStationWorkspaceTab(route.query.tab) === tab) return;

    replaceWorkspaceQuery({
      tab,
      sourceRecordId:
        tab === 'services' || tab === 'costs'
          ? normalizeQueryValue(route.query.sourceRecordId)
          : undefined
    });
  }
});

const selectedPhase = ref<string>(normalizeQueryValue(route.query.phase) ?? 'ORIGIN_DEPARTURE');

const phaseOptions = computed<PhaseOption[]>(() => {
  const currentFlight = flight.value;
  if (!currentFlight) return [];

  const phaseOrder = ['ORIGIN_DEPARTURE', 'DESTINATION_ARRIVAL', 'DESTINATION_CLOSURE'];
  const phases = [...new Set(currentFlight.tasks.map((task: Task) => task.phase))];

  return phases
    .sort((left: string, right: string) => {
      const leftIndex = phaseOrder.indexOf(left);
      const rightIndex = phaseOrder.indexOf(right);
      return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
    })
    .map((value: string) => {
      const isOrigin = value.startsWith('ORIGIN');
      const stationCode = isOrigin
        ? currentFlight.originStationCode
        : currentFlight.destinationStationCode;

      const title =
        value === 'ORIGIN_DEPARTURE'
          ? `Origin departure · ${stationCode}`
          : value === 'DESTINATION_ARRIVAL'
            ? `Destination arrival · ${stationCode}`
            : value === 'DESTINATION_CLOSURE'
              ? `Destination closure · ${stationCode}`
              : `${value.replaceAll('_', ' ')} · ${stationCode}`;

      return { value, title, stationCode };
    });
});

watch(
  phaseOptions,
  (options: PhaseOption[]) => {
    if (!options.length) return;

    const queryPhase = normalizeQueryValue(route.query.phase);
    const requested = queryPhase ?? selectedPhase.value;
    const available = options.some((option: PhaseOption) => option.value === requested);
    const nextPhase = available ? requested : options[0]!.value;

    if (selectedPhase.value !== nextPhase) selectedPhase.value = nextPhase;
    if (queryPhase !== nextPhase) {
      replaceWorkspaceQuery({ phase: nextPhase, sourceRecordId: undefined }, { replace: true });
    }
  },
  { immediate: true }
);

watch(
  () => route.query.phase,
  (value: unknown) => {
    const phase = normalizeQueryValue(value);
    if (phase && phase !== selectedPhase.value) selectedPhase.value = phase;
  }
);

watch(selectedPhase, (phase: string) => {
  if (route.query.phase === phase) return;
  replaceWorkspaceQuery({ phase, sourceRecordId: undefined }, { replace: true });
});

const stationCode = computed<string>(() => {
  const currentFlight = flight.value;
  if (!currentFlight) return '-';

  return selectedPhase.value.startsWith('ORIGIN')
    ? currentFlight.originStationCode
    : currentFlight.destinationStationCode;
});

const stationId = computed<string>(() => {
  const currentFlight = flight.value;
  if (!currentFlight) return '';

  return selectedPhase.value.startsWith('ORIGIN')
    ? currentFlight.originStationId
    : currentFlight.destinationStationId;
});

const tasks = computed<Task[]>(() =>
  (flight.value?.tasks ?? []).filter((task: Task) => task.phase === selectedPhase.value)
);

const signoffTasks = computed<Task[]>(() =>
  tasks.value.filter((task: Task) => task.taskCode.endsWith('STATION_SIGNOFF'))
);

const stationServices = computed<StationService[]>(() =>
  (flight.value?.services ?? []).filter(
    (service: StationService) =>
      service.stationId === stationId.value || service.stationCode === stationCode.value
  )
);

const stationCosts = computed<StationCost[]>(() =>
  (flight.value?.costs ?? []).filter(
    (cost: StationCost) =>
      cost.stationId === stationId.value || cost.stationCode === stationCode.value
  )
);

const phaseTaskIds = computed<Set<string>>(() => new Set(tasks.value.map((task: Task) => task.id)));
const evidenceRegisterTab = ref<'OPERATIONAL' | 'EXTERNAL_REPORT'>('OPERATIONAL');

const phaseTaskCodes = computed<Set<string>>(
  () => new Set(tasks.value.map((task: Task) => task.taskCode))
);

const phaseEvidence = computed<StationEvidence[]>(() =>
  (flight.value?.evidence ?? [])
    .filter((item: StationEvidence) => {
      if (item.stationTaskId && phaseTaskIds.value.has(item.stationTaskId)) return true;
      return Boolean(item.taskCode && phaseTaskCodes.value.has(item.taskCode));
    })
    .sort((left: StationEvidence, right: StationEvidence) =>
      right.uploadedAt.localeCompare(left.uploadedAt)
    )
);

const operationalEvidence = computed<StationEvidence[]>(() =>
  phaseEvidence.value.filter((item) => item.evidenceCategory !== 'EXTERNAL_REPORT')
);

const externalReportEvidence = computed<StationEvidence[]>(() =>
  phaseEvidence.value.filter((item) => item.evidenceCategory === 'EXTERNAL_REPORT')
);

const evidenceRegisterItems = computed<StationEvidence[]>(() =>
  evidenceRegisterTab.value === 'EXTERNAL_REPORT'
    ? externalReportEvidence.value
    : operationalEvidence.value
);

const sortedAudit = computed<AuditEntry[]>(() =>
  [...(flight.value?.audit ?? [])].sort((left: AuditEntry, right: AuditEntry) =>
    right.timestamp.localeCompare(left.timestamp)
  )
);

const verifiedTaskCount = computed<number>(
  () => tasks.value.filter((task: Task) => task.status === 'VERIFIED').length
);

const rejectedTaskCount = computed<number>(
  () => tasks.value.filter((task: Task) => task.status === 'REJECTED').length
);

const pendingTaskCount = computed<number>(
  () => tasks.value.filter((task: Task) => !['VERIFIED', 'REJECTED'].includes(task.status)).length
);

const phaseProgress = computed<number>(() => {
  if (!tasks.value.length) return 0;
  return Math.round((verifiedTaskCount.value / tasks.value.length) * 100);
});

const phaseState = computed<{ label: string; color: string; icon: string }>(() => {
  if (rejectedTaskCount.value > 0) {
    return { label: 'Blocked', color: 'error', icon: 'mdi-alert-octagon-outline' };
  }
  if (tasks.value.length > 0 && verifiedTaskCount.value === tasks.value.length) {
    return { label: 'Ready', color: 'success', icon: 'mdi-check-decagram-outline' };
  }
  if (verifiedTaskCount.value > 0) {
    return { label: 'In progress', color: 'info', icon: 'mdi-progress-check' };
  }
  return { label: 'Needs action', color: 'warning', icon: 'mdi-clock-alert-outline' };
});

const sourceRecordId = computed<string | null>(
  () => normalizeQueryValue(route.query.sourceRecordId) ?? null
);

const selectedService = computed<StationService | null>(
  () =>
    stationServices.value.find((service: StationService) => service.id === sourceRecordId.value) ??
    null
);

const selectedCost = computed<StationCost | null>(
  () => stationCosts.value.find((cost: StationCost) => cost.id === sourceRecordId.value) ?? null
);

const detailDrawerOpen = computed<boolean>({
  get: () => Boolean(selectedService.value || selectedCost.value),
  set: (open: boolean) => {
    if (open) return;
    replaceWorkspaceQuery({ sourceRecordId: undefined }, { replace: true });
  }
});

const backTarget = computed(() => ({
  path: '/flights/station-operations',
  query: {
    stationCode: normalizeQueryValue(route.query.stationCode) ?? stationCode.value,
    date: normalizeQueryValue(route.query.date) ?? flight.value?.flightDate
  }
}));

const commandCenterTarget = computed(() => ({
  path: `/flights/${flightId.value}`,
  query: {
    from: 'station-operations',
    stationCode: normalizeQueryValue(route.query.stationCode) ?? stationCode.value,
    date: normalizeQueryValue(route.query.date) ?? flight.value?.flightDate,
    stationTab: activeTab.value,
    stationPhase: selectedPhase.value
  }
}));

const serviceBoardTarget = computed(() => ({
  path: '/flights/station-operations/services',
  query: {
    stationCode: stationCode.value,
    date: normalizeQueryValue(route.query.date) ?? flight.value?.flightDate
  }
}));

const costBoardTarget = computed(() => ({
  path: '/flights/station-operations/costs',
  query: {
    stationCode: stationCode.value,
    date: normalizeQueryValue(route.query.date) ?? flight.value?.flightDate
  }
}));

function detailQuery(tab: 'services' | 'costs', id: string) {
  return {
    path: route.path,
    query: {
      ...route.query,
      phase: selectedPhase.value,
      tab,
      sourceRecordId: id
    }
  };
}

function taskBlocker(task: Task): string | null {
  if (task.requiresEvidence && task.evidenceCount === 0) {
    return 'Attach evidence before verification.';
  }

  if (task.taskCode === 'ORIGIN_HANDLING') {
    const handlingReady = flight.value?.services.some(
      (service: StationService) =>
        service.stationCode === task.stationCode &&
        service.serviceType === 'HANDLING' &&
        ['CONFIRMED', 'COMPLETED'].includes(service.status)
    );

    if (!handlingReady) return 'Confirm the origin handling service first.';
  }

  if (task.taskCode.endsWith('STATION_SIGNOFF')) {
    const prefix = task.taskCode.startsWith('ORIGIN_') ? 'ORIGIN_' : 'DESTINATION_';
    const incomplete = (flight.value?.tasks ?? []).filter(
      (candidate: Task) =>
        candidate.id !== task.id &&
        candidate.stationId === task.stationId &&
        candidate.taskCode.startsWith(prefix) &&
        candidate.status !== 'VERIFIED'
    );

    if (incomplete.length) {
      return `Complete ${incomplete.length} remaining station task(s) first.`;
    }
  }

  return null;
}

function localizedTaskTitle(task: Pick<Task, 'taskCode' | 'taskTitle'>): string {
  const key = `stationOperations.taskTitles.${task.taskCode}`;
  const label = t(key);
  return label === key ? task.taskTitle : label;
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jayapura'
  }).format(date);
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function evidenceSourceLabel(item: StationEvidence): string {
  const labels: Record<NonNullable<StationEvidence['sourceParty']>, string> = {
    PT_AMA_STATION: 'PT AMA Station',
    AVSEC: 'AVSEC',
    AUTHORITY: 'Authority',
    OTHER: 'Other'
  };
  const party = item.sourceParty ? labels[item.sourceParty] : 'PT AMA Station';
  return item.sourcePartyName ? `${party} - ${item.sourcePartyName}` : party;
}

function evidenceReceivedLabel(item: StationEvidence): string {
  const station = item.stationCode ?? stationCode.value;
  const receivedAt = item.receivedAt
    ? formatDateTime(item.receivedAt)
    : formatDateTime(item.uploadedAt);
  return `Received by PT AMA Station ${station} · ${receivedAt}`;
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function clearActionMessages(): void {
  actionError.value = '';
  actionSuccess.value = '';
}

async function taskAction(task: Task, action: 'start' | 'verify' | 'approve-occ'): Promise<void> {
  if (action === 'verify') {
    const blocker = taskBlocker(task);
    if (blocker) {
      actionError.value = blocker;
      return;
    }
  }

  loadingId.value = `${task.id}-${action}`;
  clearActionMessages();

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

const evidenceDialog = ref<boolean>(false);
const evidenceTask = ref<Task | null>(null);
const evidenceFile = ref<File | File[] | null>(null);
const evidenceNotes = ref<string>('');
const evidenceCategory = ref<'OPERATIONAL' | 'EXTERNAL_REPORT'>('OPERATIONAL');
const evidenceSourceParty = ref<'PT_AMA_STATION' | 'AVSEC' | 'AUTHORITY' | 'OTHER'>(
  'PT_AMA_STATION'
);
const evidenceSourcePartyName = ref<string>('');
const evidenceReceivedAt = ref<string>('');

watch(evidenceCategory, (category) => {
  if (category === 'EXTERNAL_REPORT' && evidenceSourceParty.value === 'PT_AMA_STATION') {
    evidenceSourceParty.value = 'AVSEC';
  }
  if (category === 'OPERATIONAL') {
    evidenceSourceParty.value = 'PT_AMA_STATION';
    evidenceSourcePartyName.value = '';
    evidenceReceivedAt.value = '';
  }
});

function openEvidence(task: Task): void {
  evidenceTask.value = task;
  evidenceFile.value = null;
  evidenceNotes.value = '';
  evidenceCategory.value = 'OPERATIONAL';
  evidenceSourceParty.value = 'PT_AMA_STATION';
  evidenceSourcePartyName.value = '';
  evidenceReceivedAt.value = '';
  evidenceDialog.value = true;
}

function selectedEvidenceFile(): File | null {
  const value = evidenceFile.value;
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizedEvidenceReceivedAt(): string | undefined {
  const value = evidenceReceivedAt.value.trim();
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

async function saveEvidence(): Promise<void> {
  const file = selectedEvidenceFile();
  const task = evidenceTask.value;
  if (!task || !file) return;

  loadingId.value = `${task.id}-evidence`;
  clearActionMessages();

  try {
    const form = new FormData();
    form.append('file', file);

    const upload = await fetchApi<LocalUploadDto>('/api/uploads', {
      method: 'POST',
      body: form
    });

    await fetchApi(`/api/flight-operations/station-tasks/${task.id}/evidence`, {
      method: 'POST',
      body: {
        expectedVersion: task.version,
        uploadId: upload.id,
        fileName: upload.originalName,
        documentType:
          evidenceCategory.value === 'EXTERNAL_REPORT'
            ? 'STATION_EXTERNAL_REPORT'
            : 'STATION_OPERATION_EVIDENCE',
        evidenceCategory: evidenceCategory.value,
        sourceParty: evidenceSourceParty.value,
        sourcePartyName: evidenceSourcePartyName.value.trim() || undefined,
        receivedAt: normalizedEvidenceReceivedAt(),
        notes: evidenceNotes.value.trim() || undefined
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

const rejectionDialog = ref<boolean>(false);
const rejectionTask = ref<Task | null>(null);
const rejectionReason = ref<string>('');

function openTaskRejection(task: Task): void {
  rejectionTask.value = task;
  rejectionReason.value = '';
  rejectionDialog.value = true;
}

async function rejectTask(): Promise<void> {
  const task = rejectionTask.value;
  const reason = rejectionReason.value.trim();
  if (!task || !reason) return;

  loadingId.value = `${task.id}-reject`;
  clearActionMessages();

  try {
    await fetchApi(`/api/flight-operations/station-tasks/${task.id}/actions/reject`, {
      method: 'POST',
      body: {
        expectedVersion: task.version,
        rejectionReason: reason
      }
    });

    rejectionDialog.value = false;
    await refresh();
    actionSuccess.value = 'Station task rejected.';
  } catch (caught) {
    actionError.value =
      caught instanceof Error ? caught.message : 'Station task could not be rejected.';
  } finally {
    loadingId.value = '';
  }
}

async function serviceAction(service: StationService, action: 'confirm' | 'reject'): Promise<void> {
  loadingId.value = `${service.id}-${action}`;
  clearActionMessages();

  try {
    await fetchApi(`/api/flight-operations/station-services/${service.id}/actions/${action}`, {
      method: 'POST',
      body:
        action === 'confirm'
          ? {
              expectedVersion: service.version,
              note: 'Confirmed in flight workspace.'
            }
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

async function costAction(cost: StationCost, action: 'submit' | 'approve'): Promise<void> {
  loadingId.value = `${cost.id}-${action}`;
  clearActionMessages();

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
  (value: WorkbenchFlight | null) => {
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

const passengerDifference = computed<number>(
  () => reconciliation.actualPassengers - reconciliation.plannedPassengers
);

const cargoDifference = computed<number>(
  () => reconciliation.actualCargoKg - reconciliation.plannedCargoKg
);

const hasReconciliationDifference = computed<boolean>(
  () => passengerDifference.value !== 0 || cargoDifference.value !== 0
);

const reconciliationNoteRequired = computed<boolean>(
  () => hasReconciliationDifference.value && !reconciliation.totalDiscrepancyNote.trim()
);

async function saveReconciliation(): Promise<void> {
  if (reconciliationNoteRequired.value) {
    actionError.value = 'Add a discrepancy note before saving different actual totals.';
    return;
  }

  loadingId.value = 'reconciliation';
  clearActionMessages();

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

function handleSnackbarModelValue(value: boolean): void {
  if (!value) actionSuccess.value = '';
}
</script>

<template>
  <div class="station-flight-workspace">
    <div class="mb-4 d-flex flex-column ga-3 flex-lg-row align-lg-center">
      <div class="d-flex align-start ga-2 min-w-0">
        <VBtn
          :to="backTarget"
          aria-label="Back to Station Operations"
          icon="mdi-arrow-left"
          variant="text"
        />

        <div class="min-w-0">
          <div class="text-overline text-primary">Station flight workspace</div>
          <div class="d-flex flex-wrap align-center ga-2">
            <h1 class="text-h4 font-weight-bold text-truncate">
              {{ flight?.flightNumber ?? 'Flight' }}
            </h1>
            <FlightsFlightStatusChip v-if="flight" :status="flight.currentStatusCode" />
          </div>
          <div class="d-flex flex-wrap align-center ga-2 text-body-2 text-medium-emphasis">
            <span>{{ flight?.originStationCode ?? '-' }}</span>
            <VIcon icon="mdi-arrow-right" size="16" />
            <span>{{ flight?.destinationStationCode ?? '-' }}</span>
            <span>·</span>
            <span>{{ formatDate(flight?.flightDate ?? null) }}</span>
          </div>
        </div>
      </div>

      <VSpacer class="d-none d-lg-block" />

      <div class="d-flex flex-wrap align-center ga-2">
        <VChip
          :color="phaseState.color"
          :prepend-icon="phaseState.icon"
          size="small"
          variant="tonal"
        >
          {{ phaseState.label }}
        </VChip>
        <VBtn
          :to="commandCenterTarget"
          prepend-icon="mdi-airplane-cog"
          size="small"
          variant="tonal"
        >
          Flight Command Center
        </VBtn>
        <VBtn
          :loading="pending"
          prepend-icon="mdi-refresh"
          size="small"
          variant="outlined"
          @click="refreshWorkspace"
        >
          Refresh
        </VBtn>
      </div>
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3">
        <span>Flight workspace could not be loaded or is outside your station scope.</span>
        <VBtn
          color="error"
          prepend-icon="mdi-refresh"
          size="small"
          variant="text"
          @click="refreshWorkspace"
        >
          Retry
        </VBtn>
      </div>
    </VAlert>

    <VAlert
      v-if="actionError"
      class="mb-4"
      closable
      type="error"
      variant="tonal"
      @click:close="actionError = ''"
    >
      {{ actionError }}
    </VAlert>

    <VProgressLinear v-if="pending" class="mb-4" indeterminate />

    <VCard v-if="!pending && !flight && !error" border class="py-12 text-center">
      <VIcon color="grey" icon="mdi-airplane-alert" size="48" />
      <div class="mt-3 text-h6">Flight was not found</div>
      <div class="text-body-2 text-medium-emphasis">
        The record may have been removed or is outside your station scope.
      </div>
      <VBtn class="mt-4" color="primary" :to="backTarget" variant="tonal">
        Back to Station Operations
      </VBtn>
    </VCard>

    <template v-if="flight">
      <VAlert
        class="mb-4"
        :color="
          flight.technicalReadiness.status === 'READY'
            ? 'success'
            : flight.technicalReadiness.status === 'AT_RISK'
              ? 'warning'
              : 'error'
        "
        :icon="
          flight.technicalReadiness.status === 'READY'
            ? 'mdi-shield-check-outline'
            : 'mdi-airplane-alert'
        "
        variant="tonal"
      >
        <div class="d-flex flex-wrap align-center justify-space-between ga-3">
          <div>
            <div class="font-weight-bold">
              Kesiapan teknis:
              {{
                flight.technicalReadiness.status === 'READY'
                  ? 'Siap'
                  : flight.technicalReadiness.status === 'AT_RISK'
                    ? 'Perlu perhatian'
                    : 'Belum siap'
              }}
            </div>
            <div>
              {{ flight.technicalReadiness.blockerLabel ?? 'Tidak ada blocker teknis aktif.' }}
            </div>
            <div v-if="flight.technicalReadiness.owner" class="text-caption">
              Pemilik tindakan: {{ flight.technicalReadiness.owner }} ·
              {{ flight.technicalReadiness.nextAction }}
            </div>
          </div>
          <VBtn
            v-if="can('station.maintenance_request.create').allowed"
            prepend-icon="mdi-alert-plus-outline"
            text="Laporkan temuan"
            variant="outlined"
            @click="maintenanceDialog = true"
          />
        </div>
      </VAlert>

      <VCard border class="mb-4 overflow-hidden">
        <VCardText>
          <div class="workspace-summary-grid">
            <div class="workspace-summary-item">
              <div class="text-caption text-medium-emphasis">Scheduled departure (WIT)</div>
              <div class="font-weight-medium">
                {{ formatDateTime(flight.scheduledDepartureAt) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                Actual: {{ formatDateTime(flight.actualDepartureAt) }}
              </div>
            </div>

            <div class="workspace-summary-item">
              <div class="text-caption text-medium-emphasis">Aircraft</div>
              <div class="font-weight-medium">
                {{ flight.aircraftRegistration || flight.aircraftType || '-' }}
              </div>
              <div class="text-caption text-medium-emphasis">{{ flight.serviceTypeCode }}</div>
            </div>

            <div class="workspace-summary-item">
              <div class="text-caption text-medium-emphasis">Passenger load</div>
              <div class="font-weight-medium">
                {{ flight.passengerActual }} / {{ flight.passengerTotal }} pax
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ Math.max(flight.passengerTotal - flight.passengerActual, 0) }} remaining
              </div>
            </div>

            <div class="workspace-summary-item">
              <div class="text-caption text-medium-emphasis">Cargo</div>
              <div class="font-weight-medium">{{ flight.cargoWeightKg }} kg</div>
              <div class="text-caption text-medium-emphasis">Planned flight load</div>
            </div>
          </div>
        </VCardText>

        <VDivider />

        <VCardText>
          <div class="d-flex flex-column ga-4 flex-lg-row align-lg-center">
            <VSelect
              v-model="selectedPhase"
              :items="phaseOptions"
              density="compact"
              hide-details
              item-title="title"
              item-value="value"
              label="Operational phase"
              prepend-inner-icon="mdi-map-marker-path"
              style="max-width: 430px; width: 100%"
              variant="outlined"
            />

            <div class="flex-grow-1">
              <div class="mb-1 d-flex align-center justify-space-between ga-3 text-caption">
                <span>{{ stationCode }} phase completion</span>
                <strong>{{ verifiedTaskCount }}/{{ tasks.length }} tasks</strong>
              </div>
              <VProgressLinear
                :color="phaseState.color"
                :model-value="phaseProgress"
                height="8"
                rounded
              />
            </div>

            <div class="d-flex flex-wrap ga-2">
              <VChip color="success" size="small" variant="tonal">
                {{ verifiedTaskCount }} verified
              </VChip>
              <VChip color="warning" size="small" variant="tonal">
                {{ pendingTaskCount }} pending
              </VChip>
              <VChip v-if="rejectedTaskCount" color="error" size="small" variant="tonal">
                {{ rejectedTaskCount }} rejected
              </VChip>
            </div>
          </div>
        </VCardText>
      </VCard>

      <VCard border class="mb-4 overflow-hidden">
        <VTabs v-model="activeTab" color="primary" show-arrows>
          <VTab value="tasks">
            <VIcon icon="mdi-clipboard-check-outline" start />
            Tasks
            <VChip class="ml-2" size="x-small" variant="tonal">{{ tasks.length }}</VChip>
          </VTab>
          <VTab value="maintenance">
            <VIcon icon="mdi-handshake-outline" start />
            Maintenance
            <VChip class="ml-2" size="x-small" variant="tonal">
              {{ flight.maintenanceRequests.length }}
            </VChip>
          </VTab>
          <VTab value="services">
            <VIcon icon="mdi-toolbox-outline" start />
            Services
            <VChip class="ml-2" size="x-small" variant="tonal">{{ stationServices.length }}</VChip>
          </VTab>
          <VTab value="evidence">
            <VIcon icon="mdi-file-document-check-outline" start />
            Evidence &amp; sign-off
          </VTab>
          <VTab value="costs">
            <VIcon icon="mdi-cash-multiple" start />
            Costs
            <VChip class="ml-2" size="x-small" variant="tonal">{{ stationCosts.length }}</VChip>
          </VTab>
          <VTab value="arrival">
            <VIcon icon="mdi-airplane-landing" start />
            Reconciliation
          </VTab>
          <VTab value="audit">
            <VIcon icon="mdi-history" start />
            Audit
          </VTab>
        </VTabs>
      </VCard>

      <VWindow v-model="activeTab">
        <VWindowItem value="tasks">
          <VRow>
            <VCol cols="12" lg="8">
              <div class="d-flex flex-column ga-3">
                <VCard
                  v-for="task in tasks"
                  :key="task.id"
                  border
                  :class="{
                    'workspace-record-highlight': route.query.sourceRecordId === task.id
                  }"
                >
                  <VCardText>
                    <div class="d-flex flex-column ga-3 flex-md-row align-md-start">
                      <VAvatar
                        :color="
                          task.status === 'VERIFIED'
                            ? 'success'
                            : task.status === 'REJECTED'
                              ? 'error'
                              : 'warning'
                        "
                        size="38"
                        variant="tonal"
                      >
                        <VIcon
                          :icon="
                            task.status === 'VERIFIED'
                              ? 'mdi-check-circle-outline'
                              : task.status === 'REJECTED'
                                ? 'mdi-close-circle-outline'
                                : 'mdi-clipboard-clock-outline'
                          "
                        />
                      </VAvatar>

                      <div class="flex-grow-1 min-w-0">
                        <div class="d-flex flex-wrap align-center ga-2">
                          <div class="text-subtitle-1 font-weight-bold">
                            {{ localizedTaskTitle(task) }}
                          </div>
                          <DsStatusBadge :value="task.status" />
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ task.taskCode }} · {{ task.stationCode }} · version {{ task.version }}
                        </div>

                        <div class="mt-3 d-flex flex-wrap ga-2">
                          <VChip
                            :color="
                              task.evidenceCount > 0
                                ? 'success'
                                : task.requiresEvidence
                                  ? 'warning'
                                  : 'grey'
                            "
                            prepend-icon="mdi-paperclip"
                            size="small"
                            variant="tonal"
                          >
                            {{ task.evidenceCount }} evidence
                          </VChip>
                          <VChip v-if="task.stationDecision" size="small" variant="outlined">
                            Station: {{ task.stationDecision }}
                          </VChip>
                          <VChip v-if="task.occDecision" size="small" variant="outlined">
                            OCC: {{ task.occDecision }}
                          </VChip>
                        </div>

                        <VAlert
                          v-if="taskBlocker(task)"
                          class="mt-3"
                          density="compact"
                          type="warning"
                          variant="tonal"
                        >
                          {{ taskBlocker(task) }}
                        </VAlert>

                        <div v-if="task.notes" class="mt-3 text-body-2">
                          {{ task.notes }}
                        </div>
                        <div v-if="task.rejectionReason" class="mt-2 text-body-2 text-error">
                          Rejection: {{ task.rejectionReason }}
                        </div>
                      </div>

                      <div class="d-flex flex-wrap justify-end ga-2 workspace-task-actions">
                        <VBtn
                          v-if="task.status === 'PENDING' && can('station.task.start').allowed"
                          :loading="loadingId === `${task.id}-start`"
                          prepend-icon="mdi-play"
                          size="small"
                          variant="outlined"
                          @click="taskAction(task, 'start')"
                        >
                          Start
                        </VBtn>
                        <VBtn
                          v-if="
                            task.status === 'IN_PROGRESS' && can('station.evidence.add').allowed
                          "
                          prepend-icon="mdi-paperclip"
                          size="small"
                          variant="text"
                          @click="openEvidence(task)"
                        >
                          Evidence
                        </VBtn>
                        <VBtn
                          v-if="task.status === 'IN_PROGRESS' && can('station.task.verify').allowed"
                          color="success"
                          :disabled="Boolean(taskBlocker(task))"
                          :loading="loadingId === `${task.id}-verify`"
                          prepend-icon="mdi-check-circle-outline"
                          size="small"
                          variant="tonal"
                          @click="taskAction(task, 'verify')"
                        >
                          Verify
                        </VBtn>
                        <VBtn
                          v-if="task.status === 'IN_PROGRESS' && can('station.task.reject').allowed"
                          color="error"
                          prepend-icon="mdi-close-circle-outline"
                          size="small"
                          variant="text"
                          @click="openTaskRejection(task)"
                        >
                          Reject
                        </VBtn>
                      </div>
                    </div>
                  </VCardText>
                </VCard>

                <VCard v-if="tasks.length === 0" border class="py-10 text-center">
                  <VIcon color="grey" icon="mdi-clipboard-text-off-outline" size="40" />
                  <div class="mt-2 text-subtitle-1 font-weight-medium">No task in this phase</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Select another operational phase to view its verification tasks.
                  </div>
                </VCard>
              </div>
            </VCol>

            <VCol cols="12" lg="4">
              <VCard border class="mb-3">
                <VCardTitle class="text-subtitle-1">Phase readiness</VCardTitle>
                <VCardText>
                  <div class="d-flex align-center ga-3">
                    <VProgressCircular
                      :color="phaseState.color"
                      :model-value="phaseProgress"
                      :size="76"
                      :width="8"
                    >
                      {{ phaseProgress }}%
                    </VProgressCircular>
                    <div>
                      <div class="font-weight-bold">{{ phaseState.label }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ stationCode }} · {{ selectedPhase.replaceAll('_', ' ') }}
                      </div>
                    </div>
                  </div>
                </VCardText>
              </VCard>

              <VCard border>
                <VCardTitle class="text-subtitle-1">Sign-off status</VCardTitle>
                <VList density="compact" lines="two">
                  <VListItem
                    v-for="task in signoffTasks"
                    :key="task.id"
                    :subtitle="`Station: ${task.stationDecision ?? 'PENDING'} · OCC: ${task.occDecision ?? 'PENDING'}`"
                    :title="localizedTaskTitle(task)"
                  >
                    <template #append>
                      <VBtn
                        v-if="
                          task.status === 'VERIFIED' &&
                            task.stationDecision === 'APPROVED' &&
                            !task.occDecision &&
                            can('station.signoff.approve').allowed
                        "
                        color="secondary"
                        :loading="loadingId === `${task.id}-approve-occ`"
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
                    subtitle="The selected phase has no station sign-off task."
                    title="No sign-off task"
                  />
                </VList>
              </VCard>
            </VCol>
          </VRow>
        </VWindowItem>

        <VWindowItem value="maintenance">
          <VCard border>
            <div class="pa-4 d-flex flex-wrap align-center justify-space-between ga-3">
              <div>
                <div class="text-h6 font-weight-bold">Handoff maintenance</div>
                <div class="text-caption text-medium-emphasis">
                  Station melaporkan temuan dan memonitor progres. Assessment serta rilis tetap
                  menjadi kewenangan MRO.
                </div>
              </div>
              <VBtn
                v-if="can('station.maintenance_request.create').allowed"
                prepend-icon="mdi-alert-plus-outline"
                text="Maintenance request"
                variant="tonal"
                @click="maintenanceDialog = true"
              />
            </div>
            <VDivider />
            <VTimeline
              v-if="flight.maintenanceRequests.length"
              align="start"
              class="pa-4"
              density="compact"
              side="end"
            >
              <VTimelineItem
                v-for="request in flight.maintenanceRequests"
                :key="request.id"
                :dot-color="
                  request.releaseNumber
                    ? 'success'
                    : request.materialStatus === 'WAITING_MATERIAL'
                      ? 'warning'
                      : 'secondary'
                "
                size="small"
              >
                <div class="d-flex flex-wrap align-center ga-2">
                  <strong>{{ request.defectNumber }}</strong><DsStatusBadge
                    :value="
                      request.releaseNumber
                        ? 'RELEASED'
                        : (request.materialStatus ?? request.workPackageStatus ?? request.status)
                    "
                  />
                </div>
                <div>{{ request.title }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ request.nextAction }} · Pemilik: {{ request.owner }}
                </div>
                <div v-if="request.workPackageNumber" class="mt-1">
                  <NuxtLink
                    v-if="can('maintenance.package.read').allowed"
                    :to="`/maintenance/work-packages/${request.workPackageId}`"
                  >
                    {{ request.workPackageNumber }}
                  </NuxtLink>
                  <span v-else>Referensi WP: {{ request.workPackageNumber }}</span>
                </div>
              </VTimelineItem>
            </VTimeline>
            <VCardText v-else class="py-10 text-center text-medium-emphasis">
              <VIcon class="mb-2" icon="mdi-shield-check-outline" size="36" />
              <div>Belum ada maintenance request dari Station untuk flight ini.</div>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="services">
          <VCard border>
            <div class="d-flex flex-column ga-3 pa-4 flex-sm-row align-sm-center">
              <div>
                <div class="text-h6 font-weight-bold">Station services</div>
                <div class="text-caption text-medium-emphasis">
                  Services shown only for {{ stationCode }} in the selected phase.
                </div>
              </div>
              <VSpacer />
              <VBtn
                :to="serviceBoardTarget"
                prepend-icon="mdi-plus"
                size="small"
                variant="outlined"
              >
                Open daily service board
              </VBtn>
            </div>
            <VDivider />

            <div class="overflow-x-auto">
              <VTable density="comfortable" hover>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Supplier</th>
                    <th>Reference rate</th>
                    <th>Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="service in stationServices"
                    :key="service.id"
                    :class="{
                      'workspace-record-highlight': route.query.sourceRecordId === service.id
                    }"
                  >
                    <td>
                      <div class="font-weight-medium">{{ service.serviceType }}</div>
                      <div class="text-caption text-medium-emphasis">{{ service.stationCode }}</div>
                    </td>
                    <td>{{ service.supplierName }}</td>
                    <td>
                      {{
                        service.referenceRate === null ? '-' : money(service.referenceRate, 'IDR')
                      }}
                    </td>
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
                        <DsConfirmIconButton
                          v-if="
                            service.status === 'REQUESTED' &&
                              can('station.operation.update').allowed
                          "
                          :action="() => serviceAction(service, 'confirm')"
                          color="success"
                          confirm-icon="mdi-check"
                          confirm-text="Confirm"
                          icon="mdi-check-circle-outline"
                          :loading="loadingId === `${service.id}-confirm`"
                          :message="`Confirm ${service.serviceType} service from ${service.supplierName}.`"
                          title="Confirm station service?"
                          tone="success"
                          tooltip="Confirm service"
                          variant="tonal"
                        />
                        <DsConfirmIconButton
                          v-if="
                            service.status === 'REQUESTED' &&
                              can('station.operation.update').allowed
                          "
                          :action="() => serviceAction(service, 'reject')"
                          color="error"
                          confirm-icon="mdi-close"
                          confirm-text="Reject"
                          icon="mdi-close-circle-outline"
                          :loading="loadingId === `${service.id}-reject`"
                          :message="`Reject ${service.serviceType} service from ${service.supplierName}.`"
                          title="Reject station service?"
                          tone="error"
                          tooltip="Reject service"
                          variant="text"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="stationServices.length === 0">
                    <td colspan="5" class="py-10 text-center text-medium-emphasis">
                      No station services recorded for {{ stationCode }}.
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
          </VCard>
        </VWindowItem>

        <VWindowItem value="evidence">
          <VRow>
            <VCol cols="12" lg="7">
              <VCard border>
                <div class="pa-4">
                  <div class="text-h6 font-weight-bold">Evidence register</div>
                  <div class="text-caption text-medium-emphasis">
                    Evidence associated with tasks in {{ selectedPhase.replaceAll('_', ' ') }}.
                  </div>
                </div>
                <VDivider />
                <VTabs v-model="evidenceRegisterTab" density="compact">
                  <VTab value="OPERATIONAL">Operational</VTab>
                  <VTab value="EXTERNAL_REPORT">External reports</VTab>
                </VTabs>
                <VDivider />
                <VList lines="three">
                  <VListItem
                    v-for="item in evidenceRegisterItems"
                    :key="item.id"
                    :subtitle="`${item.taskCode ?? 'Flight'} · ${formatDateTime(item.uploadedAt)}`"
                    :title="item.fileName"
                  >
                    <template #prepend>
                      <VAvatar
                        :color="item.evidenceCategory === 'EXTERNAL_REPORT' ? 'warning' : 'primary'"
                        size="36"
                        variant="tonal"
                      >
                        <VIcon
                          :icon="
                            item.evidenceCategory === 'EXTERNAL_REPORT'
                              ? 'mdi-shield-alert-outline'
                              : 'mdi-file-document-outline'
                          "
                        />
                      </VAvatar>
                    </template>
                    <div
                      v-if="item.evidenceCategory === 'EXTERNAL_REPORT'"
                      class="mb-1 d-flex flex-wrap ga-2"
                    >
                      <VChip color="warning" size="x-small" variant="tonal">
                        Source: {{ evidenceSourceLabel(item) }}
                      </VChip>
                      <VChip size="x-small" variant="tonal">
                        {{ evidenceReceivedLabel(item) }}
                      </VChip>
                    </div>
                    <div v-if="item.notes" class="text-caption text-medium-emphasis">
                      {{ item.notes }}
                    </div>
                    <template #append>
                      <VBtn
                        v-if="item.uploadId"
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
                  <VListItem
                    v-if="evidenceRegisterItems.length === 0"
                    :subtitle="
                      evidenceRegisterTab === 'EXTERNAL_REPORT'
                        ? 'Record AVSEC or authority reports received by PT AMA Station from the Tasks tab.'
                        : 'Upload evidence from the Tasks tab when required.'
                    "
                    :title="
                      evidenceRegisterTab === 'EXTERNAL_REPORT'
                        ? 'No external report in this phase'
                        : 'No operational evidence in this phase'
                    "
                  />
                </VList>
              </VCard>
            </VCol>

            <VCol cols="12" lg="5">
              <VCard border>
                <div class="pa-4">
                  <div class="text-h6 font-weight-bold">Dual sign-off</div>
                  <div class="text-caption text-medium-emphasis">
                    Station verification must finish before OCC approval.
                  </div>
                </div>
                <VDivider />
                <VList lines="three">
                  <VListItem
                    v-for="task in signoffTasks"
                    :key="task.id"
                    :title="localizedTaskTitle(task)"
                  >
                    <div class="mt-2 d-flex flex-wrap ga-2">
                      <VChip size="small" variant="tonal">
                        Station: {{ task.stationDecision ?? 'PENDING' }}
                      </VChip>
                      <VChip size="small" variant="tonal">
                        OCC: {{ task.occDecision ?? 'PENDING' }}
                      </VChip>
                    </div>
                    <template #append>
                      <VBtn
                        v-if="
                          task.status === 'VERIFIED' &&
                            task.stationDecision === 'APPROVED' &&
                            !task.occDecision &&
                            can('station.signoff.approve').allowed
                        "
                        color="secondary"
                        :loading="loadingId === `${task.id}-approve-occ`"
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
                    subtitle="Choose a phase with an origin or destination sign-off task."
                    title="No sign-off task"
                  />
                </VList>
              </VCard>
            </VCol>
          </VRow>
        </VWindowItem>

        <VWindowItem value="costs">
          <VCard border>
            <div class="d-flex flex-column ga-3 pa-4 flex-sm-row align-sm-center">
              <div>
                <div class="text-h6 font-weight-bold">Station costs</div>
                <div class="text-caption text-medium-emphasis">
                  Operational records for {{ stationCode }}. They do not complete station sign-off.
                </div>
              </div>
              <VSpacer />
              <VBtn :to="costBoardTarget" prepend-icon="mdi-plus" size="small" variant="outlined">
                Open daily cost board
              </VBtn>
            </div>
            <VDivider />

            <VAlert class="ma-4" type="info" variant="tonal">
              Accounting ownership remains in Accounting Workbench. This page only manages the
              operational cost record.
            </VAlert>

            <div class="overflow-x-auto">
              <VTable density="comfortable" hover>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Vendor</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="cost in stationCosts"
                    :key="cost.id"
                    :class="{
                      'workspace-record-highlight': route.query.sourceRecordId === cost.id
                    }"
                  >
                    <td>
                      <div class="font-weight-medium">{{ cost.costCategoryName }}</div>
                      <div class="text-caption text-medium-emphasis">{{ cost.stationCode }}</div>
                    </td>
                    <td>{{ cost.vendorName ?? '-' }}</td>
                    <td>{{ cost.description }}</td>
                    <td class="font-weight-medium">{{ money(cost.amount, cost.currencyCode) }}</td>
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
                        <DsConfirmIconButton
                          v-if="cost.status === 'DRAFT' && can('station.operation.update').allowed"
                          :action="() => costAction(cost, 'submit')"
                          color="primary"
                          confirm-icon="mdi-send"
                          confirm-text="Submit"
                          icon="mdi-send-check-outline"
                          :loading="loadingId === `${cost.id}-submit`"
                          :message="`Submit ${money(cost.amount, cost.currencyCode)} station cost for review.`"
                          title="Submit station cost?"
                          tone="primary"
                          tooltip="Submit cost"
                          variant="tonal"
                        />
                        <DsConfirmIconButton
                          v-if="cost.status === 'SUBMITTED' && can('station.cost.approve').allowed"
                          :action="() => costAction(cost, 'approve')"
                          color="success"
                          confirm-icon="mdi-check"
                          confirm-text="Approve"
                          icon="mdi-check-decagram-outline"
                          :loading="loadingId === `${cost.id}-approve`"
                          :message="`Approve ${money(cost.amount, cost.currencyCode)} station cost.`"
                          title="Approve station cost?"
                          tone="success"
                          tooltip="Approve cost"
                          variant="tonal"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="stationCosts.length === 0">
                    <td colspan="6" class="py-10 text-center text-medium-emphasis">
                      No station costs recorded for {{ stationCode }}.
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
          </VCard>
        </VWindowItem>

        <VWindowItem value="arrival">
          <VCard border>
            <div class="pa-4">
              <div class="text-h6 font-weight-bold">Actual load reconciliation</div>
              <div class="text-caption text-medium-emphasis">
                Record actual passenger and cargo totals after destination handling.
              </div>
            </div>
            <VDivider />

            <VCardText>
              <div class="mb-4 reconciliation-summary-grid">
                <VCard border variant="flat" class="pa-3">
                  <div class="text-caption text-medium-emphasis">Passenger variance</div>
                  <div
                    class="text-h6 font-weight-bold"
                    :class="passengerDifference === 0 ? 'text-success' : 'text-warning'"
                  >
                    {{ passengerDifference > 0 ? '+' : '' }}{{ passengerDifference }} pax
                  </div>
                </VCard>
                <VCard border variant="flat" class="pa-3">
                  <div class="text-caption text-medium-emphasis">Cargo variance</div>
                  <div
                    class="text-h6 font-weight-bold"
                    :class="cargoDifference === 0 ? 'text-success' : 'text-warning'"
                  >
                    {{ cargoDifference > 0 ? '+' : '' }}{{ cargoDifference }} kg
                  </div>
                </VCard>
                <VCard border variant="flat" class="pa-3">
                  <div class="text-caption text-medium-emphasis">No-show passengers</div>
                  <div class="text-h6 font-weight-bold">{{ reconciliation.noShowPassengers }}</div>
                </VCard>
                <VCard border variant="flat" class="pa-3">
                  <div class="text-caption text-medium-emphasis">Offloaded cargo</div>
                  <div class="text-h6 font-weight-bold">
                    {{ reconciliation.offloadedCargoKg }} kg
                  </div>
                </VCard>
              </div>

              <VAlert
                v-if="hasReconciliationDifference"
                class="mb-4"
                type="warning"
                variant="tonal"
              >
                Actual totals differ from plan. A discrepancy note is required before saving.
              </VAlert>

              <VRow>
                <VCol cols="12" sm="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.plannedPassengers"
                    density="compact"
                    label="Planned pax"
                    min="0"
                    type="number"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12" sm="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.actualPassengers"
                    density="compact"
                    label="Actual pax"
                    min="0"
                    type="number"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12" sm="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.plannedCargoKg"
                    density="compact"
                    label="Planned cargo (kg)"
                    min="0"
                    type="number"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12" sm="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.actualCargoKg"
                    density="compact"
                    label="Actual cargo (kg)"
                    min="0"
                    type="number"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12" sm="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.noShowPassengers"
                    density="compact"
                    label="No-show pax"
                    min="0"
                    type="number"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12" sm="6" md="3">
                  <VTextField
                    v-model.number="reconciliation.offloadedCargoKg"
                    density="compact"
                    label="Offloaded cargo (kg)"
                    min="0"
                    type="number"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12">
                  <VTextarea
                    v-model="reconciliation.totalDiscrepancyNote"
                    :error="reconciliationNoteRequired"
                    :error-messages="
                      reconciliationNoteRequired
                        ? ['Discrepancy note is required when actual totals differ.']
                        : []
                    "
                    label="Discrepancy note"
                    rows="3"
                    variant="outlined"
                  />
                </VCol>
              </VRow>
            </VCardText>

            <VCardActions class="px-4 pb-4">
              <VSpacer />
              <VBtn
                v-if="can('readiness.attest').allowed && selectedPhase.startsWith('DESTINATION_')"
                color="primary"
                :disabled="reconciliationNoteRequired"
                :loading="loadingId === 'reconciliation'"
                prepend-icon="mdi-content-save-check-outline"
                @click="saveReconciliation"
              >
                Save reconciliation
              </VBtn>
              <VAlert v-else density="compact" type="info" variant="tonal">
                Reconciliation can be saved from a destination phase by an authorized role.
              </VAlert>
            </VCardActions>
          </VCard>
        </VWindowItem>

        <VWindowItem value="audit">
          <VCard border>
            <div class="pa-4">
              <div class="text-h6 font-weight-bold">Operational audit trail</div>
              <div class="text-caption text-medium-emphasis">
                Newest activity is shown first. Audit records are read-only.
              </div>
            </div>
            <VDivider />

            <VTimeline
              v-if="sortedAudit.length"
              align="start"
              class="pa-4"
              density="compact"
              side="end"
            >
              <VTimelineItem
                v-for="entry in sortedAudit"
                :key="entry.id"
                :dot-color="entry.afterStatus === 'REJECTED' ? 'error' : 'secondary'"
                size="small"
              >
                <div class="d-flex flex-wrap align-center ga-2">
                  <div class="font-weight-medium">{{ entry.action }}</div>
                  <VChip size="x-small" variant="tonal">{{ entry.module }}</VChip>
                </div>
                <div class="text-body-2">{{ entry.actorRole }} · {{ entry.actorUserId }}</div>
                <div v-if="entry.beforeStatus || entry.afterStatus" class="text-caption">
                  {{ entry.beforeStatus ?? '—' }} → {{ entry.afterStatus ?? '—' }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatDateTime(entry.timestamp) }} · {{ entry.reason ?? 'No note' }}
                </div>
              </VTimelineItem>
            </VTimeline>

            <VCardText v-else class="py-10 text-center text-medium-emphasis">
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
      width="480"
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
              :loading="loadingId === `${selectedService.id}-reject`"
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
              :loading="loadingId === `${selectedService.id}-confirm`"
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
            :loading="loadingId === `${selectedCost.id}-submit`"
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
            :loading="loadingId === `${selectedCost.id}-approve`"
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
          <div v-if="evidenceTask" class="mb-4 rounded border pa-3">
            <div class="font-weight-medium">{{ localizedTaskTitle(evidenceTask) }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ evidenceTask.taskCode }} · {{ evidenceTask.stationCode }}
            </div>
          </div>
          <VSelect
            v-model="evidenceCategory"
            :items="[
              { title: 'Operational evidence', value: 'OPERATIONAL' },
              { title: 'External report', value: 'EXTERNAL_REPORT' }
            ]"
            class="mb-3"
            label="Evidence type"
            variant="outlined"
          />
          <VSelect
            v-if="evidenceCategory === 'EXTERNAL_REPORT'"
            v-model="evidenceSourceParty"
            :items="[
              { title: 'PT AMA Station', value: 'PT_AMA_STATION' },
              { title: 'AVSEC', value: 'AVSEC' },
              { title: 'Authority', value: 'AUTHORITY' },
              { title: 'Other', value: 'OTHER' }
            ]"
            class="mb-3"
            label="Report source"
            variant="outlined"
          />
          <VTextField
            v-if="evidenceCategory === 'EXTERNAL_REPORT'"
            v-model="evidenceSourcePartyName"
            class="mb-3"
            label="Source party name"
            placeholder="AVSEC post, authority office, or contact name"
            variant="outlined"
          />
          <VTextField
            v-if="evidenceCategory === 'EXTERNAL_REPORT'"
            v-model="evidenceReceivedAt"
            class="mb-3"
            label="Received at"
            type="datetime-local"
            variant="outlined"
          />
          <VFileInput
            v-model="evidenceFile"
            accept="image/*,.pdf"
            label="Choose evidence file"
            prepend-icon="mdi-paperclip"
            show-size
            variant="outlined"
          />
          <div class="mb-3 text-caption text-medium-emphasis">
            PDF, JPEG, and PNG evidence received and uploaded by PT AMA Station.
          </div>
          <VTextarea v-model="evidenceNotes" label="Notes" rows="3" variant="outlined" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="evidenceDialog = false">Cancel</VBtn>
          <VBtn
            color="primary"
            :disabled="!selectedEvidenceFile()"
            :loading="loadingId === `${evidenceTask?.id}-evidence`"
            prepend-icon="mdi-upload"
            @click="saveEvidence"
          >
            Upload evidence
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="rejectionDialog" max-width="520">
      <VCard>
        <VCardTitle>Reject station task</VCardTitle>
        <VCardText>
          <div v-if="rejectionTask" class="mb-4 rounded border pa-3">
            <div class="font-weight-medium">{{ localizedTaskTitle(rejectionTask) }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ rejectionTask.taskCode }} · {{ rejectionTask.stationCode }}
            </div>
          </div>
          <VTextarea
            v-model="rejectionReason"
            label="Rejection reason"
            rows="4"
            variant="outlined"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="rejectionDialog = false">Cancel</VBtn>
          <VBtn
            color="error"
            :disabled="!rejectionReason.trim()"
            :loading="loadingId === `${rejectionTask?.id}-reject`"
            prepend-icon="mdi-close-circle-outline"
            @click="rejectTask"
          >
            Reject task
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <MaintenanceRequestDialog
      v-model="maintenanceDialog"
      :flight="
        flight
          ? {
            flightNumber: flight.flightNumber,
            aircraftRegistration: flight.aircraftRegistration,
            aircraftVersion: flight.aircraftVersion
          }
          : null
      "
      :loading="loadingId === 'maintenance-request'"
      @submit="createMaintenanceRequest"
    />

    <VSnackbar
      :model-value="Boolean(actionSuccess)"
      color="success"
      location="top end"
      timeout="3000"
      @update:model-value="handleSnackbarModelValue"
    >
      {{ actionSuccess }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.station-flight-workspace {
  min-width: 0;
}

.workspace-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.workspace-summary-item {
  min-width: 0;
  padding-right: 16px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.workspace-summary-item:last-child {
  border-right: 0;
}

.reconciliation-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.workspace-record-highlight {
  outline: 2px solid rgba(var(--v-theme-primary), 0.35);
  outline-offset: -2px;
}

.workspace-task-actions {
  max-width: 320px;
}

@media (max-width: 959px) {
  .workspace-summary-grid,
  .reconciliation-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workspace-summary-item:nth-child(2) {
    border-right: 0;
  }
}

@media (max-width: 599px) {
  .workspace-summary-grid,
  .reconciliation-summary-grid {
    grid-template-columns: 1fr;
  }

  .workspace-summary-item {
    padding-right: 0;
    padding-bottom: 12px;
    border-right: 0;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .workspace-summary-item:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .workspace-task-actions {
    width: 100%;
    max-width: none;
    justify-content: flex-start !important;
  }
}
</style>
