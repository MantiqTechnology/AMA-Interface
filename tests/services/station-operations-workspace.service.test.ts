import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

const admin = {
  userId: 'USR-ADMIN',
  role: 'Demo Admin',
  stationCodes: ['ALL']
};

describe('station operations flight workspace', () => {
  it('returns one persistent flight aggregate with tasks, evidence, costs, services and audit', async () => {
    const { services, sqlite } = await createSeededTestServices();
    services.flightOperations.evaluate('fop-checkin-open', admin.userId);

    const result = await services.flightOperations.getStationOperations(
      { flightId: 'fop-checkin-open' },
      admin
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      flightId: 'fop-checkin-open',
      originStationCode: 'DJJ',
      destinationStationCode: 'WMX'
    });
    expect(result[0].tasks.length).toBeGreaterThan(0);
    expect(Array.isArray(result[0].services)).toBe(true);
    expect(Array.isArray(result[0].costs)).toBe(true);
    expect(Array.isArray(result[0].evidence)).toBe(true);
    expect(Array.isArray(result[0].audit)).toBe(true);
    expect(result[0]).toHaveProperty('reconciliation');

    sqlite.close();
  });

  it('enforces station scope before returning the workspace', async () => {
    const { services, sqlite } = await createSeededTestServices();

    await expect(
      services.flightOperations.getStationOperations(
        { flightId: 'fop-checkin-open', stationCode: 'DJJ' },
        { ...admin, role: 'Station Admin', stationCodes: ['TIM'] }
      )
    ).rejects.toThrow(/cannot access Station Operations/);

    sqlite.close();
  });

  it('does not expose opposite-station audit entries in a scoped workspace', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO flight_operational_audit (
           id, actor_user_id, actor_role, flight_id, station_id, module, action,
           reason, timestamp, created_at
         ) VALUES
           ('audit-origin-visible', 'USR-STATION-ADMIN', 'Station Admin',
            'fop-checkin-open', 'st-djj', 'STATION_TASK', 'VISIBLE', 'origin only', ?, ?),
           ('audit-destination-hidden', 'USR-STATION-ADMIN', 'Station Admin',
            'fop-checkin-open', 'st-wmx', 'STATION_TASK', 'HIDDEN', 'destination only', ?, ?)`
      )
      .run(now, now, now, now);

    const [result] = await services.flightOperations.getStationOperations(
      { flightId: 'fop-checkin-open', stationCode: 'DJJ' },
      { ...admin, role: 'Station Admin', stationCodes: ['DJJ'] }
    );
    expect(result.audit.map((entry: { action: string }) => entry.action)).toContain('VISIBLE');
    expect(result.audit.map((entry: { action: string }) => entry.action)).not.toContain('HIDDEN');

    sqlite.close();
  });

  it('reserves actual reconciliation for destination station scope', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const flight = services.flightOperations.detail('fop-landed-maintenance');

    await expect(
      services.flightOperations.reconcileFlightActuals(
        {
          flightId: flight.id,
          plannedPassengers: 0,
          actualPassengers: 0,
          plannedCargoKg: 0,
          actualCargoKg: 0,
          expectedVersion: 0
        },
        {
          ...admin,
          role: 'Station Admin',
          stationCodes: [flight.originStationCode]
        }
      )
    ).rejects.toThrow(/cannot perform this action/);

    sqlite.close();
  });
});
