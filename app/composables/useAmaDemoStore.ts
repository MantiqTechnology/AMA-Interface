import seedDatabase from '../../data/ops-demo-db.json';
import type {
  AuditEvent,
  CrewMember,
  DemoDatabase,
  Flight,
  FlightRequest,
  FlightStatus,
  FuelConfirmation,
  Role
} from '#shared/types/ops-demo';
import type { AuthorizationContext } from '#shared/types/authz';
import { nowDemoIso } from '#operations/formatters';
import { authorizeOperation, deny } from '#operations/policies';
import { calculateReadiness, readinessHasBlocker } from '#operations/readiness';

const typedSeed = seedDatabase as unknown as DemoDatabase;
const defaultPersonaId = 'USR-001';

function cloneSeed() {
  return JSON.parse(JSON.stringify(typedSeed)) as DemoDatabase;
}

function byId<T extends { id: string }>(items: T[], id: string | null | undefined) {
  return id ? items.find((item) => item.id === id) : undefined;
}

function replaceById<T extends { id: string }>(items: T[], nextItem: T) {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id);
  if (existingIndex === -1) {
    items.push(nextItem);
    return;
  }
  items.splice(existingIndex, 1, nextItem);
}

function nextFlightNumber(existingFlights: Flight[]) {
  if (!existingFlights.some((flight) => flight.flightNumber === 'AMA701')) return 'AMA701';
  return `AMA${701 + existingFlights.length}`;
}

