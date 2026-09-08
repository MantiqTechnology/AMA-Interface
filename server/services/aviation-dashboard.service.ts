import type Database from 'better-sqlite3';
import type {
  AircraftUtilizationRow,
  AviationDashboardTone,
  AviationDashboardMeta,
  AviationDashboardOperationType,
  AviationManagementDashboardDto,
  AviationManagementDashboardQuery,
  AviationOperationsDashboardDto,
  AviationOperationsDashboardQuery,
  DashboardDeltaMetric,
  DashboardBlockerItem,
  DashboardDataState,
  DashboardFlight,
  DashboardFreshnessItem,
  DashboardInsight,
  DashboardMetric,
  DashboardPoint,
  DashboardStationOption,
  DashboardStationRow,
  ManagementTrendPoint,
  OperationsAttentionItem,
  ReadinessDomain,
  RoutePerformanceRow
} from '../../shared/contracts/aviation-dashboard';
import type { NeedsMyActionItemDto } from '../../shared/contracts/flight-operations';
import type { OperationalFlightMonitorDto } from '../../shared/contracts/operations-monitoring';
import { DomainError } from '../utils/errors';
import { getApplicationNow } from '../utils/time';
import type {
  ActorContext,
  FlightOperationsVerificationService
} from './flight-operations-verification.service';
import { OperationsMonitoringService } from './operations-monitoring.service';

const TIME_ZONE = 'Asia/Jayapura' as const;
const TERMINAL = new Set(['CLOSED', 'CANCELLED']);
const ACTIVE = new Set([
  'SCHEDULED',
  'CHECK_IN_OPEN',
  'CHECK_IN_CLOSED',
  'READY_FOR_DEPARTURE',
  'IN_PROGRESS',
  'LANDED',
  'PENDING_CLOSURE'
]);

type StationRow = {
  id: string;
  code: string;
  name: string;
  hasFuel: number;
  hasHandling: number;
  lowConnectivity: number;
  active: number;
};

type FlightClassificationRow = {
  id: string;
  flightType: string;
  serviceType: string;
};

type FleetSqlRow = {
  id: string;
  registration: string;
  manufacturer: string;
  model: string;
  status: string;
  note: string | null;
  nextMaintenanceDueAt: string | null;
  updatedAt: string;
  currentStationId: string | null;
  currentStationCode: string | null;
  defectTitle: string | null;
  defectOperationalImpact: string | null;
  defectCount: number;
};

type FinanceRow = {
  currencyCode: string;
  revenue: number;
  operationalCost: number;
  grossMargin: number;
  ticketRevenue: number;
  cargoRevenue: number;
  charterRevenue: number;
  invoiced: number;
  paid: number;
};

function localDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
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

function datesBetween(from: string, to: string) {
  const dates: string[] = [];
  for (let value = from; value <= to; value = shiftDate(value, 1)) dates.push(value);
  return dates;
}

function queryHref(path: string, values: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.size ? `${path}?${search.toString()}` : path;
}

function categoryFor(flightType: string, serviceType: string): AviationDashboardOperationType {
  if (serviceType === 'MEDEVAC') return 'MEDEVAC';
  if (flightType === 'CARGO' || serviceType === 'CHARTER_CARGO') return 'CARGO';
  if (flightType === 'CHARTER' || serviceType === 'CHARTER_PASSENGER') return 'CHARTER';
  return 'SCHEDULED';
}

function percent(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : null;
}

function durationHours(flight: OperationalFlightMonitorDto) {
  const departure = flight.actualDepartureAt ?? flight.scheduledDepartureAt;
  const arrival = flight.actualArrivalAt ?? flight.scheduledArrivalAt;
  if (!departure || !arrival) return 0;
  return Math.max(0, (new Date(arrival).getTime() - new Date(departure).getTime()) / 3_600_000);
}

function metricDelta(
  metric: DashboardMetric,
  currentValue: number,
  previousValue: number | null,
  favorableDirection: DashboardDeltaMetric['favorableDirection']
): DashboardDeltaMetric {
  const rateMetric = ['COMPLETION', 'OTP', 'AVAILABILITY', 'DISPATCH_RELIABILITY'].includes(
    metric.key
  );
  const changePercent =
    previousValue === null || previousValue === 0
      ? null
      : Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 1000) / 10;
  return {
    ...metric,
    previousValue,
    changePercent,
    direction:
      previousValue === null
        ? 'NONE'
        : currentValue > previousValue
          ? 'UP'
          : currentValue < previousValue
            ? 'DOWN'
            : 'FLAT',
    favorableDirection,
    comparisonValue:
      previousValue === null || previousValue === 0
        ? null
        : rateMetric
          ? Math.round((currentValue - previousValue) * 10) / 10
          : changePercent,
    comparisonUnit: rateMetric ? 'PERCENTAGE_POINT' : 'PERCENT',
    // TODO(backend): populate from an approved KPI target configuration by period/scope.
    // No target is safer than presenting an invented operational threshold.
    target: null,
    dataState: 'FRESH'
  };
}

function dashboardFlight(flight: OperationalFlightMonitorDto): DashboardFlight {
  return {
    id: flight.id,
    flightNumber: flight.flightNumber,
    route: `${flight.originCode} → ${flight.destinationCode}`,
    scheduledDepartureAt: flight.scheduledDepartureAt,
    actualDepartureAt: flight.actualDepartureAt,
    delayMinutes: flight.delayMinutes,
    aircraftRegistration: flight.aircraftRegistration,
    currentStatus: flight.currentStatus,
    readinessPercent: flight.readinessPercent,
    urgency: flight.urgency,
    blockingReason: flight.blockingReason,
    nextAction: flight.nextAction,
    href: `/flights/${encodeURIComponent(flight.id)}`
  };
}

function readinessDomain(
  category: string
): 'AIRCRAFT' | 'CREW' | 'STATION' | 'WEATHER' | 'FUEL' | 'DOCUMENTATION' {
  if (category === 'AIRCRAFT') return 'AIRCRAFT';
  if (category === 'CREW') return 'CREW';
  if (category === 'STATION') return 'STATION';
  if (category === 'FUEL') return 'FUEL';
  return 'DOCUMENTATION';
}

function actionLabel(action: string | null | undefined, fallback = 'Review blocker') {
  const value = action?.toLowerCase() ?? '';
  if (/fuel/u.test(value)) return 'Confirm fuel';
  if (/manifest/u.test(value)) return 'Review manifest';
  if (/document|evidence|approval/u.test(value)) return 'Complete documentation';
  if (/crew|pilot|assign/u.test(value)) return 'Resolve assignment';
  if (/aircraft|maintenance|serviceab/u.test(value)) return 'Review aircraft status';
  if (/station|handling/u.test(value)) return 'Review station readiness';
  return fallback;
}

export class AviationDashboardService {
  private readonly monitoring: OperationsMonitoringService;

  constructor(
    private readonly sqlite: Database.Database,
    private readonly flightOperations: FlightOperationsVerificationService
  ) {
    this.monitoring = new OperationsMonitoringService(sqlite);
  }

