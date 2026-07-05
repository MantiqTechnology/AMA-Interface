import type Database from 'better-sqlite3';

const createStatements = [
  `CREATE TABLE IF NOT EXISTS aircraft (
    id TEXT PRIMARY KEY,
    tail_number TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    display_name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'available'
  )`,
  `CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    province TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    origin_station_id TEXT NOT NULL REFERENCES stations(id),
    destination_station_id TEXT NOT NULL REFERENCES stations(id),
    distance_nm INTEGER NOT NULL,
    estimated_block_minutes INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    contact_email TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS flight_orders (
    id TEXT PRIMARY KEY,
    flight_number TEXT NOT NULL UNIQUE,
    order_number TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    route_id TEXT NOT NULL REFERENCES routes(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    status TEXT NOT NULL DEFAULT 'draft',
    scheduled_departure TEXT NOT NULL,
    scheduled_arrival TEXT NOT NULL,
    purpose TEXT NOT NULL,
    quoted_amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR'
  )`,
  `CREATE TABLE IF NOT EXISTS manifests (
    id TEXT PRIMARY KEY,
    flight_order_id TEXT NOT NULL REFERENCES flight_orders(id) ON DELETE CASCADE,
    passenger_name TEXT NOT NULL,
    document_number TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    remarks TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS fuel_requests (
    id TEXT PRIMARY KEY,
    flight_order_id TEXT NOT NULL REFERENCES flight_orders(id),
    station_id TEXT NOT NULL REFERENCES stations(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    requested_liters REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    requested_by TEXT NOT NULL,
    required_at TEXT NOT NULL,
    notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS fuel_uplifts (
    id TEXT PRIMARY KEY,
    fuel_request_id TEXT NOT NULL REFERENCES fuel_requests(id) ON DELETE CASCADE,
    supplier TEXT NOT NULL,
    liters REAL NOT NULL,
    unit_price REAL NOT NULL,
    total REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    uplifted_at TEXT NOT NULL,
    receipt_path TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS station_expenses (
    id TEXT PRIMARY KEY,
    station_id TEXT NOT NULL REFERENCES stations(id),
    flight_order_id TEXT REFERENCES flight_orders(id),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    status TEXT NOT NULL DEFAULT 'draft',
    receipt_path TEXT,
    incurred_at TEXT NOT NULL,
    submitted_by TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_work_orders (
    id TEXT PRIMARY KEY,
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'open',
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    due_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS serialized_parts (
    id TEXT PRIMARY KEY,
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    part_number TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    installed_at TEXT,
    work_order_id TEXT REFERENCES maintenance_work_orders(id)
  )`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    flight_order_id TEXT NOT NULL REFERENCES flight_orders(id),
    invoice_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft',
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    issued_at TEXT NOT NULL,
    due_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    paid_at TEXT NOT NULL,
    method TEXT NOT NULL,
    reference TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    domain_entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    role_required TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    decided_by TEXT,
    decided_at TEXT,
    reason TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_flight_orders_status ON flight_orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_fuel_requests_status ON fuel_requests(status)`,
  `CREATE INDEX IF NOT EXISTS idx_station_expenses_status ON station_expenses(status)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at)`
];

const dropStatements = [
  'DROP TABLE IF EXISTS alerts',
  'DROP TABLE IF EXISTS approvals',
  'DROP TABLE IF EXISTS payments',
  'DROP TABLE IF EXISTS invoices',
  'DROP TABLE IF EXISTS serialized_parts',
  'DROP TABLE IF EXISTS maintenance_work_orders',
  'DROP TABLE IF EXISTS station_expenses',
  'DROP TABLE IF EXISTS fuel_uplifts',
  'DROP TABLE IF EXISTS fuel_requests',
  'DROP TABLE IF EXISTS manifests',
  'DROP TABLE IF EXISTS flight_orders',
  'DROP TABLE IF EXISTS customers',
  'DROP TABLE IF EXISTS routes',
  'DROP TABLE IF EXISTS stations',
  'DROP TABLE IF EXISTS aircraft'
];

export function runMigrations(sqlite: Database.Database) {
  sqlite.pragma('foreign_keys = ON');
  const migrate = sqlite.transaction(() => {
    for (const statement of createStatements) {
      sqlite.exec(statement);
    }
  });

  migrate();
}

export function dropDemoDatabase(sqlite: Database.Database) {
  sqlite.pragma('foreign_keys = OFF');
  const drop = sqlite.transaction(() => {
    for (const statement of dropStatements) {
      sqlite.exec(statement);
    }
  });

  drop();
  sqlite.pragma('foreign_keys = ON');
}
