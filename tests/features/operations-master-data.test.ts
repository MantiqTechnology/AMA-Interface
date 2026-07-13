import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { createDbClient } from '../../server/db/client';
import { RoutesRepository } from '../../server/features/operations/routes/repository';
import { RoutesService } from '../../server/features/operations/routes/service';
import { StationsRepository } from '../../server/features/operations/stations/repository';
import { StationsService } from '../../server/features/operations/stations/service';
import { createSeededMasterDataDb } from '../helpers/master-data-db';

describe('operations master data services', () => {
  let client: ReturnType<typeof createDbClient>;
  let routes: RoutesService;
  let stations: StationsService;
  let stationsRepository: StationsRepository;

  beforeEach(async () => {
    client = await createSeededMasterDataDb();
    stationsRepository = new StationsRepository(client.db);
    const routesRepository = new RoutesRepository(client.db);
    routes = new RoutesService(routesRepository, stationsRepository);
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
        routeCode: 'INACTIVE-ORIGIN',
        originStationId: 'st-oks',
        destinationStationId: 'st-mkq',
        estimatedDurationMinutes: 90,
        distanceKm: 400
      })
    ).rejects.toMatchObject({ code: 'ROUTE_ORIGIN_INVALID' });

    await expect(
      routes.create({
        routeCode: 'DJJ-TIM',
        originStationId: 'st-mkq',
        destinationStationId: 'st-wmx',
        estimatedDurationMinutes: 90,
        distanceKm: 400
      })
    ).rejects.toMatchObject({ code: 'ROUTE_CODE_DUPLICATE' });
  });
});
