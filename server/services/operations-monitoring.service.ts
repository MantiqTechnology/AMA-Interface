import type Database from 'better-sqlite3';
import type {
  OperationalAlertDto,
  OperationalFlightMonitorDto,
  OperationsOverviewDto,
  OperationsMonitoringQuery
} from '../../shared/contracts/operations-monitoring';

type FlightRow = Omit<
  OperationalFlightMonitorDto,
  | 'readinessPercent'
  | 'delayMinutes'
  | 'urgency'
  | 'nextAction'
  | 'plannedDestinationCode'
  | 'actualArrivalStationCode'
  | 'stationScopeMatch'
> & {
  requiredChecks: number;
  completedChecks: number;
  actualArrivalStationCode: string | null;
  positionLatitude: number | null;
  positionLongitude: number | null;
  positionStatus: string | null;
  positionAltitudeFt: number | null;
  positionGroundSpeedKt: number | null;
  positionHeadingDeg: number | null;
  positionSource: string | null;
  positionRecordedAt: string | null;
  positionVersion: number | null;
};

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function nextAction(status: string) {
  const actions: Record<string, string> = {
    SCHEDULED: 'Open check-in',
    CHECK_IN_OPEN: 'Record departure',
    IN_PROGRESS: 'Record landing / diversion',
    LANDED: 'Submit actual closure',
    DIVERTED: 'Submit diversion closure',
    PENDING_CLOSURE: 'Complete closure',
    BLOCKED: 'Resolve readiness blockers'
  };
  return actions[status] ?? null;
}

function minutesBetween(later: string | null, earlier: string | null) {
  if (!later || !earlier) return 0;
  return Math.max(
    0,
    Math.round((new Date(later).getTime() - new Date(earlier).getTime()) / 60_000)
  );
}

export class OperationsMonitoringService {
  constructor(private readonly sqlite: Database.Database) {}

