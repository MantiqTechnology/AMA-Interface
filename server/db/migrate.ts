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
  `CREATE TABLE IF NOT EXISTS ref_currencies (
    id TEXT PRIMARY KEY,
    currency_code TEXT NOT NULL UNIQUE,
    currency_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    decimal_places INTEGER NOT NULL CHECK (decimal_places >= 0),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_payment_terms (
    id TEXT PRIMARY KEY,
    term_code TEXT NOT NULL UNIQUE,
    term_name TEXT NOT NULL,
    due_days INTEGER NOT NULL CHECK (due_days >= 0),
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_stations (
    id TEXT PRIMARY KEY,
    station_code TEXT NOT NULL UNIQUE,
    station_name TEXT NOT NULL,
    city_or_region TEXT NOT NULL,
    province TEXT NOT NULL,
    airport_type TEXT NOT NULL,
    has_fuel_service INTEGER NOT NULL DEFAULT 0,
    has_handling_service INTEGER NOT NULL DEFAULT 0,
    has_parking_service INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_chart_of_accounts (
    id TEXT PRIMARY KEY,
    account_code TEXT NOT NULL UNIQUE,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    normal_balance TEXT NOT NULL,
    parent_account_id TEXT REFERENCES ref_chart_of_accounts(id),
    is_postable INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (parent_account_id IS NULL OR parent_account_id <> id)
  )`,
  `CREATE TABLE IF NOT EXISTS ref_cost_categories (
    id TEXT PRIMARY KEY,
    category_code TEXT NOT NULL UNIQUE,
    category_name TEXT NOT NULL,
    cost_group TEXT NOT NULL,
    default_coa_id TEXT REFERENCES ref_chart_of_accounts(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_aircraft (
    id TEXT PRIMARY KEY,
    registration_number TEXT NOT NULL UNIQUE,
    aircraft_type TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    passenger_capacity INTEGER NOT NULL CHECK (passenger_capacity >= 0),
    cargo_capacity_kg INTEGER NOT NULL CHECK (cargo_capacity_kg >= 0),
    fuel_type TEXT NOT NULL,
    serviceability_status TEXT NOT NULL,
    base_station_id TEXT REFERENCES ref_stations(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_routes (
    id TEXT PRIMARY KEY,
    route_code TEXT NOT NULL UNIQUE,
    origin_station_id TEXT NOT NULL REFERENCES ref_stations(id),
    destination_station_id TEXT NOT NULL REFERENCES ref_stations(id),
    estimated_duration_minutes INTEGER NOT NULL CHECK (estimated_duration_minutes >= 0),
    distance_km INTEGER NOT NULL CHECK (distance_km >= 0),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (origin_station_id, destination_station_id),
    CHECK (origin_station_id <> destination_station_id)
  )`,
  `CREATE TABLE IF NOT EXISTS ref_crews (
    id TEXT PRIMARY KEY,
    employee_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    crew_role TEXT NOT NULL,
    license_type TEXT,
    license_number TEXT,
    license_expiry_date TEXT,
    medical_expiry_date TEXT,
    base_station_id TEXT REFERENCES ref_stations(id),
    unit TEXT NOT NULL,
    employment_status TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_flight_reasons (
    id TEXT PRIMARY KEY,
    reason_code TEXT NOT NULL UNIQUE,
    reason_type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    requires_note INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_customers (
    id TEXT PRIMARY KEY,
    account_code TEXT NOT NULL UNIQUE,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    billing_address TEXT,
    payment_term_id TEXT REFERENCES ref_payment_terms(id),
    credit_limit INTEGER CHECK (credit_limit IS NULL OR credit_limit >= 0),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_agents (
    id TEXT PRIMARY KEY,
    agent_code TEXT NOT NULL UNIQUE,
    agent_name TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    station_id TEXT REFERENCES ref_stations(id),
    commission_basis_points INTEGER CHECK (commission_basis_points IS NULL OR commission_basis_points >= 0),
    contact_person TEXT,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_vendors (
    id TEXT PRIMARY KEY,
    vendor_code TEXT NOT NULL UNIQUE,
    vendor_name TEXT NOT NULL,
    vendor_type TEXT NOT NULL,
    station_id TEXT REFERENCES ref_stations(id),
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    payment_term_id TEXT REFERENCES ref_payment_terms(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_fuel_suppliers (
    id TEXT PRIMARY KEY,
    supplier_code TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    station_id TEXT NOT NULL REFERENCES ref_stations(id),
    fuel_type TEXT NOT NULL,
    reference_price_per_litre INTEGER NOT NULL CHECK (reference_price_per_litre >= 0),
    currency_id TEXT NOT NULL REFERENCES ref_currencies(id),
    contact_person TEXT,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_station_service_suppliers (
    id TEXT PRIMARY KEY,
    supplier_code TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    station_id TEXT NOT NULL REFERENCES ref_stations(id),
    service_type TEXT NOT NULL,
    reference_rate INTEGER CHECK (reference_rate IS NULL OR reference_rate >= 0),
    currency_id TEXT REFERENCES ref_currencies(id),
    contact_person TEXT,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ref_rate_cards (
    id TEXT PRIMARY KEY,
    rate_code TEXT NOT NULL UNIQUE,
    service_type TEXT NOT NULL,
    origin_station_id TEXT NOT NULL REFERENCES ref_stations(id),
    destination_station_id TEXT NOT NULL REFERENCES ref_stations(id),
    customer_id TEXT REFERENCES ref_customers(id),
    aircraft_type TEXT,
    currency_id TEXT NOT NULL REFERENCES ref_currencies(id),
    base_rate INTEGER NOT NULL CHECK (base_rate >= 0),
    rate_unit TEXT NOT NULL,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (origin_station_id <> destination_station_id),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
  )`,
  `CREATE TABLE IF NOT EXISTS ref_tax_codes (
    id TEXT PRIMARY KEY,
    tax_code TEXT NOT NULL UNIQUE,
    tax_name TEXT NOT NULL,
    tax_rate_basis_points INTEGER NOT NULL CHECK (tax_rate_basis_points >= 0),
    tax_type TEXT NOT NULL,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
  )`,
  `CREATE TABLE IF NOT EXISTS ref_dg_categories (
    id TEXT PRIMARY KEY,
    dg_code TEXT NOT NULL UNIQUE,
    dg_class TEXT NOT NULL,
    description TEXT NOT NULL,
    handling_instruction TEXT NOT NULL,
    requires_special_approval INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_flight_orders_status ON flight_orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_fuel_requests_status ON fuel_requests(status)`,
  `CREATE INDEX IF NOT EXISTS idx_station_expenses_status ON station_expenses(status)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_ref_aircraft_active ON ref_aircraft(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_ref_stations_active ON ref_stations(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_ref_routes_active ON ref_routes(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_ref_crews_active ON ref_crews(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_ref_customers_active ON ref_customers(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_ref_rate_cards_active ON ref_rate_cards(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_ref_vendors_active ON ref_vendors(is_active)`
];

const dropStatements = [
  'DROP TABLE IF EXISTS ref_dg_categories',
  'DROP TABLE IF EXISTS ref_tax_codes',
  'DROP TABLE IF EXISTS ref_rate_cards',
  'DROP TABLE IF EXISTS ref_station_service_suppliers',
  'DROP TABLE IF EXISTS ref_fuel_suppliers',
  'DROP TABLE IF EXISTS ref_vendors',
  'DROP TABLE IF EXISTS ref_agents',
  'DROP TABLE IF EXISTS ref_customers',
  'DROP TABLE IF EXISTS ref_flight_reasons',
  'DROP TABLE IF EXISTS ref_crews',
  'DROP TABLE IF EXISTS ref_routes',
  'DROP TABLE IF EXISTS ref_aircraft',
  'DROP TABLE IF EXISTS ref_cost_categories',
  'DROP TABLE IF EXISTS ref_chart_of_accounts',
  'DROP TABLE IF EXISTS ref_stations',
  'DROP TABLE IF EXISTS ref_payment_terms',
  'DROP TABLE IF EXISTS ref_currencies',
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