  operations(
    query: AviationOperationsDashboardQuery,
    actor: ActorContext
  ): AviationOperationsDashboardDto {
    const operationDate =
      query.operationDate ?? this.latestOperationDate(query.stationId, actor.stationCodes);
    const context = this.context(
      operationDate,
      operationDate,
      query.stationId,
      query.operationType,
      actor.stationCodes
    );
    const { flights, meta, stationOptions, stations } = context;
    const flightIds = new Set(flights.map((flight) => flight.id));
    const roleActions = this.flightOperations
      .needsMyAction(actor)
      .filter((item) => flightIds.has(item.flightId));
    const actions = this.actions(roleActions, flights);
    const nonTerminal = flights.filter((flight) => !TERMINAL.has(flight.currentStatus));
    const critical = nonTerminal.filter(
      (flight) => flight.currentStatus === 'BLOCKED' || flight.urgency === 'critical'
    );
    const warning = nonTerminal.filter(
      (flight) => flight.urgency === 'warning' && flight.currentStatus !== 'BLOCKED'
    );
    const constraints = nonTerminal.filter(
      (flight) => flight.readinessRequiredChecks > 0 && flight.readinessPercent < 100
    );
    const stable = nonTerminal.filter((flight) => flight.urgency === 'normal');
    const attentionItems = [...critical, ...warning]
      .sort(
        (left, right) =>
          (left.currentStatus === 'BLOCKED' ? 0 : left.urgency === 'critical' ? 1 : 2) -
            (right.currentStatus === 'BLOCKED' ? 0 : right.urgency === 'critical' ? 1 : 2) ||
          String(left.scheduledDepartureAt).localeCompare(String(right.scheduledDepartureAt))
      )
      .map((flight) => this.flightAttention(flight))
      .slice(0, 3);
    const primary = attentionItems[0] ?? null;

    const selected =
      flights.find((flight) => flight.id === query.selectedFlightId) ??
      flights
        .slice()
        .sort(
          (left, right) =>
            (left.urgency === 'critical' ? 0 : left.urgency === 'warning' ? 1 : 2) -
              (right.urgency === 'critical' ? 0 : right.urgency === 'warning' ? 1 : 2) ||
            String(left.scheduledDepartureAt).localeCompare(String(right.scheduledDepartureAt))
        )[0] ??
      null;

    const readiness = this.readiness(flights);
    const fleet = this.fleet(query.stationId, actor.stationCodes, flights);
    const availableFleet = fleet.filter((aircraft) => aircraft.status === 'Available').length;
    const limitedFleet = fleet.filter(
      (aircraft) => aircraft.status === 'Limited' || aircraft.status === 'Maintenance'
    ).length;
    const aogFleet = fleet.filter((aircraft) => aircraft.status === 'AOG').length;
    const delayed = flights.filter(
      (flight) =>
        flight.delayMinutes > 15 &&
        (Boolean(flight.actualDepartureAt || flight.actualArrivalAt) ||
          flight.flightDate === localDate())
    );

    const metrics: DashboardMetric[] = [
      this.metric(
        'FLIGHTS',
        'Flights today',
        flights.length,
        'Flights in the selected operational scope.',
        'mdi-airplane',
        'info',
        queryHref('/flights', { dateFrom: operationDate, dateTo: operationDate })
      ),
      this.metric(
        'ACTIVE',
        'Active flights',
        flights.filter((flight) => ACTIVE.has(flight.currentStatus)).length,
        'Scheduled through pending closure.',
        'mdi-play',
        'success',
        '/ops/flight-following'
      ),
      this.metric(
        'BLOCKED',
        'Blocked / critical',
        critical.length,
        'Flights requiring operational intervention.',
        'mdi-alert-circle',
        critical.length ? 'danger' : 'success',
        queryHref('/flights', { dateFrom: operationDate, dateTo: operationDate, attention: 'true' })
      ),
      this.metric(
        'DELAYED',
        'Delayed > 15m',
        delayed.length,
        'Actual departure or arrival delay over 15 minutes.',
        'mdi-clock-alert-outline',
        delayed.length ? 'warning' : 'success',
        queryHref('/flights', {
          dateFrom: operationDate,
          dateTo: operationDate,
          departurePerformance: 'DELAYED'
        })
      ),
      this.metric(
        'AVAILABLE',
        'Available for assignment',
        availableFleet,
        'Serviceable aircraft in scope.',
        'mdi-airplane-check',
        'info',
        '/master-data/aircraft'
      ),
      this.metric(
        'LIMITED',
        'Dispatchable with limitation',
        limitedFleet,
        'Aircraft requiring limitation review.',
        'mdi-cog-outline',
        limitedFleet ? 'warning' : 'success',
        '/master-data/aircraft'
      )
    ];

    const readinessDomains = selected ? this.readinessDomains(selected.id, actor) : [];

    return {
      meta,
      stationOptions,
      attention: {
        counts: {
          critical: critical.length,
          warning: warning.length,
          constraints: constraints.length,
          stable: stable.length
        },
        primary,
        items: attentionItems
      },
      actions: actions.slice(0, 5),
      freshness: this.freshness(operationDate, query.stationId),
      metrics,
      readiness,
      selectedFlight: selected ? dashboardFlight(selected) : null,
      flightOptions: flights.map(dashboardFlight),
      readinessDomains,
      readinessVerdict: selected ? this.readinessVerdict(selected, actor) : null,
      fleetSummary: [
        {
          key: 'AVAILABLE',
          label: 'Available',
          value: availableFleet,
          href: '/master-data/aircraft'
        },
        { key: 'LIMITED', label: 'Limited', value: limitedFleet, href: '/master-data/aircraft' },
        { key: 'AOG', label: 'AOG', value: aogFleet, href: '/maintenance' }
      ],
      fleet,
      flightBoard: this.flightBoard(flights),
      stations: this.stationRows(stations, flights, operationDate, operationDate),
      blockers: readiness.exceptions,
      blockerItems: this.blockerItems(flights, actor)
    };
  }

  management(
    query: AviationManagementDashboardQuery,
    stationScope: readonly string[]
  ): AviationManagementDashboardDto {
    const dateTo = query.dateTo ?? localDate();
    const dateFrom = query.dateFrom ?? shiftDate(dateTo, -6);
    const current = this.context(
      dateFrom,
      dateTo,
      query.stationId,
      query.operationType,
      stationScope
    );
    const dayCount = datesBetween(dateFrom, dateTo).length;
    const comparisonDateTo = query.comparison === 'NONE' ? null : shiftDate(dateFrom, -1);
    const comparisonDateFrom =
      comparisonDateTo === null ? null : shiftDate(comparisonDateTo, -(dayCount - 1));
    const previous =
      comparisonDateFrom && comparisonDateTo
        ? this.context(
            comparisonDateFrom,
            comparisonDateTo,
            query.stationId,
            query.operationType,
            stationScope
          )
        : null;
    const fleet = this.fleet(query.stationId, stationScope, current.flights);
    const currentFinance = this.finance(current.flights);
    const previousFinance = previous ? this.finance(previous.flights) : [];
    const currentCurrency = this.singleCurrency(currentFinance)?.currencyCode ?? null;
    const previousCurrency = this.singleCurrency(previousFinance)?.currencyCode ?? null;
    const isMixedCurrency =
      currentFinance.length > 1 ||
      previousFinance.length > 1 ||
      Boolean(currentCurrency && previousCurrency && currentCurrency !== previousCurrency);
    const finance = isMixedCurrency ? null : this.singleCurrency(currentFinance);
    const priorFinance = isMixedCurrency ? null : this.singleCurrency(previousFinance);
    const operationsMetrics = this.operationsMetrics(current.flights, previous?.flights ?? null);
    const fleetMetrics = this.fleetMetrics(
      fleet,
      current.flights,
      previous?.flights ?? null,
      dayCount,
      comparisonDateFrom && comparisonDateTo
        ? datesBetween(comparisonDateFrom, comparisonDateTo).length
        : 0
    );
    const financeDataState = this.financeDataState(currentFinance);
    const financeMetrics = this.financeMetrics(
      finance,
      priorFinance,
      isMixedCurrency,
      financeDataState
    );
    const trend = this.managementTrend(current.flights, dateFrom, dateTo);
    if (!isMixedCurrency) this.applyFinanceTrend(trend, current.flights);
    const stations = this.stationRows(current.stations, current.flights, dateFrom, dateTo);
    const routes = this.routePerformance(current.flights, !isMixedCurrency);
    const aircraftUtilization = this.aircraftUtilization(current.flights, fleet);
    const safety = this.safety(
      dateFrom,
      dateTo,
      current.flights,
      current.stations,
      fleet,
      current.meta.operationType
    );
    const safetyMetrics: DashboardDeltaMetric[] = safety.map((metric) => ({
      ...this.metric(
        metric.key,
        metric.label,
        metric.value,
        'Current safety condition in the selected operational scope.',
        metric.tone === 'danger' ? 'mdi-alert-circle' : 'mdi-shield-check-outline',
        metric.tone,
        metric.href
      ),
      previousValue: null,
      changePercent: null,
      direction: 'NONE',
      favorableDirection: 'DOWN',
      comparisonValue: null,
      comparisonUnit: 'ABSOLUTE',
      target: null,
      dataState: 'FRESH'
    }));

    return {
      meta: {
        ...current.meta,
        comparisonDateFrom,
        comparisonDateTo
      },
      stationOptions: current.stationOptions,
      metricGroups: [
        {
          key: 'operations',
          label: 'Operational Performance',
          icon: 'mdi-airplane',
          metrics: operationsMetrics
        },
        {
          key: 'fleet',
          label: 'Fleet Performance',
          icon: 'mdi-airplane-settings',
          metrics: fleetMetrics
        },
        {
          key: 'safety',
          label: 'Operational Risk & Safety',
          icon: 'mdi-shield-alert-outline',
          metrics: safetyMetrics
        },
        {
          key: 'finance',
          label: 'Financial Performance',
          icon: 'mdi-database',
          metrics: financeMetrics
        }
      ],
      trend,
      revenueComposition: isMixedCurrency ? [] : this.revenueComposition(currentFinance),
      routes,
      aircraftUtilization,
      stations,
      safety,
      insights: this.insights(
        operationsMetrics,
        fleetMetrics,
        financeMetrics,
        stations,
        this.blockerPoints(current.flights),
        safety,
        dateTo
      ),
      currencyCode: finance?.currencyCode ?? currentFinance[0]?.currencyCode ?? 'IDR',
      isMixedCurrency,
      financeDataState
    };
  }

  private context(
    dateFrom: string,
    dateTo: string,
    stationId: string | undefined,
    operationType: AviationDashboardOperationType,
    stationScope: readonly string[]
  ) {
    const allStations = this.stationSqlRows();
    const stationOptions = allStations
      .filter(
        (station) =>
          station.active && (stationScope.includes('ALL') || stationScope.includes(station.code))
      )
      .map<DashboardStationOption>((station) => ({
        id: station.id,
        code: station.code,
        name: station.name
      }));
    const selected = stationId ? stationOptions.find((station) => station.id === stationId) : null;
    if (stationId && !selected) {
      throw new DomainError(
        'DASHBOARD_STATION_FORBIDDEN',
        'Station is not available in the active role scope.',
        403,
        { stationId, stationScope }
      );
    }
    let flights = this.monitoring.flightFollowing(
      { dateFrom, dateTo, stationId: selected?.id },
      stationScope
    );
    if (operationType !== 'ALL') {
      const classifications = new Map(
        this.sqlite
          .prepare(
            `SELECT flight.id, flight_type.code AS flightType, service_type.code AS serviceType
             FROM flight_operations flight
             JOIN flight_types flight_type ON flight_type.id = flight.flight_type_id
             JOIN flight_service_types service_type ON service_type.id = flight.service_type_id`
          )
          .all()
          .map((row) => {
            const value = row as FlightClassificationRow;
            return [value.id, categoryFor(value.flightType, value.serviceType)] as const;
          })
      );
      flights = flights.filter((flight) => classifications.get(flight.id) === operationType);
    }
    const scopedStationIds = new Set(stationOptions.map((station) => station.id));
    const stations = allStations.filter(
      (station) =>
        station.active &&
        scopedStationIds.has(station.id) &&
        (!selected || station.id === selected.id)
    );
    const meta: AviationDashboardMeta = {
      generatedAt: new Date().toISOString(),
      timeZone: TIME_ZONE,
      dateFrom,
      dateTo,
      stationId: selected?.id ?? null,
      stationLabel: selected ? `${selected.code} · ${selected.name}` : 'All stations in scope',
      operationType
    };
    return { flights, meta, stationOptions, stations };
  }

