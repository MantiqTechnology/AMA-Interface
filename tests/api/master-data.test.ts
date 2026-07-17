import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ApiResponse } from '../../shared/contracts/api';
import { createDbClient, resolveDbPath } from '../../server/db/client';
import { dropDemoDatabase, runMigrations } from '../../server/db/migrate';
import { seedDemoData } from '../../server/db/seed';

process.env.DEMO_MODE = 'true';
process.env.AMA_DB_PATH = './data/test-master-data-api.sqlite';

beforeAll(async () => {
  const resolved = resolveDbPath(process.env.AMA_DB_PATH);
  await rm(resolved, { force: true });
  await rm(`${resolved}-wal`, { force: true });
  await rm(`${resolved}-shm`, { force: true });

  const { db, sqlite } = createDbClient(process.env.AMA_DB_PATH);
  dropDemoDatabase(sqlite);
  runMigrations(sqlite);
  await seedDemoData(db);
  sqlite.close();
});

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: true,
  browser: false,
  setupTimeout: 300_000
});

let sequence = 0;

const features = [
  ['aircraft', 'aircraft', 'registrationNumber'],
  ['stations', 'stations', 'stationCode'],
  ['routes', 'routes', 'routeCode'],
  ['flight_schedule_templates', 'flight-schedule-templates', 'templateCode'],
  ['flight_capacity_profiles', 'flight-capacity-profiles', 'profileCode'],
  ['crew', 'personnel', 'employeeCode'],
  ['flight_reasons', 'flight-reasons', 'reasonCode'],
  ['customers', 'customers', 'accountCode'],
  ['agents', 'agents', 'agentCode'],
  ['rate_cards', 'rates', 'rateCode'],
  ['vendors', 'vendors', 'vendorCode'],
  ['fuel_suppliers', 'fuel-suppliers', 'supplierCode'],
  ['handling_parking_suppliers', 'handling-parking-suppliers', 'supplierCode'],
  ['cost_categories', 'cost-categories', 'categoryCode'],
  ['chart_of_accounts', 'chart-of-accounts', 'accountCode'],
  ['tax_codes', 'tax-codes', 'taxCode'],
  ['payment_terms', 'payment-terms', 'termCode'],
  ['currencies', 'currencies', 'currencyCode'],
  ['dg_categories', 'dg-categories', 'dgCode']
] as const;

type PayloadValue = string | string[] | number | boolean | null;

function nextCode(prefix: string) {
  sequence += 1;
  return `${prefix}_${sequence.toString().padStart(3, '0')}`;
}

