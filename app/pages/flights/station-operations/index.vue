<script setup lang="ts">
import { fetchApi } from '../../../composables/useApiEnvelope';
import type { LocalUploadDto } from '#shared/contracts/uploads';
import type { StationOption as MasterStationOption } from '#shared/features/operations/stations';

type FlightDirection = 'INBOUND' | 'OUTBOUND';
type FlightStatus = 'SCHEDULED' | 'ARRIVING' | 'LANDED' | 'DELAYED' | 'DEPARTED' | 'BOARDING';
type ReadinessStatus = 'READY' | 'CHECK' | 'NOT_READY';
type ServiceType = 'HANDLING' | 'PARKING';
type ServiceStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
type CostStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'VOID';

interface StationOption {
  code: string;
  name: string;
}

interface StationFlightRow {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  aircraftType: string;
  type: 'PSG' | 'CRG';
  direction: FlightDirection;
  scheduledTime: string;
  actualTime: string;
  status: FlightStatus;
  readiness: ReadinessStatus;
  paxOnboard: number;
  paxTotal: number;
  cargoWeightKg: number;
  needsAction: boolean;
  flightId: string;
}

interface StationServiceRow {
  id: string;
  flightId: string;
  flightNumber: string;
  serviceType: ServiceType;
  supplierName: string;
  status: ServiceStatus;
  referenceRate?: number;
  version: number;
}

interface StationCostRow {
  id: string;
  flightId: string | null;
  flightNumber: string | null;
  stationCode: string;
  vendorName: string | null;
  costCategoryName: string;
  description: string;
  amount: number;
  currencyCode: string;
  status: CostStatus;
  version: number;
}

interface StationDataset {
  flights: StationFlightRow[];
  services: StationServiceRow[];
  costs: StationCostRow[];
  kpi: {
    inboundFlights: number;
    outboundFlights: number;
    flightsNeedingAction: number;
    paxCheckedIn: number;
    paxBoarded: number;
    cargoWeightKg: number;
    pendingServices: number;
    pendingCosts: number;
    delta: {
      inboundFlights: number;
      outboundFlights: number;
      flightsNeedingAction: number;
      pax: number;
      cargoWeightKg: number;
      pendingServices: number;
      pendingCosts: number;
    };
  };
  dailyReport: {
    flights: { total: number; onTime: number; delayed: number };
    passengers: { checkedIn: number; boarded: number; loadFactor: number };
    cargo: { totalWeightKg: number; totalVolumeM3: number; shipments: number };
    services: { requested: number; confirmed: number; completed: number };
    costs: {
      total: number;
      approvedPct: number;
      approvedAmount: number;
      positioningAmount: number;
    };
  };
  flightsByType: {
    passenger: { count: number; pct: number };
    cargo: { count: number; pct: number };
    positioning: { count: number; pct: number };
  };
  exceptions: {
    delayOver15: number;
    servicesOverdue: number;
    costOverdue: number;
    manifestIssue: number;
    techLogOpen: number;
  };
}

interface ApiStationFlight {
  id: string;
  flightId: string;
  flightNumber: string;
  flightDate: string;
  aircraftId: string;
  aircraftType: string;
  originStationId: string;
  originStationCode: string;
  destinationStationId: string;
  destinationStationCode: string;
  scheduledDepartureAt: string;
  actualDepartureAt: string | null;
  actualArrivalAt: string | null;
  currentStatus: string;
  currentStatusCode: string;
  flightTypeCode: string;
  serviceTypeCode: string;
  estimatedRevenue: number | null;
  passengerTotal: number;
  passengerActual: number;
  cargoWeightKg: number;
  dangerousGoods: boolean;
  tasks: Array<{
    id: string;
    stationId: string;
    taskCode: string;
    taskTitle: string;
    status: string;
    phase: string;
    requiresEvidence: boolean;
    notes: string | null;
    verifiedBy: string | null;
    verifiedAt: string | null;
    assignedTo: string | null;
    rejectionReason: string | null;
    version: number;
    evidenceCount: number;
    stationDecision: string | null;
    occDecision: string | null;
  }>;
  services: Array<{
    id: string;
    flightId: string;
    flightNumber: string;
    stationId: string;
    stationCode: string;
    serviceSupplierId: string;
    supplierName: string;
    serviceType: 'HANDLING' | 'PARKING';
    status: 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    referenceRate: number | null;
    rejectionNote: string | null;
    version: number;
  }>;
  costs: Array<{
    id: string;
    flightId: string | null;
    flightNumber: string | null;
    stationId: string;
    stationCode: string;
    vendorId: string | null;
    vendorName: string | null;
    costCategoryId: string;
    costCategoryName: string;
    amount: number;
    currencyId: string;
    currencyCode: string;
    description: string;
    status: CostStatus;
    version: number;
  }>;
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
}

type StationTaskRow = ApiStationFlight['tasks'][number] & {
  flightId: string;
  flightNumber: string;
};

// ---------------------------------------------------------------------------
// Master data & user scope
// ---------------------------------------------------------------------------

const { currentPersona } = useDemoSession();
const { data: masterStationOptions } = await useAsyncData(
  'station-operations-station-options',
  () => fetchApi<MasterStationOption[]>('/api/master-data/stations/options'),
  { default: () => [] }
);
const stationMaster = computed<StationOption[]>(() =>
  masterStationOptions.value.map((station) => ({
    code: station.stationCode,
    name: station.stationName
  }))
);
const stationScope = computed(() =>
  currentPersona.value.stationScope.includes('ALL')
    ? stationMaster.value.map((station) => station.code)
    : currentPersona.value.stationScope
);

const canChangeStation = computed(() => stationScope.value.length > 1);
const stationOptions = computed(() =>
  stationMaster.value.filter((option) => stationScope.value.includes(option.code))
);

// ---------------------------------------------------------------------------
// Header controls state
// ---------------------------------------------------------------------------

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

const selectedStationCode = ref<string>(
  stationScope.value.includes('DJJ') ? 'DJJ' : (stationScope.value[0] ?? 'DJJ')
);
const route = useRoute();
watch(stationScope, (scope) => {
  const requested =
    typeof route.query.stationCode === 'string' ? route.query.stationCode : undefined;
  if (requested && scope.includes(requested)) {
    selectedStationCode.value = requested;
  } else if (!scope.includes(selectedStationCode.value)) {
    selectedStationCode.value = scope[0] ?? 'DJJ';
  }
});
const { can } = useAuthorization();
const corporateAssetSummary = ref<{
  total: number;
  serviceable: number;
  maintenance: number;
} | null>(null);
watch(
  selectedStationCode,
  async (code) => {
    if (!can('asset.read').allowed) {
      corporateAssetSummary.value = null;
      return;
    }
    const result = await fetchApi<any>('/api/asset-management/assets', {
      query: { stationId: `st-${code.toLowerCase()}`, limit: 250 }
    });
    corporateAssetSummary.value = {
      total: result.total,
      serviceable: result.items.filter((item: any) => item.conditionStatus === 'SERVICEABLE')
        .length,
      maintenance: result.items.filter((item: any) => item.conditionStatus === 'UNDER_MAINTENANCE')
        .length
    };
  },
  { immediate: true }
);
const operationalDate = ref<string>(
  typeof route.query.date === 'string' ? route.query.date : todayIso()
);

const pending = ref(false);
const error = ref('');
const actionError = ref('');
const actionSuccess = ref('');
const loadingId = ref('');
const lastUpdated = ref<Date | null>(null);

interface SelectOption {
  id: string;
  title: string;
  subtitle?: string;
}

const stationServiceTypes = ref<SelectOption[]>([]);
const handlingParkingSuppliers = ref<SelectOption[]>([]);
const costCategories = ref<SelectOption[]>([]);
const vendors = ref<SelectOption[]>([]);
const currencies = ref<SelectOption[]>([]);

const dataset = ref<StationDataset>(createEmptyDataset());
const workbenchFlights = ref<ApiStationFlight[]>([]);
const stationTasks = computed<StationTaskRow[]>(() =>
  workbenchFlights.value.flatMap((flight) =>
    flight.tasks
      .filter((task) => task.stationId === `st-${selectedStationCode.value.toLowerCase()}`)
      .map((task) => ({ ...task, flightId: flight.flightId, flightNumber: flight.flightNumber }))
  )
);
const pendingStationTaskCount = computed(
  () => stationTasks.value.filter((task) => task.status !== 'VERIFIED').length
);
const workbenchAudit = computed(() =>
  workbenchFlights.value
    .flatMap((flight) =>
      flight.audit.map((entry) => ({
        ...entry,
        flightId: flight.flightId,
        flightNumber: flight.flightNumber
      }))
    )
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 20)
);