  private stationSqlRows() {
    return this.sqlite
      .prepare(
        `SELECT id, station_code AS code, station_name AS name,
                has_fuel_service AS hasFuel, has_handling_service AS hasHandling,
                low_connectivity_mode AS lowConnectivity, is_active AS active
         FROM stations ORDER BY station_code`
      )
      .all() as StationRow[];
  }

  private latestOperationDate(stationId: string | undefined, stationScope: readonly string[]) {
    const conditions = ['flight.flight_date <= ?'];
    const params: string[] = [localDate()];
    if (stationId) {
      conditions.push('(flight.origin_station_id = ? OR flight.destination_station_id = ?)');
      params.push(stationId, stationId);
    } else if (!stationScope.includes('ALL')) {
      if (!stationScope.length) return localDate();
      const placeholders = stationScope.map(() => '?').join(',');
      conditions.push(
        `(origin.station_code IN (${placeholders}) OR destination.station_code IN (${placeholders}))`
      );
      params.push(...stationScope, ...stationScope);
    }
    const row = this.sqlite
      .prepare(
        `SELECT MAX(flight.flight_date) AS value
         FROM flight_operations flight
         JOIN stations origin ON origin.id = flight.origin_station_id
         JOIN stations destination ON destination.id = flight.destination_station_id
         WHERE ${conditions.join(' AND ')}`
      )
      .get(...params) as { value: string | null };
    return row.value ?? localDate();
  }

  private metric(
    key: string,
    label: string,
    value: number | string,
    detail: string,
    icon: string,
    tone: DashboardMetric['tone'],
    href?: string
  ): DashboardMetric {
    return { key, label, value, detail, icon, tone, href };
  }

  private flightAttention(flight: OperationalFlightMonitorDto): OperationsAttentionItem {
    const preDepartureStates = new Set([
      'DRAFT',
      'PENDING_READINESS',
      'READY_FOR_OCC_REVIEW',
      'READY_FOR_APPROVAL',
      'APPROVED',
      'REAPPROVAL_REQUIRED',
      'SCHEDULED',
      'BLOCKED',
      'CHECK_IN_OPEN',
      'CHECK_IN_CLOSED',
      'READY_FOR_DEPARTURE'
    ]);
    const lifecycleConflict = Boolean(
      (flight.actualDepartureAt || flight.actualArrivalAt) &&
      preDepartureStates.has(flight.currentStatus)
    );
    const missedOperatingDate = Boolean(
      !flight.actualDepartureAt &&
      !flight.actualArrivalAt &&
      flight.flightDate < localDate() &&
      preDepartureStates.has(flight.currentStatus)
    );
    const requiresLifecycleReconciliation = lifecycleConflict || missedOperatingDate;
    const requiredAction = requiresLifecycleReconciliation
      ? 'Confirm the flight outcome and reconcile the current lifecycle state.'
      : (flight.nextAction ??
        (flight.currentStatus === 'BLOCKED'
          ? 'Review and resolve the active readiness blocker.'
          : 'Review readiness before the scheduled departure.'));
    const issue =
      (lifecycleConflict
        ? `Recorded departure time conflicts with the current ${flight.currentStatus.replaceAll('_', ' ')} state.`
        : missedOperatingDate
          ? `No departure was recorded and the flight remains ${flight.currentStatus.replaceAll('_', ' ')} after its operating date.`
          : flight.blockingReason) ??
      (flight.delayMinutes > 15
        ? flight.actualDepartureAt || flight.actualArrivalAt
          ? `Recorded operational timing is ${flight.delayMinutes} minutes outside schedule.`
          : `Departure is ${flight.delayMinutes} minutes past STD with no recorded departure.`
        : flight.readinessPercent < 100
          ? `${flight.readinessCompletedChecks} of ${flight.readinessRequiredChecks} required readiness checks are complete.`
          : 'A critical operational condition requires review.');
    return {
      id: flight.id,
      severity: flight.urgency === 'critical' ? 'critical' : 'warning',
      flightNumber: flight.flightNumber,
      route: `${flight.originCode} → ${flight.destinationCode}`,
      issue,
      owner: flight.currentStatus === 'BLOCKED' ? 'OCC Readiness' : 'Flight Control',
      impact: requiresLifecycleReconciliation
        ? 'Operational record requires reconciliation'
        : flight.currentStatus === 'BLOCKED'
          ? 'Potential cancellation'
          : 'Departure delay risk',
      dueAt: flight.scheduledDepartureAt,
      href: `/flights/${encodeURIComponent(flight.id)}`,
      currentState: flight.currentStatus,
      requiredAction,
      actionLabel: requiresLifecycleReconciliation
        ? 'Review flight state'
        : actionLabel(`${requiredAction} ${flight.blockingReason ?? ''}`),
      domain: null
    };
  }

  private actions(
    items: NeedsMyActionItemDto[],
    flights: OperationalFlightMonitorDto[]
  ): OperationsAttentionItem[] {
    const flightsById = new Map(flights.map((flight) => [flight.id, flight]));
    return items
      .map((item) => {
        const flight = flightsById.get(item.flightId);
        return {
          id: item.id,
          severity: item.severity === 'BLOCKING' ? ('critical' as const) : ('warning' as const),
          flightNumber: item.flightNumber,
          route: flight ? `${flight.originCode} → ${flight.destinationCode}` : 'Flight workspace',
          issue: item.reason,
          owner: `${item.responsibleRole}${item.responsibleStationCode ? ` · ${item.responsibleStationCode}` : ''}`,
          impact: item.severity === 'BLOCKING' ? 'Flight cannot progress' : 'Decision required',
          dueAt: item.scheduledDepartureAt,
          href: item.href,
          currentState: flight?.currentStatus ?? 'ACTION_REQUIRED',
          requiredAction: item.action,
          actionLabel: actionLabel(`${item.action} ${item.reason}`, 'Review decision'),
          domain: null
        };
      })
      .sort(
        (left, right) =>
          (left.severity === 'critical' ? 0 : 1) - (right.severity === 'critical' ? 0 : 1) ||
          String(left.dueAt).localeCompare(String(right.dueAt))
      );
  }

  private readiness(flights: OperationalFlightMonitorDto[]) {
    const points: DashboardPoint[] = [
      {
        key: 'READY',
        label: 'Ready',
        value: flights.filter(
          (flight) =>
            !TERMINAL.has(flight.currentStatus) &&
            flight.currentStatus !== 'BLOCKED' &&
            flight.readinessRequiredChecks > 0 &&
            flight.readinessPercent >= 100
        ).length,
        href: '/flights/readiness?readinessBand=READY'
      },
      {
        key: 'NEEDS_REVIEW',
        label: 'Needs review',
        value: flights.filter(
          (flight) =>
            !TERMINAL.has(flight.currentStatus) &&
            flight.currentStatus !== 'BLOCKED' &&
            (flight.readinessRequiredChecks === 0 || flight.readinessPercent < 100)
        ).length,
        href: '/flights/readiness?readinessBand=NEEDS_ACTION'
      },
      {
        key: 'BLOCKED',
        label: 'Blocked',
        value: flights.filter((flight) => flight.currentStatus === 'BLOCKED').length,
        href: '/flights?status=BLOCKED'
      },
      {
        key: 'COMPLETED',
        label: 'Completed',
        value: flights.filter((flight) => flight.currentStatus === 'CLOSED').length,
        href: '/flights?status=CLOSED'
      }
    ];
    const exceptions = this.blockerPoints(flights);
    return { points, exceptions };
  }

  private blockerPoints(flights: OperationalFlightMonitorDto[]): DashboardPoint[] {
    const flightIds = flights.map((flight) => flight.id);
    const categories = [
      ['AIRCRAFT', 'Aircraft', /aircraft|maintenance|serviceab|defect/iu],
      ['CREW', 'Crew', /crew|pilot|duty|licen|medical|qualification/iu],
      ['STATION', 'Station / strip', /station|handling|parking|runway|strip/iu],
      ['FUEL', 'Fuel / payload', /fuel|payload|weight|capacity/iu],
      ['DOCUMENTATION', 'Documentation', /document|manifest|approval|evidence/iu],
      ['WEATHER', 'Weather', /weather|metar|taf/iu]
    ] as const;
    if (!flightIds.length) return categories.map(([key, label]) => ({ key, label, value: 0 }));
    const placeholders = flightIds.map(() => '?').join(',');
    const rows = this.sqlite
      .prepare(
        `SELECT check_code AS code, check_name AS name, result_note AS note
         FROM flight_readiness_checks check_row
         JOIN readiness_statuses status ON status.id = check_row.status_id
         WHERE check_row.flight_id IN (${placeholders}) AND check_row.is_required = 1
           AND status.code NOT IN ('PASS', 'NOT_APPLICABLE')`
      )
      .all(...flightIds) as Array<{ code: string; name: string; note: string | null }>;
    const fallbackText = flights
      .filter((flight) => flight.blockingReason)
      .map((flight) => flight.blockingReason)
      .join(' ');
    return categories.map(([key, label, pattern]) => ({
      key,
      label,
      value:
        rows.filter((row) => pattern.test(`${row.code} ${row.name} ${row.note ?? ''}`)).length +
        (pattern.test(fallbackText) ? 1 : 0),
      href: `/flights/readiness?category=${key}`
    }));
  }

