export const inventoryStatements = [
  `CREATE TABLE IF NOT EXISTS inventory_parts (
    id TEXT PRIMARY KEY,
    part_number TEXT NOT NULL UNIQUE,
    part_name TEXT NOT NULL,
    description TEXT,
    manufacturer TEXT NOT NULL,
    manufacturer_part_number TEXT,
    unit_of_measure TEXT NOT NULL CHECK (unit_of_measure IN ('EA', 'SET', 'KIT', 'L', 'KG', 'M')),
    lifecycle_type TEXT NOT NULL CHECK (lifecycle_type IN ('CONSUMABLE', 'EXPENDABLE', 'REPAIRABLE', 'ROTABLE')),
    tracking_type TEXT NOT NULL CHECK (tracking_type IN ('QUANTITY', 'LOT', 'SERIAL')),
    criticality TEXT NOT NULL CHECK (criticality IN ('STANDARD', 'ESSENTIAL', 'CRITICAL')),
    certificate_required INTEGER NOT NULL DEFAULT 0,
    shelf_life_days INTEGER CHECK (shelf_life_days IS NULL OR shelf_life_days > 0),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_part_applicabilities (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES inventory_parts(id) ON DELETE CASCADE,
    aircraft_type TEXT NOT NULL,
    model TEXT,
    note TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_warehouses (
    id TEXT PRIMARY KEY,
    station_id TEXT NOT NULL REFERENCES stations(id),
    warehouse_code TEXT NOT NULL UNIQUE,
    warehouse_name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_bins (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
    bin_code TEXT NOT NULL,
    bin_name TEXT NOT NULL,
    bin_type TEXT NOT NULL CHECK (bin_type IN ('USABLE', 'QUARANTINE', 'REPAIR', 'TRANSIT')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (warehouse_id, bin_code)
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_reorder_rules (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES inventory_parts(id) ON DELETE CASCADE,
    warehouse_id TEXT NOT NULL REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
    minimum_quantity REAL NOT NULL CHECK (minimum_quantity >= 0),
    reorder_point REAL NOT NULL CHECK (reorder_point >= 0),
    maximum_quantity REAL NOT NULL CHECK (maximum_quantity > 0),
    lead_time_days INTEGER NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (part_id, warehouse_id),
    CHECK (minimum_quantity <= reorder_point AND reorder_point <= maximum_quantity)
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_lots (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES inventory_parts(id),
    lot_number TEXT NOT NULL,
    manufactured_at TEXT,
    expires_at TEXT,
    certificate_reference TEXT,
    certificate_verified INTEGER NOT NULL DEFAULT 0,
    receipt_line_id TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (part_id, lot_number)
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_serialized_parts (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES inventory_parts(id),
    serial_number TEXT NOT NULL UNIQUE,
    lot_id TEXT REFERENCES inventory_lots(id),
    bin_id TEXT REFERENCES inventory_bins(id),
    condition TEXT NOT NULL CHECK (condition IN ('SERVICEABLE', 'QUARANTINE', 'UNSERVICEABLE', 'IN_REPAIR', 'INSTALLED', 'SCRAPPED')),
    aircraft_id TEXT REFERENCES aircraft(id),
    position TEXT,
    hours_since_new REAL NOT NULL DEFAULT 0 CHECK (hours_since_new >= 0),
    cycles_since_new INTEGER NOT NULL DEFAULT 0 CHECK (cycles_since_new >= 0),
    certificate_reference TEXT,
    certificate_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK ((condition = 'INSTALLED' AND aircraft_id IS NOT NULL AND bin_id IS NULL) OR condition <> 'INSTALLED')
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_stock_balances (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES inventory_parts(id),
    bin_id TEXT NOT NULL REFERENCES inventory_bins(id),
    lot_key TEXT NOT NULL DEFAULT '',
    lot_id TEXT REFERENCES inventory_lots(id),
    condition TEXT NOT NULL CHECK (condition IN ('SERVICEABLE', 'QUARANTINE', 'UNSERVICEABLE', 'IN_REPAIR')),
    on_hand_quantity REAL NOT NULL DEFAULT 0 CHECK (on_hand_quantity >= 0),
    updated_at TEXT NOT NULL,
    UNIQUE (part_id, bin_id, lot_key, condition)
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_movements (
    id TEXT PRIMARY KEY,
    movement_number TEXT NOT NULL UNIQUE,
    movement_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT,
    station_id TEXT REFERENCES stations(id),
    destination_station_id TEXT REFERENCES stations(id),
    aircraft_id TEXT REFERENCES aircraft(id),
    flight_id TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED', 'REVERSED')),
    reversal_of_movement_id TEXT REFERENCES inventory_movements(id),
    total_base_value_idr INTEGER NOT NULL DEFAULT 0 CHECK (total_base_value_idr >= 0),
    is_finalized INTEGER NOT NULL DEFAULT 0 CHECK (is_finalized IN (0, 1)),
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (source_type, source_id, movement_type)
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_movement_lines (
    id TEXT PRIMARY KEY,
    movement_id TEXT NOT NULL REFERENCES inventory_movements(id) ON DELETE CASCADE,
    part_id TEXT NOT NULL REFERENCES inventory_parts(id),
    from_bin_id TEXT REFERENCES inventory_bins(id),
    to_bin_id TEXT REFERENCES inventory_bins(id),
    lot_id TEXT REFERENCES inventory_lots(id),
    serial_id TEXT REFERENCES inventory_serialized_parts(id),
    condition_from TEXT,
    condition_to TEXT,
    quantity REAL NOT NULL CHECK (quantity > 0),
    source_unit_cost_minor INTEGER NOT NULL DEFAULT 0 CHECK (source_unit_cost_minor >= 0),
    currency_id TEXT REFERENCES currencies(id),
    exchange_rate_to_idr_micros INTEGER NOT NULL DEFAULT 1000000 CHECK (exchange_rate_to_idr_micros > 0),
    base_unit_cost_idr INTEGER NOT NULL DEFAULT 0 CHECK (base_unit_cost_idr >= 0),
    base_value_idr INTEGER NOT NULL DEFAULT 0 CHECK (base_value_idr >= 0),
    CHECK (from_bin_id IS NOT NULL OR to_bin_id IS NOT NULL)
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_cost_layers (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES inventory_parts(id),
    warehouse_id TEXT NOT NULL REFERENCES inventory_warehouses(id),
    lot_id TEXT REFERENCES inventory_lots(id),
    serial_id TEXT REFERENCES inventory_serialized_parts(id),
    source_movement_line_id TEXT NOT NULL REFERENCES inventory_movement_lines(id),
    original_quantity REAL NOT NULL CHECK (original_quantity > 0),
    remaining_quantity REAL NOT NULL CHECK (remaining_quantity >= 0),
    source_unit_cost_minor INTEGER NOT NULL CHECK (source_unit_cost_minor >= 0),
    currency_id TEXT NOT NULL REFERENCES currencies(id),
    exchange_rate_to_idr_micros INTEGER NOT NULL CHECK (exchange_rate_to_idr_micros > 0),
    base_unit_cost_idr INTEGER NOT NULL CHECK (base_unit_cost_idr >= 0),
    received_at TEXT NOT NULL,
    CHECK (remaining_quantity <= original_quantity)
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_accounting_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    movement_id TEXT NOT NULL UNIQUE REFERENCES inventory_movements(id),
    station_id TEXT REFERENCES stations(id),
    aircraft_id TEXT REFERENCES aircraft(id),
    flight_id TEXT,
    currency_id TEXT REFERENCES currencies(id),
    source_amount_minor INTEGER NOT NULL DEFAULT 0,
    exchange_rate_to_idr_micros INTEGER NOT NULL DEFAULT 1000000,
    base_amount_idr INTEGER NOT NULL,
    integration_status TEXT NOT NULL DEFAULT 'PENDING_INTEGRATION',
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_purchase_requests (
    id TEXT PRIMARY KEY,
    request_number TEXT NOT NULL UNIQUE,
    station_id TEXT NOT NULL REFERENCES stations(id),
    request_reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'PARTIALLY_ORDERED', 'ORDERED', 'CANCELLED')),
    requested_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_purchase_request_lines (
    id TEXT PRIMARY KEY,
    purchase_request_id TEXT NOT NULL REFERENCES inventory_purchase_requests(id) ON DELETE CASCADE,
    part_id TEXT NOT NULL REFERENCES inventory_parts(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    ordered_quantity REAL NOT NULL DEFAULT 0 CHECK (ordered_quantity >= 0),
    required_at TEXT NOT NULL,
    note TEXT,
    CHECK (ordered_quantity <= quantity)
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    purchase_request_id TEXT NOT NULL REFERENCES inventory_purchase_requests(id),
    vendor_id TEXT NOT NULL REFERENCES vendors(id),
    currency_id TEXT NOT NULL REFERENCES currencies(id),
    exchange_rate_to_idr_micros INTEGER NOT NULL CHECK (exchange_rate_to_idr_micros > 0),
    expected_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    rejection_reason TEXT,
    created_by_user_id TEXT NOT NULL,
    approved_by_user_id TEXT,
    approved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_purchase_order_lines (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES inventory_purchase_orders(id) ON DELETE CASCADE,
    purchase_request_line_id TEXT NOT NULL REFERENCES inventory_purchase_request_lines(id),
    part_id TEXT NOT NULL REFERENCES inventory_parts(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    received_quantity REAL NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
    source_unit_cost_minor INTEGER NOT NULL CHECK (source_unit_cost_minor >= 0),
    base_unit_cost_idr INTEGER NOT NULL CHECK (base_unit_cost_idr >= 0),
    CHECK (received_quantity <= quantity)
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_goods_receipts (
    id TEXT PRIMARY KEY,
    receipt_number TEXT NOT NULL UNIQUE,
    purchase_order_id TEXT NOT NULL REFERENCES inventory_purchase_orders(id),
    warehouse_id TEXT NOT NULL REFERENCES inventory_warehouses(id),
    document_reference TEXT NOT NULL,
    received_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('POSTED', 'REVERSED')),
    movement_id TEXT NOT NULL UNIQUE REFERENCES inventory_movements(id),
    total_base_value_idr INTEGER NOT NULL CHECK (total_base_value_idr >= 0),
    received_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_goods_receipt_lines (
    id TEXT PRIMARY KEY,
    goods_receipt_id TEXT NOT NULL REFERENCES inventory_goods_receipts(id) ON DELETE CASCADE,
    purchase_order_line_id TEXT NOT NULL REFERENCES inventory_purchase_order_lines(id),
    bin_id TEXT NOT NULL REFERENCES inventory_bins(id),
    lot_id TEXT REFERENCES inventory_lots(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    movement_line_id TEXT NOT NULL REFERENCES inventory_movement_lines(id)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_part_issues (
    id TEXT PRIMARY KEY,
    issue_number TEXT NOT NULL UNIQUE,
    maintenance_handoff_id TEXT,
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    flight_id TEXT,
    warehouse_id TEXT NOT NULL REFERENCES inventory_warehouses(id),
    reason TEXT NOT NULL,
    movement_id TEXT NOT NULL UNIQUE REFERENCES inventory_movements(id),
    status TEXT NOT NULL CHECK (status IN ('ISSUED', 'REVERSED')),
    total_parts_value_idr INTEGER NOT NULL CHECK (total_parts_value_idr >= 0),
    issued_by_user_id TEXT NOT NULL,
    issued_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_part_issue_lines (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES maintenance_part_issues(id) ON DELETE CASCADE,
    part_id TEXT NOT NULL REFERENCES inventory_parts(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    base_value_idr INTEGER NOT NULL CHECK (base_value_idr >= 0),
    note TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_counts (
    id TEXT PRIMARY KEY,
    count_number TEXT NOT NULL UNIQUE,
    warehouse_id TEXT NOT NULL REFERENCES inventory_warehouses(id),
    bin_id TEXT REFERENCES inventory_bins(id),
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'COUNTED', 'POSTED', 'CANCELLED')),
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_count_lines (
    id TEXT PRIMARY KEY,
    count_id TEXT NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
    stock_balance_id TEXT NOT NULL REFERENCES inventory_stock_balances(id),
    expected_quantity REAL NOT NULL CHECK (expected_quantity >= 0),
    counted_quantity REAL CHECK (counted_quantity IS NULL OR counted_quantity >= 0),
    variance_quantity REAL
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_component_installations (
    id TEXT PRIMARY KEY,
    serial_id TEXT NOT NULL REFERENCES inventory_serialized_parts(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    position TEXT NOT NULL,
    installed_at TEXT NOT NULL,
    removed_at TEXT,
    hours_at_install REAL NOT NULL CHECK (hours_at_install >= 0),
    cycles_at_install INTEGER NOT NULL CHECK (cycles_at_install >= 0),
    hours_at_remove REAL,
    cycles_at_remove INTEGER,
    removal_reason TEXT,
    installed_by_user_id TEXT NOT NULL,
    removed_by_user_id TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS inventory_active_installation_unique
    ON inventory_component_installations(serial_id) WHERE removed_at IS NULL`,
  `CREATE TABLE IF NOT EXISTS inventory_repair_orders (
    id TEXT PRIMARY KEY,
    repair_number TEXT NOT NULL UNIQUE,
    serial_id TEXT NOT NULL REFERENCES inventory_serialized_parts(id),
    station_id TEXT NOT NULL REFERENCES stations(id),
    vendor_id TEXT NOT NULL REFERENCES vendors(id),
    reason TEXT NOT NULL,
    expected_return_at TEXT,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SENT', 'RECEIVED', 'CLOSED', 'CANCELLED')),
    source_repair_cost_minor INTEGER NOT NULL DEFAULT 0 CHECK (source_repair_cost_minor >= 0),
    currency_id TEXT REFERENCES currencies(id),
    exchange_rate_to_idr_micros INTEGER NOT NULL DEFAULT 1000000,
    base_repair_cost_idr INTEGER NOT NULL DEFAULT 0 CHECK (base_repair_cost_idr >= 0),
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_stock_part ON inventory_stock_balances(part_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_stock_bin ON inventory_stock_balances(bin_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_layers_fifo ON inventory_cost_layers(part_id, warehouse_id, received_at)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_po_status ON inventory_purchase_orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_serial_condition ON inventory_serialized_parts(condition)`
];

