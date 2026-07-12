import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { ApprovalStatus } from '../../shared/contracts/approvals';
import type { FlightStatus } from '../../shared/contracts/flights';

export const aircraft = sqliteTable('aircraft', {
  id: text('id').primaryKey(),
  tailNumber: text('tail_number').notNull().unique(),
  type: text('type').notNull(),
  displayName: text('display_name').notNull(),
  capacity: integer('capacity').notNull(),
  status: text('status').notNull().default('available')
});

export const stations = sqliteTable('stations', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  province: text('province').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true)
});

export const routes = sqliteTable('routes', {
  id: text('id').primaryKey(),
  originStationId: text('origin_station_id')
    .notNull()
    .references(() => stations.id),
  destinationStationId: text('destination_station_id')
    .notNull()
    .references(() => stations.id),
  distanceNm: integer('distance_nm').notNull(),
  estimatedBlockMinutes: integer('estimated_block_minutes').notNull()
});

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  contactEmail: text('contact_email').notNull()
});

export const flightOrders = sqliteTable('flight_orders', {
  id: text('id').primaryKey(),
  flightNumber: text('flight_number').notNull().unique(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id),
  routeId: text('route_id')
    .notNull()
    .references(() => routes.id),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  status: text('status').$type<FlightStatus>().notNull().default('draft'),
  scheduledDeparture: text('scheduled_departure').notNull(),
  scheduledArrival: text('scheduled_arrival').notNull(),
  purpose: text('purpose').notNull(),
  quotedAmount: real('quoted_amount').notNull(),
  currency: text('currency').notNull().default('IDR')
});

export const manifests = sqliteTable('manifests', {
  id: text('id').primaryKey(),
  flightOrderId: text('flight_order_id')
    .notNull()
    .references(() => flightOrders.id, { onDelete: 'cascade' }),
  passengerName: text('passenger_name').notNull(),
  documentNumber: text('document_number').notNull(),
  seatNumber: text('seat_number').notNull(),
  weightKg: real('weight_kg').notNull(),
  remarks: text('remarks')
});

export const fuelRequests = sqliteTable('fuel_requests', {
  id: text('id').primaryKey(),
  flightOrderId: text('flight_order_id')
    .notNull()
    .references(() => flightOrders.id),
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  requestedLiters: real('requested_liters').notNull(),
  status: text('status').notNull().default('requested'),
  requestedBy: text('requested_by').notNull(),
  requiredAt: text('required_at').notNull(),
  notes: text('notes')
});

export const fuelUplifts = sqliteTable('fuel_uplifts', {
  id: text('id').primaryKey(),
  fuelRequestId: text('fuel_request_id')
    .notNull()
    .references(() => fuelRequests.id, { onDelete: 'cascade' }),
  supplier: text('supplier').notNull(),
  liters: real('liters').notNull(),
  unitPrice: real('unit_price').notNull(),
  total: real('total').notNull(),
  currency: text('currency').notNull().default('IDR'),
  upliftedAt: text('uplifted_at').notNull(),
  receiptPath: text('receipt_path')
});

export const stationExpenses = sqliteTable('station_expenses', {
  id: text('id').primaryKey(),
  stationId: text('station_id')
    .notNull()
    .references(() => stations.id),
  flightOrderId: text('flight_order_id').references(() => flightOrders.id),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('IDR'),
  status: text('status').notNull().default('draft'),
  receiptPath: text('receipt_path'),
  incurredAt: text('incurred_at').notNull(),
  submittedBy: text('submitted_by').notNull()
});

export const maintenanceWorkOrders = sqliteTable('maintenance_work_orders', {
  id: text('id').primaryKey(),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull().default('normal'),
  status: text('status').notNull().default('open'),
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
  dueAt: text('due_at').notNull()
});

