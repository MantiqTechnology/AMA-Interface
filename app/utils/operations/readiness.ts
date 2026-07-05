import type {
  Aircraft,
  CrewMember,
  DemoDatabase,
  FlightRequest,
  FuelConfirmation,
  HandlingConfirmation,
  ReadinessCheck,
  ReadinessItem,
  Route,
  Station
} from '#shared/types/ops-demo';
import { nowDemoIso } from './formatters';

type ReadinessData = Pick<
  DemoDatabase,
  'aircraft' | 'crew' | 'fuelConfirmations' | 'handlingConfirmations' | 'routes' | 'stations'
>;

function byId<T extends { id: string }>(items: T[], id: string | null | undefined) {
  return id ? items.find((item) => item.id === id) : undefined;
}

function endOfLocalDay(value: string) {
  return new Date(`${value}T23:59:59+09:00`);
}

function dateOnlyIsAfterOrSame(value: string, targetIso: string) {
  return endOfLocalDay(value).getTime() >= new Date(targetIso).getTime();
}

function aircraftDisplayName(aircraft: Aircraft) {
  return `${aircraft.manufacturer} ${aircraft.model}`;
}

function aircraftMatchesQualification(aircraft: Aircraft, crew: CrewMember, plannedArrivalAt: string) {
  const model = aircraft.model.toLowerCase();
  const fullModel = aircraftDisplayName(aircraft).toLowerCase();

  return crew.qualifications.some((qualification) => {
    const qualifiedModel = qualification.aircraftModel.toLowerCase();
    return (
      qualification.status === 'VALID' &&
      dateOnlyIsAfterOrSame(qualification.validUntil, plannedArrivalAt) &&
      (qualifiedModel === model ||
        qualifiedModel === fullModel ||
        qualifiedModel.includes(model) ||
        fullModel.includes(qualifiedModel))
    );
  });
}

function makeItem(
  code: string,
  label: string,
  state: ReadinessItem['state'],
  message: string
): ReadinessItem {
  return {
    code,
    label,
    state,
    severity: state === 'BLOCKER' ? 'CRITICAL' : state === 'WARNING' ? 'WARNING' : 'INFO',
    message
  };
}

function buildAircraftAvailabilityItem(request: FlightRequest, aircraft?: Aircraft) {
  if (!aircraft) {
    return makeItem(
      'AIRCRAFT_AVAILABILITY',
      'Aircraft availability',
      'BLOCKER',
      'Aircraft belum dipilih.'
    );
  }

  const availableBeforeDeparture =
    new Date(aircraft.availability.availableFrom).getTime() <=
    new Date(request.plannedDepartureAt).getTime();
  const isAvailable = aircraft.operationalStatus === 'AVAILABLE';

  if (!isAvailable || !availableBeforeDeparture) {
    return makeItem(
      'AIRCRAFT_AVAILABILITY',
      'Aircraft availability',
      'BLOCKER',
      `${aircraft.registration} tidak available sebelum jadwal departure.`
    );
  }

  return makeItem(
    'AIRCRAFT_AVAILABILITY',
    'Aircraft availability',
    'PASS',
    `${aircraft.registration} available sebelum jadwal departure.`
  );
}

function buildAircraftDocumentItem(request: FlightRequest, aircraft?: Aircraft) {
  if (!aircraft) {
    return makeItem(
      'AIRCRAFT_DOCUMENTS',
      'Aircraft documents',
      'BLOCKER',
      'Aircraft belum dipilih sehingga dokumen belum bisa divalidasi.'
    );
  }

  const invalidDocument = aircraft.documents.find(
    (document) =>
      document.status !== 'VALID' || !dateOnlyIsAfterOrSame(document.validUntil, request.plannedArrivalAt)
  );
  const airworthinessValid = dateOnlyIsAfterOrSame(
    aircraft.maintenance.airworthinessValidUntil,
    request.plannedArrivalAt
  );

  if (invalidDocument || !airworthinessValid) {
    return makeItem(
      'AIRCRAFT_DOCUMENTS',
      'Aircraft documents',
      'BLOCKER',
      `Dokumen ${aircraft.registration} tidak valid sampai planned arrival.`
    );
  }

  return makeItem(
    'AIRCRAFT_DOCUMENTS',
    'Aircraft documents',
    'PASS',
    `Dokumen ${aircraft.registration} valid setelah planned arrival.`
  );
}

