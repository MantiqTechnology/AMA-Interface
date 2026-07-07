import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

describe('MasterDataService', () => {
  it('lists seeded master data through module slugs', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const aircraft = services.masterData.list('aircraft', {
      active: 'active',
      search: 'PK-AMA'
    });
    expect(aircraft.rows[0]?.serviceability_status).toBe('SERVICEABLE');

    const routes = services.masterData.list('routes', {
      active: 'active',
      search: 'DJJ-WMX'
    });
    expect(routes.rows[0]?.route_code).toBe('DJJ-WMX');

    const rateCards = services.masterData.list('rates', {
      active: 'active',
      search: 'CHARTER_DJJ_WMX'
    });
    expect(rateCards.rows[0]?.customer_id).toBe('ref-cust-papua-logistics');

    sqlite.close();
  });

  it('keeps entity-specific validation in the new master data services', async () => {
    const { services, sqlite } = await createSeededTestServices();

    expect(() =>
      services.masterData.create('routes', {
        route_code: 'DJJ-DJJ',
        origin_station_id: 'ref-st-djj',
        destination_station_id: 'ref-st-djj',
        estimated_duration_minutes: 15,
        distance_km: 10
      })
    ).toThrow('Origin and destination cannot be the same');

    expect(() =>
      services.masterData.create('personnel', {
        employee_code: 'AMA-COP-999',
        full_name: 'Missing License Demo',
        crew_role: 'CO_PILOT',
        license_type: null,
        license_number: null,
        license_expiry_date: null,
        medical_expiry_date: null,
        base_station_id: 'ref-st-djj',
        unit: 'Flight Operations',
        employment_status: 'CONTRACT'
      })
    ).toThrow('Pilot and co-pilot records require license and medical expiry data');

    sqlite.close();
  });
});