  private readinessDomains(flightId: string, actor: ActorContext): ReadinessDomain[] {
    const detail = this.flightOperations.detailForActor(flightId, actor);
    const definitions = [
      ['AIRCRAFT', 'Aircraft', ['AIRCRAFT']],
      ['CREW', 'Crew', ['CREW']],
      ['STATION', 'Station', ['STATION']],
      ['WEATHER', 'Weather', []],
      ['FUEL', 'Fuel', ['FUEL']],
      ['DOCUMENTATION', 'Documentation', ['DOCUMENTS', 'MANIFEST', 'FINANCE']]
    ] as const;
    return definitions.map(([key, label, categories]) => {
      if (key === 'WEATHER') {
        return {
          key,
          label,
          value: 'No feed',
          state: 'NOT_AVAILABLE',
          detail: 'No canonical weather or METAR integration is configured.',
          href: `/flights/${encodeURIComponent(flightId)}?tab=readiness`,
          freshness: 'DISCONNECTED'
        };
      }
      const checks = detail.readinessChecks.filter((check) =>
        (categories as readonly string[]).includes(check.category)
      );
      const blocked = checks.some((check) => check.blocking || check.effectiveStatus === 'BLOCKED');
      const watch = checks.some(
        (check) => check.effectiveStatus === 'WARNING' || check.status === 'PENDING'
      );
      const passed = checks.filter(
        (check) => check.status === 'PASS' || check.status === 'NOT_APPLICABLE'
      ).length;
      return {
        key,
        label,
        value: checks.length ? `${passed}/${checks.length}` : '—',
        state: blocked ? 'BLOCKED' : watch ? 'WATCH' : checks.length ? 'READY' : 'NOT_AVAILABLE',
        detail: blocked
          ? (checks.find((check) => check.blocking)?.resultNote ?? 'Required check is blocked.')
          : watch
            ? 'One or more checks require review.'
            : checks.length
              ? 'Required checks are complete.'
              : 'No canonical check is available.',
        href: `/flights/${encodeURIComponent(flightId)}?tab=readiness`,
        freshness: checks.length ? 'FRESH' : 'NO_DATA'
      };
    });
  }

  private readinessVerdict(flight: OperationalFlightMonitorDto, actor: ActorContext) {
    const detail = this.flightOperations.detailForActor(flight.id, actor);
    const incomplete = detail.readinessChecks
      .filter(
        (check) => check.isRequired && check.status !== 'PASS' && check.status !== 'NOT_APPLICABLE'
      )
      .sort((left, right) => Number(right.blocking) - Number(left.blocking));
    const primary = incomplete[0] ?? null;
    const blocked = flight.currentStatus === 'BLOCKED' || Boolean(primary?.blocking);
    const unavailable = flight.readinessRequiredChecks === 0;
    return {
      completionPercent: flight.readinessPercent,
      operationalRisk:
        flight.urgency === 'critical'
          ? ('CRITICAL' as const)
          : flight.urgency === 'warning'
            ? ('WARNING' as const)
            : ('NORMAL' as const),
      releaseState: blocked
        ? ('BLOCKED' as const)
        : unavailable
          ? ('UNAVAILABLE' as const)
          : incomplete.length
            ? ('CONSTRAINED' as const)
            : ('READY' as const),
      primaryBlocker: primary?.resultNote ?? primary?.checkName ?? flight.blockingReason,
      owner: primary?.ownerRole ?? (blocked ? 'Flight Control' : null),
      operationalImpact: blocked
        ? 'Departure release unavailable'
        : incomplete.length
          ? 'Departure readiness requires review'
          : null,
      requiredAction: primary?.recommendedAction ?? flight.nextAction,
      actionLabel: actionLabel(primary?.recommendedAction ?? flight.nextAction, 'Review readiness'),
      href: primary?.actionHref ?? `/flights/${encodeURIComponent(flight.id)}?tab=readiness`
    };
  }

  private blockerItems(
    flights: OperationalFlightMonitorDto[],
    actor: ActorContext
  ): DashboardBlockerItem[] {
    const candidates = flights
      .filter(
        (flight) =>
          !TERMINAL.has(flight.currentStatus) &&
          (flight.currentStatus === 'BLOCKED' ||
            flight.urgency !== 'normal' ||
            flight.readinessPercent < 100)
      )
      .slice()
      .sort(
        (left, right) =>
          (left.currentStatus === 'BLOCKED' ? 0 : left.urgency === 'critical' ? 1 : 2) -
            (right.currentStatus === 'BLOCKED' ? 0 : right.urgency === 'critical' ? 1 : 2) ||
          String(left.scheduledDepartureAt).localeCompare(String(right.scheduledDepartureAt))
      );
    const items: DashboardBlockerItem[] = [];
    for (const flight of candidates) {
      const checks = this.flightOperations
        .detailForActor(flight.id, actor)
        .readinessChecks.filter(
          (check) =>
            check.isRequired && check.status !== 'PASS' && check.status !== 'NOT_APPLICABLE'
        )
        .sort((left, right) => Number(right.blocking) - Number(left.blocking));
      for (const check of checks) {
        const domain = readinessDomain(check.category);
        items.push({
          id: `${flight.id}:${check.id}`,
          domain,
          severity: check.blocking || flight.currentStatus === 'BLOCKED' ? 'critical' : 'warning',
          flightNumber: flight.flightNumber,
          route: `${flight.originCode} → ${flight.destinationCode}`,
          issue: check.resultNote ?? check.checkName,
          owner: check.ownerRole,
          scheduledDepartureAt: flight.scheduledDepartureAt,
          impact:
            check.blocking || flight.currentStatus === 'BLOCKED'
              ? 'Departure release unavailable'
              : 'Departure readiness at risk',
          requiredAction: check.recommendedAction,
          actionLabel: actionLabel(check.recommendedAction),
          href: check.actionHref ?? `/flights/${encodeURIComponent(flight.id)}?tab=readiness`
        });
        if (items.length >= 3) return items;
      }
    }
    return items;
  }

  private freshness(operationDate: string, stationId?: string): DashboardFreshnessItem[] {
    const now = Date.now();
    const latest = (sql: string, ...params: unknown[]) => {
      const row = this.sqlite.prepare(sql).get(...params) as { value: string | null } | undefined;
      return row?.value ?? null;
    };
    const state = (
      updatedAt: string | null,
      thresholdMinutes: number,
      liveThreshold = thresholdMinutes
    ): DashboardFreshnessItem['state'] => {
      if (!updatedAt) return 'STALE';
      const age = Math.max(0, (now - new Date(updatedAt).getTime()) / 60_000);
      if (age <= liveThreshold) return 'LIVE';
      return age <= thresholdMinutes ? 'CURRENT' : 'STALE';
    };
    const operationUpdatedAt = latest(
      `SELECT MAX(updated_at) AS value FROM flight_operations WHERE flight_date = ?`,
      operationDate
    );
    const aircraftUpdatedAt = latest(`SELECT MAX(updated_at) AS value FROM aircraft`);
    const stationUpdatedAt = stationId
      ? latest(
          `SELECT MAX(updated_at) AS value FROM flight_station_tasks WHERE station_id = ?`,
          stationId
        )
      : latest(`SELECT MAX(updated_at) AS value FROM flight_station_tasks`);
    const financeUpdatedAt = latest(
      `SELECT MAX(captured_at) AS value FROM invoice_finance_snapshots`
    );
    const item = (
      key: string,
      label: string,
      legacyState: DashboardFreshnessItem['state'],
      updatedAt: string | null,
      thresholdMinutes: number | null,
      href?: string
    ): DashboardFreshnessItem => ({
      key,
      label,
      state: legacyState,
      dataState:
        legacyState === 'NOT_CONNECTED'
          ? 'DISCONNECTED'
          : !updatedAt
            ? 'NO_DATA'
            : legacyState === 'STALE'
              ? 'STALE'
              : 'FRESH',
      updatedAt,
      thresholdMinutes,
      href
    });
    return [
      item(
        'FLIGHT_OPERATIONS',
        'Flight Operations',
        state(operationUpdatedAt, 15),
        operationUpdatedAt,
        15,
        '/flights'
      ),
      item(
        'AIRCRAFT_TECHNICAL',
        'Aircraft Technical Status',
        state(aircraftUpdatedAt, 60, 15),
        aircraftUpdatedAt,
        60,
        '/master-data/aircraft'
      ),
      item(
        'STATION_REPORT',
        'Station Operational Report',
        state(stationUpdatedAt, 60, 15),
        stationUpdatedAt,
        60,
        '/flights/station-operations'
      ),
      item('WEATHER', 'Weather Data', 'NOT_CONNECTED', null, null),
      item(
        'FINANCE',
        'Finance Data',
        state(financeUpdatedAt, 1440, 60),
        financeUpdatedAt,
        1440,
        '/finance/dashboard'
      )
    ];
  }

