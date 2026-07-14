import type Database from 'better-sqlite3';
import type {
  OperationalAlertDto,
  OperationalFlightMonitorDto,
  OperationsOverviewDto,
  OperationsMonitoringQuery
} from '../../shared/contracts/operations-monitoring';

type FlightRow = Omit<OperationalFlightMonitorDto, 'readinessPercent'> & {
  requiredChecks: number;
  completedChecks: number;
};

export class OperationsMonitoringService {
  constructor(private readonly sqlite: Database.Database) {}

  flightFollowing(query: OperationsMonitoringQuery): OperationalFlightMonitorDto[] {
    const conditions: string[] = [];
    const parameters: Record<string, string> = {};
    if (query.date) {
      conditions.push('flight.flight_date = @date');
      parameters.date = query.date;
    }
    if (query.stationId) {
      conditions.push(
        '(flight.origin_station_id = @stationId OR flight.destination_station_id = @stationId)'
      );
      parameters.stationId = query.stationId;
    }
    if (query.status) {
      conditions.push('status.code = @status');
      parameters.status = query.status;
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.sqlite
      .prepare(
        `SELECT flight.id, flight.flight_number AS flightNumber,
           flight.order_number AS orderNumber, flight.flight_date AS flightDate,
           status.code AS currentStatus, flight.origin_station_id AS originStationId,
           origin.station_code AS originCode,
           flight.destination_station_id AS destinationStationId,
           destination.station_code AS destinationCode,
           aircraft.registration_number AS aircraftRegistration,
           crew.full_name AS pilotInCommandName,
           flight.scheduled_departure_at AS scheduledDepartureAt,
           flight.scheduled_arrival_at AS scheduledArrivalAt,
           flight.actual_departure_at AS actualDepartureAt,
           flight.actual_arrival_at AS actualArrivalAt,
           flight.blocking_reason AS blockingReason,
           (SELECT COUNT(*) FROM flight_readiness_checks check_row
             WHERE check_row.flight_id = flight.id AND check_row.is_required = 1) AS requiredChecks,
           (SELECT COUNT(*) FROM flight_readiness_checks check_row
             JOIN readiness_statuses check_status ON check_status.id = check_row.status_id
             WHERE check_row.flight_id = flight.id AND check_row.is_required = 1
               AND check_status.code IN ('PASS', 'NOT_APPLICABLE')) AS completedChecks
         FROM flight_operations flight
         JOIN flight_operation_statuses status ON status.id = flight.current_status_id
         JOIN stations origin ON origin.id = flight.origin_station_id
         JOIN stations destination ON destination.id = flight.destination_station_id
         LEFT JOIN aircraft aircraft ON aircraft.id = flight.aircraft_id
         LEFT JOIN crews crew ON crew.id = flight.pilot_in_command_id
         ${where}
         ORDER BY COALESCE(flight.scheduled_departure_at, flight.flight_date) ASC`
      )
      .all(parameters) as FlightRow[];
    return rows.map(({ requiredChecks, completedChecks, ...row }) => ({
      ...row,
      readinessPercent:
        requiredChecks > 0 ? Math.round((completedChecks / requiredChecks) * 100) : 0
    }));
  }

  operationsOverview(query: OperationsMonitoringQuery): OperationsOverviewDto {
    const flights = this.flightFollowing(query);
    const pendingApprovals = this.sqlite
      .prepare(
        `SELECT COUNT(*) AS count FROM flight_operation_approvals approval
         JOIN flight_approval_statuses status ON status.id = approval.status_id
         WHERE status.code = 'PENDING'`
      )
      .get() as { count: number };
    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        totalFlights: flights.length,
        activeFlights: flights.filter((flight) =>
          ['SCHEDULED', 'CHECK_IN_OPEN', 'IN_PROGRESS', 'LANDED'].includes(flight.currentStatus)
        ).length,
        blockedFlights: flights.filter((flight) => flight.currentStatus === 'BLOCKED').length,
        pendingClosures: flights.filter((flight) => flight.currentStatus === 'PENDING_CLOSURE')
          .length,
        pendingApprovals: Number(pendingApprovals.count)
      },
      flights,
      alerts: this.deriveAlerts(flights)
    };
  }

  private deriveAlerts(flights: OperationalFlightMonitorDto[]): OperationalAlertDto[] {
    const alerts: OperationalAlertDto[] = [];
    for (const flight of flights) {
      if (flight.currentStatus === 'BLOCKED') {
        alerts.push({
          id: `${flight.id}-blocked`,
          severity: 'critical',
          title: `${flight.flightNumber} blocked`,
          message: flight.blockingReason ?? 'Readiness requirements are incomplete.',
          flightOperationId: flight.id
        });
      } else if (
        flight.readinessPercent < 100 &&
        !['CANCELLED', 'CLOSED'].includes(flight.currentStatus)
      ) {
        alerts.push({
          id: `${flight.id}-readiness`,
          severity: 'warning',
          title: `${flight.flightNumber} readiness incomplete`,
          message: `${flight.readinessPercent}% of required checks are complete.`,
          flightOperationId: flight.id
        });
      } else if (flight.currentStatus === 'PENDING_CLOSURE') {
        alerts.push({
          id: `${flight.id}-closure`,
          severity: 'info',
          title: `${flight.flightNumber} awaits closure`,
          message: 'Operational evidence is ready for closure review.',
          flightOperationId: flight.id
        });
      }
    }
    return alerts;
  }
}