export function useAmaDemoStore() {
  const data = useState<DemoDatabase>('ama-demo-db', cloneSeed);
  const currentUserId = useState<string>('ama-demo-current-user-id', () => defaultPersonaId);
  const { pushToast } = useDemoToasts();

  const currentUser = computed(() => byId(data.value.appUsers, currentUserId.value) ?? data.value.appUsers[0]);
  const currentRoles = computed(() =>
    currentUser.value.roleIds
      .map((roleId) => byId(data.value.roles, roleId))
      .filter((role): role is Role => Boolean(role))
  );

  function getRoute(id: string | null | undefined) {
    return byId(data.value.routes, id);
  }

  function getStation(id: string | null | undefined) {
    return byId(data.value.stations, id);
  }

  function getAircraft(id: string | null | undefined) {
    return byId(data.value.aircraft, id);
  }

  function getCrew(ids: string[]) {
    return ids
      .map((id) => byId(data.value.crew, id))
      .filter((member): member is CrewMember => Boolean(member));
  }

  function getUser(id: string | null | undefined) {
    return byId(data.value.appUsers, id);
  }

  function getRequest(id: string | null | undefined) {
    return byId(data.value.flightRequests, id);
  }

  function getFlight(id: string | null | undefined) {
    return byId(data.value.flights, id);
  }

  function getReadinessForRequest(id: string | null | undefined) {
    return data.value.readinessChecks.find((readiness) => readiness.flightRequestId === id);
  }

  function getApprovalForRequest(id: string | null | undefined) {
    return data.value.approvals.find((approval) => approval.flightRequestId === id);
  }

  function getFuelConfirmation(id: string | null | undefined) {
    return byId(data.value.fuelConfirmations, id);
  }

  function getHandlingConfirmation(id: string | null | undefined) {
    return byId(data.value.handlingConfirmations, id);
  }

  function routeForRequest(request: FlightRequest | undefined) {
    return request ? getRoute(request.routeId) : undefined;
  }

  function routeForFlight(flight: Flight | undefined) {
    return flight ? getRoute(flight.routeId) : undefined;
  }

  function guard(permissionId: string, context: AuthorizationContext = {}) {
    const decision = authorizeOperation(data.value, currentUserId.value, permissionId, context);
    if (!decision.allowed) {
      pushToast({ type: 'warning', title: 'Aksi ditolak', message: decision.message });
    }
    return decision;
  }

  function appendAudit(entityType: string, entityId: string, action: string, summary: string) {
    const event: AuditEvent = {
      id: `AUD-DEMO-${data.value.auditEvents.length + 1}`,
      at: nowDemoIso(),
      actorUserId: currentUserId.value,
      entityType,
      entityId,
      action,
      summary
    };
    data.value.auditEvents.unshift(event);
  }

  function appendTimeline(flight: Flight, event: string, note: string) {
    flight.timeline.push({
      at: nowDemoIso(),
      actor: currentUser.value.demoPersona,
      event,
      note
    });
  }

  function switchPersona(userId: string) {
    const user = byId(data.value.appUsers, userId);
    if (!user) return;
    currentUserId.value = user.id;
    pushToast({
      type: 'info',
      title: 'Persona demo diganti',
      message: `${user.demoPersona} - ${user.name}`
    });
  }

  function resetDemo() {
    data.value = cloneSeed();
    currentUserId.value = defaultPersonaId;
    pushToast({
      type: 'success',
      title: 'Demo di-reset',
      message: 'Fixture operasi dan RBAC kembali ke kondisi awal.'
    });
  }

  function toggleModule(moduleKey: string, active: boolean) {
    const decision = guard('platform.module.manage');
    if (!decision.allowed) return decision;

    const module = data.value.tenantModules.find((item) => item.moduleKey === moduleKey);
    if (!module) {
      return deny('MISSING_REQUIRED_DATA', `Module ${moduleKey} tidak ditemukan.`);
    }

    module.status = active ? 'ACTIVE' : 'DISABLED';
    appendAudit('TENANT_MODULE', moduleKey, active ? 'ENABLED' : 'DISABLED', `Module ${moduleKey} updated.`);
    pushToast({
      type: 'success',
      title: 'Module entitlement diperbarui',
      message: `${moduleKey} sekarang ${module.status}.`
    });
    return decision;
  }

  function updateReadiness(request: FlightRequest) {
    const nextReadiness = calculateReadiness(request, data.value);
    replaceById(data.value.readinessChecks, nextReadiness);
    request.status = readinessHasBlocker(nextReadiness) ? 'BLOCKED' : 'READY_FOR_APPROVAL';
    return nextReadiness;
  }

  function runReadiness(requestId: string) {
    const request = getRequest(requestId);
    if (!request) return deny('MISSING_REQUIRED_DATA', 'Flight Request tidak ditemukan.');

    const decision = guard('readiness.run', {
      flightRequest: request,
      route: routeForRequest(request)
    });
    if (!decision.allowed) return decision;

    const readiness = updateReadiness(request);
    appendAudit(
      'READINESS_CHECK',
      readiness.id,
      readiness.overallState === 'BLOCKER' ? 'BLOCKED' : 'COMPLETED',
      `Readiness ${request.requestNumber} menghasilkan ${readiness.overallState}.`
    );
    pushToast({
      type: readinessHasBlocker(readiness) ? 'warning' : 'success',
      title: 'Readiness diperbarui',
      message: `${request.requestNumber}: ${readiness.overallState}.`
    });
    return decision;
  }

  function requestFuelConfirmation(requestId: string) {
    const request = getRequest(requestId);
    if (!request) return deny('MISSING_REQUIRED_DATA', 'Flight Request tidak ditemukan.');

    const decision = guard('fuel.request', {
      flightRequest: request,
      route: routeForRequest(request)
    });
    if (!decision.allowed) return decision;

    const existing = getFuelConfirmation(request.fuelPlan.confirmationId);
    const nextFuel: FuelConfirmation = existing
      ? {
          ...existing,
          confirmedLiters: request.fuelPlan.requiredLiters,
          status: 'CONFIRMED',
          confirmedAt: nowDemoIso(),
          validUntil: request.plannedDepartureAt,
        }
      : {
          id: `FUEL-DEMO-${data.value.fuelConfirmations.length + 1}`,
          flightRequestId: request.id,
          provider: 'PT Pertamina (MOCK)',
          providerReference: `MOCK-DEMO-${request.id}`,
          stationId: request.fuelPlan.upliftStationId,
          fuelType: request.fuelPlan.fuelType,
          requestedLiters: request.fuelPlan.requiredLiters,
          confirmedLiters: request.fuelPlan.requiredLiters,
          status: 'CONFIRMED',
          requestedAt: nowDemoIso(),
          confirmedAt: nowDemoIso(),
          validUntil: request.plannedDepartureAt,
          remarks: 'DEMO DATA / NO LIVE INTEGRATION: mock provider confirmation created.'
        };

    replaceById(data.value.fuelConfirmations, nextFuel);
    request.fuelPlan.confirmationId = nextFuel.id;
    updateReadiness(request);
    appendAudit('FUEL_CONFIRMATION', nextFuel.id, 'MOCK_CONFIRMED', `Fuel mock confirmed for ${request.id}.`);
    pushToast({ type: 'success', title: 'Fuel mock confirmed', message: request.requestNumber });
    return decision;
  }

  function confirmHandling(handlingId: string) {
    const handling = getHandlingConfirmation(handlingId);
    const request = getRequest(handling?.flightRequestId);
    if (!handling || !request) return deny('MISSING_REQUIRED_DATA', 'Handling confirmation tidak ditemukan.');

    const decision = guard('handling.confirm', {
      flightRequest: request,
      handling,
      stationId: handling.stationId,
      route: routeForRequest(request)
    });
    if (!decision.allowed) return decision;

    handling.status = 'CONFIRMED';
    handling.parkingBay ||= `BAY-${getStation(handling.stationId)?.code ?? 'D'}1`;
    handling.remarks = 'DEMO DATA / NO LIVE INTEGRATION: station handling confirmed locally.';
    updateReadiness(request);
    appendAudit('HANDLING_CONFIRMATION', handling.id, 'MOCK_CONFIRMED', `Handling confirmed for ${handling.stationId}.`);
    pushToast({ type: 'success', title: 'Handling confirmed', message: handling.providerReference });
    return decision;
  }

  function assignAlternateAircraft(requestId: string) {
    const request = getRequest(requestId);
    if (!request) return deny('MISSING_REQUIRED_DATA', 'Flight Request tidak ditemukan.');

    const decision = guard('flight_request.assign_aircraft', {
      flightRequest: request,
      route: routeForRequest(request)
    });
    if (!decision.allowed) return decision;

    const needsMedevac = request.source === 'MEDEVAC' || request.requestType === 'MEDEVAC';
    const alternate = data.value.aircraft.find(
      (aircraft) =>
        aircraft.id !== request.assignedAircraftId &&
        aircraft.operationalStatus === 'AVAILABLE' &&
        (!needsMedevac || aircraft.syntheticConfiguration.medevacKitAvailable)
    );

    if (!alternate) {
      pushToast({ type: 'warning', title: 'Tidak ada alternate aircraft yang cocok' });
      return deny('MISSING_REQUIRED_DATA', 'Tidak ada alternate aircraft yang cocok.');
    }

    request.assignedAircraftId = alternate.id;
    updateReadiness(request);
    appendAudit('FLIGHT_REQUEST', request.id, 'AIRCRAFT_REASSIGNED', `Assigned ${alternate.registration}.`);
    pushToast({ type: 'success', title: 'Aircraft diganti', message: alternate.registration });
    return decision;
  }

  function assignAlternatePilot(requestId: string) {
    const request = getRequest(requestId);
    if (!request) return deny('MISSING_REQUIRED_DATA', 'Flight Request tidak ditemukan.');

    const decision = guard('flight_request.assign_crew', {
      flightRequest: request,
      route: routeForRequest(request)
    });
    if (!decision.allowed) return decision;

    const nonPilotCrew = getCrew(request.assignedCrewIds).filter((member) => member.role !== 'PILOT');
    const alternatePilot = data.value.crew
      .filter((member) => member.role === 'PILOT' && !request.assignedCrewIds.includes(member.id))
      .find((pilot) => {
        const simulatedRequest: FlightRequest = {
          ...request,
          assignedCrewIds: [pilot.id, ...nonPilotCrew.map((member) => member.id)]
        };
        const readiness = calculateReadiness(simulatedRequest, data.value);
        return !readiness.items.some((item: { code: string }) =>
          ['CREW_QUALIFICATION', 'CREW_DUTY_TIME'].includes(item.code)
        );
      });

    if (!alternatePilot) {
      pushToast({ type: 'warning', title: 'Tidak ada alternate pilot yang lolos readiness' });
      return deny('MISSING_REQUIRED_DATA', 'Tidak ada alternate pilot yang lolos readiness.');
    }

    request.assignedCrewIds = [alternatePilot.id, ...nonPilotCrew.map((member) => member.id)];
    updateReadiness(request);
    appendAudit('FLIGHT_REQUEST', request.id, 'CREW_REASSIGNED', `Assigned ${alternatePilot.name}.`);
    pushToast({ type: 'success', title: 'Pilot diganti', message: alternatePilot.name });
    return decision;
  }

  function submitForApproval(requestId: string) {
    const request = getRequest(requestId);
    if (!request) return deny('MISSING_REQUIRED_DATA', 'Flight Request tidak ditemukan.');

    const readiness = getReadinessForRequest(requestId) ?? updateReadiness(request);
    const decision = guard('flight_request.submit', {
      flightRequest: request,
      readiness,
      route: routeForRequest(request)
    });
    if (!decision.allowed) return decision;

    request.status = readinessHasBlocker(readiness) ? 'BLOCKED' : 'READY_FOR_APPROVAL';
    if (!getApprovalForRequest(request.id)) {
      data.value.approvals.push({
        id: `APR-DEMO-${data.value.approvals.length + 1}`,
        flightRequestId: request.id,
        type: 'DISPATCH_APPROVAL',
        status: 'PENDING',
        requestedAt: nowDemoIso(),
        requestedByUserId: currentUserId.value,
        assignedApproverUserId: 'USR-003',
        decisionAt: null,
        decisionByUserId: null,
        remarks: null
      });
    }
    appendAudit('FLIGHT_REQUEST', request.id, 'SUBMITTED', `${request.requestNumber} submitted for approval.`);
    pushToast({ type: 'success', title: 'Request dikirim', message: request.requestNumber });
    return decision;
  }

  function approveAndCreateFlight(requestId: string) {
    const request = getRequest(requestId);
    if (!request) return deny('MISSING_REQUIRED_DATA', 'Flight Request tidak ditemukan.');

    const readiness = getReadinessForRequest(requestId) ?? updateReadiness(request);
    const approveDecision = guard('flight_request.approve', {
      flightRequest: request,
      readiness,
      route: routeForRequest(request)
    });
    if (!approveDecision.allowed) return approveDecision;

    const dispatchDecision = guard('dispatch.release', {
      flightRequest: request,
      readiness,
      route: routeForRequest(request)
    });
    if (!dispatchDecision.allowed) return dispatchDecision;

    const existingFlight = data.value.flights.find((flight) => flight.flightRequestId === request.id);
    if (existingFlight) {
      pushToast({ type: 'info', title: 'Flight sudah dibuat', message: existingFlight.flightNumber });
      return approveDecision;
    }

    const aircraft = getAircraft(request.assignedAircraftId);
    const flight: Flight = {
      id: `FLT-${request.id.replace('FR-', 'AMA-')}`,
      flightNumber: nextFlightNumber(data.value.flights),
      flightRequestId: request.id,
      status: 'SCHEDULED',
      routeId: request.routeId,
      aircraftId: request.assignedAircraftId ?? data.value.aircraft[0].id,
      crewIds: [...request.assignedCrewIds],
      plannedDepartureAt: request.plannedDepartureAt,
      plannedArrivalAt: request.plannedArrivalAt,
      actualDepartureAt: null,
      actualArrivalAt: null,
      lastStatusAt: nowDemoIso(),
      currentPositionText: 'Scheduled from dispatch approval',
      delay: {
        isDelayed: false,
        minutes: 0,
        reasonCode: null,
        reasonText: null
      },
      manifestSummary: {
        passengerCount: request.load.passengerCount,
        cargoWeightKg: request.load.cargoWeightKg
      },
      timeline: [
        {
          at: nowDemoIso(),
          actor: currentUser.value.demoPersona,
          event: 'REQUEST_APPROVED',
          note: `Dispatch approved and flight created for ${aircraft?.registration ?? 'assigned aircraft'}.`
        }
      ]
    };

    data.value.flights.unshift(flight);
    request.status = 'CONVERTED_TO_FLIGHT';
    const approval = getApprovalForRequest(request.id);
    if (approval) {
      approval.status = 'APPROVED';
      approval.decisionAt = nowDemoIso();
      approval.decisionByUserId = currentUserId.value;
      approval.remarks = 'Approved in local demo simulation.';
    }
    appendAudit('FLIGHT_REQUEST', request.id, 'APPROVED_AND_RELEASED', `${flight.flightNumber} created.`);
    pushToast({ type: 'success', title: 'Flight dibuat', message: flight.flightNumber });
    return approveDecision;
  }

  function rejectRequest(requestId: string, reason: string) {
    const request = getRequest(requestId);
    if (!request) return deny('MISSING_REQUIRED_DATA', 'Flight Request tidak ditemukan.');

    const decision = guard('flight_request.reject', {
      flightRequest: request,
      note: reason,
      route: routeForRequest(request)
    });
    if (!decision.allowed) return decision;

    request.status = 'REJECTED';
    const approval = getApprovalForRequest(request.id);
    if (approval) {
      approval.status = 'REJECTED';
      approval.decisionAt = nowDemoIso();
      approval.decisionByUserId = currentUserId.value;
      approval.remarks = reason;
    }
    appendAudit('FLIGHT_REQUEST', request.id, 'REJECTED', reason);
    pushToast({ type: 'success', title: 'Request ditolak', message: request.requestNumber });
    return decision;
  }

  function updateFlightStatus(flightId: string, nextStatus: FlightStatus, note: string) {
    const flight = getFlight(flightId);
    if (!flight) return deny('MISSING_REQUIRED_DATA', 'Flight tidak ditemukan.');

    const decision = guard('flight.following.update', {
      flight,
      nextStatus,
      note,
      route: routeForFlight(flight)
    });
    if (!decision.allowed) return decision;

    flight.status = nextStatus;
    flight.lastStatusAt = nowDemoIso();
    flight.currentPositionText = note || `Manual status: ${nextStatus}`;
    if (nextStatus === 'DEPARTED') flight.actualDepartureAt = nowDemoIso();
    if (nextStatus === 'LANDED') flight.actualArrivalAt = nowDemoIso();
    appendTimeline(flight, nextStatus, note || `Manual status changed to ${nextStatus}.`);
    appendAudit('FLIGHT', flight.id, `STATUS_${nextStatus}`, note || `Status changed to ${nextStatus}.`);
    pushToast({ type: 'success', title: 'Flight status diperbarui', message: `${flight.flightNumber}: ${nextStatus}` });
    return decision;
  }

  function closeFlight(
    flightId: string,
    payload: {
      fuelUsedLiters: number;
      delayMinutes: number;
      incidentReported: boolean;
      operationalRemark: string;
    }
  ) {
    const flight = getFlight(flightId);
    if (!flight) return deny('MISSING_REQUIRED_DATA', 'Flight tidak ditemukan.');

    const decision = guard('flight.closure.create', {
      flight,
      note: payload.operationalRemark,
      route: routeForFlight(flight)
    });
    if (!decision.allowed) return decision;

    flight.status = 'CLOSED';
    flight.lastStatusAt = nowDemoIso();
    flight.delay = {
      ...flight.delay,
      isDelayed: payload.delayMinutes > 0,
      minutes: payload.delayMinutes,
      reasonText: payload.delayMinutes > 0 ? 'Closure delay recorded in demo.' : null
    };
    flight.closure = {
      closedByUserId: currentUserId.value,
      closedAt: nowDemoIso(),
      fuelUsedLiters: payload.fuelUsedLiters,
      delayMinutes: payload.delayMinutes,
      incidentReported: payload.incidentReported,
      operationalRemark: payload.operationalRemark,
      financeHandoffStatus: 'READY_FOR_REVIEW',
      maintenanceHandoffStatus: payload.incidentReported ? 'DEFECT_REVIEW_REQUIRED' : 'NO_DEFECT_REPORTED'
    };
    appendTimeline(flight, 'CLOSED', payload.operationalRemark);
    appendAudit('FLIGHT', flight.id, 'CLOSED', payload.operationalRemark);
    pushToast({ type: 'success', title: 'Flight closed', message: flight.flightNumber });
    return decision;
  }

  return {
    data,
    currentRoles,
    currentUser,
    currentUserId,
    getAircraft,
    getApprovalForRequest,
    getCrew,
    getFlight,
    getFuelConfirmation,
    getHandlingConfirmation,
    getReadinessForRequest,
    getRequest,
    getRoute,
    getStation,
    getUser,
    routeForFlight,
    routeForRequest,
    switchPersona,
    resetDemo,
    toggleModule,
    runReadiness,
    requestFuelConfirmation,
    confirmHandling,
    assignAlternateAircraft,
    assignAlternatePilot,
    submitForApproval,
    approveAndCreateFlight,
    rejectRequest,
    updateFlightStatus,
    closeFlight
  };
}