function payloadFor(key: string): Record<string, PayloadValue> {
  switch (key) {
    case 'aircraft':
      return {
        registration_number: `PK-T${nextCode('A').slice(-2)}`,
        aircraft_type: 'Pilatus PC-6',
        manufacturer: 'Pilatus',
        model: 'PC-6 API Test',
        passenger_capacity: 8,
        cargo_capacity_kg: 800,
        fuel_type: 'AVTUR',
        operational_status: 'ACTIVE',
        serviceability_status: 'SERVICEABLE',
        base_station_id: 'st-djj',
        current_station_id: 'st-djj',
        default_capacity_profile_id: null,
        last_maintenance_check_at: null,
        next_maintenance_due_at: null,
        serviceability_note: null
      };
    case 'stations':
      return {
        station_code: nextCode('STN'),
        station_name: 'API Test Station',
        city_or_region: 'Jayapura',
        province: 'Papua',
        airport_type: 'AIRPORT',
        station_pic_name: null,
        station_pic_phone: null,
        operational_notes: null,
        is_remote_station: false,
        low_connectivity_mode: false,
        has_fuel_service: true,
        has_handling_service: true,
        has_parking_service: false
      };
    case 'routes':
      return {
        route_code: nextCode('RTE'),
        origin_station_id: 'st-oks',
        destination_station_id: 'st-mkq',
        estimated_duration_minutes: 95,
        distance_km: 420
      };
    case 'flight_schedule_templates':
      return {
        template_code: nextCode('SCH'),
        route_id: 'route-djj-tim',
        service_type_id: 'flight-service-type-scheduled-passenger',
        default_aircraft_id: 'ac-pk-ama',
        operating_days: ['TUE', 'THU'],
        departure_time_local: '08:00',
        arrival_time_local: '09:30',
        booking_open_hours_before: 72,
        booking_close_minutes_before: 60,
        schedule_note: null
      };
    case 'flight_capacity_profiles':
      return {
        profile_code: nextCode('CAP'),
        profile_name: 'API Test Capacity Profile',
        aircraft_id: 'ac-pk-ama',
        route_id: 'route-djj-wmx',
        service_type_id: 'flight-service-type-charter-cargo',
        seat_capacity: 8,
        cargo_capacity_kg: 250,
        reserved_seat_count: 1,
        reserved_cargo_kg: 50,
        capacity_note: null
      };
    case 'crew':
      return {
        employee_code: nextCode('CREW'),
        full_name: 'API Test Ground Crew',
        crew_role: 'GROUND_CREW',
        license_type: null,
        license_number: null,
        license_expiry_date: null,
        medical_expiry_date: null,
        base_station_id: 'st-djj',
        availability_status: 'AVAILABLE',
        duty_station_id: 'st-djj',
        readiness_note: null,
        unit: 'Flight Operations',
        employment_status: 'CONTRACT'
      };
    case 'flight_reasons':
      return {
        reason_code: nextCode('RSN'),
        reason_name: 'API Test Reason',
        reason_type: 'DELAY',
        category: 'Operations',
        description: 'Created by API test.',
        requires_note: false,
        affects_operational_kpi: true,
        affects_finance_review: false,
        dashboard_severity: 'WARNING'
      };
    case 'customers':
      return {
        account_type: 'INDIVIDUAL',
        account_code: nextCode('CUST'),
        account_name: 'API Test Customer',
        contact_person: null,
        phone: null,
        email: 'customer@example.com',
        billing_address: null,
        payment_term_id: 'term-cod',
        credit_limit: 0
      };
    case 'agents':
      return {
        agent_code: nextCode('AGT'),
        agent_name: 'API Test Agent',
        agent_type: 'TICKET_AGENT',
        station_id: null,
        commission_basis_points: null,
        contact_person: null,
        phone: null
      };
    case 'rate_cards':
      return {
        rate_code: nextCode('RATE'),
        service_type: 'CHARTER',
        origin_station_id: 'st-oks',
        destination_station_id: 'st-mkq',
        customer_id: null,
        aircraft_type: null,
        currency_id: 'cur-idr',
        tax_code_id: 'tax-ppn-demo',
        base_rate: 100_000,
        rate_unit: 'PER_FLIGHT',
        pricing_scope: 'PUBLIC_COUNTER',
        booking_channel: 'COUNTER',
        passenger_type: null,
        cargo_price_basis: null,
        rate_priority: 100,
        minimum_charge: null,
        demo_usage_note: null,
        effective_from: '2026-07-13',
        effective_to: null
      };
    case 'vendors':
      return {
        vendor_code: nextCode('VEN'),
        vendor_name: 'API Test Vendor',
        vendor_type: 'GENERAL',
        station_id: 'st-djj',
        contact_person: null,
        phone: null,
        email: 'vendor@example.com',
        payment_term_id: 'term-net-14'
      };
    case 'fuel_suppliers':
      return {
        supplier_code: nextCode('FUEL'),
        supplier_name: 'API Test Fuel Supplier',
        station_id: 'st-djj',
        fuel_type: 'AVTUR',
        reference_price_per_litre: 10_000,
        currency_id: 'cur-idr',
        contact_person: null,
        phone: null
      };
    case 'handling_parking_suppliers':
      return {
        supplier_code: nextCode('HND'),
        supplier_name: 'API Test Handling Supplier',
        station_id: 'st-djj',
        service_type: 'HANDLING',
        reference_rate: 100_000,
        currency_id: 'cur-idr',
        contact_person: null,
        phone: null
      };
    case 'cost_categories':
      return {
        category_code: nextCode('COST'),
        category_name: 'API Test Cost Category',
        cost_group: 'OPERATIONS',
        default_coa_id: 'coa-5100'
      };
    case 'chart_of_accounts':
      return {
        account_code: nextCode('COA'),
        account_name: 'API Test Account',
        account_type: 'EXPENSE',
        normal_balance: 'DEBIT',
        parent_account_id: null,
        is_postable: true
      };
    case 'tax_codes':
      return {
        tax_code: nextCode('TAX'),
        tax_name: 'API Test Tax',
        tax_rate_basis_points: 1_100,
        tax_type: 'VAT',
        effective_from: '2026-07-13',
        effective_to: null
      };
    case 'payment_terms':
      return {
        term_code: nextCode('TERM'),
        term_name: 'API Test Payment Term',
        due_days: 14,
        description: null
      };
    case 'currencies':
      return {
        currency_code: `X${sequence.toString().padStart(2, '0')}`,
        currency_name: 'API Test Currency',
        symbol: 'X',
        decimal_places: 0
      };
    case 'dg_categories':
      return {
        dg_code: nextCode('DG'),
        dg_class: 'Class 9',
        description: 'API test DG category.',
        handling_instruction: 'Demo handling only.',
        requires_special_approval: false
      };
    default:
      throw new Error(`Missing API payload fixture for ${key}`);
  }
}