export const inventoryImmutabilityStatements = [
  `CREATE TRIGGER IF NOT EXISTS inventory_movement_finalized_update_guard
   BEFORE UPDATE ON inventory_movements
   WHEN OLD.is_finalized = 1
   BEGIN
     SELECT RAISE(ABORT, 'Finalized inventory movements are immutable');
   END`,
  `CREATE TRIGGER IF NOT EXISTS inventory_movement_delete_guard
   BEFORE DELETE ON inventory_movements
   BEGIN
     SELECT RAISE(ABORT, 'Inventory movements cannot be deleted');
   END`,
  `CREATE TRIGGER IF NOT EXISTS inventory_movement_line_insert_guard
   BEFORE INSERT ON inventory_movement_lines
   WHEN COALESCE((SELECT is_finalized FROM inventory_movements WHERE id = NEW.movement_id), 1) = 1
   BEGIN
     SELECT RAISE(ABORT, 'Lines cannot be appended to a finalized inventory movement');
   END`,
  `CREATE TRIGGER IF NOT EXISTS inventory_movement_line_update_guard
   BEFORE UPDATE ON inventory_movement_lines
   BEGIN
     SELECT RAISE(ABORT, 'Inventory movement lines are immutable');
   END`,
  `CREATE TRIGGER IF NOT EXISTS inventory_movement_line_delete_guard
   BEFORE DELETE ON inventory_movement_lines
   BEGIN
     SELECT RAISE(ABORT, 'Inventory movement lines cannot be deleted');
   END`
];

