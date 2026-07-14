<script setup lang="ts">
import type { ApexAxisChartSeries, ApexNonAxisChartSeries, ApexOptions } from 'apexcharts';
import type {
  FlightFuelRequestDto,
  FlightOperationOverviewDto,
  FlightOperationRecord,
  FlightRequestOverviewDto,
  FlightRequestRecord
} from '#shared/contracts/flight-operations';
import type { DashboardDto } from '#shared/contracts/operations-monitoring';
import type { AircraftDto } from '#shared/features/operations/aircraft';
import type { StationDto } from '#shared/features/operations/stations';

type OperationFilter = 'ALL' | 'SCHEDULED' | 'CHARTER' | 'CARGO' | 'MEDEVAC';
type DashboardTab = 'operations' | 'management';
type SectionKey =
  | 'kpis'
  | 'actions'
  | 'readiness'
  | 'fleet'
  | 'flightBoard'
  | 'blockers'
  | 'stations'
  | 'management';

type ActionItem = {
  id: string;
  severity: 'CRITICAL' | 'WARNING';
  title: string;
  issue: string;
  owner: string;
  to: string;
};

type FleetRow = {
  id: string;
  aircraft: string;
  registration: string;
  currentStation: string;
  status: string;
  nextAvailability: string;
};

type StationRow = {
  id: string;
  station: string;
  name: string;
  status: 'Ready' | 'Limited' | 'Blocked';
  fuel: string;
  handling: string;
  parking: string;
  alert: string;
};

const {
  data: source,
  pending,
  refresh
} = await useAsyncData('aviation-dashboard', async () => {
  const [dashboard, operations, requests, aircraft, stations, fuelRequests] = await Promise.all([
    fetchApi<DashboardDto>('/api/dashboard'),
    fetchApi<FlightOperationOverviewDto>('/api/flight-operations/flights', {
      query: { limit: 100 }
    }),
    fetchApi<FlightRequestOverviewDto>('/api/flight-operations/requests', {
      query: { limit: 100 }
    }),
    fetchApi<AircraftDto[]>('/api/master-data/aircraft', { query: { active: 'all' } }),
    fetchApi<StationDto[]>('/api/master-data/stations', { query: { active: 'all' } }),
    fetchApi<FlightFuelRequestDto[]>('/api/flight-operations/fuel')
  ]);
  return { dashboard, operations, requests, aircraft, stations, fuelRequests };
});

const selectedOperationDate = ref<Date | string | null>(null);
const selectedDate = computed(() => dateKeyFromValue(selectedOperationDate.value));
const selectedStation = ref('ALL');
const selectedOperation = ref<OperationFilter>('ALL');
const activeTab = ref<DashboardTab>('operations');
const controlPanelOpen = ref(false);

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
  { key: 'kpis', label: 'KPI Cards', hint: 'Operational workload and risk' },
  { key: 'actions', label: 'Action Queue', hint: 'Priority items for OCC' },
  { key: 'readiness', label: 'Readiness Chart', hint: 'Canonical flight readiness' },
  { key: 'fleet', label: 'Fleet Availability', hint: 'Aircraft serviceability and location' },
  { key: 'flightBoard', label: 'Flight Status Board', hint: 'Current operational lifecycle' },
  { key: 'blockers', label: 'Blocker Breakdown', hint: 'Current readiness blockers' },
  { key: 'stations', label: 'Station Matrix', hint: 'Master-data station capabilities' },
  { key: 'management', label: 'Management Overview', hint: 'Trends and commercial snapshot' }
];

const operationOptions: Array<{ title: string; value: OperationFilter }> = [
  { title: 'All Operations', value: 'ALL' },
  { title: 'Scheduled', value: 'SCHEDULED' },
  { title: 'Charter', value: 'CHARTER' },
  { title: 'Cargo', value: 'CARGO' },
  { title: 'Medevac', value: 'MEDEVAC' }
];

const stationMap = computed(
  () => new Map((source.value?.stations ?? []).map((station) => [station.id, station]))
);
const operationMap = computed(
  () => new Map((source.value?.operations.flights ?? []).map((flight) => [flight.id, flight]))
);
const selectedStationCode = computed(() =>
  selectedStation.value === 'ALL'
    ? null
    : (stationMap.value.get(selectedStation.value)?.stationCode ?? null)
);

const stationOptions = computed(() => [
  { title: 'All Stations', value: 'ALL' },
  ...(source.value?.stations ?? []).map((station) => ({
    title: `${station.stationCode} / ${station.stationName}`,
    value: station.id
  }))
]);

