import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { flightOperations } from './flight-operations';
import { aircraft, crews, stations } from './operations';

// ── 1. Safety Reports (Hazard, Incident, Technical Finding) ───────────
export const safetyReports = sqliteTable(
  'safety_reports',
  {
    id: text('id').primaryKey(),
    reportNumber: text('report_number').notNull().unique(),
    reportCategory: text('report_category')
      .$type<'HAZARD' | 'INCIDENT' | 'OCCURRENCE' | 'TECHNICAL_FINDING'>()
      .notNull(),

    stationId: text('station_id').references(() => stations.id),
    aircraftId: text('aircraft_id').references(() => aircraft.id),
    flightOperationId: text('flight_operation_id').references(() => flightOperations.id),

    description: text('description').notNull(),
    isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull().default(false),
    // Employee master data is currently queried through SQL rather than Drizzle.
    // The database constraint is declared in migrations/sms.ts.
    reportedByUserId: text('reported_by_user_id'),

    evidenceIdsJson: text('evidence_ids_json').notNull().default('[]'),
    status: text('status')
      .$type<'SUBMITTED' | 'UNDER_INVESTIGATION' | 'CAPA_ISSUED' | 'CLOSED'>()
      .notNull()
      .default('SUBMITTED'),

    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_safety_reports_category').on(table.reportCategory),
    index('idx_safety_reports_status').on(table.status),
    index('idx_safety_reports_station').on(table.stationId)
  ]
);

// ── 2. Pre-Flight Risk Assessment (FRAT) ───────────────────────────────
export const fratAssessments = sqliteTable(
  'frat_assessments',
  {
    id: text('id').primaryKey(),
    flightOperationId: text('flight_operation_id')
      .notNull()
      .references(() => flightOperations.id, { onDelete: 'cascade' }),
    picEmployeeId: text('pic_employee_id')
      .notNull()
      .references(() => crews.id),

    crewFatigueScore: integer('crew_fatigue_score').notNull(),
    weatherRiskScore: integer('weather_risk_score').notNull(),
    airstripRatingScore: integer('airstrip_rating_score').notNull(),
    totalRiskScore: integer('total_risk_score').notNull(),

    riskZone: text('risk_zone').$type<'GREEN' | 'YELLOW' | 'RED'>().notNull(),

    isHardLocked: integer('is_hard_locked', { mode: 'boolean' }).notNull().default(false),
    overrideSignoffByUserId: text('override_signoff_by_user_id').references(() => crews.id),
    overrideReason: text('override_reason'),

    status: text('status')
      .$type<'DRAFT' | 'SUBMITTED' | 'OVERRIDDEN' | 'CLEARED'>()
      .notNull()
      .default('DRAFT'),

    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('idx_frat_assessments_flight_unique').on(table.flightOperationId),
    index('idx_frat_assessments_risk_zone').on(table.riskZone)
  ]
);

// ── 3. Corrective and Preventive Action (CAPA) ────────────────────────
export const capaTickets = sqliteTable(
  'capa_tickets',
  {
    id: text('id').primaryKey(),
    ticketNumber: text('ticket_number').notNull().unique(),
    sourceReportId: text('source_report_id').references(() => safetyReports.id),

    subject: text('subject').notNull(),
    description: text('description').notNull(),

    status: text('status')
      .$type<'NEW' | 'INVESTIGATION' | 'ACTION' | 'VERIFIED' | 'CLOSED'>()
      .notNull()
      .default('NEW'),
    priority: text('priority')
      .$type<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>()
      .notNull()
      .default('MEDIUM'),

    assignedToUserId: text('assigned_to_user_id'),

    dueDate: text('due_date').notNull(),
    isOverdueEscalated: integer('is_overdue_escalated', { mode: 'boolean' })
      .notNull()
      .default(false),
    escalatedToUserId: text('escalated_to_user_id'),

    resolvedAt: text('resolved_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_capa_tickets_status').on(table.status),
    index('idx_capa_tickets_due_date').on(table.dueDate)
  ]
);

// ── 4. Safety Communications (Flash, Bulletins) ───────────────────────
export const safetyCommunications = sqliteTable(
  'safety_communications',
  {
    id: text('id').primaryKey(),
    commType: text('comm_type').$type<'FLASH' | 'BULLETIN' | 'LESSONS_LEARNED'>().notNull(),
    urgency: text('urgency').$type<'NORMAL' | 'URGENT'>().notNull().default('NORMAL'),

    title: text('title').notNull(),
    content: text('content').notNull(),

    status: text('status').$type<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>().notNull().default('DRAFT'),

    documentId: text('document_id'),
    authorUserId: text('author_user_id').notNull(),
    publishedAt: text('published_at'),

    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_safety_comms_type').on(table.commType),
    index('idx_safety_comms_status').on(table.status)
  ]
);