function buildCrewQualificationItem(
  request: FlightRequest,
  aircraft: Aircraft | undefined,
  crew: CrewMember[]
) {
  const pilot = crew.find((member) => member.role === 'PILOT');

  if (!aircraft || !pilot) {
    return makeItem(
      'CREW_QUALIFICATION',
      'Crew qualification',
      'BLOCKER',
      'Aircraft dan pilot harus dipilih sebelum validasi crew.'
    );
  }

  if (!aircraftMatchesQualification(aircraft, pilot, request.plannedArrivalAt)) {
    return makeItem(
      'CREW_QUALIFICATION',
      'Crew qualification',
      'BLOCKER',
      `${pilot.name} tidak memiliki kualifikasi valid untuk ${aircraftDisplayName(aircraft)}.`
    );
  }

  return makeItem(
    'CREW_QUALIFICATION',
    'Crew qualification',
    'PASS',
    `${pilot.name} qualified untuk ${aircraftDisplayName(aircraft)}.`
  );
}

function buildCrewDutyItem(route: Route | undefined, crew: CrewMember[]) {
  const pilot = crew.find((member) => member.role === 'PILOT');

  if (!route || !pilot) {
    return makeItem(
      'CREW_DUTY_TIME',
      'Crew duty time',
      'BLOCKER',
      'Route dan pilot harus tersedia untuk menghitung duty reserve.'
    );
  }

  const requiredMinutes = route.plannedBlockMinutes + route.turnaroundBufferMinutes + 60;

  if (pilot.flightDuty.remainingMinutes < requiredMinutes) {
    return makeItem(
      'CREW_DUTY_TIME',
      'Crew duty time',
      'BLOCKER',
      `${pilot.name} hanya memiliki ${pilot.flightDuty.remainingMinutes} min, kebutuhan minimum ${requiredMinutes} min.`
    );
  }

  if (pilot.flightDuty.remainingMinutes < requiredMinutes + 120) {
    return makeItem(
      'CREW_DUTY_TIME',
      'Crew duty time',
      'WARNING',
      `${pilot.name} lolos, tetapi duty reserve kurang dari tambahan 120 min.`
    );
  }

  return makeItem(
    'CREW_DUTY_TIME',
    'Crew duty time',
    'PASS',
    `${pilot.name} memiliki duty reserve ${pilot.flightDuty.remainingMinutes} min.`
  );
}

function buildPayloadItem(request: FlightRequest, aircraft?: Aircraft) {
  if (!aircraft) {
    return makeItem(
      'PAYLOAD_CAPACITY',
      'Payload capacity',
      'BLOCKER',
      'Aircraft belum dipilih untuk validasi payload.'
    );
  }

  if (request.load.estimatedOperationalPayloadKg > aircraft.syntheticConfiguration.maxPayloadKg) {
    return makeItem(
      'PAYLOAD_CAPACITY',
      'Payload capacity',
      'BLOCKER',
      `Payload ${request.load.estimatedOperationalPayloadKg} kg melebihi limit ${aircraft.syntheticConfiguration.maxPayloadKg} kg.`
    );
  }

  return makeItem(
    'PAYLOAD_CAPACITY',
    'Payload capacity',
    'PASS',
    `Payload ${request.load.estimatedOperationalPayloadKg} kg dalam limit ${aircraft.syntheticConfiguration.maxPayloadKg} kg.`
  );
}

function buildFuelItem(request: FlightRequest, fuel?: FuelConfirmation) {
  if (!fuel) {
    return makeItem('FUEL_CONFIRMATION', 'Fuel confirmation', 'BLOCKER', 'Fuel belum diminta.');
  }

  const validThroughDeparture =
    new Date(fuel.validUntil).getTime() >= new Date(request.plannedDepartureAt).getTime();
  const enoughFuel =
    fuel.status === 'CONFIRMED' &&
    fuel.confirmedLiters >= request.fuelPlan.requiredLiters &&
    validThroughDeparture;

  if (!enoughFuel) {
    return makeItem(
      'FUEL_CONFIRMATION',
      'Fuel confirmation',
      'BLOCKER',
      `${fuel.confirmedLiters} L dikonfirmasi dari kebutuhan ${request.fuelPlan.requiredLiters} L.`
    );
  }

  return makeItem(
    'FUEL_CONFIRMATION',
    'Fuel confirmation',
    'PASS',
    `${fuel.confirmedLiters} L ${fuel.fuelType} sudah confirmed.`
  );
}

