<script setup lang="ts">
import type { ApexAxisChartSeries, ApexNonAxisChartSeries, ApexOptions } from 'apexcharts';
import type {
  Aircraft,
  FlightRequest,
  FlightStatus,
  ReadinessCheck,
  Station
} from '#shared/types/ops-demo';
import { formatJayapuraDateTime, titleCaseStatus } from '#operations/formatters';

type OperationFilter = 'ALL' | 'SCHEDULED' | 'CHARTER' | 'CARGO' | 'MEDEVAC';
type DashboardTab = 'command' | 'management';
type SectionKey =
  | 'kpis'
  | 'actions'
  | 'readiness'
  | 'fleet'
  | 'flightBoard'
  | 'blockers'
  | 'stations'
  | 'management';

interface ActionItem {
  id: string;
  severity: 'CRITICAL' | 'WARNING';
  title: string;
  issue: string;
  impact: string;
  owner: string;
  action: string;
  to: string;
}

interface FleetRow {
  id: string;
  aircraft: string;
  registration: string;
  currentStation: string;
  status: Aircraft['operationalStatus'];
  nextAvailability: string;
  aircraftId: string;
}

interface StationRow {
  id: string;
  station: string;
  status: 'Ready' | 'Limited' | 'Blocked';
  fuel: string;
  handling: 'Ready' | 'Pending';
  parking: string;
  alert: string;
  stationId: string;
}

interface FleetDetail {
  configuration: string;
  maintenance: string;
  nextCommitment: string;
  documents: string;
}

interface StationDetail {
  name: string;
  city: string;
  capabilities: string;
  timezone: string;
}

const store = useAmaDemoStore();

const selectedDate = ref(store.data.value.meta.demoDate);
const selectedStation = ref('ALL');
const selectedOperation = ref<OperationFilter>('ALL');
const activeTab = ref<DashboardTab>('command');
const controlPanelOpen = ref(true);

const sections = reactive<Record<SectionKey, boolean>>({
  kpis: true,
  actions: true,
  readiness: true,
  fleet: true,
  flightBoard: true,
  blockers: true,
  stations: true,
  management: true
});

const sectionControls: Array<{ key: SectionKey; label: string; hint: string }> = [
  { key: 'kpis', label: 'KPI Cards', hint: 'Ringkasan beban dan risiko hari ini' },
  { key: 'actions', label: 'Perlu Tindakan', hint: 'Panel prioritas OCC' },
  { key: 'readiness', label: 'Readiness Chart', hint: 'Status request operasional' },
  { key: 'fleet', label: 'Fleet Availability', hint: 'Kesiapan armada dan tabel' },
  { key: 'flightBoard', label: 'Flight Status Board', hint: 'Lane following manual' },
  { key: 'blockers', label: 'Blocker Breakdown', hint: 'Pola masalah readiness' },
  { key: 'stations', label: 'Station Matrix', hint: 'Kesiapan station Papua' },
  { key: 'management', label: 'Management Overview', hint: 'Tab ringkasan manajemen' }
];

const operationOptions: Array<{ title: string; value: OperationFilter }> = [
  { title: 'All Operations', value: 'ALL' },
  { title: 'Scheduled', value: 'SCHEDULED' },
  { title: 'Charter', value: 'CHARTER' },
  { title: 'Cargo', value: 'CARGO' },
  { title: 'Medevac', value: 'MEDEVAC' }
];

const statusLaneOrder: FlightStatus[] = ['READY', 'DEPARTED', 'AIRBORNE', 'LANDED', 'CLOSED'];
const simulatedNow = '2026-07-06T08:15:00+09:00';