function camelPayload(body: Record<string, PayloadValue>) {
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key.replace(/_([a-z])/gu, (_, letter: string) => letter.toUpperCase()),
      value
    ])
  );
}

async function postMasterData(slug: string, body: Record<string, PayloadValue>) {
  return $fetch<ApiResponse<Record<string, unknown>>>(`/api/master-data/${slug}`, {
    method: 'POST',
    body: camelPayload(body)
  });
}

describe('master data POST endpoints', () => {
  it.each(features)('creates %s records through the API envelope', async (key, slug, codeField) => {
    const body = payloadFor(key);

    const response = await postMasterData(slug, body);

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.error.message);
    expect(response.data.id).toBeTruthy();
    expect(response.data[codeField]).toBe(camelPayload(body)[codeField]);
    expect(response.meta?.demoMode).toBe(true);

    const id = String(response.data.id);
    const detail = await $fetch<ApiResponse<Record<string, unknown>>>(
      `/api/master-data/${slug}/${id}`
    );
    expect(detail.ok && detail.data.id).toBe(id);

    const options = await $fetch<ApiResponse<Array<Record<string, unknown>>>>(
      `/api/master-data/${slug}/options`
    );
    expect(options.ok).toBe(true);
    if (!options.ok) throw new Error(options.error.message);
    expect(options.data).toContainEqual(expect.objectContaining({ id }));

    const updated = await $fetch<ApiResponse<Record<string, unknown>>>(
      `/api/master-data/${slug}/${id}`,
      { method: 'PUT', body: camelPayload(body) }
    );
    expect(updated.ok && updated.data.id).toBe(id);

    const status = await $fetch<ApiResponse<Record<string, unknown>>>(
      `/api/master-data/${slug}/${id}/status`,
      { method: 'PATCH', body: { isActive: false } }
    );
    expect(status.ok && status.data.isActive).toBe(false);

    const list = await $fetch<ApiResponse<Array<Record<string, unknown>>>>(
      `/api/master-data/${slug}`,
      { query: { active: 'all', search: String(camelPayload(body)[codeField]) } }
    );
    expect(list.ok).toBe(true);
    if (!list.ok) throw new Error(list.error.message);
    expect(list.data).toContainEqual(expect.objectContaining({ id, isActive: false }));
  });

  it('returns the flight-capacity-profiles business validation message for 422 responses', async () => {
    await expect(
      postMasterData('flight-capacity-profiles', {
        ...payloadFor('flight_capacity_profiles'),
        profile_code: nextCode('BAD_CAP'),
        service_type_id: 'flight-service-type-positioning',
        seat_capacity: 99
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      data: {
        error: {
          code: 'CAPACITY_PROFILE_SEATS_EXCEED_AIRCRAFT',
          message: 'Seat capacity cannot exceed aircraft passenger capacity.'
        }
      }
    });
  });

  it('normalizes cleared optional fields to null before persistence', async () => {
    const customer = await postMasterData('customers', {
      ...payloadFor('customers'),
      account_code: nextCode('CUST_EMPTY'),
      contact_person: '',
      phone: '   ',
      email: '',
      billing_address: '',
      payment_term_id: '',
      credit_limit: ''
    });
    expect(customer.ok).toBe(true);
    if (!customer.ok) throw new Error(customer.error.message);
    expect(customer.data).toMatchObject({
      contactPerson: null,
      phone: null,
      email: null,
      billingAddress: null,
      paymentTermId: null,
      creditLimit: null
    });

    const aircraft = await postMasterData('aircraft', {
      ...payloadFor('aircraft'),
      registration_number: `PK-E${sequence.toString().padStart(2, '0')}`,
      serial_number: '',
      fleet_code: '',
      default_capacity_profile_id: '',
      base_station_id: '',
      current_station_id: '',
      last_maintenance_check_at: '',
      next_maintenance_due_at: '',
      serviceability_note: ''
    });
    expect(aircraft.ok).toBe(true);
    if (!aircraft.ok) throw new Error(aircraft.error.message);
    expect(aircraft.data).toMatchObject({
      serialNumber: null,
      fleetCode: null,
      defaultCapacityProfileId: null,
      baseStationId: null,
      currentStationId: null,
      lastMaintenanceCheckAt: null,
      nextMaintenanceDueAt: null,
      serviceabilityNote: null
    });

    const supplier = await postMasterData('handling-parking-suppliers', {
      ...payloadFor('handling_parking_suppliers'),
      supplier_code: nextCode('HND_EMPTY'),
      reference_rate: '',
      currency_id: '',
      contact_person: '',
      phone: ''
    });
    expect(supplier.ok).toBe(true);
    if (!supplier.ok) throw new Error(supplier.error.message);
    expect(supplier.data).toMatchObject({
      referenceRate: null,
      currencyId: null,
      contactPerson: null,
      phone: null
    });
  });
});
