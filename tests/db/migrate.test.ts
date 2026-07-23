import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { dropDemoDatabase, runMigrations } from '../../server/db/migrate';

const oldTablePrefix = ['r', 'e', 'f', '_'].join('');
const oldIdPrefix = ['r', 'e', 'f', '-'].join('');
const oldManifestRebuildTable = ['flight_manifests', 'legacy', 'refactor'].join('_');

function tableNames(sqlite: Database.Database) {
  return (
    sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>
  ).map((row) => row.name);
}

function foreignKeyParents(sqlite: Database.Database, table: string) {
  return (
    sqlite.prepare(`PRAGMA foreign_key_list(${table})`).all() as Array<{ table: string }>
  ).map((row) => row.table);
}

function foreignKeysEnabled(sqlite: Database.Database) {
  return (sqlite.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys;
}

describe('database migrations', () => {
  it('rejects pre-cleanup tables with a reset instruction', () => {
    const sqlite = new Database(':memory:');

    sqlite.exec(`CREATE TABLE ${oldTablePrefix}stations (id TEXT PRIMARY KEY)`);

    expect(() => runMigrations(sqlite)).toThrow(/pre-cleanup schema.*pnpm demo:reset/u);

    sqlite.close();
  });

  it('rejects obsolete operational tables even without an old-name prefix', () => {
    const sqlite = new Database(':memory:');

    sqlite.exec('CREATE TABLE flight_orders (id TEXT PRIMARY KEY)');

    expect(() => runMigrations(sqlite)).toThrow(/obsolete tables: flight_orders/u);

    sqlite.close();
  });

  it('rejects old canonical master table shapes with a reset instruction', () => {
    const sqlite = new Database(':memory:');

    sqlite.exec('CREATE TABLE aircraft (id TEXT PRIMARY KEY, tail_number TEXT NOT NULL)');

    expect(() => runMigrations(sqlite)).toThrow(/aircraft missing registration_number/u);

    sqlite.close();
  });

  it('rejects ticketing tables that still lack canonical operation ownership', () => {
    const sqlite = new Database(':memory:');

    sqlite.exec('CREATE TABLE passenger_tickets (id TEXT PRIMARY KEY)');

    expect(() => runMigrations(sqlite)).toThrow(/passenger_tickets missing flight_operation_id/u);

    sqlite.close();
  });

  it('rejects ticketing tables that retain a second flight parent column', () => {
    const sqlite = new Database(':memory:');

    sqlite.exec(
      `CREATE TABLE ticketing_sales (
         id TEXT PRIMARY KEY,
         flight_operation_id TEXT NOT NULL,
         flight_order_id TEXT NOT NULL
       )`
    );

    expect(() => runMigrations(sqlite)).toThrow(
      /obsolete columns: ticketing_sales\.flight_order_id/u
    );

    sqlite.close();
  });

  it('rejects the pre-FIN invoice and pricing snapshot shape', () => {
    const sqlite = new Database(':memory:');

    sqlite.exec(
      `CREATE TABLE invoices (
         id TEXT PRIMARY KEY,
         flight_operation_id TEXT NOT NULL
       )`
    );

    expect(() => runMigrations(sqlite)).toThrow(/invoices missing created_by_user_id/u);
    sqlite.close();
  });

  it('rejects the pre-accounting Corporate Assets financial projection shape', () => {
    const sqlite = new Database(':memory:');

    sqlite.exec(`CREATE TABLE asset_register (
      id TEXT PRIMARY KEY,
      asset_number TEXT NOT NULL UNIQUE,
      managed_asset_id TEXT,
      acquisition_value_minor INTEGER NOT NULL DEFAULT 0,
      current_book_value_minor INTEGER NOT NULL DEFAULT 0
    )`);

    expect(() => runMigrations(sqlite)).toThrow(/asset_register missing source_journal_entry_id/u);
    sqlite.close();
  });

  it('drops obsolete pre-cleanup tables during demo reset', () => {
    const sqlite = new Database(':memory:');

    sqlite.exec(`CREATE TABLE ${oldTablePrefix.toUpperCase()}stations (id TEXT PRIMARY KEY)`);
    sqlite.exec(`CREATE TABLE ${oldManifestRebuildTable.toUpperCase()} (id TEXT PRIMARY KEY)`);

    dropDemoDatabase(sqlite);

    expect(tableNames(sqlite)).not.toEqual(
      expect.arrayContaining([
        `${oldTablePrefix.toUpperCase()}stations`,
        oldManifestRebuildTable.toUpperCase()
      ])
    );
    runMigrations(sqlite);

    sqlite.close();
  });

  it('restores FK enforcement after a migration failure', () => {
    const sqlite = new Database(':memory:');

    sqlite.pragma('foreign_keys = ON');
    sqlite.exec('CREATE TABLE flight_types (id TEXT PRIMARY KEY)');

    expect(() => runMigrations(sqlite)).toThrow(/no column named code/u);
    expect(foreignKeysEnabled(sqlite)).toBe(1);

    sqlite.close();
  });

  it('creates canonical tables without old reference prefixes', () => {
    const sqlite = new Database(':memory:');

    runMigrations(sqlite);
    expect(foreignKeysEnabled(sqlite)).toBe(1);

    const tables = tableNames(sqlite);
    expect(tables.filter((table) => table.startsWith(oldTablePrefix))).toEqual([]);
    expect(tables.filter((table) => table.includes('legacy'))).toEqual([]);
    expect(tables).not.toEqual(
      expect.arrayContaining([
        'flight_orders',
        'manifests',
        'fuel_requests',
        'fuel_uplifts',
        'station_expenses',
        'approvals',
        'alerts',
        'maintenance_work_orders',
        'serialized_parts'
      ])
    );
    expect(tables).toEqual(
      expect.arrayContaining([
        'aircraft',
        'stations',
        'routes',
        'customers',
        'flight_types',
        'flight_service_types',
        'flight_operation_statuses',
        'manifest_statuses',
        'ticketing_sales',
        'passenger_tickets',
        'cargo_bookings',
        'ticketing_refund_requests',
        'passenger_ticket_reschedules',
        'accounting_periods',
        'product_accounting_profiles',
        'accounting_policies',
        'accounting_events',
        'accounting_exceptions',
        'journal_entries',
        'journal_lines',
        'asset_register',
        'depreciation_schedules',
        'invoice_line_items',
        'invoice_finance_snapshots'
      ])
    );
    const routeColumns = (
      sqlite.prepare('PRAGMA table_info(routes)').all() as Array<{ name: string }>
    ).map((column) => column.name);
    expect(routeColumns).toEqual(
      expect.arrayContaining(['operational_notes', 'restriction_level', 'restriction_note'])
    );
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);

    sqlite.close();
  });

  it('upgrades depreciation schedules to support cancellation on asset reversal', () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    sqlite.exec('DROP TABLE depreciation_schedules');
    sqlite.exec(`CREATE TABLE depreciation_schedules (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL REFERENCES asset_register(id) ON DELETE CASCADE,
      period_id TEXT NOT NULL REFERENCES accounting_periods(id),
      depreciation_amount_minor INTEGER NOT NULL CHECK (depreciation_amount_minor >= 0),
      status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'POSTED')),
      journal_entry_id TEXT REFERENCES journal_entries(id),
      created_at TEXT NOT NULL,
      UNIQUE (asset_id, period_id)
    )`);

    runMigrations(sqlite);

    const table = sqlite
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'depreciation_schedules'"
      )
      .get() as { sql: string };
    expect(table.sql).toContain("'CANCELLED'");
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    sqlite.close();
  });

  it('adds readiness assurance columns to an existing readiness table', () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    sqlite.exec('DROP TABLE flight_readiness_checks');
    sqlite.exec(`CREATE TABLE flight_readiness_checks (
      id TEXT PRIMARY KEY,
      flight_id TEXT NOT NULL,
      check_code TEXT NOT NULL,
      check_name TEXT NOT NULL,
      status_id TEXT NOT NULL,
      is_required INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (flight_id, check_code)
    )`);

    runMigrations(sqlite);

    const columns = (
      sqlite.prepare('PRAGMA table_info(flight_readiness_checks)').all() as Array<{ name: string }>
    ).map((column) => column.name);
    expect(columns).toEqual(
      expect.arrayContaining([
        'classification',
        'calculation_status',
        'verification_status',
        'effective_status',
        'calculated_at',
        'expiry_at',
        'invalidation_reason',
        'source_record_ids'
      ])
    );
    sqlite.close();
  });

  it('enforces positive distance and duration for fresh route tables', () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const station = sqlite.prepare(`INSERT INTO stations (
      id, station_code, station_name, city_or_region, province, airport_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    station.run('origin', 'ORG', 'Origin', 'Origin', 'Papua', 'AIRPORT', 'now', 'now');
    station.run(
      'destination',
      'DST',
      'Destination',
      'Destination',
      'Papua',
      'AIRPORT',
      'now',
      'now'
    );

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO routes (
          id, route_code, origin_station_id, destination_station_id,
          estimated_duration_minutes, distance_km, created_at, updated_at
        ) VALUES ('route-zero', 'ORG-DST', 'origin', 'destination', 20, 0, 'now', 'now')`
        )
        .run()
    ).toThrow(/CHECK constraint failed/u);
    sqlite.close();
  });

  it('adds station ownership to inventory repair orders created by an older schema', () => {
    const sqlite = new Database(':memory:');

    runMigrations(sqlite);
    sqlite.exec('DROP TABLE inventory_repair_orders');
    sqlite.exec(`CREATE TABLE inventory_repair_orders (
      id TEXT PRIMARY KEY,
      repair_number TEXT NOT NULL UNIQUE,
      serial_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      expected_return_at TEXT,
      status TEXT NOT NULL,
      source_repair_cost_minor INTEGER NOT NULL DEFAULT 0,
      currency_id TEXT,
      exchange_rate_to_idr_micros INTEGER NOT NULL DEFAULT 1000000,
      base_repair_cost_idr INTEGER NOT NULL DEFAULT 0,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    runMigrations(sqlite);

    expect(
      (
        sqlite.prepare('PRAGMA table_info(inventory_repair_orders)').all() as Array<{
          name: string;
        }>
      ).map((column) => column.name)
    ).toContain('station_id');
    sqlite.close();
  });

  it('keeps manifest child foreign keys pointing at flight_manifests', () => {
    const sqlite = new Database(':memory:');

    runMigrations(sqlite);

    const passengerParents = foreignKeyParents(sqlite, 'flight_manifest_passengers');
    const cargoParents = foreignKeyParents(sqlite, 'flight_manifest_cargo_items');
    expect(passengerParents).toContain('flight_manifests');
    expect(cargoParents).toContain('flight_manifests');
    expect([...passengerParents, ...cargoParents].some((parent) => parent.includes('legacy'))).toBe(
      false
    );

    sqlite.close();
  });

  it('creates ticketing ownership and OCC sales foreign keys', () => {
    const sqlite = new Database(':memory:');

    runMigrations(sqlite);

    expect(foreignKeyParents(sqlite, 'ticketing_sales')).toContain('flight_operations');
    expect(foreignKeyParents(sqlite, 'flight_manifests')).toContain('flight_operations');
    expect(foreignKeyParents(sqlite, 'passenger_tickets')).toContain('flight_operations');
    expect(foreignKeyParents(sqlite, 'cargo_bookings')).toEqual(
      expect.arrayContaining(['flight_operations', 'agents', 'dg_categories'])
    );
    expect(foreignKeyParents(sqlite, 'ticketing_refund_requests')).toEqual(
      expect.arrayContaining(['flight_operations', 'passenger_tickets', 'cargo_bookings'])
    );
    expect(foreignKeyParents(sqlite, 'passenger_ticket_reschedules')).toEqual(
      expect.arrayContaining(['passenger_tickets', 'flight_operations'])
    );
    expect(foreignKeyParents(sqlite, 'invoices')).toContain('flight_operations');
    expect(foreignKeyParents(sqlite, 'invoice_line_items')).toEqual(
      expect.arrayContaining(['invoices', 'rate_cards', 'tax_codes'])
    );
    expect(foreignKeyParents(sqlite, 'invoice_finance_snapshots')).toEqual(
      expect.arrayContaining(['invoices', 'flight_operations'])
    );
    expect(foreignKeyParents(sqlite, 'flight_manifest_passengers')).toContain('passenger_tickets');
    expect(foreignKeyParents(sqlite, 'flight_manifest_cargo_items')).toContain('cargo_bookings');
    const passengerIndexes = sqlite
      .prepare("PRAGMA index_list('passenger_tickets')")
      .all() as Array<{ name: string; unique: number }>;
    expect(passengerIndexes).toContainEqual(
      expect.objectContaining({ name: 'passenger_tickets_flight_seat_unique', unique: 1 })
    );
    const passengerSeatIndex = sqlite
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'passenger_tickets_flight_seat_unique'"
      )
      .get() as { sql: string };
    expect(passengerSeatIndex.sql).toContain("WHERE ticket_status = 'ACTIVE'");
    const refundIndexes = sqlite
      .prepare("PRAGMA index_list('ticketing_refund_requests')")
      .all() as Array<{ name: string; unique: number; partial: number }>;
    expect(refundIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'ticketing_refunds_open_passenger_unique',
          unique: 1,
          partial: 1
        }),
        expect.objectContaining({
          name: 'ticketing_refunds_open_cargo_unique',
          unique: 1,
          partial: 1
        })
      ])
    );
    const manifestPassengerIndexes = sqlite
      .prepare("PRAGMA index_list('flight_manifest_passengers')")
      .all() as Array<{ name: string; unique: number }>;
    expect(manifestPassengerIndexes).toContainEqual(
      expect.objectContaining({
        name: 'flight_manifest_passengers_manifest_seat_unique',
        unique: 1
      })
    );

    sqlite.close();
  });

  it('creates immutable invoice and booking finance snapshot constraints', () => {
    const sqlite = new Database(':memory:');

    runMigrations(sqlite);

    const invoiceColumns = sqlite.prepare("PRAGMA table_info('invoices')").all() as Array<{
      name: string;
      notnull: number;
    }>;
    expect(invoiceColumns.find((column) => column.name === 'issued_at')?.notnull).toBe(0);
    expect(invoiceColumns.find((column) => column.name === 'due_at')?.notnull).toBe(0);

    const sourceIndexes = sqlite.prepare("PRAGMA index_list('invoice_line_items')").all() as Array<{
      name: string;
      unique: number;
      origin: string;
    }>;
    expect(sourceIndexes).toContainEqual(expect.objectContaining({ unique: 1, origin: 'u' }));

    for (const table of ['passenger_tickets', 'cargo_bookings']) {
      const columns = sqlite.prepare(`PRAGMA table_info('${table}')`).all() as Array<{
        name: string;
      }>;
      expect(columns.map((column) => column.name)).toEqual(
        expect.arrayContaining([
          'rate_card_id',
          'tax_code_id',
          'tax_code',
          'tax_rate_basis_points',
          'tax_amount',
          'total_amount',
          'currency_code'
        ])
      );
    }
    const fuelColumns = sqlite.prepare("PRAGMA table_info('flight_fuel_requests')").all() as Array<{
      name: string;
    }>;
    expect(fuelColumns.map((column) => column.name)).toContain('currency_id');

    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    sqlite.close();
  });

  it('seeds lookup IDs without ref prefixes and has no FK violations', () => {
    const sqlite = new Database(':memory:');

    runMigrations(sqlite);

    const lookupIds = sqlite
      .prepare(
        `SELECT id FROM flight_types
         UNION ALL SELECT id FROM flight_operation_statuses
         UNION ALL SELECT id FROM dg_acceptance_statuses`
      )
      .all() as Array<{ id: string }>;

    expect(lookupIds.length).toBeGreaterThan(0);
    expect(lookupIds.every((row) => !row.id.startsWith(oldIdPrefix))).toBe(true);
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);

    sqlite.close();
  });
});

describe('manifest assurance migration', () => {
  function columnNames(sqlite: Database.Database, table: string) {
    return (sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
      (column) => column.name
    );
  }

  function insertStationAndRoute(sqlite: Database.Database) {
    const station = sqlite.prepare(`INSERT INTO stations (
      id, station_code, station_name, city_or_region, province, airport_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'now', 'now')`);
    station.run('sta-org', 'ORG', 'Origin', 'Origin', 'Papua', 'AIRPORT');
    station.run('sta-dst', 'DST', 'Destination', 'Destination', 'Papua', 'AIRPORT');
    sqlite
      .prepare(
        `INSERT INTO routes (
           id, route_code, origin_station_id, destination_station_id,
           estimated_duration_minutes, distance_km, created_at, updated_at
         ) VALUES ('route-org-dst', 'ORG-DST', 'sta-org', 'sta-dst', 60, 120, 'now', 'now')`
      )
      .run();
  }

  function insertFlight(sqlite: Database.Database, id: string, statusLookupId: string) {
    sqlite
      .prepare(
        `INSERT INTO flight_operations (
           id, order_number, flight_number, flight_date, flight_type_id, service_type_id,
           priority_id, route_id, origin_station_id, destination_station_id,
           current_status_id, created_at, updated_at
         ) VALUES (?, ?, ?, '2026-08-01', 'flight-type-passenger', 'flight-service-type-scheduled-passenger',
                   'flight-priority-normal', 'route-org-dst', 'sta-org', 'sta-dst', ?, 'now', 'now')`
      )
      .run(id, `ORD-${id}`, `FLT-${id}`, statusLookupId);
  }

  it('adds manifest assurance columns and seeds new statuses and action types', () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);

    expect(columnNames(sqlite, 'flight_readiness_checks')).toContain('assurance_phase');
    expect(columnNames(sqlite, 'flight_operational_audit')).toEqual(
      expect.arrayContaining(['before_version', 'after_version'])
    );
    expect(columnNames(sqlite, 'flight_manifests')).toEqual(
      expect.arrayContaining([
        'version',
        'submitted_by_user_id',
        'submitted_at',
        'locked_by_user_id',
        'rejection_reason',
        'empty_load_reason',
        'empty_load_confirmed_by_user_id',
        'empty_load_confirmed_at'
      ])
    );
    expect(columnNames(sqlite, 'flight_manifest_cargo_items')).toEqual(
      expect.arrayContaining([
        'dg_decided_by_user_id',
        'dg_decided_at',
        'dg_decision_reason',
        'dg_evidence_ids'
      ])
    );

    const statusCodes = (
      sqlite.prepare('SELECT code FROM flight_operation_statuses').all() as Array<{ code: string }>
    ).map((row) => row.code);
    expect(statusCodes).toEqual(expect.arrayContaining(['CHECK_IN_CLOSED', 'READY_FOR_DEPARTURE']));
    const actionCodes = (
      sqlite.prepare('SELECT code FROM flight_action_types').all() as Array<{ code: string }>
    ).map((row) => row.code);
    expect(actionCodes).toEqual(
      expect.arrayContaining([
        'CLOSE_CHECK_IN',
        'DEPARTURE_ASSURANCE_EVALUATED',
        'MARK_READY_FOR_DEPARTURE',
        'MANIFEST_SUBMIT',
        'MANIFEST_APPROVE',
        'MANIFEST_REJECT',
        'MANIFEST_LOCK',
        'MANIFEST_UNLOCK',
        'DG_ACCEPT',
        'DG_REJECT'
      ])
    );
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    sqlite.close();
  });

  it('backfills assurance phase and creates departure checks only for planning-approved flights', () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    insertStationAndRoute(sqlite);
    insertFlight(sqlite, 'flt-scheduled', 'flight-operation-status-scheduled');
    insertFlight(sqlite, 'flt-closed', 'flight-operation-status-closed');

    const insertCheck = sqlite.prepare(`INSERT INTO flight_readiness_checks (
      id, flight_id, check_code, check_name, status_id, is_required, created_at, updated_at
    ) VALUES (?, 'flt-scheduled', ?, ?, 'readiness-status-pass', 1, 'now', 'now')`);
    insertCheck.run('rc-route', 'ROUTE_AVAILABILITY', 'Route availability');
    insertCheck.run('rc-docs', 'REQUIRED_DOCUMENTS', 'Required documents');

    // Re-run: backfill applies and is idempotent.
    runMigrations(sqlite);
    runMigrations(sqlite);

    const phases = sqlite
      .prepare(
        `SELECT check_code AS code, assurance_phase AS phase
         FROM flight_readiness_checks WHERE flight_id = 'flt-scheduled'`
      )
      .all() as Array<{ code: string; phase: string | null }>;
    const phaseByCode = new Map(phases.map((row) => [row.code, row.phase]));
    expect(phaseByCode.get('ROUTE_AVAILABILITY')).toBe('PLANNING');
    expect(phaseByCode.get('REQUIRED_DOCUMENTS')).toBe('DEPARTURE');

    for (const code of [
      'MANIFEST_LOCKED',
      'DG_ACCEPTANCE',
      'FUEL_CONFIRMED',
      'HANDLING_CONFIRMED',
      'DEPARTURE_DOCUMENTS',
      'ORIGIN_OPERATIONAL_TASKS',
      'ORIGIN_STATION_SIGNOFF'
    ]) {
      expect(phaseByCode.get(code)).toBe('DEPARTURE');
    }

    const closedDepartureChecks = sqlite
      .prepare(
        `SELECT COUNT(*) AS count FROM flight_readiness_checks
         WHERE flight_id = 'flt-closed' AND assurance_phase = 'DEPARTURE'`
      )
      .get() as { count: number };
    expect(closedDepartureChecks.count).toBe(0);

    const scheduledCheckCount = sqlite
      .prepare(
        `SELECT COUNT(*) AS count FROM flight_readiness_checks WHERE flight_id = 'flt-scheduled'`
      )
      .get() as { count: number };
    expect(scheduledCheckCount.count).toBe(9);
    sqlite.close();
  });

  it('preserves locked manifest actor during backfill', () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    insertStationAndRoute(sqlite);
    insertFlight(sqlite, 'flt-locked', 'flight-operation-status-scheduled');
    sqlite
      .prepare(
        `INSERT INTO flight_manifests (
           id, flight_operation_id, manifest_type_id, status_id,
           approved_by_user_id, approved_at, locked_at, created_at, updated_at
         ) VALUES ('manifest-locked', 'flt-locked', 'manifest-type-passenger', 'manifest-status-locked',
                   'USR-001', 'now', 'now', 'now', 'now')`
      )
      .run();

    runMigrations(sqlite);

    const manifest = sqlite
      .prepare(
        `SELECT version, locked_by_user_id AS lockedBy FROM flight_manifests WHERE id = 'manifest-locked'`
      )
      .get() as { version: number; lockedBy: string | null };
    expect(manifest.version).toBe(1);
    expect(manifest.lockedBy).toBe('USR-001');
    sqlite.close();
  });
});