const fleetHeaders = [
  { title: 'Aircraft', key: 'aircraft', sortable: true },
  { title: 'Registration', key: 'registration', sortable: true },
  { title: 'Current Station', key: 'currentStation', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Next Availability', key: 'nextAvailability', sortable: true }
];

const stationHeaders = [
  { title: 'Station', key: 'station', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Fuel', key: 'fuel', sortable: false },
  { title: 'Handling', key: 'handling', sortable: false },
  { title: 'Parking', key: 'parking', sortable: false },
  { title: 'Alert', key: 'alert', sortable: false }
];

const stationOptions = computed(() => [
  { title: 'All Stations', value: 'ALL' },
  ...store.data.value.stations.map((station) => ({
    title: `${station.code} / ${station.name}`,
    value: station.id
  }))
]);

const filteredRequests = computed(() =>
  store.data.value.flightRequests.filter((request) => {
    const route = store.getRoute(request.routeId);
    const matchesDate = request.plannedDepartureAt.slice(0, 10) === selectedDate.value;
    const matchesStation =
      selectedStation.value === 'ALL' ||
      route?.originStationId === selectedStation.value ||
      route?.destinationStationId === selectedStation.value;
    const matchesOperation =
      selectedOperation.value === 'ALL' ||
      getOperationCategory(request) === selectedOperation.value;

    return matchesDate && matchesStation && matchesOperation;
  })
);

const filteredFlights = computed(() =>
  store.data.value.flights.filter((flight) => {
    const route = store.getRoute(flight.routeId);
    const matchesDate =
      flight.plannedDepartureAt.slice(0, 10) === selectedDate.value ||
      flight.lastStatusAt.slice(0, 10) === selectedDate.value;
    const matchesStation =
      selectedStation.value === 'ALL' ||
      route?.originStationId === selectedStation.value ||
      route?.destinationStationId === selectedStation.value;

    return matchesDate && matchesStation;
  })
);

const aircraftPool = computed(() =>
  selectedStation.value === 'ALL'
    ? store.data.value.aircraft
    : store.data.value.aircraft.filter(
        (aircraft) => aircraft.currentStationId === selectedStation.value
      )
);

const kpis = computed(() => {
  const readyForApproval = filteredRequests.value.filter(
    (request) => request.status === 'READY_FOR_APPROVAL'
  ).length;
  const blockedCritical = filteredRequests.value.filter(
    (request) => request.status === 'BLOCKED' || request.priority === 'CRITICAL'
  ).length;
  const activeFlights = filteredFlights.value.filter(
    (flight) =>
      !['LANDED', 'CLOSED', 'CANCELLED'].includes(flight.status) &&
      (['DEPARTED', 'AIRBORNE', 'DELAYED'].includes(flight.status) || flight.delay.isDelayed)
  ).length;
  const availableAircraft = aircraftPool.value.filter(
    (aircraft) => aircraft.operationalStatus === 'AVAILABLE'
  ).length;
  const delayedFlights = filteredFlights.value.filter((flight) => flight.delay.isDelayed).length;

  return [
    {
      label: 'Flight Request Hari Ini',
      value: filteredRequests.value.length,
      tone: 'info',
      caption: 'Total request operational hari ini',
      reason: 'Melihat beban kerja operasi'
    },
    {
      label: 'Siap Approval',
      value: readyForApproval,
      tone: 'success',
      caption: 'Request tanpa blocker',
      reason: 'Tindakan yang perlu approval'
    },
    {
      label: 'Blocked / Critical',
      value: blockedCritical,
      tone: 'danger',
      caption: 'Request dengan blocker',
      reason: 'Prioritas utama OCC'
    },
    {
      label: 'Active Flight',
      value: activeFlights,
      tone: 'warning',
      caption: 'Departed / Airborne / Delayed',
      reason: 'Monitoring live-operational manual'
    },
    {
      label: 'Aircraft Available',
      value: `${availableAircraft}/${aircraftPool.value.length}`,
      tone: 'success',
      caption: 'Available dibanding total fleet',
      reason: 'Kesiapan armada'
    },
    {
      label: 'Flight Delayed',
      value: delayedFlights,
      tone: delayedFlights > 0 ? 'warning' : 'success',
      caption: 'Flight terlambat hari ini',
      reason: 'Risiko layanan dan operasional'
    }
  ];
});

const urgentActions = computed<ActionItem[]>(() => {
  const medevac = store.data.value.flightRequests.find(
    (request) => request.requestNumber === 'FR-20260706-002'
  );
  const charter = store.data.value.flightRequests.find(
    (request) => request.requestNumber === 'FR-20260706-003'
  );
  const delayedFlight = store.data.value.flights.find((flight) => flight.flightNumber === 'AMA702');

  return [
    {
      id: 'medevac-fuel-duty',
      severity: 'CRITICAL',
      title: 'FR-20260706-002 — Medevac WMX → DJJ',
      issue: 'Fuel belum cukup: 280 L dari kebutuhan 480 L',
      impact: 'Pilot mendekati duty limit',
      owner: 'OCC Duty Manager',
      action: 'Open Readiness Review',
      to: medevac ? `/ops/flight-requests/${medevac.id}` : '/ops/flight-requests'
    },
    {
      id: 'charter-qualification-handling',
      severity: 'CRITICAL',
      title: 'FR-20260706-003 — Charter DJJ → OKS',
      issue: 'Pilot qualification expired',
      impact: 'Destination handling masih pending',
      owner: 'Crew Planning + Station OKS',
      action: 'Resolve Blockers',
      to: charter ? `/ops/flight-requests/${charter.id}` : '/ops/flight-requests'
    },
    {
      id: 'ama702-delay',
      severity: 'WARNING',
      title: 'AMA702 — DJJ → WMX',
      issue: 'Delay 13 menit',
      impact: 'Reason: Ground handling delay',
      owner: 'Flight Following Officer',
      action: 'View Flight Following',
      to: delayedFlight ? `/ops/flights/${delayedFlight.id}` : '/ops/flight-following'
    }
  ];
});

const readinessCounts = computed(() => {
  const result = {
    ready: 0,
    warning: 0,
    blocked: 0,
    converted: 0
  };

  for (const request of filteredRequests.value) {
    const readiness = getReadiness(request.id);
    if (request.status === 'CONVERTED_TO_FLIGHT') result.converted += 1;
    else if (readiness?.overallState === 'BLOCKER' || request.status === 'BLOCKED')
      result.blocked += 1;
    else if (
      readiness?.items.some((item) => item.state === 'WARNING' || item.state === 'PENDING')
    ) {
      result.warning += 1;
    } else {
      result.ready += 1;
    }
  }

  return result;
});

const readinessChartSeries = computed<ApexNonAxisChartSeries>(() => [
  readinessCounts.value.ready,
  readinessCounts.value.warning,
  readinessCounts.value.blocked,
  readinessCounts.value.converted
]);

const readinessChartOptions = computed<ApexOptions>(() => ({
  chart: {
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif'
  },
  colors: ['#27805B', '#F2B544', '#B9473B', '#286E9E'],
  dataLabels: {
    enabled: true,
    formatter(value: number) {
      return `${Math.round(value)}%`;
    }
  },
  labels: ['Siap dilanjutkan', 'Perlu review', 'Blocked', 'Converted'],
  legend: {
    position: 'bottom'
  },
  plotOptions: {
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Request',
            formatter() {
              return String(filteredRequests.value.length);
            }
          }
        }
      }
    }
  },
  stroke: {
    width: 0
  }
}));