const filteredRequests = computed(() =>
  (source.value?.requests.requests ?? []).filter((request) => {
    const matchesDate = !selectedDate.value || request.flightDate === selectedDate.value;
    const matchesStation =
      !selectedStationCode.value ||
      request.originStationCode === selectedStationCode.value ||
      request.destinationStationCode === selectedStationCode.value;
    const matchesOperation =
      selectedOperation.value === 'ALL' || requestCategory(request) === selectedOperation.value;
    return matchesDate && matchesStation && matchesOperation;
  })
);

const filteredFlights = computed(() =>
  (source.value?.operations.flights ?? []).filter((flight) => {
    const matchesDate = !selectedDate.value || flight.flightDate === selectedDate.value;
    const matchesStation =
      selectedStation.value === 'ALL' ||
      flight.originStationId === selectedStation.value ||
      flight.destinationStationId === selectedStation.value;
    const matchesOperation =
      selectedOperation.value === 'ALL' || flightCategory(flight) === selectedOperation.value;
    return matchesDate && matchesStation && matchesOperation;
  })
);

const aircraftPool = computed(() =>
  selectedStation.value === 'ALL'
    ? (source.value?.aircraft ?? [])
    : (source.value?.aircraft ?? []).filter(
        (aircraft) => aircraft.currentStationId === selectedStation.value
      )
);

const kpis = computed(() => {
  const readyForApproval = filteredRequests.value.filter(
    (request) => request.status === 'SUBMITTED'
  ).length;
  const blockedCritical = filteredFlights.value.filter(
    (flight) => flight.currentStatus === 'BLOCKED' || flight.priority === 'EMERGENCY'
  ).length;
  const activeFlights = filteredFlights.value.filter((flight) =>
    ['SCHEDULED', 'CHECK_IN_OPEN', 'IN_PROGRESS', 'LANDED', 'PENDING_CLOSURE'].includes(
      flight.currentStatus
    )
  ).length;
  const availableAircraft = aircraftPool.value.filter(
    (aircraft) => aircraft.isActive && aircraft.serviceabilityStatus === 'SERVICEABLE'
  ).length;
  const delayedFlights = filteredFlights.value.filter((flight) => delayMinutes(flight) > 15).length;

  return [
    {
      label: 'Flight Requests',
      value: filteredRequests.value.length,
      tone: 'info',
      caption: 'Requests in selected scope'
    },
    {
      label: 'Ready for Approval',
      value: readyForApproval,
      tone: 'success',
      caption: 'Submitted requests awaiting action'
    },
    {
      label: 'Blocked / Critical',
      value: blockedCritical,
      tone: 'danger',
      caption: 'Flights requiring intervention'
    },
    {
      label: 'Active Flights',
      value: activeFlights,
      tone: 'warning',
      caption: 'Scheduled through pending closure'
    },
    {
      label: 'Aircraft Available',
      value: `${availableAircraft}/${aircraftPool.value.length}`,
      tone: 'success',
      caption: 'Serviceable aircraft in scope'
    },
    {
      label: 'Delayed Flights',
      value: delayedFlights,
      tone: delayedFlights ? 'warning' : 'success',
      caption: 'Actual departure over 15 minutes'
    }
  ];
});

const urgentActions = computed<ActionItem[]>(() => {
  const visibleIds = new Set(filteredFlights.value.map((flight) => flight.id));
  return (source.value?.dashboard.alerts ?? [])
    .filter((alert) => visibleIds.has(alert.flightOperationId))
    .slice(0, 3)
    .map((alert) => ({
      id: alert.id,
      severity: alert.severity === 'critical' ? 'CRITICAL' : 'WARNING',
      title: alert.title,
      issue: alert.message,
      owner: alert.severity === 'critical' ? 'OCC Duty Manager' : 'Flight Operations',
      to: `/flights/${alert.flightOperationId}`
    }));
});

const readinessCounts = computed(() => {
  const result = { ready: 0, warning: 0, blocked: 0, completed: 0 };
  for (const flight of filteredFlights.value) {
    if (flight.currentStatus === 'CLOSED') result.completed += 1;
    else if (flight.currentStatus === 'BLOCKED') result.blocked += 1;
    else if (flight.readinessPercent >= 100) result.ready += 1;
    else result.warning += 1;
  }
  return result;
});

const readinessChartSeries = computed<ApexNonAxisChartSeries>(() => [
  readinessCounts.value.ready,
  readinessCounts.value.warning,
  readinessCounts.value.blocked,
  readinessCounts.value.completed
]);
const readinessChartOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#27805B', '#F2B544', '#B9473B', '#286E9E'],
  dataLabels: { enabled: true },
  labels: ['Ready', 'Needs review', 'Blocked', 'Completed'],
  legend: { position: 'bottom' },
  plotOptions: {
    pie: {
      donut: {
        size: '68%',
        labels: { show: true, total: { show: true, label: 'Flights' } }
      }
    }
  },
  stroke: { width: 0 }
}));

