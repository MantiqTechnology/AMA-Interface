import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year!, month! - 1, day!));
    return (
      year! >= 2000 &&
      year! <= 2100 &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month! - 1 &&
      date.getUTCDate() === day
    );
  }, 'Date must be a real calendar date between 2000 and 2100');
const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const dashboardOperationTypes = ['ALL', 'SCHEDULED', 'CHARTER', 'CARGO', 'MEDEVAC'] as const;
export type AviationDashboardOperationType = (typeof dashboardOperationTypes)[number];

export const aviationOperationsDashboardQuerySchema = z.object({
  operationDate: z.preprocess(emptyToUndefined, isoDate.optional()),
  stationId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  operationType: z.preprocess(emptyToUndefined, z.enum(dashboardOperationTypes).default('ALL')),
  selectedFlightId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional())
});

export const aviationManagementDashboardQuerySchema = z
  .object({
    dateFrom: z.preprocess(emptyToUndefined, isoDate.optional()),
    dateTo: z.preprocess(emptyToUndefined, isoDate.optional()),
    stationId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
    operationType: z.preprocess(emptyToUndefined, z.enum(dashboardOperationTypes).default('ALL')),
    comparison: z.preprocess(
      emptyToUndefined,
      z.enum(['PREVIOUS_PERIOD', 'NONE']).default('PREVIOUS_PERIOD')
    )
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    message: 'dateFrom must be on or before dateTo',
    path: ['dateFrom']
  })
  .refine(
    (value) => {
      if (!value.dateFrom || !value.dateTo) return true;
      const from = new Date(`${value.dateFrom}T00:00:00Z`).getTime();
      const to = new Date(`${value.dateTo}T00:00:00Z`).getTime();
      return (to - from) / 86_400_000 <= 365;
    },
    {
      message: 'Dashboard reporting windows cannot exceed 366 calendar days',
      path: ['dateTo']
    }
  );

export type AviationOperationsDashboardQuery = z.infer<
  typeof aviationOperationsDashboardQuerySchema
>;
export type AviationManagementDashboardQuery = z.infer<
  typeof aviationManagementDashboardQuerySchema
>;

export type AviationDashboardTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type DashboardDataState = 'FRESH' | 'STALE' | 'DISCONNECTED' | 'NO_DATA' | 'NOT_APPLICABLE';

export type AviationDashboardMeta = {
  generatedAt: string;
  timeZone: 'Asia/Jayapura';
  dateFrom: string;
  dateTo: string;
  stationId: string | null;
  stationLabel: string;
  operationType: AviationDashboardOperationType;
};

export type DashboardStationOption = { id: string; code: string; name: string };
export type DashboardLink = { label: string; href: string };

export type DashboardMetric = {
  key: string;
  label: string;
  value: number | string;
  detail: string;
  icon: string;
  tone: AviationDashboardTone;
  href?: string;
};

export type DashboardDeltaMetric = DashboardMetric & {
  previousValue: number | null;
  changePercent: number | null;
  direction: 'UP' | 'DOWN' | 'FLAT' | 'NONE';
  favorableDirection: 'UP' | 'DOWN' | 'NEUTRAL';
  comparisonValue?: number | null;
  comparisonUnit?: 'PERCENT' | 'PERCENTAGE_POINT' | 'ABSOLUTE';
  target?: { label: string; status: 'MET' | 'MISSED' | 'NOT_CONFIGURED' } | null;
  dataState?: DashboardDataState;
};

export type OperationsAttentionItem = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  flightNumber: string;
  route: string;
  issue: string;
  owner: string;
  impact: string;
  dueAt: string | null;
  href: string;
  currentState?: string;
  requiredAction?: string;
  actionLabel?: string;
  domain?: ReadinessDomain['key'] | null;
};

export type DashboardFreshnessItem = {
  key: string;
  label: string;
  state: 'LIVE' | 'CURRENT' | 'STALE' | 'NOT_CONNECTED';
  updatedAt: string | null;
  thresholdMinutes: number | null;
  href?: string;
  dataState?: DashboardDataState;
};

export type DashboardPoint = {
  key: string;
  label: string;
  value: number;
  secondaryValue?: number | null;
  href?: string;
};

export type ReadinessDomain = {
  key: 'AIRCRAFT' | 'CREW' | 'STATION' | 'WEATHER' | 'FUEL' | 'DOCUMENTATION';
  label: string;
  value: string;
  state: 'READY' | 'WATCH' | 'BLOCKED' | 'NOT_AVAILABLE';
  detail: string;
  href?: string;
  freshness?: DashboardDataState;
};

export type FlightReadinessVerdict = {
  completionPercent: number;
  operationalRisk: 'NORMAL' | 'WARNING' | 'CRITICAL';
  releaseState: 'READY' | 'CONSTRAINED' | 'BLOCKED' | 'UNAVAILABLE';
  primaryBlocker: string | null;
  owner: string | null;
  operationalImpact: string | null;
  requiredAction: string | null;
  actionLabel: string | null;
  href: string | null;
};