  private fleet(
    stationId: string | undefined,
    stationScope: readonly string[],
    flights: OperationalFlightMonitorDto[] = []
  ) {
    const conditions = ['aircraft.is_active = 1'];
    const params: string[] = [];
    if (stationId) {
      conditions.push('aircraft.current_station_id = ?');
      params.push(stationId);
    } else if (!stationScope.includes('ALL')) {
      const placeholders = stationScope.map(() => '?').join(',');
      conditions.push(`station.station_code IN (${placeholders})`);
      params.push(...stationScope);
    }
    const rows = this.sqlite
      .prepare(
        `SELECT aircraft.id, aircraft.registration_number AS registration,
                aircraft.manufacturer, aircraft.model,
                aircraft.serviceability_status AS status,
                aircraft.serviceability_note AS note,
                aircraft.next_maintenance_due_at AS nextMaintenanceDueAt,
                aircraft.updated_at AS updatedAt,
                aircraft.current_station_id AS currentStationId,
                station.station_code AS currentStationCode,
                (SELECT defect.title FROM aircraft_defects defect
                 WHERE defect.aircraft_id = aircraft.id AND defect.status NOT IN ('RECTIFIED', 'CLOSED')
                 ORDER BY defect.detected_at DESC LIMIT 1) AS defectTitle,
                (SELECT defect.operational_impact FROM aircraft_defects defect
                 WHERE defect.aircraft_id = aircraft.id AND defect.status NOT IN ('RECTIFIED', 'CLOSED')
                 ORDER BY defect.detected_at DESC LIMIT 1) AS defectOperationalImpact,
                (SELECT COUNT(*) FROM aircraft_defects defect
                 WHERE defect.aircraft_id = aircraft.id AND defect.status NOT IN ('RECTIFIED', 'CLOSED')) AS defectCount
         FROM aircraft
         LEFT JOIN stations station ON station.id = aircraft.current_station_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY aircraft.registration_number`
      )
      .all(...params) as FleetSqlRow[];
    return rows.map((row) => {
      const affected = flights.find(
        (flight) => flight.aircraftId === row.id && !TERMINAL.has(flight.currentStatus)
      );
      const status =
        row.status === 'UNSERVICEABLE'
          ? ('AOG' as const)
          : row.status === 'SERVICEABLE_WITH_RESTRICTIONS'
            ? ('Limited' as const)
            : row.nextMaintenanceDueAt && row.nextMaintenanceDueAt.slice(0, 10) <= localDate()
              ? ('Maintenance' as const)
              : ('Available' as const);
      return {
        id: row.id,
        registration: row.registration,
        type: row.model || row.manufacturer,
        status,
        reason: row.defectTitle ?? row.note ?? 'No active technical restriction',
        nextAvailability: null,
        currentStation: row.currentStationCode,
        operationalEffect:
          row.defectOperationalImpact ??
          (affected
            ? `Affects ${affected.flightNumber}`
            : status === 'AOG'
              ? 'Not assignable'
              : 'No current flight impact'),
        affectedFlight: affected?.flightNumber ?? null,
        nextMaintenanceDueAt: row.nextMaintenanceDueAt,
        // TODO: Populate when a canonical estimated return-to-service field is available.
        estimatedReturnToServiceAt: null,
        href: `/master-data/aircraft/${encodeURIComponent(row.id)}`
      };
    });
  }

  private flightBoard(flights: OperationalFlightMonitorDto[]) {
    const groups = [
      {
        key: 'PLANNED',
        label: 'Planned',
        statuses: [
          'DRAFT',
          'PENDING_READINESS',
          'READY_FOR_OCC_REVIEW',
          'READY_FOR_APPROVAL',
          'APPROVED',
          'REAPPROVAL_REQUIRED',
          'SCHEDULED'
        ]
      },
      { key: 'BLOCKED', label: 'Blocked', statuses: ['BLOCKED'] },
      {
        key: 'ACTIVE',
        label: 'Active',
        statuses: ['CHECK_IN_OPEN', 'CHECK_IN_CLOSED', 'READY_FOR_DEPARTURE', 'IN_PROGRESS']
      },
      { key: 'LANDED', label: 'Landed', statuses: ['LANDED', 'PENDING_CLOSURE'] },
      { key: 'CLOSED', label: 'Closed', statuses: ['CLOSED'] },
      {
        key: 'EXCEPTION',
        label: 'Exception',
        statuses: ['CANCELLED', 'DIVERTED', 'REOPENED_FOR_CORRECTION']
      }
    ];
    return groups.map((group) => ({
      key: group.key,
      label: group.label,
      flights: flights
        .filter((flight) => group.statuses.includes(flight.currentStatus))
        .map(dashboardFlight)
    }));
  }

  private stationRows(
    stations: StationRow[],
    flights: OperationalFlightMonitorDto[],
    dateFrom: string,
    dateTo: string
  ): DashboardStationRow[] {
    return stations.map((station) => {
      const stationFlights = flights.filter(
        (flight) =>
          flight.originStationId === station.id || flight.destinationStationId === station.id
      );
      const completed = stationFlights.filter((flight) => flight.currentStatus === 'CLOSED').length;
      const departed = stationFlights.filter((flight) => flight.actualDepartureAt);
      const report = this.sqlite
        .prepare(
          `SELECT MAX(task.updated_at) AS updatedAt,
                  SUM(CASE WHEN task.status IN ('PENDING', 'IN_PROGRESS', 'REJECTED') THEN 1 ELSE 0 END) AS issues
           FROM flight_station_tasks task
           JOIN flight_operations flight ON flight.id = task.flight_id
           WHERE task.station_id = ? AND flight.flight_date BETWEEN ? AND ?`
        )
        .get(station.id, dateFrom, dateTo) as { updatedAt: string | null; issues: number | null };
      return {
        id: station.id,
        code: station.code,
        name: station.name,
        flights: stationFlights.length,
        completionPercent: percent(completed, stationFlights.length),
        onTimePercent: percent(
          departed.filter((flight) => flight.delayMinutes <= 15).length,
          departed.length
        ),
        averageTurnaroundMinutes: null,
        fuel: station.hasFuel ? 'Available' : 'Unavailable',
        handling: station.hasHandling ? 'Available' : 'Unavailable',
        weather: 'NOT_CONNECTED',
        lastReportAt: report.updatedAt,
        issues:
          Number(report.issues ?? 0) +
          stationFlights.filter(
            (flight) => flight.currentStatus === 'BLOCKED' || flight.readinessPercent < 100
          ).length,
        href: queryHref('/flights/station-operations', { stationCode: station.code, date: dateTo })
      };
    });
  }

  private operationsMetrics(
    flights: OperationalFlightMonitorDto[],
    previous: OperationalFlightMonitorDto[] | null
  ) {
    const values = this.operationValues(flights);
    const prior = previous ? this.operationValues(previous) : null;
    return [
      metricDelta(
        this.metric(
          'SCHEDULED',
          'Scheduled flights',
          values.scheduled,
          'All flights in the selected cohort.',
          'mdi-calendar-clock',
          'info',
          '/flights'
        ),
        values.scheduled,
        prior?.scheduled ?? null,
        'UP'
      ),
      metricDelta(
        this.metric(
          'COMPLETED',
          'Completed flights',
          values.completed,
          'Flights with CLOSED status.',
          'mdi-check-circle-outline',
          'success',
          '/flights?status=CLOSED'
        ),
        values.completed,
        prior?.completed ?? null,
        'UP'
      ),
      metricDelta(
        this.metric(
          'COMPLETION',
          'Completion factor',
          values.completion === null ? '—' : `${values.completion}%`,
          'Completed flights divided by scheduled flights.',
          'mdi-chart-donut',
          values.completion !== null && values.completion >= 90 ? 'success' : 'warning',
          '/flights'
        ),
        values.completion ?? 0,
        prior?.completion ?? null,
        'UP'
      ),
      metricDelta(
        this.metric(
          'OTP',
          'On-time performance',
          values.otp === null ? '—' : `${values.otp}%`,
          'Departures within 15 minutes of schedule.',
          'mdi-clock-check-outline',
          values.otp !== null && values.otp >= 85 ? 'success' : 'warning',
          '/flights?departed=true'
        ),
        values.otp ?? 0,
        prior?.otp ?? null,
        'UP'
      ),
      metricDelta(
        this.metric(
          'CANCELLED',
          'Cancelled',
          values.cancelled,
          'Flights with CANCELLED status.',
          'mdi-close-circle-outline',
          values.cancelled ? 'danger' : 'success',
          '/flights?status=CANCELLED'
        ),
        values.cancelled,
        prior?.cancelled ?? null,
        'DOWN'
      ),
      metricDelta(
        this.metric(
          'DIVERSION',
          'Diversions',
          values.diverted,
          'Flights with DIVERTED status.',
          'mdi-call-split',
          values.diverted ? 'warning' : 'success',
          '/flights?status=DIVERTED'
        ),
        values.diverted,
        prior?.diverted ?? null,
        'DOWN'
      )
    ];
  }

