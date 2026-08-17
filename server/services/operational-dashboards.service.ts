import type Database from 'better-sqlite3';
import type {
  DashboardMeta,
  DashboardMetric,
  DashboardPeriod,
  DashboardPoint,
  DashboardSeries,
  DashboardStationOption,
  FlightControlAction,
  FlightControlDashboardDto,
  OperationalDashboardQuery,
  OpsDashboardDto
} from '../../shared/contracts/operational-dashboards';
import type { OperationalFlightMonitorDto } from '../../shared/contracts/operations-monitoring';
import { DomainError } from '../utils/errors';
import { OperationsMonitoringService } from './operations-monitoring.service';

const OPERATIONAL_TIME_ZONE = 'Asia/Jayapura' as const;
const ACTIVE_STATUSES = new Set([
  'SCHEDULED',
  'CHECK_IN_OPEN',
  'CHECK_IN_CLOSED',
  'READY_FOR_DEPARTURE',
  'IN_PROGRESS',
  'LANDED'
]);
const TERMINAL_STATUSES = new Set(['CLOSED', 'CANCELLED']);

type StationRow = {
  id: string;
  code: string;
  name: string;
  hasFuel: number;
  hasHandling: number;
  hasParking: number;
  active: number;
};

type AdvisoryRow = {
  id: string;
  advisoryType: string;
  severity: 'INFO' | 'WARNING' | 'BLOCKING';
  routeId: string | null;
  stationId: string | null;
  routeOriginId: string | null;
  routeDestinationId: string | null;
  status: string;
  validFrom: string;
  validUntil: string;
  summary: string;
  limitation: string | null;
};

type WorkflowRow = { flightId: string; status: string; requestedAt?: string | null };

function localToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: OPERATIONAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function rangeFor(period: DashboardPeriod, anchorDate: string) {
  if (period === 'TODAY') return { dateFrom: anchorDate, dateTo: anchorDate };
  const anchor = new Date(`${anchorDate}T00:00:00Z`);
  if (period === 'THIS_WEEK') {
    const mondayOffset = (anchor.getUTCDay() + 6) % 7;
    const dateFrom = shiftDate(anchorDate, -mondayOffset);
    return { dateFrom, dateTo: shiftDate(dateFrom, 6) };
  }
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  return {
    dateFrom: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
    dateTo: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10)
  };
}

function datesBetween(dateFrom: string, dateTo: string) {
  const dates: string[] = [];
  for (let date = dateFrom; date <= dateTo; date = shiftDate(date, 1)) dates.push(date);
  return dates;
}