export const serializedParts = sqliteTable('serialized_parts', {
  id: text('id').primaryKey(),
  aircraftId: text('aircraft_id')
    .notNull()
    .references(() => aircraft.id),
  partNumber: text('part_number').notNull(),
  serialNumber: text('serial_number').notNull().unique(),
  description: text('description').notNull(),
  status: text('status').notNull().default('available'),
  installedAt: text('installed_at'),
  workOrderId: text('work_order_id').references(() => maintenanceWorkOrders.id)
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id),
  flightOrderId: text('flight_order_id')
    .notNull()
    .references(() => flightOrders.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  status: text('status').notNull().default('draft'),
  subtotal: real('subtotal').notNull(),
  tax: real('tax').notNull(),
  total: real('total').notNull(),
  currency: text('currency').notNull().default('IDR'),
  issuedAt: text('issued_at').notNull(),
  dueAt: text('due_at').notNull()
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('IDR'),
  paidAt: text('paid_at').notNull(),
  method: text('method').notNull(),
  reference: text('reference').notNull()
});

export const approvals = sqliteTable('approvals', {
  id: text('id').primaryKey(),
  domainEntity: text('domain_entity').notNull(),
  entityId: text('entity_id').notNull(),
  requestedBy: text('requested_by').notNull(),
  roleRequired: text('role_required').notNull(),
  status: text('status').$type<ApprovalStatus>().notNull().default('pending'),
  decidedBy: text('decided_by'),
  decidedAt: text('decided_at'),
  reason: text('reason'),
  createdAt: text('created_at').notNull()
});

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  severity: text('severity').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull()
});