  private operationValues(flights: OperationalFlightMonitorDto[]) {
    const completed = flights.filter((flight) => flight.currentStatus === 'CLOSED').length;
    const departed = flights.filter((flight) => flight.actualDepartureAt);
    return {
      scheduled: flights.length,
      completed,
      completion: percent(completed, flights.length),
      otp: percent(departed.filter((flight) => flight.delayMinutes <= 15).length, departed.length),
      cancelled: flights.filter((flight) => flight.currentStatus === 'CANCELLED').length,
      diverted: flights.filter((flight) => flight.currentStatus === 'DIVERTED').length
    };
  }

  private fleetMetrics(
    fleet: AviationOperationsDashboardDto['fleet'],
    flights: OperationalFlightMonitorDto[],
    previous: OperationalFlightMonitorDto[] | null,
    days: number,
    previousDays: number
  ) {
    const available = fleet.filter((aircraft) => aircraft.status === 'Available').length;
    const aog = fleet.filter((aircraft) => aircraft.status === 'AOG').length;
    const utilization =
      flights.reduce((sum, flight) => sum + durationHours(flight), 0) / Math.max(days, 1);
    const previousUtilization = previous
      ? previous.reduce((sum, flight) => sum + durationHours(flight), 0) / Math.max(previousDays, 1)
      : null;
    const maintenanceDelay = flights.filter(
      (flight) =>
        flight.delayMinutes > 15 &&
        /maintenance|aircraft|defect/iu.test(flight.blockingReason ?? '')
    ).length;
    const previousMaintenanceDelay =
      previous?.filter(
        (flight) =>
          flight.delayMinutes > 15 &&
          /maintenance|aircraft|defect/iu.test(flight.blockingReason ?? '')
      ).length ?? null;
    const dispatchReliability = percent(flights.length - maintenanceDelay, flights.length);
    const priorDispatchReliability = previous
      ? percent(previous.length - (previousMaintenanceDelay ?? 0), previous.length)
      : null;
    const aircraftIds = fleet.map((aircraft) => aircraft.id);
    const openDefects = aircraftIds.length
      ? Number(
          (
            this.sqlite
              .prepare(
                `SELECT COUNT(*) AS count FROM aircraft_defects
                 WHERE status NOT IN ('RECTIFIED', 'CLOSED')
                   AND aircraft_id IN (${aircraftIds.map(() => '?').join(',')})`
              )
              .get(...aircraftIds) as { count: number }
          ).count
        )
      : 0;
    return [
      metricDelta(
        this.metric(
          'AVAILABILITY',
          'Aircraft availability',
          fleet.length ? `${Math.round((available / fleet.length) * 100)}%` : '—',
          `${available} of ${fleet.length} active aircraft are available.`,
          'mdi-airplane-check',
          available === fleet.length ? 'success' : 'warning',
          '/master-data/aircraft'
        ),
        fleet.length ? Math.round((available / fleet.length) * 100) : 0,
        null,
        'UP'
      ),
      metricDelta(
        this.metric(
          'AOG',
          'AOG aircraft',
          aog,
          'Unserviceable aircraft in current scope.',
          'mdi-alert-octagon-outline',
          aog ? 'danger' : 'success',
          '/maintenance'
        ),
        aog,
        null,
        'DOWN'
      ),
      metricDelta(
        this.metric(
          'UTILIZATION',
          'Average daily utilization',
          Math.round(utilization * 10) / 10,
          'Actual or planned block hours per selected day.',
          'mdi-timer-sand',
          'info',
          '/master-data/aircraft'
        ),
        utilization,
        previousUtilization,
        'UP'
      ),
      metricDelta(
        this.metric(
          'DISPATCH_RELIABILITY',
          'Dispatch reliability',
          dispatchReliability === null ? '—' : `${dispatchReliability}%`,
          'Flights not affected by an aircraft or maintenance delay.',
          'mdi-shield-check-outline',
          dispatchReliability !== null && dispatchReliability >= 95 ? 'success' : 'warning',
          '/flights'
        ),
        dispatchReliability ?? 0,
        priorDispatchReliability,
        'UP'
      ),
      metricDelta(
        this.metric(
          'MAINTENANCE_DELAY',
          'Maintenance delay',
          maintenanceDelay,
          'Flights delayed over 15 minutes for aircraft or maintenance reasons.',
          'mdi-wrench-clock',
          maintenanceDelay ? 'warning' : 'success',
          '/maintenance'
        ),
        maintenanceDelay,
        previousMaintenanceDelay,
        'DOWN'
      ),
      metricDelta(
        this.metric(
          'OPEN_DEFECTS',
          'Open defects',
          openDefects,
          'Open or deferred aircraft defects.',
          'mdi-clipboard-alert-outline',
          openDefects ? 'warning' : 'success',
          '/maintenance/defects'
        ),
        openDefects,
        null,
        'DOWN'
      )
    ];
  }

  private financeMetrics(
    finance: FinanceRow | null,
    previous: FinanceRow | null,
    mixed: boolean,
    dataState: DashboardDataState
  ) {
    const value = (amount: number) =>
      mixed ? 'Multiple currencies' : dataState === 'NO_DATA' ? 'Data unavailable' : amount;
    const outstanding = finance ? Math.max(0, finance.invoiced - finance.paid) : 0;
    const previousOutstanding = previous ? Math.max(0, previous.invoiced - previous.paid) : null;
    return [
      metricDelta(
        this.metric(
          'REVENUE',
          'Revenue recognized',
          value(finance?.revenue ?? 0),
          'Issued invoices in scope, using captured finance values when available.',
          'mdi-chart-line',
          'success',
          '/finance/dashboard'
        ),
        finance?.revenue ?? 0,
        previous?.revenue ?? null,
        'UP'
      ),
      metricDelta(
        this.metric(
          'COST',
          'Operational cost',
          value(finance?.operationalCost ?? 0),
          'Posted fuel plus approved station and maintenance costs in scope.',
          'mdi-cash-minus',
          'info',
          '/finance/hpp'
        ),
        finance?.operationalCost ?? 0,
        previous?.operationalCost ?? null,
        'DOWN'
      ),
      metricDelta(
        this.metric(
          'MARGIN',
          'Gross margin',
          value(finance?.grossMargin ?? 0),
          'Recognized revenue less operational cost.',
          'mdi-finance',
          finance && finance.grossMargin >= 0 ? 'success' : 'danger',
          '/finance/hpp'
        ),
        finance?.grossMargin ?? 0,
        previous?.grossMargin ?? null,
        'UP'
      ),
      metricDelta(
        this.metric(
          'INVOICED',
          'Invoiced',
          value(finance?.invoiced ?? 0),
          'Non-void invoice total for flights in scope.',
          'mdi-file-document-outline',
          'info',
          '/invoices'
        ),
        finance?.invoiced ?? 0,
        previous?.invoiced ?? null,
        'UP'
      ),
      metricDelta(
        this.metric(
          'PAID',
          'Paid',
          value(finance?.paid ?? 0),
          'Payments allocated to invoices in scope.',
          'mdi-cash-check',
          'success',
          '/invoices'
        ),
        finance?.paid ?? 0,
        previous?.paid ?? null,
        'UP'
      ),
      metricDelta(
        this.metric(
          'AR',
          'Outstanding receivable',
          value(outstanding),
          'Invoiced total less recorded payments.',
          'mdi-account-cash-outline',
          outstanding ? 'warning' : 'success',
          '/invoices'
        ),
        outstanding,
        previousOutstanding,
        'DOWN'
      )
    ].map((metric) => ({ ...metric, dataState }));
  }

  private financeDataState(rows: FinanceRow[]): DashboardDataState {
    if (!rows.length) return 'NO_DATA';
    const latest = this.sqlite
      .prepare(
        `SELECT MAX(value) AS value
         FROM (
           SELECT captured_at AS value FROM invoice_finance_snapshots
           UNION ALL
           SELECT updated_at AS value FROM invoices WHERE status != 'void'
           UNION ALL
           SELECT paid_at AS value FROM payments
         )`
      )
      .get() as { value: string | null };
    if (!latest.value) return 'NO_DATA';
    const ageMinutes = Math.max(
      0,
      (new Date(getApplicationNow()).getTime() - new Date(latest.value).getTime()) / 60_000
    );
    return ageMinutes > 1440 ? 'STALE' : 'FRESH';
  }