function stationTaskBlocker(task: StationTaskRow) {
  if (task.requiresEvidence && task.evidenceCount === 0) {
    return 'Attach at least one evidence record before verification.';
  }
  const flight = workbenchFlights.value.find((item) => item.flightId === task.flightId);
  if (!flight) return null;
  if (task.taskCode === 'ORIGIN_HANDLING') {
    const handlingReady = flight.services.some(
      (service) =>
        service.stationCode === selectedStationCode.value &&
        service.serviceType === 'HANDLING' &&
        ['CONFIRMED', 'COMPLETED'].includes(service.status)
    );
    if (!handlingReady) return 'Confirm the origin handling service first.';
  }
  if (task.taskCode.endsWith('STATION_SIGNOFF')) {
    const prefix = task.taskCode.startsWith('ORIGIN_') ? 'ORIGIN_' : 'DESTINATION_';
    const incomplete = flight.tasks.filter(
      (candidate) =>
        candidate.id !== task.id &&
        candidate.stationId === task.stationId &&
        candidate.taskCode.startsWith(prefix) &&
        candidate.status !== 'VERIFIED'
    );
    if (incomplete.length) {
      return `Complete ${incomplete.length} remaining ${prefix === 'ORIGIN_' ? 'origin' : 'destination'} task(s) first.`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dummy dataset builders
// ---------------------------------------------------------------------------

function createEmptyDataset(): StationDataset {
  return {
    flights: [],
    services: [],
    costs: [],
    kpi: {
      inboundFlights: 0,
      outboundFlights: 0,
      flightsNeedingAction: 0,
      paxCheckedIn: 0,
      paxBoarded: 0,
      cargoWeightKg: 0,
      pendingServices: 0,
      pendingCosts: 0,
      delta: {
        inboundFlights: 0,
        outboundFlights: 0,
        flightsNeedingAction: 0,
        pax: 0,
        cargoWeightKg: 0,
        pendingServices: 0,
        pendingCosts: 0
      }
    },
    dailyReport: {
      flights: { total: 0, onTime: 0, delayed: 0 },
      passengers: { checkedIn: 0, boarded: 0, loadFactor: 0 },
      cargo: { totalWeightKg: 0, totalVolumeM3: 0, shipments: 0 },
      services: { requested: 0, confirmed: 0, completed: 0 },
      costs: { total: 0, approvedPct: 0, approvedAmount: 0, positioningAmount: 0 }
    },
    flightsByType: {
      passenger: { count: 0, pct: 0 },
      cargo: { count: 0, pct: 0 },
      positioning: { count: 0, pct: 0 }
    },
    exceptions: {
      delayOver15: 0,
      servicesOverdue: 0,
      costOverdue: 0,
      manifestIssue: 0,
      techLogOpen: 0
    }
  };
}

// ---------------------------------------------------------------------------
// API data transformation
// ---------------------------------------------------------------------------

function toFlightStatus(statusCode: string): FlightStatus {
  switch (statusCode) {
    case 'IN_PROGRESS':
      return 'DEPARTED';
    case 'LANDED':
      return 'LANDED';
    case 'DIVERTED':
    case 'BLOCKED':
      return 'DELAYED';
    case 'BOARDING':
      return 'BOARDING';
    case 'CLOSED':
      return 'LANDED';
    case 'CANCELLED':
      return 'DELAYED';
    case 'PENDING_CLOSURE':
      return 'ARRIVING';
    default:
      return 'SCHEDULED';
  }
}

function toFlightType(serviceTypeCode: string): StationFlightRow['type'] {
  if (serviceTypeCode.includes('CARGO')) return 'CRG';
  if (serviceTypeCode === 'POSITIONING') return 'PSG';
  return 'PSG';
}

function toLocalTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function deriveReadiness(flight: ApiStationFlight): ReadinessStatus {
  const incompleteTasks = flight.tasks.filter((t) => t.status !== 'VERIFIED');
  if (incompleteTasks.length === 0) return 'READY';
  const hasBlocking = incompleteTasks.some((t) => t.status === 'REJECTED');
  return hasBlocking ? 'NOT_READY' : 'CHECK';
}

function buildDatasetFromApi(
  stationCode: string,
  flights: ApiStationFlight[],
  allServices: ApiStationFlight['services'],
  allCosts: ApiStationFlight['costs']
): StationDataset {
  const rows: StationFlightRow[] = flights.map((flight) => {
    const direction: FlightDirection =
      flight.originStationCode === stationCode ? 'OUTBOUND' : 'INBOUND';
    const status = toFlightStatus(flight.currentStatusCode);
    const readiness = deriveReadiness(flight);
    const isCargo = toFlightType(flight.serviceTypeCode) === 'CRG';

    return {
      id: flight.id,
      flightId: flight.flightId,
      flightNumber: flight.flightNumber,
      origin: flight.originStationCode,
      destination: flight.destinationStationCode,
      aircraftType: flight.aircraftType || 'Aircraft',
      type: toFlightType(flight.serviceTypeCode),
      direction,
      scheduledTime: toLocalTime(flight.scheduledDepartureAt),
      actualTime:
        direction === 'OUTBOUND'
          ? toLocalTime(flight.actualDepartureAt)
          : toLocalTime(flight.actualArrivalAt),
      status,
      readiness,
      paxOnboard: isCargo ? 0 : flight.passengerActual,
      paxTotal: isCargo ? 0 : flight.passengerTotal,
      cargoWeightKg: flight.cargoWeightKg,
      needsAction: readiness !== 'READY'
    };
  });

  const services: StationServiceRow[] = allServices
    .filter((s) => s.stationCode === stationCode)
    .map((s) => ({
      id: s.id,
      flightId: s.flightId,
      flightNumber: s.flightNumber,
      serviceType: s.serviceType,
      supplierName: s.supplierName,
      status: s.status,
      referenceRate: s.referenceRate ?? undefined,
      version: s.version
    }));

  const costs: StationCostRow[] = allCosts
    .filter((c) => c.stationCode === stationCode)
    .map((c) => ({
      id: c.id,
      flightId: c.flightId,
      flightNumber: c.flightNumber,
      stationCode: c.stationCode,
      vendorName: c.vendorName,
      costCategoryName: c.costCategoryName,
      description: c.description,
      amount: c.amount,
      currencyCode: c.currencyCode,
      status: c.status,
      version: c.version
    }));

  const inboundFlights = rows.filter((r) => r.direction === 'INBOUND').length;
  const outboundFlights = rows.filter((r) => r.direction === 'OUTBOUND').length;
  const flightsNeedingAction = rows.filter((r) => r.needsAction).length;
  const passengerFlights = rows.filter((r) => r.type === 'PSG');
  const cargoFlights = rows.filter((r) => r.type === 'CRG');
  const totalFlights = rows.length || 1;

  return {
    flights: rows,
    services,
    costs,
    kpi: {
      inboundFlights,
      outboundFlights,
      flightsNeedingAction,
      paxCheckedIn: passengerFlights.reduce((sum, flight) => sum + flight.paxTotal, 0),
      paxBoarded: passengerFlights.reduce((sum, flight) => sum + flight.paxOnboard, 0),
      cargoWeightKg: cargoFlights.reduce((sum, flight) => sum + flight.cargoWeightKg, 0),
      pendingServices: services.filter((s) => s.status === 'REQUESTED').length,
      pendingCosts: costs.filter((c) => ['DRAFT', 'SUBMITTED'].includes(c.status)).length,
      delta: {
        inboundFlights: 0,
        outboundFlights: 0,
        flightsNeedingAction: 0,
        pax: 0,
        cargoWeightKg: 0,
        pendingServices: 0,
        pendingCosts: 0
      }
    },
    dailyReport: {
      flights: {
        total: rows.length,
        onTime: rows.filter((r) => r.status !== 'DELAYED').length,
        delayed: rows.filter((r) => r.status === 'DELAYED').length
      },
      passengers: {
        checkedIn: passengerFlights.reduce((sum, flight) => sum + flight.paxTotal, 0),
        boarded: passengerFlights.reduce((sum, flight) => sum + flight.paxOnboard, 0),
        loadFactor:
          passengerFlights.reduce((sum, flight) => sum + flight.paxTotal, 0) > 0
            ? Math.round(
                (passengerFlights.reduce((sum, flight) => sum + flight.paxOnboard, 0) /
                  passengerFlights.reduce((sum, flight) => sum + flight.paxTotal, 0)) *
                  100
              )
            : 0
      },
      cargo: {
        totalWeightKg: cargoFlights.reduce((sum, flight) => sum + flight.cargoWeightKg, 0),
        totalVolumeM3: 0,
        shipments: 0
      },
      services: {
        requested: services.filter((s) => s.status === 'REQUESTED').length,
        confirmed: services.filter((s) => s.status === 'CONFIRMED').length,
        completed: services.filter((s) => s.status === 'COMPLETED').length
      },
      costs: {
        total: costs.length,
        approvedPct: costs.length
          ? Math.round((costs.filter((c) => c.status === 'APPROVED').length / costs.length) * 100)
          : 0,
        approvedAmount: costs
          .filter((c) => c.status === 'APPROVED')
          .reduce((sum, c) => sum + c.amount, 0),
        positioningAmount: costs
          .filter((c) => c.costCategoryName.toLowerCase().includes('positioning'))
          .reduce((sum, c) => sum + c.amount, 0)
      }
    },
    flightsByType: {
      passenger: {
        count: passengerFlights.length,
        pct: Math.round((passengerFlights.length / totalFlights) * 100)
      },
      cargo: {
        count: cargoFlights.length,
        pct: Math.round((cargoFlights.length / totalFlights) * 100)
      },
      positioning: {
        count: flights.filter((flight) => flight.serviceTypeCode === 'POSITIONING').length,
        pct: Math.round(
          (flights.filter((flight) => flight.serviceTypeCode === 'POSITIONING').length /
            totalFlights) *
            100
        )
      }
    },
    exceptions: {
      delayOver15: rows.filter((r) => r.status === 'DELAYED').length,
      servicesOverdue: services.filter((s) => s.status === 'REQUESTED').length,
      costOverdue: costs.filter((c) => ['DRAFT', 'SUBMITTED'].includes(c.status)).length,
      manifestIssue: 0,
      techLogOpen: 0
    }
  };
}

// ---------------------------------------------------------------------------
// Load / refresh
// ---------------------------------------------------------------------------

async function loadOptions() {
  try {
    const [serviceTypes, suppliers, categories, vendorOptions, currencyOptions] = await Promise.all(
      [
        fetchApi<
          Array<{
            stationServiceTypes: Array<{ id: string; value: string; code: string; label: string }>;
          }>
        >('/api/flight-operations/lookups').then(
          (lookups) =>
            (lookups as any).stationServiceTypes?.map((item: any) => ({
              id: item.value,
              title: item.label
            })) ?? []
        ),
        fetchApi<Array<{ id: string; supplierCode: string; supplierName: string }>>(
          '/api/master-data/handling-parking-suppliers/options'
        ).then((items) =>
          items.map((item) => ({
            id: item.id,
            title: item.supplierName,
            subtitle: item.supplierCode
          }))
        ),
        fetchApi<Array<{ id: string; categoryCode: string; categoryName: string }>>(
          '/api/master-data/cost-categories/options'
        ).then((items) =>
          items.map((item) => ({
            id: item.id,
            title: item.categoryName,
            subtitle: item.categoryCode
          }))
        ),
        fetchApi<Array<{ id: string; vendorCode: string; vendorName: string }>>(
          '/api/master-data/vendors/options'
        ).then((items) =>
          items.map((item) => ({ id: item.id, title: item.vendorName, subtitle: item.vendorCode }))
        ),
        fetchApi<Array<{ id: string; currencyCode: string; currencyName: string }>>(
          '/api/master-data/currencies/options'
        ).then((items) =>
          items.map((item) => ({
            id: item.id,
            title: item.currencyName,
            subtitle: item.currencyCode
          }))
        )
      ]
    );
    stationServiceTypes.value = serviceTypes;
    handlingParkingSuppliers.value = suppliers;
    costCategories.value = categories;
    vendors.value = vendorOptions;
    currencies.value = currencyOptions;
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Gagal memuat opsi master data.';
  }
}

async function loadStationOperations() {
  pending.value = true;
  error.value = '';
  try {
    const flights = await fetchApi<ApiStationFlight[]>(
      '/api/flight-operations/station-operations',
      {
        query: {
          stationCode: selectedStationCode.value,
          operationalDate: operationalDate.value,
          flightId: typeof route.query.flightId === 'string' ? route.query.flightId : undefined,
          phase: typeof route.query.phase === 'string' ? route.query.phase : undefined
        }
      }
    );
    workbenchFlights.value = flights;
    const services = flights.flatMap((flight) => flight.services);
    const costs = flights.flatMap((flight) => flight.costs);
    dataset.value = buildDatasetFromApi(selectedStationCode.value, flights, services, costs);
    lastUpdated.value = new Date();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat data Station Operations.';
  } finally {
    pending.value = false;
  }
}

async function refreshAll() {
  await loadStationOperations();
}

async function runTaskAction(
  taskId: string,
  action: 'start' | 'verify' | 'approve-occ',
  version: number
) {
  loadingId.value = taskId;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    await fetchApi(`/api/flight-operations/station-tasks/${taskId}/actions/${action}`, {
      method: 'POST',
      body:
        action === 'approve-occ'
          ? {
              decision: 'APPROVED',
              expectedVersion: version,
              reason: 'Reviewed in Station Operations.'
            }
          : action === 'verify'
            ? { expectedVersion: version, reason: 'Verified with station evidence.' }
            : { expectedVersion: version }
    });
    await refreshAll();
    actionSuccess.value =
      action === 'approve-occ'
        ? 'OCC sign-off approval recorded.'
        : action === 'verify'
          ? 'Station task verified.'
          : 'Station task started.';
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Gagal memperbarui station task.';
  } finally {
    loadingId.value = '';
  }
}

const evidenceDialog = ref(false);
const evidenceTaskId = ref('');
const evidenceTaskVersion = ref(0);
const evidenceFile = ref<File | File[] | null>(null);
const evidenceNotes = ref('');
const rejectionDialog = ref(false);
const rejectionTaskId = ref('');
const rejectionTaskVersion = ref(0);
const rejectionReason = ref('');

function openEvidence(task: StationTaskRow) {
  evidenceTaskId.value = task.id;
  evidenceTaskVersion.value = task.version;
  evidenceFile.value = null;
  evidenceNotes.value = '';
  evidenceDialog.value = true;
}

function selectedEvidenceFile() {
  return Array.isArray(evidenceFile.value) ? evidenceFile.value[0] : evidenceFile.value;
}

async function addTaskEvidence() {
  const file = selectedEvidenceFile();
  if (!file) return;
  loadingId.value = evidenceTaskId.value;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    const form = new FormData();
    form.append('file', file);
    const upload = await fetchApi<LocalUploadDto>('/api/uploads', {
      method: 'POST',
      body: form
    });
    await fetchApi(`/api/flight-operations/station-tasks/${evidenceTaskId.value}/evidence`, {
      method: 'POST',
      body: {
        expectedVersion: evidenceTaskVersion.value,
        uploadId: upload.id,
        fileName: upload.originalName,
        documentType: 'STATION_OPERATION_EVIDENCE',
        notes: evidenceNotes.value || undefined
      }
    });
    evidenceDialog.value = false;
    await refreshAll();
    actionSuccess.value = 'Evidence added to the station task.';
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Gagal menambahkan evidence.';
  } finally {
    loadingId.value = '';
  }
}

function openTaskRejection(task: StationTaskRow) {
  rejectionTaskId.value = task.id;
  rejectionTaskVersion.value = task.version;
  rejectionReason.value = '';
  rejectionDialog.value = true;
}

async function rejectTask() {
  if (!rejectionReason.value.trim()) return;
  loadingId.value = rejectionTaskId.value;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    await fetchApi(`/api/flight-operations/station-tasks/${rejectionTaskId.value}/actions/reject`, {
      method: 'POST',
      body: {
        expectedVersion: rejectionTaskVersion.value,
        rejectionReason: rejectionReason.value
      }
    });
    rejectionDialog.value = false;
    await refreshAll();
    actionSuccess.value = 'Station task rejected.';
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Gagal menolak station task.';
  } finally {
    loadingId.value = '';
  }
}