export const refCurrencies = sqliteTable('ref_currencies', {
  id: text('id').primaryKey(),
  currencyCode: text('currency_code').notNull().unique(),
  currencyName: text('currency_name').notNull(),
  symbol: text('symbol').notNull(),
  decimalPlaces: integer('decimal_places').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refPaymentTerms = sqliteTable('ref_payment_terms', {
  id: text('id').primaryKey(),
  termCode: text('term_code').notNull().unique(),
  termName: text('term_name').notNull(),
  dueDays: integer('due_days').notNull(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refStations = sqliteTable('ref_stations', {
  id: text('id').primaryKey(),
  stationCode: text('station_code').notNull().unique(),
  stationName: text('station_name').notNull(),
  cityOrRegion: text('city_or_region').notNull(),
  province: text('province').notNull(),
  airportType: text('airport_type').notNull(),
  hasFuelService: integer('has_fuel_service', { mode: 'boolean' }).notNull().default(false),
  hasHandlingService: integer('has_handling_service', { mode: 'boolean' }).notNull().default(false),
  hasParkingService: integer('has_parking_service', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refChartOfAccounts = sqliteTable('ref_chart_of_accounts', {
  id: text('id').primaryKey(),
  accountCode: text('account_code').notNull().unique(),
  accountName: text('account_name').notNull(),
  accountType: text('account_type').notNull(),
  normalBalance: text('normal_balance').notNull(),
  parentAccountId: text('parent_account_id'),
  isPostable: integer('is_postable', { mode: 'boolean' }).notNull().default(true),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refCostCategories = sqliteTable('ref_cost_categories', {
  id: text('id').primaryKey(),
  categoryCode: text('category_code').notNull().unique(),
  categoryName: text('category_name').notNull(),
  costGroup: text('cost_group').notNull(),
  defaultCoaId: text('default_coa_id').references(() => refChartOfAccounts.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refAircraft = sqliteTable('ref_aircraft', {
  id: text('id').primaryKey(),
  registrationNumber: text('registration_number').notNull().unique(),
  aircraftType: text('aircraft_type').notNull(),
  manufacturer: text('manufacturer').notNull(),
  model: text('model').notNull(),
  passengerCapacity: integer('passenger_capacity').notNull(),
  cargoCapacityKg: integer('cargo_capacity_kg').notNull(),
  fuelType: text('fuel_type').notNull(),
  serviceabilityStatus: text('serviceability_status').notNull(),
  baseStationId: text('base_station_id').references(() => refStations.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refRoutes = sqliteTable(
  'ref_routes',
  {
    id: text('id').primaryKey(),
    routeCode: text('route_code').notNull().unique(),
    originStationId: text('origin_station_id')
      .notNull()
      .references(() => refStations.id),
    destinationStationId: text('destination_station_id')
      .notNull()
      .references(() => refStations.id),
    estimatedDurationMinutes: integer('estimated_duration_minutes').notNull(),
    distanceKm: integer('distance_km').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('ref_routes_origin_destination_unique').on(
      table.originStationId,
      table.destinationStationId
    )
  ]
);

export const refCrews = sqliteTable('ref_crews', {
  id: text('id').primaryKey(),
  employeeCode: text('employee_code').notNull().unique(),
  fullName: text('full_name').notNull(),
  crewRole: text('crew_role').notNull(),
  licenseType: text('license_type'),
  licenseNumber: text('license_number'),
  licenseExpiryDate: text('license_expiry_date'),
  medicalExpiryDate: text('medical_expiry_date'),
  baseStationId: text('base_station_id').references(() => refStations.id),
  unit: text('unit').notNull(),
  employmentStatus: text('employment_status').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refFlightReasons = sqliteTable('ref_flight_reasons', {
  id: text('id').primaryKey(),
  reasonCode: text('reason_code').notNull().unique(),
  reasonType: text('reason_type').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  requiresNote: integer('requires_note', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refCustomers = sqliteTable('ref_customers', {
  id: text('id').primaryKey(),
  accountCode: text('account_code').notNull().unique(),
  accountName: text('account_name').notNull(),
  accountType: text('account_type').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  billingAddress: text('billing_address'),
  paymentTermId: text('payment_term_id').references(() => refPaymentTerms.id),
  creditLimit: integer('credit_limit'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refAgents = sqliteTable('ref_agents', {
  id: text('id').primaryKey(),
  agentCode: text('agent_code').notNull().unique(),
  agentName: text('agent_name').notNull(),
  agentType: text('agent_type').notNull(),
  stationId: text('station_id').references(() => refStations.id),
  commissionBasisPoints: integer('commission_basis_points'),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refVendors = sqliteTable('ref_vendors', {
  id: text('id').primaryKey(),
  vendorCode: text('vendor_code').notNull().unique(),
  vendorName: text('vendor_name').notNull(),
  vendorType: text('vendor_type').notNull(),
  stationId: text('station_id').references(() => refStations.id),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  paymentTermId: text('payment_term_id').references(() => refPaymentTerms.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refFuelSuppliers = sqliteTable('ref_fuel_suppliers', {
  id: text('id').primaryKey(),
  supplierCode: text('supplier_code').notNull().unique(),
  supplierName: text('supplier_name').notNull(),
  stationId: text('station_id')
    .notNull()
    .references(() => refStations.id),
  fuelType: text('fuel_type').notNull(),
  referencePricePerLitre: integer('reference_price_per_litre').notNull(),
  currencyId: text('currency_id')
    .notNull()
    .references(() => refCurrencies.id),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refStationServiceSuppliers = sqliteTable('ref_station_service_suppliers', {
  id: text('id').primaryKey(),
  supplierCode: text('supplier_code').notNull().unique(),
  supplierName: text('supplier_name').notNull(),
  stationId: text('station_id')
    .notNull()
    .references(() => refStations.id),
  serviceType: text('service_type').notNull(),
  referenceRate: integer('reference_rate'),
  currencyId: text('currency_id').references(() => refCurrencies.id),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refRateCards = sqliteTable('ref_rate_cards', {
  id: text('id').primaryKey(),
  rateCode: text('rate_code').notNull().unique(),
  serviceType: text('service_type').notNull(),
  originStationId: text('origin_station_id')
    .notNull()
    .references(() => refStations.id),
  destinationStationId: text('destination_station_id')
    .notNull()
    .references(() => refStations.id),
  customerId: text('customer_id').references(() => refCustomers.id),
  aircraftType: text('aircraft_type'),
  currencyId: text('currency_id')
    .notNull()
    .references(() => refCurrencies.id),
  baseRate: integer('base_rate').notNull(),
  rateUnit: text('rate_unit').notNull(),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refTaxCodes = sqliteTable('ref_tax_codes', {
  id: text('id').primaryKey(),
  taxCode: text('tax_code').notNull().unique(),
  taxName: text('tax_name').notNull(),
  taxRateBasisPoints: integer('tax_rate_basis_points').notNull(),
  taxType: text('tax_type').notNull(),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const refDgCategories = sqliteTable('ref_dg_categories', {
  id: text('id').primaryKey(),
  dgCode: text('dg_code').notNull().unique(),
  dgClass: text('dg_class').notNull(),
  description: text('description').notNull(),
  handlingInstruction: text('handling_instruction').notNull(),
  requiresSpecialApproval: integer('requires_special_approval', { mode: 'boolean' })
    .notNull()
    .default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type AircraftRecord = typeof aircraft.$inferSelect;
export type StationRecord = typeof stations.$inferSelect;
export type RouteRecord = typeof routes.$inferSelect;
export type CustomerRecord = typeof customers.$inferSelect;
export type FlightOrderRecord = typeof flightOrders.$inferSelect;
export type ManifestRecord = typeof manifests.$inferSelect;
export type FuelRequestRecord = typeof fuelRequests.$inferSelect;
export type FuelUpliftRecord = typeof fuelUplifts.$inferSelect;
export type StationExpenseRecord = typeof stationExpenses.$inferSelect;
export type MaintenanceWorkOrderRecord = typeof maintenanceWorkOrders.$inferSelect;
export type SerializedPartRecord = typeof serializedParts.$inferSelect;
export type InvoiceRecord = typeof invoices.$inferSelect;
export type PaymentRecord = typeof payments.$inferSelect;
export type ApprovalRecord = typeof approvals.$inferSelect;
export type AlertRecord = typeof alerts.$inferSelect;
export type RefAircraftRecord = typeof refAircraft.$inferSelect;
export type RefStationRecord = typeof refStations.$inferSelect;
export type RefRouteRecord = typeof refRoutes.$inferSelect;
export type RefCrewRecord = typeof refCrews.$inferSelect;
export type RefFlightReasonRecord = typeof refFlightReasons.$inferSelect;
export type RefCustomerRecord = typeof refCustomers.$inferSelect;
export type RefAgentRecord = typeof refAgents.$inferSelect;
export type RefRateCardRecord = typeof refRateCards.$inferSelect;
export type RefVendorRecord = typeof refVendors.$inferSelect;
export type RefFuelSupplierRecord = typeof refFuelSuppliers.$inferSelect;
export type RefStationServiceSupplierRecord = typeof refStationServiceSuppliers.$inferSelect;
export type RefCostCategoryRecord = typeof refCostCategories.$inferSelect;
export type RefChartOfAccountRecord = typeof refChartOfAccounts.$inferSelect;
export type RefTaxCodeRecord = typeof refTaxCodes.$inferSelect;
export type RefPaymentTermRecord = typeof refPaymentTerms.$inferSelect;
export type RefCurrencyRecord = typeof refCurrencies.$inferSelect;
export type RefDgCategoryRecord = typeof refDgCategories.$inferSelect;

export const cargoBookings = sqliteTable('cargo_bookings', {
  id: text('id').primaryKey(), // AWB
  senderName: text('sender_name').notNull(),
  receiverName: text('receiver_name').notNull(),
  flightOrderId: text('flight_order_id')
    .notNull()
    .references(() => flightOrders.id),
  actualWeightKg: real('actual_weight_kg').notNull(),
  lengthCm: real('length_cm').notNull(),
  widthCm: real('width_cm').notNull(),
  heightCm: real('height_cm').notNull(),
  isDangerous: integer('is_dangerous', { mode: 'boolean' }).notNull().default(false),
  dgClass: text('dg_class'),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').notNull().default('UNPAID'),
  agentId: text('agent_id'),
  totalTariff: real('total_tariff').notNull(),
  status: text('status').notNull().default('BOOKED'),
  createdAt: text('created_at').notNull()
});

export type CargoBookingRecord = typeof cargoBookings.$inferSelect;