const fleetRows = computed<FleetRow[]>(() =>
  store.data.value.aircraft.map((aircraft) => ({
    id: aircraft.id,
    aircraft: getAircraftFamily(aircraft),
    registration: aircraft.registration,
    currentStation: store.getStation(aircraft.currentStationId)?.code ?? '-',
    status: aircraft.operationalStatus,
    nextAvailability: getNextAvailability(aircraft),
    aircraftId: aircraft.id
  }))
);

const fleetGroups = computed(() => {
  const groups = new Map<string, Record<string, number>>();

  for (const aircraft of store.data.value.aircraft) {
    const family = getAircraftFamily(aircraft);
    const group = groups.get(family) ?? {};
    group[titleCaseStatus(aircraft.operationalStatus)] =
      (group[titleCaseStatus(aircraft.operationalStatus)] ?? 0) + 1;
    groups.set(family, group);
  }

  return Array.from(groups.entries()).map(([aircraft, statuses]) => ({
    aircraft,
    statuses: Object.entries(statuses).map(([status, total]) => ({ status, total }))
  }));
});

const boardLanes = computed(() =>
  statusLaneOrder.map((status) => ({
    status,
    label: titleCaseStatus(status),
    flights: filteredFlights.value.filter((flight) => flight.status === status)
  }))
);

const blockerBreakdown = computed(() => [
  { label: 'Fuel confirmation', value: countReadinessIssues('Fuel') },
  { label: 'Crew duty time', value: countReadinessIssues('duty') },
  { label: 'Crew qualification', value: countReadinessIssues('qualification') },
  { label: 'Destination handling', value: countReadinessIssues('Destination handling') },
  { label: 'Aircraft availability', value: 0 },
  { label: 'Payload capacity', value: 0 }
]);

const blockerChartSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Issue',
    data: blockerBreakdown.value.map((item) => item.value)
  }
]);

const blockerChartOptions = computed<ApexOptions>(() => ({
  chart: {
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif'
  },
  colors: ['#B9473B'],
  dataLabels: {
    enabled: true
  },
  grid: {
    borderColor: '#D8E0E1'
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true,
      distributed: true
    }
  },
  xaxis: {
    categories: blockerBreakdown.value.map((item) => item.label),
    labels: {
      formatter(value: string) {
        return value;
      }
    }
  }
}));

const stationRows = computed<StationRow[]>(() => {
  const rows: Array<Omit<StationRow, 'stationId'>> = [
    {
      id: 'DJJ',
      station: 'DJJ',
      status: 'Ready',
      fuel: 'Available',
      handling: 'Ready',
      parking: '4/6 slot',
      alert: '-'
    },
    {
      id: 'WMX',
      station: 'WMX',
      status: 'Limited',
      fuel: 'Low',
      handling: 'Ready',
      parking: '2/3 slot',
      alert: 'Fuel low'
    },
    {
      id: 'OKS',
      station: 'OKS',
      status: 'Ready',
      fuel: 'No local fuel',
      handling: 'Pending',
      parking: '0/1 slot',
      alert: 'Handling pending'
    },
    {
      id: 'MKQ',
      station: 'MKQ',
      status: 'Ready',
      fuel: 'Available',
      handling: 'Ready',
      parking: '3/4 slot',
      alert: '-'
    }
  ];

  return rows
    .map((row) => ({
      ...row,
      stationId:
        store.data.value.stations.find((station) => station.code === row.station)?.id ?? row.station
    }))
    .filter((row) => selectedStation.value === 'ALL' || row.stationId === selectedStation.value);
});

const completionTrendSeries = computed<ApexAxisChartSeries>(() => [
  { name: 'Scheduled', data: [8, 11, 9, 12, 10, 13, 12] },
  { name: 'Completed', data: [7, 10, 8, 10, 9, 12, 10] },
  { name: 'Cancelled', data: [1, 0, 1, 1, 0, 0, 1] }
]);

const completionTrendOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#286E9E', '#27805B', '#B9473B'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 3 },
  xaxis: { categories: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] }
}));

const onTimeSeries = computed<ApexNonAxisChartSeries>(() => [73, 20, 7]);
const onTimeOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#27805B', '#F2B544', '#B9473B'],
  labels: ['On-time', 'Delayed', 'Cancelled'],
  legend: { position: 'bottom' },
  plotOptions: { pie: { donut: { size: '70%' } } }
}));

const delayReasonSeries = computed<ApexAxisChartSeries>(() => [
  { name: 'Delay', data: [4, 3, 2, 2, 1, 1] }
]);
const delayReasonOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#F47A1F'],
  dataLabels: { enabled: false },
  plotOptions: { bar: { borderRadius: 4, horizontal: true } },
  xaxis: { categories: ['Weather', 'Handling', 'Fuel', 'Crew', 'Maintenance', 'Operational'] }
}));

