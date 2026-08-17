import { z } from 'zod';

export const dashboardPeriods = ['TODAY', 'THIS_WEEK', 'THIS_MONTH'] as const;
export const dashboardPeriodSchema = z.enum(dashboardPeriods);

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const operationalDashboardQuerySchema = z.object({
  period: z.preprocess(emptyToUndefined, dashboardPeriodSchema.default('THIS_WEEK')),
  anchorDate: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u)
      .optional()
  ),
  stationId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional())
});

export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;
export type OperationalDashboardQuery = z.infer<typeof operationalDashboardQuerySchema>;
export type DashboardTone = 'neutral' | 'success' | 'warning' | 'danger';

export type DashboardSource = {
  label: string;
  href: string;
};

export type DashboardMetric = {
  key: string;
  label: string;
  value: number | string;
  detail: string;
  icon: string;
  tone: DashboardTone;
  href: string;
};

export type DashboardPoint = {
  key: string;
  label: string;
  value: number;
  secondaryValue?: number | null;
  href: string;
};

export type DashboardSeries = {
  key: string;
  label: string;
  points: DashboardPoint[];
};

export type DashboardMeta = {
  generatedAt: string;
  period: DashboardPeriod;
  anchorDate: string;
  dateFrom: string;
  dateTo: string;
  timeZone: 'Asia/Jayapura';
  stationId: string | null;
  stationLabel: string;
};

export type DashboardStationOption = {
  id: string;
  code: string;
  name: string;
};

export type DashboardChart<T> = {
  title: string;
  description: string;
  source: DashboardSource;
  data: T;
};

export type OpsDashboardDto = {
  meta: DashboardMeta;
  stationOptions: DashboardStationOption[];
  metrics: DashboardMetric[];
  activity: DashboardChart<DashboardSeries[]>;
  trackingHealth: DashboardChart<DashboardPoint[]>;
  routeTraffic: DashboardChart<
    Array<
      DashboardPoint & { routeId: string; onTimeRate: number | null; eligibleDepartures: number }
    >
  >;
  stationMovements: DashboardChart<
    Array<
      DashboardPoint & {
        stationId: string;
        departures: number;
        arrivals: number;
      }
    >
  >;
  capabilityCoverage: DashboardChart<Array<DashboardPoint & { available: number; total: number }>>;
  advisories: DashboardChart<
    Array<{
      id: string;
      severity: 'INFO' | 'WARNING' | 'BLOCKING';
      type: string;
      summary: string;
      limitation: string | null;
      validUntil: string;
      href: string;
    }>
  >;
};

export type FlightControlAction = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  flightNumber: string;
  route: string;
  issue: string;
  owner: string;
  ageMinutes: number;
  href: string;
};

export type FlightControlDashboardDto = {
  meta: DashboardMeta;
  stationOptions: DashboardStationOption[];
  metrics: DashboardMetric[];
  lifecycle: DashboardChart<DashboardPoint[]>;
  readiness: DashboardChart<DashboardPoint[]>;
  activity: DashboardChart<DashboardSeries[]>;
  onTimePerformance: DashboardChart<{
    points: DashboardPoint[];
    eligibleDepartures: number;
    excludedFlights: number;
  }>;
  manifestWorkflow: DashboardChart<DashboardPoint[]>;
  fuelWorkflow: DashboardChart<DashboardPoint[]>;
  queueAging: DashboardChart<{
    approvals: DashboardPoint[];
    closures: DashboardPoint[];
  }>;
  actions: DashboardChart<FlightControlAction[]>;
};
