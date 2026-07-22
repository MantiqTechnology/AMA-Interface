import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { createDbClient } from '../../server/db/client';
import { RoutesRepository } from '../../server/features/operations/routes/repository';
import { RoutesService } from '../../server/features/operations/routes/service';
import { StationsRepository } from '../../server/features/operations/stations/repository';
import { StationsService } from '../../server/features/operations/stations/service';
import { createSeededMasterDataDb } from '../helpers/master-data-db';
import { seedFlightOperationsData } from '../../server/db/seed-flight-operations';

const routeInputDefaults = {
  operationalNotes: null,
  restrictionLevel: 'NONE' as const,
  restrictionNote: null
};

describe('operations master data services', () => {
  let client: ReturnType<typeof createDbClient>;
  let routes: RoutesService;
  let stations: StationsService;
  let stationsRepository: StationsRepository;

  beforeEach(async () => {
    client = await createSeededMasterDataDb();
    seedFlightOperationsData(client.sqlite);
    stationsRepository = new StationsRepository(client.db);
    const routesRepository = new RoutesRepository(client.db);
    routes = new RoutesService(
      routesRepository,
      stationsRepository,
      () => new Date('2026-07-17T00:00:00.000Z')
    );
    stations = new StationsService(stationsRepository, routesRepository);
  });

  afterEach(() => client.sqlite.close());

  it('owns route search, status, station validation, and duplicate codes', async () => {
    const active = await routes.list({ active: 'active', search: 'DJJ-WMX' });
    expect(active).toHaveLength(1);
    await expect(stations.setActive('st-djj', false)).rejects.toMatchObject({
      code: 'STATION_HAS_ACTIVE_ROUTES'
    });

    await routes.setActive(active[0]!.id, false);
    const inactive = await routes.list({ active: 'inactive', search: 'DJJ-WMX' });
    expect(inactive).toHaveLength(1);

    await expect(
      routes.create({
        ...routeInputDefaults,
        routeCode: 'SAME-STATION',
        originStationId: 'st-djj',
        destinationStationId: 'st-djj',
        estimatedDurationMinutes: 20,
        distanceKm: 50
      })
    ).rejects.toMatchObject({ code: 'ROUTE_STATIONS_MUST_DIFFER' });

    await stationsRepository.setActive('st-oks', false, new Date().toISOString());
    await expect(
      routes.create({
        ...routeInputDefaults,
        routeCode: 'INACTIVE-ORIGIN',
        originStationId: 'st-oks',
        destinationStationId: 'st-mkq',
        estimatedDurationMinutes: 90,
        distanceKm: 400
      })
    ).rejects.toMatchObject({ code: 'ROUTE_ORIGIN_INVALID' });

    await expect(
      routes.create({
        ...routeInputDefaults,
        routeCode: 'DJJ-TIM',
        originStationId: 'st-nbx',
        destinationStationId: 'st-tim',
        estimatedDurationMinutes: 90,
        distanceKm: 400
      })
    ).rejects.toMatchObject({ code: 'ROUTE_CODE_DUPLICATE' });
  });

  it('builds a deterministic operational profile from owned feature data', async () => {
    const profile = await routes.getOperationalProfile('route-djj-nbx');

    expect(profile).toMatchObject({
      origin: { stationCode: 'DJJ', isActive: true },
      destination: { stationCode: 'NBX', isActive: true },
      timezone: { code: 'WIT', ianaName: 'Asia/Jayapura' },
      readiness: { status: 'AVAILABLE', availableForScheduling: true },
      metrics: { activeTemplateCount: 1, compatibleAircraftCount: 1 },
      reverseRoute: null
    });
    expect(profile.readiness.warnings).toContain(
      'Fuel service is not available at NBX; dispatch must confirm round-trip fuel planning before release.'
    );
    expect(profile.scheduleTemplates[0]).toMatchObject({
      templateCode: 'SCH_DJJ_NBX_MON_THU',
      operatingDays: ['MON', 'THU'],
      defaultAircraftRegistration: 'PK-AMB'
    });
    expect(profile.compatibleAircraft[0]).toMatchObject({
      profileCode: 'CAP_C208_DJJ_NBX_PAX',
      registrationNumber: 'PK-AMB'
    });
    expect(profile.availableServices.map((service) => service.serviceTypeLabel)).toEqual(
      expect.arrayContaining(['Cargo', 'Scheduled Passenger'])
    );
    expect(profile.upcomingFlights).toHaveLength(1);
    expect(profile.upcomingFlights[0]).toMatchObject({
      flightNumber: 'AMA-20260720-009',
      status: 'SCHEDULED'
    });
  });

  it('distinguishes incomplete configuration from blocking readiness failures', async () => {
    const incomplete = await routes.getOperationalProfile('route-djj-tim');
    expect(incomplete.readiness).toMatchObject({
      status: 'NEEDS_CONFIGURATION',
      availableForScheduling: true
    });

    const existing = await routes.get('route-djj-tim');
    await routes.update(existing.id, {
      ...existing,
      restrictionLevel: 'BLOCKING',
      restrictionNote: 'Route closed for operational review.'
    });
    const blocked = await routes.getOperationalProfile(existing.id);
    expect(blocked.readiness).toMatchObject({
      status: 'NOT_AVAILABLE',
      availableForScheduling: false
    });
    expect(blocked.readiness.blockers).toContain('Route closed for operational review.');
  });

  it('fails readiness for an inactive station and rejects zero dimensions', async () => {
    await stationsRepository.setActive('st-nbx', false, '2026-07-17T00:00:00.000Z');
    const profile = await routes.getOperationalProfile('route-djj-nbx');
    expect(profile.readiness.status).toBe('NOT_AVAILABLE');
    expect(profile.readiness.blockers).toContain('Destination station is missing or inactive.');

    await expect(
      routes.create({
        ...routeInputDefaults,
        routeCode: 'ZERO-DISTANCE',
        originStationId: 'st-djj',
        destinationStationId: 'st-mkq',
        estimatedDurationMinutes: 20,
        distanceKm: 0
      })
    ).rejects.toMatchObject({ code: 'ROUTE_DISTANCE_DURATION_INVALID' });
  });
});