const utilizationSeries = computed<ApexAxisChartSeries>(() => [
  { name: 'Flight Hours', data: [6.4, 4.8, 5.2, 0.6, 3.1] }
]);
const utilizationOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#0E8C8A'],
  dataLabels: { enabled: false },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '48%' } },
  xaxis: { categories: ['PK-AMA', 'PK-AMB', 'PK-AMC', 'PK-AMD', 'PK-AME'] }
}));

const fuelSeries = computed<ApexAxisChartSeries>(() => [
  { name: 'Requested', data: [1260, 480, 0, 320] },
  { name: 'Confirmed', data: [1260, 280, 0, 320] }
]);
const fuelOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#286E9E', '#27805B'],
  dataLabels: { enabled: false },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '48%' } },
  xaxis: { categories: ['DJJ', 'WMX', 'OKS', 'MKQ'] }
}));

const requestSourceSeries = computed<ApexNonAxisChartSeries>(() => [4, 2, 2, 1, 1]);
const requestSourceOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#286E9E', '#0E8C8A', '#F47A1F', '#B9473B', '#F2B544'],
  labels: ['Ticketing', 'Cargo', 'Charter', 'Medevac', 'Internal'],
  legend: { position: 'bottom' }
}));

const routeActivity = [
  { route: 'DJJ → WMX', flights: 4, pax: 42, cargo: '680 kg' },
  { route: 'WMX → DJJ', flights: 2, pax: 12, cargo: '120 kg' },
  { route: 'DJJ → OKS', flights: 1, pax: 6, cargo: '340 kg' },
  { route: 'MKQ → DJJ', flights: 1, pax: 8, cargo: '180 kg' }
];

const stationPerformance = [
  { station: 'DJJ', delay: '7 min avg', issue: 'Fuel confirmed', handling: 'Fast' },
  { station: 'WMX', delay: '18 min avg', issue: 'Fuel low', handling: 'Ready' },
  { station: 'OKS', delay: 'Pending', issue: 'Handling pending', handling: 'Manual' },
  { station: 'MKQ', delay: '6 min avg', issue: 'Ready', handling: 'Ready' }
];

watch(
  () => sections.management,
  (visible) => {
    if (!visible && activeTab.value === 'management') activeTab.value = 'command';
  }
);

async function fetchFleetDetail(row: FleetRow): Promise<FleetDetail> {
  const aircraft = store.getAircraft(row.aircraftId);

  return {
    configuration: aircraft
      ? `${aircraft.syntheticConfiguration.maxPassengers} pax / ${aircraft.syntheticConfiguration.maxPayloadKg} kg`
      : '-',
    maintenance: aircraft?.maintenance.status ?? '-',
    nextCommitment: aircraft?.availability.nextCommitment ?? 'No next commitment',
    documents:
      aircraft?.documents.map((document) => `${document.type}: ${document.status}`).join(', ') ??
      '-'
  };
}

async function fetchStationDetail(row: StationRow): Promise<StationDetail> {
  const station = store.getStation(row.stationId);

  return {
    name: station?.name ?? row.station,
    city: station?.city ?? '-',
    capabilities: station ? getStationCapabilities(station) : '-',
    timezone: station?.timezone ?? 'Asia/Jayapura'
  };
}

function getOperationCategory(request: FlightRequest): OperationFilter {
  if (request.requestType === 'MEDEVAC' || request.source === 'MEDEVAC') return 'MEDEVAC';
  if (request.requestType === 'CHARTER' || request.source === 'CORPORATE_CHARTER') return 'CHARTER';
  if (request.requestType.includes('CARGO') || request.source === 'CARGO_REQUEST') return 'CARGO';
  return 'SCHEDULED';
}

function getReadiness(requestId: string): ReadinessCheck | undefined {
  return store.data.value.readinessChecks.find(
    (readiness) => readiness.flightRequestId === requestId
  );
}

function routeLabel(routeId: string) {
  const route = store.getRoute(routeId);
  const origin = store.getStation(route?.originStationId);
  const destination = store.getStation(route?.destinationStationId);

  return route && origin && destination ? `${origin.code} → ${destination.code}` : '-';
}

function getAircraftFamily(aircraft: Aircraft) {
  if (aircraft.model.includes('PC-6')) return 'Pilatus PC-6';
  if (aircraft.model.includes('208B')) return 'Cessna Caravan';
  return aircraft.model;
}

function getAircraftLabel(aircraftId: string) {
  const aircraft = store.getAircraft(aircraftId);
  return aircraft ? `${aircraft.registration} · ${getAircraftFamily(aircraft)}` : '-';
}

function getNextAvailability(aircraft: Aircraft) {
  const availableAt = new Date(aircraft.availability.availableFrom);
  const now = new Date(simulatedNow);

  if (aircraft.operationalStatus === 'AVAILABLE' && availableAt <= now) return 'Now';
  if (availableAt.toISOString().slice(0, 10) === selectedDate.value)
    return formatJayapuraTime(availableAt);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Jayapura'
  }).format(availableAt);
}

function formatJayapuraTime(value: string | Date | null | undefined) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