watch([selectedStationCode, operationalDate], () => {
  loadStationOperations();
});

onMounted(() => {
  if (typeof route.query.flightId === 'string') {
    const query = { ...route.query };
    delete query.flightId;
    void navigateTo(
      {
        path: `/flights/station-operations/${route.query.flightId}`,
        query
      },
      { replace: true }
    );
    return;
  }
  loadOptions();
  loadStationOperations();
});

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function money(value: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function numberFormat(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}

function formatDateDisplay(dateStr: string) {
  const parsed = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

function formatLastUpdated(date: Date | null) {
  if (!date) return '-';
  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jayapura',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
  return `${formatted} WIT`;
}

// ---------------------------------------------------------------------------
// Computed view data
// ---------------------------------------------------------------------------

const selectedStationLabel = computed(() => {
  const found = stationMaster.value.find((option) => option.code === selectedStationCode.value);
  return found ? `${found.code} - ${found.name}` : selectedStationCode.value;
});

const isEmptyDay = computed(
  () =>
    !pending.value &&
    !error.value &&
    dataset.value.flights.length === 0 &&
    dataset.value.services.length === 0 &&
    dataset.value.costs.length === 0
);

interface KpiCard {
  key: string;
  label: string;
  value: string;
  icon: string;
  tone: 'primary' | 'secondary' | 'info' | 'success' | 'warning';
  delta: number;
  goodDirection: 'up' | 'down';
}

const kpiCards = computed<KpiCard[]>(() => {
  const kpi = dataset.value.kpi;
  return [
    {
      key: 'inbound',
      label: 'Inbound Flights',
      value: numberFormat(kpi.inboundFlights),
      icon: 'mdi-airplane-landing',
      tone: 'info',
      delta: kpi.delta.inboundFlights,
      goodDirection: 'up'
    },
    {
      key: 'outbound',
      label: 'Outbound Flights',
      value: numberFormat(kpi.outboundFlights),
      icon: 'mdi-airplane-takeoff',
      tone: 'success',
      delta: kpi.delta.outboundFlights,
      goodDirection: 'up'
    },
    {
      key: 'action',
      label: 'Flights Needing Action',
      value: numberFormat(kpi.flightsNeedingAction),
      icon: 'mdi-alert',
      tone: 'warning',
      delta: kpi.delta.flightsNeedingAction,
      goodDirection: 'down'
    },
    {
      key: 'pax',
      label: 'Pax Check-in / Boarded',
      value: `${numberFormat(kpi.paxCheckedIn)} / ${numberFormat(kpi.paxBoarded)}`,
      icon: 'mdi-account-group',
      tone: 'secondary',
      delta: kpi.delta.pax,
      goodDirection: 'up'
    },
    {
      key: 'cargo',
      label: 'Cargo Weight (kg)',
      value: numberFormat(kpi.cargoWeightKg),
      icon: 'mdi-package-variant',
      tone: 'warning',
      delta: kpi.delta.cargoWeightKg,
      goodDirection: 'up'
    },
    {
      key: 'pendingServices',
      label: 'Pending Services',
      value: numberFormat(kpi.pendingServices),
      icon: 'mdi-toolbox-outline',
      tone: 'info',
      delta: kpi.delta.pendingServices,
      goodDirection: 'down'
    },
    {
      key: 'pendingCosts',
      label: 'Pending Costs',
      value: numberFormat(kpi.pendingCosts),
      icon: 'mdi-currency-usd',
      tone: 'success',
      delta: kpi.delta.pendingCosts,
      goodDirection: 'down'
    }
  ];
});

function deltaTone(card: KpiCard) {
  const actualDirection = card.delta >= 0 ? 'up' : 'down';
  return actualDirection === card.goodDirection ? 'success' : 'error';
}
function deltaIcon(card: KpiCard) {
  return card.delta >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down';
}

const visibleFlights = computed(() => dataset.value.flights.slice(0, 5));

const donutSegments = computed(() => {
  const { passenger, cargo, positioning } = dataset.value.flightsByType;
  const total = passenger.pct + cargo.pct + positioning.pct || 1;
  let offset = 0;
  const build = (pct: number, color: string) => {
    const seg = { offset, length: (pct / total) * 100, color };
    offset += seg.length;
    return seg;
  };
  return [
    {
      ...build(passenger.pct, 'rgb(var(--v-theme-primary))'),
      label: 'Passenger',
      count: passenger.count,
      pct: passenger.pct
    },
    {
      ...build(cargo.pct, 'rgb(var(--v-theme-success))'),
      label: 'Cargo',
      count: cargo.count,
      pct: cargo.pct
    },
    {
      ...build(positioning.pct, 'rgb(var(--v-theme-warning))'),
      label: 'Positioning',
      count: positioning.count,
      pct: positioning.pct
    }
  ];
});

const exceptionItems = computed(() => {
  const ex = dataset.value.exceptions;
  return [
    {
      key: 'delay',
      label: 'Delay > 15m',
      value: ex.delayOver15,
      icon: 'mdi-clock-alert-outline',
      tone: ex.delayOver15 > 0 ? 'error' : 'success'
    },
    {
      key: 'servicesOverdue',
      label: 'Services Overdue',
      value: ex.servicesOverdue,
      icon: 'mdi-clock-alert-outline',
      tone: ex.servicesOverdue > 0 ? 'error' : 'success'
    },
    {
      key: 'costOverdue',
      label: 'Cost Overdue',
      value: ex.costOverdue,
      icon: 'mdi-clock-alert-outline',
      tone: ex.costOverdue > 0 ? 'error' : 'success'
    },
    {
      key: 'manifestIssue',
      label: 'Manifest Issue',
      value: ex.manifestIssue,
      icon: ex.manifestIssue > 0 ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline',
      tone: ex.manifestIssue > 0 ? 'error' : 'success'
    },
    {
      key: 'techLogOpen',
      label: 'Tech Log Open',
      value: ex.techLogOpen,
      icon: 'mdi-book-alert-outline',
      tone: ex.techLogOpen > 0 ? 'warning' : 'success'
    }
  ];
});

// ---------------------------------------------------------------------------
// Persistent row actions
// ---------------------------------------------------------------------------

async function confirmService(row: StationServiceRow) {
  loadingId.value = row.id;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    await fetchApi(`/api/flight-operations/station-services/${row.id}/actions/confirm`, {
      method: 'POST',
      body: { expectedVersion: row.version }
    });
    await refreshAll();
    actionSuccess.value = 'Station service confirmed.';
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Gagal memproses station service.';
  } finally {
    loadingId.value = '';
  }
}

async function processCost(row: StationCostRow) {
  loadingId.value = row.id;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    const action = row.status === 'DRAFT' ? 'submit' : 'approve';
    await fetchApi(`/api/flight-operations/station-costs/${row.id}/actions/${action}`, {
      method: 'POST',
      body: { expectedVersion: row.version }
    });
    await refreshAll();
    actionSuccess.value =
      row.status === 'DRAFT' ? 'Station cost submitted.' : 'Station cost approved.';
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Gagal memproses station cost.';
  } finally {
    loadingId.value = '';
  }
}

