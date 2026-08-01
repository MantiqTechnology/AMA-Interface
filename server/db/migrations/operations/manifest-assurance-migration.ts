import type Database from 'better-sqlite3';
import { getApplicationNow } from '../../../utils/time';

type FlightStatusRow = {
  flight_id: string;
  status_code: string;
};

// Departure assurance checks created for flights that already passed planning
// approval when this migration runs. is_required mirrors the gate policy:
// conditional checks (DG, fuel, handling) start as not-required and are
// re-evaluated against actual flight conditions by departure assurance.
const departureCheckSeeds = [
  ['MANIFEST_LOCKED', 'Required manifest locked', 1],
  ['DG_ACCEPTANCE', 'Dangerous goods acceptance', 0],
  ['FUEL_CONFIRMED', 'Fuel confirmed or no-uplift attested', 0],
  ['HANDLING_CONFIRMED', 'Handling confirmed', 0],
  ['DEPARTURE_DOCUMENTS', 'Departure documents verified', 1],
  ['ORIGIN_OPERATIONAL_TASKS', 'Origin operational tasks completed', 1],
  ['ORIGIN_STATION_SIGNOFF', 'Origin station sign-off', 1]
] as const;

const departureCheckCodes = [
  'REQUIRED_DOCUMENTS',
  'DEPARTURE_DOCUMENTS',
  'MANIFEST_APPROVED',
  'MANIFEST_LOCKED',
  'DG_ACCEPTANCE',
  'FUEL_CONFIRMED',
  'HANDLING_CONFIRMED',
  'ORIGIN_OPERATIONAL_TASKS',
  'ORIGIN_STATION_SIGNOFF'
];

// Flights at or past planning approval but not yet departed.
const planningApprovedStatuses = ['APPROVED', 'SCHEDULED', 'CHECK_IN_OPEN'];

export function migrateManifestAssuranceData(sqlite: Database.Database) {
  const now = getApplicationNow();

  // 1. Backfill assurance_phase on existing readiness checks. Closure-scope
  // checks (DESTINATION_STATION_SIGNOFF) intentionally stay NULL.
  const phaseBackfill = sqlite.prepare(
    `UPDATE flight_readiness_checks
     SET assurance_phase = ?
     WHERE assurance_phase IS NULL AND check_code = ?`
  );
  const allCheckCodes = sqlite
    .prepare(
      `SELECT DISTINCT check_code FROM flight_readiness_checks WHERE assurance_phase IS NULL`
    )
    .all() as Array<{ check_code: string }>;
  for (const { check_code: checkCode } of allCheckCodes) {
    if (checkCode === 'DESTINATION_STATION_SIGNOFF') continue;
    phaseBackfill.run(
      departureCheckCodes.includes(checkCode) ? 'DEPARTURE' : 'PLANNING',
      checkCode
    );
  }

  // 2. Preserve locked-manifest actor for legacy LOCKED rows.
  sqlite.exec(
    `UPDATE flight_manifests
     SET locked_by_user_id = approved_by_user_id
     WHERE locked_by_user_id IS NULL
       AND approved_by_user_id IS NOT NULL
       AND status_id = 'manifest-status-locked'`
  );

  // 3. Create PENDING departure-assurance checks for flights that already
  // passed planning approval. CLOSED flights keep their legacy marker only;
  // departed/arrived flights are not backfilled with synthetic assurance rows.
  const flights = sqlite
    .prepare(
      `SELECT f.id AS flight_id, status.code AS status_code
       FROM flight_operations f
       JOIN flight_operation_statuses status ON status.id = f.current_status_id`
    )
    .all() as FlightStatusRow[];

  const insertCheck = sqlite.prepare(
    `INSERT OR IGNORE INTO flight_readiness_checks (
       id, flight_id, check_code, check_name, status_id, is_required,
       assurance_phase, created_at, updated_at
     ) VALUES (?, ?, ?, ?, 'readiness-status-pending', ?, 'DEPARTURE', ?, ?)`
  );

  for (const flight of flights) {
    if (!planningApprovedStatuses.includes(flight.status_code)) continue;
    for (const [code, name, isRequired] of departureCheckSeeds) {
      insertCheck.run(
        `drc-${flight.flight_id}-${code}`,
        flight.flight_id,
        code,
        name,
        isRequired,
        now,
        now
      );
    }
  }
}