function countReadinessIssues(keyword: string) {
  return filteredRequests.value.reduce((total, request) => {
    const readiness = getReadiness(request.id);
    const found = readiness?.items.some(
      (item) =>
        item.label.toLowerCase().includes(keyword.toLowerCase()) &&
        ['WARNING', 'BLOCKER', 'PENDING'].includes(item.state)
    );

    return found ? total + 1 : total;
  }, 0);
}

function getStationCapabilities(station: Station) {
  const capabilityLabels = [
    station.capabilities.passengerHandling ? 'Passenger' : null,
    station.capabilities.cargoHandling ? 'Cargo' : null,
    station.capabilities.medevacSupport ? 'Medevac' : null,
    station.capabilities.nightOperation ? 'Night ops' : null
  ].filter(Boolean);

  return capabilityLabels.join(', ') || 'Limited';
}

function getStatusColor(status: string) {
  const normalized = status.toLowerCase();
  if (['ready', 'available', 'confirmed', 'closed', 'pass'].includes(normalized)) return 'success';
  if (normalized === 'pending') return 'info';
  if (['limited', 'assigned', 'warning', 'airborne'].includes(normalized)) return 'warning';
  if (['blocked', 'critical', 'maintenance', 'aog'].includes(normalized)) return 'danger';
  return 'info';
}