const fleetRows = computed<FleetRow[]>(() =>
  aircraftPool.value.map((aircraft) => ({
    id: aircraft.id,
    aircraft: `${aircraft.manufacturer} ${aircraft.model}`,
    registration: aircraft.registrationNumber,
    currentStation: stationMap.value.get(aircraft.currentStationId ?? '')?.stationCode ?? '-',
    status: serviceabilityLabel(aircraft.serviceabilityStatus),
    nextAvailability: aircraft.nextMaintenanceDueAt
      ? `Maintenance ${formatDate(aircraft.nextMaintenanceDueAt)}`
      : 'Available'
  }))
);

const fleetGroups = computed(() => {
  const groups = new Map<string, Map<string, number>>();
  for (const aircraft of aircraftPool.value) {
    const family = `${aircraft.manufacturer} ${aircraft.model}`;
    const statuses = groups.get(family) ?? new Map<string, number>();
    const status = serviceabilityLabel(aircraft.serviceabilityStatus);
    statuses.set(status, (statuses.get(status) ?? 0) + 1);
    groups.set(family, statuses);
  }
  return Array.from(groups, ([aircraft, statuses]) => ({
    aircraft,
    statuses: Array.from(statuses, ([status, total]) => ({ status, total }))
  }));
});

const boardLanes = computed(() => {
  const definitions = [
    {
      status: 'PLANNED',
      label: 'Planned',
      statuses: ['DRAFT', 'PENDING_READINESS', 'READY_FOR_APPROVAL', 'APPROVED', 'SCHEDULED']
    },
    { status: 'BLOCKED', label: 'Blocked', statuses: ['BLOCKED'] },
    { status: 'ACTIVE', label: 'Active', statuses: ['CHECK_IN_OPEN', 'IN_PROGRESS'] },
    { status: 'LANDED', label: 'Landed', statuses: ['LANDED', 'PENDING_CLOSURE'] },
    {
      status: 'CLOSED',
      label: 'Closed / Exception',
      statuses: ['CLOSED', 'CANCELLED', 'DIVERTED', 'REOPENED_FOR_CORRECTION']
    }
  ];
  return definitions.map((lane) => ({
    ...lane,
    flights: filteredFlights.value.filter((flight) => lane.statuses.includes(flight.currentStatus))
  }));
});

const blockerBreakdown = computed(() => {
  const categories = [
    { label: 'Fuel confirmation', pattern: /fuel/u },
    { label: 'Crew readiness', pattern: /crew|pilot|duty|licen/u },
    { label: 'Station handling', pattern: /station|handling|parking/u },
    { label: 'Aircraft availability', pattern: /aircraft|maintenance|serviceab/u },
    { label: 'Manifest / payload', pattern: /manifest|payload|cargo|passenger/u }
  ];
  return categories.map((category) => ({
    label: category.label,
    value: filteredFlights.value.filter((flight) =>
      category.pattern.test((flight.blockingReason ?? '').toLowerCase())
    ).length
  }));
});
const blockerChartSeries = computed<ApexAxisChartSeries>(() => [
  { name: 'Issues', data: blockerBreakdown.value.map((item) => item.value) }
]);
const blockerChartOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#B9473B'],
  dataLabels: { enabled: true },
  plotOptions: { bar: { borderRadius: 4, horizontal: true, distributed: true } },
  xaxis: { categories: blockerBreakdown.value.map((item) => item.label) }
}));

const stationRows = computed<StationRow[]>(() =>
  (source.value?.stations ?? [])
    .filter((station) => selectedStation.value === 'ALL' || station.id === selectedStation.value)
    .map((station) => ({
      id: station.id,
      station: station.stationCode,
      name: station.stationName,
      status: !station.isActive ? 'Blocked' : station.lowConnectivityMode ? 'Limited' : 'Ready',
      fuel: station.hasFuelService ? 'Available' : 'Unavailable',
      handling: station.hasHandlingService ? 'Ready' : 'Unavailable',
      parking: station.hasParkingService ? 'Available' : 'Unavailable',
      alert: station.operationalNotes ?? (station.lowConnectivityMode ? 'Low connectivity' : '-')
    }))
);