  private finance(flights: OperationalFlightMonitorDto[]) {
    const ids = flights.map((flight) => flight.id);
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    return this.sqlite
      .prepare(
        `SELECT COALESCE(snapshot.currency_code, invoice.currency) AS currencyCode,
                SUM(COALESCE(snapshot.total_revenue, invoice.subtotal)) AS revenue,
                SUM(COALESCE(snapshot.total_operational_cost, (
                  SELECT COALESCE(SUM(request.total_cost), 0)
                  FROM flight_fuel_requests request
                  JOIN fuel_workflow_statuses status ON status.id = request.status_id AND status.code = 'POSTED'
                  JOIN currencies currency ON currency.id = request.currency_id AND currency.currency_code = invoice.currency
                  WHERE request.flight_id = invoice.flight_operation_id AND request.total_cost IS NOT NULL
                ) + (
                  SELECT COALESCE(SUM(COALESCE(cost.approved_amount, cost.actual_amount, cost.amount)), 0)
                  FROM flight_station_costs cost
                  JOIN station_cost_statuses status ON status.id = cost.status_id AND status.code = 'APPROVED'
                  JOIN currencies currency ON currency.id = COALESCE(cost.approved_currency_id, cost.currency_id)
                    AND currency.currency_code = invoice.currency
                  WHERE cost.flight_id = invoice.flight_operation_id
                ) + (
                  SELECT COALESCE(SUM(handoff.maintenance_cost), 0)
                  FROM flight_maintenance_handoffs handoff
                  JOIN maintenance_handoff_statuses status ON status.id = handoff.status_id
                    AND status.code IN ('APPROVED', 'POSTED')
                  JOIN currencies currency ON currency.id = handoff.currency_id AND currency.currency_code = invoice.currency
                  WHERE handoff.flight_id = invoice.flight_operation_id
                ))) AS operationalCost,
                SUM(COALESCE(snapshot.gross_margin, invoice.subtotal - (
                  SELECT COALESCE(SUM(request.total_cost), 0)
                  FROM flight_fuel_requests request
                  JOIN fuel_workflow_statuses status ON status.id = request.status_id AND status.code = 'POSTED'
                  JOIN currencies currency ON currency.id = request.currency_id AND currency.currency_code = invoice.currency
                  WHERE request.flight_id = invoice.flight_operation_id AND request.total_cost IS NOT NULL
                ) - (
                  SELECT COALESCE(SUM(COALESCE(cost.approved_amount, cost.actual_amount, cost.amount)), 0)
                  FROM flight_station_costs cost
                  JOIN station_cost_statuses status ON status.id = cost.status_id AND status.code = 'APPROVED'
                  JOIN currencies currency ON currency.id = COALESCE(cost.approved_currency_id, cost.currency_id)
                    AND currency.currency_code = invoice.currency
                  WHERE cost.flight_id = invoice.flight_operation_id
                ) - (
                  SELECT COALESCE(SUM(handoff.maintenance_cost), 0)
                  FROM flight_maintenance_handoffs handoff
                  JOIN maintenance_handoff_statuses status ON status.id = handoff.status_id
                    AND status.code IN ('APPROVED', 'POSTED')
                  JOIN currencies currency ON currency.id = handoff.currency_id AND currency.currency_code = invoice.currency
                  WHERE handoff.flight_id = invoice.flight_operation_id
                ))) AS grossMargin,
                SUM(COALESCE(snapshot.ticket_revenue, (
                  SELECT COALESCE(SUM(line.subtotal), 0) FROM invoice_line_items line
                  WHERE line.invoice_id = invoice.id AND line.source_type = 'PASSENGER_TICKET'
                ))) AS ticketRevenue,
                SUM(COALESCE(snapshot.cargo_revenue, (
                  SELECT COALESCE(SUM(line.subtotal), 0) FROM invoice_line_items line
                  WHERE line.invoice_id = invoice.id AND line.source_type = 'CARGO_BOOKING'
                ))) AS cargoRevenue,
                SUM(COALESCE(snapshot.charter_revenue, (
                  SELECT COALESCE(SUM(line.subtotal), 0) FROM invoice_line_items line
                  WHERE line.invoice_id = invoice.id AND line.source_type = 'CHARTER'
                ))) AS charterRevenue,
                SUM(invoice.total) AS invoiced,
                COALESCE(SUM((SELECT SUM(payment.amount) FROM payments payment WHERE payment.invoice_id = invoice.id)), 0) AS paid
         FROM invoices invoice
         LEFT JOIN invoice_finance_snapshots snapshot ON snapshot.invoice_id = invoice.id
         WHERE invoice.flight_operation_id IN (${placeholders}) AND invoice.status != 'void'
         GROUP BY COALESCE(snapshot.currency_code, invoice.currency)
         ORDER BY COALESCE(snapshot.currency_code, invoice.currency)`
      )
      .all(...ids) as FinanceRow[];
  }

  private singleCurrency(rows: FinanceRow[]) {
    return rows.length === 1 ? rows[0]! : null;
  }

  private managementTrend(
    flights: OperationalFlightMonitorDto[],
    dateFrom: string,
    dateTo: string
  ): ManagementTrendPoint[] {
    return datesBetween(dateFrom, dateTo).map((date) => {
      const dayFlights = flights.filter((flight) => flight.flightDate === date);
      const departed = dayFlights.filter((flight) => flight.actualDepartureAt);
      return {
        date,
        scheduled: dayFlights.length,
        completed: dayFlights.filter((flight) => flight.currentStatus === 'CLOSED').length,
        cancelled: dayFlights.filter((flight) => flight.currentStatus === 'CANCELLED').length,
        onTimePercent: percent(
          departed.filter((flight) => flight.delayMinutes <= 15).length,
          departed.length
        ),
        revenue: 0,
        operationalCost: 0,
        marginPercent: null,
        financialDataAvailable: false
      };
    });
  }

  private applyFinanceTrend(trend: ManagementTrendPoint[], flights: OperationalFlightMonitorDto[]) {
    const ids = flights.map((flight) => flight.id);
    if (!ids.length) return;
    const placeholders = ids.map(() => '?').join(',');
    const rows = this.sqlite
      .prepare(
        `SELECT flight.flight_date AS date,
                SUM(snapshot.total_revenue) AS revenue,
                SUM(snapshot.total_operational_cost) AS operationalCost
         FROM invoice_finance_snapshots snapshot
         JOIN flight_operations flight ON flight.id = snapshot.flight_operation_id
         WHERE snapshot.flight_operation_id IN (${placeholders})
         GROUP BY flight.flight_date`
      )
      .all(...ids) as Array<{ date: string; revenue: number; operationalCost: number }>;
    const byDate = new Map(rows.map((row) => [row.date, row]));
    for (const point of trend) {
      const row = byDate.get(point.date);
      point.revenue = Number(row?.revenue ?? 0);
      point.operationalCost = Number(row?.operationalCost ?? 0);
      point.marginPercent = percent(point.revenue - point.operationalCost, point.revenue);
      point.financialDataAvailable = Boolean(row);
    }
  }

  private revenueComposition(rows: FinanceRow[]): DashboardPoint[] {
    return [
      {
        key: 'PASSENGER',
        label: 'Passenger',
        value: rows.reduce((sum, row) => sum + Number(row.ticketRevenue), 0),
        href: '/invoices'
      },
      {
        key: 'CARGO',
        label: 'Cargo',
        value: rows.reduce((sum, row) => sum + Number(row.cargoRevenue), 0),
        href: '/invoices'
      },
      {
        key: 'CHARTER',
        label: 'Charter',
        value: rows.reduce((sum, row) => sum + Number(row.charterRevenue), 0),
        href: '/invoices'
      }
    ].filter((point) => point.value > 0);
  }

  private routePerformance(
    flights: OperationalFlightMonitorDto[],
    includeFinance: boolean
  ): RoutePerformanceRow[] {
    const financeByFlight = includeFinance
      ? this.financeByFlight(flights)
      : new Map<string, number>();
    const groups = new Map<string, OperationalFlightMonitorDto[]>();
    for (const flight of flights) {
      const group = groups.get(flight.routeCode) ?? [];
      group.push(flight);
      groups.set(flight.routeCode, group);
    }
    return Array.from(groups, ([route, rows]) => {
      const departed = rows.filter((flight) => flight.actualDepartureAt);
      return {
        route,
        flights: rows.length,
        completionPercent: percent(
          rows.filter((flight) => flight.currentStatus === 'CLOSED').length,
          rows.length
        ),
        onTimePercent: percent(
          departed.filter((flight) => flight.delayMinutes <= 15).length,
          departed.length
        ),
        averageDelayMinutes: departed.length
          ? Math.round(
              departed.reduce((sum, flight) => sum + Math.max(0, flight.delayMinutes), 0) /
                departed.length
            )
          : null,
        operationalIssues: rows.filter(
          (flight) => flight.currentStatus === 'BLOCKED' || flight.urgency !== 'normal'
        ).length,
        revenue: rows.reduce((sum, flight) => sum + (financeByFlight.get(flight.id) ?? 0), 0),
        financialDataAvailable: rows.some((flight) => financeByFlight.has(flight.id)),
        href: queryHref('/flights', { routeId: rows[0]?.routeId })
      };
    })
      .sort((left, right) => right.flights - left.flights || right.revenue - left.revenue)
      .slice(0, 6);
  }

  private financeByFlight(flights: OperationalFlightMonitorDto[]) {
    const ids = flights.map((flight) => flight.id);
    if (!ids.length) return new Map<string, number>();
    const placeholders = ids.map(() => '?').join(',');
    const rows = this.sqlite
      .prepare(
        `SELECT flight_operation_id AS flightId, SUM(total_revenue) AS revenue
         FROM invoice_finance_snapshots
         WHERE flight_operation_id IN (${placeholders})
         GROUP BY flight_operation_id`
      )
      .all(...ids) as Array<{ flightId: string; revenue: number }>;
    return new Map(rows.map((row) => [row.flightId, Number(row.revenue)]));
  }