function resetSections() {
  for (const key of Object.keys(sections) as SectionKey[]) sections[key] = true;
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="dashboard-shell">
      <main class="dashboard-main">
        <section class="mb-4">
          <div class="mb-4 flex flex-wrap items-start gap-4">
            <div class="min-w-0">
              <h1 class="text-3xl font-bold text-text-primary">PT AMA Operations Command Center</h1>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                <span>Senin, 6 Juli 2026 — Asia/Jayapura</span>
                <VChip color="secondary" size="small" variant="tonal">
                  Demo Mode · Single Tenant · No Live Integration
                </VChip>
              </div>
            </div>

            <VSpacer />

            <VBtn
              aria-label="Toggle dashboard controls"
              color="primary"
              :icon="controlPanelOpen ? 'mdi-tune-vertical' : undefined"
              :prepend-icon="controlPanelOpen ? undefined : 'mdi-tune-vertical'"
              variant="tonal"
              @click="controlPanelOpen = !controlPanelOpen"
            >
              <span v-if="!controlPanelOpen">View Controls</span>
            </VBtn>
          </div>

          <VCard border>
            <VCardText>
              <VRow density="compact">
                <VCol cols="12" md="4">
                  <VTextField
                    v-model="selectedDate"
                    density="comfortable"
                    hide-details
                    label="Tanggal operasi"
                    type="date"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12" md="4">
                  <VSelect
                    v-model="selectedStation"
                    density="comfortable"
                    hide-details
                    item-title="title"
                    item-value="value"
                    :items="stationOptions"
                    label="Station"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12" md="4">
                  <VSelect
                    v-model="selectedOperation"
                    density="comfortable"
                    hide-details
                    item-title="title"
                    item-value="value"
                    :items="operationOptions"
                    label="Jenis operasi"
                    variant="outlined"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </section>

        <VTabs v-model="activeTab" class="mb-4" color="primary">
          <VTab value="command">Command Center</VTab>
          <VTab v-if="sections.management" value="management">Management Overview</VTab>
        </VTabs>

        <VWindow v-model="activeTab">
          <VWindowItem value="command">
            <VRow v-if="sections.kpis" class="mb-2">
              <VCol v-for="kpi in kpis" :key="kpi.label" cols="12" sm="6" xl="2">
                <VCard border class="h-full">
                  <VCardText>
                    <div class="text-xs font-bold uppercase tracking-normal text-text-secondary">
                      {{ kpi.label }}
                    </div>
                    <div class="mt-3 text-3xl font-bold" :class="`text-${kpi.tone}`">
                      {{ kpi.value }}
                    </div>
                    <div class="mt-2 text-sm font-medium text-text-primary">{{ kpi.caption }}</div>
                    <div class="mt-1 text-xs text-text-secondary">{{ kpi.reason }}</div>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>

            <VCard v-if="sections.actions" border class="mb-4 priority-panel">
              <VCardTitle class="flex flex-wrap items-center gap-3 text-text-primary">
                PERLU TINDAKAN SEKARANG
                <VChip color="danger" size="small" variant="tonal">OCC Priority</VChip>
              </VCardTitle>
              <VCardText>
                <VRow>
                  <VCol v-for="item in urgentActions" :key="item.id" cols="12" lg="4">
                    <div
                      class="action-row h-full"
                      :class="`action-row--${item.severity.toLowerCase()}`"
                    >
                      <div class="mb-3 flex flex-wrap items-center gap-2">
                        <VChip
                          :color="item.severity === 'CRITICAL' ? 'danger' : 'warning'"
                          size="small"
                          variant="flat"
                        >
                          {{ item.severity }}
                        </VChip>
                        <span class="text-sm font-bold text-text-primary">{{ item.title }}</span>
                      </div>
                      <div class="text-sm text-text-primary">{{ item.issue }}</div>
                      <div class="mt-1 text-sm text-text-primary">{{ item.impact }}</div>
                      <div
                        class="mt-3 text-xs font-semibold uppercase tracking-normal text-text-secondary"
                      >
                        PIC
                      </div>
                      <div class="text-sm font-medium text-text-primary">{{ item.owner }}</div>
                      <VBtn
                        class="mt-4"
                        color="primary"
                        :to="item.to"
                        variant="tonal"
                        append-icon="mdi-arrow-right"
                      >
                        {{ item.action }}
                      </VBtn>
                    </div>
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>

            <VRow>
              <VCol v-if="sections.readiness" cols="12" xl="4">
                <VCard border class="h-full">
                  <VCardTitle class="text-text-primary">
                    Flight Request Readiness Hari Ini
                  </VCardTitle>
                  <VCardSubtitle>
                    Status kesiapan request operasional berdasarkan fixture demo PT AMA.
                  </VCardSubtitle>
                  <VCardText>
                    <FeatureApexChart
                      height="300"
                      :options="readinessChartOptions"
                      :series="readinessChartSeries"
                      type="donut"
                    />
                    <p class="mt-3 text-sm text-text-secondary">
                      Menunjukkan request yang dapat dilanjutkan versus yang harus diselesaikan
                      dahulu.
                    </p>
                  </VCardText>
                </VCard>
              </VCol>

              <VCol v-if="sections.fleet" cols="12" xl="8">
                <VCard border class="h-full">
                  <VCardTitle class="text-text-primary">Fleet Availability</VCardTitle>
                  <VCardText>
                    <div class="fleet-grid mb-4">
                      <div v-for="group in fleetGroups" :key="group.aircraft" class="fleet-group">
                        <div class="font-bold text-text-primary">{{ group.aircraft }}</div>
                        <div class="mt-3 flex flex-wrap gap-2">
                          <VChip
                            v-for="status in group.statuses"
                            :key="`${group.aircraft}-${status.status}`"
                            :color="getStatusColor(status.status)"
                            size="small"
                            variant="tonal"
                          >
                            {{ status.status }}: {{ status.total }}
                          </VChip>
                        </div>
                      </div>
                    </div>

                    <CommonTableExpanded
                      density="compact"
                      hide-default-footer
                      hover
                      item-value="id"
                      :cache-ttl="60_000"
                      :fetch-detail="fetchFleetDetail"
                      :headers="fleetHeaders"
                      :items="fleetRows"
                      :items-length="fleetRows.length"
                      :items-per-page="fleetRows.length"
                    >
                      <template #[`item.status`]="{ item }">
                        <DsStatusBadge :value="item.status" />
                      </template>

                      <template #detail="{ detail }">
                        <VRow density="compact">
                          <VCol cols="12" md="3">
                            <div class="detail-label">Configuration</div>
                            <div class="detail-value">{{ detail?.configuration ?? '-' }}</div>
                          </VCol>
                          <VCol cols="12" md="3">
                            <div class="detail-label">Maintenance</div>
                            <div class="detail-value">{{ detail?.maintenance ?? '-' }}</div>
                          </VCol>
                          <VCol cols="12" md="3">
                            <div class="detail-label">Next Commitment</div>
                            <div class="detail-value">{{ detail?.nextCommitment ?? '-' }}</div>
                          </VCol>
                          <VCol cols="12" md="3">
                            <div class="detail-label">Documents</div>
                            <div class="detail-value">{{ detail?.documents ?? '-' }}</div>
                          </VCol>
                        </VRow>
                      </template>
                    </CommonTableExpanded>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>

            <VCard v-if="sections.flightBoard" border class="my-4">
              <VCardTitle class="text-text-primary">Flight Status Board</VCardTitle>
              <VCardSubtitle>Flight Following lane untuk status manual hari ini.</VCardSubtitle>
              <VCardText>
                <div class="flight-board-grid">
                  <section v-for="lane in boardLanes" :key="lane.status" class="flight-lane">
                    <div class="mb-3 flex items-center justify-between gap-2">
                      <div class="text-sm font-bold text-text-primary">{{ lane.label }}</div>
                      <VChip size="small" variant="tonal">{{ lane.flights.length }}</VChip>
                    </div>

                    <div v-if="lane.flights.length" class="grid gap-3">
                      <div v-for="flight in lane.flights" :key="flight.id" class="flight-card">
                        <div class="mb-2 flex items-center justify-between gap-2">
                          <span class="font-bold text-text-primary">{{ flight.flightNumber }}</span>
                          <span
                            class="status-dot"
                            :class="`status-dot--${lane.status.toLowerCase()}`"
                          />
                        </div>
                        <div class="text-sm font-medium text-text-primary">
                          {{ routeLabel(flight.routeId) }}
                        </div>
                        <div class="mt-1 text-xs text-text-secondary">
                          {{ getAircraftLabel(flight.aircraftId) }}
                        </div>
                        <VDivider class="my-3" />
                        <dl class="flight-card-meta">
                          <div>
                            <dt>Planned</dt>
                            <dd>{{ formatJayapuraTime(flight.plannedDepartureAt) }}</dd>
                          </div>
                          <div>
                            <dt>Actual</dt>
                            <dd>{{ formatJayapuraTime(flight.actualDepartureAt) }}</dd>
                          </div>
                          <div>
                            <dt>Delay</dt>
                            <dd>
                              {{ flight.delay.isDelayed ? `${flight.delay.minutes} min` : '-' }}
                            </dd>
                          </div>
                          <div>
                            <dt>Update</dt>
                            <dd>{{ formatJayapuraDateTime(flight.lastStatusAt) }}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    <div v-else class="empty-lane">0</div>
                  </section>
                </div>
              </VCardText>
            </VCard>

            <VRow>
              <VCol v-if="sections.blockers" cols="12" lg="5">
                <VCard border class="h-full">
                  <VCardTitle class="text-text-primary">Blocker Hari Ini</VCardTitle>
                  <VCardSubtitle>Readiness Blocker Breakdown</VCardSubtitle>
                  <VCardText>
                    <FeatureApexChart
                      height="310"
                      :options="blockerChartOptions"
                      :series="blockerChartSeries"
                      type="bar"
                    />
                    <div class="mt-3 grid gap-2">
                      <div
                        v-for="item in blockerBreakdown"
                        :key="item.label"
                        class="flex items-center justify-between gap-3 text-sm"
                      >
                        <span class="text-text-primary">{{ item.label }}</span>
                        <strong class="text-text-primary">{{ item.value }}</strong>
                      </div>
                    </div>
                  </VCardText>
                </VCard>
              </VCol>

              <VCol v-if="sections.stations" cols="12" lg="7">
                <VCard border class="h-full">
                  <VCardTitle class="text-text-primary">Station Readiness Matrix</VCardTitle>
                  <VCardSubtitle>
                    Kesiapan station remote Papua untuk operasi hari ini.
                  </VCardSubtitle>
                  <CommonTableExpanded
                    density="compact"
                    hide-default-footer
                    hover
                    item-value="id"
                    :cache-ttl="60_000"
                    :fetch-detail="fetchStationDetail"
                    :headers="stationHeaders"
                    :items="stationRows"
                    :items-length="stationRows.length"
                    :items-per-page="stationRows.length"
                  >
                    <template #[`item.status`]="{ item }">
                      <VChip :color="getStatusColor(item.status)" size="small" variant="tonal">
                        {{ item.status }}
                      </VChip>
                    </template>
                    <template #[`item.handling`]="{ item }">
                      <VChip :color="getStatusColor(item.handling)" size="small" variant="tonal">
                        {{ item.handling }}
                      </VChip>
                    </template>
                    <template #[`item.alert`]="{ item }">
                      <span
                        :class="
                          item.alert === '-' ? 'text-text-secondary' : 'font-medium text-danger'
                        "
                      >
                        {{ item.alert }}
                      </span>
                    </template>

                    <template #detail="{ detail }">
                      <VRow density="compact">
                        <VCol cols="12" md="3">
                          <div class="detail-label">Station Name</div>
                          <div class="detail-value">{{ detail?.name ?? '-' }}</div>
                        </VCol>
                        <VCol cols="12" md="3">
                          <div class="detail-label">City</div>
                          <div class="detail-value">{{ detail?.city ?? '-' }}</div>
                        </VCol>
                        <VCol cols="12" md="4">
                          <div class="detail-label">Capabilities</div>
                          <div class="detail-value">{{ detail?.capabilities ?? '-' }}</div>
                        </VCol>
                        <VCol cols="12" md="2">
                          <div class="detail-label">Timezone</div>
                          <div class="detail-value">{{ detail?.timezone ?? '-' }}</div>
                        </VCol>
                      </VRow>
                    </template>
                  </CommonTableExpanded>
                </VCard>
              </VCol>
            </VRow>
          </VWindowItem>

          <VWindowItem v-if="sections.management" value="management">
            <VRow>
              <VCol cols="12" lg="6">
                <VCard border class="h-full">
                  <VCardTitle>Flight Completion Trend</VCardTitle>
                  <VCardSubtitle>Scheduled vs completed vs cancelled per hari.</VCardSubtitle>
                  <VCardText>
                    <FeatureApexChart
                      height="290"
                      :options="completionTrendOptions"
                      :series="completionTrendSeries"
                      type="line"
                    />
                  </VCardText>
                </VCard>
              </VCol>

              <VCol cols="12" lg="3">
                <VCard border class="h-full">
                  <VCardTitle>On-Time Performance</VCardTitle>
                  <VCardSubtitle>On-time, delayed, cancelled.</VCardSubtitle>
                  <VCardText>
                    <FeatureApexChart
                      height="290"
                      :options="onTimeOptions"
                      :series="onTimeSeries"
                      type="donut"
                    />
                  </VCardText>
                </VCard>
              </VCol>

              <VCol cols="12" lg="3">
                <VCard border class="h-full">
                  <VCardTitle>Request Source Mix</VCardTitle>
                  <VCardSubtitle>Ticketing, cargo, charter, medevac.</VCardSubtitle>
                  <VCardText>
                    <FeatureApexChart
                      height="290"
                      :options="requestSourceOptions"
                      :series="requestSourceSeries"
                      type="pie"
                    />
                  </VCardText>
                </VCard>
              </VCol>

              <VCol cols="12" lg="6">
                <VCard border class="h-full">
                  <VCardTitle>Delay Reason Breakdown</VCardTitle>
                  <VCardSubtitle>
                    Weather, handling, fuel, crew, maintenance, operational.
                  </VCardSubtitle>
                  <VCardText>
                    <FeatureApexChart
                      height="310"
                      :options="delayReasonOptions"
                      :series="delayReasonSeries"
                      type="bar"
                    />
                  </VCardText>
                </VCard>
              </VCol>

              <VCol cols="12" lg="6">
                <VCard border class="h-full">
                  <VCardTitle>Aircraft Utilization</VCardTitle>
                  <VCardSubtitle>Flight hours mock per aircraft.</VCardSubtitle>
                  <VCardText>
                    <FeatureApexChart
                      height="310"
                      :options="utilizationOptions"
                      :series="utilizationSeries"
                      type="bar"
                    />
                  </VCardText>
                </VCard>
              </VCol>

              <VCol cols="12" lg="6">
                <VCard border class="h-full">
                  <VCardTitle>Fuel Requested vs Confirmed</VCardTitle>
                  <VCardSubtitle>Per station dan fuel type mock.</VCardSubtitle>
                  <VCardText>
                    <FeatureApexChart
                      height="310"
                      :options="fuelOptions"
                      :series="fuelSeries"
                      type="bar"
                    />
                  </VCardText>
                </VCard>
              </VCol>

              <VCol cols="12" lg="3">
                <VCard border class="h-full">
                  <VCardTitle>Route Activity</VCardTitle>
                  <VTable density="compact">
                    <thead>
                      <tr>
                        <th>Route</th>
                        <th>Flight</th>
                        <th>Cargo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in routeActivity" :key="row.route">
                        <td>{{ row.route }}</td>
                        <td>{{ row.flights }}</td>
                        <td>{{ row.cargo }}</td>
                      </tr>
                    </tbody>
                  </VTable>
                </VCard>
              </VCol>

              <VCol cols="12" lg="3">
                <VCard border class="h-full">
                  <VCardTitle>Station Performance</VCardTitle>
                  <VTable density="compact">
                    <thead>
                      <tr>
                        <th>Station</th>
                        <th>Delay</th>
                        <th>Issue</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in stationPerformance" :key="row.station">
                        <td>{{ row.station }}</td>
                        <td>{{ row.delay }}</td>
                        <td>{{ row.issue }}</td>
                      </tr>
                    </tbody>
                  </VTable>
                </VCard>
              </VCol>
            </VRow>
          </VWindowItem>
        </VWindow>
      </main>

      <aside v-if="controlPanelOpen" class="dashboard-controls">
        <VCard border>
          <VCardTitle class="flex items-center justify-between gap-2">
            <span>Dashboard Controls</span>
            <VBtn
              aria-label="Hide dashboard controls"
              icon="mdi-close"
              size="small"
              variant="text"
              @click="controlPanelOpen = false"
            />
          </VCardTitle>
          <VDivider />
          <VCardText>
            <div class="grid gap-3">
              <div v-for="control in sectionControls" :key="control.key" class="control-row">
                <div class="min-w-0">
                  <div class="font-medium text-text-primary">{{ control.label }}</div>
                  <div class="text-xs text-text-secondary">{{ control.hint }}</div>
                </div>
                <VSwitch
                  v-model="sections[control.key]"
                  color="primary"
                  density="compact"
                  hide-details
                />
              </div>
            </div>

            <VBtn
              block
              class="mt-5"
              color="primary"
              prepend-icon="mdi-restore"
              variant="tonal"
              @click="resetSections"
            >
              Reset View
            </VBtn>
          </VCardText>
        </VCard>
      </aside>
    </div>
  </VContainer>
</template>

<style scoped>
.dashboard-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.dashboard-main {
  min-width: 0;
}

.dashboard-controls {
  position: sticky;
  top: 88px;
}

.priority-panel {
  border-color: rgba(185, 71, 59, 0.32);
}

.action-row {
  border: 1px solid rgb(var(--v-theme-border-default));
  border-left-width: 5px;
  border-radius: 8px;
  padding: 16px;
  background: rgb(var(--v-theme-surface));
}

.action-row--critical {
  border-left-color: rgb(var(--v-theme-danger));
}

.action-row--warning {
  border-left-color: rgb(var(--v-theme-warning));
}

.fleet-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.fleet-group {
  min-height: 96px;
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 8px;
  padding: 14px;
}

.flight-board-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(180px, 1fr));
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.flight-lane {
  min-height: 230px;
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 8px;
  padding: 12px;
  background: rgb(var(--v-theme-background));
}

.flight-card {
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 8px;
  padding: 12px;
  background: rgb(var(--v-theme-surface));
}

.flight-card-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.flight-card-meta dt {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.72rem;
}

.flight-card-meta dd {
  color: rgb(var(--v-theme-text-primary));
  font-size: 0.78rem;
  font-weight: 600;
  margin: 0;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgb(var(--v-theme-info));
}

.status-dot--airborne {
  background: rgb(var(--v-theme-warning));
}

.status-dot--closed {
  background: rgb(var(--v-theme-success));
}

.empty-lane {
  display: grid;
  min-height: 156px;
  place-items: center;
  border: 1px dashed rgb(var(--v-theme-border-default));
  border-radius: 8px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 1.5rem;
  font-weight: 700;
}

.control-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 8px;
  padding: 10px 12px;
}

.detail-label {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  font-weight: 700;
}

.detail-value {
  color: rgb(var(--v-theme-text-primary));
  font-size: 0.9rem;
  font-weight: 600;
}

@media (max-width: 1260px) {
  .dashboard-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .dashboard-controls {
    position: static;
  }
}

@media (max-width: 760px) {
  .fleet-grid {
    grid-template-columns: 1fr;
  }
}
</style>