  flightFollowing(
    query: OperationsMonitoringQuery,
    stationScope: readonly string[] = ['ALL']
  ): OperationalFlightMonitorDto[] {
    const conditions: string[] = [];
    const parameters: Record<string, string> = {};
    if (query.date) {
      conditions.push('flight.flight_date = @date');
      parameters.date = query.date;
    }
    if (query.stationId) {
      conditions.push(
        '(flight.origin_station_id = @stationId OR flight.destination_station_id = @stationId OR flight.actual_arrival_station_id = @stationId)'
      );
      parameters.stationId = query.stationId;
    }
    if (query.status) {
      conditions.push('status.code = @status');
      parameters.status = query.status;
    }
    if (!stationScope.includes('ALL')) {
      const scopeBindings = stationScope.map((stationCode, index) => {
        const key = `scope${index}`;
        parameters[key] = stationCode;
        return `@${key}`;
      });
      if (scopeBindings.length === 0) return [];
      const values = scopeBindings.join(', ');
      conditions.push(
        `(origin.station_code IN (${values}) OR destination.station_code IN (${values}) OR actual_arrival_station.station_code IN (${values}))`
      );
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
           origin.latitude AS originLatitude, origin.longitude AS originLongitude,
           destination.latitude AS destinationLatitude, destination.longitude AS destinationLongitude,
           aircraft.id AS aircraftId,
           aircraft.registration_number AS aircraftRegistration,
           aircraft.image_url AS aircraftImageUrl,
           crew.full_name AS pilotInCommandName,
           flight.scheduled_departure_at AS scheduledDepartureAt,
           flight.scheduled_arrival_at AS scheduledArrivalAt,
           flight.actual_departure_at AS actualDepartureAt,
           flight.actual_arrival_at AS actualArrivalAt,
           actual_arrival_station.station_code AS actualArrivalStationCode,
           flight.blocking_reason AS blockingReason,
           current_position.latitude AS positionLatitude,
           current_position.longitude AS positionLongitude,
           current_position.position_status AS positionStatus,
           current_position.altitude_ft AS positionAltitudeFt,
           current_position.ground_speed_kt AS positionGroundSpeedKt,
           current_position.heading_deg AS positionHeadingDeg,
           current_position.source AS positionSource,
           current_position.recorded_at AS positionRecordedAt,
           current_position.version AS positionVersion,
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
         LEFT JOIN stations actual_arrival_station ON actual_arrival_station.id = flight.actual_arrival_station_id
         LEFT JOIN aircraft aircraft ON aircraft.id = flight.aircraft_id
         LEFT JOIN aircraft_current_positions current_position
           ON current_position.aircraft_id = aircraft.id
          AND (current_position.flight_id = flight.id OR current_position.flight_id IS NULL)
         LEFT JOIN crews crew ON crew.id = flight.pilot_in_command_id
         ${where}
         ORDER BY COALESCE(flight.scheduled_departure_at, flight.flight_date) ASC`
      )
      .all(parameters) as FlightRow[];
    return rows.map(
      ({
        requiredChecks,
        completedChecks,
        positionLatitude,
        positionLongitude,
        positionStatus,
        positionAltitudeFt,
        positionGroundSpeedKt,
        positionHeadingDeg,
        positionSource,
        positionRecordedAt,
        positionVersion,
        ...row
      }) => {
        const readinessPercent =
          requiredChecks > 0 ? Math.round((completedChecks / requiredChecks) * 100) : 0;
        const delayMinutes = row.actualArrivalAt
          ? minutesBetween(row.actualArrivalAt, row.scheduledArrivalAt)
          : row.actualDepartureAt
            ? minutesBetween(row.actualDepartureAt, row.scheduledDepartureAt)
            : ['SCHEDULED', 'CHECK_IN_OPEN'].includes(row.currentStatus)
              ? minutesBetween(new Date().toISOString(), row.scheduledDepartureAt)
              : 0;
        const urgency =
          row.currentStatus === 'BLOCKED' || delayMinutes >= 30
            ? 'critical'
            : delayMinutes > 0 || readinessPercent < 100
              ? 'warning'
              : 'normal';
        const routeDistance =
          row.originLatitude !== null &&
          row.originLongitude !== null &&
          row.destinationLatitude !== null &&
          row.destinationLongitude !== null
            ? distanceKm(
                row.originLatitude,
                row.originLongitude,
                row.destinationLatitude,
                row.destinationLongitude
              )
            : 0;
        const remainingDistance =
          routeDistance &&
          positionLatitude !== null &&
          positionLongitude !== null &&
          row.destinationLatitude !== null &&
          row.destinationLongitude !== null
            ? distanceKm(
                positionLatitude,
                positionLongitude,
                row.destinationLatitude,
                row.destinationLongitude
              )
            : routeDistance;
        const position =
          positionLatitude !== null &&
          positionLongitude !== null &&
          positionStatus &&
          positionSource &&
          positionRecordedAt
            ? {
                latitude: positionLatitude,
                longitude: positionLongitude,
                positionStatus: positionStatus as 'ON_GROUND' | 'AIRBORNE' | 'UNKNOWN',
                altitudeFt: positionAltitudeFt,
                groundSpeedKt: positionGroundSpeedKt,
                headingDeg: positionHeadingDeg,
                source: positionSource as
                  'MANUAL' | 'DEMO_SIMULATION' | 'SYSTEM_DEPARTURE' | 'SYSTEM_ARRIVAL',
                recordedAt: positionRecordedAt,
                version: positionVersion ?? 1,
                progressPercent: routeDistance
                  ? Math.round(
                      Math.min(
                        100,
                        Math.max(0, ((routeDistance - remainingDistance) / routeDistance) * 100)
                      )
                    )
                  : null,
                isStale: Date.now() - new Date(positionRecordedAt).getTime() > 15 * 60_000
              }
            : null;
        return {
          ...row,
          position,
          readinessPercent,
          delayMinutes,
          urgency,
          nextAction: nextAction(row.currentStatus),
          plannedDestinationCode: row.destinationCode,
          actualArrivalStationCode: row.actualArrivalStationCode,
          stationScopeMatch: true
        };
      }
    );
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
