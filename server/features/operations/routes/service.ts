import { randomUUID } from 'node:crypto';
import type {
  RouteAvailableServiceDto,
  RouteInput,
  RouteListQuery,
  RouteOperationalProfileDto,
  RouteProfileStationDto,
  RouteReadinessCheckDto
} from '../../../../shared/features/operations/routes';
import { getApplicationNow } from '../../../utils/time';
import { DomainError, notFound } from '../../../utils/errors';
import { getApplicationNow } from '../../../utils/time';
import { StationsRepository } from '../stations/repository';
import { RoutesRepository } from './repository';

export class RoutesService {
  constructor(
    private readonly repository: RoutesRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly now: () => Date = () => new Date(getApplicationNow())
  ) {}

  list(query: RouteListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const route = await this.repository.getById(id);
    if (!route) throw notFound('Route', id);
    return route;
  }

  options() {
    return this.repository.options();
  }

  async getOperationalProfile(id: string): Promise<RouteOperationalProfileDto> {
    const route = await this.get(id);
    const evaluatedAt = this.now().toISOString();
    const evaluatedDate = evaluatedAt.slice(0, 10);
    const [stationRelations, scheduleRows, capacityRows, rateRows, reverseRoute, flightRows] =
      await Promise.all([
        this.repository.getStations(route),
        this.repository.getActiveScheduleTemplates(route.id),
        this.repository.getActiveCapacityProfiles(route.id),
        this.repository.getEffectiveRateServiceTypes(
          route.originStationId,
          route.destinationStationId,
          evaluatedDate
        ),
        this.repository.getReverseRoute(route.originStationId, route.destinationStationId),
        this.repository.getUpcomingFlights(route, evaluatedAt)
      ]);

    const origin = stationRelations.origin ? this.toProfileStation(stationRelations.origin) : null;
    const destination = stationRelations.destination
      ? this.toProfileStation(stationRelations.destination)
      : null;
    const scheduleTemplates = scheduleRows.map((row) => ({
      ...row,
      operatingDays: row.operatingDays.split(',').filter(Boolean)
    }));
    const compatibleAircraft = capacityRows;
    const services = new Map<string, RouteAvailableServiceDto>();
    const addService = (
      serviceTypeId: string,
      serviceTypeLabel: string,
      source: RouteAvailableServiceDto['sources'][number]
    ) => {
      const current = services.get(serviceTypeId);
      if (current) {
        if (!current.sources.includes(source)) current.sources.push(source);
        return;
      }
      services.set(serviceTypeId, { serviceTypeId, serviceTypeLabel, sources: [source] });
    };
    scheduleTemplates.forEach((item) =>
      addService(item.serviceTypeId, item.serviceTypeLabel, 'SCHEDULE_TEMPLATE')
    );
    compatibleAircraft.forEach((item) =>
      addService(item.serviceTypeId, item.serviceTypeLabel, 'CAPACITY_PROFILE')
    );
    rateRows.forEach(({ serviceType }) => {
      const mapped = this.mapRateService(serviceType);
      addService(mapped.id, mapped.label, 'RATE_CARD');
    });

    const readiness = this.buildReadiness(
      route,
      origin,
      destination,
      scheduleTemplates.length,
      compatibleAircraft.length
    );
    const upcomingFlights = flightRows
      .filter(
        (
          flight
        ): flight is typeof flight & {
          scheduledDepartureAt: string;
          scheduledArrivalAt: string;
        } => Boolean(flight.scheduledDepartureAt && flight.scheduledArrivalAt)
      )
      .map((flight) => ({ ...flight }));
    const papuaTimezone = [origin, destination].every((station) =>
      station?.province.toLowerCase().startsWith('papua')
    );

    return {
      route,
      origin,
      destination,
      regionLabel:
        origin && destination
          ? origin.province === destination.province
            ? origin.province
            : `${origin.province} / ${destination.province}`
          : null,
      timezone: papuaTimezone ? { code: 'WIT', ianaName: 'Asia/Jayapura' } : null,
      readiness,
      metrics: {
        activeTemplateCount: scheduleTemplates.length,
        compatibleAircraftCount: compatibleAircraft.length,
        nextFlightAt: upcomingFlights[0]?.scheduledDepartureAt ?? null
      },
      scheduleTemplates,
      compatibleAircraft,
      availableServices: [...services.values()].sort((a, b) =>
        a.serviceTypeLabel.localeCompare(b.serviceTypeLabel)
      ),
      upcomingFlights,
      reverseRoute,
      evaluatedAt
    };
  }