const trendDates = computed(() =>
  Array.from(new Set((source.value?.operations.flights ?? []).map((flight) => flight.flightDate)))
    .sort()
    .slice(-7)
);
const completionTrendSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Scheduled',
    data: trendDates.value.map(
      (date) => (source.value?.operations.flights ?? []).filter((f) => f.flightDate === date).length
    )
  },
  {
    name: 'Completed',
    data: trendDates.value.map(
      (date) =>
        (source.value?.operations.flights ?? []).filter(
          (f) => f.flightDate === date && f.currentStatus === 'CLOSED'
        ).length
    )
  },
  {
    name: 'Cancelled',
    data: trendDates.value.map(
      (date) =>
        (source.value?.operations.flights ?? []).filter(
          (f) => f.flightDate === date && f.currentStatus === 'CANCELLED'
        ).length
    )
  }
]);
const completionTrendOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#286E9E', '#27805B', '#B9473B'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 3 },
  xaxis: { categories: trendDates.value.map(formatShortDate) }
}));

const onTimeCounts = computed(() => {
  let onTime = 0;
  let delayed = 0;
  let cancelled = 0;
  for (const flight of source.value?.operations.flights ?? []) {
    if (flight.currentStatus === 'CANCELLED') cancelled += 1;
    else if (flight.actualDepartureAt) {
      if (delayMinutes(flight) > 15) delayed += 1;
      else onTime += 1;
    }
  }
  return [onTime, delayed, cancelled];
});
const onTimeSeries = computed<ApexNonAxisChartSeries>(() => onTimeCounts.value);
const onTimeOptions: ApexOptions = {
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#27805B', '#F2B544', '#B9473B'],
  labels: ['On-time', 'Delayed', 'Cancelled'],
  legend: { position: 'bottom' },
  plotOptions: { pie: { donut: { size: '70%' } } }
};

const requestSources = computed(() => {
  const counts = new Map<string, number>();
  for (const request of source.value?.requests.requests ?? []) {
    const label = request.requestSource || 'Internal';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts, ([label, value]) => ({ label, value })).sort(
    (a, b) => b.value - a.value
  );
});
const requestSourceSeries = computed<ApexNonAxisChartSeries>(() =>
  requestSources.value.map((item) => item.value)
);
const requestSourceOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#286E9E', '#0E8C8A', '#F47A1F', '#B9473B', '#F2B544'],
  labels: requestSources.value.map((item) => item.label),
  legend: { position: 'bottom' }
}));

const delayCategories = ['Weather', 'Handling', 'Fuel', 'Crew', 'Maintenance', 'Operational'];
const delayReasonSeries = computed<ApexAxisChartSeries>(() => [
  {
    name: 'Flights',
    data: delayCategories.map(
      (category) =>
        (source.value?.operations.flights ?? []).filter((flight) =>
          (flight.blockingReason ?? '').toLowerCase().includes(category.toLowerCase())
        ).length
    )
  }
]);
const delayReasonOptions: ApexOptions = {
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#F47A1F'],
  dataLabels: { enabled: false },
  plotOptions: { bar: { borderRadius: 4, horizontal: true } },
  xaxis: { categories: delayCategories }
};

const utilizationRows = computed(() =>
  (source.value?.aircraft ?? []).map((aircraft) => ({
    registration: aircraft.registrationNumber,
    hours: (source.value?.operations.flights ?? [])
      .filter((flight) => flight.aircraftId === aircraft.id)
      .reduce((total, flight) => total + flightDurationHours(flight), 0)
  }))
);
const utilizationSeries = computed<ApexAxisChartSeries>(() => [
  { name: 'Flight Hours', data: utilizationRows.value.map((row) => Number(row.hours.toFixed(1))) }
]);
const utilizationOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#0E8C8A'],
  dataLabels: { enabled: false },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '48%' } },
  xaxis: { categories: utilizationRows.value.map((row) => row.registration) }
}));

const fuelRows = computed(() => {
  const rows = new Map<string, { requested: number; confirmed: number }>();
  for (const request of source.value?.fuelRequests ?? []) {
    const station = operationMap.value.get(request.flightId)?.originStationCode ?? 'Unknown';
    const row = rows.get(station) ?? { requested: 0, confirmed: 0 };
    row.requested += request.requestedQuantityLitre;
    row.confirmed += request.actualUpliftLitre ?? request.approvedQuantityLitre ?? 0;
    rows.set(station, row);
  }
  return Array.from(rows, ([station, values]) => ({ station, ...values }));
});
const fuelSeries = computed<ApexAxisChartSeries>(() => [
  { name: 'Requested', data: fuelRows.value.map((row) => row.requested) },
  { name: 'Confirmed', data: fuelRows.value.map((row) => row.confirmed) }
]);
const fuelOptions = computed<ApexOptions>(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#286E9E', '#27805B'],
  dataLabels: { enabled: false },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '48%' } },
  xaxis: { categories: fuelRows.value.map((row) => row.station) }
}));

