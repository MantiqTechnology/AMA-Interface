import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ApiResponse } from '../../shared/contracts/api';
import type { AircraftDto, AircraftOption } from '../../shared/features/operations/aircraft';
import type { FlightCapacityProfileOption } from '../../shared/features/operations/flight-capacity-profiles';
import type {
  FlightScheduleTemplateDto,
  FlightScheduleTemplateOption
} from '../../shared/features/operations/flight-schedule-templates';
import type { PersonnelOption } from '../../shared/features/operations/personnel';
import type {
  RouteDto,
  RouteOperationalProfileDto,
  RouteOption
} from '../../shared/features/operations/routes';
import type { StationDto, StationOption } from '../../shared/features/operations/stations';
import { createDbClient, resolveDbPath } from '../../server/db/client';
import { dropDemoDatabase, runMigrations } from '../../server/db/migrate';
import { seedDemoData } from '../../server/db/seed';

process.env.DEMO_MODE = 'true';
process.env.AMA_DB_PATH = './data/test-operations-master-data.sqlite';

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

describe('operations master data APIs', () => {
  it('owns the station list and options response', async () => {
    const list = await $fetch<ApiResponse<StationDto[]>>('/api/master-data/stations');
    expect(list.ok).toBe(true);
    if (!list.ok) throw new Error(list.error.message);
    expect(list.data[0]).toMatchObject({ stationCode: expect.any(String), isActive: true });
    expect(list.data[0]).not.toHaveProperty('station_code');

    const options = await $fetch<ApiResponse<StationOption[]>>('/api/master-data/stations/options');
    expect(options.ok).toBe(true);
    if (!options.ok) throw new Error(options.error.message);
    expect(options.data[0]).toMatchObject({
      id: expect.any(String),
      stationCode: expect.any(String),
      stationName: expect.any(String)
    });
  });

  it('creates, reads, updates, lists, deactivates, and provides route options', async () => {
    const created = await $fetch<ApiResponse<RouteDto>>('/api/master-data/routes', {
      method: 'POST',
      body: {
        routeCode: 'API-DJJ-MKQ',
        originStationId: 'st-djj',
        destinationStationId: 'st-mkq',
        estimatedDurationMinutes: 75,
        distanceKm: 380
      }
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error.message);

    const detail = await $fetch<ApiResponse<RouteDto>>(
      `/api/master-data/routes/${created.data.id}`
    );
    expect(detail.ok && detail.data.routeCode).toBe('API-DJJ-MKQ');

    const updated = await $fetch<ApiResponse<RouteDto>>(
      `/api/master-data/routes/${created.data.id}`,
      {
        method: 'PUT',
        body: {
          routeCode: 'API-DJJ-MKQ-2',
          originStationId: 'st-djj',
          destinationStationId: 'st-mkq',
          estimatedDurationMinutes: 80,
          distanceKm: 390
        }
      }
    );
    expect(updated.ok && updated.data.estimatedDurationMinutes).toBe(80);

    const list = await $fetch<ApiResponse<RouteDto[]>>('/api/master-data/routes', {
      query: { active: 'all', search: 'API-DJJ-MKQ-2' }
    });
    expect(list.ok && list.data).toHaveLength(1);

    const options = await $fetch<ApiResponse<RouteOption[]>>('/api/master-data/routes/options');
    expect(options.ok).toBe(true);
    if (!options.ok) throw new Error(options.error.message);
    expect(options.data).toContainEqual(
      expect.objectContaining({
        id: created.data.id,
        routeCode: 'API-DJJ-MKQ-2',
        originStationId: 'st-djj',
        destinationStationId: 'st-mkq',
        originStationCode: 'DJJ',
        destinationStationCode: 'MKQ'
      })
    );

    const status = await $fetch<ApiResponse<RouteDto>>(
      `/api/master-data/routes/${created.data.id}/status`,
      { method: 'PATCH', body: { isActive: false } }
    );
    expect(status.ok && status.data.isActive).toBe(false);
  });

  it('exposes workflow metadata through each owning feature options API', async () => {
    const [aircraft, personnel, schedules, capacities] = await Promise.all([
      $fetch<ApiResponse<AircraftOption[]>>('/api/master-data/aircraft/options'),
      $fetch<ApiResponse<PersonnelOption[]>>('/api/master-data/personnel/options'),
      $fetch<ApiResponse<FlightScheduleTemplateOption[]>>(
        '/api/master-data/flight-schedule-templates/options'
      ),
      $fetch<ApiResponse<FlightCapacityProfileOption[]>>(
        '/api/master-data/flight-capacity-profiles/options'
      )
    ]);

    if (!aircraft.ok || !personnel.ok || !schedules.ok || !capacities.ok) {
      throw new Error('Unable to load feature-owned workflow options.');
    }
    expect(aircraft.data).toContainEqual(
      expect.objectContaining({
        id: 'ac-pk-ama',
        registrationNumber: 'PK-AMA',
        passengerCapacity: expect.any(Number),
        cargoCapacityKg: expect.any(Number),
        serviceabilityStatus: expect.any(String)
      })
    );
    expect(personnel.data).toContainEqual(
      expect.objectContaining({
        id: 'crew-pic-valid',
        fullName: expect.any(String),
        crewRole: 'PILOT_IN_COMMAND',
        availabilityStatus: expect.any(String)
      })
    );
    expect(schedules.data).toContainEqual(
      expect.objectContaining({
        id: 'schedule-djj-wmx-mwf',
        routeId: 'route-djj-wmx',
        operatingDays: expect.any(Array),
        departureTimeLocal: expect.any(String)
      })
    );
    expect(capacities.data).toContainEqual(
      expect.objectContaining({
        id: 'cap-pilatus-djj-wmx-pax',
        aircraftId: 'ac-pk-ama',
        routeId: 'route-djj-wmx',
        seatCapacity: expect.any(Number)
      })
    );
  });

  it('returns the enriched DJJ-NBX profile and filters schedule templates by route', async () => {
    const profile = await $fetch<ApiResponse<RouteOperationalProfileDto>>(
      '/api/master-data/routes/route-djj-nbx/operational-profile'
    );
    expect(profile.ok).toBe(true);
    if (!profile.ok) throw new Error(profile.error.message);
    expect(profile.data).toMatchObject({
      route: { routeCode: 'DJJ-NBX', restrictionLevel: 'ADVISORY' },
      origin: { stationCode: 'DJJ' },
      destination: { stationCode: 'NBX' },
      readiness: { status: 'AVAILABLE', availableForScheduling: true },
      metrics: { activeTemplateCount: 1, compatibleAircraftCount: 1 },
      reverseRoute: null
    });
    expect(profile.data.upcomingFlights).toHaveLength(1);
    expect(profile.data.upcomingFlights[0]?.flightNumber).toBe('AMA-20260720-009');
    expect(profile.data.availableServices.map((service) => service.serviceTypeLabel)).toEqual(
      expect.arrayContaining(['Cargo', 'Scheduled Passenger'])
    );

    const schedules = await $fetch<ApiResponse<FlightScheduleTemplateDto[]>>(
      '/api/master-data/flight-schedule-templates',
      { query: { active: 'all', routeId: 'route-djj-nbx' } }
    );
    expect(schedules.ok).toBe(true);
    if (!schedules.ok) throw new Error(schedules.error.message);
    expect(schedules.data).toHaveLength(1);
    expect(schedules.data[0]?.templateCode).toBe('SCH_DJJ_NBX_MON_THU');
  });

  it('enforces route read and manage permissions on the server', async () => {
    const allowed = await $fetch<ApiResponse<RouteOperationalProfileDto>>(
      '/api/master-data/routes/route-djj-nbx/operational-profile',
      { headers: { cookie: 'ama_demo_role=OCC' } }
    );
    expect(allowed.ok).toBe(true);

    const readDenied = await $fetch<ApiResponse<RouteOperationalProfileDto>>(
      '/api/master-data/routes/route-djj-nbx/operational-profile',
      {
        headers: { cookie: 'ama_demo_role=Finance%20Reviewer' },
        ignoreResponseError: true
      }
    );
    expect(readDenied.ok).toBe(false);
    if (readDenied.ok) throw new Error('Expected route profile read to be denied.');
    expect(readDenied.error.code).toBe('FORBIDDEN');

    const updateDenied = await $fetch<ApiResponse<RouteDto>>(
      '/api/master-data/routes/route-djj-nbx',
      {
        method: 'PUT',
        headers: { cookie: 'ama_demo_role=OCC' },
        body: {
          routeCode: 'DJJ-NBX',
          originStationId: 'st-djj',
          destinationStationId: 'st-nbx',
          estimatedDurationMinutes: 80,
          distanceKm: 390,
          operationalNotes: null,
          restrictionLevel: 'NONE',
          restrictionNote: null
        },
        ignoreResponseError: true
      }
    );
    expect(updateDenied.ok).toBe(false);
    if (updateDenied.ok) throw new Error('Expected route update to be denied.');
    expect(updateDenied.error.code).toBe('FORBIDDEN');

    const options = await $fetch<ApiResponse<RouteOption[]>>('/api/master-data/routes/options', {
      headers: { cookie: 'ama_demo_role=Finance%20Reviewer' }
    });
    expect(options.ok).toBe(true);
  });

  it('rejects zero route dimensions at the HTTP boundary', async () => {
    const response = await $fetch<ApiResponse<RouteDto>>('/api/master-data/routes', {
      method: 'POST',
      body: {
        routeCode: 'ZERO-DISTANCE',
        originStationId: 'st-djj',
        destinationStationId: 'st-mkq',
        estimatedDurationMinutes: 80,
        distanceKm: 0
      },
      ignoreResponseError: true
    });
    expect(response.ok).toBe(false);
    if (response.ok) throw new Error('Expected validation to fail.');
    expect(response.error.code).toBe('VALIDATION_ERROR');
  });

  it('protects aircraft mutations with the master-data permission', async () => {
    const detail = await $fetch<ApiResponse<AircraftDto>>('/api/master-data/aircraft/ac-pk-ama');
    if (!detail.ok) throw new Error(detail.error.message);

    const denied = await $fetch<ApiResponse<AircraftDto>>('/api/master-data/aircraft/ac-pk-ama', {
      method: 'PUT',
      headers: { cookie: 'ama_demo_role=OCC' },
      body: detail.data,
      ignoreResponseError: true
    });

    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error('Expected aircraft update to be denied.');
    expect(denied.error.code).toBe('FORBIDDEN');
  });
});