  private aircraftUtilization(
    flights: OperationalFlightMonitorDto[],
    fleet: AviationOperationsDashboardDto['fleet']
  ): AircraftUtilizationRow[] {
    const flightIds = flights.map((flight) => flight.id);
    const hoursByAircraft = new Map<string, number>();
    if (flightIds.length) {
      const rows = this.sqlite
        .prepare(
          `SELECT flight.aircraft_id AS aircraftId, SUM(ledger.flight_hours) AS hours
           FROM aircraft_utilization_ledger ledger
           JOIN flight_operations flight ON flight.id = ledger.flight_id
           WHERE ledger.flight_id IN (${flightIds.map(() => '?').join(',')})
           GROUP BY flight.aircraft_id`
        )
        .all(...flightIds) as Array<{ aircraftId: string; hours: number }>;
      for (const row of rows) hoursByAircraft.set(row.aircraftId, Number(row.hours));
    }
    const flightsByAircraft = new Map<string, number>();
    for (const flight of flights) {
      if (flight.aircraftId) {
        flightsByAircraft.set(
          flight.aircraftId,
          (flightsByAircraft.get(flight.aircraftId) ?? 0) + 1
        );
      }
    }
    const maxHours = Math.max(0, ...fleet.map((row) => hoursByAircraft.get(row.id) ?? 0));
    return fleet
      .map((aircraft) => {
        const hours = hoursByAircraft.get(aircraft.id) ?? 0;
        return {
          registration: aircraft.registration,
          type: aircraft.type,
          flights: flightsByAircraft.get(aircraft.id) ?? 0,
          blockHours: Math.round(hours * 10) / 10,
          relativeUtilizationPercent: maxHours ? Math.round((hours / maxHours) * 100) : 0,
          // Point-in-time technical state does not provide a period availability percentage.
          // TODO(backend): derive this from historical serviceability intervals for the selected period.
          // Until then, only expose unambiguous endpoints instead of inventing a Limited percentage.
          availabilityPercent:
            aircraft.status === 'Available' ? 100 : aircraft.status === 'AOG' ? 0 : null,
          technicalState: aircraft.status,
          href: aircraft.href
        };
      })
      .sort(
        (left, right) =>
          right.blockHours - left.blockHours || left.registration.localeCompare(right.registration)
      );
  }

  private safety(
    dateFrom: string,
    dateTo: string,
    flights: OperationalFlightMonitorDto[],
    stations: StationRow[],
    fleet: AviationOperationsDashboardDto['fleet'],
    operationType: AviationDashboardOperationType
  ) {
    const flightIds = flights.map((flight) => flight.id);
    const stationIds = stations.map((station) => station.id);
    const aircraftIds =
      operationType === 'ALL'
        ? fleet.map((aircraft) => aircraft.id)
        : Array.from(
            new Set(
              flights
                .map((flight) => flight.aircraftId)
                .filter((aircraftId): aircraftId is string => Boolean(aircraftId))
            )
          );
    const reportScope: string[] = [];
    const reportParams: string[] = [];
    if (flightIds.length) {
      reportScope.push(`report.flight_operation_id IN (${flightIds.map(() => '?').join(',')})`);
      reportParams.push(...flightIds);
    }
    if (aircraftIds.length) {
      reportScope.push(`report.aircraft_id IN (${aircraftIds.map(() => '?').join(',')})`);
      reportParams.push(...aircraftIds);
    }
    if (operationType === 'ALL' && stationIds.length) {
      reportScope.push(`report.station_id IN (${stationIds.map(() => '?').join(',')})`);
      reportParams.push(...stationIds);
    }
    const reportScopeSql = reportScope.length ? `AND (${reportScope.join(' OR ')})` : 'AND 1 = 0';
    const reports = this.sqlite
      .prepare(
        `SELECT
           SUM(CASE WHEN status NOT IN ('CLOSED', 'VERIFIED') THEN 1 ELSE 0 END) AS openReports,
           SUM(CASE WHEN report_category IN ('INCIDENT', 'OCCURRENCE') THEN 1 ELSE 0 END) AS occurrences
         FROM safety_reports report
         WHERE substr(created_at, 1, 10) BETWEEN ? AND ? ${reportScopeSql}`
      )
      .get(dateFrom, dateTo, ...reportParams) as {
      openReports: number | null;
      occurrences: number | null;
    };
    const capa = this.sqlite
      .prepare(
        `SELECT
           SUM(CASE WHEN capa.status IN ('NEW', 'INVESTIGATION', 'ACTION') THEN 1 ELSE 0 END) AS openCapa,
           SUM(CASE WHEN capa.status IN ('NEW', 'INVESTIGATION', 'ACTION') AND capa.due_date < ? THEN 1 ELSE 0 END) AS overdueCapa
         FROM capa_tickets capa
         JOIN safety_reports report ON report.id = capa.source_report_id
         WHERE substr(capa.created_at, 1, 10) <= ? ${reportScopeSql}`
      )
      .get(dateTo, dateTo, ...reportParams) as {
      openCapa: number | null;
      overdueCapa: number | null;
    };
    const highRisk = flightIds.length
      ? Number(
          (
            this.sqlite
              .prepare(
                `SELECT COUNT(*) AS count FROM frat_assessments
                 WHERE substr(created_at, 1, 10) BETWEEN ? AND ?
                   AND risk_zone IN ('RED', 'HIGH')
                   AND flight_operation_id IN (${flightIds.map(() => '?').join(',')})`
              )
              .get(dateFrom, dateTo, ...flightIds) as { count: number }
          ).count
        )
      : 0;
    return [
      {
        key: 'OPEN_REPORTS',
        label: 'Open safety reports',
        value: Number(reports.openReports ?? 0),
        tone: reports.openReports ? ('warning' as const) : ('success' as const),
        href: '/sms/Reporting'
      },
      {
        key: 'OCCURRENCES',
        label: 'Incidents / occurrences',
        value: Number(reports.occurrences ?? 0),
        tone: reports.occurrences ? ('danger' as const) : ('success' as const),
        href: '/sms/SpiAnalytics'
      },
      {
        key: 'HIGH_RISK_FRAT',
        label: 'High-risk FRAT',
        value: highRisk,
        tone: highRisk ? ('danger' as const) : ('success' as const),
        href: '/sms/Frat'
      },
      {
        key: 'OPEN_CAPA',
        label: 'Open safety actions',
        value: Number(capa.openCapa ?? 0),
        tone: capa.openCapa ? ('warning' as const) : ('success' as const),
        href: '/sms/Capa'
      },
      {
        key: 'OVERDUE_CAPA',
        label: 'Overdue safety actions',
        value: Number(capa.overdueCapa ?? 0),
        tone: capa.overdueCapa ? ('danger' as const) : ('success' as const),
        href: '/sms/Capa'
      }
    ];
  }

  private insights(
    operations: DashboardDeltaMetric[],
    fleet: DashboardDeltaMetric[],
    finance: DashboardDeltaMetric[],
    stations: DashboardStationRow[],
    blockers: DashboardPoint[],
    safety: Array<{
      key: string;
      label: string;
      value: number;
      tone: AviationDashboardTone;
      href: string;
    }>,
    date: string
  ) {
    const comparable = [...operations, ...fleet, ...finance]
      .filter((metric) => metric.changePercent !== null)
      .sort(
        (left, right) => Math.abs(right.changePercent ?? 0) - Math.abs(left.changePercent ?? 0)
      );
    const insights: DashboardInsight[] = comparable.slice(0, 3).map((metric) => ({
      id: `delta-${metric.key}`,
      tone:
        metric.favorableDirection === 'NEUTRAL' || metric.direction === 'FLAT'
          ? ('info' as const)
          : metric.direction === metric.favorableDirection
            ? ('success' as const)
            : ('warning' as const),
      message: `${metric.label} ${metric.direction === 'UP' ? 'increased' : metric.direction === 'DOWN' ? 'decreased' : 'was unchanged'} by ${Math.abs(metric.comparisonValue ?? metric.changePercent ?? 0)}${metric.comparisonUnit === 'PERCENTAGE_POINT' ? ' percentage points' : '%'} versus the comparison period.`,
      date,
      href: metric.href,
      actionLabel:
        metric.key.includes('AVAIL') || metric.key.includes('AOG')
          ? 'Review fleet'
          : 'Review performance'
    }));
    const station = stations.slice().sort((left, right) => right.issues - left.issues)[0];
    if (station?.issues) {
      insights.push({
        id: `station-${station.id}`,
        tone: 'warning',
        message: `${station.code} has the highest current station attention count (${station.issues}).`,
        date,
        href: station.href,
        actionLabel: `View ${station.code}`
      });
    }
    const blocker = blockers.slice().sort((left, right) => right.value - left.value)[0];
    if (blocker?.value) {
      insights.push({
        id: `blocker-${blocker.key}`,
        tone: 'warning',
        message: `${blocker.label} is the largest observed readiness blocker group (${blocker.value}).`,
        date,
        href: blocker.href,
        actionLabel: 'Review blockers'
      });
    }
    const overdueSafety = safety.find((metric) => metric.key === 'OVERDUE_CAPA');
    if (overdueSafety?.value) {
      insights.push({
        id: 'overdue-safety-actions',
        tone: 'danger',
        message: `${overdueSafety.value} safety action${overdueSafety.value === 1 ? ' is' : 's are'} overdue and require management attention.`,
        date,
        href: overdueSafety.href,
        actionLabel: 'Open safety actions'
      });
    }
    return insights
      .sort(
        (left, right) =>
          (({ danger: 0, warning: 1, info: 2, success: 3, neutral: 4 })[left.tone] ?? 5) -
          ({ danger: 0, warning: 1, info: 2, success: 3, neutral: 4 }[right.tone] ?? 5)
      )
      .slice(0, 4);
  }
}
