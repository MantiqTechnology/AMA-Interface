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
    reportedByUserId: text('reported_by_user_id').references(() => crews.id),
    
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
    
    riskZone: text('risk_zone')
      .$type<'GREEN' | 'YELLOW' | 'RED'>()
      .notNull(),
    
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
      
    assignedToUserId: text('assigned_to_user_id').references(() => crews.id),
    
    dueDate: text('due_date').notNull(),
    isOverdueEscalated: integer('is_overdue_escalated', { mode: 'boolean' }).notNull().default(false),
    escalatedToUserId: text('escalated_to_user_id').references(() => crews.id),
    
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
    commType: text('comm_type')
      .$type<'FLASH' | 'BULLETIN' | 'LESSONS_LEARNED'>()
      .notNull(),
    urgency: text('urgency')
      .$type<'NORMAL' | 'URGENT'>()
      .notNull()
      .default('NORMAL'),
      
    title: text('title').notNull(),
    content: text('content').notNull(),
    
    status: text('status')
      .$type<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>()
      .notNull()
      .default('DRAFT'),
      
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
export const safetyMeetings = sqliteTable(
  'safety_meetings',
  {
    id: text('id').primaryKey(),
    meetingType: text('meeting_type')
      .$type<'SRB' | 'SAG' | 'AD_HOC'>()
      .notNull(),
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
  }
);

export const safetyMeetingAttendees = sqliteTable(
  'safety_meeting_attendees',
  {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id')
      .notNull()
      .references(() => safetyMeetings.id, { onDelete: 'cascade' }),
    employeeId: text('employee_id')
      .notNull()
      .references(() => crews.id),
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
    
    // -- Kolom SAR ICAO Baru --
    icaoPhase: text('icao_phase')
      .$type<'INCERFA' | 'ALERFA' | 'DETRESFA'>()
      .notNull(),
    natureOfEmergency: text('nature_of_emergency').notNull(),
    pob: integer('pob'),
    endurance: text('endurance'),
    lkp: text('lkp'),
    
    declaredByUserId: text('declared_by_user_id').notNull(),
    declaredAt: text('declared_at').notNull(),
    broadcastStatusJson: text('broadcast_status_json').notNull().default('{}'),
    
    status: text('status')
      .$type<'ACTIVE' | 'DOWNGRADED' | 'CLOSED'>()
      .notNull()
      .default('ACTIVE'),
      
    closedAt: text('closed_at'),
    closureReason: text('closure_reason'),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    index('idx_emergency_activations_status').on(table.status)
  ]
);

// ── 7. Safety Assurance: Audits & Inspections ─────────────────────────
export const safetyAudits = sqliteTable(
  'safety_audits',
  {
    id: text('id').primaryKey(),
    auditNumber: text('audit_number').notNull().unique(),
    subject: text('subject').notNull(),
    auditorName: text('auditor_name').notNull(),
    auditType: text('audit_type')
      .$type<'INTERNAL' | 'EXTERNAL'>()
      .notNull(),
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
  (table) => [
    index('idx_safety_audits_status').on(table.status)
  ]
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
  (table) => [
    index('idx_safety_mocs_status').on(table.status)
  ]
);

// ── 9. Regulatory Compliance Reports (MOR) ────────────────────────────
export const regulatoryComplianceReports = sqliteTable(
  'regulatory_compliance_reports',
  {
    id: text('id').primaryKey(),
    referenceNumber: text('reference_number').notNull().unique(),
    sourceReportId: text('source_report_id').references(() => safetyReports.id),
    
    reportType: text('report_type')
      .$type<'MOR' | 'SDR' | 'OTHER'>()
      .notNull()
      .default('MOR'),
    targetAuthority: text('target_authority').notNull().default('DKUPPU'),
    
    generatedByUserId: text('generated_by_user_id').notNull(),
    generatedAt: text('generated_at').notNull(),
    submittedAt: text('submitted_at'),
    authorityReceiptNumber: text('authority_receipt_number'),
    
    status: text('status')
      .$type<'DRAFT' | 'GENERATED' | 'SUBMITTED' | 'ACKNOWLEDGED'>()
      .notNull()
      .default('DRAFT'),
      
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  }
);

// ── 10. SMS Audit Logs ────────────────────────────────────────────────
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
export type SmsAuditLogRecord = typeof smsAuditLogs.$inferSelect;