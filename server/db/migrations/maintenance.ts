export const maintenanceStatements = [
  `CREATE TABLE IF NOT EXISTS maintenance_work_packages (
    id TEXT PRIMARY KEY,
    package_number TEXT NOT NULL UNIQUE,
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    source_flight_id TEXT REFERENCES flight_operations(id),
    primary_defect_id TEXT REFERENCES aircraft_defects(id),
    title TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'AOG')),
    execution_mode TEXT NOT NULL CHECK (execution_mode IN ('INTERNAL', 'EXTERNAL_AMO_VENDOR')),
    vendor_id TEXT REFERENCES vendors(id),
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'READY_FOR_RELEASE', 'RELEASED', 'CANCELLED')),
    planning_note TEXT,
    release_id TEXT REFERENCES aircraft_maintenance_releases(id),
    released_at TEXT,
    financial_status TEXT NOT NULL DEFAULT 'NOT_READY'
      CHECK (financial_status IN ('NOT_READY', 'READY_FOR_HANDOFF', 'HANDED_OFF', 'POSTED', 'BLOCKED')),
    version INTEGER NOT NULL DEFAULT 1,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_defect_assessments (
    id TEXT PRIMARY KEY,
    defect_id TEXT NOT NULL REFERENCES aircraft_defects(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    assessment_decision TEXT NOT NULL CHECK (assessment_decision IN ('GROUND', 'DEFER', 'NO_IMPACT')),
    assessment_note TEXT NOT NULL,
    assessed_by_user_id TEXT NOT NULL,
    assessed_at TEXT NOT NULL,
    request_id TEXT,
    UNIQUE (defect_id)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_job_cards (
	    id TEXT PRIMARY KEY,
	    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id) ON DELETE CASCADE,
    card_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('DEFECT_RECTIFICATION', 'SCHEDULED_TASK', 'NON_ROUTINE', 'INSPECTION', 'COMPONENT_CHANGE')),
    maintenance_data_ref TEXT NOT NULL,
    maintenance_data_revision TEXT NOT NULL,
    mandatory_flag INTEGER NOT NULL DEFAULT 1 CHECK (mandatory_flag IN (0, 1)),
    requires_independent_inspection INTEGER NOT NULL DEFAULT 0 CHECK (requires_independent_inspection IN (0, 1)),
    status TEXT NOT NULL CHECK (status IN ('READY', 'IN_PROGRESS', 'INSPECTION_REQUIRED', 'REJECTED_FOR_REWORK', 'READY_FOR_RELEASE_REVIEW', 'CANCELLED')),
    version INTEGER NOT NULL DEFAULT 1,
    created_by_user_id TEXT NOT NULL,
	    created_at TEXT NOT NULL,
	    updated_at TEXT NOT NULL
	  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_work_package_requirement_links (
	    id TEXT PRIMARY KEY,
	    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id) ON DELETE CASCADE,
	    requirement_id TEXT NOT NULL REFERENCES aircraft_maintenance_requirements(id),
	    job_card_id TEXT NOT NULL REFERENCES maintenance_job_cards(id),
	    created_by_user_id TEXT NOT NULL,
	    created_at TEXT NOT NULL,
	    UNIQUE (work_package_id, requirement_id),
	    UNIQUE (requirement_id),
	    UNIQUE (requirement_id, job_card_id)
	  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_job_card_signoffs (
	    id TEXT PRIMARY KEY,
	    job_card_id TEXT NOT NULL REFERENCES maintenance_job_cards(id),
    signoff_type TEXT NOT NULL CHECK (signoff_type IN ('MECHANIC', 'INDEPENDENT_INSPECTION')),
    decision TEXT NOT NULL CHECK (decision IN ('COMPLETED', 'PASSED', 'FAILED')),
    statement TEXT NOT NULL,
    evidence_references TEXT NOT NULL DEFAULT '[]',
    certifying_license_number TEXT,
    company_authorization_snapshot_json TEXT,
    actor_user_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    signed_at TEXT NOT NULL,
    request_id TEXT,
    UNIQUE (job_card_id, signoff_type)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_inspection_attempts (
    id TEXT PRIMARY KEY,
    job_card_id TEXT NOT NULL REFERENCES maintenance_job_cards(id),
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    cycle_number INTEGER NOT NULL CHECK (cycle_number > 0),
    result TEXT NOT NULL CHECK (result IN ('PASSED', 'FAILED')),
    finding TEXT NOT NULL,
    inspector_user_id TEXT NOT NULL,
    inspector_role TEXT NOT NULL,
    inspector_license_number TEXT NOT NULL,
    inspector_license_snapshot_json TEXT NOT NULL DEFAULT '{}',
    company_authorization_snapshot_json TEXT,
    package_version INTEGER NOT NULL,
    inspected_at TEXT NOT NULL,
    idempotency_key TEXT,
    request_id TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (job_card_id, attempt_number)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_rework_actions (
    id TEXT PRIMARY KEY,
    rework_number TEXT NOT NULL UNIQUE,
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    job_card_id TEXT NOT NULL REFERENCES maintenance_job_cards(id),
    source_inspection_attempt_id TEXT NOT NULL REFERENCES maintenance_inspection_attempts(id),
    cycle_number INTEGER NOT NULL CHECK (cycle_number > 0),
    finding TEXT NOT NULL,
    corrective_action_description TEXT NOT NULL DEFAULT '',
    approved_data_ref TEXT NOT NULL DEFAULT '',
    assigned_mechanic_user_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('REWORK_REQUIRED', 'CORRECTIVE_WORK_IN_PROGRESS', 'AWAITING_REINSPECTION', 'REINSPECTION_PASSED', 'REINSPECTION_FAILED', 'CANCELLED')),
    mechanic_signoff_statement TEXT,
    mechanic_signoff_user_id TEXT,
    mechanic_signoff_role TEXT,
    mechanic_license_number TEXT,
    company_authorization_snapshot_json TEXT,
    mechanic_signoff_at TEXT,
    reinspection_attempt_id TEXT REFERENCES maintenance_inspection_attempts(id),
    request_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (source_inspection_attempt_id)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_inspection_idempotency_keys (
    id TEXT PRIMARY KEY,
    command_type TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    job_card_id TEXT NOT NULL REFERENCES maintenance_job_cards(id),
    inspection_attempt_id TEXT REFERENCES maintenance_inspection_attempts(id),
    request_hash TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    UNIQUE (command_type, idempotency_key, actor_user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_non_routine_findings (
    id TEXT PRIMARY KEY,
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    job_card_id TEXT REFERENCES maintenance_job_cards(id),
    finding_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'ADDED_TO_SCOPE', 'DEFERRED', 'CLOSED')),
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_financial_claims (
    id TEXT PRIMARY KEY,
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    source_type TEXT NOT NULL CHECK (source_type IN ('INVENTORY_MOVEMENT', 'VENDOR_INVOICE', 'MANUAL_COST')),
    source_id TEXT NOT NULL,
    amount_idr INTEGER NOT NULL CHECK (amount_idr >= 0),
    status TEXT NOT NULL CHECK (status IN ('READY', 'HANDED_OFF', 'POSTED', 'SKIPPED_DUPLICATE')),
    handoff_reference TEXT,
	    created_by_user_id TEXT NOT NULL,
	    created_at TEXT NOT NULL,
	    UNIQUE (source_type, source_id)
	  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_company_authorizations (
    id TEXT PRIMARY KEY,
    authorization_number TEXT NOT NULL UNIQUE,
    personnel_id TEXT NOT NULL REFERENCES crews(id),
    actor_user_id TEXT,
    license_id TEXT NOT NULL REFERENCES personnel_licenses(id),
    license_number TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    valid_from TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    permitted_actions_json TEXT NOT NULL DEFAULT '[]',
    aircraft_type_scope_json TEXT NOT NULL DEFAULT '[]',
    aircraft_registration_scope_json TEXT NOT NULL DEFAULT '[]',
    notes TEXT,
    issued_by TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_release_idempotency_keys (
	    id TEXT PRIMARY KEY,
	    command_type TEXT NOT NULL,
	    idempotency_key TEXT NOT NULL,
	    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
	    release_id TEXT REFERENCES aircraft_maintenance_releases(id),
	    request_hash TEXT NOT NULL,
	    actor_user_id TEXT NOT NULL,
	    created_at TEXT NOT NULL,
	    completed_at TEXT,
	    UNIQUE (command_type, idempotency_key, actor_user_id)
	  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_audit_logs (
	    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    request_id TEXT,
    before_version INTEGER,
    after_version INTEGER,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    occurred_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mwp_aircraft_status ON maintenance_work_packages(aircraft_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mwp_source_flight ON maintenance_work_packages(source_flight_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mjc_package_status ON maintenance_job_cards(work_package_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_inspection_attempts_card ON maintenance_inspection_attempts(job_card_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_rework_actions_package ON maintenance_rework_actions(work_package_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_inspection_idempotency_card ON maintenance_inspection_idempotency_keys(job_card_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_company_auth_personnel ON maintenance_company_authorizations(personnel_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_company_auth_license ON maintenance_company_authorizations(license_id, license_number)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_requirement_links_package ON maintenance_work_package_requirement_links(work_package_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_requirement_links_requirement ON maintenance_work_package_requirement_links(requirement_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_release_idempotency_package ON maintenance_release_idempotency_keys(work_package_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_audit_entity ON maintenance_audit_logs(entity_type, entity_id, occurred_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_serial_active_aircraft_position
    ON inventory_serialized_parts(aircraft_id, position)
    WHERE condition = 'INSTALLED' AND aircraft_id IS NOT NULL AND position IS NOT NULL`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_signoff_no_update
    BEFORE UPDATE ON maintenance_job_card_signoffs
    BEGIN
      SELECT RAISE(ABORT, 'maintenance job card signoffs are immutable');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_signoff_no_delete
    BEFORE DELETE ON maintenance_job_card_signoffs
    BEGIN
      SELECT RAISE(ABORT, 'maintenance job card signoffs are immutable');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_inspection_attempt_no_update
    BEFORE UPDATE ON maintenance_inspection_attempts
    BEGIN
      SELECT RAISE(ABORT, 'maintenance inspection attempts are immutable');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_inspection_attempt_no_delete
    BEFORE DELETE ON maintenance_inspection_attempts
    BEGIN
      SELECT RAISE(ABORT, 'maintenance inspection attempts are immutable');
    END`
];

export const maintenanceDropStatements = [
  'DROP TRIGGER IF EXISTS trg_mro_inspection_attempt_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_inspection_attempt_no_update',
  'DROP TRIGGER IF EXISTS trg_mro_signoff_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_signoff_no_update',
  'DROP TABLE IF EXISTS maintenance_audit_logs',
  'DROP TABLE IF EXISTS maintenance_company_authorizations',
  'DROP TABLE IF EXISTS maintenance_inspection_idempotency_keys',
  'DROP TABLE IF EXISTS maintenance_rework_actions',
  'DROP TABLE IF EXISTS maintenance_inspection_attempts',
  'DROP TABLE IF EXISTS maintenance_release_idempotency_keys',
  'DROP TABLE IF EXISTS maintenance_financial_claims',
  'DROP TABLE IF EXISTS maintenance_non_routine_findings',
  'DROP TABLE IF EXISTS maintenance_job_card_signoffs',
  'DROP TABLE IF EXISTS maintenance_work_package_requirement_links',
  'DROP TABLE IF EXISTS maintenance_job_cards',
  'DROP TABLE IF EXISTS maintenance_defect_assessments',
  'DROP TABLE IF EXISTS maintenance_work_packages'
];
