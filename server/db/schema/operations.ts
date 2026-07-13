import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const stations = sqliteTable('stations', {
  id: text('id').primaryKey(),
  stationCode: text('station_code').notNull().unique(),
  stationName: text('station_name').notNull(),
  cityOrRegion: text('city_or_region').notNull(),
  province: text('province').notNull(),
  airportType: text('airport_type').notNull(),
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
  operationalStatus: text('operational_status').notNull().default('ACTIVE'),
  serviceabilityStatus: text('serviceability_status').notNull(),
  baseStationId: text('base_station_id').references(() => stations.id),
  currentStationId: text('current_station_id').references(() => stations.id),
  defaultCapacityProfileId: text('default_capacity_profile_id'),
  lastMaintenanceCheckAt: text('last_maintenance_check_at'),
  nextMaintenanceDueAt: text('next_maintenance_due_at'),
  serviceabilityNote: text('serviceability_note'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
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
  operatingDays: text('operating_days').notNull(),
  departureTimeLocal: text('departure_time_local').notNull(),
  arrivalTimeLocal: text('arrival_time_local').notNull(),
  bookingOpenHoursBefore: integer('booking_open_hours_before').notNull().default(72),
  bookingCloseMinutesBefore: integer('booking_close_minutes_before').notNull().default(60),
  scheduleNote: text('schedule_note'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
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

export const crews = sqliteTable('crews', {
  id: text('id').primaryKey(),
  employeeCode: text('employee_code').notNull().unique(),
  fullName: text('full_name').notNull(),
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
  employmentStatus: text('employment_status').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
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
