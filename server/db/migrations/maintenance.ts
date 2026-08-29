export const maintenanceStatements = [
  `CREATE TABLE IF NOT EXISTS maintenance_work_packages (
    id TEXT PRIMARY KEY,
    package_number TEXT NOT NULL UNIQUE,
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    source_flight_id TEXT REFERENCES flight_operations(id),
    primary_defect_id TEXT REFERENCES aircraft_defects(id),
    source_due_requirement_id TEXT REFERENCES maintenance_due_requirements(id),
    source_due_status_id TEXT REFERENCES maintenance_aircraft_requirement_statuses(id),
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
    source_non_routine_finding_id TEXT REFERENCES maintenance_non_routine_findings(id),
    card_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('DEFECT_RECTIFICATION', 'SCHEDULED_TASK', 'NON_ROUTINE', 'INSPECTION', 'COMPONENT_CHANGE')),
    maintenance_data_ref TEXT NOT NULL,
    maintenance_data_revision TEXT NOT NULL,
    ata_chapter TEXT,
    aircraft_area TEXT,
    system_name TEXT,
    component_name TEXT,
    component_position TEXT,
    access_panel TEXT,
    estimated_man_hours REAL NOT NULL DEFAULT 0,
    skill_requirement TEXT,
    release_impact TEXT NOT NULL DEFAULT 'BLOCKS_RELEASE' CHECK (release_impact IN ('BLOCKS_RELEASE', 'ADVISORY', 'NO_RELEASE_IMPACT')),
    work_steps_json TEXT NOT NULL DEFAULT '[]',
    acceptance_criteria_json TEXT NOT NULL DEFAULT '[]',
    required_evidence_json TEXT NOT NULL DEFAULT '[]',
    safety_cautions_json TEXT NOT NULL DEFAULT '[]',
    prerequisites_json TEXT NOT NULL DEFAULT '[]',
    dependency_job_card_ids_json TEXT NOT NULL DEFAULT '[]',
    mandatory_flag INTEGER NOT NULL DEFAULT 1 CHECK (mandatory_flag IN (0, 1)),
    requires_independent_inspection INTEGER NOT NULL DEFAULT 0 CHECK (requires_independent_inspection IN (0, 1)),
    status TEXT NOT NULL CHECK (status IN ('READY', 'IN_PROGRESS', 'INSPECTION_REQUIRED', 'REJECTED_FOR_REWORK', 'READY_FOR_RELEASE_REVIEW', 'CANCELLED')),
    version INTEGER NOT NULL DEFAULT 1,
    created_by_user_id TEXT NOT NULL,
	    created_at TEXT NOT NULL,
	    updated_at TEXT NOT NULL
	  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_approved_data_documents (
    id TEXT PRIMARY KEY,
    document_type TEXT NOT NULL CHECK (document_type IN ('AMM', 'IPC', 'SRM', 'WDM', 'CMM', 'MPD', 'AD', 'SB', 'STANDARD_PRACTICE', 'OTHER')),
    document_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    source_issuer TEXT NOT NULL,
    applicability TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    fictional_demo INTEGER NOT NULL DEFAULT 1 CHECK (fictional_demo IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_approved_data_revisions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES maintenance_approved_data_documents(id),
    revision TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'WITHDRAWN')),
    superseded_by_revision_id TEXT REFERENCES maintenance_approved_data_revisions(id),
    fictional_demo INTEGER NOT NULL DEFAULT 1 CHECK (fictional_demo IN (0, 1)),
    demo_file_label TEXT,
    demo_file_url TEXT,
    demo_page_ref TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (document_id, revision)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_job_card_approved_data_links (
    id TEXT PRIMARY KEY,
    job_card_id TEXT NOT NULL REFERENCES maintenance_job_cards(id),
    approved_data_revision_id TEXT NOT NULL REFERENCES maintenance_approved_data_revisions(id),
    usage_note TEXT,
    snapshot_document_number TEXT NOT NULL,
    snapshot_revision TEXT NOT NULL,
    snapshot_effective_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (job_card_id, approved_data_revision_id)
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
  `CREATE TABLE IF NOT EXISTS maintenance_due_requirements (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    aircraft_id TEXT REFERENCES aircraft(id),
    applicability TEXT,
    source_approved_data_revision_id TEXT REFERENCES maintenance_approved_data_revisions(id),
    interval_calendar_days INTEGER CHECK (interval_calendar_days IS NULL OR interval_calendar_days > 0),
    interval_flight_hours REAL CHECK (interval_flight_hours IS NULL OR interval_flight_hours > 0),
    interval_flight_cycles INTEGER CHECK (interval_flight_cycles IS NULL OR interval_flight_cycles > 0),
    tolerance_calendar_days INTEGER,
    tolerance_flight_hours REAL,
    tolerance_flight_cycles INTEGER,
    mandatory INTEGER NOT NULL DEFAULT 1 CHECK (mandatory IN (0, 1)),
    recurring INTEGER NOT NULL DEFAULT 1 CHECK (recurring IN (0, 1)),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    fictional_demo INTEGER NOT NULL DEFAULT 1 CHECK (fictional_demo IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_aircraft_requirement_statuses (
    id TEXT PRIMARY KEY,
    requirement_id TEXT NOT NULL REFERENCES maintenance_due_requirements(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    last_completed_at TEXT,
    last_completed_flight_hours REAL,
    last_completed_flight_cycles INTEGER,
    next_due_at TEXT,
    next_due_flight_hours REAL,
    next_due_flight_cycles INTEGER,
    status TEXT NOT NULL CHECK (status IN ('NOT_DUE', 'DUE_SOON', 'DUE', 'OVERDUE', 'COMPLETED', 'INACTIVE')),
    calculated_at TEXT NOT NULL,
    source_work_package_id TEXT REFERENCES maintenance_work_packages(id),
    source_job_card_id TEXT REFERENCES maintenance_job_cards(id),
    planned_work_package_id TEXT REFERENCES maintenance_work_packages(id),
    last_compliance_record_id TEXT,
    UNIQUE (requirement_id, aircraft_id)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_due_compliance_records (
    id TEXT PRIMARY KEY,
    requirement_id TEXT NOT NULL REFERENCES maintenance_due_requirements(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    status_id TEXT NOT NULL REFERENCES maintenance_aircraft_requirement_statuses(id),
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    release_id TEXT NOT NULL REFERENCES aircraft_maintenance_releases(id),
    complied_at TEXT NOT NULL,
    complied_by_user_id TEXT NOT NULL,
    complied_flight_hours REAL NOT NULL,
    complied_flight_cycles INTEGER NOT NULL,
    previous_next_due_at TEXT,
    previous_next_due_flight_hours REAL,
    previous_next_due_flight_cycles INTEGER,
    next_due_at TEXT,
    next_due_flight_hours REAL,
    next_due_flight_cycles INTEGER,
    created_at TEXT NOT NULL,
    UNIQUE (requirement_id, aircraft_id, release_id),
    UNIQUE (status_id, release_id)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_facilities (
    id TEXT PRIMARY KEY,
    station_id TEXT NOT NULL REFERENCES stations(id),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    facility_type TEXT NOT NULL CHECK (facility_type IN ('LINE_MAINTENANCE', 'BASE_MAINTENANCE', 'MIXED')),
    timezone TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_facility_areas (
    id TEXT PRIMARY KEY,
    facility_id TEXT NOT NULL REFERENCES maintenance_facilities(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    area_type TEXT NOT NULL CHECK (area_type IN ('HANGAR', 'MAINTENANCE_APRON', 'WORKSHOP_AREA')),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (facility_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_facility_bays (
    id TEXT PRIMARY KEY,
    area_id TEXT NOT NULL REFERENCES maintenance_facility_areas(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity = 1),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (area_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_slots (
    id TEXT PRIMARY KEY,
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    station_id TEXT NOT NULL REFERENCES stations(id),
    facility_id TEXT NOT NULL REFERENCES maintenance_facilities(id),
    area_id TEXT NOT NULL REFERENCES maintenance_facility_areas(id),
    bay_id TEXT NOT NULL REFERENCES maintenance_facility_bays(id),
    planned_start_at TEXT NOT NULL,
    planned_end_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('BOOKED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    create_idempotency_key TEXT,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_by_user_id TEXT,
    updated_at TEXT NOT NULL,
    cancelled_by_user_id TEXT,
    cancelled_at TEXT,
    cancellation_reason TEXT,
    actual_start_at TEXT,
    actual_end_at TEXT,
    CHECK (planned_start_at < planned_end_at)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_slot_events (
    id TEXT PRIMARY KEY,
    slot_id TEXT NOT NULL REFERENCES maintenance_slots(id),
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('BOOKED', 'RESCHEDULED', 'CANCELLED')),
    actor_user_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    old_facility_id TEXT,
    old_area_id TEXT,
    old_bay_id TEXT,
    old_planned_start_at TEXT,
    old_planned_end_at TEXT,
    new_facility_id TEXT,
    new_area_id TEXT,
    new_bay_id TEXT,
    new_planned_start_at TEXT,
    new_planned_end_at TEXT,
    reason TEXT,
    occurred_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_gse_requirements (
    id TEXT PRIMARY KEY,
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    job_card_id TEXT REFERENCES maintenance_job_cards(id),
    equipment_type TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    mandatory INTEGER NOT NULL DEFAULT 1 CHECK (mandatory IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'SATISFIED', 'CANCELLED')),
    notes TEXT,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_gse_allocations (
    id TEXT PRIMARY KEY,
    requirement_id TEXT NOT NULL REFERENCES maintenance_gse_requirements(id),
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    slot_id TEXT REFERENCES maintenance_slots(id),
    asset_id TEXT NOT NULL REFERENCES managed_assets(id),
    status TEXT NOT NULL CHECK (status IN ('ALLOCATED', 'STAGED', 'IN_USE', 'RELEASED', 'CANCELLED')),
    idempotency_key TEXT,
    allocated_by_user_id TEXT NOT NULL,
    allocated_at TEXT NOT NULL,
    released_by_user_id TEXT,
    released_at TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_facility_resource_staging (
    id TEXT PRIMARY KEY,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('TOOL', 'GSE')),
    allocation_id TEXT NOT NULL,
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    slot_id TEXT NOT NULL REFERENCES maintenance_slots(id),
    bay_id TEXT NOT NULL REFERENCES maintenance_facility_bays(id),
    resource_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('STAGED', 'IN_USE', 'RELEASED', 'CANCELLED')),
    idempotency_key TEXT,
    staged_by_user_id TEXT NOT NULL,
    staged_at TEXT NOT NULL,
    released_by_user_id TEXT,
    released_at TEXT,
    note TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_aircraft_custodies (
    id TEXT PRIMARY KEY,
    slot_id TEXT NOT NULL REFERENCES maintenance_slots(id),
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    facility_id TEXT NOT NULL REFERENCES maintenance_facilities(id),
    area_id TEXT NOT NULL REFERENCES maintenance_facility_areas(id),
    bay_id TEXT NOT NULL REFERENCES maintenance_facility_bays(id),
    status TEXT NOT NULL CHECK (status IN ('MOVING_IN', 'IN_BAY', 'READY_FOR_MOVE_OUT', 'MOVING_OUT', 'HANDBACK_PENDING', 'HANDED_BACK', 'CANCELLED')),
    request_idempotency_key TEXT,
    handback_idempotency_key TEXT,
    actual_start_at TEXT,
    in_bay_at TEXT,
    ready_for_move_out_at TEXT,
    moving_out_at TEXT,
    handed_back_at TEXT,
    handed_back_by_user_id TEXT,
    received_by_user_id TEXT,
    note TEXT,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_by_user_id TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_aircraft_custody_events (
    id TEXT PRIMARY KEY,
    custody_id TEXT NOT NULL REFERENCES maintenance_aircraft_custodies(id),
    slot_id TEXT NOT NULL REFERENCES maintenance_slots(id),
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    event_type TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    note TEXT,
    occurred_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_facility_shifts (
    id TEXT PRIMARY KEY,
    facility_id TEXT NOT NULL REFERENCES maintenance_facilities(id),
    shift_date TEXT NOT NULL,
    name TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    supervisor_personnel_id TEXT REFERENCES crews(id),
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (start_at < end_at)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_facility_shift_roster (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL REFERENCES maintenance_facility_shifts(id),
    personnel_id TEXT NOT NULL REFERENCES crews(id),
    role_type TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (shift_id, personnel_id, role_type)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_shift_handovers (
    id TEXT PRIMARY KEY,
    slot_id TEXT NOT NULL REFERENCES maintenance_slots(id),
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    outgoing_shift_id TEXT NOT NULL REFERENCES maintenance_facility_shifts(id),
    incoming_shift_id TEXT NOT NULL REFERENCES maintenance_facility_shifts(id),
    status TEXT NOT NULL CHECK (status IN ('PREPARED', 'ACKNOWLEDGED', 'CANCELLED')),
    notes TEXT NOT NULL,
    safety_notes_json TEXT NOT NULL DEFAULT '[]',
    outstanding_refs_json TEXT NOT NULL DEFAULT '[]',
    prepared_by_user_id TEXT NOT NULL,
    prepared_at TEXT NOT NULL,
    acknowledged_by_user_id TEXT,
    acknowledged_at TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_work_package_material_requirements (
    id TEXT PRIMARY KEY,
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    job_card_id TEXT REFERENCES maintenance_job_cards(id),
    part_id TEXT REFERENCES inventory_parts(id),
    serialized_part_id TEXT REFERENCES inventory_serialized_parts(id),
    required_quantity REAL NOT NULL DEFAULT 1 CHECK (required_quantity > 0),
    required INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'RESERVED', 'ALLOCATED', 'ISSUED', 'NOT_REQUIRED', 'BLOCKED')),
    source TEXT NOT NULL DEFAULT 'DEMO_PLANNING',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_tool_masters (
    id TEXT PRIMARY KEY,
    tool_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    serial_number TEXT,
    category TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'ALLOCATED', 'OUT_OF_SERVICE', 'CALIBRATION_EXPIRED')),
    calibration_required INTEGER NOT NULL DEFAULT 0 CHECK (calibration_required IN (0, 1)),
    location TEXT,
    fictional_demo INTEGER NOT NULL DEFAULT 1 CHECK (fictional_demo IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_tool_calibration_records (
    id TEXT PRIMARY KEY,
    tool_id TEXT NOT NULL REFERENCES maintenance_tool_masters(id),
    calibrated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    certificate_reference TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('CURRENT', 'EXPIRED', 'WITHDRAWN')),
    notes TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_work_package_tool_allocations (
    id TEXT PRIMARY KEY,
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    tool_id TEXT NOT NULL REFERENCES maintenance_tool_masters(id),
    required INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0, 1)),
    allocated_at TEXT NOT NULL,
    returned_at TEXT,
    created_by_user_id TEXT NOT NULL,
    UNIQUE (work_package_id, tool_id)
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_work_package_personnel_requirements (
    id TEXT PRIMARY KEY,
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('MECHANIC', 'INSPECTOR', 'CERTIFYING_STAFF')),
    permitted_action TEXT NOT NULL,
    required INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'REQUIRED' CHECK (status IN ('REQUIRED', 'SATISFIED', 'BLOCKED', 'NOT_REQUIRED')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_demo_amo_capability_scopes (
    id TEXT PRIMARY KEY,
    scope_code TEXT NOT NULL UNIQUE,
    aircraft_type TEXT,
    aircraft_registration TEXT,
    permitted_actions_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    valid_from TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_aircraft_configuration_conflicts (
    id TEXT PRIMARY KEY,
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    source_type TEXT NOT NULL,
    source_id TEXT,
    conflict_code TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
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
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
    job_card_id TEXT REFERENCES maintenance_job_cards(id),
    corrective_job_card_id TEXT REFERENCES maintenance_job_cards(id),
    finding_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
	    severity TEXT NOT NULL DEFAULT 'NORMAL' CHECK (severity IN ('LOW', 'NORMAL', 'HIGH', 'AOG')),
	    location TEXT,
	    ata_chapter TEXT,
	    detected_during TEXT NOT NULL DEFAULT 'ACTIVE_WORK',
	    operational_impact TEXT NOT NULL DEFAULT 'UNASSESSED',
	    finding_classification TEXT NOT NULL DEFAULT 'UNASSESSED',
	    mel_cdl_assessment TEXT NOT NULL DEFAULT 'UNASSESSED',
	    immediate_action TEXT,
	    aircraft_movement_prohibited INTEGER NOT NULL DEFAULT 0 CHECK (aircraft_movement_prohibited IN (0, 1)),
	    notify_maintenance_control INTEGER NOT NULL DEFAULT 0 CHECK (notify_maintenance_control IN (0, 1)),
	    requires_inspector_review INTEGER NOT NULL DEFAULT 1 CHECK (requires_inspector_review IN (0, 1)),
	    immediate_safety_concern INTEGER NOT NULL DEFAULT 0 CHECK (immediate_safety_concern IN (0, 1)),
	    evidence_references_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'ADDED_TO_SCOPE', 'DEFERRED', 'CLOSED')),
    disposition TEXT CHECK (disposition IN ('CORRECTIVE_WORK_REQUIRED', 'NO_ACTION')),
    assessment_note TEXT,
    assessed_by_user_id TEXT,
    assessed_at TEXT,
    requires_independent_inspection INTEGER NOT NULL DEFAULT 1 CHECK (requires_independent_inspection IN (0, 1)),
    approved_data_ref TEXT,
    resolved_at TEXT,
    resolved_by_user_id TEXT,
    resolution_note TEXT,
    closed_at TEXT,
    closed_by_user_id TEXT,
    closure_note TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    create_idempotency_key TEXT,
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
  `CREATE TABLE IF NOT EXISTS maintenance_release_eligibility_snapshots (
    id TEXT PRIMARY KEY,
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    release_id TEXT REFERENCES aircraft_maintenance_releases(id),
    evaluated_at TEXT NOT NULL,
    eligible INTEGER NOT NULL CHECK (eligible IN (0, 1)),
    blockers_json TEXT NOT NULL DEFAULT '[]',
    warnings_json TEXT NOT NULL DEFAULT '[]',
    reference_snapshot_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_audit_packs (
    id TEXT PRIMARY KEY,
    work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
    release_id TEXT REFERENCES aircraft_maintenance_releases(id),
    generated_at TEXT NOT NULL,
    manifest_json TEXT NOT NULL,
    manifest_hash TEXT NOT NULL,
    disclaimer TEXT NOT NULL,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
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
  `CREATE INDEX IF NOT EXISTS idx_mro_non_routine_package ON maintenance_non_routine_findings(work_package_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_non_routine_source_card ON maintenance_non_routine_findings(job_card_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_non_routine_corrective_card
    ON maintenance_non_routine_findings(corrective_job_card_id)
    WHERE corrective_job_card_id IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_non_routine_create_idempotency
    ON maintenance_non_routine_findings(create_idempotency_key)
    WHERE create_idempotency_key IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_mro_inspection_idempotency_card ON maintenance_inspection_idempotency_keys(job_card_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_company_auth_personnel ON maintenance_company_authorizations(personnel_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_company_auth_license ON maintenance_company_authorizations(license_id, license_number)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_requirement_links_package ON maintenance_work_package_requirement_links(work_package_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_requirement_links_requirement ON maintenance_work_package_requirement_links(requirement_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_release_idempotency_package ON maintenance_release_idempotency_keys(work_package_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_audit_entity ON maintenance_audit_logs(entity_type, entity_id, occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_approved_data_revisions_document ON maintenance_approved_data_revisions(document_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_job_card_data_links_card ON maintenance_job_card_approved_data_links(job_card_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_due_status_aircraft ON maintenance_aircraft_requirement_statuses(aircraft_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_due_status_planned_wp ON maintenance_aircraft_requirement_statuses(planned_work_package_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_due_compliance_requirement ON maintenance_due_compliance_records(requirement_id, aircraft_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_due_compliance_package ON maintenance_due_compliance_records(work_package_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_wp_source_due ON maintenance_work_packages(source_due_status_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_facilities_station ON maintenance_facilities(station_id, active)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_facility_areas_facility ON maintenance_facility_areas(facility_id, active)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_facility_bays_area ON maintenance_facility_bays(area_id, active)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_slots_bay_time ON maintenance_slots(bay_id, planned_start_at, planned_end_at, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_slots_aircraft_time ON maintenance_slots(aircraft_id, planned_start_at, planned_end_at, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_slots_facility_time ON maintenance_slots(facility_id, planned_start_at, planned_end_at, status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_slots_active_wp
    ON maintenance_slots(work_package_id)
    WHERE status IN ('BOOKED', 'IN_PROGRESS')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_slots_idempotency
    ON maintenance_slots(work_package_id, create_idempotency_key)
    WHERE create_idempotency_key IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_mro_slot_events_slot ON maintenance_slot_events(slot_id, occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_gse_req_package ON maintenance_gse_requirements(work_package_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_gse_alloc_asset ON maintenance_gse_allocations(asset_id, status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_gse_alloc_idempotency
    ON maintenance_gse_allocations(work_package_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_gse_alloc_requirement_asset_active
    ON maintenance_gse_allocations(requirement_id, asset_id)
    WHERE status IN ('ALLOCATED', 'STAGED', 'IN_USE')`,
  `CREATE INDEX IF NOT EXISTS idx_mro_resource_staging_slot ON maintenance_facility_resource_staging(slot_id, status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_resource_staging_active
    ON maintenance_facility_resource_staging(resource_type, allocation_id)
    WHERE status IN ('STAGED', 'IN_USE')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_resource_staging_idempotency
    ON maintenance_facility_resource_staging(resource_type, allocation_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_mro_aircraft_custody_aircraft ON maintenance_aircraft_custodies(aircraft_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_aircraft_custody_bay ON maintenance_aircraft_custodies(bay_id, status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_aircraft_custody_active_aircraft
    ON maintenance_aircraft_custodies(aircraft_id)
    WHERE status IN ('MOVING_IN', 'IN_BAY', 'READY_FOR_MOVE_OUT', 'MOVING_OUT', 'HANDBACK_PENDING')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_aircraft_custody_active_slot
    ON maintenance_aircraft_custodies(slot_id)
    WHERE status IN ('MOVING_IN', 'IN_BAY', 'READY_FOR_MOVE_OUT', 'MOVING_OUT', 'HANDBACK_PENDING')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_aircraft_custody_request_idem
    ON maintenance_aircraft_custodies(slot_id, request_idempotency_key)
    WHERE request_idempotency_key IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_aircraft_custody_handback_idem
    ON maintenance_aircraft_custodies(slot_id, handback_idempotency_key)
    WHERE handback_idempotency_key IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_mro_custody_events_custody ON maintenance_aircraft_custody_events(custody_id, occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_facility_shifts_facility ON maintenance_facility_shifts(facility_id, start_at, end_at, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_shift_roster_shift ON maintenance_facility_shift_roster(shift_id, active)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_shift_handover_slot ON maintenance_shift_handovers(slot_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_material_req_package ON maintenance_work_package_material_requirements(work_package_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_material_req_job_card ON maintenance_work_package_material_requirements(job_card_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_tool_alloc_package ON maintenance_work_package_tool_allocations(work_package_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_release_snapshot_package ON maintenance_release_eligibility_snapshots(work_package_id, created_at DESC)`,
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
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_audit_log_no_update
    BEFORE UPDATE ON maintenance_audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'maintenance audit logs are append-only');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_audit_log_no_delete
    BEFORE DELETE ON maintenance_audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'maintenance audit logs are append-only');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_released_work_package_no_delete
    BEFORE DELETE ON maintenance_work_packages
    WHEN OLD.status = 'RELEASED' OR OLD.release_id IS NOT NULL
    BEGIN
      SELECT RAISE(ABORT, 'released maintenance work packages cannot be deleted');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_signed_job_card_no_delete
    BEFORE DELETE ON maintenance_job_cards
    WHEN EXISTS (SELECT 1 FROM maintenance_job_card_signoffs WHERE job_card_id = OLD.id)
    BEGIN
      SELECT RAISE(ABORT, 'signed maintenance job cards cannot be deleted');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_release_no_update
    BEFORE UPDATE ON aircraft_maintenance_releases
    BEGIN
      SELECT RAISE(ABORT, 'maintenance technical releases are immutable');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_release_no_delete
    BEFORE DELETE ON aircraft_maintenance_releases
    BEGIN
      SELECT RAISE(ABORT, 'maintenance technical releases are immutable');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_release_snapshot_no_update
    BEFORE UPDATE ON maintenance_release_eligibility_snapshots
    BEGIN
      SELECT RAISE(ABORT, 'maintenance release eligibility snapshots are immutable');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_release_snapshot_no_delete
    BEFORE DELETE ON maintenance_release_eligibility_snapshots
    BEGIN
      SELECT RAISE(ABORT, 'maintenance release eligibility snapshots are immutable');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_audit_pack_no_update
    BEFORE UPDATE ON maintenance_audit_packs
    BEGIN
      SELECT RAISE(ABORT, 'maintenance audit packs are immutable');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_audit_pack_no_delete
    BEFORE DELETE ON maintenance_audit_packs
    BEGIN
      SELECT RAISE(ABORT, 'maintenance audit packs are immutable');
    END`,
  // ===== Demo-v2.1: Resource Planning Declarations =====
  `CREATE TABLE IF NOT EXISTS maintenance_resource_planning_declarations (
        id TEXT PRIMARY KEY,
        work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
        resource_type TEXT NOT NULL CHECK (resource_type IN ('MATERIAL', 'TOOL', 'PERSONNEL')),
        declaration TEXT NOT NULL CHECK (declaration IN ('REQUIRED', 'NOT_REQUIRED')),
        reason TEXT,
        evidence_document_id TEXT,
        declared_by TEXT NOT NULL,
        declared_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (work_package_id, resource_type),
        CHECK (declaration = 'REQUIRED' OR (reason IS NOT NULL AND reason != ''))
      )`,
  `CREATE INDEX IF NOT EXISTS idx_mro_resource_decl_package
        ON maintenance_resource_planning_declarations(work_package_id)`,
  // ===== Demo-v2.1: Inventory Reservation Ledger =====
  `CREATE TABLE IF NOT EXISTS maintenance_inventory_reservations (
        id TEXT PRIMARY KEY,
        reservation_number TEXT NOT NULL UNIQUE,
        material_requirement_id TEXT NOT NULL REFERENCES maintenance_work_package_material_requirements(id),
        work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
        job_card_id TEXT REFERENCES maintenance_job_cards(id),
        aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
        flight_order_id TEXT REFERENCES flight_operations(id),
        inventory_item_id TEXT NOT NULL,
        part_id TEXT NOT NULL REFERENCES inventory_parts(id),
        serialized_part_id TEXT REFERENCES inventory_serialized_parts(id),
        lot_number TEXT,
        serial_number TEXT,
        station_id TEXT NOT NULL REFERENCES stations(id),
        inventory_location_id TEXT REFERENCES inventory_bins(id),
        quantity REAL NOT NULL CHECK (quantity > 0),
        unit TEXT NOT NULL,
        expiry_at TEXT,
        certificate_reference TEXT,
        certificate_document_id TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE', 'PARTIALLY_ISSUED', 'ISSUED', 'RELEASED', 'CANCELLED', 'EXPIRED')),
        reserved_by TEXT NOT NULL,
        reserved_at TEXT NOT NULL,
        released_by TEXT,
        released_at TEXT,
        release_reason TEXT,
        reserve_idempotency_key TEXT,
        issue_id TEXT REFERENCES maintenance_part_issues(id),
        issue_movement_id TEXT REFERENCES inventory_movements(id),
        issued_quantity REAL NOT NULL DEFAULT 0 CHECK (issued_quantity >= 0),
        issued_by TEXT,
        issued_at TEXT,
        issue_idempotency_key TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
  `CREATE TABLE IF NOT EXISTS maintenance_material_installations (
        id TEXT PRIMARY KEY,
        installation_number TEXT NOT NULL UNIQUE,
        material_requirement_id TEXT NOT NULL REFERENCES maintenance_work_package_material_requirements(id),
        reservation_id TEXT NOT NULL REFERENCES maintenance_inventory_reservations(id),
        issue_id TEXT REFERENCES maintenance_part_issues(id),
        inventory_component_installation_id TEXT REFERENCES inventory_component_installations(id),
        work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
        job_card_id TEXT REFERENCES maintenance_job_cards(id),
        aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
        part_id TEXT NOT NULL REFERENCES inventory_parts(id),
        serialized_part_id TEXT REFERENCES inventory_serialized_parts(id),
        source_warehouse_id TEXT REFERENCES inventory_warehouses(id),
        source_bin_id TEXT REFERENCES inventory_bins(id),
        lot_number TEXT,
        serial_number TEXT,
        certificate_reference TEXT,
        quantity REAL NOT NULL CHECK (quantity > 0),
        unit TEXT NOT NULL,
        position TEXT,
        status TEXT NOT NULL DEFAULT 'INSTALLED' CHECK (status IN ('INSTALLED', 'CANCELLED')),
        installed_by TEXT NOT NULL,
        installed_at TEXT NOT NULL,
        idempotency_key TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
  `CREATE TABLE IF NOT EXISTS maintenance_reservation_events (
        id TEXT PRIMARY KEY,
        reservation_id TEXT NOT NULL REFERENCES maintenance_inventory_reservations(id),
        event_type TEXT NOT NULL
          CHECK (event_type IN ('RESERVED', 'PARTIALLY_ISSUED', 'ISSUED', 'RELEASED', 'RETURNED', 'CANCELLED', 'EXPIRED')),
        quantity REAL NOT NULL,
        actor_user_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        reason TEXT,
        before_snapshot_json TEXT NOT NULL DEFAULT '{}',
        after_snapshot_json TEXT NOT NULL DEFAULT '{}',
        correlation_id TEXT,
        idempotency_key TEXT,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
  `CREATE INDEX IF NOT EXISTS idx_mro_reservation_requirement
        ON maintenance_inventory_reservations(material_requirement_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_reservation_package
        ON maintenance_inventory_reservations(work_package_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_reservation_inventory
        ON maintenance_inventory_reservations(inventory_item_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_reservation_serial
        ON maintenance_inventory_reservations(serialized_part_id, status)
        WHERE serialized_part_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_mro_reservation_flight
        ON maintenance_inventory_reservations(flight_order_id)
        WHERE flight_order_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_mro_reservation_events_reservation
        ON maintenance_reservation_events(reservation_id, occurred_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_reservation_serial_active
        ON maintenance_inventory_reservations(serialized_part_id)
        WHERE serialized_part_id IS NOT NULL AND status IN ('ACTIVE', 'PARTIALLY_ISSUED')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_reservation_serial_owned
        ON maintenance_inventory_reservations(serialized_part_id)
        WHERE serialized_part_id IS NOT NULL AND status IN ('ACTIVE', 'PARTIALLY_ISSUED', 'ISSUED')`,
  `CREATE INDEX IF NOT EXISTS idx_mro_material_install_req
        ON maintenance_material_installations(material_requirement_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_material_install_package
        ON maintenance_material_installations(work_package_id, status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_material_install_reservation_active
        ON maintenance_material_installations(reservation_id)
        WHERE status = 'INSTALLED'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_material_install_idempotency
        ON maintenance_material_installations(idempotency_key)
        WHERE idempotency_key IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_material_install_serial_active
        ON maintenance_material_installations(serialized_part_id)
        WHERE serialized_part_id IS NOT NULL AND status = 'INSTALLED'`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_reservation_event_no_update
        BEFORE UPDATE ON maintenance_reservation_events
        BEGIN
          SELECT RAISE(ABORT, 'maintenance reservation events are immutable');
        END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_reservation_event_no_delete
        BEFORE DELETE ON maintenance_reservation_events
        BEGIN
          SELECT RAISE(ABORT, 'maintenance reservation events are immutable');
        END`,
  // ===== Demo-v2.1: Tool Requirements =====
  `CREATE TABLE IF NOT EXISTS maintenance_tool_requirements (
        id TEXT PRIMARY KEY,
        work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
        job_card_id TEXT REFERENCES maintenance_job_cards(id),
        tool_master_id TEXT REFERENCES maintenance_tool_masters(id),
        tool_type TEXT,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        required_station_id TEXT NOT NULL REFERENCES stations(id),
        required_from TEXT NOT NULL,
        required_until TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'REQUIRED'
          CHECK (status IN ('REQUIRED', 'REQUESTED', 'ALLOCATED', 'PARTIALLY_ALLOCATED', 'RETURNED', 'CANCELLED', 'NOT_REQUIRED')),
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
  // ===== Demo-v2.1: Enhanced Tool Allocations =====
  `CREATE TABLE IF NOT EXISTS maintenance_tool_allocations_v2 (
        id TEXT PRIMARY KEY,
        tool_requirement_id TEXT REFERENCES maintenance_tool_requirements(id),
        tool_id TEXT NOT NULL REFERENCES maintenance_tool_masters(id),
        work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
        job_card_id TEXT REFERENCES maintenance_job_cards(id),
        aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
        station_id TEXT NOT NULL REFERENCES stations(id),
        status TEXT NOT NULL DEFAULT 'REQUESTED'
          CHECK (status IN ('REQUESTED', 'ALLOCATED', 'IN_USE', 'RETURNED', 'RELEASED', 'CANCELLED')),
        allocated_by TEXT NOT NULL,
        allocated_at TEXT NOT NULL,
        custodian_personnel_id TEXT REFERENCES crews(id),
        custody_started_at TEXT,
        returned_by TEXT,
        returned_at TEXT,
        return_condition TEXT,
        return_note TEXT,
        create_idempotency_key TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
  `CREATE TABLE IF NOT EXISTS maintenance_tool_allocation_events (
        id TEXT PRIMARY KEY,
        allocation_id TEXT NOT NULL REFERENCES maintenance_tool_allocations_v2(id),
        event_type TEXT NOT NULL
          CHECK (event_type IN ('REQUESTED', 'ALLOCATED', 'CUSTODY_ASSIGNED', 'IN_USE', 'RETURNED', 'RELEASED', 'CANCELLED')),
        actor_user_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        reason TEXT,
        before_snapshot_json TEXT NOT NULL DEFAULT '{}',
        after_snapshot_json TEXT NOT NULL DEFAULT '{}',
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
  `CREATE INDEX IF NOT EXISTS idx_mro_tool_req_package
        ON maintenance_tool_requirements(work_package_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_tool_alloc_v2_requirement
        ON maintenance_tool_allocations_v2(tool_requirement_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_tool_alloc_v2_tool
        ON maintenance_tool_allocations_v2(tool_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_tool_alloc_v2_package
        ON maintenance_tool_allocations_v2(work_package_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_tool_alloc_events_alloc
        ON maintenance_tool_allocation_events(allocation_id, occurred_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_tool_alloc_active_requirement
        ON maintenance_tool_allocations_v2(tool_requirement_id, tool_id)
        WHERE status IN ('REQUESTED', 'ALLOCATED', 'IN_USE')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_tool_alloc_idempotency
        ON maintenance_tool_allocations_v2(work_package_id, create_idempotency_key)
        WHERE create_idempotency_key IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_mro_tool_alloc_active_lookup
        ON maintenance_tool_allocations_v2(tool_id, work_package_id, status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_tool_alloc_active_custody
        ON maintenance_tool_allocations_v2(tool_id)
        WHERE status = 'IN_USE'`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_tool_alloc_event_no_update
        BEFORE UPDATE ON maintenance_tool_allocation_events
        BEGIN
          SELECT RAISE(ABORT, 'maintenance tool allocation events are immutable');
        END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_tool_alloc_event_no_delete
        BEFORE DELETE ON maintenance_tool_allocation_events
        BEGIN
          SELECT RAISE(ABORT, 'maintenance tool allocation events are immutable');
        END`,
  // ===== Demo-v2.1: Personnel Requirements =====
  `CREATE TABLE IF NOT EXISTS maintenance_personnel_requirements (
        id TEXT PRIMARY KEY,
        work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
        job_card_id TEXT REFERENCES maintenance_job_cards(id),
        role_type TEXT NOT NULL CHECK (role_type IN ('MECHANIC', 'INSPECTOR', 'CERTIFYING_STAFF')),
        required_count INTEGER NOT NULL DEFAULT 1 CHECK (required_count > 0),
        required_licence_type TEXT,
        required_qualification TEXT,
        required_authorization TEXT,
        aircraft_type TEXT,
        duty_station_id TEXT NOT NULL REFERENCES stations(id),
        required_from TEXT NOT NULL,
        required_until TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'REQUIRED'
          CHECK (status IN ('REQUIRED', 'FULFILLED', 'PARTIALLY_FULFILLED', 'CANCELLED', 'NOT_REQUIRED')),
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
  // ===== Demo-v2.1: Personnel Assignments =====
  `CREATE TABLE IF NOT EXISTS maintenance_personnel_assignments (
        id TEXT PRIMARY KEY,
        personnel_requirement_id TEXT NOT NULL REFERENCES maintenance_personnel_requirements(id),
        personnel_id TEXT NOT NULL REFERENCES crews(id),
        work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
        job_card_id TEXT REFERENCES maintenance_job_cards(id),
        role_type TEXT NOT NULL CHECK (role_type IN ('MECHANIC', 'INSPECTOR', 'CERTIFYING_STAFF')),
        status TEXT NOT NULL DEFAULT 'ASSIGNED'
          CHECK (status IN ('ASSIGNED', 'CONFIRMED', 'RELEASED', 'CANCELLED')),
        eligibility_status TEXT NOT NULL DEFAULT 'PENDING'
          CHECK (eligibility_status IN ('PENDING', 'ELIGIBLE', 'INELIGIBLE')),
        eligibility_snapshot_json TEXT NOT NULL DEFAULT '{}',
        assigned_by TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        confirmed_at TEXT,
        released_at TEXT,
        create_idempotency_key TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
  `CREATE TABLE IF NOT EXISTS maintenance_personnel_eligibility_events (
        id TEXT PRIMARY KEY,
        assignment_id TEXT NOT NULL REFERENCES maintenance_personnel_assignments(id),
        event_type TEXT NOT NULL CHECK (event_type IN ('EVALUATED', 'RE_EVALUATED', 'ELIGIBILITY_CHANGED')),
        eligibility_status TEXT NOT NULL,
        snapshot_json TEXT NOT NULL DEFAULT '{}',
        evaluated_by TEXT NOT NULL,
        evaluated_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
  `CREATE INDEX IF NOT EXISTS idx_mro_personnel_req_package
        ON maintenance_personnel_requirements(work_package_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_personnel_assign_requirement
        ON maintenance_personnel_assignments(personnel_requirement_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_personnel_assign_personnel
        ON maintenance_personnel_assignments(personnel_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_personnel_assign_package
        ON maintenance_personnel_assignments(work_package_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_personnel_assign_active_requirement
        ON maintenance_personnel_assignments(personnel_requirement_id, personnel_id)
        WHERE status IN ('ASSIGNED', 'CONFIRMED')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mro_personnel_assign_idempotency
        ON maintenance_personnel_assignments(work_package_id, create_idempotency_key)
        WHERE create_idempotency_key IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_mro_personnel_elig_events_assign
        ON maintenance_personnel_eligibility_events(assignment_id, evaluated_at DESC)`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_personnel_elig_event_no_update
        BEFORE UPDATE ON maintenance_personnel_eligibility_events
        BEGIN
          SELECT RAISE(ABORT, 'maintenance personnel eligibility events are immutable');
        END`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_personnel_elig_event_no_delete
        BEFORE DELETE ON maintenance_personnel_eligibility_events
        BEGIN
          SELECT RAISE(ABORT, 'maintenance personnel eligibility events are immutable');
        END`,
  // ===== Demo-v2.1: AMO Organizations and Scopes =====
  `CREATE TABLE IF NOT EXISTS maintenance_amo_organizations (
        id TEXT PRIMARY KEY,
        organization_code TEXT NOT NULL UNIQUE,
        organization_name TEXT NOT NULL,
        organization_type TEXT NOT NULL
          CHECK (organization_type IN ('INTERNAL_AMO', 'CONTRACTED_AMO', 'VENDOR')),
        approval_reference TEXT NOT NULL,
        approval_document_id TEXT,
        approval_authority TEXT NOT NULL,
        valid_from TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED')),
        fictional_demo INTEGER NOT NULL DEFAULT 1 CHECK (fictional_demo IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
  `CREATE TABLE IF NOT EXISTS maintenance_amo_scopes (
        id TEXT PRIMARY KEY,
        amo_organization_id TEXT NOT NULL REFERENCES maintenance_amo_organizations(id),
        aircraft_type TEXT NOT NULL,
        aircraft_registration TEXT,
        maintenance_action TEXT NOT NULL,
        rating TEXT NOT NULL,
        limitation TEXT,
        station_id TEXT REFERENCES stations(id),
        valid_from TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        approval_document_id TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED')),
        fictional_demo INTEGER NOT NULL DEFAULT 1 CHECK (fictional_demo IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
  `CREATE INDEX IF NOT EXISTS idx_mro_amo_org_status
        ON maintenance_amo_organizations(status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_amo_scope_org
        ON maintenance_amo_scopes(amo_organization_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_amo_scope_aircraft
        ON maintenance_amo_scopes(aircraft_type, status)`,
  // ===== Demo-v2.1: Flight-MRO Links =====
  `CREATE TABLE IF NOT EXISTS maintenance_flight_mro_links (
        id TEXT PRIMARY KEY,
        flight_order_id TEXT NOT NULL REFERENCES flight_operations(id),
        work_package_id TEXT NOT NULL REFERENCES maintenance_work_packages(id),
        aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
        affects_serviceability INTEGER NOT NULL DEFAULT 1 CHECK (affects_serviceability IN (0, 1)),
        link_reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'CANCELLED')),
        linked_by TEXT NOT NULL,
        linked_at TEXT NOT NULL,
        unlinked_by TEXT,
        unlinked_at TEXT,
        unlink_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
  `CREATE INDEX IF NOT EXISTS idx_mro_flight_mro_link_flight
        ON maintenance_flight_mro_links(flight_order_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_flight_mro_link_package
        ON maintenance_flight_mro_links(work_package_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mro_flight_mro_link_aircraft
        ON maintenance_flight_mro_links(aircraft_id, status)`,
  `CREATE TRIGGER IF NOT EXISTS trg_mro_flight_mro_link_released_no_update
        BEFORE UPDATE ON maintenance_flight_mro_links
        WHEN OLD.status IN ('SUPERSEDED', 'CANCELLED')
        BEGIN
          SELECT RAISE(ABORT, 'superseded or cancelled flight-MRO links cannot be modified');
        END`
];

export const maintenanceDropStatements = [
  // Demo-v2.1 drop triggers
  'DROP TRIGGER IF EXISTS trg_mro_flight_mro_link_released_no_update',
  'DROP TRIGGER IF EXISTS trg_mro_personnel_elig_event_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_personnel_elig_event_no_update',
  'DROP TRIGGER IF EXISTS trg_mro_tool_alloc_event_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_tool_alloc_event_no_update',
  'DROP TRIGGER IF EXISTS trg_mro_reservation_event_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_reservation_event_no_update',
  // Demo-v2.1 drop tables
  'DROP TABLE IF EXISTS maintenance_shift_handovers',
  'DROP TABLE IF EXISTS maintenance_facility_shift_roster',
  'DROP TABLE IF EXISTS maintenance_facility_shifts',
  'DROP TABLE IF EXISTS maintenance_aircraft_custody_events',
  'DROP TABLE IF EXISTS maintenance_aircraft_custodies',
  'DROP TABLE IF EXISTS maintenance_facility_resource_staging',
  'DROP TABLE IF EXISTS maintenance_gse_allocations',
  'DROP TABLE IF EXISTS maintenance_gse_requirements',
  'DROP TABLE IF EXISTS maintenance_flight_mro_links',
  'DROP TABLE IF EXISTS maintenance_amo_scopes',
  'DROP TABLE IF EXISTS maintenance_amo_organizations',
  'DROP TABLE IF EXISTS maintenance_personnel_eligibility_events',
  'DROP TABLE IF EXISTS maintenance_personnel_assignments',
  'DROP TABLE IF EXISTS maintenance_personnel_requirements',
  'DROP TABLE IF EXISTS maintenance_tool_allocation_events',
  'DROP TABLE IF EXISTS maintenance_tool_allocations_v2',
  'DROP TABLE IF EXISTS maintenance_tool_requirements',
  'DROP TABLE IF EXISTS maintenance_material_installations',
  'DROP TABLE IF EXISTS maintenance_reservation_events',
  'DROP TABLE IF EXISTS maintenance_inventory_reservations',
  'DROP TABLE IF EXISTS maintenance_resource_planning_declarations',
  'DROP TRIGGER IF EXISTS trg_mro_audit_pack_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_audit_pack_no_update',
  'DROP TRIGGER IF EXISTS trg_mro_release_snapshot_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_release_snapshot_no_update',
  'DROP TRIGGER IF EXISTS trg_mro_release_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_release_no_update',
  'DROP TRIGGER IF EXISTS trg_mro_signed_job_card_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_released_work_package_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_audit_log_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_audit_log_no_update',
  'DROP TRIGGER IF EXISTS trg_mro_inspection_attempt_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_inspection_attempt_no_update',
  'DROP TRIGGER IF EXISTS trg_mro_signoff_no_delete',
  'DROP TRIGGER IF EXISTS trg_mro_signoff_no_update',
  'DROP TABLE IF EXISTS maintenance_audit_logs',
  'DROP TABLE IF EXISTS maintenance_audit_packs',
  'DROP TABLE IF EXISTS maintenance_release_eligibility_snapshots',
  'DROP TABLE IF EXISTS maintenance_company_authorizations',
  'DROP TABLE IF EXISTS maintenance_inspection_idempotency_keys',
  'DROP TABLE IF EXISTS maintenance_rework_actions',
  'DROP TABLE IF EXISTS maintenance_inspection_attempts',
  'DROP TABLE IF EXISTS maintenance_release_idempotency_keys',
  'DROP TABLE IF EXISTS maintenance_financial_claims',
  'DROP TABLE IF EXISTS maintenance_non_routine_findings',
  'DROP TABLE IF EXISTS maintenance_job_card_signoffs',
  'DROP TABLE IF EXISTS maintenance_aircraft_configuration_conflicts',
  'DROP TABLE IF EXISTS maintenance_demo_amo_capability_scopes',
  'DROP TABLE IF EXISTS maintenance_work_package_personnel_requirements',
  'DROP TABLE IF EXISTS maintenance_work_package_tool_allocations',
  'DROP TABLE IF EXISTS maintenance_tool_calibration_records',
  'DROP TABLE IF EXISTS maintenance_tool_masters',
  'DROP TABLE IF EXISTS maintenance_work_package_material_requirements',
  'DROP TABLE IF EXISTS maintenance_due_compliance_records',
  'DROP TABLE IF EXISTS maintenance_slot_events',
  'DROP TABLE IF EXISTS maintenance_slots',
  'DROP TABLE IF EXISTS maintenance_facility_bays',
  'DROP TABLE IF EXISTS maintenance_facility_areas',
  'DROP TABLE IF EXISTS maintenance_facilities',
  'DROP TABLE IF EXISTS maintenance_aircraft_requirement_statuses',
  'DROP TABLE IF EXISTS maintenance_due_requirements',
  'DROP TABLE IF EXISTS maintenance_work_package_requirement_links',
  'DROP TABLE IF EXISTS maintenance_job_card_approved_data_links',
  'DROP TABLE IF EXISTS maintenance_approved_data_revisions',
  'DROP TABLE IF EXISTS maintenance_approved_data_documents',
  'DROP TABLE IF EXISTS maintenance_job_cards',
  'DROP TABLE IF EXISTS maintenance_defect_assessments',
  'DROP TABLE IF EXISTS maintenance_work_packages'
];