const routeActivity = computed(() => {
  const rows = new Map<string, { flights: number; cargo: number }>();
  for (const flight of source.value?.operations.flights ?? []) {
    const row = rows.get(flight.routeCode) ?? { flights: 0, cargo: 0 };
    row.flights += 1;
    if (flight.flightType === 'CARGO' || flight.serviceType === 'CHARTER_CARGO') row.cargo += 1;
    rows.set(flight.routeCode, row);
  }
  return Array.from(rows, ([route, values]) => ({ route, ...values })).sort(
    (a, b) => b.flights - a.flights
  );
});

const stationPerformance = computed(() =>
  (source.value?.stations ?? []).map((station) => {
    const flights = (source.value?.operations.flights ?? []).filter(
      (flight) =>
        flight.originStationId === station.id || flight.destinationStationId === station.id
    );
    return {
      station: station.stationCode,
      flights: flights.length,
      delays: flights.filter((flight) => delayMinutes(flight) > 15).length,
      issue: station.operationalNotes ?? (station.lowConnectivityMode ? 'Low connectivity' : '-')
    };
  })
);

const managementMetrics = computed(() => {
  const dashboard = source.value?.dashboard;
  return [
    { label: 'Estimated Revenue', value: money(dashboard?.finance.estimatedRevenue ?? 0) },
    { label: 'Operational Cost', value: money(dashboard?.finance.operationalCost ?? 0) },
    { label: 'Invoiced', value: money(dashboard?.finance.invoiced ?? 0) },
    { label: 'Paid', value: money(dashboard?.finance.paid ?? 0) },
    { label: 'Passenger Tickets', value: dashboard?.ticketing.passengerTickets ?? 0 },
    { label: 'Cargo Bookings', value: dashboard?.ticketing.cargoBookings ?? 0 }
  ];
});

watch(
  () => sections.management,
  (visible) => {
    if (!visible && activeTab.value === 'management') activeTab.value = 'operations';
  }
);

function requestCategory(request: FlightRequestRecord): OperationFilter {
  if (request.serviceType === 'MEDEVAC') return 'MEDEVAC';
  if (request.flightType === 'CARGO' || request.serviceType === 'CHARTER_CARGO') return 'CARGO';
  if (request.flightType === 'CHARTER') return 'CHARTER';
  return 'SCHEDULED';
}

function flightCategory(flight: FlightOperationRecord): OperationFilter {
  if (flight.serviceType === 'MEDEVAC') return 'MEDEVAC';
  if (flight.flightType === 'CARGO' || flight.serviceType === 'CHARTER_CARGO') return 'CARGO';
  if (flight.flightType === 'CHARTER') return 'CHARTER';
  return 'SCHEDULED';
}

function delayMinutes(flight: FlightOperationRecord) {
  if (!flight.scheduledDepartureAt || !flight.actualDepartureAt) return 0;
  return Math.max(
    0,
    Math.round(
      (new Date(flight.actualDepartureAt).getTime() -
        new Date(flight.scheduledDepartureAt).getTime()) /
        60_000
    )
  );
}

function flightDurationHours(flight: FlightOperationRecord) {
  if (!flight.actualDepartureAt || !flight.actualArrivalAt) return 0;
  return Math.max(
    0,
    (new Date(flight.actualArrivalAt).getTime() - new Date(flight.actualDepartureAt).getTime()) /
      3_600_000
  );
}

function dateKeyFromValue(value: Date | string | null | undefined) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(`${value.slice(0, 10)}T00:00:00+09:00`));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(`${value}T00:00:00+09:00`));
}