function toStationId(stationCode: string): string {
  return `st-${stationCode.toLowerCase()}`;
}

const showCreateService = ref(false);
const creatingService = ref(false);
const serviceForm = reactive({
  flightId: '',
  serviceTypeId: '',
  serviceSupplierId: '',
  referenceRate: null as number | null
});

function openCreateService() {
  serviceForm.flightId = dataset.value.flights[0]?.flightId ?? '';
  serviceForm.serviceTypeId = stationServiceTypes.value[0]?.id ?? '';
  serviceForm.serviceSupplierId = handlingParkingSuppliers.value[0]?.id ?? '';
  serviceForm.referenceRate = null;
  showCreateService.value = true;
}

async function submitCreateService() {
  const flight = dataset.value.flights.find((row) => row.flightId === serviceForm.flightId);
  if (!flight || !serviceForm.serviceTypeId || !serviceForm.serviceSupplierId) return;
  creatingService.value = true;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    const created = await fetchApi<{
      id: string;
      flightId: string;
      flightNumber: string;
      serviceType: ServiceType;
      supplierName: string;
      status: ServiceStatus;
      referenceRate: number | null;
      version: number;
    }>('/api/flight-operations/station-services', {
      method: 'POST',
      body: {
        flightId: flight.flightId,
        stationId: toStationId(selectedStationCode.value),
        serviceSupplierId: serviceForm.serviceSupplierId,
        serviceTypeId: serviceForm.serviceTypeId,
        referenceRate: serviceForm.referenceRate
      }
    });
    dataset.value.services.unshift({
      id: created.id,
      flightId: created.flightId,
      flightNumber: created.flightNumber,
      serviceType: created.serviceType,
      supplierName: created.supplierName,
      status: created.status,
      referenceRate: created.referenceRate ?? undefined,
      version: created.version
    });
    showCreateService.value = false;
    actionSuccess.value = 'Station service created.';
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Gagal membuat station service.';
  } finally {
    creatingService.value = false;
  }
}

