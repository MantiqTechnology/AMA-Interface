import type Database from 'better-sqlite3';
import {
  operationsMasterDataStatements,
  operationsMasterDataDropStatements
} from './migrations/master-data/operations';
import {
  commercialMasterDataStatements,
  commercialMasterDataDropStatements
} from './migrations/master-data/commercial';
import {
  financeMasterDataStatements,
  financeMasterDataDropStatements
} from './migrations/master-data/finance';
import {
  cargoMasterDataStatements,
  cargoMasterDataDropStatements
} from './migrations/master-data/cargo';
import { ticketingDropStatements, ticketingStatements } from './migrations/ticketing';
import {
  inventoryDropStatements,
  inventoryImmutabilityStatements,
  inventoryStatements
} from './migrations/inventory';
import {
  corporateAssetDropStatements,
  corporateAssetStatements
} from './migrations/corporate-assets';
import { migrateVerificationData } from './migrations/operations/verification-migration';

type FlightOperationLookupSeed = {
  table: string;
  idPrefix: string;
  values: Array<[code: string, label: string]>;
};

const flightOperationLookupSeeds: FlightOperationLookupSeed[] = [
  {
    table: 'flight_types',
    idPrefix: 'flight-type',
    values: [
      ['CHARTER', 'Charter'],
      ['PASSENGER', 'Passenger'],
      ['CARGO', 'Cargo']
    ]
  },
  {
    table: 'flight_service_types',
    idPrefix: 'flight-service-type',
    values: [
      ['CHARTER_CARGO', 'Charter Cargo'],
      ['CHARTER_PASSENGER', 'Charter Passenger'],
      ['SCHEDULED_PASSENGER', 'Scheduled Passenger'],
      ['MEDEVAC', 'Medevac'],
      ['POSITIONING', 'Positioning']
    ]
  },
  {
    table: 'flight_priorities',
    idPrefix: 'flight-priority',
    values: [
      ['NORMAL', 'Normal'],
      ['HIGH', 'High'],
      ['EMERGENCY', 'Emergency']
    ]
  },
  {
    table: 'flight_request_statuses',
    idPrefix: 'flight-request-status',
    values: [
      ['DRAFT', 'Draft'],
      ['SUBMITTED', 'Submitted'],
      ['APPROVED', 'Approved'],
      ['REJECTED', 'Rejected'],
      ['CONVERTED', 'Converted']
    ]
  },
  {
    table: 'flight_operation_statuses',
    idPrefix: 'flight-operation-status',
    values: [
      ['DRAFT', 'Draft'],
      ['PENDING_READINESS', 'Pending Readiness'],
      ['BLOCKED', 'Blocked'],
      ['READY_FOR_APPROVAL', 'Ready For Approval'],
      ['APPROVED', 'Approved'],
      ['SCHEDULED', 'Scheduled'],
      ['CHECK_IN_OPEN', 'Check-In Open'],
      ['IN_PROGRESS', 'In Progress'],
      ['LANDED', 'Landed'],
      ['PENDING_CLOSURE', 'Pending Closure'],
      ['CLOSED', 'Closed'],
      ['CANCELLED', 'Cancelled'],
      ['DIVERTED', 'Diverted'],
      ['REOPENED_FOR_CORRECTION', 'Reopened For Correction']
    ]
  },
  {
    table: 'crew_assignment_roles',
    idPrefix: 'crew-assignment-role',
    values: [
      ['PILOT_IN_COMMAND', 'Pilot In Command'],
      ['CO_PILOT', 'Co-Pilot'],
      ['CABIN_CREW', 'Cabin Crew'],
      ['FLIGHT_OPERATIONS', 'Flight Operations'],
      ['GROUND_CREW', 'Ground Crew']
    ]
  },
  {
    table: 'flight_action_types',
    idPrefix: 'flight-action-type',
    values: [
      ['CREATE', 'Create'],
      ['SUBMIT', 'Submit'],
      ['READINESS_EVALUATED', 'Readiness Evaluated'],
      ['BLOCK', 'Block'],
      ['APPROVE', 'Approve'],
      ['SCHEDULE', 'Schedule'],
      ['OPEN_CHECK_IN', 'Open Check-In'],
      ['DEPART', 'Depart'],
      ['LAND', 'Land'],
      ['MARK_PENDING_CLOSURE', 'Mark Pending Closure'],
      ['CLOSE', 'Close'],
      ['CANCEL', 'Cancel'],
      ['DIVERT', 'Divert'],
      ['REOPEN', 'Reopen']
    ]
  },
  {
    table: 'flight_approval_types',
    idPrefix: 'flight-approval-type',
    values: [
      ['READINESS_APPROVAL', 'Readiness Approval'],
      ['FLIGHT_APPROVAL', 'Flight Approval'],
      ['CLOSURE_APPROVAL', 'Closure Approval'],
      ['OVERRIDE', 'Override']
    ]
  },
  {
    table: 'flight_approval_statuses',
    idPrefix: 'flight-approval-status',
    values: [
      ['NOT_STARTED', 'Not Started'],
      ['PENDING', 'Pending'],
      ['APPROVED', 'Approved'],
      ['REJECTED', 'Rejected'],
      ['REVISION_REQUESTED', 'Revision Requested']
    ]
  },
  {
    table: 'flight_attachment_statuses',
    idPrefix: 'flight-attachment-status',
    values: [
      ['AVAILABLE', 'Available'],
      ['PENDING', 'Pending']
    ]
  },
  {
    table: 'readiness_statuses',
    idPrefix: 'readiness-status',
    values: [
      ['PENDING', 'Pending'],
      ['PASS', 'Pass'],
      ['FAIL', 'Fail'],
      ['NOT_APPLICABLE', 'Not Applicable']
    ]
  },
  {
    table: 'manifest_types',
    idPrefix: 'manifest-type',
    values: [
      ['PASSENGER', 'Passenger'],
      ['CARGO', 'Cargo']
    ]
  },
  {
    table: 'manifest_statuses',
    idPrefix: 'manifest-status',
    values: [
      ['DRAFT', 'Draft'],
      ['SUBMITTED', 'Submitted'],
      ['APPROVED', 'Approved'],
      ['LOCKED', 'Locked']
    ]
  },
  {
    table: 'dg_acceptance_statuses',
    idPrefix: 'dg-acceptance-status',
    values: [
      ['NOT_APPLICABLE', 'Not Applicable'],
      ['PENDING', 'Pending'],
      ['ACCEPTED', 'Accepted'],
      ['REJECTED', 'Rejected']
    ]
  },
  {
    table: 'fuel_workflow_statuses',
    idPrefix: 'fuel-workflow-status',
    values: [
      ['REQUESTED', 'Requested'],
      ['APPROVED', 'Approved'],
      ['UPLIFTED', 'Uplifted'],
      ['POSTED', 'Posted'],
      ['REJECTED', 'Rejected']
    ]
  },
  {
    table: 'station_service_types',
    idPrefix: 'station-service-type',
    values: [
      ['HANDLING', 'Handling'],
      ['PARKING', 'Parking']
    ]
  },
  {
    table: 'station_service_statuses',
    idPrefix: 'station-service-status',
    values: [
      ['REQUESTED', 'Requested'],
      ['CONFIRMED', 'Confirmed'],
      ['REJECTED', 'Rejected'],
      ['CANCELLED', 'Cancelled']
    ]
  },
  {
    table: 'station_cost_statuses',
    idPrefix: 'station-cost-status',
    values: [
      ['DRAFT', 'Draft'],
      ['SUBMITTED', 'Submitted'],
      ['APPROVED', 'Approved'],
      ['REJECTED', 'Rejected'],
      ['VOID', 'Void']
    ]
  },
  {
    table: 'aircraft_serviceability_statuses',
    idPrefix: 'aircraft-serviceability-status',
    values: [
      ['SERVICEABLE', 'Serviceable'],
      ['SERVICEABLE_WITH_RESTRICTIONS', 'Serviceable With Restrictions'],
      ['MAINTENANCE_DUE', 'Maintenance Due'],
      ['UNSERVICEABLE', 'Unserviceable']
    ]
  },
  {
    table: 'maintenance_handoff_statuses',
    idPrefix: 'maintenance-handoff-status',
    values: [
      ['DRAFT', 'Draft'],
      ['SUBMITTED', 'Submitted'],
      ['APPROVED', 'Approved'],
      ['REJECTED', 'Rejected'],
      ['POSTED', 'Posted']
    ]
  },
  {
    table: 'finance_event_types',
    idPrefix: 'finance-event-type',
    values: [
      ['FUEL_COST_DRAFT', 'Fuel Cost Draft'],
      ['STATION_COST_DRAFT', 'Station Cost Draft'],
      ['MAINTENANCE_EXPENSE_DRAFT', 'Maintenance Expense Draft'],
      ['FLIGHT_CLOSED_ELIGIBLE_FOR_INVOICE', 'Flight Closed Eligible For Invoice'],
      ['FLIGHT_CANCELLED_VOID_REQUEST', 'Flight Cancelled Void Request']
    ]
  },
  {
    table: 'finance_handoff_statuses',
    idPrefix: 'finance-handoff-status',
    values: [
      ['DRAFT', 'Draft'],
      ['READY', 'Ready'],
      ['POSTED', 'Posted'],
      ['VOID', 'Void']
    ]
  }
];

