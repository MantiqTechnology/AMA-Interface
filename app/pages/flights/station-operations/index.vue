<script setup lang="ts">
type FlightDirection = 'INBOUND' | 'OUTBOUND';
type FlightStatus = 'SCHEDULED' | 'ARRIVING' | 'LANDED' | 'DELAYED' | 'DEPARTED' | 'BOARDING';
type ReadinessStatus = 'READY' | 'CHECK' | 'NOT_READY';
type ServiceType = 'HANDLING' | 'PARKING';
type ServiceStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
type CostStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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

// ---------------------------------------------------------------------------
// Master data & user scope (dummy)
// ---------------------------------------------------------------------------

const STATION_OPTIONS: StationOption[] = [
  { code: 'DJJ', name: 'Sentani / Jayapura' },
  { code: 'WMX', name: 'Wamena' },
  { code: 'TIM', name: 'Timika' },
  { code: 'NBX', name: 'Nabire' },
  { code: 'OKS', name: 'Oksibil' },
  { code: 'DEX', name: 'Dekai' },
  { code: 'MKQ', name: 'Merauke' }
];

// Simulasi station scope milik Station Admin yang sedang login.
// Kalau panjangnya > 1, selector otomatis enabled + multiple (skenario OCC).
const { currentPersona } = useDemoSession();
const stationScope = computed(() =>
  currentPersona.value.stationScope.includes('ALL')
    ? STATION_OPTIONS.map((station) => station.code)
    : currentPersona.value.stationScope
);

