import { z } from 'zod';

const emptyQueryValue = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const operationsMonitoringQuerySchema = z.object({
  date: z.preprocess(emptyQueryValue, z.string().trim().min(10).max(10).optional()),
  stationId: z.preprocess(emptyQueryValue, z.string().trim().min(1).optional()),
  status: z.preprocess(emptyQueryValue, z.string().trim().min(1).optional())
});

export type OperationsMonitoringQuery = z.infer<typeof operationsMonitoringQuerySchema>;

export type OperationalFlightMonitorDto = {
  id: string;
  flightNumber: string;
  orderNumber: string;
  flightDate: string;
  currentStatus: string;
  originStationId: string;
  originCode: string;
  destinationStationId: string;
  destinationCode: string;
  aircraftRegistration: string | null;
  pilotInCommandName: string | null;
  scheduledDepartureAt: string | null;
  scheduledArrivalAt: string | null;
  actualDepartureAt: string | null;
  actualArrivalAt: string | null;
  readinessPercent: number;
  blockingReason: string | null;
};

export type OperationalAlertDto = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  flightOperationId: string;
};

export type OperationsOverviewDto = {
  generatedAt: string;
  kpis: {
    totalFlights: number;
    activeFlights: number;
    blockedFlights: number;
    pendingClosures: number;
    pendingApprovals: number;
  };
  flights: OperationalFlightMonitorDto[];
  alerts: OperationalAlertDto[];
};

export type DashboardDto = OperationsOverviewDto & {
  finance: {
    revenue: number;
    operationalCost: number;
    grossMargin: number;
    invoiced: number;
    paid: number;
    currencyCode: string;
    isMixedCurrency: boolean;
    currencyBreakdown: Array<{
      currencyCode: string;
      revenue: number;
      operationalCost: number;
      grossMargin: number;
      invoiced: number;
      paid: number;
    }>;
  };
  ticketing: {
    passengerTickets: number;
    cargoBookings: number;
    unpaidItems: number;
  };
};