export type DashboardFlight = {
  id: string;
  flightNumber: string;
  route: string;
  scheduledDepartureAt: string | null;
  actualDepartureAt?: string | null;
  delayMinutes?: number;
  aircraftRegistration: string | null;
  currentStatus: string;
  readinessPercent: number;
  urgency: 'normal' | 'warning' | 'critical';
  blockingReason?: string | null;
  nextAction?: string | null;
  href: string;
};

export type DashboardFleetRow = {
  id: string;
  registration: string;
  type: string;
  status: 'Available' | 'Limited' | 'AOG' | 'Maintenance';
  reason: string;
  nextAvailability: string | null;
  currentStation?: string | null;
  operationalEffect?: string;
  affectedFlight?: string | null;
  nextMaintenanceDueAt?: string | null;
  estimatedReturnToServiceAt?: string | null;
  href: string;
};

export type DashboardStationRow = {
  id: string;
  code: string;
  name: string;
  flights: number;
  completionPercent: number | null;
  onTimePercent?: number | null;
  averageTurnaroundMinutes: number | null;
  fuel: 'Available' | 'Limited' | 'Unavailable';
  handling: 'Available' | 'Limited' | 'Unavailable';
  weather: 'NOT_CONNECTED';
  lastReportAt: string | null;
  issues: number;
  href: string;
};

export type AviationOperationsDashboardDto = {
  meta: AviationDashboardMeta;
  stationOptions: DashboardStationOption[];
  attention: {
    counts: { critical: number; warning: number; constraints: number; stable: number };
    primary: OperationsAttentionItem | null;
    items?: OperationsAttentionItem[];
  };
  actions: OperationsAttentionItem[];
  freshness: DashboardFreshnessItem[];
  metrics: DashboardMetric[];
  readiness: { points: DashboardPoint[]; exceptions: DashboardPoint[] };
  selectedFlight: DashboardFlight | null;
  flightOptions: DashboardFlight[];
  readinessDomains: ReadinessDomain[];
  readinessVerdict?: FlightReadinessVerdict | null;
  fleetSummary: DashboardPoint[];
  fleet: DashboardFleetRow[];
  flightBoard: Array<{ key: string; label: string; flights: DashboardFlight[] }>;
  stations: DashboardStationRow[];
  blockers: DashboardPoint[];
  blockerItems?: DashboardBlockerItem[];
};

export type DashboardBlockerItem = {
  id: string;
  domain: ReadinessDomain['key'];
  severity: 'critical' | 'warning';
  flightNumber: string;
  route: string;
  issue: string;
  owner: string;
  scheduledDepartureAt: string | null;
  impact: string;
  requiredAction: string;
  actionLabel: string;
  href: string;
};

export type ManagementTrendPoint = {
  date: string;
  scheduled: number;
  completed: number;
  cancelled: number;
  onTimePercent: number | null;
  revenue: number;
  operationalCost: number;
  marginPercent: number | null;
  financialDataAvailable?: boolean;
};

export type RoutePerformanceRow = {
  route: string;
  flights: number;
  completionPercent: number | null;
  onTimePercent: number | null;
  averageDelayMinutes?: number | null;
  operationalIssues?: number;
  revenue: number;
  financialDataAvailable?: boolean;
  href: string;
};

export type AircraftUtilizationRow = {
  registration: string;
  type: string;
  flights: number;
  blockHours: number;
  relativeUtilizationPercent: number;
  availabilityPercent?: number | null;
  technicalState?: DashboardFleetRow['status'];
  href: string;
};

export type DashboardSafetyMetric = {
  key: string;
  label: string;
  value: number;
  tone: AviationDashboardTone;
  href: string;
};

export type DashboardInsight = {
  id: string;
  tone: AviationDashboardTone;
  message: string;
  date: string;
  href?: string;
  actionLabel?: string;
};

export type AviationManagementDashboardDto = {
  meta: AviationDashboardMeta & {
    comparisonDateFrom: string | null;
    comparisonDateTo: string | null;
  };
  stationOptions: DashboardStationOption[];
  metricGroups: Array<{
    key: 'operations' | 'fleet' | 'safety' | 'finance';
    label: string;
    icon: string;
    metrics: DashboardDeltaMetric[];
  }>;
  trend: ManagementTrendPoint[];
  revenueComposition: DashboardPoint[];
  routes: RoutePerformanceRow[];
  aircraftUtilization: AircraftUtilizationRow[];
  stations: DashboardStationRow[];
  safety: DashboardSafetyMetric[];
  insights: DashboardInsight[];
  currencyCode: string;
  isMixedCurrency: boolean;
  financeDataState?: DashboardDataState;
};
