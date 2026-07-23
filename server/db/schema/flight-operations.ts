import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { dgCategories } from './cargo';
import { dgAcceptanceStatuses, manifestStatuses, manifestTypes } from './operations';
import { cargoBookings, passengerTickets } from './ticketing';
import { customers } from './commercial';
import { aircraft, crews, routes, stations } from './operations';

export const flightOperations = sqliteTable('flight_operations', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  flightRequestId: text('flight_request_id'),
  flightNumber: text('flight_number').notNull().unique(),
  flightDate: text('flight_date').notNull(),
  flightTypeId: text('flight_type_id').notNull(),
  serviceTypeId: text('service_type_id').notNull(),
  requestSource: text('request_source').notNull().default('Corporate Charter Request'),
  priorityId: text('priority_id').notNull(),
  routeId: text('route_id')
    .notNull()
    .references(() => routes.id),
  originStationId: text('origin_station_id')
    .notNull()
    .references(() => stations.id),
  destinationStationId: text('destination_station_id')
    .notNull()
    .references(() => stations.id),
  customerId: text('customer_id').references(() => customers.id),
  aircraftId: text('aircraft_id').references(() => aircraft.id),
  pilotInCommandId: text('pilot_in_command_id').references(() => crews.id),
  coPilotId: text('co_pilot_id').references(() => crews.id),
  scheduledDepartureAt: text('scheduled_departure_at'),
  scheduledArrivalAt: text('scheduled_arrival_at'),
  actualDepartureAt: text('actual_departure_at'),
  actualDepartureStationId: text('actual_departure_station_id').references(() => stations.id),
  actualArrivalAt: text('actual_arrival_at'),
  actualArrivalStationId: text('actual_arrival_station_id').references(() => stations.id),
  currentStatusId: text('current_status_id').notNull(),
  createdByUserId: text('created_by_user_id'),
  approvedByUserId: text('approved_by_user_id'),
  remarks: text('remarks'),
  billingType: text('billing_type').notNull().default('CHARTER'),
  estimatedRevenue: integer('estimated_revenue'),
  currencyCode: text('currency_code').notNull().default('IDR'),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  blockingReason: text('blocking_reason'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type FlightOperationRecord = typeof flightOperations.$inferSelect;

// Flight readiness checks table with extended fields for verification system
export const flightReadinessChecks = sqliteTable('flight_readiness_checks', {
  id: text('id').primaryKey(),
  flightId: text('flight_id')
    .notNull()
    .references(() => flightOperations.id),
  checkCode: text('check_code').notNull(),
  checkName: text('check_name').notNull(),
  statusId: text('status_id').notNull(),
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(true),
  evaluatedAt: text('evaluated_at'),
  evaluatedByUserId: text('evaluated_by_user_id'),
  resultNote: text('result_note'),
  sourceReference: text('source_reference'),
  // NEW FIELDS FOR VERIFICATION SYSTEM
  classification: text('classification').$type<
    'SYSTEM_CHECK' | 'MANUAL_ATTESTATION' | 'ENFORCED' | 'INFORMATIONAL'
  >(),
  calculationStatus: text('calculation_status').$type<'PENDING' | 'PASS' | 'FAIL'>(),
  verificationStatus: text('verification_status').$type<
    'NOT_VERIFIED' | 'VERIFIED' | 'EXPIRED' | 'INVALIDATED'
  >(),
  effectiveStatus: text('effective_status').$type<'PENDING' | 'PASS' | 'FAIL' | 'INFO'>(),
  calculatedAt: text('calculated_at'),
  expiryAt: text('expiry_at'),
  invalidationReason: text('invalidation_reason'),
  sourceRecordIds: text('source_record_ids'), // JSON array of source record IDs
  assurancePhase: text('assurance_phase').$type<'PLANNING' | 'DEPARTURE'>(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type FlightReadinessCheckRecord = typeof flightReadinessChecks.$inferSelect;

// Station tasks table for operational verification
export const flightStationTasks = sqliteTable('flight_station_tasks', {
  id: text('id').primaryKey(),
  flightId: text('flight_id')
    .notNull()
    .references(() => flightOperations.id),
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  phase: text('phase').notNull(), // PRE_DEPARTURE, POST_ARRIVAL, etc.
  taskCode: text('task_code').notNull(),
  taskTitle: text('task_title').notNull(),
  status: text('status').notNull().default('PENDING'),
  assignedRole: text('assigned_role'),
  assignedUserId: text('assigned_user_id'),
  sourceRecordType: text('source_record_type'),
  sourceRecordId: text('source_record_id'),
  requiresEvidence: integer('requires_evidence', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  rejectionReason: text('rejection_reason'),
  verifiedByUserId: text('verified_by_user_id'),
  verifiedAt: text('verified_at'),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type FlightStationTaskRecord = typeof flightStationTasks.$inferSelect;

// Station task approvals table for dual approval system
export const flightStationTaskApprovals = sqliteTable('flight_station_task_approvals', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => flightStationTasks.id),
  approvalStage: text('approval_stage').notNull(), // STATION or OCC
  decision: text('decision').notNull(), // APPROVED or REJECTED
  actorUserId: text('actor_user_id').notNull(),
  actorRole: text('actor_role').notNull(),
  reason: text('reason'),
  approvedAt: text('approved_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type FlightStationTaskApprovalRecord = typeof flightStationTaskApprovals.$inferSelect;

// Verification evidence table
export const flightVerificationEvidence = sqliteTable('flight_verification_evidence', {
  id: text('id').primaryKey(),
  flightId: text('flight_id')
    .notNull()
    .references(() => flightOperations.id),
  stationTaskId: text('station_task_id').references(() => flightStationTasks.id),
  readinessCheckCode: text('readiness_check_code'),
  uploadId: text('upload_id'),
  documentType: text('document_type'),
  fileName: text('file_name').notNull(),
  notes: text('notes'),
  uploadedByUserId: text('uploaded_by_user_id').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type FlightVerificationEvidenceRecord = typeof flightVerificationEvidence.$inferSelect;

// Readiness verifications table
export const flightReadinessVerifications = sqliteTable('flight_readiness_verifications', {
  id: text('id').primaryKey(),
  flightId: text('flight_id')
    .notNull()
    .references(() => flightOperations.id),
  checkCode: text('check_code').notNull(),
  verificationStatus: text('verification_status').notNull(), // PENDING, VERIFIED, EXPIRED, INVALIDATED
  verifierUserId: text('verifier_user_id'),
  evidenceReferences: text('evidence_references'), // JSON array of evidence IDs
  verifiedAt: text('verified_at'),
  expiredAt: text('expired_at'),
  invalidatedAt: text('invalidated_at'),
  invalidationReason: text('invalidation_reason'),
  sourceSnapshot: text('source_snapshot'), // JSON of the source record at verification time
  sourceHash: text('source_hash'), // Hash to detect changes
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type FlightReadinessVerificationRecord = typeof flightReadinessVerifications.$inferSelect;

// Operational audit trail table
export const flightOperationalAudit = sqliteTable('flight_operational_audit', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').notNull(),
  actorRole: text('actor_role').notNull(),
  flightId: text('flight_id')
    .notNull()
    .references(() => flightOperations.id),
  stationId: text('station_id').references(() => stations.id),
  module: text('module').notNull(), // e.g., 'station-tasks', 'readiness', 'manifest', etc.
  action: text('action').notNull(), // e.g., 'task-start', 'task-verify', 'departure', etc.
  beforeStatus: text('before_status'),
  afterStatus: text('after_status'),
  reason: text('reason'),
  evidenceIds: text('evidence_ids'), // JSON array of evidence IDs
  requestId: text('request_id'),
  beforeVersion: integer('before_version'),
  afterVersion: integer('after_version'),
  metadata: text('metadata'), // JSON for additional context
  timestamp: text('timestamp').notNull(),
  createdAt: text('created_at').notNull()
});

export type FlightOperationalAuditRecord = typeof flightOperationalAudit.$inferSelect;

// Actual reconciliations table
export const flightActualReconciliations = sqliteTable('flight_actual_reconciliations', {
  id: text('id').primaryKey(),
  flightId: text('flight_id')
    .notNull()
    .references(() => flightOperations.id),
  plannedPassengers: integer('planned_passengers'),
  actualPassengers: integer('actual_passengers'),
  plannedCargoKg: integer('planned_cargo_kg'),
  actualCargoKg: integer('actual_cargo_kg'),
  noShowPassengers: integer('no_show_passengers').default(0),
  offloadedCargoKg: integer('offloaded_cargo_kg').default(0),
  totalDiscrepancyNote: text('total_discrepancy_note'),
  reconciledByUserId: text('reconciled_by_user_id').notNull(),
  reconciledAt: text('reconciled_at').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type FlightActualReconciliationRecord = typeof flightActualReconciliations.$inferSelect;

// Manifest domain tables (physical tables created via raw SQL in server/db/migrate.ts)
export const flightManifests = sqliteTable(
  'flight_manifests',
  {
    id: text('id').primaryKey(),
    flightOperationId: text('flight_operation_id')
      .notNull()
      .references(() => flightOperations.id),
    manifestTypeId: text('manifest_type_id')
      .notNull()
      .references(() => manifestTypes.id),
    statusId: text('status_id')
      .notNull()
      .references(() => manifestStatuses.id),
    approvedByUserId: text('approved_by_user_id'),
    approvedAt: text('approved_at'),
    lockedAt: text('locked_at'),
    version: integer('version').notNull().default(1),
    submittedByUserId: text('submitted_by_user_id'),
    submittedAt: text('submitted_at'),
    lockedByUserId: text('locked_by_user_id'),
    rejectionReason: text('rejection_reason'),
    emptyLoadReason: text('empty_load_reason'),
    emptyLoadConfirmedByUserId: text('empty_load_confirmed_by_user_id'),
    emptyLoadConfirmedAt: text('empty_load_confirmed_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('flight_manifests_flight_type_unique').on(
      table.flightOperationId,
      table.manifestTypeId
    )
  ]
);

export type FlightManifestRecord = typeof flightManifests.$inferSelect;

export const flightManifestPassengers = sqliteTable('flight_manifest_passengers', {
  id: text('id').primaryKey(),
  manifestId: text('manifest_id')
    .notNull()
    .references(() => flightManifests.id),
  passengerTicketId: text('passenger_ticket_id').references(() => passengerTickets.id),
  fullName: text('full_name').notNull(),
  identityType: text('identity_type'),
  identityNumber: text('identity_number'),
  weightKg: real('weight_kg'),
  seatNumber: text('seat_number'),
  baggageWeightKg: real('baggage_weight_kg'),
  remarks: text('remarks'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type FlightManifestPassengerRecord = typeof flightManifestPassengers.$inferSelect;

export const flightManifestCargoItems = sqliteTable('flight_manifest_cargo_items', {
  id: text('id').primaryKey(),
  manifestId: text('manifest_id')
    .notNull()
    .references(() => flightManifests.id),
  cargoBookingId: text('cargo_booking_id').references(() => cargoBookings.id),
  description: text('description').notNull(),
  senderName: text('sender_name'),
  receiverName: text('receiver_name'),
  actualWeightKg: real('actual_weight_kg').notNull(),
  volumeWeightKg: real('volume_weight_kg'),
  chargeableWeightKg: real('chargeable_weight_kg'),
  dgCategoryId: text('dg_category_id').references(() => dgCategories.id),
  dgAcceptanceStatusId: text('dg_acceptance_status_id')
    .notNull()
    .references(() => dgAcceptanceStatuses.id),
  dgDecidedByUserId: text('dg_decided_by_user_id'),
  dgDecidedAt: text('dg_decided_at'),
  dgDecisionReason: text('dg_decision_reason'),
  dgEvidenceIds: text('dg_evidence_ids'),
  remarks: text('remarks'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type FlightManifestCargoItemRecord = typeof flightManifestCargoItems.$inferSelect;
