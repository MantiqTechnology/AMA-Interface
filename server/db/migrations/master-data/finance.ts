export const financeMasterDataStatements = [
  `CREATE TABLE IF NOT EXISTS currencies (
    id TEXT PRIMARY KEY,
    currency_code TEXT NOT NULL UNIQUE,
    currency_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    decimal_places INTEGER NOT NULL CHECK (decimal_places >= 0),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS payment_terms (
    id TEXT PRIMARY KEY,
    term_code TEXT NOT NULL UNIQUE,
    term_name TEXT NOT NULL,
    due_days INTEGER NOT NULL CHECK (due_days >= 0),
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id TEXT PRIMARY KEY,
    account_code TEXT NOT NULL UNIQUE,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    normal_balance TEXT NOT NULL,
    parent_account_id TEXT REFERENCES chart_of_accounts(id),
    is_postable INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (parent_account_id IS NULL OR parent_account_id <> id)
  )`,
  `CREATE TABLE IF NOT EXISTS cost_categories (
    id TEXT PRIMARY KEY,
    category_code TEXT NOT NULL UNIQUE,
    category_name TEXT NOT NULL,
    cost_group TEXT NOT NULL,
    default_coa_id TEXT REFERENCES chart_of_accounts(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    vendor_code TEXT NOT NULL UNIQUE,
    vendor_name TEXT NOT NULL,
    vendor_type TEXT NOT NULL,
    station_id TEXT REFERENCES stations(id),
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    payment_term_id TEXT REFERENCES payment_terms(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS fuel_suppliers (
    id TEXT PRIMARY KEY,
    supplier_code TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    station_id TEXT NOT NULL REFERENCES stations(id),
    fuel_type TEXT NOT NULL,
    reference_price_per_litre INTEGER NOT NULL CHECK (reference_price_per_litre >= 0),
    currency_id TEXT NOT NULL REFERENCES currencies(id),
    contact_person TEXT,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS station_service_suppliers (
    id TEXT PRIMARY KEY,
    supplier_code TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    station_id TEXT NOT NULL REFERENCES stations(id),
    service_type TEXT NOT NULL,
    reference_rate INTEGER CHECK (reference_rate IS NULL OR reference_rate >= 0),
    currency_id TEXT REFERENCES currencies(id),
    contact_person TEXT,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tax_codes (
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
  `CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active)`
];

export const financeMasterDataDropStatements = [
  'DROP TABLE IF EXISTS currencies',
  'DROP TABLE IF EXISTS payment_terms',
  'DROP TABLE IF EXISTS chart_of_accounts',
  'DROP TABLE IF EXISTS cost_categories',
  'DROP TABLE IF EXISTS vendors',
  'DROP TABLE IF EXISTS fuel_suppliers',
  'DROP TABLE IF EXISTS station_service_suppliers',
  'DROP TABLE IF EXISTS tax_codes'
];