function buildHandlingItem(
  code: string,
  label: string,
  request: FlightRequest,
  handling?: HandlingConfirmation
) {
  if (!handling) {
    return makeItem(code, label, 'BLOCKER', `${label} belum diminta.`);
  }

  if (handling.status !== 'CONFIRMED') {
    return makeItem(
      code,
      label,
      'BLOCKER',
      `${label} masih ${handling.status}; request ${request.requestNumber} belum siap approval.`
    );
  }

  return makeItem(code, label, 'PASS', `${label} confirmed oleh provider mock.`);
}

function buildMedevacKitItem(request: FlightRequest, aircraft?: Aircraft) {
  const needsMedevac = request.source === 'MEDEVAC' || request.requestType === 'MEDEVAC';

  if (!needsMedevac) {
    return makeItem('MEDICAL_KIT', 'Medevac kit', 'NOT_REQUIRED', 'Tidak diperlukan.');
  }

  if (!aircraft?.syntheticConfiguration.medevacKitAvailable) {
    return makeItem(
      'MEDICAL_KIT',
      'Medevac kit',
      'BLOCKER',
      'Medevac membutuhkan aircraft dengan medevac kit.'
    );
  }

  return makeItem('MEDICAL_KIT', 'Medevac kit', 'PASS', 'Aircraft memiliki medevac kit.');
}

function buildStationWarnings(route: Route | undefined, stations: Station[], request: FlightRequest) {
  if (!route) return [];

  const origin = byId(stations, route.originStationId);
  const destination = byId(stations, route.destinationStationId);
  const items: ReadinessItem[] = [];

  for (const station of [origin, destination]) {
    if (station?.operationalStatus === 'OPEN_WITH_LIMITATION') {
      items.push(
        makeItem(
          `STATION_LIMITATION_${station.code}`,
          `${station.code} station limitation`,
          'WARNING',
          `${station.name} open with limitation.`
        )
      );
    }
  }

  if (destination && !destination.capabilities.fuelTypes.includes(request.fuelPlan.fuelType)) {
    items.push(
      makeItem(
        'DESTINATION_FUEL_AVAILABILITY',
        'Destination fuel availability',
        'WARNING',
        `${destination.code} tidak memiliki fuel ${request.fuelPlan.fuelType}.`
      )
    );
  }

  if (request.priority === 'HIGH' || request.priority === 'CRITICAL') {
    items.push(
      makeItem(
        'REQUEST_PRIORITY',
        'Request priority',
        'WARNING',
        `${request.priority} priority perlu monitoring OCC.`
      )
    );
  }

  return items;
}

export function calculateReadiness(
  request: FlightRequest,
  data: ReadinessData,
  checkedAt = nowDemoIso()
): ReadinessCheck {
  const route = byId(data.routes, request.routeId);
  const aircraft = byId(data.aircraft, request.assignedAircraftId);
  const crew = request.assignedCrewIds
    .map((crewId) => byId(data.crew, crewId))
    .filter((member): member is CrewMember => Boolean(member));
  const fuel = byId(data.fuelConfirmations, request.fuelPlan.confirmationId);
  const originHandling = byId(data.handlingConfirmations, request.handlingPlan.originHandlingId);
  const destinationHandling = byId(
    data.handlingConfirmations,
    request.handlingPlan.destinationHandlingId
  );

  const items = [
    buildAircraftAvailabilityItem(request, aircraft),
    buildAircraftDocumentItem(request, aircraft),
    buildCrewQualificationItem(request, aircraft, crew),
    buildCrewDutyItem(route, crew),
    buildPayloadItem(request, aircraft),
    buildFuelItem(request, fuel),
    buildHandlingItem('ORIGIN_HANDLING', 'Origin handling', request, originHandling),
    buildHandlingItem('DESTINATION_HANDLING', 'Destination handling', request, destinationHandling),
    buildMedevacKitItem(request, aircraft),
    ...buildStationWarnings(route, data.stations, request)
  ];

  const overallState = items.some((item) => item.state === 'BLOCKER')
    ? 'BLOCKER'
    : items.some((item) => item.state === 'WARNING' || item.state === 'PENDING')
      ? 'WARNING'
      : 'PASS';

  return {
    id: `RDC-${request.id}`,
    flightRequestId: request.id,
    overallState,
    overallDecision: overallState === 'BLOCKER' ? 'BLOCKED' : 'READY_FOR_APPROVAL',
    checkedAt,
    items
  };
}

export function readinessHasBlocker(readiness?: ReadinessCheck) {
  return Boolean(readiness?.items.some((item) => item.state === 'BLOCKER'));
}
