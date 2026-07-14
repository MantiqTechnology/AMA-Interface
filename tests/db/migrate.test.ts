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
        'invoice_line_items',
        'invoice_finance_snapshots'
      ])
    );

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