// ── 5. Safety Meetings (SRB & SAG) ────────────────────────────────────
export const safetyMeetings = sqliteTable('safety_meetings', {
  id: text('id').primaryKey(),
  meetingType: text('meeting_type').$type<'SRB' | 'SAG' | 'AD_HOC'>().notNull(),
  title: text('title').notNull(),
  scheduledAt: text('scheduled_at').notNull(),
  location: text('location').notNull(),
  minutesDocumentId: text('minutes_document_id'),

  status: text('status')
    .$type<'SCHEDULED' | 'CONDUCTED' | 'CANCELLED'>()
    .notNull()
    .default('SCHEDULED'),

  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const safetyMeetingAttendees = sqliteTable(
  'safety_meeting_attendees',
  {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id')
      .notNull()
      .references(() => safetyMeetings.id, { onDelete: 'cascade' }),
    employeeId: text('employee_id').notNull(),
    attendanceStatus: text('attendance_status')
      .$type<'INVITED' | 'ATTENDED' | 'ABSENT'>()
      .notNull()
      .default('INVITED')
  },
  (table) => [
    uniqueIndex('idx_safety_meeting_attendees_unique').on(table.meetingId, table.employeeId)
  ]
);

// ── 6. Emergency Response Plan (ERP) Activations ──────────────────────
export const emergencyActivations = sqliteTable(
  'emergency_activations',
  {
    id: text('id').primaryKey(),
    activationNumber: text('activation_number').notNull().unique(),
    flightOperationId: text('flight_operation_id').references(() => flightOperations.id),
    aircraftId: text('aircraft_id').references(() => aircraft.id),
    stationId: text('station_id').references(() => stations.id),

    icaoPhase: text('icao_phase').$type<'INCERFA' | 'ALERFA' | 'DETRESFA'>().notNull(),
    natureOfEmergency: text('nature_of_emergency').notNull(),
    pob: integer('pob'),
    endurance: text('endurance'),
    lkp: text('lkp'),

    declaredByUserId: text('declared_by_user_id').notNull(),
    declaredAt: text('declared_at').notNull(),
    broadcastStatusJson: text('broadcast_status_json').notNull().default('{}'),

    status: text('status').$type<'ACTIVE' | 'DOWNGRADED' | 'CLOSED'>().notNull().default('ACTIVE'),

    closedAt: text('closed_at'),
    closureReason: text('closure_reason'),
    createdAt: text('created_at').notNull()
  },
  (table) => [index('idx_emergency_activations_status').on(table.status)]
);

// ── 7. Safety Assurance: Audits & Inspections ─────────────────────────
export const safetyAudits = sqliteTable(
  'safety_audits',
  {
    id: text('id').primaryKey(),
    auditNumber: text('audit_number').notNull().unique(),
    subject: text('subject').notNull(),
    auditorName: text('auditor_name').notNull(),
    auditType: text('audit_type').$type<'INTERNAL' | 'EXTERNAL'>().notNull(),
    scheduledFrom: text('scheduled_from').notNull(),
    scheduledTo: text('scheduled_to').notNull(),
    findingsCount: integer('findings_count').notNull().default(0),
    status: text('status')
      .$type<'SCHEDULED' | 'IN_PROGRESS' | 'ACTION_REQUIRED' | 'COMPLETED' | 'CANCELLED'>()
      .notNull()
      .default('SCHEDULED'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [index('idx_safety_audits_status').on(table.status)]
);

// ── 8. Safety Assurance: Management of Change / MOC ───────────────────
export const safetyMocs = sqliteTable(
  'safety_mocs',
  {
    id: text('id').primaryKey(),
    mocNumber: text('moc_number').notNull().unique(),
    title: text('title').notNull(),
    sponsorDepartment: text('sponsor_department').notNull(),
    progressPercentage: integer('progress_percentage').notNull().default(0),
    status: text('status')
      .$type<'INITIATED' | 'RISK_ASSESSMENT' | 'IMPLEMENTATION' | 'CLOSED' | 'CANCELLED'>()
      .notNull()
      .default('INITIATED'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [index('idx_safety_mocs_status').on(table.status)]
);

// ── 9. Regulatory Compliance Reports (MOR) ────────────────────────────
export const regulatoryComplianceReports = sqliteTable('regulatory_compliance_reports', {
  id: text('id').primaryKey(),
  referenceNumber: text('reference_number').notNull().unique(),
  sourceReportId: text('source_report_id').references(() => safetyReports.id),

  reportType: text('report_type')
    .$type<'MOR' | 'SDR' | 'ASR' | 'INC' | 'VHR'>()
    .notNull()
    .default('MOR'),
  targetAuthority: text('target_authority').notNull().default('DKUPPU'),

  generatedByUserId: text('generated_by_user_id').notNull(),
  generatedAt: text('generated_at').notNull(),
  submittedAt: text('submitted_at'),
  authorityReceiptNumber: text('authority_receipt_number'),

  status: text('status')
    .$type<
      'DRAFT' | 'GENERATED' | 'PENDING_APPROVAL' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'NEED_REVISION'
    >()
    .notNull()
    .default('DRAFT'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── 10. Company Certificates (AOC, OpsSpec) ───────────────────────────
export const companyCertificates = sqliteTable('company_certificates', {
  id: text('id').primaryKey(),
  certNumber: text('cert_number').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  expiryDate: text('expiry_date').notNull(),

  status: text('status').$type<'VALID' | 'EXPIRING_SOON' | 'EXPIRED'>().notNull().default('VALID'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── 11. Operations Manuals (CASR 135) ─────────────────────────────────
export const operationsManuals = sqliteTable('operations_manuals', {
  id: text('id').primaryKey(),
  documentName: text('document_name').notNull(),
  revision: text('revision').notNull(),
  updatedDate: text('updated_date').notNull(),

  status: text('status')
    .$type<'APPROVED' | 'PENDING_DKUPPU' | 'UNDER_REVISION'>()
    .notNull()
    .default('APPROVED'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── 12. Authority Correspondences (Inbox) ─────────────────────────────
export const authorityCorrespondences = sqliteTable('authority_correspondences', {
  id: text('id').primaryKey(),
  messageRef: text('message_ref').notNull().unique(),
  authority: text('authority').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  receivedAt: text('received_at').notNull(),

  status: text('status').$type<'UNREAD' | 'READ' | 'ACTION_REQUIRED'>().notNull().default('UNREAD'),

  createdAt: text('created_at').notNull()
});

// ── 13. SMS Audit Logs ────────────────────────────────────────────────
export const smsAuditLogs = sqliteTable(
  'sms_audit_logs',
  {
    id: text('id').primaryKey(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),

    action: text('action').notNull(),
    actorUserId: text('actor_user_id').notNull(),
    actorRole: text('actor_role').notNull(),

    beforeSnapshotJson: text('before_snapshot_json'),
    afterSnapshotJson: text('after_snapshot_json'),
    reason: text('reason'),

    occurredAt: text('occurred_at').notNull(),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    index('idx_sms_audit_entity').on(table.entityType, table.entityId),
    index('idx_sms_audit_occurred').on(table.occurredAt)
  ]
);

// ── 14. Safety Competency Matrix & Certifications ─────────────────────
export const safetyPersonnelCompetencies = sqliteTable(
  'safety_personnel_competencies',
  {
    id: text('id').primaryKey(),
    personnelId: text('personnel_id').notNull(),
    competencyType: text('competency_type')
      .$type<'SMS_INITIAL' | 'CRM_HF' | 'DANGEROUS_GOODS' | 'CFIT_ALAR' | 'MOUNTAIN_VALLEY_CHECK'>()
      .notNull(),
    certificateNumber: text('certificate_number'),
    issuedAt: text('issued_at').notNull(),
    expiresAt: text('expires_at'),
    status: text('status')
      .$type<'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_APPLICABLE'>()
      .notNull()
      .default('VALID'),
    documentId: text('document_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('idx_safety_comp_personnel_type').on(table.personnelId, table.competencyType),
    index('idx_safety_comp_status').on(table.status),
    index('idx_safety_comp_expiry').on(table.expiresAt)
  ]
);

// ── 15. Corporate Safety Risk Register (CRR) ─────────────────────────
export const corporateRiskRegister = sqliteTable(
  'corporate_risk_register',
  {
    id: text('id').primaryKey(),
    riskCode: text('risk_code').notNull().unique(),
    title: text('title').notNull(),
    hazardDescription: text('hazard_description').notNull(),
    initialSeverity: text('initial_severity').$type<'1' | '2' | '3' | '4' | '5'>().notNull(),
    initialLikelihood: text('initial_likelihood').$type<'A' | 'B' | 'C' | 'D' | 'E'>().notNull(),
    initialRiskIndex: text('initial_risk_index').notNull(),
    initialRiskLevel: text('initial_risk_level')
      .$type<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>()
      .notNull(),
    mitigationBarriers: text('mitigation_barriers').notNull(),
    residualSeverity: text('residual_severity').$type<'1' | '2' | '3' | '4' | '5'>().notNull(),
    residualLikelihood: text('residual_likelihood').$type<'A' | 'B' | 'C' | 'D' | 'E'>().notNull(),
    residualRiskIndex: text('residual_risk_index').notNull(),
    residualRiskLevel: text('residual_risk_level')
      .$type<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>()
      .notNull(),
    riskOwnerRole: text('risk_owner_role').notNull(),
    reviewFrequency: text('review_frequency')
      .$type<'MONTHLY' | 'BI_MONTHLY' | 'QUARTERLY' | 'ANNUAL'>()
      .notNull()
      .default('QUARTERLY'),
    lastReviewedAt: text('last_reviewed_at'),
    status: text('status').$type<'ACTIVE' | 'MITIGATED' | 'CLOSED'>().notNull().default('ACTIVE'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('idx_crr_status').on(table.status),
    index('idx_crr_risk_level').on(table.residualRiskLevel)
  ]
);

// ── 16. Safety Governance Policies ────────────────────────────────────
export const safetyGovernancePolicies = sqliteTable(
  'safety_governance_policies',
  {
    id: text('id').primaryKey(),
    policyCode: text('policy_code').notNull().unique(),
    title: text('title').notNull(),
    revision: text('revision').notNull(),
    signeeRole: text('signee_role').notNull(),
    effectiveFrom: text('effective_from').notNull(),
    validUntil: text('valid_until').notNull(),
    documentId: text('document_id'),
    acknowledgementRequired: integer('acknowledgement_required', { mode: 'boolean' })
      .notNull()
      .default(true),
    status: text('status')
      .$type<'ACTIVE' | 'UNDER_REVISION' | 'SUPERSEDED'>()
      .notNull()
      .default('ACTIVE'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [index('idx_safety_policies_status').on(table.status)]
);

// ── 17. Just Culture Assessment Records (James Reason Model) ──────────
export const justCultureAssessments = sqliteTable(
  'just_culture_assessments',
  {
    id: text('id').primaryKey(),
    sourceReportId: text('source_report_id')
      .notNull()
      .references(() => safetyReports.id, { onDelete: 'cascade' }),
    decisionPath: text('decision_path')
      .$type<'HUMAN_ERROR' | 'AT_RISK_BEHAVIOR' | 'RECKLESS_CONDUCT'>()
      .notNull(),
    actionType: text('action_type')
      .$type<'SYSTEM_FIX_TRAINING' | 'COACHING_COUNSELING' | 'DISCIPLINARY'>()
      .notNull(),
    isNonPunitiveProtected: integer('is_non_punitive_protected', { mode: 'boolean' })
      .notNull()
      .default(true),
    justificationNotes: text('justification_notes').notNull(),
    assessedByUserId: text('assessed_by_user_id').notNull(),
    assessedAt: text('assessed_at').notNull(),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    uniqueIndex('idx_just_culture_source_unique').on(table.sourceReportId),
    index('idx_just_culture_decision').on(table.decisionPath)
  ]
);

export type SafetyReportRecord = typeof safetyReports.$inferSelect;
export type FratAssessmentRecord = typeof fratAssessments.$inferSelect;
export type CapaTicketRecord = typeof capaTickets.$inferSelect;
export type SafetyCommunicationRecord = typeof safetyCommunications.$inferSelect;
export type SafetyMeetingRecord = typeof safetyMeetings.$inferSelect;
export type SafetyMeetingAttendeeRecord = typeof safetyMeetingAttendees.$inferSelect;
export type EmergencyActivationRecord = typeof emergencyActivations.$inferSelect;
export type SafetyAuditRecord = typeof safetyAudits.$inferSelect;
export type SafetyMocRecord = typeof safetyMocs.$inferSelect;
export type RegulatoryComplianceReportRecord = typeof regulatoryComplianceReports.$inferSelect;
export type CompanyCertificateRecord = typeof companyCertificates.$inferSelect;
export type OperationsManualRecord = typeof operationsManuals.$inferSelect;
export type AuthorityCorrespondenceRecord = typeof authorityCorrespondences.$inferSelect;
export type SmsAuditLogRecord = typeof smsAuditLogs.$inferSelect;
export type SafetyPersonnelCompetencyRecord = typeof safetyPersonnelCompetencies.$inferSelect;
export type CorporateRiskRegisterRecord = typeof corporateRiskRegister.$inferSelect;
export type SafetyGovernancePolicyRecord = typeof safetyGovernancePolicies.$inferSelect;
export type JustCultureAssessmentRecord = typeof justCultureAssessments.$inferSelect;