const canChangeStation = computed(() => stationScope.value.length > 1);
const stationOptions = computed(() =>
  STATION_OPTIONS.filter((option) => stationScope.value.includes(option.code))
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

const selectedStationCode = ref<string>(stationScope.value[0] ?? 'DJJ');
watch(stationScope, (scope) => {
  if (!scope.includes(selectedStationCode.value)) selectedStationCode.value = scope[0] ?? 'DJJ';
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
const operationalDate = ref<string>(todayIso());

const GOLDEN_STATION = 'DJJ';
const GOLDEN_DATE = '2026-07-07';
const ERROR_DEMO_DATE = '2026-07-08';
const EMPTY_DEMO_DATE = '2026-07-09';

const pending = ref(false);
const error = ref('');
const actionError = ref('');
const loadingId = ref('');
const lastUpdated = ref<Date | null>(null);

const dataset = ref<StationDataset>(createEmptyDataset());

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

function createGoldenDataset(): StationDataset {
  const flights: StationFlightRow[] = [
    {
      id: 'fl-2401',
      flightId: 'flight-2401',
      flightNumber: 'AMA-2401',
      origin: 'PKU',
      destination: 'DJJ',
      aircraftType: 'Pilatus PC-12',
      type: 'PSG',
      direction: 'INBOUND',
      scheduledTime: '07:30',
      actualTime: '07:45',
      status: 'LANDED',
      readiness: 'READY',
      paxOnboard: 28,
      paxTotal: 28,
      cargoWeightKg: 120,
      needsAction: false
    },
    {
      id: 'fl-2402',
      flightId: 'flight-2402',
      flightNumber: 'AMA-2402',
      origin: 'SUB',
      destination: 'DJJ',
      aircraftType: 'Caravan C208',
      type: 'PSG',
      direction: 'INBOUND',
      scheduledTime: '08:15',
      actualTime: '08:20',
      status: 'ARRIVING',
      readiness: 'CHECK',
      paxOnboard: 16,
      paxTotal: 16,
      cargoWeightKg: 85,
      needsAction: true
    },
    {
      id: 'fl-2403',
      flightId: 'flight-2403',
      flightNumber: 'AMA-2403',
      origin: 'DJB',
      destination: 'DJJ',
      aircraftType: 'PAC 750XL',
      type: 'CRG',
      direction: 'INBOUND',
      scheduledTime: '09:00',
      actualTime: '09:00',
      status: 'SCHEDULED',
      readiness: 'READY',
      paxOnboard: 0,
      paxTotal: 0,
      cargoWeightKg: 650,
      needsAction: false
    },
    {
      id: 'fl-2404',
      flightId: 'flight-2404',
      flightNumber: 'AMA-2404',
      origin: 'DJJ',
      destination: 'BPN',
      aircraftType: 'Pilatus PC-12',
      type: 'PSG',
      direction: 'OUTBOUND',
      scheduledTime: '10:30',
      actualTime: '10:30',
      status: 'SCHEDULED',
      readiness: 'CHECK',
      paxOnboard: 12,
      paxTotal: 12,
      cargoWeightKg: 90,
      needsAction: true
    },
    {
      id: 'fl-2405',
      flightId: 'flight-2405',
      flightNumber: 'AMA-2405',
      origin: 'DPS',
      destination: 'DJJ',
      aircraftType: 'Caravan C208',
      type: 'PSG',
      direction: 'INBOUND',
      scheduledTime: '13:10',
      actualTime: '13:10',
      status: 'SCHEDULED',
      readiness: 'READY',
      paxOnboard: 20,
      paxTotal: 20,
      cargoWeightKg: 100,
      needsAction: false
    },
    {
      id: 'fl-2406',
      flightId: 'flight-2406',
      flightNumber: 'AMA-2406',
      origin: 'DJJ',
      destination: 'TIM',
      aircraftType: 'Pilatus PC-12',
      type: 'PSG',
      direction: 'OUTBOUND',
      scheduledTime: '14:00',
      actualTime: '14:00',
      status: 'SCHEDULED',
      readiness: 'READY',
      paxOnboard: 18,
      paxTotal: 18,
      cargoWeightKg: 60,
      needsAction: false
    },
    {
      id: 'fl-2407',
      flightId: 'flight-2407',
      flightNumber: 'AMA-2407',
      origin: 'DJJ',
      destination: 'BIK',
      aircraftType: 'Caravan C208',
      type: 'CRG',
      direction: 'OUTBOUND',
      scheduledTime: '14:30',
      actualTime: '14:30',
      status: 'SCHEDULED',
      readiness: 'READY',
      paxOnboard: 0,
      paxTotal: 0,
      cargoWeightKg: 400,
      needsAction: false
    },
    {
      id: 'fl-2408',
      flightId: 'flight-2408',
      flightNumber: 'AMA-2408',
      origin: 'DJJ',
      destination: 'MKW',
      aircraftType: 'Pilatus PC-12',
      type: 'PSG',
      direction: 'OUTBOUND',
      scheduledTime: '15:00',
      actualTime: '15:20',
      status: 'DELAYED',
      readiness: 'CHECK',
      paxOnboard: 10,
      paxTotal: 14,
      cargoWeightKg: 70,
      needsAction: true
    },
    {
      id: 'fl-2409',
      flightId: 'flight-2409',
      flightNumber: 'AMA-2409',
      origin: 'BIK',
      destination: 'DJJ',
      aircraftType: 'Caravan C208',
      type: 'PSG',
      direction: 'INBOUND',
      scheduledTime: '15:30',
      actualTime: '15:50',
      status: 'DELAYED',
      readiness: 'READY',
      paxOnboard: 15,
      paxTotal: 16,
      cargoWeightKg: 95,
      needsAction: false
    },
    {
      id: 'fl-2410',
      flightId: 'flight-2410',
      flightNumber: 'AMA-2410',
      origin: 'DJJ',
      destination: 'PKU',
      aircraftType: 'Pilatus PC-12',
      type: 'PSG',
      direction: 'OUTBOUND',
      scheduledTime: '16:00',
      actualTime: '16:00',
      status: 'SCHEDULED',
      readiness: 'READY',
      paxOnboard: 22,
      paxTotal: 22,
      cargoWeightKg: 110,
      needsAction: false
    },
    {
      id: 'fl-2411',
      flightId: 'flight-2411',
      flightNumber: 'AMA-2411',
      origin: 'TIM',
      destination: 'DJJ',
      aircraftType: 'PAC 750XL',
      type: 'CRG',
      direction: 'INBOUND',
      scheduledTime: '16:30',
      actualTime: '16:55',
      status: 'DELAYED',
      readiness: 'READY',
      paxOnboard: 0,
      paxTotal: 0,
      cargoWeightKg: 500,
      needsAction: false
    },
    {
      id: 'fl-2412',
      flightId: 'flight-2412',
      flightNumber: 'AMA-2412',
      origin: 'DJJ',
      destination: 'SUB',
      aircraftType: 'Caravan C208',
      type: 'PSG',
      direction: 'OUTBOUND',
      scheduledTime: '17:00',
      actualTime: '17:00',
      status: 'SCHEDULED',
      readiness: 'READY',
      paxOnboard: 19,
      paxTotal: 20,
      cargoWeightKg: 80,
      needsAction: false
    },
    {
      id: 'fl-2413',
      flightId: 'flight-2413',
      flightNumber: 'AMA-2413',
      origin: 'DJJ',
      destination: 'DPS',
      aircraftType: 'Pilatus PC-12',
      type: 'PSG',
      direction: 'OUTBOUND',
      scheduledTime: '17:30',
      actualTime: '17:30',
      status: 'DEPARTED',
      readiness: 'READY',
      paxOnboard: 24,
      paxTotal: 24,
      cargoWeightKg: 130,
      needsAction: false
    }
  ];

  const services: StationServiceRow[] = [
    {
      id: 'svc-1',
      flightId: 'flight-2402',
      flightNumber: 'AMA-2402',
      serviceType: 'HANDLING',
      supplierName: 'Angkasa Pura',
      status: 'REQUESTED',
      referenceRate: 2500000
    },
    {
      id: 'svc-2',
      flightId: 'flight-2404',
      flightNumber: 'AMA-2404',
      serviceType: 'PARKING',
      supplierName: 'Angkasa Pura',
      status: 'REQUESTED',
      referenceRate: 1250000
    },
    {
      id: 'svc-3',
      flightId: 'flight-2403',
      flightNumber: 'AMA-2403',
      serviceType: 'HANDLING',
      supplierName: 'Angkasa Pura',
      status: 'CONFIRMED',
      referenceRate: 2500000
    },
    {
      id: 'svc-4',
      flightId: 'flight-2405',
      flightNumber: 'AMA-2405',
      serviceType: 'HANDLING',
      supplierName: 'Angkasa Pura',
      status: 'CONFIRMED',
      referenceRate: 2750000
    },
    {
      id: 'svc-5',
      flightId: 'flight-2401',
      flightNumber: 'AMA-2401',
      serviceType: 'PARKING',
      supplierName: 'Angkasa Pura',
      status: 'CONFIRMED',
      referenceRate: 1250000
    }
  ];

  const costs: StationCostRow[] = [
    {
      id: 'cost-1',
      flightId: 'flight-2402',
      flightNumber: 'AMA-2402',
      stationCode: 'DJJ',
      vendorName: 'Angkasa Pura',
      costCategoryName: 'Landing Fee',
      description: 'Landing fee AMA-2402',
      amount: 2750000,
      currencyCode: 'IDR',
      status: 'PENDING'
    },
    {
      id: 'cost-2',
      flightId: 'flight-2404',
      flightNumber: 'AMA-2404',
      stationCode: 'DJJ',
      vendorName: 'Angkasa Pura',
      costCategoryName: 'Parking Fee',
      description: 'Parking fee AMA-2404',
      amount: 1250000,
      currencyCode: 'IDR',
      status: 'PENDING'
    },
    {
      id: 'cost-3',
      flightId: 'flight-2403',
      flightNumber: 'AMA-2403',
      stationCode: 'DJJ',
      vendorName: 'Angkasa Pura',
      costCategoryName: 'Handling Fee',
      description: 'Handling fee AMA-2403',
      amount: 2500000,
      currencyCode: 'IDR',
      status: 'APPROVED'
    },
    {
      id: 'cost-4',
      flightId: 'flight-2405',
      flightNumber: 'AMA-2405',
      stationCode: 'DJJ',
      vendorName: 'Angkasa Pura',
      costCategoryName: 'Landing Fee',
      description: 'Landing fee AMA-2405',
      amount: 2750000,
      currencyCode: 'IDR',
      status: 'APPROVED'
    },
    {
      id: 'cost-5',
      flightId: 'flight-2401',
      flightNumber: 'AMA-2401',
      stationCode: 'DJJ',
      vendorName: 'Angkasa Pura',
      costCategoryName: 'Handling Fee',
      description: 'Handling fee AMA-2401',
      amount: 2500000,
      currencyCode: 'IDR',
      status: 'APPROVED'
    }
  ];

  return {
    flights,
    services,
    costs,
    kpi: {
      inboundFlights: 6,
      outboundFlights: 7,
      flightsNeedingAction: 3,
      paxCheckedIn: 248,
      paxBoarded: 204,
      cargoWeightKg: 2845,
      pendingServices: 5,
      pendingCosts: 7,
      delta: {
        inboundFlights: 20,
        outboundFlights: 16,
        flightsNeedingAction: 50,
        pax: 12,
        cargoWeightKg: 8,
        pendingServices: -16,
        pendingCosts: -22
      }
    },
    dailyReport: {
      flights: { total: 13, onTime: 10, delayed: 3 },
      passengers: { checkedIn: 248, boarded: 204, loadFactor: 82 },
      cargo: { totalWeightKg: 2845, totalVolumeM3: 12.6, shipments: 18 },
      services: { requested: 5, confirmed: 7, completed: 5 },
      costs: { total: 9, approvedPct: 69, approvedAmount: 15_500_000, positioningAmount: 6_750_000 }
    },
    flightsByType: {
      passenger: { count: 9, pct: 69 },
      cargo: { count: 3, pct: 23 },
      positioning: { count: 1, pct: 8 }
    },
    exceptions: {
      delayOver15: 2,
      servicesOverdue: 1,
      costOverdue: 2,
      manifestIssue: 0,
      techLogOpen: 1
    }
  };
}

// Seeded PRNG supaya kombinasi station + tanggal yang sama selalu
// menghasilkan angka yang sama (bukan acak setiap render).
function hashSeed(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return hash;
}
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitterDataset(golden: StationDataset, seed: string): StationDataset {
  const rand = mulberry32(hashSeed(seed));
  const factor = 0.85 + rand() * 0.3; // 0.85 - 1.15
  const scale = (value: number) => Math.max(0, Math.round(value * factor));

  const clone: StationDataset = JSON.parse(JSON.stringify(golden));
  clone.kpi.inboundFlights = scale(golden.kpi.inboundFlights);
  clone.kpi.outboundFlights = scale(golden.kpi.outboundFlights);
  clone.kpi.flightsNeedingAction = scale(golden.kpi.flightsNeedingAction);
  clone.kpi.paxCheckedIn = scale(golden.kpi.paxCheckedIn);
  clone.kpi.paxBoarded = scale(golden.kpi.paxBoarded);
  clone.kpi.cargoWeightKg = scale(golden.kpi.cargoWeightKg);
  clone.kpi.pendingServices = scale(golden.kpi.pendingServices);
  clone.kpi.pendingCosts = scale(golden.kpi.pendingCosts);

  clone.dailyReport.flights.total = scale(golden.dailyReport.flights.total);
  clone.dailyReport.flights.onTime = Math.min(
    clone.dailyReport.flights.total,
    scale(golden.dailyReport.flights.onTime)
  );
  clone.dailyReport.flights.delayed = Math.max(
    0,
    clone.dailyReport.flights.total - clone.dailyReport.flights.onTime
  );
  clone.dailyReport.passengers.checkedIn = clone.kpi.paxCheckedIn;
  clone.dailyReport.passengers.boarded = clone.kpi.paxBoarded;
  clone.dailyReport.cargo.totalWeightKg = clone.kpi.cargoWeightKg;
  clone.dailyReport.cargo.totalVolumeM3 =
    Math.round(golden.dailyReport.cargo.totalVolumeM3 * factor * 10) / 10;
  clone.dailyReport.cargo.shipments = scale(golden.dailyReport.cargo.shipments);
  clone.dailyReport.services.requested = clone.kpi.pendingServices;
  clone.dailyReport.services.confirmed = scale(golden.dailyReport.services.confirmed);
  clone.dailyReport.services.completed = scale(golden.dailyReport.services.completed);
  clone.dailyReport.costs.total = scale(golden.dailyReport.costs.total);
  clone.dailyReport.costs.approvedAmount = scale(golden.dailyReport.costs.approvedAmount);
  clone.dailyReport.costs.positioningAmount = scale(golden.dailyReport.costs.positioningAmount);

  return clone;
}

function buildStationDataset(stationCode: string, dateStr: string): StationDataset {
  if (dateStr === EMPTY_DEMO_DATE) {
    return createEmptyDataset();
  }
  if (dateStr === ERROR_DEMO_DATE) {
    throw new Error('Gagal memuat data Station Operations. Periksa koneksi lalu coba lagi.');
  }

  const golden = createGoldenDataset();
  if (stationCode === GOLDEN_STATION && dateStr === GOLDEN_DATE) {
    return golden;
  }
  return jitterDataset(golden, `${stationCode}-${dateStr}`);
}

// ---------------------------------------------------------------------------
// Load / refresh
// ---------------------------------------------------------------------------

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadStationOperations() {
  pending.value = true;
  error.value = '';
  try {
    await wait(500);
    dataset.value = buildStationDataset(selectedStationCode.value, operationalDate.value);
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

watch([selectedStationCode, operationalDate], () => {
  loadStationOperations();
});

onMounted(() => {
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

const flightStatusMeta: Record<FlightStatus, { label: string; color: string; dot: string }> = {
  LANDED: { label: 'Landed', color: '#64748B', dot: '#94A3B8' },
  ARRIVING: { label: 'Arriving', color: '#2563EB', dot: '#60A5FA' },
  SCHEDULED: { label: 'Scheduled', color: '#475569', dot: '#CBD5E1' },
  DELAYED: { label: 'Delayed', color: '#DC2626', dot: '#F87171' },
  DEPARTED: { label: 'Departed', color: '#16A34A', dot: '#4ADE80' },
  BOARDING: { label: 'Boarding', color: '#7C3AED', dot: '#A78BFA' }
};

const readinessMeta: Record<ReadinessStatus, { label: string; icon: string; color: string }> = {
  READY: { label: 'Ready', icon: 'mdi-check-circle', color: '#16A34A' },
  CHECK: { label: 'Check', icon: 'mdi-alert-circle', color: '#D97706' },
  NOT_READY: { label: 'Not Ready', icon: 'mdi-close-circle', color: '#DC2626' }
};

const serviceStatusColor: Record<ServiceStatus, string> = {
  REQUESTED: 'info',
  CONFIRMED: 'success',
  COMPLETED: 'secondary',
  CANCELLED: 'error'
};

const costStatusColor: Record<CostStatus, string> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error'
};

// ---------------------------------------------------------------------------
// Computed view data
// ---------------------------------------------------------------------------

const selectedStationLabel = computed(() => {
  const found = STATION_OPTIONS.find((option) => option.code === selectedStationCode.value);
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
  iconBg: string;
  iconColor: string;
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
      iconBg: '#DBEAFE',
      iconColor: '#2563EB',
      delta: kpi.delta.inboundFlights,
      goodDirection: 'up'
    },
    {
      key: 'outbound',
      label: 'Outbound Flights',
      value: numberFormat(kpi.outboundFlights),
      icon: 'mdi-airplane-takeoff',
      iconBg: '#DCFCE7',
      iconColor: '#16A34A',
      delta: kpi.delta.outboundFlights,
      goodDirection: 'up'
    },
    {
      key: 'action',
      label: 'Flights Needing Action',
      value: numberFormat(kpi.flightsNeedingAction),
      icon: 'mdi-alert',
      iconBg: '#FFEDD5',
      iconColor: '#EA580C',
      delta: kpi.delta.flightsNeedingAction,
      goodDirection: 'down'
    },
    {
      key: 'pax',
      label: 'Pax Check-in / Boarded',
      value: `${numberFormat(kpi.paxCheckedIn)} / ${numberFormat(kpi.paxBoarded)}`,
      icon: 'mdi-account-group',
      iconBg: '#EDE9FE',
      iconColor: '#7C3AED',
      delta: kpi.delta.pax,
      goodDirection: 'up'
    },
    {
      key: 'cargo',
      label: 'Cargo Weight (kg)',
      value: numberFormat(kpi.cargoWeightKg),
      icon: 'mdi-package-variant',
      iconBg: '#FEF3C7',
      iconColor: '#B45309',
      delta: kpi.delta.cargoWeightKg,
      goodDirection: 'up'
    },
    {
      key: 'pendingServices',
      label: 'Pending Services',
      value: numberFormat(kpi.pendingServices),
      icon: 'mdi-toolbox-outline',
      iconBg: '#E0E7FF',
      iconColor: '#4338CA',
      delta: kpi.delta.pendingServices,
      goodDirection: 'down'
    },
    {
      key: 'pendingCosts',
      label: 'Pending Costs',
      value: numberFormat(kpi.pendingCosts),
      icon: 'mdi-currency-usd',
      iconBg: '#D1FAE5',
      iconColor: '#047857',
      delta: kpi.delta.pendingCosts,
      goodDirection: 'down'
    }
  ];
});

function deltaColor(card: KpiCard) {
  const actualDirection = card.delta >= 0 ? 'up' : 'down';
  return actualDirection === card.goodDirection ? '#16A34A' : '#DC2626';
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
      ...build(passenger.pct, '#2563EB'),
      label: 'Passenger',
      count: passenger.count,
      pct: passenger.pct
    },
    { ...build(cargo.pct, '#16A34A'), label: 'Cargo', count: cargo.count, pct: cargo.pct },
    {
      ...build(positioning.pct, '#F59E0B'),
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
      color: ex.delayOver15 > 0 ? '#DC2626' : '#16A34A'
    },
    {
      key: 'servicesOverdue',
      label: 'Services Overdue',
      value: ex.servicesOverdue,
      icon: 'mdi-clock-alert-outline',
      color: ex.servicesOverdue > 0 ? '#DC2626' : '#16A34A'
    },
    {
      key: 'costOverdue',
      label: 'Cost Overdue',
      value: ex.costOverdue,
      icon: 'mdi-clock-alert-outline',
      color: ex.costOverdue > 0 ? '#DC2626' : '#16A34A'
    },
    {
      key: 'manifestIssue',
      label: 'Manifest Issue',
      value: ex.manifestIssue,
      icon: ex.manifestIssue > 0 ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline',
      color: ex.manifestIssue > 0 ? '#DC2626' : '#16A34A'
    },
    {
      key: 'techLogOpen',
      label: 'Tech Log Open',
      value: ex.techLogOpen,
      icon: 'mdi-book-alert-outline',
      color: ex.techLogOpen > 0 ? '#EA580C' : '#16A34A'
    }
  ];
});

// ---------------------------------------------------------------------------
// Row actions (dummy mutation of local dataset)
// ---------------------------------------------------------------------------

async function confirmService(row: StationServiceRow) {
  loadingId.value = row.id;
  actionError.value = '';
  try {
    await wait(400);
    const target = dataset.value.services.find((service) => service.id === row.id);
    if (target) target.status = 'CONFIRMED';
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Gagal memproses station service.';
  } finally {
    loadingId.value = '';
  }
}

async function approveCost(row: StationCostRow) {
  loadingId.value = row.id;
  actionError.value = '';
  try {
    await wait(400);
    const target = dataset.value.costs.find((cost) => cost.id === row.id);
    if (target) target.status = 'APPROVED';
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Gagal memproses station cost.';
  } finally {
    loadingId.value = '';
  }
}

// ---------------------------------------------------------------------------
// Create Service dialog
// ---------------------------------------------------------------------------

const showCreateService = ref(false);
const creatingService = ref(false);
const serviceForm = reactive({
  flightId: '',
  serviceType: 'HANDLING' as ServiceType,
  supplierName: '',
  referenceRate: null as number | null
});

function openCreateService() {
  serviceForm.flightId = dataset.value.flights[0]?.flightId ?? '';
  serviceForm.serviceType = 'HANDLING';
  serviceForm.supplierName = '';
  serviceForm.referenceRate = null;
  showCreateService.value = true;
}

async function submitCreateService() {
  const flight = dataset.value.flights.find((row) => row.flightId === serviceForm.flightId);
  if (!flight || !serviceForm.supplierName) return;
  creatingService.value = true;
  try {
    await wait(500);
    dataset.value.services.unshift({
      id: `svc-${Date.now()}`,
      flightId: flight.flightId,
      flightNumber: flight.flightNumber,
      serviceType: serviceForm.serviceType,
      supplierName: serviceForm.supplierName,
      status: 'REQUESTED',
      referenceRate: serviceForm.referenceRate ?? undefined
    });
    showCreateService.value = false;
  } finally {
    creatingService.value = false;
  }
}

// ---------------------------------------------------------------------------
// Create Cost dialog
// ---------------------------------------------------------------------------

const COST_CATEGORIES = ['Landing Fee', 'Handling Fee', 'Parking Fee', 'Positioning Fee', 'Other'];

const showCreateCost = ref(false);
const creatingCost = ref(false);
const costForm = reactive({
  flightId: '',
  costCategoryName: 'Landing Fee',
  description: '',
  amount: null as number | null
});

function openCreateCost() {
  costForm.flightId = dataset.value.flights[0]?.flightId ?? '';
  costForm.costCategoryName = 'Landing Fee';
  costForm.description = '';
  costForm.amount = null;
  showCreateCost.value = true;
}

async function submitCreateCost() {
  if (!costForm.amount || !costForm.description) return;
  const flight = dataset.value.flights.find((row) => row.flightId === costForm.flightId) ?? null;
  creatingCost.value = true;
  try {
    await wait(500);
    dataset.value.costs.unshift({
      id: `cost-${Date.now()}`,
      flightId: flight?.flightId ?? null,
      flightNumber: flight?.flightNumber ?? null,
      stationCode: selectedStationCode.value,
      vendorName: null,
      costCategoryName: costForm.costCategoryName,
      description: costForm.description,
      amount: costForm.amount,
      currencyCode: 'IDR',
      status: 'PENDING'
    });
    showCreateCost.value = false;
  } finally {
    creatingCost.value = false;
  }
}

// ---------------------------------------------------------------------------
// Export CSV — sesuai spec, export memakai data Daily Report
// ---------------------------------------------------------------------------

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
            variant="outlined"
            prepend-icon="mdi-refresh"
            :loading="pending"
            @click="refreshAll"
          >
            Refresh
          </VBtn>
          <VBtn color="primary" prepend-icon="mdi-tray-arrow-down" @click="exportDailyReportCsv">
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
        <VBtn size="small" variant="tonal" color="error" @click="refreshAll">Coba lagi</VBtn>
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

    <template v-if="!error">
      <!-- KPI strip -->
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
              <div
                class="flex items-center justify-center rounded-full"
                :style="{ background: card.iconBg, width: '32px', height: '32px' }"
              >
                <VIcon :icon="card.icon" :color="card.iconColor" size="18" />
              </div>
            </div>
            <div class="text-h5 font-weight-bold text-text-primary">{{ card.value }}</div>
            <div class="mt-1 flex items-center gap-1 text-caption text-text-secondary">
              <span>vs yesterday</span>
              <span
                class="flex items-center font-weight-medium"
                :style="{ color: deltaColor(card) }"
              >
                <VIcon :icon="deltaIcon(card)" size="12" :color="deltaColor(card)" />
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
                variant="tonal"
                color="primary"
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
                      <VChip
                        size="small"
                        variant="tonal"
                        :style="{ color: flightStatusMeta[row.status].color }"
                      >
                        {{ flightStatusMeta[row.status].label }}
                      </VChip>
                    </td>
                    <td>
                      <div class="flex items-center gap-1">
                        <VIcon
                          :icon="readinessMeta[row.readiness].icon"
                          :color="readinessMeta[row.readiness].color"
                          size="16"
                        />
                        <span
                          class="text-caption font-weight-medium"
                          :style="{ color: readinessMeta[row.readiness].color }"
                        >
                          {{ readinessMeta[row.readiness].label }}
                        </span>
                      </div>
                    </td>
                    <td>{{ row.paxOnboard }} / {{ row.paxTotal }}</td>
                    <td class="hidden md:table-cell">{{ numberFormat(row.cargoWeightKg) }}</td>
                    <td class="text-right">
                      <DsTooltipIconButton
                        density="comfortable"
                        icon="mdi-square-edit-outline"
                        :to="`/flights/${row.flightId}`"
                        tooltip="View flight"
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
              <span class="flex items-center gap-1">
                <span
                  class="inline-block h-2 w-2 rounded-full"
                  :style="{ background: flightStatusMeta.LANDED.dot }"
                />
                Landed
              </span>
              <span class="flex items-center gap-1">
                <span
                  class="inline-block h-2 w-2 rounded-full"
                  :style="{ background: flightStatusMeta.ARRIVING.dot }"
                />
                Arriving
              </span>
              <span class="flex items-center gap-1">
                <span
                  class="inline-block h-2 w-2 rounded-full"
                  :style="{ background: flightStatusMeta.SCHEDULED.dot }"
                />
                Scheduled
              </span>
              <span class="flex items-center gap-1">
                <span
                  class="inline-block h-2 w-2 rounded-full"
                  :style="{ background: flightStatusMeta.DELAYED.dot }"
                />
                Delayed
              </span>
            </div>
          </VCard>

          <VCard border class="xl:col-span-3">
            <div class="flex flex-wrap items-center justify-between gap-2 pa-4 pb-0">
              <div>
                <h2 class="text-subtitle-1 font-weight-bold text-text-primary">Services</h2>
                <p class="text-caption text-text-secondary">Recent &amp; pending services</p>
              </div>
              <VBtn
                size="small"
                variant="outlined"
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
                  <tr v-for="row in dataset.services" v-else :key="row.id">
                    <td class="font-weight-medium">{{ row.flightNumber }}</td>
                    <td class="text-text-secondary">{{ row.serviceType }}</td>
                    <td>{{ row.supplierName }}</td>
                    <td>
                      <VChip size="small" :color="serviceStatusColor[row.status]" variant="tonal">
                        {{ row.status }}
                      </VChip>
                    </td>
                    <td class="text-right">
                      <DsConfirmIconButton
                        v-if="row.status === 'REQUESTED'"
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
                        variant="tonal"
                      />
                      <DsTooltipIconButton
                        v-else
                        density="comfortable"
                        icon="mdi-eye-outline"
                        tooltip="View service"
                        variant="text"
                        :to="`/flights/${row.flightId}`"
                      />
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
            <VDivider />
            <div class="py-3 text-center">
              <NuxtLink
                :to="`/flights/station-services?station=${selectedStationCode}&date=${operationalDate}`"
                class="text-caption font-weight-medium text-primary"
              >
                View all services →
              </NuxtLink>
            </div>
          </VCard>

          <VCard border class="xl:col-span-3">
            <div class="flex flex-wrap items-center justify-between gap-2 pa-4 pb-0">
              <div>
                <h2 class="text-subtitle-1 font-weight-bold text-text-primary">Costs</h2>
                <p class="text-caption text-text-secondary">Recent &amp; pending costs</p>
              </div>
              <VBtn size="small" variant="outlined" prepend-icon="mdi-plus" @click="openCreateCost">
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
                  <tr v-for="row in dataset.costs" v-else :key="row.id">
                    <td class="font-weight-medium">{{ row.flightNumber ?? '-' }}</td>
                    <td>{{ row.costCategoryName }}</td>
                    <td>{{ money(row.amount, row.currencyCode) }}</td>
                    <td>
                      <VChip size="small" :color="costStatusColor[row.status]" variant="tonal">
                        {{ row.status }}
                      </VChip>
                    </td>
                    <td class="text-right">
                      <DsConfirmIconButton
                        v-if="row.status !== 'APPROVED'"
                        :action="() => approveCost(row)"
                        color="success"
                        confirm-icon="mdi-check-decagram-outline"
                        confirm-text="Approve"
                        density="comfortable"
                        icon="mdi-check-decagram-outline"
                        :loading="loadingId === row.id"
                        :message="`Approve ${money(row.amount, row.currencyCode)} station cost for ${row.flightNumber ?? row.stationCode}.`"
                        title="Approve station cost?"
                        tone="success"
                        tooltip="Approve station cost"
                        variant="tonal"
                      />
                      <DsTooltipIconButton
                        v-else
                        density="comfortable"
                        icon="mdi-eye-outline"
                        tooltip="View cost"
                        variant="text"
                        :to="row.flightId ? `/flights/${row.flightId}` : undefined"
                      />
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
            <VDivider />
            <div class="py-3 text-center">
              <NuxtLink
                :to="`/flights/station-costs?station=${selectedStationCode}&date=${operationalDate}`"
                class="text-caption font-weight-medium text-primary"
              >
                View all costs →
              </NuxtLink>
            </div>
          </VCard>
        </div>

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
                <circle cx="60" cy="60" r="45" fill="none" stroke="#E5E7EB" stroke-width="16" />
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
                <VIcon :icon="item.icon" :color="item.color" size="16" />
                {{ item.label }}
              </span>
              <span class="text-h6 font-weight-bold" :style="{ color: item.color }">{{
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
            v-model="serviceForm.serviceType"
            label="Service Type"
            :items="['HANDLING', 'PARKING']"
            variant="outlined"
            density="comfortable"
          />
          <VTextField
            v-model="serviceForm.supplierName"
            label="Supplier"
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
          <VBtn color="primary" :loading="creatingService" @click="submitCreateService">
            Create Service
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
            v-model="costForm.costCategoryName"
            label="Category"
            :items="COST_CATEGORIES"
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
            label="Amount (IDR)"
            type="number"
            variant="outlined"
            density="comfortable"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showCreateCost = false">Cancel</VBtn>
          <VBtn color="primary" :loading="creatingCost" @click="submitCreateCost">Create Cost</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