const showCreateCost = ref(false);
const creatingCost = ref(false);
const costForm = reactive({
  flightId: '',
  costCategoryId: '',
  vendorId: '',
  currencyId: '',
  description: '',
  amount: null as number | null
});

function openCreateCost() {
  costForm.flightId = dataset.value.flights[0]?.flightId ?? '';
  costForm.costCategoryId = costCategories.value[0]?.id ?? '';
  costForm.vendorId = vendors.value[0]?.id ?? '';
  costForm.currencyId =
    currencies.value.find((c) => c.subtitle === 'IDR')?.id ?? currencies.value[0]?.id ?? '';
  costForm.description = '';
  costForm.amount = null;
  showCreateCost.value = true;
}

async function submitCreateCost() {
  if (!costForm.amount || !costForm.description || !costForm.costCategoryId) return;
  const flight = dataset.value.flights.find((row) => row.flightId === costForm.flightId) ?? null;
  creatingCost.value = true;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    const created = await fetchApi<{
      id: string;
      flightId: string | null;
      flightNumber: string | null;
      stationCode: string;
      vendorName: string | null;
      costCategoryName: string;
      description: string;
      amount: number;
      currencyCode: string;
      status: CostStatus;
      version: number;
    }>('/api/flight-operations/station-costs', {
      method: 'POST',
      body: {
        flightId: flight?.flightId ?? null,
        stationId: toStationId(selectedStationCode.value),
        vendorId: costForm.vendorId || null,
        costCategoryId: costForm.costCategoryId,
        amount: costForm.amount,
        currencyId: costForm.currencyId,
        description: costForm.description
      }
    });
    dataset.value.costs.unshift({
      id: created.id,
      flightId: created.flightId,
      flightNumber: created.flightNumber,
      stationCode: created.stationCode,
      vendorName: created.vendorName,
      costCategoryName: created.costCategoryName,
      description: created.description,
      amount: created.amount,
      currencyCode: created.currencyCode,
      status: created.status,
      version: created.version
    });
    showCreateCost.value = false;
    actionSuccess.value = 'Station cost created.';
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Gagal membuat station cost.';
  } finally {
    creatingCost.value = false;
  }
}

