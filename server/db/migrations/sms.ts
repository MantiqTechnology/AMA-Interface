export const smsStatements = [
  // ── 1. Safety Reports (Hazard, Incident, Technical Finding) ───────────
  `CREATE TABLE IF NOT EXISTS safety_reports (
    id TEXT PRIMARY KEY,
    report_number TEXT NOT NULL UNIQUE,
    report_category TEXT NOT NULL CHECK (report_category IN ('HAZARD', 'INCIDENT', 'OCCURRENCE', 'TECHNICAL_FINDING')),
    station_id TEXT REFERENCES stations(id),
    aircraft_id TEXT REFERENCES aircraft(id),
    flight_operation_id TEXT REFERENCES flight_operations(id),
    description TEXT NOT NULL,
    is_anonymous INTEGER NOT NULL DEFAULT 0 CHECK (is_anonymous IN (0, 1)),
    reported_by_user_id TEXT REFERENCES employees(id),
    evidence_ids_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_INVESTIGATION', 'CAPA_ISSUED', 'CLOSED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_safety_reports_category ON safety_reports(report_category)`,
  `CREATE INDEX IF NOT EXISTS idx_safety_reports_status ON safety_reports(status)`,
  `CREATE INDEX IF NOT EXISTS idx_safety_reports_station ON safety_reports(station_id)`,
  `CREATE INDEX IF NOT EXISTS idx_safety_reports_date ON safety_reports(created_at)`,

  // ── 2. Pre-Flight Risk Assessment (FRAT) ──────────────────────────────
  `CREATE TABLE IF NOT EXISTS frat_assessments (
    id TEXT PRIMARY KEY,
    flight_operation_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    pic_employee_id TEXT NOT NULL REFERENCES crews(id),
    crew_fatigue_score INTEGER NOT NULL,
    weather_risk_score INTEGER NOT NULL,
    airstrip_rating_score INTEGER NOT NULL,
    total_risk_score INTEGER NOT NULL,
    risk_zone TEXT NOT NULL CHECK (risk_zone IN ('GREEN', 'YELLOW', 'RED')),
    is_hard_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_hard_locked IN (0, 1)),
    override_signoff_by_user_id TEXT REFERENCES crews(id),
    override_reason TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'OVERRIDDEN', 'CLEARED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (flight_operation_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_frat_assessments_risk_zone ON frat_assessments(risk_zone)`,

  // ── 3. CAPA Tickets (Corrective & Preventive Actions) ─────────────────
  `CREATE TABLE IF NOT EXISTS capa_tickets (
    id TEXT PRIMARY KEY,
    ticket_number TEXT NOT NULL UNIQUE,
    source_report_id TEXT REFERENCES safety_reports(id),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'INVESTIGATION', 'ACTION', 'VERIFIED', 'CLOSED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    assigned_to_user_id TEXT REFERENCES employees(id),
    due_date TEXT NOT NULL,
    is_overdue_escalated INTEGER NOT NULL DEFAULT 0 CHECK (is_overdue_escalated IN (0, 1)),
    escalated_to_user_id TEXT REFERENCES employees(id),
    resolved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_capa_tickets_status ON capa_tickets(status)`,
  `CREATE INDEX IF NOT EXISTS idx_capa_tickets_due_date ON capa_tickets(due_date)`,

  // ── 4. Safety Communications (Flash, Bulletins, Lessons Learned) ──────
  `CREATE TABLE IF NOT EXISTS safety_communications (
    id TEXT PRIMARY KEY,
    comm_type TEXT NOT NULL CHECK (comm_type IN ('FLASH', 'BULLETIN', 'LESSONS_LEARNED')),
    urgency TEXT NOT NULL DEFAULT 'NORMAL' CHECK (urgency IN ('NORMAL', 'URGENT')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    document_id TEXT,
    author_user_id TEXT NOT NULL,
    published_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_safety_comms_type ON safety_communications(comm_type)`,
  `CREATE INDEX IF NOT EXISTS idx_safety_comms_status ON safety_communications(status)`,

  // ── 5. Safety Meetings (SRB & SAG) ────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS safety_meetings (
    id TEXT PRIMARY KEY,
    meeting_type TEXT NOT NULL CHECK (meeting_type IN ('SRB', 'SAG', 'AD_HOC')),
    title TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    location TEXT NOT NULL,
    minutes_document_id TEXT,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CONDUCTED', 'CANCELLED')),
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS safety_meeting_attendees (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES safety_meetings(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    attendance_status TEXT NOT NULL DEFAULT 'INVITED' CHECK (attendance_status IN ('INVITED', 'ATTENDED', 'ABSENT')),
    UNIQUE (meeting_id, employee_id)
  )`,

  // ── 6. Emergency Response Plan (ERP) Activations (ICAO SAR Standard) ──
  `CREATE TABLE IF NOT EXISTS emergency_activations (
    id TEXT PRIMARY KEY,
    activation_number TEXT NOT NULL UNIQUE,
    flight_operation_id TEXT REFERENCES flight_operations(id),
    aircraft_id TEXT REFERENCES aircraft(id),
    station_id TEXT REFERENCES stations(id),
    icao_phase TEXT NOT NULL CHECK (icao_phase IN ('INCERFA', 'ALERFA', 'DETRESFA')),
    nature_of_emergency TEXT NOT NULL,
    pob INTEGER,
    endurance TEXT,
    lkp TEXT,
    declared_by_user_id TEXT NOT NULL,
    declared_at TEXT NOT NULL,
    broadcast_status_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DOWNGRADED', 'CLOSED')),
    closed_at TEXT,
    closure_reason TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_emergency_activations_status ON emergency_activations(status)`,

  // ── 7. Safety Assurance: Audits & Inspections ─────────────────────────
  `CREATE TABLE IF NOT EXISTS safety_audits (
    id TEXT PRIMARY KEY,
    audit_number TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    auditor_name TEXT NOT NULL,
    audit_type TEXT NOT NULL CHECK (audit_type IN ('INTERNAL', 'EXTERNAL')),
    scheduled_from TEXT NOT NULL,
    scheduled_to TEXT NOT NULL,
    findings_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'ACTION_REQUIRED', 'COMPLETED', 'CANCELLED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_safety_audits_status ON safety_audits(status)`,

  // ── 8. Safety Assurance: Management of Change / MOC ───────────────────
  `CREATE TABLE IF NOT EXISTS safety_mocs (
    id TEXT PRIMARY KEY,
    moc_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    sponsor_department TEXT NOT NULL,
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'RISK_ASSESSMENT', 'IMPLEMENTATION', 'CLOSED', 'CANCELLED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_safety_mocs_status ON safety_mocs(status)`,

  // ── 9. Regulatory Compliance Reports (MOR/SDR) ────────────────────────
  `CREATE TABLE IF NOT EXISTS regulatory_compliance_reports (
    id TEXT PRIMARY KEY,
    reference_number TEXT NOT NULL UNIQUE,
    source_report_id TEXT REFERENCES safety_reports(id),
    report_type TEXT NOT NULL DEFAULT 'MOR' CHECK (report_type IN ('MOR', 'SDR', 'ASR', 'INC', 'VHR')),
    target_authority TEXT NOT NULL DEFAULT 'DKUPPU',
    generated_by_user_id TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    submitted_at TEXT,
    authority_receipt_number TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'GENERATED', 'PENDING_APPROVAL', 'SUBMITTED', 'ACKNOWLEDGED', 'NEED_REVISION')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── 10. Company Certificates (AOC, OpsSpec) ───────────────────────────
  `CREATE TABLE IF NOT EXISTS company_certificates (
    id TEXT PRIMARY KEY,
    cert_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'EXPIRING_SOON', 'EXPIRED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── 11. Operations Manuals (CASR 135) ─────────────────────────────────
  `CREATE TABLE IF NOT EXISTS operations_manuals (
    id TEXT PRIMARY KEY,
    document_name TEXT NOT NULL,
    revision TEXT NOT NULL,
    updated_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('APPROVED', 'PENDING_DKUPPU', 'UNDER_REVISION')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── 12. Authority Correspondences (Inbox) ─────────────────────────────
  `CREATE TABLE IF NOT EXISTS authority_correspondences (
    id TEXT PRIMARY KEY,
    message_ref TEXT NOT NULL UNIQUE,
    authority TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    received_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'READ', 'ACTION_REQUIRED')),
    created_at TEXT NOT NULL
  )`,

  // ── 13. SMS Audit Logs & Immutability Triggers ────────────────────────
  `CREATE TABLE IF NOT EXISTS sms_audit_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    before_snapshot_json TEXT,
    after_snapshot_json TEXT,
    reason TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sms_audit_entity ON sms_audit_logs(entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sms_audit_occurred ON sms_audit_logs(occurred_at)`,

  // ── 14. Safety Competency Matrix & Certifications ─────────────────────
  `CREATE TABLE IF NOT EXISTS safety_personnel_competencies (
    id TEXT PRIMARY KEY,
    personnel_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    competency_type TEXT NOT NULL CHECK (competency_type IN ('SMS_INITIAL', 'CRM_HF', 'DANGEROUS_GOODS', 'CFIT_ALAR', 'MOUNTAIN_VALLEY_CHECK')),
    certificate_number TEXT,
    issued_at TEXT NOT NULL,
    expires_at TEXT,
    status TEXT NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'NOT_APPLICABLE')),
    document_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (personnel_id, competency_type)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_safety_comp_status ON safety_personnel_competencies(status)`,
  `CREATE INDEX IF NOT EXISTS idx_safety_comp_expiry ON safety_personnel_competencies(expires_at)`,

  // ── 15. Corporate Safety Risk Register (CRR) ─────────────────────────
  `CREATE TABLE IF NOT EXISTS corporate_risk_register (
    id TEXT PRIMARY KEY,
    risk_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    hazard_description TEXT NOT NULL,
    initial_severity TEXT NOT NULL CHECK (initial_severity IN ('1', '2', '3', '4', '5')),
    initial_likelihood TEXT NOT NULL CHECK (initial_likelihood IN ('A', 'B', 'C', 'D', 'E')),
    initial_risk_index TEXT NOT NULL,
    initial_risk_level TEXT NOT NULL CHECK (initial_risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    mitigation_barriers TEXT NOT NULL,
    residual_severity TEXT NOT NULL CHECK (residual_severity IN ('1', '2', '3', '4', '5')),
    residual_likelihood TEXT NOT NULL CHECK (residual_likelihood IN ('A', 'B', 'C', 'D', 'E')),
    residual_risk_index TEXT NOT NULL,
    residual_risk_level TEXT NOT NULL CHECK (residual_risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    risk_owner_role TEXT NOT NULL,
    review_frequency TEXT NOT NULL DEFAULT 'QUARTERLY' CHECK (review_frequency IN ('MONTHLY', 'BI_MONTHLY', 'QUARTERLY', 'ANNUAL')),
    last_reviewed_at TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MITIGATED', 'CLOSED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_crr_status ON corporate_risk_register(status)`,
  `CREATE INDEX IF NOT EXISTS idx_crr_risk_level ON corporate_risk_register(residual_risk_level)`,

  // ── 16. Safety Governance Policies ────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS safety_governance_policies (
    id TEXT PRIMARY KEY,
    policy_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    revision TEXT NOT NULL,
    signee_role TEXT NOT NULL,
    effective_from TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    document_id TEXT,
    acknowledgement_required INTEGER NOT NULL DEFAULT 1 CHECK (acknowledgement_required IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNDER_REVISION', 'SUPERSEDED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_safety_policies_status ON safety_governance_policies(status)`,

  // ── 17. Just Culture Assessment Records (James Reason Model) ──────────
  `CREATE TABLE IF NOT EXISTS just_culture_assessments (
    id TEXT PRIMARY KEY,
    source_report_id TEXT NOT NULL REFERENCES safety_reports(id) ON DELETE CASCADE,
    decision_path TEXT NOT NULL CHECK (decision_path IN ('HUMAN_ERROR', 'AT_RISK_BEHAVIOR', 'RECKLESS_CONDUCT')),
    action_type TEXT NOT NULL CHECK (action_type IN ('SYSTEM_FIX_TRAINING', 'COACHING_COUNSELING', 'DISCIPLINARY')),
    is_non_punitive_protected INTEGER NOT NULL DEFAULT 1 CHECK (is_non_punitive_protected IN (0, 1)),
    justification_notes TEXT NOT NULL,
    assessed_by_user_id TEXT NOT NULL,
    assessed_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (source_report_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_just_culture_decision ON just_culture_assessments(decision_path)`,

  // Trigger untuk menjamin Immutable Audit Trail
  `CREATE TRIGGER IF NOT EXISTS trg_sms_audit_log_no_update
    BEFORE UPDATE ON sms_audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'sms audit logs are append-only and immutable');
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_sms_audit_log_no_delete
    BEFORE DELETE ON sms_audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'sms audit logs are append-only and cannot be deleted');
    END`
];

export const smsDropStatements = [
  'DROP TRIGGER IF EXISTS trg_sms_audit_log_no_delete',
  'DROP TRIGGER IF EXISTS trg_sms_audit_log_no_update',
  'DROP TABLE IF EXISTS sms_audit_logs',
  'DROP TABLE IF EXISTS just_culture_assessments',
  'DROP TABLE IF EXISTS safety_governance_policies',
  'DROP TABLE IF EXISTS corporate_risk_register',
  'DROP TABLE IF EXISTS safety_personnel_competencies',
  'DROP TABLE IF EXISTS authority_correspondences',
  'DROP TABLE IF EXISTS operations_manuals',
  'DROP TABLE IF EXISTS company_certificates',
  'DROP TABLE IF EXISTS regulatory_compliance_reports',
  'DROP TABLE IF EXISTS safety_mocs',
  'DROP TABLE IF EXISTS safety_audits',
  'DROP TABLE IF EXISTS emergency_activations',
  'DROP TABLE IF EXISTS safety_meeting_attendees',
  'DROP TABLE IF EXISTS safety_meetings',
  'DROP TABLE IF EXISTS safety_communications',
  'DROP TABLE IF EXISTS capa_tickets',
  'DROP TABLE IF EXISTS frat_assessments',
  'DROP TABLE IF EXISTS safety_reports'
];