function formatTime(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

function serviceabilityLabel(status: string) {
  const labels: Record<string, string> = {
    SERVICEABLE: 'Available',
    SERVICEABLE_WITH_RESTRICTIONS: 'Limited',
    MAINTENANCE_DUE: 'Maintenance',
    UNSERVICEABLE: 'AOG'
  };
  return labels[status] ?? status;
}

function getStatusColor(status: string) {
  const normalized = status.toLowerCase();
  if (['ready', 'available', 'confirmed', 'closed', 'pass'].includes(normalized)) return 'success';
  if (['limited', 'warning', 'active', 'landed', 'maintenance'].includes(normalized))
    return 'warning';
  if (['blocked', 'critical', 'aog', 'unavailable'].includes(normalized)) return 'danger';
  return 'info';
}

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: source.value?.dashboard.finance.currencyCode ?? 'IDR',
    maximumFractionDigits: 0
  }).format(value);
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
          <div class="mb-4 d-flex flex-wrap align-start ga-4">
            <div>
              <h1 class="text-h4 font-weight-bold text-text-primary">PT AMA Aviation Dashboard</h1>
              <div class="mt-2 d-flex flex-wrap align-center ga-2 text-body-2 text-text-secondary">
                <span>{{ selectedDate ? formatDate(selectedDate) : 'All operational dates' }}</span>
                <VChip color="secondary" size="small" variant="tonal">
                  Demo Mode · Canonical Operations Data
                </VChip>
              </div>
            </div>
            <VSpacer />
            <VBtn
              aria-label="Refresh dashboard"
              icon="mdi-refresh"
              :loading="pending"
              variant="text"
              @click="refresh"
            />
            <VBtn
              color="primary"
              prepend-icon="mdi-tune-vertical"
              variant="tonal"
              @click="controlPanelOpen = true"
            >
              View Controls
            </VBtn>
          </div>

          <VCard border>
            <VCardText>
              <VRow density="compact">
                <VCol cols="12" md="4">
                  <VDateInput
                    v-model="selectedOperationDate"
                    clearable
                    density="comfortable"
                    hide-details
                    label="Operation date"
                    prepend-icon=""
                    prepend-inner-icon="mdi-calendar"
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
                    label="Operation type"
                    variant="outlined"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </section>

        <VTabs v-model="activeTab" class="mb-4" color="primary">
          <VTab value="operations">Operations Overview</VTab>
          <VTab v-if="sections.management" value="management">Management Overview</VTab>
        </VTabs>

        <VWindow v-model="activeTab">
          <VWindowItem value="operations">
            <VRow v-if="sections.kpis" class="mb-2">
              <VCol v-for="kpi in kpis" :key="kpi.label" cols="12" sm="6" xl="2">
                <VCard border class="h-100">
                  <VCardText>
                    <div class="text-caption font-weight-bold text-uppercase text-text-secondary">
                      {{ kpi.label }}
                    </div>
                    <div class="mt-3 text-h4 font-weight-bold" :class="`text-${kpi.tone}`">
                      {{ kpi.value }}
                    </div>
                    <div class="mt-2 text-body-2 text-text-secondary">{{ kpi.caption }}</div>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>

            <VCard v-if="sections.actions" border class="mb-4 priority-panel">
              <VCardTitle class="d-flex flex-wrap align-center ga-3 text-text-primary">
                ACTION REQUIRED
                <VChip color="danger" size="small" variant="tonal">OCC Priority</VChip>
              </VCardTitle>
              <VCardText>
                <VRow v-if="urgentActions.length">
                  <VCol v-for="item in urgentActions" :key="item.id" cols="12" lg="4">
                    <div
                      class="action-row h-100"
                      :class="`action-row--${item.severity.toLowerCase()}`"
                    >
                      <div class="mb-3 d-flex flex-wrap align-center ga-2">
                        <VChip
                          :color="item.severity === 'CRITICAL' ? 'danger' : 'warning'"
                          size="small"
                          variant="flat"
                        >
                          {{ item.severity }}
                        </VChip>
                        <span class="text-body-2 font-weight-bold text-text-primary">
                          {{ item.title }}
                        </span>
                      </div>
                      <div class="text-body-2 text-text-primary">{{ item.issue }}</div>
                      <div class="mt-3 text-caption text-uppercase text-text-secondary">Owner</div>
                      <div class="text-body-2 font-weight-medium">{{ item.owner }}</div>
                      <VBtn
                        append-icon="mdi-arrow-right"
                        class="mt-4"
                        color="primary"
                        :to="item.to"
                        variant="tonal"
                      >
                        Open Flight
                      </VBtn>
                    </div>
                  </VCol>
                </VRow>
                <VAlert v-else color="success" variant="tonal">No operational alerts.</VAlert>
              </VCardText>
            </VCard>

            <VRow>
              <VCol v-if="sections.readiness" cols="12" xl="4">
                <VCard border class="h-100">
                  <VCardTitle>Flight Readiness</VCardTitle>
                  <VCardSubtitle>Readiness calculated from canonical flight checks.</VCardSubtitle>
                  <VCardText>
                    <FeatureApexChart
                      height="300"
                      :options="readinessChartOptions"
                      :series="readinessChartSeries"
                      type="donut"
                    />
                  </VCardText>
                </VCard>
              </VCol>

              <VCol v-if="sections.fleet" cols="12" xl="8">
                <VCard border class="h-100">
                  <VCardTitle>Fleet Availability</VCardTitle>
                  <VCardText>
                    <div class="fleet-grid mb-4">
                      <div v-for="group in fleetGroups" :key="group.aircraft" class="fleet-group">
                        <div class="font-weight-bold">{{ group.aircraft }}</div>
                        <div class="mt-3 d-flex flex-wrap ga-2">
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
                    <div class="overflow-x-auto">
                      <VTable density="compact">
                        <thead>
                          <tr>
                            <th>Aircraft</th>
                            <th>Registration</th>
                            <th>Current Station</th>
                            <th>Status</th>
                            <th>Next Availability</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in fleetRows" :key="row.id">
                            <td>{{ row.aircraft }}</td>
                            <td>{{ row.registration }}</td>
                            <td>{{ row.currentStation }}</td>
                            <td><DsStatusBadge :value="row.status" /></td>
                            <td>{{ row.nextAvailability }}</td>
                          </tr>
                        </tbody>
                      </VTable>
                    </div>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>

            <VCard v-if="sections.flightBoard" border class="my-4">
              <VCardTitle>Flight Status Board</VCardTitle>
              <VCardSubtitle>Current lifecycle state from flight operations.</VCardSubtitle>
              <VCardText>
                <div class="flight-board-grid">
                  <section v-for="lane in boardLanes" :key="lane.status" class="flight-lane">
                    <div class="mb-3 d-flex align-center justify-space-between ga-2">
                      <div class="text-body-2 font-weight-bold">{{ lane.label }}</div>
                      <VChip size="small" variant="tonal">{{ lane.flights.length }}</VChip>
                    </div>
                    <div v-if="lane.flights.length" class="d-flex flex-column ga-3">
                      <NuxtLink
                        v-for="flight in lane.flights"
                        :key="flight.id"
                        class="flight-card text-decoration-none"
                        :to="`/flights/${flight.id}`"
                      >
                        <div class="mb-2 d-flex align-center justify-space-between ga-2">
                          <span class="font-weight-bold text-text-primary">{{
                            flight.flightNumber
                          }}</span>
                          <span
                            class="status-dot"
                            :class="`status-dot--${lane.status.toLowerCase()}`"
                          />
                        </div>
                        <div class="text-body-2 font-weight-medium text-text-primary">
                          {{ flight.originStationCode }} → {{ flight.destinationStationCode }}
                        </div>
                        <div class="mt-1 text-caption text-text-secondary">
                          {{ flight.aircraftRegistration ?? 'Aircraft unassigned' }}
                        </div>
                        <VDivider class="my-3" />
                        <dl class="flight-card-meta">
                          <div>
                            <dt>Planned</dt>
                            <dd>{{ formatTime(flight.scheduledDepartureAt) }}</dd>
                          </div>
                          <div>
                            <dt>Actual</dt>
                            <dd>{{ formatTime(flight.actualDepartureAt) }}</dd>
                          </div>
                          <div>
                            <dt>Delay</dt>
                            <dd>
                              {{ delayMinutes(flight) ? `${delayMinutes(flight)} min` : '-' }}
                            </dd>
                          </div>
                          <div>
                            <dt>Readiness</dt>
                            <dd>{{ flight.readinessPercent }}%</dd>
                          </div>
                        </dl>
                      </NuxtLink>
                    </div>
                    <div v-else class="empty-lane">0</div>
                  </section>
                </div>
              </VCardText>
            </VCard>

            <VRow>
              <VCol v-if="sections.blockers" cols="12" lg="5">
                <VCard border class="h-100">
                  <VCardTitle>Current Blockers</VCardTitle>
                  <VCardSubtitle>Readiness blocker breakdown.</VCardSubtitle>
                  <VCardText>
                    <FeatureApexChart
                      height="310"
                      :options="blockerChartOptions"
                      :series="blockerChartSeries"
                      type="bar"
                    />
                  </VCardText>
                </VCard>
              </VCol>

              <VCol v-if="sections.stations" cols="12" lg="7">
                <VCard border class="h-100">
                  <VCardTitle>Station Readiness Matrix</VCardTitle>
                  <VCardSubtitle>Capabilities from canonical station master data.</VCardSubtitle>
                  <div class="overflow-x-auto">
                    <VTable density="compact">
                      <thead>
                        <tr>
                          <th>Station</th>
                          <th>Status</th>
                          <th>Fuel</th>
                          <th>Handling</th>
                          <th>Parking</th>
                          <th>Alert</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in stationRows" :key="row.id">
                          <td>
                            <strong>{{ row.station }}</strong>
                            <div class="text-caption">{{ row.name }}</div>
                          </td>
                          <td>
                            <VChip
                              :color="getStatusColor(row.status)"
                              size="small"
                              variant="tonal"
                            >
                              {{ row.status }}
                            </VChip>
                          </td>
                          <td>{{ row.fuel }}</td>
                          <td>{{ row.handling }}</td>
                          <td>{{ row.parking }}</td>
                          <td>{{ row.alert }}</td>
                        </tr>
                      </tbody>
                    </VTable>
                  </div>
                </VCard>
              </VCol>
            </VRow>
          </VWindowItem>

          <VWindowItem v-if="sections.management" value="management">
            <VRow class="mb-2">
              <VCol v-for="metric in managementMetrics" :key="metric.label" cols="12" sm="6" xl="2">
                <VCard border class="h-100">
                  <VCardText>
                    <div class="text-caption text-uppercase text-text-secondary">
                      {{ metric.label }}
                    </div>
                    <div class="mt-2 text-h6 font-weight-bold">{{ metric.value }}</div>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>
            <VRow>
              <VCol cols="12" lg="6">
                <VCard border class="h-100">
                  <VCardTitle>Flight Completion Trend</VCardTitle><VCardText>
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
                <VCard border class="h-100">
                  <VCardTitle>On-Time Performance</VCardTitle><VCardText>
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
                <VCard border class="h-100">
                  <VCardTitle>Request Source Mix</VCardTitle><VCardText>
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
                <VCard border class="h-100">
                  <VCardTitle>Delay Reason Breakdown</VCardTitle><VCardText>
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
                <VCard border class="h-100">
                  <VCardTitle>Aircraft Utilization</VCardTitle><VCardText>
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
                <VCard border class="h-100">
                  <VCardTitle>Fuel Requested vs Confirmed</VCardTitle><VCardText>
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
                <VCard border class="h-100">
                  <VCardTitle>Route Activity</VCardTitle><VTable density="compact">
                    <thead>
                      <tr>
                        <th>Route</th>
                        <th>Flights</th>
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
                <VCard border class="h-100">
                  <VCardTitle>Station Performance</VCardTitle><VTable density="compact">
                    <thead>
                      <tr>
                        <th>Station</th>
                        <th>Flights</th>
                        <th>Delay</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in stationPerformance" :key="row.station">
                        <td>{{ row.station }}</td>
                        <td>{{ row.flights }}</td>
                        <td>{{ row.delays }}</td>
                      </tr>
                    </tbody>
                  </VTable>
                </VCard>
              </VCol>
            </VRow>
          </VWindowItem>
        </VWindow>
      </main>
    </div>

    <VNavigationDrawer
      v-model="controlPanelOpen"
      border
      class="dashboard-control-drawer"
      location="right"
      :scrim="false"
      temporary
      width="360"
    >
      <div class="drawer-header">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Dashboard Controls</div>
          <div class="text-caption text-text-secondary">Show or hide dashboard sections</div>
        </div>
        <VBtn
          aria-label="Hide dashboard controls"
          icon="mdi-close"
          size="small"
          variant="text"
          @click="controlPanelOpen = false"
        />
      </div>
      <VDivider />
      <div class="drawer-content">
        <div class="d-flex flex-column ga-3">
          <div v-for="control in sectionControls" :key="control.key" class="control-row">
            <div>
              <div class="font-weight-medium">{{ control.label }}</div>
              <div class="text-caption text-text-secondary">{{ control.hint }}</div>
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
      </div>
    </VNavigationDrawer>
  </VContainer>
</template>

<style scoped>
.dashboard-shell,
.dashboard-main {
  min-width: 0;
}

.dashboard-control-drawer {
  top: 64px !important;
  height: calc(100dvh - 64px) !important;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
}

.drawer-content {
  padding: 16px;
}

.priority-panel {
  border-color: rgba(185, 71, 59, 0.32);
}

.action-row {
  height: 100%;
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

.fleet-group,
.flight-lane,
.flight-card,
.control-row {
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 8px;
}

.fleet-group {
  min-height: 96px;
  padding: 14px;
}

.flight-board-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(190px, 1fr));
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.flight-lane {
  min-height: 230px;
  padding: 12px;
  background: rgb(var(--v-theme-background));
}

.flight-card {
  display: block;
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
  margin: 0;
  color: rgb(var(--v-theme-text-primary));
  font-size: 0.78rem;
  font-weight: 600;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgb(var(--v-theme-info));
}

.status-dot--active,
.status-dot--landed {
  background: rgb(var(--v-theme-warning));
}

.status-dot--blocked {
  background: rgb(var(--v-theme-danger));
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
  padding: 10px 12px;
}

@media (max-width: 760px) {
  .fleet-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-control-drawer {
    width: min(360px, 100vw) !important;
  }
}
</style>
