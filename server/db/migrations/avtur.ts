export const avturStatements = [
  // ── Current Avtur hardware, CoC, and telemetry model ──────────────────
  // These tables back server/db/schema/avtur.ts and its demo seed.
  `CREATE TABLE IF NOT EXISTS avtur_assets (
    id TEXT PRIMARY KEY,
    asset_code TEXT NOT NULL UNIQUE,
    asset_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('SKID_ASSEMBLY', 'FLOWMETER_BLE', 'SOLENOID_VALVE', 'RFID_TAG', 'EFB_TABLET')),
    brand_model TEXT,
    serial_number_physical TEXT NOT NULL,
    serial_number_coc TEXT NOT NULL,
    ex_rating TEXT,
    station_id TEXT NOT NULL REFERENCES stations(id),
    coc_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (coc_status IN ('PENDING', 'OK', 'REJECT')),
    operational_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (operational_status IN ('ACTIVE', 'INSPECTION_DUE', 'QUARANTINE', 'DECOMMISSIONED')),
    installed_at TEXT,
    last_calibrated_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_assets_station ON avtur_assets(station_id)`,
  `CREATE TABLE IF NOT EXISTS avtur_coc_verifications (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL REFERENCES avtur_assets(id) ON DELETE CASCADE,
    verified_by TEXT NOT NULL,
    physical_sn_input TEXT NOT NULL,
    coc_document_sn_input TEXT NOT NULL,
    verification_result TEXT NOT NULL CHECK (verification_result IN ('MATCH_OK', 'MISMATCH_REJECT')),
    notes TEXT,
    verified_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS avtur_transactions (
    id TEXT PRIMARY KEY,
    transaction_no TEXT NOT NULL UNIQUE,
    workflow_type TEXT NOT NULL CHECK (workflow_type IN ('DPPU_TO_AIRCRAFT', 'DPPU_TO_DRUM', 'DRUM_TRANSFER', 'DRUM_TO_AIRCRAFT', 'CONSOLIDATION')),
    source_asset_id TEXT NOT NULL REFERENCES avtur_assets(id),
    target_asset_id TEXT REFERENCES avtur_assets(id),
    flight_mission_id TEXT,
    aircraft_tail_no TEXT,
    flowmeter_start_kg REAL NOT NULL,
    flowmeter_end_kg REAL NOT NULL,
    total_volume_liters REAL NOT NULL,
    density_measured REAL NOT NULL,
    temperature_celsius REAL NOT NULL,
    grounding_verified INTEGER NOT NULL CHECK (grounding_verified IN (0, 1)),
    swd_test_passed INTEGER NOT NULL CHECK (swd_test_passed IN (0, 1)),
    seal_intact INTEGER NOT NULL CHECK (seal_intact IN (0, 1)),
    settling_time_passed INTEGER NOT NULL CHECK (settling_time_passed IN (0, 1)),
    solenoid_cutoff_triggered INTEGER NOT NULL DEFAULT 0 CHECK (solenoid_cutoff_triggered IN (0, 1)),
    operator_id TEXT NOT NULL,
    synced_from_device INTEGER NOT NULL DEFAULT 0 CHECK (synced_from_device IN (0, 1)),
    created_timestamp TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_transactions_created ON avtur_transactions(created_timestamp)`,
  // ── 1. Avtur Skids & Fuel Distribution Stations ────────────────────────
  `CREATE TABLE IF NOT EXISTS avtur_skids (
    id TEXT PRIMARY KEY,
    skid_code TEXT NOT NULL UNIQUE,
    station_id TEXT NOT NULL REFERENCES stations(id),
    name TEXT NOT NULL,
    capacity_liters REAL NOT NULL DEFAULT 0.0,
    current_volume_liters REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE')),
    last_calibrated_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_skids_station ON avtur_skids(station_id)`,

  // ── 2. Drum Inventory Management & Tracking ───────────────────────────
  `CREATE TABLE IF NOT EXISTS avtur_drums (
    id TEXT PRIMARY KEY,
    drum_serial_number TEXT NOT NULL UNIQUE,
    station_id TEXT NOT NULL REFERENCES stations(id),
    batch_number TEXT NOT NULL,
    capacity_liters REAL NOT NULL DEFAULT 200.0,
    current_liters REAL NOT NULL DEFAULT 200.0,
    seal_number TEXT,
    status TEXT NOT NULL DEFAULT 'SEALED' CHECK (status IN ('SEALED', 'IN_USE', 'EMPTY', 'QUARANTINE', 'DISCARDED')),
    received_at TEXT NOT NULL,
    opened_at TEXT,
    emptied_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_drums_station ON avtur_drums(station_id)`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_drums_status ON avtur_drums(status)`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_drums_batch ON avtur_drums(batch_number)`,

  // ── 3. Smart Fueling Hardware & IoT Telemetry Devices ─────────────────
  `CREATE TABLE IF NOT EXISTS avtur_devices (
    id TEXT PRIMARY KEY,
    device_code TEXT NOT NULL UNIQUE,
    device_type TEXT NOT NULL CHECK (device_type IN ('FLOWMETER', 'ULTRASONIC_SENSOR', 'SMART_NOZZLE', 'GROUNDING_CLAMP', 'RUGGED_TABLET')),
    skid_id TEXT REFERENCES avtur_skids(id) ON DELETE SET NULL,
    station_id TEXT NOT NULL REFERENCES stations(id),
    mac_address TEXT,
    firmware_version TEXT,
    battery_level_percent INTEGER CHECK (battery_level_percent BETWEEN 0 AND 100),
    is_online INTEGER NOT NULL DEFAULT 1 CHECK (is_online IN (0, 1)),
    last_seen_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_devices_station ON avtur_devices(station_id)`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_devices_skid ON avtur_devices(skid_id)`,

  // ── 4. Fuel Refueling Transactions (Offline-First Ready) ───────────────
  `CREATE TABLE IF NOT EXISTS avtur_fuel_transactions (
    id TEXT PRIMARY KEY,
    transaction_number TEXT NOT NULL UNIQUE,
    station_id TEXT NOT NULL REFERENCES stations(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    flight_operation_id TEXT REFERENCES flight_operations(id),
    skid_id TEXT REFERENCES avtur_skids(id),
    drum_id TEXT REFERENCES avtur_drums(id),
    flowmeter_device_id TEXT REFERENCES avtur_devices(id),
    start_volume_liters REAL NOT NULL,
    end_volume_liters REAL NOT NULL,
    dispensed_liters REAL NOT NULL,
    density_g_cm3 REAL NOT NULL DEFAULT 0.80,
    temperature_celsius REAL,
    operator_user_id TEXT NOT NULL REFERENCES crews(id),
    sync_status TEXT NOT NULL DEFAULT 'SYNCED' CHECK (sync_status IN ('PENDING', 'SYNCED', 'CONFLICT')),
    synced_at TEXT,
    dispensed_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_tx_station ON avtur_fuel_transactions(station_id)`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_tx_aircraft ON avtur_fuel_transactions(aircraft_id)`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_tx_dispensed ON avtur_fuel_transactions(dispensed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_tx_sync ON avtur_fuel_transactions(sync_status)`,

  // ── 5. Fuel Quality Control (QC) & JIG Standards Inspections ──────────
  `CREATE TABLE IF NOT EXISTS avtur_qc_inspections (
    id TEXT PRIMARY KEY,
    inspection_number TEXT NOT NULL UNIQUE,
    station_id TEXT NOT NULL REFERENCES stations(id),
    skid_id TEXT REFERENCES avtur_skids(id),
    drum_id TEXT REFERENCES avtur_drums(id),
    inspection_type TEXT NOT NULL CHECK (inspection_type IN ('DAILY_DRAIN', 'BATCH_RECEIPT', 'FILTER_DELTA_P', 'WATER_DETECTOR')),
    appearance_pass INTEGER NOT NULL DEFAULT 1 CHECK (appearance_pass IN (0, 1)),
    water_check_pass INTEGER NOT NULL DEFAULT 1 CHECK (water_check_pass IN (0, 1)),
    density_observed REAL NOT NULL,
    temperature_celsius REAL NOT NULL,
    differential_pressure_psi REAL,
    inspector_user_id TEXT NOT NULL REFERENCES crews(id),
    overall_result TEXT NOT NULL DEFAULT 'PASS' CHECK (overall_result IN ('PASS', 'FAIL', 'WARNING')),
    remarks TEXT,
    inspected_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_qc_station ON avtur_qc_inspections(station_id)`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_qc_result ON avtur_qc_inspections(overall_result)`,

  // ── 6. Hardware Maintenance & Calibration Logs ────────────────────────
  `CREATE TABLE IF NOT EXISTS avtur_device_maintenance_logs (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES avtur_devices(id) ON DELETE CASCADE,
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('CALIBRATION', 'BATTERY_REPLACEMENT', 'REPAIR', 'FIRMWARE_UPDATE')),
    performed_by TEXT NOT NULL,
    notes TEXT,
    next_calibration_due TEXT,
    performed_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_maint_device ON avtur_device_maintenance_logs(device_id)`,

  // ── 7. Avtur Immutable Audit Logs & Triggers ──────────────────────────
  `CREATE TABLE IF NOT EXISTS avtur_audit_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    before_snapshot_json TEXT,
    after_snapshot_json TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_audit_entity ON avtur_audit_logs(entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_avtur_audit_occurred ON avtur_audit_logs(occurred_at)`,

  // Trigger untuk menjamin Immutable Audit Trail
  `CREATE TRIGGER IF NOT EXISTS trg_avtur_audit_log_no_update
    BEFORE UPDATE ON avtur_audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'avtur audit logs are append-only and immutable');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_avtur_audit_log_no_delete
    BEFORE DELETE ON avtur_audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'avtur audit logs are append-only and cannot be deleted');
    END`
];

export const avturDropStatements = [
  'DROP TABLE IF EXISTS avtur_transactions',
  'DROP TABLE IF EXISTS avtur_coc_verifications',
  'DROP TABLE IF EXISTS avtur_assets',
  'DROP TRIGGER IF EXISTS trg_avtur_audit_log_no_delete',
  'DROP TRIGGER IF EXISTS trg_avtur_audit_log_no_update',
  'DROP TABLE IF EXISTS avtur_audit_logs',
  'DROP TABLE IF EXISTS avtur_device_maintenance_logs',
  'DROP TABLE IF EXISTS avtur_qc_inspections',
  'DROP TABLE IF EXISTS avtur_fuel_transactions',
  'DROP TABLE IF EXISTS avtur_devices',
  'DROP TABLE IF EXISTS avtur_drums',
  'DROP TABLE IF EXISTS avtur_skids'
];