export const inventoryDropStatements = [
  'DROP TABLE IF EXISTS inventory_repair_orders',
  'DROP TABLE IF EXISTS inventory_component_installations',
  'DROP TABLE IF EXISTS inventory_count_lines',
  'DROP TABLE IF EXISTS inventory_counts',
  'DROP TABLE IF EXISTS maintenance_part_issue_lines',
  'DROP TABLE IF EXISTS maintenance_part_issues',
  'DROP TABLE IF EXISTS inventory_goods_receipt_lines',
  'DROP TABLE IF EXISTS inventory_goods_receipts',
  'DROP TABLE IF EXISTS inventory_purchase_order_lines',
  'DROP TABLE IF EXISTS inventory_purchase_orders',
  'DROP TABLE IF EXISTS inventory_purchase_request_lines',
  'DROP TABLE IF EXISTS inventory_purchase_requests',
  'DROP TABLE IF EXISTS inventory_accounting_events',
  'DROP TABLE IF EXISTS inventory_cost_layers',
  'DROP TABLE IF EXISTS inventory_movement_lines',
  'DROP TABLE IF EXISTS inventory_movements',
  'DROP TABLE IF EXISTS inventory_stock_balances',
  'DROP TABLE IF EXISTS inventory_serialized_parts',
  'DROP TABLE IF EXISTS inventory_lots',
  'DROP TABLE IF EXISTS inventory_reorder_rules',
  'DROP TABLE IF EXISTS inventory_bins',
  'DROP TABLE IF EXISTS inventory_warehouses',
  'DROP TABLE IF EXISTS inventory_part_applicabilities',
  'DROP TABLE IF EXISTS inventory_parts'
];