function exportDailyReportCsv() {
  const report = dataset.value.dailyReport;
  const rows: (string | number)[][] = [
    ['Station', selectedStationCode.value],
    ['Operational Date', operationalDate.value],
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

  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `station-daily-report-${selectedStationCode.value}-${operationalDate.value}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <!-- Page header -->
    <div class="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Station Operations Desk</h1>
        <p class="text-text-muted">
          Daily flight, service, passenger, cargo, and station cost operations.
        </p>
      </div>

      <div class="flex flex-col items-end gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <VSelect
            v-model="selectedStationCode"
            :disabled="!canChangeStation"
            :items="stationOptions"
            item-title="name"
            item-value="code"
            density="compact"
            hide-details
            variant="outlined"
            prepend-inner-icon="mdi-office-building-marker-outline"
            style="min-width: 200px"
          >
            <template #selection>{{ selectedStationLabel }}</template>
          </VSelect>

          <VTextField
            v-model="operationalDate"
            type="date"
            density="compact"
            hide-details
            variant="outlined"
            prepend-inner-icon="mdi-calendar-outline"
            style="min-width: 170px"
          />

          <VBtn
            size="small"
            variant="outlined"
            prepend-icon="mdi-refresh"
            :loading="pending"
            @click="refreshAll"
          >
            Refresh
          </VBtn>
          <VBtn
            size="small"
            color="primary"
            prepend-icon="mdi-tray-arrow-down"
            @click="exportDailyReportCsv"
          >
            Export CSV
          </VBtn>
        </div>
        <div class="text-caption text-text-secondary">
          Last updated: {{ formatLastUpdated(lastUpdated) }}
          <VIcon
            icon="mdi-refresh"
            size="14"
            class="ml-1 cursor-pointer"
            :class="{ 'animate-spin': pending }"
            @click="refreshAll"
          />
        </div>
        <VBtn
          v-if="corporateAssetSummary"
          size="small"
          :to="`/asset-management/register?stationId=st-${selectedStationCode.toLowerCase()}`"
          variant="tonal"
          prepend-icon="mdi-package-variant-closed"
        >
          Corporate Assets: {{ corporateAssetSummary.serviceable }}/{{
            corporateAssetSummary.total
          }}
          serviceable · {{ corporateAssetSummary.maintenance }} maintenance
        </VBtn>
      </div>
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal" prominent>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span>{{ error }}</span>
        <VBtn size="small" color="error" prepend-icon="mdi-refresh" @click="refreshAll">
          Coba lagi
        </VBtn>
      </div>
    </VAlert>
    <VAlert
      v-if="actionError"
      class="mb-4"
      type="error"
      variant="tonal"
      closable
      @click:close="actionError = ''"
    >
      {{ actionError }}
    </VAlert>
    <VSnackbar v-model="actionSuccess" color="success" location="top end" timeout="3000">
      {{ actionSuccess }}
    </VSnackbar>

    <template v-if="!error">
      <!-- KPI strip -->
      <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <!-- SKELETON LOADING (v-if dipindah ke template pembungkus) -->
        <template v-if="pending">
          <VCard v-for="n in 7" :key="`kpi-skeleton-${n}`" border class="pa-4">
            <VSkeletonLoader type="list-item-two-line" />
          </VCard>
        </template>

        <!-- DATA CARD (v-else dipindah ke template pembungkus) -->
        <template v-else>
          <VCard v-for="card in kpiCards" :key="card.key" border class="pa-4">
            <div class="mb-3 flex items-start justify-between">
              <span class="text-caption text-text-secondary">{{ card.label }}</span>
              <VAvatar :color="card.tone" size="32" variant="tonal">
                <VIcon :icon="card.icon" size="18" />
              </VAvatar>
            </div>
            <div class="text-h5 font-weight-bold text-text-primary">{{ card.value }}</div>
            <div class="mt-1 flex items-center gap-1 text-caption text-text-secondary">
              <span>vs yesterday</span>
              <span class="flex items-center font-weight-medium" :class="`text-${deltaTone(card)}`">
                <VIcon :icon="deltaIcon(card)" size="12" :color="deltaTone(card)" />
                {{ Math.abs(card.delta) }}%
              </span>
            </div>
          </VCard>
        </template>
      </div>

      <!-- Empty day -->
      <VCard v-if="isEmptyDay" border class="mb-4 py-10">
        <div class="flex flex-col items-center gap-2 text-center">
          <VIcon icon="mdi-calendar-blank-outline" size="40" color="grey" />
          <p class="text-h6 text-text-primary">Tidak ada aktivitas operasional</p>
          <p class="max-w-sm text-text-secondary">
            Tidak ada flight, service, maupun station cost untuk {{ selectedStationLabel }} pada
            {{ formatDateDisplay(operationalDate) }}.
          </p>
        </div>
      </VCard>

      <template v-else>
        <!-- Flight board / services / costs -->
        <div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <VCard border class="xl:col-span-6">
            <div class="flex flex-wrap items-center justify-between gap-2 pa-4 pb-0">
              <div>
                <h2 class="text-subtitle-1 font-weight-bold text-text-primary">Flight Board</h2>
                <p class="text-caption text-text-secondary">
                  All flights for {{ selectedStationCode }} on
                  {{ formatDateDisplay(operationalDate) }}
                </p>
              </div>
              <VBtn
                size="small"
                variant="outlined"
                color="primary"
                prepend-icon="mdi-airplane"
                :to="`/flights?station=${selectedStationCode}&date=${operationalDate}`"
              >
                View All Flights
              </VBtn>
            </div>
            <VDivider class="mt-4" />
            <div class="overflow-x-auto">
              <VTable density="comfortable" hover>
                <thead>
                  <tr>
                    <th>Time (LT)</th>
                    <th>Flight</th>
                    <th>Route</th>
                    <th class="hidden md:table-cell">Aircraft</th>
                    <th class="hidden md:table-cell">Type</th>
                    <th>Status</th>
                    <th>Readiness</th>
                    <th>Pax</th>
                    <th class="hidden md:table-cell">Cargo (kg)</th>
                    <th class="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="pending">
                    <td colspan="10" class="py-6 text-center text-text-secondary">
                      <VProgressCircular indeterminate size="20" width="2" class="mr-2" />
                      Loading flights...
                    </td>
                  </tr>
                  <tr v-else-if="visibleFlights.length === 0">
                    <td colspan="10" class="py-6 text-center text-text-secondary">
                      No flight found.
                    </td>
                  </tr>
                  <tr v-for="row in visibleFlights" v-else :key="row.id">
                    <td>
                      <div class="font-weight-medium">{{ row.scheduledTime }}</div>
                      <div class="text-caption text-text-secondary">{{ row.actualTime }}</div>
                    </td>
                    <td class="font-weight-medium">{{ row.flightNumber }}</td>
                    <td>{{ row.origin }} → {{ row.destination }}</td>
                    <td class="hidden md:table-cell">{{ row.aircraftType }}</td>
                    <td class="hidden md:table-cell text-text-secondary">{{ row.type }}</td>
                    <td>
                      <DsStatusBadge :value="row.status" />
                    </td>
                    <td>
                      <DsStatusBadge :value="row.readiness" />
                    </td>
                    <td>{{ row.paxOnboard }} / {{ row.paxTotal }}</td>
                    <td class="hidden md:table-cell">{{ numberFormat(row.cargoWeightKg) }}</td>
                    <td class="text-right">
                      <DsTooltipIconButton
                        density="comfortable"
                        icon="mdi-square-edit-outline"
                        :to="`/flights/station-operations/${row.flightId}`"
                        tooltip="Open station flight workspace"
                        variant="text"
                      />
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
            <VDivider />
            <div
              class="flex flex-wrap items-center gap-4 px-4 py-3 text-caption text-text-secondary"
            >
              <span>LT Local Time</span>
              <DsStatusBadge value="LANDED" />
              <DsStatusBadge value="ARRIVING" />
              <DsStatusBadge value="SCHEDULED" />
              <DsStatusBadge value="DELAYED" />
            </div>
          </VCard>

          <VCard border class="xl:col-span-3">
            <div class="flex flex-wrap items-center justify-between gap-2 pa-4 pb-0">
              <div>
                <h2 class="text-subtitle-1 font-weight-bold text-text-primary">Services</h2>
                <p class="text-caption text-text-secondary">Recent &amp; pending services</p>
              </div>
              <VBtn
                v-if="can('station.operation.update').allowed"
                color="primary"
                size="small"
                prepend-icon="mdi-plus"
                @click="openCreateService"
              >
                Create Service
              </VBtn>
            </div>
            <VDivider class="mt-4" />
            <div class="overflow-x-auto">
              <VTable density="comfortable" hover>
                <thead>
                  <tr>
                    <th>Flight</th>
                    <th>Type</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th class="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="pending">
                    <td colspan="5" class="py-6 text-center text-text-secondary">
                      Loading services...
                    </td>
                  </tr>
                  <tr v-else-if="dataset.services.length === 0">
                    <td colspan="5" class="py-6 text-center text-text-secondary">
                      No station service found.
                    </td>
                  </tr>
                  <tr
                    v-for="row in dataset.services"
                    v-else
                    :key="row.id"
                    :class="{ 'bg-primary-lighten-5': route.query.sourceRecordId === row.id }"
                  >
                    <td class="font-weight-medium">{{ row.flightNumber }}</td>
                    <td class="text-text-secondary">{{ row.serviceType }}</td>
                    <td>{{ row.supplierName }}</td>
                    <td>
                      <DsStatusBadge :value="row.status" />
                    </td>
                    <td class="text-right">
                      <DsConfirmIconButton
                        v-if="row.status === 'REQUESTED' && can('station.operation.update').allowed"
                        :action="() => confirmService(row)"
                        color="success"
                        confirm-icon="mdi-check"
                        confirm-text="Confirm"
                        density="comfortable"
                        icon="mdi-check"
                        :loading="loadingId === row.id"
                        :message="`Confirm station service for ${row.flightNumber}.`"
                        title="Confirm station service?"
                        tone="success"
                        tooltip="Confirm service"
                        variant="flat"
                        size="small"
                      />
                      <DsTooltipIconButton
                        v-else
                        density="comfortable"
                        icon="mdi-eye-outline"
                        tooltip="Open service in flight workspace"
                        variant="text"
                        size="small"
                        :to="`/flights/station-operations/${row.flightId}?tab=services&sourceRecordId=${row.id}`"
                      />
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
            <VDivider />
            <div class="py-3 text-center">
              <VBtn
                size="small"
                variant="text"
                color="primary"
                append-icon="mdi-arrow-right"
                :to="`/flights/station-operations?stationCode=${selectedStationCode}&date=${operationalDate}`"
              >
                View all services
              </VBtn>
            </div>
          </VCard>

          <VCard border class="xl:col-span-3">
            <div class="flex flex-wrap items-center justify-between gap-2 pa-4 pb-0">
              <div>
                <h2 class="text-subtitle-1 font-weight-bold text-text-primary">Costs</h2>
                <p class="text-caption text-text-secondary">Recent &amp; pending costs</p>
              </div>
              <VBtn
                v-if="can('station.operation.update').allowed"
                color="primary"
                size="small"
                prepend-icon="mdi-plus"
                @click="openCreateCost"
              >
                Create Cost
              </VBtn>
            </div>
            <VDivider class="mt-4" />
            <div class="overflow-x-auto">
              <VTable density="comfortable" hover>
                <thead>
                  <tr>
                    <th>Flight</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th class="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="pending">
                    <td colspan="5" class="py-6 text-center text-text-secondary">
                      Loading costs...
                    </td>
                  </tr>
                  <tr v-else-if="dataset.costs.length === 0">
                    <td colspan="5" class="py-6 text-center text-text-secondary">
                      No station cost found.
                    </td>
                  </tr>
                  <tr
                    v-for="row in dataset.costs"
                    v-else
                    :key="row.id"
                    :class="{ 'bg-primary-lighten-5': route.query.sourceRecordId === row.id }"
                  >
                    <td class="font-weight-medium">{{ row.flightNumber ?? '-' }}</td>
                    <td>{{ row.costCategoryName }}</td>
                    <td>{{ money(row.amount, row.currencyCode) }}</td>
                    <td>
                      <DsStatusBadge :value="row.status" />
                    </td>
                    <td class="text-right">
                      <DsConfirmIconButton
                        v-if="
                          (row.status === 'DRAFT' && can('station.operation.update').allowed) ||
                            (row.status === 'SUBMITTED' && can('station.cost.approve').allowed)
                        "
                        :action="() => processCost(row)"
                        color="success"
                        confirm-icon="mdi-check-decagram-outline"
                        :confirm-text="row.status === 'DRAFT' ? 'Submit' : 'Approve'"
                        density="comfortable"
                        icon="mdi-check-decagram-outline"
                        :loading="loadingId === row.id"
                        :message="`${row.status === 'DRAFT' ? 'Submit' : 'Approve'} ${money(row.amount, row.currencyCode)} station cost for ${row.flightNumber ?? row.stationCode}.`"
                        :title="`${row.status === 'DRAFT' ? 'Submit' : 'Approve'} station cost?`"
                        tone="success"
                        :tooltip="`${row.status === 'DRAFT' ? 'Submit' : 'Approve'} station cost`"
                        variant="flat"
                        size="small"
                      />
                      <DsTooltipIconButton
                        v-else
                        density="comfortable"
                        icon="mdi-eye-outline"
                        tooltip="Open cost in flight workspace"
                        variant="text"
                        size="small"
                        :to="
                          row.flightId
                            ? `/flights/station-operations/${row.flightId}?tab=costs&sourceRecordId=${row.id}`
                            : undefined
                        "
                      />
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
            <VDivider />
            <div class="py-3 text-center">
              <VBtn
                size="small"
                variant="text"
                color="primary"
                append-icon="mdi-arrow-right"
                :to="`/flights/station-operations?stationCode=${selectedStationCode}&date=${operationalDate}`"
              >
                View all costs
              </VBtn>
            </div>
          </VCard>
        </div>

        <VCard border class="mb-4">
          <div class="flex flex-wrap items-center justify-between gap-2 pa-4">
            <div>
              <h2 class="text-subtitle-1 font-weight-bold text-text-primary">
                Operational Verification Tasks
              </h2>
              <p class="text-caption text-text-secondary">
                Persistent station evidence, verification, and dual sign-off.
              </p>
            </div>
            <VChip color="warning" variant="tonal"> {{ pendingStationTaskCount }} pending </VChip>
          </div>
          <VDivider />
          <div class="overflow-x-auto">
            <VTable density="comfortable" hover>
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>Phase</th>
                  <th>Task</th>
                  <th>Evidence</th>
                  <th>Station / OCC</th>
                  <th>Status</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="stationTasks.length === 0">
                  <td colspan="7" class="py-6 text-center text-text-secondary">
                    No verification task for this station and date.
                  </td>
                </tr>
                <tr
                  v-for="task in stationTasks"
                  v-else
                  :key="task.id"
                  :class="{ 'bg-primary-lighten-5': route.query.sourceRecordId === task.id }"
                >
                  <td>
                    <NuxtLink
                      :to="`/flights/station-operations/${task.flightId}?phase=${task.phase}`"
                      class="font-weight-medium text-primary"
                    >
                      {{ task.flightNumber }}
                    </NuxtLink>
                  </td>
                  <td class="text-caption">{{ task.phase.replaceAll('_', ' ') }}</td>
                  <td>
                    <strong>{{ task.taskTitle }}</strong>
                    <div v-if="task.rejectionReason" class="text-caption text-error">
                      {{ task.rejectionReason }}
                    </div>
                    <div v-else-if="stationTaskBlocker(task)" class="text-caption text-warning">
                      {{ stationTaskBlocker(task) }}
                    </div>
                  </td>
                  <td>
                    <VChip
                      :color="task.evidenceCount ? 'success' : 'warning'"
                      size="small"
                      variant="tonal"
                    >
                      {{ task.evidenceCount }}
                    </VChip>
                  </td>
                  <td class="text-caption">
                    {{ task.stationDecision ?? 'Pending' }} /
                    {{ task.occDecision ?? 'Pending' }}
                  </td>
                  <td>
                    <DsStatusBadge :value="task.status" />
                  </td>
                  <td class="text-right">
                    <div class="flex justify-end gap-1">
                      <VBtn
                        v-if="task.status === 'PENDING' && can('station.task.start').allowed"
                        size="small"
                        color="primary"
                        variant="flat"
                        density="comfortable"
                        prepend-icon="mdi-play"
                        :loading="loadingId === task.id"
                        @click="runTaskAction(task.id, 'start', task.version)"
                      >
                        Start
                      </VBtn>
                      <VBtn
                        v-if="can('station.evidence.add').allowed"
                        size="small"
                        color="info"
                        variant="tonal"
                        density="comfortable"
                        prepend-icon="mdi-paperclip"
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
                        :disabled="Boolean(stationTaskBlocker(task))"
                        size="small"
                        variant="flat"
                        density="comfortable"
                        prepend-icon="mdi-check"
                        :loading="loadingId === task.id"
                        @click="runTaskAction(task.id, 'verify', task.version)"
                      >
                        Verify
                      </VBtn>
                      <VBtn
                        v-if="
                          ['PENDING', 'IN_PROGRESS'].includes(task.status) &&
                            can('station.task.reject').allowed
                        "
                        color="error"
                        size="small"
                        variant="text"
                        density="comfortable"
                        prepend-icon="mdi-close"
                        @click="openTaskRejection(task)"
                      >
                        Reject
                      </VBtn>
                      <VBtn
                        v-if="
                          task.status === 'VERIFIED' &&
                            task.taskCode.endsWith('STATION_SIGNOFF') &&
                            task.stationDecision === 'APPROVED' &&
                            !task.occDecision &&
                            can('station.signoff.approve').allowed
                        "
                        color="primary"
                        size="small"
                        variant="flat"
                        density="comfortable"
                        prepend-icon="mdi-account-check"
                        :loading="loadingId === task.id"
                        @click="runTaskAction(task.id, 'approve-occ', task.version)"
                      >
                        OCC approve
                      </VBtn>
                    </div>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>
        </VCard>

        <VCard border class="mb-4">
          <div class="pa-4">
            <h2 class="text-subtitle-1 font-weight-bold text-text-primary">
              Operational Audit Timeline
            </h2>
            <p class="text-caption text-text-secondary">
              Persistent actor, decision, and verification history for the selected workbench.
            </p>
          </div>
          <VDivider />
          <div v-if="workbenchAudit.length === 0" class="pa-6 text-center text-text-secondary">
            No operational assurance activity recorded.
          </div>
          <VTimeline v-else align="start" class="pa-4" density="compact" side="end">
            <VTimelineItem
              v-for="entry in workbenchAudit"
              :key="entry.id"
              :dot-color="entry.afterStatus === 'REJECTED' ? 'error' : 'primary'"
              size="x-small"
            >
              <div class="flex flex-wrap items-center gap-2">
                <NuxtLink
                  :to="`/flights/station-operations/${entry.flightId}`"
                  class="font-weight-medium text-primary"
                >
                  {{ entry.flightNumber }}
                </NuxtLink>
                <VChip size="x-small" variant="tonal">{{ entry.module }}</VChip>
                <span class="text-caption">{{ entry.action }}</span>
              </div>
              <div class="text-caption text-text-secondary">
                {{ entry.actorRole }} · {{ formatDateTime(entry.timestamp) }}
              </div>
              <div v-if="entry.reason" class="text-caption">{{ entry.reason }}</div>
            </VTimelineItem>
          </VTimeline>
        </VCard>

        <!-- Daily report + donut -->
        <div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <VCard border class="pa-4 xl:col-span-9">
            <h2 class="text-subtitle-1 font-weight-bold text-text-primary">Daily Report Summary</h2>
            <p class="mb-4 text-caption text-text-secondary">
              {{ selectedStationCode }} - {{ formatDateDisplay(operationalDate) }}
            </p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div class="rounded-lg border pa-3">
                <p class="mb-2 text-caption font-weight-medium text-text-secondary">Flights</p>
                <p class="text-caption">
                  Total
                  <span class="float-right font-weight-bold">{{
                    dataset.dailyReport.flights.total
                  }}</span>
                </p>
                <p class="text-caption">
                  On Time
                  <span class="float-right font-weight-bold text-green">{{ dataset.dailyReport.flights.onTime }} ({{
                    dataset.dailyReport.flights.total
                      ? Math.round(
                        (dataset.dailyReport.flights.onTime /
                          dataset.dailyReport.flights.total) *
                          100
                      )
                      : 0
                  }}%)</span>
                </p>
                <p class="text-caption">
                  Delayed
                  <span class="float-right font-weight-bold text-red">{{ dataset.dailyReport.flights.delayed }} ({{
                    dataset.dailyReport.flights.total
                      ? Math.round(
                        (dataset.dailyReport.flights.delayed /
                          dataset.dailyReport.flights.total) *
                          100
                      )
                      : 0
                  }}%)</span>
                </p>
              </div>
              <div class="rounded-lg border pa-3">
                <p class="mb-2 text-caption font-weight-medium text-text-secondary">Passengers</p>
                <p class="text-caption">
                  Check-in
                  <span class="float-right font-weight-bold">{{
                    numberFormat(dataset.dailyReport.passengers.checkedIn)
                  }}</span>
                </p>
                <p class="text-caption">
                  Boarded
                  <span class="float-right font-weight-bold">{{
                    numberFormat(dataset.dailyReport.passengers.boarded)
                  }}</span>
                </p>
                <p class="text-caption">
                  Load Factor
                  <span class="float-right font-weight-bold">{{ dataset.dailyReport.passengers.loadFactor }}%</span>
                </p>
              </div>
              <div class="rounded-lg border pa-3">
                <p class="mb-2 text-caption font-weight-medium text-text-secondary">Cargo</p>
                <p class="text-caption">
                  Total Weight
                  <span class="float-right font-weight-bold">{{ numberFormat(dataset.dailyReport.cargo.totalWeightKg) }} kg</span>
                </p>
                <p class="text-caption">
                  Total Volume
                  <span class="float-right font-weight-bold">{{ dataset.dailyReport.cargo.totalVolumeM3 }} m³</span>
                </p>
                <p class="text-caption">
                  Shipments
                  <span class="float-right font-weight-bold">{{
                    dataset.dailyReport.cargo.shipments
                  }}</span>
                </p>
              </div>
              <div class="rounded-lg border pa-3">
                <p class="mb-2 text-caption font-weight-medium text-text-secondary">Services</p>
                <p class="text-caption">
                  Requested
                  <span class="float-right font-weight-bold">{{
                    dataset.dailyReport.services.requested
                  }}</span>
                </p>
                <p class="text-caption">
                  Confirmed
                  <span class="float-right font-weight-bold">{{
                    dataset.dailyReport.services.confirmed
                  }}</span>
                </p>
                <p class="text-caption">
                  Completed
                  <span class="float-right font-weight-bold">{{
                    dataset.dailyReport.services.completed
                  }}</span>
                </p>
              </div>
              <div class="rounded-lg border pa-3">
                <p class="mb-2 text-caption font-weight-medium text-text-secondary">Costs (IDR)</p>
                <p class="text-caption">
                  Total
                  <span class="float-right font-weight-bold">{{ dataset.dailyReport.costs.total }} ({{
                    dataset.dailyReport.costs.approvedPct
                  }}%)</span>
                </p>
                <p class="text-caption">
                  <VIcon icon="mdi-arrow-up" size="12" color="green" /> Approved
                  <span class="float-right font-weight-bold text-green">{{
                    numberFormat(dataset.dailyReport.costs.approvedAmount)
                  }}</span>
                </p>
                <p class="text-caption">
                  <VIcon icon="mdi-arrow-down" size="12" color="red" /> Positioning
                  <span class="float-right font-weight-bold text-red">{{
                    numberFormat(dataset.dailyReport.costs.positioningAmount)
                  }}</span>
                </p>
              </div>
            </div>
          </VCard>

          <VCard border class="pa-4 xl:col-span-3">
            <h2 class="mb-4 text-subtitle-1 font-weight-bold text-text-primary">Flights by Type</h2>
            <div class="flex items-center justify-center">
              <svg viewBox="0 0 120 120" width="140" height="140">
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
                <span class="flex items-center gap-2">
                  <span
                    class="inline-block h-2 w-2 rounded-full"
                    :style="{ background: segment.color }"
                  />
                  {{ segment.label }}
                </span>
                <span class="font-weight-medium">{{ segment.count }} ({{ segment.pct }}%)</span>
              </div>
            </div>
          </VCard>
        </div>

        <!-- Exceptions -->
        <VCard border class="pa-4">
          <div class="grid grid-cols-2 gap-4 divide-x sm:grid-cols-3 lg:grid-cols-5">
            <div
              v-for="item in exceptionItems"
              :key="item.key"
              class="flex flex-col gap-1 pl-4 first:pl-0"
            >
              <span class="flex items-center gap-1 text-caption text-text-secondary">
                <VIcon :icon="item.icon" :color="item.tone" size="16" />
                {{ item.label }}
              </span>
              <span class="text-h6 font-weight-bold" :class="`text-${item.tone}`">{{
                item.value
              }}</span>
            </div>
          </div>
        </VCard>
      </template>
    </template>

    <!-- Create Service dialog -->
    <VDialog v-model="showCreateService" max-width="480">
      <VCard>
        <VCardTitle>Create Service</VCardTitle>
        <VCardText class="flex flex-col gap-4">
          <VSelect
            v-model="serviceForm.flightId"
            label="Flight"
            :items="dataset.flights"
            item-title="flightNumber"
            item-value="flightId"
            variant="outlined"
            density="comfortable"
          />
          <VSelect
            v-model="serviceForm.serviceTypeId"
            label="Service Type"
            :items="stationServiceTypes"
            item-title="title"
            item-value="id"
            variant="outlined"
            density="comfortable"
          />
          <VSelect
            v-model="serviceForm.serviceSupplierId"
            label="Supplier"
            :items="handlingParkingSuppliers"
            item-title="title"
            item-value="id"
            variant="outlined"
            density="comfortable"
          />
          <VTextField
            v-model.number="serviceForm.referenceRate"
            label="Reference Rate (IDR)"
            type="number"
            variant="outlined"
            density="comfortable"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showCreateService = false">Cancel</VBtn>
          <VBtn
            color="primary"
            :loading="creatingService"
            prepend-icon="mdi-plus"
            @click="submitCreateService"
          >
            Create Service
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="evidenceDialog" max-width="480">
      <VCard>
        <VCardTitle>Add verification evidence</VCardTitle>
        <VCardText class="flex flex-col gap-4">
          <VFileInput
            v-model="evidenceFile"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            hint="Maximum 25 MB. Stored in the application upload folder."
            label="Choose evidence file"
            persistent-hint
            prepend-icon="mdi-paperclip"
            show-size
            variant="outlined"
          />
          <VTextarea v-model="evidenceNotes" label="Notes" rows="3" variant="outlined" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="evidenceDialog = false">Cancel</VBtn>
          <VBtn
            color="primary"
            :disabled="!selectedEvidenceFile()"
            :loading="loadingId === evidenceTaskId"
            prepend-icon="mdi-upload"
            @click="addTaskEvidence"
          >
            Upload evidence
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="rejectionDialog" max-width="480">
      <VCard>
        <VCardTitle>Reject verification task</VCardTitle>
        <VCardText>
          <VTextarea
            v-model="rejectionReason"
            label="Rejection reason"
            rows="3"
            variant="outlined"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="rejectionDialog = false">Cancel</VBtn>
          <VBtn
            color="error"
            :disabled="!rejectionReason.trim()"
            :loading="loadingId === rejectionTaskId"
            prepend-icon="mdi-close"
            @click="rejectTask"
          >
            Reject task
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Create Cost dialog -->
    <VDialog v-model="showCreateCost" max-width="480">
      <VCard>
        <VCardTitle>Create Station Cost</VCardTitle>
        <VCardText class="flex flex-col gap-4">
          <VSelect
            v-model="costForm.flightId"
            label="Flight (optional)"
            :items="dataset.flights"
            item-title="flightNumber"
            item-value="flightId"
            variant="outlined"
            density="comfortable"
            clearable
          />
          <VSelect
            v-model="costForm.costCategoryId"
            label="Category"
            :items="costCategories"
            item-title="title"
            item-value="id"
            variant="outlined"
            density="comfortable"
          />
          <VSelect
            v-model="costForm.vendorId"
            label="Vendor"
            :items="vendors"
            item-title="title"
            item-value="id"
            variant="outlined"
            density="comfortable"
            clearable
          />
          <VSelect
            v-model="costForm.currencyId"
            label="Currency"
            :items="currencies"
            item-title="subtitle"
            item-value="id"
            variant="outlined"
            density="comfortable"
          />
          <VTextField
            v-model="costForm.description"
            label="Description"
            variant="outlined"
            density="comfortable"
          />
          <VTextField
            v-model.number="costForm.amount"
            label="Amount"
            type="number"
            variant="outlined"
            density="comfortable"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showCreateCost = false">Cancel</VBtn>
          <VBtn
            color="primary"
            :loading="creatingCost"
            prepend-icon="mdi-plus"
            @click="submitCreateCost"
          >
            Create Cost
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