const flightOperationLookupCreateStatements = flightOperationLookupSeeds.map(
  (seed) => `CREATE TABLE IF NOT EXISTS ${seed.table} (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`
);

const createStatements = [
  ...operationsMasterDataStatements,
  ...flightOperationLookupCreateStatements,
  ...financeMasterDataStatements,
  ...commercialMasterDataStatements,
  ...cargoMasterDataStatements,
  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    flight_operation_id TEXT NOT NULL UNIQUE REFERENCES flight_operations(id),
    invoice_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void')),
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    created_by_user_id TEXT NOT NULL,
    approved_by_user_id TEXT,
    approved_at TEXT,
    issued_at TEXT,
    due_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS invoice_line_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('PASSENGER_TICKET', 'CARGO_BOOKING', 'CHARTER')),
    source_id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
    rate_card_id TEXT REFERENCES rate_cards(id),
    tax_code_id TEXT REFERENCES tax_codes(id),
    tax_code TEXT,
    tax_rate_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_basis_points >= 0),
    tax_amount INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total INTEGER NOT NULL CHECK (total >= 0),
    UNIQUE (invoice_id, source_type, source_id)
  )`,
  `CREATE TABLE IF NOT EXISTS invoice_finance_snapshots (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL UNIQUE REFERENCES invoices(id) ON DELETE CASCADE,
    flight_operation_id TEXT NOT NULL UNIQUE REFERENCES flight_operations(id),
    ticket_revenue INTEGER NOT NULL DEFAULT 0,
    cargo_revenue INTEGER NOT NULL DEFAULT 0,
    charter_revenue INTEGER NOT NULL DEFAULT 0,
    total_revenue INTEGER NOT NULL,
    fuel_cost INTEGER NOT NULL DEFAULT 0,
    station_cost INTEGER NOT NULL DEFAULT 0,
    maintenance_cost INTEGER NOT NULL DEFAULT 0,
    total_operational_cost INTEGER NOT NULL,
    tax_amount INTEGER NOT NULL,
    invoice_total INTEGER NOT NULL,
    gross_margin INTEGER NOT NULL,
    currency_code TEXT NOT NULL,
    captured_at TEXT NOT NULL
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
  `CREATE TABLE IF NOT EXISTS accounting_periods (
    id TEXT PRIMARY KEY,
    period_code TEXT NOT NULL UNIQUE,
    period_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'LOCKED')),
    locked_at TEXT,
    locked_by_user_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (end_date >= start_date)
  )`,
  `CREATE TABLE IF NOT EXISTS product_accounting_profiles (
    id TEXT PRIMARY KEY,
    profile_code TEXT NOT NULL UNIQUE,
    profile_name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    accounting_class TEXT NOT NULL,
    inventory_account_id TEXT REFERENCES chart_of_accounts(id),
    expense_account_id TEXT REFERENCES chart_of_accounts(id),
    asset_account_id TEXT REFERENCES chart_of_accounts(id),
    revenue_account_id TEXT REFERENCES chart_of_accounts(id),
    deferred_revenue_account_id TEXT REFERENCES chart_of_accounts(id),
    tax_profile_id TEXT REFERENCES tax_codes(id),
    capitalization_candidate INTEGER NOT NULL DEFAULT 0,
    allowed_treatments_json TEXT NOT NULL DEFAULT '[]',
    required_dimensions_json TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS accounting_policies (
    id TEXT PRIMARY KEY,
    policy_code TEXT NOT NULL UNIQUE,
    policy_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    product_accounting_profile_id TEXT REFERENCES product_accounting_profiles(id),
    debit_account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
    credit_account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
    treatment TEXT NOT NULL,
    capitalization_candidate INTEGER NOT NULL DEFAULT 0,
    required_dimensions_json TEXT NOT NULL DEFAULT '[]',
    priority INTEGER NOT NULL DEFAULT 100,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    approval_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (approval_status IN ('DRAFT', 'APPROVED', 'RETIRED')),
    version INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
  )`,
  `CREATE TABLE IF NOT EXISTS accounting_events (
    id TEXT PRIMARY KEY,
    event_number TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    product_accounting_profile_id TEXT REFERENCES product_accounting_profiles(id),
    policy_id TEXT REFERENCES accounting_policies(id),
    policy_code TEXT,
    policy_version INTEGER,
    accounting_date TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    document_date TEXT,
    service_date TEXT,
    amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
    currency_id TEXT REFERENCES currencies(id),
    currency_code TEXT NOT NULL,
    exchange_rate_to_idr_micros INTEGER NOT NULL DEFAULT 1000000 CHECK (exchange_rate_to_idr_micros > 0),
    base_amount_idr INTEGER NOT NULL CHECK (base_amount_idr >= 0),
    posting_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (posting_status IN ('DRAFT', 'POSTED', 'REVERSED', 'ERROR', 'EXCEPTION')),
    journal_entry_id TEXT,
    station_id TEXT,
    aircraft_id TEXT,
    flight_id TEXT,
    work_order_reference TEXT,
    cost_center_id TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (event_type, source_type, source_id)
  )`,
  `CREATE TABLE IF NOT EXISTS accounting_exceptions (
    id TEXT PRIMARY KEY,
    accounting_event_id TEXT REFERENCES accounting_events(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    reason_code TEXT NOT NULL CHECK (reason_code IN (
      'NO_MATCHING_POLICY',
      'AMBIGUOUS_POLICY',
      'MISSING_CONTEXT',
      'INVALID_ACCOUNT',
      'CLOSED_PERIOD',
      'UNBALANCED_JOURNAL',
      'MANUAL_REVIEW_REQUIRED'
    )),
    message TEXT NOT NULL,
    context_snapshot_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (event_type, source_type, source_id, reason_code)
  )`,
  `CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    journal_number TEXT NOT NULL UNIQUE,
    accounting_event_id TEXT NOT NULL UNIQUE REFERENCES accounting_events(id),
    period_id TEXT NOT NULL REFERENCES accounting_periods(id),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REVERSED')),
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    document_date TEXT,
    posting_date TEXT,
    service_date TEXT,
    currency_code TEXT NOT NULL,
    exchange_rate_to_idr_micros INTEGER NOT NULL DEFAULT 1000000 CHECK (exchange_rate_to_idr_micros > 0),
    policy_code TEXT NOT NULL,
    policy_version INTEGER NOT NULL,
    reversal_of_journal_entry_id TEXT REFERENCES journal_entries(id),
    created_by_user_id TEXT NOT NULL,
    approved_by_user_id TEXT,
    posted_by_user_id TEXT,
    posted_at TEXT,
    memo TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS journal_lines (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
    debit_minor INTEGER NOT NULL DEFAULT 0 CHECK (debit_minor >= 0),
    credit_minor INTEGER NOT NULL DEFAULT 0 CHECK (credit_minor >= 0),
    base_debit_idr INTEGER NOT NULL DEFAULT 0 CHECK (base_debit_idr >= 0),
    base_credit_idr INTEGER NOT NULL DEFAULT 0 CHECK (base_credit_idr >= 0),
    station_id TEXT,
    aircraft_id TEXT,
    flight_id TEXT,
    work_order_reference TEXT,
    cost_center_id TEXT,
    description TEXT NOT NULL,
    UNIQUE (journal_entry_id, line_number),
    CHECK ((debit_minor > 0 AND credit_minor = 0) OR (credit_minor > 0 AND debit_minor = 0))
  )`,
  `CREATE TABLE IF NOT EXISTS asset_register (
    id TEXT PRIMARY KEY,
    asset_number TEXT NOT NULL UNIQUE,
    source_journal_entry_id TEXT NOT NULL UNIQUE REFERENCES journal_entries(id),
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    asset_account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
    asset_name TEXT NOT NULL,
    aircraft_id TEXT,
    inventory_part_id TEXT,
    component_serial_id TEXT,
    serial_number TEXT,
    acquisition_date TEXT NOT NULL,
    ready_for_use_date TEXT,
    cost_minor INTEGER NOT NULL CHECK (cost_minor >= 0),
    currency_code TEXT NOT NULL,
    useful_life_months INTEGER NOT NULL DEFAULT 60 CHECK (useful_life_months > 0),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETIRED', 'REVERSED')),
    reversal_journal_entry_id TEXT REFERENCES journal_entries(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS depreciation_schedules (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL REFERENCES asset_register(id) ON DELETE CASCADE,
    period_id TEXT NOT NULL REFERENCES accounting_periods(id),
    depreciation_amount_minor INTEGER NOT NULL CHECK (depreciation_amount_minor >= 0),
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'POSTED', 'CANCELLED')),
    journal_entry_id TEXT REFERENCES journal_entries(id),
    created_at TEXT NOT NULL,
    UNIQUE (asset_id, period_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_accounting_events_status ON accounting_events(posting_status)`,
  `CREATE INDEX IF NOT EXISTS idx_accounting_events_source ON accounting_events(source_type, source_id)`,
  `CREATE INDEX IF NOT EXISTS idx_accounting_exceptions_status ON accounting_exceptions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status)`,
  `CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON journal_entries(period_id)`,
  `CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id)`,
  `CREATE VIEW IF NOT EXISTS general_ledger AS
    SELECT
      line.id AS journal_line_id,
      entry.id AS journal_entry_id,
      entry.journal_number,
      entry.posting_date,
      entry.transaction_date,
      entry.service_date,
      entry.source_type,
      entry.source_id,
      entry.policy_code,
      entry.policy_version,
      period.period_code,
      account.account_code,
      account.account_name,
      account.account_type,
      line.debit_minor,
      line.credit_minor,
      line.base_debit_idr,
      line.base_credit_idr,
      line.station_id,
      line.aircraft_id,
      line.flight_id,
      line.work_order_reference,
      line.cost_center_id,
      line.description
    FROM journal_lines line
    JOIN journal_entries entry ON entry.id = line.journal_entry_id
    JOIN accounting_periods period ON period.id = entry.period_id
    JOIN chart_of_accounts account ON account.id = line.account_id
    WHERE entry.status = 'POSTED'`,
  ...flightOperationLookupCreateStatements,

  `CREATE TABLE IF NOT EXISTS flight_requests (
    id TEXT PRIMARY KEY,
    request_number TEXT NOT NULL UNIQUE,
    status_id TEXT NOT NULL REFERENCES flight_request_statuses(id),
    flight_date TEXT NOT NULL,
    flight_type_id TEXT NOT NULL REFERENCES flight_types(id),
    service_type_id TEXT NOT NULL REFERENCES flight_service_types(id),
    route_id TEXT NOT NULL REFERENCES routes(id),
    customer_id TEXT REFERENCES customers(id),
    aircraft_id TEXT REFERENCES aircraft(id),
    pilot_in_command_id TEXT REFERENCES crews(id),
    co_pilot_id TEXT REFERENCES crews(id),
    scheduled_departure_at TEXT,
    scheduled_arrival_at TEXT,
    request_source TEXT NOT NULL,
    priority_id TEXT NOT NULL REFERENCES flight_priorities(id),
    passenger_estimate INTEGER NOT NULL DEFAULT 0,
    cargo_weight_estimate_kg REAL NOT NULL DEFAULT 0,
    cargo_category TEXT,
    dangerous_goods INTEGER NOT NULL DEFAULT 0,
    fuel_type TEXT NOT NULL DEFAULT 'AVTUR',
    requested_fuel_litre REAL NOT NULL DEFAULT 0,
    fuel_supplier_id TEXT REFERENCES fuel_suppliers(id),
    handling_supplier_id TEXT REFERENCES station_service_suppliers(id),
    parking_required INTEGER NOT NULL DEFAULT 0,
    destination_handling_required INTEGER NOT NULL DEFAULT 0,
    billing_type TEXT NOT NULL DEFAULT 'CHARTER',
    estimated_revenue INTEGER,
    currency_code TEXT NOT NULL DEFAULT 'IDR',
    remarks TEXT,
    converted_flight_id TEXT,
    created_by_user_id TEXT NOT NULL,
    approved_by_user_id TEXT,
    approved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS flight_operations (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    flight_request_id TEXT REFERENCES flight_requests(id),
    flight_number TEXT NOT NULL UNIQUE,
    flight_date TEXT NOT NULL,
    flight_type_id TEXT NOT NULL REFERENCES flight_types(id),
    service_type_id TEXT NOT NULL REFERENCES flight_service_types(id),
    request_source TEXT NOT NULL DEFAULT 'Corporate Charter Request',
    priority_id TEXT NOT NULL REFERENCES flight_priorities(id),
    route_id TEXT NOT NULL REFERENCES routes(id),
    origin_station_id TEXT NOT NULL REFERENCES stations(id),
    destination_station_id TEXT NOT NULL REFERENCES stations(id),
    customer_id TEXT REFERENCES customers(id),
    aircraft_id TEXT REFERENCES aircraft(id),
    pilot_in_command_id TEXT REFERENCES crews(id),
    co_pilot_id TEXT REFERENCES crews(id),
    scheduled_departure_at TEXT,
    scheduled_arrival_at TEXT,
    actual_departure_at TEXT,
    actual_departure_station_id TEXT REFERENCES stations(id),
    actual_arrival_at TEXT,
    actual_arrival_station_id TEXT REFERENCES stations(id),
    current_status_id TEXT NOT NULL REFERENCES flight_operation_statuses(id),
    created_by_user_id TEXT,
    approved_by_user_id TEXT,
    remarks TEXT,
    billing_type TEXT NOT NULL DEFAULT 'CHARTER',
    estimated_revenue INTEGER,
    currency_code TEXT NOT NULL DEFAULT 'IDR',
    is_locked INTEGER NOT NULL DEFAULT 0,
    blocking_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (scheduled_arrival_at IS NULL OR scheduled_departure_at IS NULL OR scheduled_arrival_at >= scheduled_departure_at),
    CHECK (actual_arrival_at IS NULL OR actual_departure_at IS NULL OR actual_arrival_at >= actual_departure_at)
  )`,
  `CREATE TABLE IF NOT EXISTS flight_crew_assignments (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    crew_id TEXT NOT NULL REFERENCES crews(id),
    assignment_role_id TEXT NOT NULL REFERENCES crew_assignment_roles(id),
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (flight_id, crew_id, assignment_role_id)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_flight_crew_primary_pic ON flight_crew_assignments(flight_id) WHERE assignment_role_id = 'crew-assignment-role-pilot-in-command' AND is_primary = 1`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_flight_crew_primary_copilot ON flight_crew_assignments(flight_id) WHERE assignment_role_id = 'crew-assignment-role-co-pilot' AND is_primary = 1`,
  `CREATE TABLE IF NOT EXISTS flight_status_histories (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    from_status_id TEXT REFERENCES flight_operation_statuses(id),
    to_status_id TEXT NOT NULL REFERENCES flight_operation_statuses(id),
    action_type_id TEXT NOT NULL REFERENCES flight_action_types(id),
    reason_id TEXT REFERENCES flight_reasons(id),
    reason_note TEXT,
    changed_by_user_id TEXT,
    changed_at TEXT NOT NULL,
    metadata_json TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS flight_operation_approvals (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    approval_type_id TEXT NOT NULL REFERENCES flight_approval_types(id),
    status_id TEXT NOT NULL REFERENCES flight_approval_statuses(id),
    requested_by_user_id TEXT,
    assigned_role TEXT NOT NULL,
    decided_by_user_id TEXT,
    requested_at TEXT,
    decided_at TEXT,
    reason TEXT,
    affected_section TEXT,
    required_correction TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (flight_id, approval_type_id)
  )`,
  `CREATE TABLE IF NOT EXISTS flight_operation_attachments (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    status_id TEXT NOT NULL REFERENCES flight_attachment_statuses(id),
    uploaded_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS flight_readiness_checks (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    check_code TEXT NOT NULL,
    check_name TEXT NOT NULL,
    status_id TEXT NOT NULL REFERENCES readiness_statuses(id),
    is_required INTEGER NOT NULL DEFAULT 1,
    evaluated_at TEXT,
    evaluated_by_user_id TEXT,
    result_note TEXT,
    source_reference TEXT,
    classification TEXT,
    calculation_status TEXT,
    verification_status TEXT,
    effective_status TEXT,
    calculated_at TEXT,
    expiry_at TEXT,
    invalidation_reason TEXT,
    source_record_ids TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (flight_id, check_code)
  )`,
  `CREATE TABLE IF NOT EXISTS flight_manifests (
    id TEXT PRIMARY KEY,
    flight_operation_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    manifest_type_id TEXT NOT NULL REFERENCES manifest_types(id),
    status_id TEXT NOT NULL REFERENCES manifest_statuses(id),
    approved_by_user_id TEXT,
    approved_at TEXT,
    locked_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (flight_operation_id, manifest_type_id)
  )`,
  `CREATE TABLE IF NOT EXISTS flight_manifest_passengers (
    id TEXT PRIMARY KEY,
    manifest_id TEXT NOT NULL REFERENCES flight_manifests(id) ON DELETE CASCADE,
    passenger_ticket_id TEXT REFERENCES passenger_tickets(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    identity_type TEXT,
    identity_number TEXT,
    weight_kg REAL,
    seat_number TEXT,
    baggage_weight_kg REAL,
    remarks TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS flight_manifest_cargo_items (
    id TEXT PRIMARY KEY,
    manifest_id TEXT NOT NULL REFERENCES flight_manifests(id) ON DELETE CASCADE,
    cargo_booking_id TEXT REFERENCES cargo_bookings(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    sender_name TEXT,
    receiver_name TEXT,
    actual_weight_kg REAL NOT NULL,
    volume_weight_kg REAL,
    chargeable_weight_kg REAL,
    dg_category_id TEXT REFERENCES dg_categories(id),
    dg_acceptance_status_id TEXT NOT NULL REFERENCES dg_acceptance_statuses(id),
    remarks TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (actual_weight_kg >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS flight_fuel_requests (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    fuel_supplier_id TEXT NOT NULL REFERENCES fuel_suppliers(id),
    fuel_type TEXT NOT NULL,
    requested_quantity_litre REAL NOT NULL,
    approved_quantity_litre REAL,
    actual_uplift_litre REAL,
    reference_price_per_litre INTEGER,
    actual_price_per_litre INTEGER,
    tax_code_id TEXT REFERENCES tax_codes(id),
    tax_amount INTEGER,
    total_cost INTEGER,
    currency_id TEXT NOT NULL REFERENCES currencies(id),
    status_id TEXT NOT NULL REFERENCES fuel_workflow_statuses(id),
    rejection_reason TEXT,
    variance_note TEXT,
    requested_by_user_id TEXT,
    approved_by_user_id TEXT,
    uplift_recorded_by_user_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (requested_quantity_litre >= 0),
    CHECK (approved_quantity_litre IS NULL OR approved_quantity_litre >= 0),
    CHECK (actual_uplift_litre IS NULL OR actual_uplift_litre >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS flight_station_service_requests (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    station_id TEXT NOT NULL REFERENCES stations(id),
    service_supplier_id TEXT NOT NULL REFERENCES station_service_suppliers(id),
    service_type_id TEXT NOT NULL REFERENCES station_service_types(id),
    status_id TEXT NOT NULL REFERENCES station_service_statuses(id),
    reference_rate INTEGER,
    confirmed_at TEXT,
    confirmed_by_user_id TEXT,
    rejection_note TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS flight_station_costs (
    id TEXT PRIMARY KEY,
    flight_id TEXT REFERENCES flight_operations(id) ON DELETE SET NULL,
    station_id TEXT NOT NULL REFERENCES stations(id),
    vendor_id TEXT REFERENCES vendors(id),
    cost_category_id TEXT NOT NULL REFERENCES cost_categories(id),
    amount INTEGER NOT NULL,
    currency_id TEXT NOT NULL REFERENCES currencies(id),
    description TEXT NOT NULL,
    status_id TEXT NOT NULL REFERENCES station_cost_statuses(id),
    submitted_by_user_id TEXT,
    approved_by_user_id TEXT,
    approved_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (amount >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS flight_maintenance_handoffs (
    id TEXT PRIMARY KEY,
    flight_id TEXT REFERENCES flight_operations(id) ON DELETE SET NULL,
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    serviceability_status_id TEXT NOT NULL REFERENCES aircraft_serviceability_statuses(id),
    work_order_reference TEXT,
    maintenance_note TEXT,
    spare_part_reference TEXT,
    maintenance_cost INTEGER NOT NULL DEFAULT 0,
    currency_id TEXT NOT NULL REFERENCES currencies(id),
    status_id TEXT NOT NULL REFERENCES maintenance_handoff_statuses(id),
    recorded_by_user_id TEXT,
    approved_by_user_id TEXT,
    approved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (maintenance_cost >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS flight_finance_handoffs (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id TEXT,
    event_type_id TEXT NOT NULL REFERENCES finance_event_types(id),
    status_id TEXT NOT NULL REFERENCES finance_handoff_statuses(id),
    summary TEXT NOT NULL,
    amount INTEGER,
    currency_id TEXT REFERENCES currencies(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS flight_station_tasks (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    station_id TEXT NOT NULL REFERENCES stations(id),
    phase TEXT NOT NULL,
    task_code TEXT NOT NULL,
    task_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    assigned_role TEXT,
    assigned_user_id TEXT,
    source_record_type TEXT,
    source_record_id TEXT,
    requires_evidence INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    rejection_reason TEXT,
    verified_by_user_id TEXT,
    verified_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (flight_id, station_id, phase, task_code)
  )`,
  `CREATE TABLE IF NOT EXISTS flight_station_task_approvals (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES flight_station_tasks(id) ON DELETE CASCADE,
    approval_stage TEXT NOT NULL,
    decision TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    reason TEXT,
    approved_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (task_id, approval_stage)
  )`,
  `CREATE TABLE IF NOT EXISTS flight_verification_evidence (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    station_task_id TEXT REFERENCES flight_station_tasks(id) ON DELETE SET NULL,
    readiness_check_code TEXT,
    upload_id TEXT,
    document_type TEXT,
    file_name TEXT NOT NULL,
    notes TEXT,
    uploaded_by_user_id TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS flight_readiness_verifications (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    check_code TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    verifier_user_id TEXT,
    evidence_references TEXT,
    verified_at TEXT,
    expired_at TEXT,
    invalidated_at TEXT,
    invalidation_reason TEXT,
    source_snapshot TEXT,
    source_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (flight_id, check_code)
  )`,
  `CREATE TABLE IF NOT EXISTS flight_operational_audit (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES stations(id),
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    before_status TEXT,
    after_status TEXT,
    reason TEXT,
    evidence_ids TEXT,
    request_id TEXT,
    metadata TEXT,
    timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS flight_actual_reconciliations (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    planned_passengers INTEGER,
    actual_passengers INTEGER,
    planned_cargo_kg REAL,
    actual_cargo_kg REAL,
    no_show_passengers INTEGER DEFAULT 0,
    offloaded_cargo_kg REAL DEFAULT 0,
    total_discrepancy_note TEXT,
    reconciled_by_user_id TEXT NOT NULL,
    reconciled_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (flight_id)
  )`,
  ...ticketingStatements,
  ...inventoryStatements,
  ...corporateAssetStatements,
  `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_due_at ON invoices(due_at)`,
  `CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_operations_status ON flight_operations(current_status_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_operations_date ON flight_operations(flight_date)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_operations_route ON flight_operations(route_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_status_histories_flight ON flight_status_histories(flight_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_readiness_checks_flight ON flight_readiness_checks(flight_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_manifests_flight_operation ON flight_manifests(flight_operation_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_fuel_requests_flight ON flight_fuel_requests(flight_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_station_costs_flight ON flight_station_costs(flight_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_station_tasks_flight ON flight_station_tasks(flight_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_station_tasks_station ON flight_station_tasks(station_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_station_tasks_phase ON flight_station_tasks(phase)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_station_task_approvals_task ON flight_station_task_approvals(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_verification_evidence_flight ON flight_verification_evidence(flight_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_verification_evidence_task ON flight_verification_evidence(station_task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_readiness_verifications_flight ON flight_readiness_verifications(flight_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_operational_audit_flight ON flight_operational_audit(flight_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_operational_audit_actor ON flight_operational_audit(actor_user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flight_actual_reconciliations_flight ON flight_actual_reconciliations(flight_id)`
];

const dropStatements = [
  ...corporateAssetDropStatements,
  ...inventoryDropStatements,
  ...ticketingDropStatements,
  'DROP VIEW IF EXISTS general_ledger',
  'DROP TABLE IF EXISTS depreciation_schedules',
  'DROP TABLE IF EXISTS asset_register',
  'DROP TABLE IF EXISTS journal_lines',
  'DROP TABLE IF EXISTS journal_entries',
  'DROP TABLE IF EXISTS accounting_exceptions',
  'DROP TABLE IF EXISTS accounting_events',
  'DROP TABLE IF EXISTS accounting_policies',
  'DROP TABLE IF EXISTS product_accounting_profiles',
  'DROP TABLE IF EXISTS accounting_periods',
  'DROP TABLE IF EXISTS flight_finance_handoffs',
  'DROP TABLE IF EXISTS flight_maintenance_handoffs',
  'DROP TABLE IF EXISTS flight_actual_reconciliations',
  'DROP TABLE IF EXISTS flight_operational_audit',
  'DROP TABLE IF EXISTS flight_readiness_verifications',
  'DROP TABLE IF EXISTS flight_verification_evidence',
  'DROP TABLE IF EXISTS flight_station_task_approvals',
  'DROP TABLE IF EXISTS flight_station_tasks',
  'DROP TABLE IF EXISTS flight_station_costs',
  'DROP TABLE IF EXISTS flight_station_service_requests',
  'DROP TABLE IF EXISTS flight_fuel_requests',
  'DROP TABLE IF EXISTS flight_manifest_cargo_items',
  'DROP TABLE IF EXISTS flight_manifest_passengers',
  'DROP TABLE IF EXISTS flight_manifests',
  'DROP TABLE IF EXISTS flight_readiness_checks',
  'DROP TABLE IF EXISTS flight_operation_attachments',
  'DROP TABLE IF EXISTS flight_operation_approvals',
  'DROP TABLE IF EXISTS flight_status_histories',
  'DROP TABLE IF EXISTS flight_crew_assignments',
  'DROP TABLE IF EXISTS flight_operations',
  'DROP TABLE IF EXISTS flight_requests',
  'DROP TABLE IF EXISTS finance_handoff_statuses',
  'DROP TABLE IF EXISTS finance_event_types',
  'DROP TABLE IF EXISTS maintenance_handoff_statuses',
  'DROP TABLE IF EXISTS aircraft_serviceability_statuses',
  'DROP TABLE IF EXISTS station_cost_statuses',
  'DROP TABLE IF EXISTS station_service_statuses',
  'DROP TABLE IF EXISTS station_service_types',
  'DROP TABLE IF EXISTS fuel_workflow_statuses',
  'DROP TABLE IF EXISTS dg_acceptance_statuses',
  'DROP TABLE IF EXISTS manifest_statuses',
  'DROP TABLE IF EXISTS manifest_types',
  'DROP TABLE IF EXISTS readiness_statuses',
  'DROP TABLE IF EXISTS flight_attachment_statuses',
  'DROP TABLE IF EXISTS flight_approval_statuses',
  'DROP TABLE IF EXISTS flight_approval_types',
  'DROP TABLE IF EXISTS flight_action_types',
  'DROP TABLE IF EXISTS crew_assignment_roles',
  'DROP TABLE IF EXISTS flight_operation_statuses',
  'DROP TABLE IF EXISTS flight_request_statuses',
  'DROP TABLE IF EXISTS flight_priorities',
  'DROP TABLE IF EXISTS flight_service_types',
  'DROP TABLE IF EXISTS flight_types',
  ...cargoMasterDataDropStatements,
  ...commercialMasterDataDropStatements,
  ...financeMasterDataDropStatements,
  ...operationsMasterDataDropStatements,
  'DROP TABLE IF EXISTS payments',
  'DROP TABLE IF EXISTS invoice_finance_snapshots',
  'DROP TABLE IF EXISTS invoice_line_items',
  'DROP TABLE IF EXISTS invoices'
];

const obsoleteTablePrefix = ['r', 'e', 'f', '_'].join('');
const obsoleteOperationalTables = new Set([
  'flight_orders',
  'manifests',
  'fuel_requests',
  'fuel_uplifts',
  'station_expenses',
  'approvals',
  'alerts',
  'maintenance_work_orders',
  'serialized_parts'
]);
const cleanRebuildRequiredMessage =
  'AMA demo database uses the pre-cleanup schema. Run `pnpm demo:reset` or remove the SQLite DB before starting the app.';

const canonicalShapeRequirements = [
  { table: 'aircraft', column: 'registration_number' },
  { table: 'stations', column: 'station_code' },
  { table: 'routes', column: 'route_code' },
  { table: 'customers', column: 'account_code' },
  { table: 'flight_manifests', column: 'flight_operation_id' },
  { table: 'ticketing_sales', column: 'flight_operation_id' },
  { table: 'passenger_tickets', column: 'flight_operation_id' },
  { table: 'passenger_tickets', column: 'total_amount' },
  { table: 'passenger_tickets', column: 'currency_code' },
  { table: 'cargo_bookings', column: 'flight_operation_id' },
  { table: 'cargo_bookings', column: 'total_amount' },
  { table: 'cargo_bookings', column: 'currency_code' },
  { table: 'ticketing_refund_requests', column: 'flight_operation_id' },
  { table: 'passenger_ticket_reschedules', column: 'previous_flight_operation_id' },
  { table: 'passenger_ticket_reschedules', column: 'new_flight_operation_id' },
  { table: 'invoices', column: 'flight_operation_id' },
  { table: 'invoices', column: 'created_by_user_id' },
  { table: 'flight_fuel_requests', column: 'currency_id' },
  { table: 'asset_register', column: 'source_journal_entry_id' },
  { table: 'asset_register', column: 'cost_minor' }
];

const accountingIntegrityStatements = [
  `CREATE TRIGGER IF NOT EXISTS journal_entries_post_balance
   BEFORE UPDATE OF status ON journal_entries
   WHEN NEW.status = 'POSTED'
   BEGIN
     SELECT RAISE(ABORT, 'journal entry is not balanced')
     WHERE (
       SELECT COALESCE(SUM(debit_minor), 0) - COALESCE(SUM(credit_minor), 0)
       FROM journal_lines WHERE journal_entry_id = NEW.id
     ) <> 0;
     SELECT RAISE(ABORT, 'journal entry has no lines')
     WHERE NOT EXISTS (SELECT 1 FROM journal_lines WHERE journal_entry_id = NEW.id);
     SELECT RAISE(ABORT, 'accounting period is locked')
     WHERE EXISTS (
       SELECT 1 FROM accounting_periods period
       WHERE period.id = NEW.period_id AND period.status = 'LOCKED'
     );
   END`,
  `CREATE TRIGGER IF NOT EXISTS journal_entries_posted_immutable
   BEFORE UPDATE ON journal_entries
   WHEN OLD.status = 'POSTED'
   BEGIN
     SELECT RAISE(ABORT, 'posted journal entry is immutable');
   END`,
  `CREATE TRIGGER IF NOT EXISTS journal_entries_posted_delete_block
   BEFORE DELETE ON journal_entries
   WHEN OLD.status = 'POSTED'
   BEGIN
     SELECT RAISE(ABORT, 'posted journal entry cannot be deleted');
   END`,
  `CREATE TRIGGER IF NOT EXISTS journal_lines_posted_insert_block
   BEFORE INSERT ON journal_lines
   WHEN EXISTS (
     SELECT 1 FROM journal_entries entry
     WHERE entry.id = NEW.journal_entry_id AND entry.status = 'POSTED'
   )
   BEGIN
     SELECT RAISE(ABORT, 'posted journal lines are immutable');
   END`,
  `CREATE TRIGGER IF NOT EXISTS journal_lines_posted_update_block
   BEFORE UPDATE ON journal_lines
   WHEN EXISTS (
     SELECT 1 FROM journal_entries entry
     WHERE entry.id = OLD.journal_entry_id AND entry.status = 'POSTED'
   )
   BEGIN
     SELECT RAISE(ABORT, 'posted journal lines are immutable');
   END`,
  `CREATE TRIGGER IF NOT EXISTS journal_lines_posted_delete_block
   BEFORE DELETE ON journal_lines
   WHEN EXISTS (
     SELECT 1 FROM journal_entries entry
     WHERE entry.id = OLD.journal_entry_id AND entry.status = 'POSTED'
   )
   BEGIN
     SELECT RAISE(ABORT, 'posted journal lines are immutable');
   END`
];

const obsoleteOperationalColumns = [
  { table: 'ticketing_sales', column: 'flight_order_id' },
  { table: 'passenger_tickets', column: 'flight_order_id' },
  { table: 'cargo_bookings', column: 'flight_order_id' },
  { table: 'passenger_ticket_reschedules', column: 'previous_flight_order_id' },
  { table: 'passenger_ticket_reschedules', column: 'new_flight_order_id' },
  { table: 'invoices', column: 'flight_order_id' }
];

export function runMigrations(sqlite: Database.Database) {
  assertCleanRebuildCompatible(sqlite);

  sqlite.pragma('foreign_keys = OFF');
  const migrate = sqlite.transaction(() => {
    for (const statement of createStatements) {
      sqlite.exec(statement);
    }
    ensureDepreciationScheduleCancellationStatus(sqlite);

    migrateMaintenanceIssueTargets(sqlite);
    ensureColumn(
      sqlite,
      'asset_register',
      'managed_asset_id',
      'TEXT REFERENCES managed_assets(id)'
    );
    ensureColumn(sqlite, 'asset_maintenance_work_orders', 'completion_evidence_reference', 'TEXT');
    sqlite.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_single_live_maintenance
      ON asset_maintenance_work_orders(asset_id)
      WHERE status IN ('OPEN', 'IN_PROGRESS', 'WAITING_PARTS')`);
    sqlite.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_register_managed_asset ON asset_register(managed_asset_id) WHERE managed_asset_id IS NOT NULL'
    );
    seedFlightOperationLookups(sqlite);
    ensureColumn(sqlite, 'flight_operations', 'order_number', "TEXT NOT NULL DEFAULT ''");
    ensureColumn(
      sqlite,
      'flight_station_service_requests',
      'version',
      'INTEGER NOT NULL DEFAULT 1'
    );
    ensureColumn(sqlite, 'flight_station_costs', 'version', 'INTEGER NOT NULL DEFAULT 1');
    ensureColumn(sqlite, 'flight_readiness_checks', 'classification', 'TEXT');
    ensureColumn(sqlite, 'flight_readiness_checks', 'calculation_status', 'TEXT');
    ensureColumn(sqlite, 'flight_readiness_checks', 'verification_status', 'TEXT');
    ensureColumn(sqlite, 'flight_readiness_checks', 'effective_status', 'TEXT');
    ensureColumn(sqlite, 'flight_readiness_checks', 'calculated_at', 'TEXT');
    ensureColumn(sqlite, 'flight_readiness_checks', 'expiry_at', 'TEXT');
    ensureColumn(sqlite, 'flight_readiness_checks', 'invalidation_reason', 'TEXT');
    ensureColumn(sqlite, 'flight_readiness_checks', 'source_record_ids', 'TEXT');
    ensureColumn(
      sqlite,
      'flight_operations',
      'flight_request_id',
      'TEXT REFERENCES flight_requests(id)'
    );
    ensureLookupColumns(sqlite);
    ensureColumn(
      sqlite,
      'flight_operations',
      'request_source',
      "TEXT NOT NULL DEFAULT 'Corporate Charter Request'"
    );
    ensureColumn(sqlite, 'flight_operations', 'billing_type', "TEXT NOT NULL DEFAULT 'CHARTER'");
    ensureColumn(sqlite, 'flight_operations', 'estimated_revenue', 'INTEGER');
    ensureColumn(sqlite, 'flight_operations', 'currency_code', "TEXT NOT NULL DEFAULT 'IDR'");
    ensureColumn(
      sqlite,
      'flight_operations',
      'actual_departure_station_id',
      'TEXT REFERENCES stations(id)'
    );
    ensureColumn(
      sqlite,
      'flight_operations',
      'actual_arrival_station_id',
      'TEXT REFERENCES stations(id)'
    );
    ensureColumn(sqlite, 'stations', 'station_pic_name', 'TEXT');
    ensureColumn(sqlite, 'stations', 'station_pic_phone', 'TEXT');
    ensureColumn(sqlite, 'stations', 'operational_notes', 'TEXT');
    ensureColumn(sqlite, 'stations', 'is_remote_station', 'INTEGER NOT NULL DEFAULT 0');
    ensureColumn(sqlite, 'stations', 'low_connectivity_mode', 'INTEGER NOT NULL DEFAULT 0');
    ensureColumn(sqlite, 'routes', 'operational_notes', 'TEXT');
    ensureColumn(
      sqlite,
      'routes',
      'restriction_level',
      "TEXT NOT NULL DEFAULT 'NONE' CHECK (restriction_level IN ('NONE', 'ADVISORY', 'BLOCKING'))"
    );
    ensureColumn(sqlite, 'routes', 'restriction_note', 'TEXT');
    ensureColumn(sqlite, 'aircraft', 'serial_number', 'TEXT');
    ensureColumn(sqlite, 'aircraft', 'fleet_code', 'TEXT');
    ensureColumn(sqlite, 'aircraft', 'operational_status', "TEXT NOT NULL DEFAULT 'ACTIVE'");
    ensureColumn(
      sqlite,
      'aircraft',
      'default_capacity_profile_id',
      'TEXT REFERENCES flight_capacity_profiles(id)'
    );
    ensureColumn(sqlite, 'aircraft', 'current_station_id', 'TEXT REFERENCES stations(id)');
    ensureColumn(sqlite, 'aircraft', 'last_maintenance_check_at', 'TEXT');
    ensureColumn(sqlite, 'aircraft', 'next_maintenance_due_at', 'TEXT');
    ensureColumn(sqlite, 'aircraft', 'serviceability_note', 'TEXT');
    ensureColumn(
      sqlite,
      'inventory_movements',
      'destination_station_id',
      'TEXT REFERENCES stations(id)'
    );
    ensureColumn(sqlite, 'inventory_movements', 'is_finalized', 'INTEGER NOT NULL DEFAULT 1');
    ensureColumn(sqlite, 'inventory_repair_orders', 'station_id', 'TEXT REFERENCES stations(id)');
    sqlite.exec(
      `UPDATE inventory_repair_orders
       SET station_id = COALESCE(
         (SELECT warehouse.station_id
          FROM inventory_serialized_parts serial
          JOIN inventory_bins bin ON bin.id = serial.bin_id
          JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
          WHERE serial.id = inventory_repair_orders.serial_id),
         (SELECT aircraft.current_station_id
          FROM inventory_serialized_parts serial
          JOIN aircraft ON aircraft.id = serial.aircraft_id
          WHERE serial.id = inventory_repair_orders.serial_id),
         (SELECT movement.station_id
          FROM inventory_movements movement
          WHERE movement.source_type = 'REPAIR_ORDER'
            AND movement.source_id = inventory_repair_orders.id
          ORDER BY movement.rowid DESC LIMIT 1)
       )
       WHERE station_id IS NULL`
    );
    for (const statement of inventoryImmutabilityStatements) {
      sqlite.exec(statement);
    }
    for (const statement of accountingIntegrityStatements) {
      sqlite.exec(statement);
    }
    ensureColumn(
      sqlite,
      'crews',
      'availability_status',
      "TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'ON_DUTY', 'ASSIGNED_OTHER_FLIGHT', 'ON_LEAVE', 'UNAVAILABLE'))"
    );
    ensureColumn(sqlite, 'crews', 'duty_station_id', 'TEXT REFERENCES stations(id)');
    ensureColumn(sqlite, 'crews', 'readiness_note', 'TEXT');
    ensureColumn(sqlite, 'flight_capacity_profiles', 'profile_name', "TEXT NOT NULL DEFAULT ''");
    sqlite.exec(
      `UPDATE flight_capacity_profiles
       SET profile_name = profile_code
       WHERE profile_name IS NULL OR profile_name = ''`
    );
    ensureColumn(sqlite, 'flight_reasons', 'reason_name', "TEXT NOT NULL DEFAULT ''");
    sqlite.exec(
      `UPDATE flight_reasons
       SET reason_name = reason_code
       WHERE reason_name IS NULL OR reason_name = ''`
    );
    ensureColumn(sqlite, 'flight_reasons', 'affects_operational_kpi', 'INTEGER NOT NULL DEFAULT 1');
    ensureColumn(sqlite, 'flight_reasons', 'affects_finance_review', 'INTEGER NOT NULL DEFAULT 0');
    ensureColumn(
      sqlite,
      'flight_reasons',
      'dashboard_severity',
      "TEXT NOT NULL DEFAULT 'WARNING' CHECK (dashboard_severity IN ('INFO', 'WARNING', 'CRITICAL'))"
    );
    ensureColumn(
      sqlite,
      'rate_cards',
      'pricing_scope',
      "TEXT NOT NULL DEFAULT 'PUBLIC_COUNTER' CHECK (pricing_scope IN ('PUBLIC_COUNTER', 'CORPORATE_CONTRACT', 'CARGO_CONTRACT', 'CHARTER_CONTRACT'))"
    );
    ensureColumn(sqlite, 'rate_cards', 'tax_code_id', 'TEXT REFERENCES tax_codes(id)');
    ensureColumn(
      sqlite,
      'rate_cards',
      'booking_channel',
      "TEXT NOT NULL DEFAULT 'COUNTER' CHECK (booking_channel IN ('COUNTER', 'AGENT', 'CORPORATE', 'CARGO', 'CHARTER'))"
    );
    ensureColumn(
      sqlite,
      'rate_cards',
      'passenger_type',
      "TEXT CHECK (passenger_type IS NULL OR passenger_type IN ('ADULT', 'CHILD', 'INFANT'))"
    );
    ensureColumn(
      sqlite,
      'rate_cards',
      'cargo_price_basis',
      "TEXT CHECK (cargo_price_basis IS NULL OR cargo_price_basis IN ('ACTUAL_WEIGHT', 'VOLUME_WEIGHT', 'CHARGEABLE_WEIGHT'))"
    );
    ensureColumn(
      sqlite,
      'rate_cards',
      'rate_priority',
      'INTEGER NOT NULL DEFAULT 100 CHECK (rate_priority >= 0)'
    );
    ensureColumn(sqlite, 'rate_cards', 'minimum_charge', 'INTEGER');
    ensureColumn(sqlite, 'rate_cards', 'demo_usage_note', 'TEXT');
    sqlite.exec(
      `UPDATE flight_operations
       SET order_number = 'FO-' || substr(flight_number, 5)
       WHERE order_number IS NULL OR order_number = ''`
    );
    // Migrate verification data for existing flights after schema is ready
    migrateVerificationData(sqlite);
    sqlite.exec(
      `DELETE FROM flight_actual_reconciliations
       WHERE rowid NOT IN (
         SELECT MAX(rowid) FROM flight_actual_reconciliations GROUP BY flight_id
       )`
    );
    sqlite.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_flight_actual_reconciliations_unique_flight
       ON flight_actual_reconciliations(flight_id)`
    );
    recreateIndexes(sqlite);
    sqlite.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_flight_operations_order_number ON flight_operations(order_number)'
    );
    sqlite.exec(
      'CREATE INDEX IF NOT EXISTS idx_flight_operations_request ON flight_operations(flight_request_id)'
    );
    sqlite.exec(
      'CREATE INDEX IF NOT EXISTS idx_flight_requests_status ON flight_requests(status_id)'
    );
    sqlite.exec(
      'CREATE INDEX IF NOT EXISTS idx_flight_operation_approvals_flight ON flight_operation_approvals(flight_id)'
    );
  });

  try {
    migrate();
  } finally {
    sqlite.pragma('foreign_keys = ON');
  }
}

function quoteSqlIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function sqliteTableNames(sqlite: Database.Database) {
  return (
    sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>
  ).map((row) => row.name);
}

function obsoleteTables(sqlite: Database.Database) {
  return sqliteTableNames(sqlite).filter((table) => {
    const normalizedTable = table.toLowerCase();
    return (
      normalizedTable.startsWith(obsoleteTablePrefix) ||
      normalizedTable.includes('legacy') ||
      obsoleteOperationalTables.has(normalizedTable)
    );
  });
}

function tableExists(sqlite: Database.Database, table: string) {
  return sqliteTableNames(sqlite).includes(table);
}

function hasCleanRebuildIncompatibleShape(sqlite: Database.Database) {
  return canonicalShapeRequirements.filter(
    ({ table, column }) => tableExists(sqlite, table) && !hasColumn(sqlite, table, column)
  );
}

function existingObsoleteOperationalColumns(sqlite: Database.Database) {
  return obsoleteOperationalColumns.filter(
    ({ table, column }) => tableExists(sqlite, table) && hasColumn(sqlite, table, column)
  );
}

function assertCleanRebuildCompatible(sqlite: Database.Database) {
  const obsolete = obsoleteTables(sqlite);
  const incompatible = hasCleanRebuildIncompatibleShape(sqlite);
  const obsoleteColumns = existingObsoleteOperationalColumns(sqlite);
  if (obsolete.length === 0 && incompatible.length === 0 && obsoleteColumns.length === 0) {
    return;
  }

  const details = [
    obsolete.length > 0 ? `obsolete tables: ${obsolete.join(', ')}` : undefined,
    incompatible.length > 0
      ? `incompatible table shapes: ${incompatible
          .map(({ table, column }) => `${table} missing ${column}`)
          .join(', ')}`
      : undefined,
    obsoleteColumns.length > 0
      ? `obsolete columns: ${obsoleteColumns
          .map(({ table, column }) => `${table}.${column}`)
          .join(', ')}`
      : undefined
  ]
    .filter(Boolean)
    .join('; ');

  throw new Error(`${cleanRebuildRequiredMessage} ${details}`);
}

function ensureColumn(
  sqlite: Database.Database,
  table: string,
  column: string,
  definition: string
) {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrateMaintenanceIssueTargets(sqlite: Database.Database) {
  if (!tableExists(sqlite, 'maintenance_part_issues')) return;
  const columns = sqlite.pragma('table_info(maintenance_part_issues)') as Array<{
    name: string;
    notnull: number;
  }>;
  const aircraftColumn = columns.find((column) => column.name === 'aircraft_id');
  if (columns.some((column) => column.name === 'target_type') && aircraftColumn?.notnull === 0)
    return;

  sqlite.exec(
    'ALTER TABLE maintenance_part_issue_lines RENAME TO maintenance_part_issue_lines_legacy'
  );
  sqlite.exec('ALTER TABLE maintenance_part_issues RENAME TO maintenance_part_issues_legacy');
  sqlite.exec(`CREATE TABLE maintenance_part_issues (
    id TEXT PRIMARY KEY, issue_number TEXT NOT NULL UNIQUE, maintenance_handoff_id TEXT,
    target_type TEXT NOT NULL DEFAULT 'AIRCRAFT' CHECK (target_type IN ('AIRCRAFT', 'CORPORATE_ASSET')),
    target_id TEXT NOT NULL, asset_maintenance_work_order_id TEXT,
    aircraft_id TEXT REFERENCES aircraft(id), flight_id TEXT,
    warehouse_id TEXT NOT NULL REFERENCES inventory_warehouses(id), reason TEXT NOT NULL,
    movement_id TEXT NOT NULL UNIQUE REFERENCES inventory_movements(id),
    status TEXT NOT NULL CHECK (status IN ('ISSUED', 'REVERSED')),
    total_parts_value_idr INTEGER NOT NULL CHECK (total_parts_value_idr >= 0),
    issued_by_user_id TEXT NOT NULL, issued_at TEXT NOT NULL
  )`);
  sqlite.exec(`CREATE TABLE maintenance_part_issue_lines (
    id TEXT PRIMARY KEY, issue_id TEXT NOT NULL REFERENCES maintenance_part_issues(id) ON DELETE CASCADE,
    part_id TEXT NOT NULL REFERENCES inventory_parts(id), quantity REAL NOT NULL CHECK (quantity > 0),
    base_value_idr INTEGER NOT NULL CHECK (base_value_idr >= 0), note TEXT
  )`);
  sqlite.exec(`INSERT INTO maintenance_part_issues
    (id, issue_number, maintenance_handoff_id, target_type, target_id,
     asset_maintenance_work_order_id, aircraft_id, flight_id, warehouse_id, reason,
     movement_id, status, total_parts_value_idr, issued_by_user_id, issued_at)
    SELECT id, issue_number, maintenance_handoff_id, 'AIRCRAFT', aircraft_id,
      NULL, aircraft_id, flight_id, warehouse_id, reason, movement_id, status,
      total_parts_value_idr, issued_by_user_id, issued_at FROM maintenance_part_issues_legacy`);
  sqlite.exec(`INSERT INTO maintenance_part_issue_lines
    SELECT id, issue_id, part_id, quantity, base_value_idr, note
    FROM maintenance_part_issue_lines_legacy`);
  sqlite.exec('DROP TABLE maintenance_part_issue_lines_legacy');
  sqlite.exec('DROP TABLE maintenance_part_issues_legacy');
}

function ensureDepreciationScheduleCancellationStatus(sqlite: Database.Database) {
  const table = sqlite
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'depreciation_schedules'"
    )
    .get() as { sql: string } | undefined;
  if (!table || table.sql.includes("'CANCELLED'")) return;

  sqlite.exec(`
    ALTER TABLE depreciation_schedules RENAME TO depreciation_schedules_legacy;
    CREATE TABLE depreciation_schedules (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL REFERENCES asset_register(id) ON DELETE CASCADE,
      period_id TEXT NOT NULL REFERENCES accounting_periods(id),
      depreciation_amount_minor INTEGER NOT NULL CHECK (depreciation_amount_minor >= 0),
      status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'POSTED', 'CANCELLED')),
      journal_entry_id TEXT REFERENCES journal_entries(id),
      created_at TEXT NOT NULL,
      UNIQUE (asset_id, period_id)
    );
    INSERT INTO depreciation_schedules (
      id, asset_id, period_id, depreciation_amount_minor, status, journal_entry_id, created_at
    )
    SELECT id, asset_id, period_id, depreciation_amount_minor, status, journal_entry_id, created_at
    FROM depreciation_schedules_legacy;
    DROP TABLE depreciation_schedules_legacy;
  `);
}

function lookupId(idPrefix: string, code: string) {
  return `${idPrefix}-${code.toLowerCase().replaceAll('_', '-')}`;
}

function seedFlightOperationLookups(sqlite: Database.Database) {
  const now = new Date().toISOString();
  const statementCache = new Map<string, Database.Statement>();
  for (const seed of flightOperationLookupSeeds) {
    let statement = statementCache.get(seed.table);
    if (!statement) {
      statement = sqlite.prepare(
        `INSERT OR IGNORE INTO ${seed.table}
          (id, code, label, sort_order, is_active, created_at, updated_at)
         VALUES (@id, @code, @label, @sortOrder, 1, @createdAt, @updatedAt)`
      );
      statementCache.set(seed.table, statement);
    }
    seed.values.forEach(([code, label], index) => {
      statement.run({
        id: lookupId(seed.idPrefix, code),
        code,
        label,
        sortOrder: index + 1,
        createdAt: now,
        updatedAt: now
      });
    });
  }
}

function hasColumn(sqlite: Database.Database, table: string, column: string) {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((item) => item.name === column);
}

function backfillLookupColumn(
  sqlite: Database.Database,
  table: string,
  oldColumn: string,
  newColumn: string,
  lookupTable: string,
  fallbackCode?: string
) {
  if (!hasColumn(sqlite, table, newColumn)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${newColumn} TEXT`);
  }

  const oldColumnExists = hasColumn(sqlite, table, oldColumn);
  if (oldColumnExists) {
    const unmapped = sqlite
      .prepare(
        `SELECT ${oldColumn} as code
         FROM ${table}
         WHERE ${oldColumn} IS NOT NULL
           AND ${oldColumn} NOT IN (SELECT code FROM ${lookupTable})
         LIMIT 1`
      )
      .get() as { code?: string } | undefined;

    if (unmapped?.code) {
      throw new Error(
        `Cannot migrate ${table}.${oldColumn}: lookup code ${unmapped.code} is not seeded in ${lookupTable}`
      );
    }

    sqlite.exec(
      `UPDATE ${table}
       SET ${newColumn} = (
         SELECT lookup.id FROM ${lookupTable} lookup
         WHERE lookup.code = ${table}.${oldColumn}
       )
       WHERE ${newColumn} IS NULL`
    );
  }

  if (fallbackCode) {
    sqlite.exec(
      `UPDATE ${table}
       SET ${newColumn} = (
         SELECT lookup.id FROM ${lookupTable} lookup WHERE lookup.code = '${fallbackCode}'
       )
       WHERE ${newColumn} IS NULL`
    );
  }
}

function ensureLookupColumns(sqlite: Database.Database) {
  backfillLookupColumn(
    sqlite,
    'flight_schedule_templates',
    'service_type',
    'service_type_id',
    'flight_service_types',
    'CHARTER_CARGO'
  );
  backfillLookupColumn(
    sqlite,
    'flight_capacity_profiles',
    'service_type',
    'service_type_id',
    'flight_service_types',
    'CHARTER_CARGO'
  );
  backfillLookupColumn(
    sqlite,
    'flight_requests',
    'status',
    'status_id',
    'flight_request_statuses',
    'DRAFT'
  );
  backfillLookupColumn(
    sqlite,
    'flight_requests',
    'flight_type',
    'flight_type_id',
    'flight_types',
    'CHARTER'
  );
  backfillLookupColumn(
    sqlite,
    'flight_requests',
    'service_type',
    'service_type_id',
    'flight_service_types',
    'CHARTER_CARGO'
  );
  backfillLookupColumn(
    sqlite,
    'flight_requests',
    'priority',
    'priority_id',
    'flight_priorities',
    'NORMAL'
  );
  backfillLookupColumn(
    sqlite,
    'flight_operations',
    'flight_type',
    'flight_type_id',
    'flight_types',
    'CHARTER'
  );
  backfillLookupColumn(
    sqlite,
    'flight_operations',
    'service_type',
    'service_type_id',
    'flight_service_types',
    'CHARTER_CARGO'
  );
  backfillLookupColumn(
    sqlite,
    'flight_operations',
    'priority',
    'priority_id',
    'flight_priorities',
    'NORMAL'
  );
  backfillLookupColumn(
    sqlite,
    'flight_operations',
    'current_status',
    'current_status_id',
    'flight_operation_statuses',
    'DRAFT'
  );
  backfillLookupColumn(
    sqlite,
    'flight_crew_assignments',
    'assignment_role',
    'assignment_role_id',
    'crew_assignment_roles',
    'GROUND_CREW'
  );
  backfillLookupColumn(
    sqlite,
    'flight_status_histories',
    'from_status',
    'from_status_id',
    'flight_operation_statuses'
  );
  backfillLookupColumn(
    sqlite,
    'flight_status_histories',
    'to_status',
    'to_status_id',
    'flight_operation_statuses',
    'DRAFT'
  );
  backfillLookupColumn(
    sqlite,
    'flight_status_histories',
    'action_type',
    'action_type_id',
    'flight_action_types',
    'CREATE'
  );
  backfillLookupColumn(
    sqlite,
    'flight_operation_approvals',
    'approval_type',
    'approval_type_id',
    'flight_approval_types',
    'READINESS_APPROVAL'
  );
  backfillLookupColumn(
    sqlite,
    'flight_operation_approvals',
    'status',
    'status_id',
    'flight_approval_statuses',
    'NOT_STARTED'
  );
  backfillLookupColumn(
    sqlite,
    'flight_operation_attachments',
    'status',
    'status_id',
    'flight_attachment_statuses',
    'PENDING'
  );
  backfillLookupColumn(
    sqlite,
    'flight_readiness_checks',
    'status',
    'status_id',
    'readiness_statuses',
    'PENDING'
  );
  backfillLookupColumn(
    sqlite,
    'flight_manifests',
    'manifest_type',
    'manifest_type_id',
    'manifest_types',
    'PASSENGER'
  );
  backfillLookupColumn(
    sqlite,
    'flight_manifests',
    'status',
    'status_id',
    'manifest_statuses',
    'DRAFT'
  );
  backfillLookupColumn(
    sqlite,
    'flight_manifest_cargo_items',
    'dg_acceptance_status',
    'dg_acceptance_status_id',
    'dg_acceptance_statuses',
    'NOT_APPLICABLE'
  );
  backfillLookupColumn(
    sqlite,
    'flight_fuel_requests',
    'status',
    'status_id',
    'fuel_workflow_statuses',
    'REQUESTED'
  );
  backfillLookupColumn(
    sqlite,
    'flight_station_service_requests',
    'service_type',
    'service_type_id',
    'station_service_types',
    'HANDLING'
  );
  backfillLookupColumn(
    sqlite,
    'flight_station_service_requests',
    'status',
    'status_id',
    'station_service_statuses',
    'REQUESTED'
  );
  backfillLookupColumn(
    sqlite,
    'flight_station_costs',
    'status',
    'status_id',
    'station_cost_statuses',
    'DRAFT'
  );
  backfillLookupColumn(
    sqlite,
    'flight_maintenance_handoffs',
    'serviceability_status',
    'serviceability_status_id',
    'aircraft_serviceability_statuses',
    'SERVICEABLE'
  );
  backfillLookupColumn(
    sqlite,
    'flight_maintenance_handoffs',
    'status',
    'status_id',
    'maintenance_handoff_statuses',
    'DRAFT'
  );
  backfillLookupColumn(
    sqlite,
    'flight_finance_handoffs',
    'event_type',
    'event_type_id',
    'finance_event_types',
    'FUEL_COST_DRAFT'
  );
  backfillLookupColumn(
    sqlite,
    'flight_finance_handoffs',
    'status',
    'status_id',
    'finance_handoff_statuses',
    'DRAFT'
  );
}

function recreateIndexes(sqlite: Database.Database) {
  for (const statement of createStatements) {
    if (/^CREATE (UNIQUE )?INDEX/u.test(statement)) {
      sqlite.exec(statement);
    }
  }
}

export function dropDemoDatabase(sqlite: Database.Database) {
  sqlite.pragma('foreign_keys = OFF');
  const drop = sqlite.transaction(() => {
    for (const statement of dropStatements) {
      sqlite.exec(statement);
    }
    for (const table of obsoleteTables(sqlite)) {
      sqlite.exec(`DROP TABLE IF EXISTS ${quoteSqlIdentifier(table)}`);
    }
  });

  try {
    drop();
  } finally {
    sqlite.pragma('foreign_keys = ON');
  }
}
