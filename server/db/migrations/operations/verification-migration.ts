import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { getApplicationNow } from '../../../utils/time';

type FlightSeedRow = {
  flight_id: string;
  origin_station_id: string;
  destination_station_id: string;
  status_code: string;
};

const originTasks = [
  ['ORIGIN_HANDLING', 'Origin handling confirmed'],
  ['ORIGIN_HANDOVER', 'Passenger and cargo handover ready'],
  ['ORIGIN_DOCUMENTS', 'Required departure documents available'],
  ['ORIGIN_CHECKLIST', 'Station departure checklist completed'],
  ['ORIGIN_STATION_SIGNOFF', 'Origin station sign-off']
] as const;

const destinationTasks = [
  ['DESTINATION_HANDLING', 'Arrival handling completed'],
  ['DESTINATION_HANDOVER', 'Passenger and cargo handover completed'],
  ['DESTINATION_INCIDENT', 'Station incident recorded or declared clear'],
  ['DESTINATION_DOCUMENTS', 'Destination documents received'],
  ['DESTINATION_STATION_SIGNOFF', 'Destination station sign-off']
] as const;

export function migrateVerificationData(sqlite: Database.Database) {
  const flights = sqlite
    .prepare(
      `SELECT f.id AS flight_id, f.origin_station_id, f.destination_station_id,
              status.code AS status_code
       FROM flight_operations f
       JOIN flight_operation_statuses status ON status.id = f.current_status_id`
    )
    .all() as FlightSeedRow[];
  const now = getApplicationNow();

  const insertTask = sqlite.prepare(
    `INSERT OR IGNORE INTO flight_station_tasks (
       id, flight_id, station_id, phase, task_code, task_title, status,
       assigned_role, requires_evidence, version, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'Station Admin', 1, 1, ?, ?)`
  );
  const insertLegacyAudit = sqlite.prepare(
    `INSERT OR IGNORE INTO flight_operational_audit (
       id, actor_user_id, actor_role, flight_id, module, action,
       before_status, after_status, reason, timestamp, created_at
     ) VALUES (?, 'SYSTEM', 'SYSTEM', ?, 'LEGACY_ASSURANCE', 'LEGACY_CLOSED_MARKER',
       'CLOSED', 'CLOSED', ?, ?, ?)`
  );

  for (const flight of flights) {
    if (flight.status_code === 'CLOSED') {
      insertLegacyAudit.run(
        `audit-legacy-${flight.flight_id}`,
        flight.flight_id,
        'Flight closed before operational verification assurance was introduced.',
        now,
        now
      );
      continue;
    }
    if (flight.status_code === 'CANCELLED') continue;

    for (const [code, title] of originTasks) {
      insertTask.run(
        `stask-${nanoid(10)}`,
        flight.flight_id,
        flight.origin_station_id,
        'ORIGIN_DEPARTURE',
        code,
        title,
        now,
        now
      );
    }
    for (const [code, title] of destinationTasks) {
      insertTask.run(
        `stask-${nanoid(10)}`,
        flight.flight_id,
        flight.destination_station_id,
        code === 'DESTINATION_STATION_SIGNOFF' ? 'DESTINATION_CLOSURE' : 'DESTINATION_ARRIVAL',
        code,
        title,
        now,
        now
      );
    }
  }
}
