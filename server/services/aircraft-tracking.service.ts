import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';
import type {
  AircraftPositionDto,
  AircraftPositionStatus,
  PositionReportBody
} from '../../shared/contracts/aircraft-tracking';
import { DomainError, notFound } from '../utils/errors';

type TrackingFlight = {
  id: string;
  aircraftId: string | null;
  currentStatus: string;
  originLatitude: number | null;
  originLongitude: number | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
};

type PositionInput = {
  flightId: string | null;
  aircraftId: string;
  latitude: number;
  longitude: number;
  positionStatus: AircraftPositionStatus;
  altitudeFt?: number | null;
  groundSpeedKt?: number | null;
  headingDeg?: number | null;
  recordedAt: string;
  source: AircraftPositionDto['source'];
  expectedVersion?: number | null;
  actorUserId: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const lat1 = radians(aLat);
  const lat2 = radians(bLat);
  const haversine =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export class AircraftTrackingService {
  constructor(private readonly sqlite: Database.Database) {}

  reportForFlight(flightId: string, body: PositionReportBody, actorUserId: string) {
    const flight = this.requireFlight(flightId);
    if (!flight.aircraftId) {
      throw new DomainError('AIRCRAFT_NOT_ASSIGNED', 'Flight has no assigned aircraft.', 422);
    }
    if (body.positionStatus === 'AIRBORNE' && flight.currentStatus !== 'IN_PROGRESS') {
      throw new DomainError(
        'FLIGHT_NOT_IN_PROGRESS',
        'Airborne position reports require an in-progress flight.',
        409
      );
    }
    return this.writePosition({
      ...body,
      flightId,
      aircraftId: flight.aircraftId,
      positionStatus: body.positionStatus,
      recordedAt: body.recordedAt ?? new Date().toISOString(),
      source: 'MANUAL',
      actorUserId
    });
  }

  advanceDemoPosition(flightId: string, actorUserId: string) {
    const flight = this.requireFlight(flightId);
    if (!flight.aircraftId) {
      throw new DomainError('AIRCRAFT_NOT_ASSIGNED', 'Flight has no assigned aircraft.', 422);
    }
    if (flight.currentStatus !== 'IN_PROGRESS') {
      throw new DomainError(
        'FLIGHT_NOT_IN_PROGRESS',
        'Demo progression is only available for an in-progress flight.',
        409
      );
    }
    if (
      flight.originLatitude === null ||
      flight.originLongitude === null ||
      flight.destinationLatitude === null ||
      flight.destinationLongitude === null
    ) {
      throw new DomainError(
        'ROUTE_COORDINATES_MISSING',
        'Route station coordinates are missing.',
        422
      );
    }
    const current = this.currentRow(flight.aircraftId);
    const currentProgress = current
      ? this.progress(flight, Number(current.latitude), Number(current.longitude))
      : 0;
    const nextProgress = Math.min(95, Math.max(10, Math.round(currentProgress / 10) * 10 + 10));
    const ratio = nextProgress / 100;
    const latitude =
      flight.originLatitude + (flight.destinationLatitude - flight.originLatitude) * ratio;
    const longitude =
      flight.originLongitude + (flight.destinationLongitude - flight.originLongitude) * ratio;
    return this.writePosition({
      flightId,
      aircraftId: flight.aircraftId,
      latitude,
      longitude,
      positionStatus: 'AIRBORNE',
      altitudeFt: nextProgress < 20 || nextProgress > 80 ? 7_500 : 11_500,
      groundSpeedKt: nextProgress > 85 ? 115 : 155,
      headingDeg: this.heading(
        flight.originLatitude,
        flight.originLongitude,
        flight.destinationLatitude,
        flight.destinationLongitude
      ),
      recordedAt: new Date().toISOString(),
      source: 'DEMO_SIMULATION',
      expectedVersion: current ? Number(current.version) : null,
      actorUserId
    });
  }

  recordSystemPosition(
    flightId: string,
    stationId: string,
    positionStatus: AircraftPositionStatus,
    source: 'SYSTEM_DEPARTURE' | 'SYSTEM_ARRIVAL',
    actorUserId: string,
    recordedAt: string
  ) {
    const flight = this.requireFlight(flightId);
    if (!flight.aircraftId) return null;
    const station = this.sqlite
      .prepare('SELECT latitude, longitude FROM stations WHERE id = ?')
      .get(stationId) as { latitude: number | null; longitude: number | null } | undefined;
    if (!station || station.latitude === null || station.longitude === null) return null;
    return this.writePosition({
      flightId,
      aircraftId: flight.aircraftId,
      latitude: Number(station.latitude),
      longitude: Number(station.longitude),
      positionStatus,
      altitudeFt: positionStatus === 'AIRBORNE' ? 500 : 0,
      groundSpeedKt: positionStatus === 'AIRBORNE' ? 85 : 0,
      recordedAt,
      source,
      actorUserId
    });
  }

  private writePosition(input: PositionInput) {
    return this.sqlite.transaction(() => {
      const current = this.currentRow(input.aircraftId);
      if (
        input.expectedVersion != null &&
        Number(current?.version ?? 0) !== input.expectedVersion
      ) {
        throw new DomainError(
          'POSITION_VERSION_CONFLICT',
          'Aircraft position changed since it was loaded. Refresh before reporting again.',
          409,
          { expectedVersion: input.expectedVersion, actualVersion: Number(current?.version ?? 0) }
        );
      }
      if (
        current &&
        new Date(input.recordedAt).getTime() < new Date(String(current.recorded_at)).getTime()
      ) {
        throw new DomainError(
          'STALE_POSITION_REPORT',
          'A position report cannot replace a newer aircraft position.',
          409
        );
      }
      const reportId = `apos-${nanoid(12)}`;
      const now = new Date().toISOString();
      this.sqlite
        .prepare(
          `INSERT INTO aircraft_position_reports (
             id, aircraft_id, flight_id, latitude, longitude, position_status, altitude_ft,
             ground_speed_kt, heading_deg, source, recorded_at, reported_by_user_id, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          reportId,
          input.aircraftId,
          input.flightId,
          input.latitude,
          input.longitude,
          input.positionStatus,
          input.altitudeFt ?? null,
          input.groundSpeedKt ?? null,
          input.headingDeg ?? null,
          input.source,
          input.recordedAt,
          input.actorUserId,
          now
        );
      this.sqlite
        .prepare(
          `INSERT INTO aircraft_current_positions (
             aircraft_id, report_id, flight_id, latitude, longitude, position_status,
             altitude_ft, ground_speed_kt, heading_deg, source, recorded_at, version, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
           ON CONFLICT(aircraft_id) DO UPDATE SET
             report_id = excluded.report_id, flight_id = excluded.flight_id,
             latitude = excluded.latitude, longitude = excluded.longitude,
             position_status = excluded.position_status, altitude_ft = excluded.altitude_ft,
             ground_speed_kt = excluded.ground_speed_kt, heading_deg = excluded.heading_deg,
             source = excluded.source, recorded_at = excluded.recorded_at,
             version = aircraft_current_positions.version + 1, updated_at = excluded.updated_at`
        )
        .run(
          input.aircraftId,
          reportId,
          input.flightId,
          input.latitude,
          input.longitude,
          input.positionStatus,
          input.altitudeFt ?? null,
          input.groundSpeedKt ?? null,
          input.headingDeg ?? null,
          input.source,
          input.recordedAt,
          now
        );
      if (input.positionStatus === 'AIRBORNE') {
        this.sqlite
          .prepare(
            'UPDATE aircraft SET current_station_id = NULL, version = version + 1, updated_at = ? WHERE id = ?'
          )
          .run(now, input.aircraftId);
      }
      return this.positionDto(
        this.requireFlight(input.flightId ?? ''),
        this.currentRow(input.aircraftId)!
      );
    })();
  }

  private currentRow(aircraftId: string) {
    return this.sqlite
      .prepare('SELECT * FROM aircraft_current_positions WHERE aircraft_id = ?')
      .get(aircraftId) as Record<string, string | number | null> | undefined;
  }

  private requireFlight(id: string): TrackingFlight {
    const row = this.sqlite
      .prepare(
        `SELECT flight.id, flight.aircraft_id AS aircraftId, status.code AS currentStatus,
           origin.latitude AS originLatitude, origin.longitude AS originLongitude,
           destination.latitude AS destinationLatitude, destination.longitude AS destinationLongitude
         FROM flight_operations flight
         JOIN flight_operation_statuses status ON status.id = flight.current_status_id
         JOIN stations origin ON origin.id = flight.origin_station_id
         JOIN stations destination ON destination.id = flight.destination_station_id
         WHERE flight.id = ?`
      )
      .get(id) as TrackingFlight | undefined;
    if (!row) throw notFound('Flight operation', id);
    return row;
  }

  private progress(flight: TrackingFlight, latitude: number, longitude: number) {
    if (
      flight.originLatitude === null ||
      flight.originLongitude === null ||
      flight.destinationLatitude === null ||
      flight.destinationLongitude === null
    )
      return 0;
    const total = distanceKm(
      flight.originLatitude,
      flight.originLongitude,
      flight.destinationLatitude,
      flight.destinationLongitude
    );
    const remaining = distanceKm(
      latitude,
      longitude,
      flight.destinationLatitude,
      flight.destinationLongitude
    );
    return total ? clamp(((total - remaining) / total) * 100, 0, 100) : 0;
  }

  private positionDto(
    flight: TrackingFlight,
    row: Record<string, string | number | null>
  ): AircraftPositionDto {
    const recordedAt = String(row.recorded_at);
    return {
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      positionStatus: String(row.position_status) as AircraftPositionStatus,
      altitudeFt: row.altitude_ft === null ? null : Number(row.altitude_ft),
      groundSpeedKt: row.ground_speed_kt === null ? null : Number(row.ground_speed_kt),
      headingDeg: row.heading_deg === null ? null : Number(row.heading_deg),
      source: String(row.source) as AircraftPositionDto['source'],
      recordedAt,
      version: Number(row.version),
      progressPercent: Math.round(
        this.progress(flight, Number(row.latitude), Number(row.longitude))
      ),
      isStale: Date.now() - new Date(recordedAt).getTime() > 15 * 60_000
    };
  }

  private heading(fromLat: number, fromLng: number, toLat: number, toLng: number) {
    const radians = (value: number) => (value * Math.PI) / 180;
    const y = Math.sin(radians(toLng - fromLng)) * Math.cos(radians(toLat));
    const x =
      Math.cos(radians(fromLat)) * Math.sin(radians(toLat)) -
      Math.sin(radians(fromLat)) * Math.cos(radians(toLat)) * Math.cos(radians(toLng - fromLng));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }
}
