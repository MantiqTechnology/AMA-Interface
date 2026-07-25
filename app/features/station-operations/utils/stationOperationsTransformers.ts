import type {
  ApiStationFlight,
  FlightDirection,
  FlightStatus,
  ReadinessStatus,
  StationAuditRow,
  StationDataset,
  StationFlightRow,
  StationTaskRow
} from '../types/stationOperations';
import { toLocalTime } from './stationOperationsFormatters';

export function createEmptyDataset(): StationDataset {
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
      pendingCosts: 0
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

export function toFlightStatus(statusCode: string): FlightStatus {
  switch (statusCode) {
    case 'IN_PROGRESS':
      return 'DEPARTED';
    case 'LANDED':
    case 'CLOSED':
      return 'LANDED';
    case 'DIVERTED':
    case 'BLOCKED':
    case 'CANCELLED':
      return 'DELAYED';
    case 'BOARDING':
      return 'BOARDING';
    case 'PENDING_CLOSURE':
      return 'ARRIVING';
    default:
      return 'SCHEDULED';
  }
}

export function toFlightType(serviceTypeCode: string): StationFlightRow['type'] {
  return serviceTypeCode.includes('CARGO') ? 'CRG' : 'PSG';
}

export function deriveReadiness(flight: ApiStationFlight): ReadinessStatus {
  const incompleteTasks = flight.tasks.filter((task) => task.status !== 'VERIFIED');
  if (incompleteTasks.length === 0) return 'READY';
  return incompleteTasks.some((task) => task.status === 'REJECTED') ? 'NOT_READY' : 'CHECK';
}

export function flattenStationTasks(
  stationCode: string,
  flights: ApiStationFlight[]
): StationTaskRow[] {
  const stationId = `st-${stationCode.toLowerCase()}`;
  return flights.flatMap((flight) =>
    flight.tasks
      .filter((task) => task.stationId === stationId)
      .map((task) => ({
        ...task,
        flightId: flight.flightId,
        flightNumber: flight.flightNumber
      }))
  );
}

export function flattenAudit(flights: ApiStationFlight[]): StationAuditRow[] {
  return flights
    .flatMap((flight) =>
      flight.audit.map((entry) => ({
        ...entry,
        flightId: flight.flightId,
        flightNumber: flight.flightNumber
      }))
    )
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function buildDatasetFromApi(
  stationCode: string,
  flights: ApiStationFlight[]
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

  const services = flights
    .flatMap((flight) => flight.services)
    .filter((service) => service.stationCode === stationCode)
    .map((service) => ({
      id: service.id,
      flightId: service.flightId,
      flightNumber: service.flightNumber,
      serviceType: service.serviceType,
      supplierName: service.supplierName,
      status: service.status,
      referenceRate: service.referenceRate ?? undefined,
      version: service.version
    }));

  const costs = flights
    .flatMap((flight) => flight.costs)
    .filter((cost) => cost.stationCode === stationCode)
    .map((cost) => ({
      id: cost.id,
      flightId: cost.flightId,
      flightNumber: cost.flightNumber,
      stationCode: cost.stationCode,
      vendorName: cost.vendorName,
      costCategoryName: cost.costCategoryName,
      description: cost.description,
      amount: cost.amount,
      currencyCode: cost.currencyCode,
      status: cost.status,
      version: cost.version
    }));

  const inboundFlights = rows.filter((row) => row.direction === 'INBOUND').length;
  const outboundFlights = rows.filter((row) => row.direction === 'OUTBOUND').length;
  const passengerFlights = rows.filter((row) => row.type === 'PSG');
  const cargoFlights = rows.filter((row) => row.type === 'CRG');
  const totalFlightsForPct = rows.length || 1;
  const paxCheckedIn = passengerFlights.reduce((sum, flight) => sum + flight.paxTotal, 0);
  const paxBoarded = passengerFlights.reduce((sum, flight) => sum + flight.paxOnboard, 0);
  const passengerCount = passengerFlights.length;
  const cargoCount = cargoFlights.length;
  const positioningCount = flights.filter(
    (flight) => flight.serviceTypeCode === 'POSITIONING'
  ).length;

  return {
    flights: rows,
    services,
    costs,
    kpi: {
      inboundFlights,
      outboundFlights,
      flightsNeedingAction: rows.filter((row) => row.needsAction).length,
      paxCheckedIn,
      paxBoarded,
      cargoWeightKg: cargoFlights.reduce((sum, flight) => sum + flight.cargoWeightKg, 0),
      pendingServices: services.filter((service) => service.status === 'REQUESTED').length,
      pendingCosts: costs.filter((cost) => ['DRAFT', 'SUBMITTED'].includes(cost.status)).length
    },
    dailyReport: {
      flights: {
        total: rows.length,
        onTime: rows.filter((row) => row.status !== 'DELAYED').length,
        delayed: rows.filter((row) => row.status === 'DELAYED').length
      },
      passengers: {
        checkedIn: paxCheckedIn,
        boarded: paxBoarded,
        loadFactor: paxCheckedIn > 0 ? Math.round((paxBoarded / paxCheckedIn) * 100) : 0
      },
      cargo: {
        totalWeightKg: cargoFlights.reduce((sum, flight) => sum + flight.cargoWeightKg, 0),
        totalVolumeM3: 0,
        shipments: 0
      },
      services: {
        requested: services.filter((service) => service.status === 'REQUESTED').length,
        confirmed: services.filter((service) => service.status === 'CONFIRMED').length,
        completed: services.filter((service) => service.status === 'COMPLETED').length
      },
      costs: {
        total: costs.length,
        approvedPct: costs.length
          ? Math.round(
              (costs.filter((cost) => cost.status === 'APPROVED').length / costs.length) * 100
            )
          : 0,
        approvedAmount: costs
          .filter((cost) => cost.status === 'APPROVED')
          .reduce((sum, cost) => sum + cost.amount, 0),
        positioningAmount: costs
          .filter((cost) => cost.costCategoryName.toLowerCase().includes('positioning'))
          .reduce((sum, cost) => sum + cost.amount, 0)
      }
    },
    flightsByType: {
      passenger: {
        count: passengerCount,
        pct: Math.round((passengerCount / totalFlightsForPct) * 100)
      },
      cargo: {
        count: cargoCount,
        pct: Math.round((cargoCount / totalFlightsForPct) * 100)
      },
      positioning: {
        count: positioningCount,
        pct: Math.round((positioningCount / totalFlightsForPct) * 100)
      }
    },
    exceptions: {
      delayOver15: rows.filter((row) => row.status === 'DELAYED').length,
      servicesOverdue: services.filter((service) => service.status === 'REQUESTED').length,
      costOverdue: costs.filter((cost) => ['DRAFT', 'SUBMITTED'].includes(cost.status)).length,
      manifestIssue: 0,
      techLogOpen: 0
    }
  };
}
