export const commercialMasterDataStatements = [
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    account_code TEXT NOT NULL UNIQUE,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    billing_address TEXT,
    payment_term_id TEXT REFERENCES payment_terms(id),
    credit_limit INTEGER CHECK (credit_limit IS NULL OR credit_limit >= 0),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    agent_code TEXT NOT NULL UNIQUE,
    agent_name TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    station_id TEXT REFERENCES stations(id),
    commission_basis_points INTEGER CHECK (commission_basis_points IS NULL OR commission_basis_points >= 0),
    contact_person TEXT,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rate_cards (
    id TEXT PRIMARY KEY,
    rate_code TEXT NOT NULL UNIQUE,
    service_type TEXT NOT NULL,
    origin_station_id TEXT NOT NULL REFERENCES stations(id),
    destination_station_id TEXT NOT NULL REFERENCES stations(id),
    customer_id TEXT REFERENCES customers(id),
    aircraft_type TEXT,
    currency_id TEXT NOT NULL REFERENCES currencies(id),
    tax_code_id TEXT REFERENCES tax_codes(id),
    base_rate INTEGER NOT NULL CHECK (base_rate >= 0),
    rate_unit TEXT NOT NULL,
    pricing_scope TEXT NOT NULL DEFAULT 'PUBLIC_COUNTER' CHECK (pricing_scope IN ('PUBLIC_COUNTER', 'CORPORATE_CONTRACT', 'CARGO_CONTRACT', 'CHARTER_CONTRACT')),
    booking_channel TEXT NOT NULL DEFAULT 'COUNTER' CHECK (booking_channel IN ('COUNTER', 'AGENT', 'CORPORATE', 'CARGO', 'CHARTER')),
    passenger_type TEXT CHECK (passenger_type IS NULL OR passenger_type IN ('ADULT', 'CHILD', 'INFANT')),
    cargo_price_basis TEXT CHECK (cargo_price_basis IS NULL OR cargo_price_basis IN ('ACTUAL_WEIGHT', 'VOLUME_WEIGHT', 'CHARGEABLE_WEIGHT')),
    rate_priority INTEGER NOT NULL DEFAULT 100 CHECK (rate_priority >= 0),
    minimum_charge INTEGER CHECK (minimum_charge IS NULL OR minimum_charge >= 0),
    demo_usage_note TEXT,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (origin_station_id <> destination_station_id),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_rate_cards_active ON rate_cards(is_active)`
];

export const commercialMasterDataDropStatements = [
  'DROP TABLE IF EXISTS customers',
  'DROP TABLE IF EXISTS agents',
  'DROP TABLE IF EXISTS rate_cards'
];