  async create(input: RouteInput) {
    await this.validate(input);
    try {
      return await this.repository.create(`route-${randomUUID()}`, input, new Date().toISOString());
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async update(id: string, input: RouteInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const route = await this.repository.update(id, input, new Date().toISOString());
      if (!route) throw notFound('Route', id);
      return route;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async setActive(id: string, isActive: boolean) {
    const existing = await this.get(id);
    if (isActive) await this.validate(existing);
    const route = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!route) throw notFound('Route', id);
    return route;
  }

  private async validate(input: RouteInput) {
    if (input.estimatedDurationMinutes <= 0 || input.distanceKm <= 0) {
      throw new DomainError(
        'ROUTE_DISTANCE_DURATION_INVALID',
        'Distance and duration must be greater than zero.',
        422
      );
    }
    if (input.restrictionLevel !== 'NONE' && !input.restrictionNote) {
      throw new DomainError(
        'ROUTE_RESTRICTION_NOTE_REQUIRED',
        'Restriction note is required for advisory or blocking restrictions.',
        422
      );
    }
    if (input.originStationId === input.destinationStationId) {
      throw new DomainError(
        'ROUTE_STATIONS_MUST_DIFFER',
        'Origin and destination cannot be the same.',
        422
      );
    }
    const originStation = await this.stationsRepository.getById(input.originStationId);
    if (!originStation?.isActive) {
      throw new DomainError(
        'ROUTE_ORIGIN_INVALID',
        'Origin must reference an active station.',
        422
      );
    }
    const destinationStation = await this.stationsRepository.getById(input.destinationStationId);
    if (!destinationStation?.isActive) {
      throw new DomainError(
        'ROUTE_DESTINATION_INVALID',
        'Destination must reference an active station.',
        422
      );
    }
  }

  private toProfileStation(station: Awaited<ReturnType<StationsRepository['getById']>> & {}) {
    const result: RouteProfileStationDto = {
      id: station.id,
      stationCode: station.stationCode,
      stationName: station.stationName,
      cityOrRegion: station.cityOrRegion,
      province: station.province,
      airportType: station.airportType,
      operationalNotes: station.operationalNotes,
      isActive: station.isActive
    };
    return result;
  }

  private buildReadiness(
    route: Awaited<ReturnType<RoutesService['get']>>,
    origin: RouteProfileStationDto | null,
    destination: RouteProfileStationDto | null,
    scheduleCount: number,
    capacityCount: number
  ): RouteOperationalProfileDto['readiness'] {
    const checks: RouteReadinessCheckDto[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];
    const addCheck = (check: RouteReadinessCheckDto) => {
      checks.push(check);
      if (check.status === 'FAIL') blockers.push(check.message);
      if (check.status === 'WARNING' || check.status === 'NOT_CONFIGURED') {
        warnings.push(check.message);
      }
    };

    addCheck({
      code: 'ROUTE_ACTIVE',
      label: 'Route is active',
      status: route.isActive ? 'PASS' : 'FAIL',
      message: route.isActive ? 'Route is active.' : 'Route is inactive.'
    });
    addCheck({
      code: 'ORIGIN_ACTIVE',
      label: 'Origin station is active',
      status: origin?.isActive ? 'PASS' : 'FAIL',
      message: origin?.isActive
        ? `${origin.stationCode} is active.`
        : 'Origin station is missing or inactive.'
    });
    addCheck({
      code: 'DESTINATION_ACTIVE',
      label: 'Destination station is active',
      status: destination?.isActive ? 'PASS' : 'FAIL',
      message: destination?.isActive
        ? `${destination.stationCode} is active.`
        : 'Destination station is missing or inactive.'
    });
    const dimensionsReady = route.distanceKm > 0 && route.estimatedDurationMinutes > 0;
    addCheck({
      code: 'ROUTE_DIMENSIONS',
      label: 'Distance and duration are configured',
      status: dimensionsReady ? 'PASS' : 'FAIL',
      message: dimensionsReady
        ? 'Distance and block time are configured.'
        : 'Distance or block time is invalid.'
    });
    addCheck({
      code: 'SCHEDULE_TEMPLATE',
      label: 'Active schedule template',
      status: scheduleCount > 0 ? 'PASS' : 'NOT_CONFIGURED',
      message:
        scheduleCount > 0
          ? `${scheduleCount} active schedule template${scheduleCount === 1 ? '' : 's'} available.`
          : 'No active schedule template is configured; manual scheduling remains available.'
    });
    addCheck({
      code: 'CAPACITY_PROFILE',
      label: 'Aircraft capacity profile',
      status: capacityCount > 0 ? 'PASS' : 'NOT_CONFIGURED',
      message:
        capacityCount > 0
          ? `${capacityCount} aircraft capacity profile${capacityCount === 1 ? '' : 's'} available.`
          : 'Aircraft compatibility has not been configured.'
    });
    addCheck({
      code: 'OPERATIONAL_RESTRICTION',
      label: 'Operational restriction',
      status:
        route.restrictionLevel === 'BLOCKING'
          ? 'FAIL'
          : route.restrictionLevel === 'ADVISORY'
            ? 'WARNING'
            : 'PASS',
      message:
        route.restrictionLevel === 'NONE'
          ? 'No route-level operational restriction is recorded.'
          : (route.restrictionNote ?? 'Operational restriction requires review.')
    });

    const availableForScheduling = blockers.length === 0;
    return {
      status: !availableForScheduling
        ? 'NOT_AVAILABLE'
        : scheduleCount === 0 || capacityCount === 0
          ? 'NEEDS_CONFIGURATION'
          : 'AVAILABLE',
      availableForScheduling,
      checks,
      warnings,
      blockers
    };
  }

  private mapRateService(serviceType: string) {
    if (serviceType === 'PASSENGER') {
      return { id: 'flight-service-type-scheduled-passenger', label: 'Passenger' };
    }
    if (serviceType === 'CARGO') {
      return { id: 'flight-service-type-charter-cargo', label: 'Cargo' };
    }
    if (serviceType === 'CHARTER') {
      return { id: 'flight-service-type-charter-passenger', label: 'Charter' };
    }
    return {
      id: `rate-service-${serviceType.toLowerCase().replaceAll('_', '-')}`,
      label: serviceType
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    };
  }

  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('routes.route_code')) {
      throw new DomainError('ROUTE_CODE_DUPLICATE', 'Route code already exists.', 409);
    }
    if (message.includes('routes.origin_station_id')) {
      throw new DomainError(
        'ROUTE_PAIR_DUPLICATE',
        'A route for this origin and destination already exists.',
        409
      );
    }
    throw error;
  }
}