function queryHref(path: string, values: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function delayMinutes(flight: OperationalFlightMonitorDto) {
  if (!flight.actualDepartureAt || !flight.scheduledDepartureAt) return null;
  return (
    (new Date(flight.actualDepartureAt).getTime() -
      new Date(flight.scheduledDepartureAt).getTime()) /
    60_000
  );
}

function ageMinutes(value: string | null | undefined) {
  if (!value) return null;
  return Math.max(0, (Date.now() - new Date(value).getTime()) / 60_000);
}

function ageBucket(minutes: number) {
  if (minutes < 120) return 'UNDER_2H';
  if (minutes <= 360) return '2_TO_6H';
  return 'OVER_6H';
}

function countByStatus(rows: WorkflowRow[], statuses: readonly string[]) {
  return statuses.map((status) => ({
    status,
    value: rows.filter((row) => row.status === status).length
  }));
}

export class OperationalDashboardsService {
  private readonly monitoring: OperationsMonitoringService;

  constructor(private readonly sqlite: Database.Database) {
    this.monitoring = new OperationsMonitoringService(sqlite);
  }

  opsDashboard(query: OperationalDashboardQuery, stationScope: readonly string[]): OpsDashboardDto {
    const context = this.context(query, stationScope);
    const { meta, stations, flights, dateFrom, dateTo } = context;
    const flightQuery = { dateFrom, dateTo, stationId: meta.stationId };
    const activeFlights = flights.filter((flight) => ACTIVE_STATUSES.has(flight.currentStatus));
    const liveFlights = activeFlights.filter(
      (flight) => flight.position && !flight.position.isStale
    );
    const staleFlights = activeFlights.filter((flight) => flight.position?.isStale);
    const untrackedFlights = activeFlights.filter((flight) => !flight.position);
    const advisories = this.advisories(context);
    const capabilityGapCount = stations.filter(
      (station) => !station.hasFuel || !station.hasHandling || !station.hasParking
    ).length;

    const metrics: DashboardMetric[] = [
      {
        key: 'TOTAL_FLIGHTS',
        label: 'Flight dalam periode',
        value: flights.length,
        detail: 'Seluruh flight pada tanggal operasi terpilih.',
        icon: 'mdi-airplane-marker',
        tone: 'neutral',
        href: queryHref('/flights', flightQuery)
      },
      {
        key: 'ACTIVE_FLIGHTS',
        label: 'Flight aktif',
        value: activeFlights.length,
        detail: 'Scheduled sampai landed, belum terminal.',
        icon: 'mdi-radar',
        tone: activeFlights.length ? 'success' : 'neutral',
        href: queryHref('/ops/flight-following', flightQuery)
      },
      {
        key: 'LIVE_POSITIONS',
        label: 'Posisi live',
        value: liveFlights.length,
        detail: 'Position report berumur maksimum 15 menit.',
        icon: 'mdi-crosshairs-gps',
        tone: liveFlights.length ? 'success' : 'neutral',
        href: queryHref('/ops/flight-following', { ...flightQuery, tracking: 'LIVE' })
      },
      {
        key: 'STALE_POSITIONS',
        label: 'Laporan stale',
        value: staleFlights.length,
        detail: 'Position report lebih lama dari 15 menit.',
        icon: 'mdi-timer-alert-outline',
        tone: staleFlights.length ? 'warning' : 'success',
        href: queryHref('/ops/flight-following', { ...flightQuery, tracking: 'STALE' })
      },
      {
        key: 'ACTIVE_ADVISORIES',
        label: 'Advisory aktif',
        value: advisories.length,
        detail: 'Advisory aktif yang beririsan dengan periode.',
        icon: 'mdi-alert-decagram-outline',
        tone: advisories.some((item) => item.severity === 'BLOCKING')
          ? 'danger'
          : advisories.length
            ? 'warning'
            : 'success',
        href: `${queryHref('/flights/readiness', flightQuery)}#advisories`
      },
      {
        key: 'CAPABILITY_GAPS',
        label: 'Gap capability station',
        value: capabilityGapCount,
        detail: 'Station tanpa fuel, handling, atau parking.',
        icon: 'mdi-airport',
        tone: capabilityGapCount ? 'warning' : 'success',
        href: '/master-data/stations?capabilityGap=true'
      }
    ];

    const activity = this.activitySeries(flights, dateFrom, dateTo, meta.stationId);
    const trackingPoints: DashboardPoint[] = [
      ['LIVE', 'Live', liveFlights.length],
      ['STALE', 'Stale > 15 menit', staleFlights.length],
      ['UNTRACKED', 'Belum terlacak', untrackedFlights.length]
    ].map(([key, label, value]) => ({
      key: String(key),
      label: String(label),
      value: Number(value),
      href: queryHref('/ops/flight-following', { ...flightQuery, tracking: String(key) })
    }));

    const routeGroups = new Map<
      string,
      { routeId: string; routeCode: string; flights: OperationalFlightMonitorDto[] }
    >();
    for (const flight of flights) {
      const group = routeGroups.get(flight.routeId) ?? {
        routeId: flight.routeId,
        routeCode: flight.routeCode,
        flights: []
      };
      group.flights.push(flight);
      routeGroups.set(flight.routeId, group);
    }
    const routeTraffic = Array.from(routeGroups.values())
      .map((group) => {
        const eligible = group.flights
          .map(delayMinutes)
          .filter((value): value is number => value !== null);
        const onTime = eligible.filter((value) => value <= 15).length;
        return {
          key: group.routeId,
          label: group.routeCode,
          value: group.flights.length,
          secondaryValue: eligible.length ? Math.round((onTime / eligible.length) * 100) : null,
          routeId: group.routeId,
          onTimeRate: eligible.length ? Math.round((onTime / eligible.length) * 100) : null,
          eligibleDepartures: eligible.length,
          href: queryHref('/flights', { ...flightQuery, routeId: group.routeId })
        };
      })
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);

    const stationMovements = stations
      .map((station) => {
        const departures = flights.filter((flight) => flight.originStationId === station.id).length;
        const arrivals = flights.filter(
          (flight) => flight.destinationStationId === station.id
        ).length;
        return {
          key: station.id,
          label: station.code,
          value: departures + arrivals,
          stationId: station.id,
          departures,
          arrivals,
          href: queryHref('/flights', { dateFrom, dateTo, stationId: station.id })
        };
      })
      .filter((item) => item.value > 0)
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);

    const capabilityCoverage = [
      { key: 'FUEL', label: 'Fuel', field: 'hasFuel' as const },
      { key: 'HANDLING', label: 'Handling', field: 'hasHandling' as const },
      { key: 'PARKING', label: 'Parking', field: 'hasParking' as const }
    ].map((capability) => {
      const available = stations.filter((station) => station[capability.field]).length;
      return {
        key: capability.key,
        label: capability.label,
        value: available,
        secondaryValue: stations.length,
        available,
        total: stations.length,
        href: queryHref('/master-data/stations', { capability: capability.key })
      };
    });

    return {
      meta,
      stationOptions: this.stationOptions(context.scopedStations),
      metrics,
      activity: {
        title: 'Pulse jaringan penerbangan',
        description:
          'Cohort flight per tanggal operasi; closed adalah status saat dashboard dibuat.',
        source: { label: 'Flight Operations', href: queryHref('/flights', flightQuery) },
        data: activity
      },
      trackingHealth: {
        title: 'Kesehatan pelacakan',
        description: 'Ketersediaan position report untuk flight aktif di dalam periode.',
        source: {
          label: 'Flight Following',
          href: queryHref('/ops/flight-following', flightQuery)
        },
        data: trackingPoints
      },
      routeTraffic: {
        title: 'Traffic route teratas',
        description: 'Volume flight dan OTP departure untuk record yang sudah berangkat.',
        source: { label: 'Routes & Flight Operations', href: '/master-data/routes' },
        data: routeTraffic
      },
      stationMovements: {
        title: 'Movement per station',
        description: 'Keberangkatan dan kedatangan berdasarkan station pada flight order.',
        source: { label: 'Stations & Flight Operations', href: '/master-data/stations' },
        data: stationMovements
      },
      capabilityCoverage: {
        title: 'Coverage capability station',
        description: 'Capability master data; tidak menyatakan kesiapan operasional real-time.',
        source: { label: 'Station Master Data', href: '/master-data/stations' },
        data: capabilityCoverage
      },
      advisories: {
        title: 'Advisory aktif',
        description: 'Advisory aktif yang masa berlakunya beririsan dengan periode terpilih.',
        source: {
          label: 'Operational Assurance',
          href: `${queryHref('/flights/readiness', flightQuery)}#advisories`
        },
        data: advisories.map((item) => ({
          id: item.id,
          severity: item.severity,
          type: item.advisoryType,
          summary: item.summary,
          limitation: item.limitation,
          validUntil: item.validUntil,
          href: `${queryHref('/flights/readiness', flightQuery)}#advisories`
        }))
      }
    };
  }

  flightControlDashboard(
    query: OperationalDashboardQuery,
    stationScope: readonly string[]
  ): FlightControlDashboardDto {
    const context = this.context(query, stationScope);
    const { meta, flights, dateFrom, dateTo } = context;
    const baseFlightQuery = { dateFrom, dateTo, stationId: meta.stationId };
    const nonTerminal = flights.filter((flight) => !TERMINAL_STATUSES.has(flight.currentStatus));
    const blocked = flights.filter((flight) => flight.currentStatus === 'BLOCKED');
    const needsAction = nonTerminal.filter(
      (flight) =>
        flight.currentStatus === 'BLOCKED' ||
        (flight.readinessRequiredChecks > 0 && flight.readinessPercent < 100) ||
        flight.currentStatus === 'PENDING_CLOSURE'
    );
    const readyApproval = flights.filter((flight) =>
      ['READY_FOR_OCC_REVIEW', 'READY_FOR_APPROVAL'].includes(flight.currentStatus)
    );
    const departed = flights.filter((flight) => flight.actualDepartureAt);
    const pendingClosure = flights.filter((flight) => flight.currentStatus === 'PENDING_CLOSURE');
    const delays = departed.map(delayMinutes).filter((value): value is number => value !== null);
    const onTimeCount = delays.filter((value) => value <= 15).length;
    const onTimeRate = delays.length ? Math.round((onTimeCount / delays.length) * 100) : null;

    const metrics: DashboardMetric[] = [
      {
        key: 'NEEDS_ACTION',
        label: 'Perlu tindakan',
        value: needsAction.length,
        detail: 'Flight non-terminal dengan blocker, readiness, atau closure terbuka.',
        icon: 'mdi-alert-circle-outline',
        tone: needsAction.length ? 'warning' : 'success',
        href: queryHref('/flights', { ...baseFlightQuery, attention: 'true' })
      },
      {
        key: 'BLOCKED',
        label: 'Blocked',
        value: blocked.length,
        detail: 'Flight dengan current status BLOCKED.',
        icon: 'mdi-alert-octagon-outline',
        tone: blocked.length ? 'danger' : 'success',
        href: queryHref('/flights', { ...baseFlightQuery, status: 'BLOCKED' })
      },
      {
        key: 'READY_APPROVAL',
        label: 'Siap approval',
        value: readyApproval.length,
        detail: 'Menunggu review atau approval OCC.',
        icon: 'mdi-check-decagram-outline',
        tone: readyApproval.length ? 'warning' : 'neutral',
        href: queryHref('/flights/readiness', baseFlightQuery)
      },
      {
        key: 'DEPARTED',
        label: 'Keberangkatan aktual',
        value: departed.length,
        detail: 'Flight dalam cohort yang memiliki actual departure.',
        icon: 'mdi-airplane-takeoff',
        tone: 'neutral',
        href: queryHref('/flights', { ...baseFlightQuery, departed: 'true' })
      },
      {
        key: 'PENDING_CLOSURE',
        label: 'Pending closure',
        value: pendingClosure.length,
        detail: 'Flight menunggu penyelesaian closure.',
        icon: 'mdi-lock-clock-outline',
        tone: pendingClosure.length ? 'warning' : 'success',
        href: queryHref('/flights', { ...baseFlightQuery, status: 'PENDING_CLOSURE' })
      },
      {
        key: 'OTP',
        label: 'OTP departure',
        value: onTimeRate === null ? '—' : `${onTimeRate}%`,
        detail: `${delays.length} flight eligible; batas keterlambatan 15 menit.`,
        icon: 'mdi-clock-check-outline',
        tone:
          onTimeRate === null
            ? 'neutral'
            : onTimeRate >= 85
              ? 'success'
              : onTimeRate >= 70
                ? 'warning'
                : 'danger',
        href: queryHref('/flights', { ...baseFlightQuery, departed: 'true' })
      }
    ];

    const lifecycleDefinitions = [
      {
        key: 'PLANNING',
        label: 'Planning',
        statuses: [
          'DRAFT',
          'PENDING_READINESS',
          'READY_FOR_OCC_REVIEW',
          'READY_FOR_APPROVAL',
          'APPROVED',
          'REAPPROVAL_REQUIRED'
        ]
      },
      { key: 'BLOCKED', label: 'Blocked', statuses: ['BLOCKED'] },
      {
        key: 'DEPARTURE',
        label: 'Departure',
        statuses: ['SCHEDULED', 'CHECK_IN_OPEN', 'CHECK_IN_CLOSED', 'READY_FOR_DEPARTURE']
      },
      { key: 'AIRBORNE', label: 'Airborne', statuses: ['IN_PROGRESS'] },
      {
        key: 'ARRIVAL',
        label: 'Arrival & closure',
        statuses: ['LANDED', 'DIVERTED', 'PENDING_CLOSURE']
      },
      {
        key: 'TERMINAL',
        label: 'Closed / cancelled',
        statuses: ['CLOSED', 'CANCELLED', 'REOPENED_FOR_CORRECTION']
      }
    ];
    const lifecycle = lifecycleDefinitions.map((group) => ({
      key: group.key,
      label: group.label,
      value: flights.filter((flight) => group.statuses.includes(flight.currentStatus)).length,
      href: queryHref('/flights', { ...baseFlightQuery, lifecycle: group.key })
    }));

    const readinessDefinitions = [
      {
        key: 'READY',
        label: 'Ready',
        predicate: (flight: OperationalFlightMonitorDto) =>
          flight.currentStatus !== 'BLOCKED' &&
          flight.readinessRequiredChecks > 0 &&
          flight.readinessPercent >= 100
      },
      {
        key: 'NEEDS_ACTION',
        label: 'Perlu tindakan',
        predicate: (flight: OperationalFlightMonitorDto) =>
          flight.currentStatus !== 'BLOCKED' &&
          flight.readinessRequiredChecks > 0 &&
          flight.readinessPercent < 100
      },
      {
        key: 'BLOCKED',
        label: 'Blocked',
        predicate: (flight: OperationalFlightMonitorDto) => flight.currentStatus === 'BLOCKED'
      },
      {
        key: 'NOT_EVALUATED',
        label: 'Belum dievaluasi',
        predicate: (flight: OperationalFlightMonitorDto) =>
          flight.currentStatus !== 'BLOCKED' && flight.readinessRequiredChecks === 0
      }
    ];
    const readiness = readinessDefinitions.map((group) => ({
      key: group.key,
      label: group.label,
      value: flights.filter(group.predicate).length,
      href: queryHref('/flights', { ...baseFlightQuery, readinessBand: group.key })
    }));

    const manifestRows = this.workflowRows('manifest', new Set(flights.map((flight) => flight.id)));
    const manifests = Array.from(
      new Map(manifestRows.map((row) => [`${row.flightId}:${row.status}`, row])).values()
    );
    const fuels = this.workflowRows(
      'fuel',
      new Set(flights.map((flight) => flight.id)),
      new Set(context.stations.map((station) => station.id))
    );
    const manifestLabels: Record<string, string> = {
      DRAFT: 'Draft',
      SUBMITTED: 'Submitted',
      APPROVED: 'Approved',
      LOCKED: 'Locked'
    };
    const fuelLabels: Record<string, string> = {
      REQUESTED: 'Requested',
      APPROVED: 'Approved',
      UPLIFTED: 'Uplifted',
      POSTED: 'Posted',
      REJECTED: 'Rejected'
    };
    const manifestWorkflow = countByStatus(manifests, Object.keys(manifestLabels)).map(
      ({ status, value }) => ({
        key: status,
        label: manifestLabels[status] ?? status,
        value,
        href: queryHref('/flights/manifest', { ...baseFlightQuery, status })
      })
    );
    const fuelWorkflow = countByStatus(fuels, Object.keys(fuelLabels)).map(({ status, value }) => ({
      key: status,
      label: fuelLabels[status] ?? status,
      value,
      href: queryHref('/flights/fuel', { ...baseFlightQuery, status })
    }));

    const approvals = this.approvalRows(new Set(flights.map((flight) => flight.id)));
    const oldestPendingApprovalByFlight = new Map<string, WorkflowRow>();
    for (const approval of approvals.filter((row) => row.status === 'PENDING')) {
      const current = oldestPendingApprovalByFlight.get(approval.flightId);
      if (!current || String(approval.requestedAt) < String(current.requestedAt)) {
        oldestPendingApprovalByFlight.set(approval.flightId, approval);
      }
    }
    const approvalAges = Array.from(oldestPendingApprovalByFlight.values())
      .map((row) => ageMinutes(row.requestedAt))
      .filter((value): value is number => value !== null);
    const closureAges = pendingClosure
      .map((flight) => ageMinutes(flight.actualArrivalAt))
      .filter((value): value is number => value !== null);
    const ageDefinitions = [
      { key: 'UNDER_2H', label: '< 2 jam' },
      { key: '2_TO_6H', label: '2–6 jam' },
      { key: 'OVER_6H', label: '> 6 jam' }
    ];
    const approvalPoints = ageDefinitions.map((bucket) => ({
      ...bucket,
      value: approvalAges.filter((value) => ageBucket(value) === bucket.key).length,
      href: queryHref('/flights', { ...baseFlightQuery, approvalAge: bucket.key })
    }));
    const closurePoints = ageDefinitions.map((bucket) => ({
      ...bucket,
      value: closureAges.filter((value) => ageBucket(value) === bucket.key).length,
      href: queryHref('/flights', {
        ...baseFlightQuery,
        status: 'PENDING_CLOSURE',
        age: bucket.key
      })
    }));

    const actions = this.flightControlActions(needsAction);
    const otpPoints: DashboardPoint[] = [
      {
        key: 'ON_TIME',
        label: 'On time',
        value: onTimeCount,
        href: queryHref('/flights', { ...baseFlightQuery, departurePerformance: 'ON_TIME' })
      },
      {
        key: 'DELAYED',
        label: 'Delayed > 15 menit',
        value: delays.length - onTimeCount,
        href: queryHref('/flights', { ...baseFlightQuery, departurePerformance: 'DELAYED' })
      }
    ];

    return {
      meta,
      stationOptions: this.stationOptions(context.scopedStations),
      metrics,
      lifecycle: {
        title: 'Lifecycle flight',
        description: 'Snapshot status flight pada cohort tanggal operasi.',
        source: { label: 'Flight Operations', href: queryHref('/flights', baseFlightQuery) },
        data: lifecycle
      },
      readiness: {
        title: 'Kesiapan flight',
        description: 'Band eksklusif berdasarkan required readiness checks.',
        source: {
          label: 'Operational Assurance',
          href: queryHref('/flights/readiness', baseFlightQuery)
        },
        data: readiness
      },
      activity: {
        title: 'Trend kendali flight',
        description: 'Planned, actual departure, dan closed per tanggal operasi.',
        source: { label: 'Flight Operations', href: queryHref('/flights', baseFlightQuery) },
        data: this.activitySeries(flights, dateFrom, dateTo, meta.stationId)
      },
      onTimePerformance: {
        title: 'On-Time Performance departure',
        description: 'Hanya flight dengan scheduled dan actual departure; batas on-time 15 menit.',
        source: {
          label: 'Actual Flight Operations',
          href: queryHref('/flights', { ...baseFlightQuery, departed: 'true' })
        },
        data: {
          points: otpPoints,
          eligibleDepartures: delays.length,
          excludedFlights: flights.length - delays.length
        }
      },
      manifestWorkflow: {
        title: 'Workflow manifest',
        description: 'Jumlah flight yang memiliki sedikitnya satu manifest pada status tersebut.',
        source: {
          label: 'Manifest Control',
          href: queryHref('/flights/manifest', baseFlightQuery)
        },
        data: manifestWorkflow
      },
      fuelWorkflow: {
        title: 'Workflow fuel',
        description: 'Jumlah fuel request berdasarkan status kanonis.',
        source: { label: 'Fuel Control', href: queryHref('/flights/fuel', baseFlightQuery) },
        data: fuelWorkflow
      },
      queueAging: {
        title: 'Umur antrean kontrol',
        description: 'Pending approval dari requested time; closure dari actual arrival.',
        source: {
          label: 'Readiness & Closure',
          href: queryHref('/flights/readiness', baseFlightQuery)
        },
        data: { approvals: approvalPoints, closures: closurePoints }
      },
      actions: {
        title: 'Prioritas kendali',
        description: 'Flight non-terminal dengan blocker atau pekerjaan yang belum selesai.',
        source: {
          label: 'Flight workspaces',
          href: queryHref('/flights', { ...baseFlightQuery, attention: 'true' })
        },
        data: actions
      }
    };
  }

  private context(query: OperationalDashboardQuery, stationScope: readonly string[]) {
    const period = query.period ?? 'THIS_WEEK';
    const anchorDate = query.anchorDate ?? localToday();
    const { dateFrom, dateTo } = rangeFor(period, anchorDate);
    const allStations = this.sqlite
      .prepare(
        `SELECT id, station_code AS code, station_name AS name,
                has_fuel_service AS hasFuel, has_handling_service AS hasHandling,
                has_parking_service AS hasParking, is_active AS active
         FROM stations ORDER BY station_code`
      )
      .all() as StationRow[];
    const scopedStations = allStations.filter(
      (station) => stationScope.includes('ALL') || stationScope.includes(station.code)
    );
    const selectedStation = query.stationId
      ? scopedStations.find((station) => station.id === query.stationId)
      : null;
    if (query.stationId && !selectedStation) {
      throw new DomainError(
        'DASHBOARD_STATION_FORBIDDEN',
        'Station tidak tersedia dalam scope role aktif.',
        403,
        { stationId: query.stationId, stationScope }
      );
    }
    const flights = this.monitoring.flightFollowing(
      { dateFrom, dateTo, stationId: selectedStation?.id },
      stationScope
    );
    const stations = selectedStation
      ? [selectedStation]
      : scopedStations.filter((station) => station.active);
    const meta: DashboardMeta = {
      generatedAt: new Date().toISOString(),
      period,
      anchorDate,
      dateFrom,
      dateTo,
      timeZone: OPERATIONAL_TIME_ZONE,
      stationId: selectedStation?.id ?? null,
      stationLabel: selectedStation
        ? `${selectedStation.code} · ${selectedStation.name}`
        : 'Semua station dalam scope'
    };
    return { meta, stations, scopedStations, flights, dateFrom, dateTo, selectedStation };
  }

  private stationOptions(stations: StationRow[]): DashboardStationOption[] {
    return stations
      .filter((station) => station.active)
      .map((station) => ({ id: station.id, code: station.code, name: station.name }));
  }

  private activitySeries(
    flights: OperationalFlightMonitorDto[],
    dateFrom: string,
    dateTo: string,
    stationId: string | null
  ): DashboardSeries[] {
    const dates = datesBetween(dateFrom, dateTo);
    const definitions = [
      {
        key: 'PLANNED',
        label: 'Direncanakan',
        matches: (flight: OperationalFlightMonitorDto) => flight.currentStatus !== 'CANCELLED'
      },
      {
        key: 'DEPARTED',
        label: 'Sudah berangkat',
        matches: (flight: OperationalFlightMonitorDto) => Boolean(flight.actualDepartureAt)
      },
      {
        key: 'CLOSED',
        label: 'Closed',
        matches: (flight: OperationalFlightMonitorDto) => flight.currentStatus === 'CLOSED'
      }
    ];
    return definitions.map((series) => ({
      key: series.key,
      label: series.label,
      points: dates.map((date) => ({
        key: date,
        label: date,
        value: flights.filter((flight) => flight.flightDate === date && series.matches(flight))
          .length,
        href: queryHref('/flights', {
          dateFrom: date,
          dateTo: date,
          stationId,
          cohort: series.key
        })
      }))
    }));
  }

  private advisories(context: ReturnType<OperationalDashboardsService['context']>) {
    const stationIds = new Set(context.stations.map((station) => station.id));
    const rows = this.sqlite
      .prepare(
        `SELECT advisory.id, advisory.advisory_type AS advisoryType,
                advisory.severity, advisory.route_id AS routeId,
                advisory.station_id AS stationId, route.origin_station_id AS routeOriginId,
                route.destination_station_id AS routeDestinationId, advisory.status,
                advisory.valid_from AS validFrom, advisory.valid_until AS validUntil,
                advisory.summary, advisory.operational_limitation AS limitation
         FROM operational_advisories advisory
         LEFT JOIN routes route ON route.id = advisory.route_id
         ORDER BY CASE advisory.severity WHEN 'BLOCKING' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,
                  advisory.valid_from DESC`
      )
      .all() as AdvisoryRow[];
    return rows.filter((row) => {
      if (row.status !== 'ACTIVE') return false;
      if (
        row.validFrom.slice(0, 10) > context.dateTo ||
        row.validUntil.slice(0, 10) < context.dateFrom
      )
        return false;
      if (row.stationId) return stationIds.has(row.stationId);
      return Boolean(
        (row.routeOriginId && stationIds.has(row.routeOriginId)) ||
        (row.routeDestinationId && stationIds.has(row.routeDestinationId))
      );
    });
  }

  private workflowRows(
    kind: 'manifest' | 'fuel',
    flightIds: Set<string>,
    stationIds?: Set<string>
  ): WorkflowRow[] {
    if (flightIds.size === 0) return [];
    const sql =
      kind === 'manifest'
        ? `SELECT manifest.flight_operation_id AS flightId, status.code AS status
         FROM flight_manifests manifest
         JOIN manifest_statuses status ON status.id = manifest.status_id`
        : `SELECT request.flight_id AS flightId, status.code AS status,
                  supplier.station_id AS stationId
         FROM flight_fuel_requests request
         JOIN fuel_suppliers supplier ON supplier.id = request.fuel_supplier_id
         JOIN fuel_workflow_statuses status ON status.id = request.status_id`;
    return (this.sqlite.prepare(sql).all() as Array<WorkflowRow & { stationId?: string }>).filter(
      (row) => flightIds.has(row.flightId) && (!stationIds || stationIds.has(String(row.stationId)))
    );
  }

  private approvalRows(flightIds: Set<string>): WorkflowRow[] {
    if (flightIds.size === 0) return [];
    return (
      this.sqlite
        .prepare(
          `SELECT approval.flight_id AS flightId, status.code AS status,
                  approval.requested_at AS requestedAt
           FROM flight_operation_approvals approval
           JOIN flight_approval_statuses status ON status.id = approval.status_id`
        )
        .all() as WorkflowRow[]
    ).filter((row) => flightIds.has(row.flightId));
  }

  private flightControlActions(flights: OperationalFlightMonitorDto[]): FlightControlAction[] {
    const severityRank = { critical: 0, warning: 1, info: 2 } as const;
    return flights
      .map((flight): FlightControlAction => {
        const isBlocked = flight.currentStatus === 'BLOCKED';
        const isClosure = flight.currentStatus === 'PENDING_CLOSURE';
        return {
          id: flight.id,
          severity: isBlocked ? 'critical' : isClosure ? 'info' : 'warning',
          flightNumber: flight.flightNumber,
          route: `${flight.originCode} → ${flight.destinationCode}`,
          issue: isBlocked
            ? (flight.blockingReason ?? 'Readiness flight masih blocked.')
            : isClosure
              ? 'Actual sudah diterima dan flight menunggu closure.'
              : `Readiness baru ${flight.readinessPercent}% dari required checks.`,
          owner: isBlocked ? 'OCC Readiness' : isClosure ? 'OCC Closure' : 'Flight Planning',
          ageMinutes:
            ageMinutes(isClosure ? flight.actualArrivalAt : flight.scheduledDepartureAt) ?? 0,
          href: `/flights/${flight.id}`
        };
      })
      .sort(
        (left, right) =>
          severityRank[left.severity] - severityRank[right.severity] ||
          right.ageMinutes - left.ageMinutes
      )
      .slice(0, 8);
  }
}
