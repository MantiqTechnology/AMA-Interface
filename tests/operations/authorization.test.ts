import { describe, expect, it } from 'vitest';
import seedDatabase from '../../data/ops-demo-db.json';
import type { DemoDatabase, FlightStatus } from '../../shared/types/ops-demo';
import { authorizeOperation } from '../../app/utils/operations/policies';

function cloneSeed() {
  return JSON.parse(JSON.stringify(seedDatabase)) as DemoDatabase;
}

function request(data: DemoDatabase, id: string) {
  const found = data.flightRequests.find((item) => item.id === id);
  if (!found) throw new Error(`Missing request ${id}`);
  return found;
}

function flight(data: DemoDatabase, id: string) {
  const found = data.flights.find((item) => item.id === id);
  if (!found) throw new Error(`Missing flight ${id}`);
  return found;
}

function routeForRequest(data: DemoDatabase, id: string) {
  const route = data.routes.find((item) => item.id === request(data, id).routeId);
  if (!route) throw new Error(`Missing route for request ${id}`);
  return route;
}

function routeForFlight(data: DemoDatabase, id: string) {
  const route = data.routes.find((item) => item.id === flight(data, id).routeId);
  if (!route) throw new Error(`Missing route for flight ${id}`);
  return route;
}

function readiness(data: DemoDatabase, requestId: string) {
  const found = data.readinessChecks.find((item) => item.flightRequestId === requestId);
  if (!found) throw new Error(`Missing readiness ${requestId}`);
  return found;
}

describe('operations authorization policies', () => {
  it('prevents a Flight Coordinator from approving their own request', () => {
    const data = cloneSeed();
    const decision = authorizeOperation(data, 'USR-001', 'flight_request.approve', {
      flightRequest: request(data, 'FR-20260706-001'),
      readiness: readiness(data, 'FR-20260706-001'),
      route: routeForRequest(data, 'FR-20260706-001')
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('MISSING_PERMISSION');
  });

  it('prevents Chief of Pilot from approving a request with readiness blockers', () => {
    const data = cloneSeed();
    const blockedRequest = request(data, 'FR-20260706-002');
    blockedRequest.status = 'READY_FOR_APPROVAL';

    const decision = authorizeOperation(data, 'USR-003', 'flight_request.approve', {
      flightRequest: blockedRequest,
      readiness: readiness(data, 'FR-20260706-002'),
      route: routeForRequest(data, 'FR-20260706-002')
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('READINESS_BLOCKER');
  });

  it('blocks Wamena Station Operations from confirming DJJ handling', () => {
    const data = cloneSeed();
    const handling = data.handlingConfirmations.find((item) => item.id === 'HND-20260706-004');
    if (!handling) throw new Error('Missing handling fixture');

    const decision = authorizeOperation(data, 'USR-004', 'handling.confirm', {
      handling,
      stationId: handling.stationId,
      flightRequest: request(data, 'FR-20260706-002'),
      route: routeForRequest(data, 'FR-20260706-002')
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('OUTSIDE_STATION_SCOPE');
  });

  it('prevents Finance Reviewer from changing flight status or closing flights', () => {
    const data = cloneSeed();
    const activeFlight = flight(data, 'FLT-AMA-0706-002');

    const statusDecision = authorizeOperation(data, 'USR-006', 'flight.following.update', {
      flight: activeFlight,
      route: routeForFlight(data, activeFlight.id),
      nextStatus: 'LANDED'
    });
    const closeDecision = authorizeOperation(data, 'USR-006', 'flight.closure.create', {
      flight: activeFlight,
      route: routeForFlight(data, activeFlight.id),
      note: 'Finance cannot close this flight.'
    });

    expect(statusDecision.allowed).toBe(false);
    expect(statusDecision.reason).toBe('MISSING_PERMISSION');
    expect(closeDecision.allowed).toBe(false);
    expect(closeDecision.reason).toBe('MISSING_PERMISSION');
  });

  it('allows OCC to close only a landed flight with actual arrival', () => {
    const data = cloneSeed();
    const activeFlight = flight(data, 'FLT-AMA-0706-002');

    const airborneDecision = authorizeOperation(data, 'USR-002', 'flight.closure.create', {
      flight: activeFlight,
      route: routeForFlight(data, activeFlight.id),
      note: 'Closure note'
    });

    activeFlight.status = 'LANDED';
    activeFlight.actualArrivalAt = '2026-07-06T08:10:00+09:00';
    const landedDecision = authorizeOperation(data, 'USR-002', 'flight.closure.create', {
      flight: activeFlight,
      route: routeForFlight(data, activeFlight.id),
      note: 'Closure note'
    });

    expect(airborneDecision.allowed).toBe(false);
    expect(airborneDecision.reason).toBe('INVALID_WORKFLOW_STATE');
    expect(landedDecision.allowed).toBe(true);
  });

  it('denies action when its tenant module is inactive', () => {
    const data = cloneSeed();
    const financeModule = data.tenantModules.find((module) => module.moduleKey === 'finance-handoff');
    if (!financeModule) throw new Error('Missing finance module');
    financeModule.status = 'DISABLED';

    const decision = authorizeOperation(data, 'USR-006', 'finance_handoff.review', {
      flight: flight(data, 'FLT-AMA-0705-009'),
      route: routeForFlight(data, 'FLT-AMA-0705-009')
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('MODULE_DISABLED');
  });

  it('allows Chief of Pilot to approve the ready happy-path request', () => {
    const data = cloneSeed();
    const decision = authorizeOperation(data, 'USR-003', 'flight_request.approve', {
      flightRequest: request(data, 'FR-20260706-001'),
      readiness: readiness(data, 'FR-20260706-001'),
      route: routeForRequest(data, 'FR-20260706-001')
    });

    expect(decision.allowed).toBe(true);
  });

  it('blocks invalid flight-following state transitions', () => {
    const data = cloneSeed();
    const activeFlight = flight(data, 'FLT-AMA-0706-002');
    const invalidNextStatus: FlightStatus = 'CLOSED';

    const decision = authorizeOperation(data, 'USR-002', 'flight.following.update', {
      flight: activeFlight,
      route: routeForFlight(data, activeFlight.id),
      nextStatus: invalidNextStatus
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('INVALID_TRANSITION');
  });
});
