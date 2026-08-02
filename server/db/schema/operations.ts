import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const stations = sqliteTable('stations', {
  id: text('id').primaryKey(),
  stationCode: text('station_code').notNull().unique(),
  stationName: text('station_name').notNull(),
  iataCode: text('iata_code'),
  icaoCode: text('icao_code'),
  airportType: text('airport_type'),
  operationalStatus: text('operational_status').notNull().default('ACTIVE'),
  cityOrRegion: text('city_or_region'),
  city: text('city'),
  province: text('province'),
  countryCode: text('country_code'),
  timezone: text('timezone').notNull().default('Asia/Jayapura'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  elevationFt: integer('elevation_ft'),
  surfaceType: text('surface_type'),
  runwayLengthM: integer('runway_length_m'),
  runwayWidthM: integer('runway_width_m'),
  stationPicName: text('station_pic_name'),
  stationPicPhone: text('station_pic_phone'),
  operationalNotes: text('operational_notes'),
  isRemoteStation: integer('is_remote_station', { mode: 'boolean' }).notNull().default(false),
  lowConnectivityMode: integer('low_connectivity_mode', { mode: 'boolean' })
    .notNull()
    .default(false),
  hasFuelService: integer('has_fuel_service', { mode: 'boolean' }).notNull().default(false),
  hasHandlingService: integer('has_handling_service', { mode: 'boolean' }).notNull().default(false),
  hasParkingService: integer('has_parking_service', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const aircraft = sqliteTable('aircraft', {
  id: text('id').primaryKey(),
  registrationNumber: text('registration_number').notNull().unique(),
  serialNumber: text('serial_number'),
  aircraftType: text('aircraft_type').notNull(),
  manufacturer: text('manufacturer').notNull(),
  model: text('model').notNull(),
  fleetCode: text('fleet_code'),
  passengerCapacity: integer('passenger_capacity').notNull(),
  cargoCapacityKg: integer('cargo_capacity_kg').notNull(),
  fuelType: text('fuel_type').notNull(),
  engineCategory: text('engine_category').notNull().default('TURBINE'),
  usableFuelCapacityLitre: real('usable_fuel_capacity_litre'),
  fuelCapacityBasis: text('fuel_capacity_basis').notNull().default('USABLE'),
  cruiseFuelBurnLitrePerHour: real('cruise_fuel_burn_litre_per_hour'),
  holdingFuelBurnLitrePerHour: real('holding_fuel_burn_litre_per_hour'),
  taxiFuelBurnLitrePerHour: real('taxi_fuel_burn_litre_per_hour'),
  fuelProfileSource: text('fuel_profile_source').notNull().default('DEMO'),
  fuelProfileReference: text('fuel_profile_reference'),
  fuelProfileEffectiveFrom: text('fuel_profile_effective_from'),
  fuelProfileAdvisoryOnly: integer('fuel_profile_advisory_only', { mode: 'boolean' })
    .notNull()
    .default(true),
  operationalStatus: text('operational_status').notNull().default('ACTIVE'),
  serviceabilityStatus: text('serviceability_status').notNull(),
  baseStationId: text('base_station_id').references(() => stations.id),
  currentStationId: text('current_station_id').references(() => stations.id),
  defaultCapacityProfileId: text('default_capacity_profile_id'),
  lastMaintenanceCheckAt: text('last_maintenance_check_at'),
  nextMaintenanceDueAt: text('next_maintenance_due_at'),
  serviceabilityNote: text('serviceability_note'),
  airframeHours: real('airframe_hours').notNull().default(0),
  airframeCycles: integer('airframe_cycles').notNull().default(0),
  version: integer('version').notNull().default(1),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const aircraftDefects = sqliteTable('aircraft_defects', {
  id: text('id').primaryKey(),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  defectNumber: text('defect_number').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  detectedAt: text('detected_at').notNull(),
  detectedByUserId: text('detected_by_user_id').notNull(),
  sourceReference: text('source_reference'),
  evidenceReferences: text('evidence_references').notNull().default('[]'),
  status: text('status').notNull().default('OPEN'),
  rectificationNote: text('rectification_note'),
  rectifiedAt: text('rectified_at'),
  rectifiedByUserId: text('rectified_by_user_id'),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const aircraftDeferments = sqliteTable('aircraft_deferments', {
  id: text('id').primaryKey(),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  defectId: text('defect_id')
    .notNull()
    .unique()
    .references(() => aircraftDefects.id),
  defermentType: text('deferment_type').notNull(),
  referenceCode: text('reference_code').notNull(),
  category: text('category'),
  operationalLimitations: text('operational_limitations').notNull(),
  maintenanceProcedure: text('maintenance_procedure'),
  operationsProcedure: text('operations_procedure'),
  effectiveAt: text('effective_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  authorizedByUserId: text('authorized_by_user_id').notNull(),
  authorizationReference: text('authorization_reference').notNull(),
  applicableRouteIds: text('applicable_route_ids').notNull().default('[]'),
  applicableServiceTypeCodes: text('applicable_service_type_codes').notNull().default('[]'),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const aircraftMaintenanceRequirements = sqliteTable('aircraft_maintenance_requirements', {
  id: text('id').primaryKey(),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  requirementCode: text('requirement_code').notNull(),
  title: text('title').notNull(),
  dueAt: text('due_at'),
  dueAirframeHours: real('due_airframe_hours'),
  dueAirframeCycles: integer('due_airframe_cycles'),
  sourceReference: text('source_reference').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  compliedAt: text('complied_at'),
  releaseId: text('release_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const aircraftMaintenanceReleases = sqliteTable('aircraft_maintenance_releases', {
  id: text('id').primaryKey(),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  releaseNumber: text('release_number').notNull().unique(),
  resultingStatus: text('resulting_status').notNull(),
  workOrderReference: text('work_order_reference').notNull(),
  releaseStatement: text('release_statement').notNull(),
  certifyingUserId: text('certifying_user_id').notNull(),
  certifyingLicenseNumber: text('certifying_license_number').notNull(),
  releasedAt: text('released_at').notNull(),
  evidenceReferences: text('evidence_references').notNull().default('[]'),
  defectIds: text('defect_ids').notNull().default('[]'),
  signerAuthorizationSnapshotJson: text('signer_authorization_snapshot_json'),
  createdAt: text('created_at').notNull()
});

export const aircraftStatusHistory = sqliteTable('aircraft_status_history', {
  id: text('id').primaryKey(),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  statusDimension: text('status_dimension').notNull(),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  reason: text('reason').notNull(),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id'),
  actorUserId: text('actor_user_id').notNull(),
  actorRole: text('actor_role').notNull(),
  occurredAt: text('occurred_at').notNull(),
  metadata: text('metadata')
});

export const aircraftUtilizationLedger = sqliteTable('aircraft_utilization_ledger', {
  id: text('id').primaryKey(),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  flightId: text('flight_id').notNull().unique(),
  flightHours: real('flight_hours').notNull(),
  cycles: integer('cycles').notNull().default(1),
  postedAt: text('posted_at').notNull()
});

export const routes = sqliteTable(
  'routes',
  {
    id: text('id').primaryKey(),
    routeCode: text('route_code').notNull().unique(),
    originStationId: text('origin_station_id')
      .notNull()
      .references(() => stations.id),
    destinationStationId: text('destination_station_id')
      .notNull()
      .references(() => stations.id),
    estimatedDurationMinutes: integer('estimated_duration_minutes').notNull(),
    distanceKm: integer('distance_km').notNull(),
    operationalNotes: text('operational_notes'),
    restrictionLevel: text('restriction_level').notNull().default('NONE'),
    restrictionNote: text('restriction_note'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('routes_origin_destination_unique').on(
      table.originStationId,
      table.destinationStationId
    )
  ]
);

const operationLookupTable = (name: string) =>
  sqliteTable(name, {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    label: text('label').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  });

export const flightTypes = operationLookupTable('flight_types');
export const flightServiceTypes = operationLookupTable('flight_service_types');
export const flightPriorities = operationLookupTable('flight_priorities');
export const flightRequestStatuses = operationLookupTable('flight_request_statuses');
export const flightOperationStatuses = operationLookupTable('flight_operation_statuses');
export const crewAssignmentRoles = operationLookupTable('crew_assignment_roles');
export const flightActionTypes = operationLookupTable('flight_action_types');
export const flightApprovalTypes = operationLookupTable('flight_approval_types');
export const flightApprovalStatuses = operationLookupTable('flight_approval_statuses');
export const flightAttachmentStatuses = operationLookupTable('flight_attachment_statuses');
export const readinessStatuses = operationLookupTable('readiness_statuses');
export const manifestTypes = operationLookupTable('manifest_types');
export const manifestStatuses = operationLookupTable('manifest_statuses');
export const dgAcceptanceStatuses = operationLookupTable('dg_acceptance_statuses');
export const fuelWorkflowStatuses = operationLookupTable('fuel_workflow_statuses');
export const stationServiceTypes = operationLookupTable('station_service_types');
export const stationServiceStatuses = operationLookupTable('station_service_statuses');
export const stationCostStatuses = operationLookupTable('station_cost_statuses');
export const aircraftServiceabilityStatuses = operationLookupTable(
  'aircraft_serviceability_statuses'
);
export const maintenanceHandoffStatuses = operationLookupTable('maintenance_handoff_statuses');
export const financeEventTypes = operationLookupTable('finance_event_types');
export const financeHandoffStatuses = operationLookupTable('finance_handoff_statuses');

export const flightScheduleTemplates = sqliteTable('flight_schedule_templates', {
  id: text('id').primaryKey(),
  templateCode: text('template_code').notNull().unique(),
  routeId: text('route_id')
    .notNull()
    .references(() => routes.id),
  serviceTypeId: text('service_type_id')
    .notNull()
    .references(() => flightServiceTypes.id),
  defaultAircraftId: text('default_aircraft_id').references(() => aircraft.id),
  capacityProfileId: text('capacity_profile_id').references(() => flightCapacityProfiles.id),
  operatingDays: text('operating_days').notNull(),
  departureTimeLocal: text('departure_time_local').notNull(),
  arrivalTimeLocal: text('arrival_time_local').notNull(),
  arrivalDayOffset: integer('arrival_day_offset').notNull().default(0),
  bookingOpenMinutesBefore: integer('booking_open_minutes_before').notNull().default(4320),
  bookingOpenHoursBefore: integer('booking_open_hours_before').notNull().default(72),
  bookingCloseMinutesBefore: integer('booking_close_minutes_before').notNull().default(60),
  lifecycleStatus: text('lifecycle_status').notNull().default('ACTIVE'),
  effectiveFrom: text('effective_from'),
  effectiveUntil: text('effective_until'),
  scheduleNote: text('schedule_note'),
  internalOperationalNote: text('internal_operational_note'),
  version: integer('version').notNull().default(1),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const scheduleTemplateAuditLogs = sqliteTable('schedule_template_audit_logs', {
  id: text('id').primaryKey(),
  templateId: text('template_id')
    .notNull()
    .references(() => flightScheduleTemplates.id),
  action: text('action').notNull(),
  actorId: text('actor_id'),
  actorName: text('actor_name'),
  changedFields: text('changed_fields').notNull().default('[]'),
  metadata: text('metadata'),
  requestId: text('request_id'),
  occurredAt: text('occurred_at').notNull()
});

export const flightCapacityProfiles = sqliteTable('flight_capacity_profiles', {
  id: text('id').primaryKey(),
  profileCode: text('profile_code').notNull().unique(),
  profileName: text('profile_name').notNull().default(''),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  routeId: text('route_id')
    .notNull()
    .references(() => routes.id),
  serviceTypeId: text('service_type_id')
    .notNull()
    .references(() => flightServiceTypes.id),
  seatCapacity: integer('seat_capacity').notNull(),
  cargoCapacityKg: integer('cargo_capacity_kg').notNull(),
  reservedSeatCount: integer('reserved_seat_count').notNull().default(0),
  reservedCargoKg: integer('reserved_cargo_kg').notNull().default(0),
  capacityNote: text('capacity_note'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const departments = sqliteTable('departments', {
  id: text('id').primaryKey(),
  departmentCode: text('department_code').notNull().unique(),
  departmentName: text('department_name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const crews = sqliteTable('crews', {
  id: text('id').primaryKey(),
  employeeCode: text('employee_code').notNull().unique(),
  fullName: text('full_name').notNull(),
  gender: text('gender'),
  dateOfBirth: text('date_of_birth'),
  nationalityCode: text('nationality_code'),
  phone: text('phone'),
  email: text('email'),
  crewRole: text('crew_role').notNull(),
  licenseType: text('license_type'),
  licenseNumber: text('license_number'),
  licenseExpiryDate: text('license_expiry_date'),
  medicalExpiryDate: text('medical_expiry_date'),
  baseStationId: text('base_station_id').references(() => stations.id),
  availabilityStatus: text('availability_status').notNull().default('AVAILABLE'),
  dutyStationId: text('duty_station_id').references(() => stations.id),
  readinessNote: text('readiness_note'),
  unit: text('unit').notNull(),
  departmentId: text('department_id').references(() => departments.id),
  supervisorPersonnelId: text('supervisor_personnel_id'),
  employmentStatus: text('employment_status').notNull(),
  lifecycleStatus: text('lifecycle_status').notNull().default('ACTIVE'),
  version: integer('version').notNull().default(1),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const personnelLicenses = sqliteTable('personnel_licenses', {
  id: text('id').primaryKey(),
  personnelId: text('personnel_id')
    .notNull()
    .references(() => crews.id),
  licenseType: text('license_type').notNull(),
  licenseNumber: text('license_number').notNull(),
  issuingAuthority: text('issuing_authority'),
  issueDate: text('issue_date'),
  expiryDate: text('expiry_date'),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  status: text('status').notNull().default('ACTIVE'),
  documentId: text('document_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const personnelMedicalCertificates = sqliteTable('personnel_medical_certificates', {
  id: text('id').primaryKey(),
  personnelId: text('personnel_id')
    .notNull()
    .references(() => crews.id),
  certificateType: text('certificate_type').notNull(),
  certificateNumber: text('certificate_number'),
  issueDate: text('issue_date'),
  expiryDate: text('expiry_date').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  restrictions: text('restrictions'),
  issuingAuthority: text('issuing_authority'),
  documentId: text('document_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const personnelQualifications = sqliteTable('personnel_qualifications', {
  id: text('id').primaryKey(),
  personnelId: text('personnel_id')
    .notNull()
    .references(() => crews.id),
  qualificationType: text('qualification_type').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  issuedAt: text('issued_at'),
  expiresAt: text('expires_at'),
  status: text('status').notNull().default('VALID'),
  notes: text('notes'),
  documentId: text('document_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const personnelNotes = sqliteTable('personnel_notes', {
  id: text('id').primaryKey(),
  personnelId: text('personnel_id')
    .notNull()
    .references(() => crews.id),
  noteType: text('note_type').notNull().default('GENERAL'),
  visibility: text('visibility').notNull().default('INTERNAL'),
  noteText: text('note_text').notNull(),
  authorId: text('author_id'),
  authorName: text('author_name'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const personnelAuditLogs = sqliteTable('personnel_audit_logs', {
  id: text('id').primaryKey(),
  personnelId: text('personnel_id')
    .notNull()
    .references(() => crews.id),
  action: text('action').notNull(),
  actorId: text('actor_id'),
  actorName: text('actor_name'),
  changedFields: text('changed_fields').notNull().default('[]'),
  metadata: text('metadata'),
  requestId: text('request_id'),
  occurredAt: text('occurred_at').notNull()
});

export const flightReasons = sqliteTable('flight_reasons', {
  id: text('id').primaryKey(),
  reasonCode: text('reason_code').notNull().unique(),
  reasonName: text('reason_name').notNull().default(''),
  reasonType: text('reason_type').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  requiresNote: integer('requires_note', { mode: 'boolean' }).notNull().default(false),
  affectsOperationalKpi: integer('affects_operational_kpi', { mode: 'boolean' })
    .notNull()
    .default(true),
  affectsFinanceReview: integer('affects_finance_review', { mode: 'boolean' })
    .notNull()
    .default(false),
  dashboardSeverity: text('dashboard_severity').notNull().default('WARNING'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});
