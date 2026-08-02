import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

describe('AircraftTrackingService', () => {
  it('keeps one current position per aircraft while retaining position history', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = sqlite
      .prepare(
        "SELECT COUNT(*) AS count FROM aircraft_position_reports WHERE aircraft_id = 'ac-pk-amb'"
      )
      .get() as { count: number };

    const first = services.aircraftTracking.advanceDemoPosition('fop-in-progress', 'USR-001');
    const second = services.aircraftTracking.advanceDemoPosition('fop-in-progress', 'USR-001');
    const currentCount = sqlite
      .prepare(
        "SELECT COUNT(*) AS count FROM aircraft_current_positions WHERE aircraft_id = 'ac-pk-amb'"
      )
      .get() as { count: number };
    const after = sqlite
      .prepare(
        "SELECT COUNT(*) AS count FROM aircraft_position_reports WHERE aircraft_id = 'ac-pk-amb'"
      )
      .get() as { count: number };

    expect(currentCount.count).toBe(1);
    expect(after.count).toBe(before.count + 2);
    expect(second.version).toBe(first.version + 1);
    expect(second.progressPercent).toBeGreaterThan(first.progressPercent ?? 0);

    sqlite.close();
  });

  it('rejects stale optimistic versions and airborne reports for inactive flights', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const initial = services.operationsMonitoring
      .flightFollowing({})
      .find((flight) => flight.id === 'fop-in-progress')?.position;
    expect(initial).not.toBeNull();

    services.aircraftTracking.reportForFlight(
      'fop-in-progress',
      {
        latitude: -4.5,
        longitude: 139.5,
        positionStatus: 'AIRBORNE',
        expectedVersion: initial!.version
      },
      'USR-001'
    );

    expect(() =>
      services.aircraftTracking.reportForFlight(
        'fop-in-progress',
        {
          latitude: -4.55,
          longitude: 139.55,
          positionStatus: 'AIRBORNE',
          expectedVersion: initial!.version
        },
        'USR-001'
      )
    ).toThrowError(/changed since it was loaded/i);

    expect(() =>
      services.aircraftTracking.reportForFlight(
        'fop-ticketing-passenger',
        {
          latitude: -3,
          longitude: 140,
          positionStatus: 'AIRBORNE'
        },
        'USR-001'
      )
    ).toThrowError(/in-progress flight/i);

    sqlite.close();
  });

  it('exposes current coordinates and route progress in flight following', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flight = services.operationsMonitoring
      .flightFollowing({})
      .find((item) => item.id === 'fop-in-progress');

    expect(flight).toMatchObject({
      aircraftId: 'ac-pk-amb',
      originCode: 'WMX',
      destinationCode: 'OKS',
      position: {
        latitude: -4.435,
        longitude: 139.355,
        positionStatus: 'AIRBORNE',
        version: 2
      }
    });
    expect(flight?.position?.progressPercent).toBeGreaterThan(0);
    expect(flight?.position?.progressPercent).toBeLessThan(100);

    sqlite.close();
  });
});
