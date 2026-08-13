import { expect, test, type APIResponse, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

type ApiEnvelope<T> =
  { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

type AircraftAirworthiness = {
  aircraft: { id: string; version: number };
  defects: Array<{ id: string; sourceReference: string | null }>;
};
type AircraftDetail = { id: string; version: number };

type WorkPackageDetail = {
  id: string;
  version: number;
  release?: { releaseNumber: string } | null;
};

type Slot = {
  id: string;
  status: string;
  actualStartAt: string | null;
  actualEndAt: string | null;
};

type SlotReadiness = {
  status: string;
  dimensions: {
    facility: { status: string };
    material: { status: string };
    personnel: { status: string };
    tools: { status: string };
    gse: { status: string };
  };
};

type ToolAllocation = { id: string };
type GseRequirement = { id: string; equipmentType: string };
type GseAllocation = { id: string; status: string };
type Custody = {
  id: string;
  status: string;
  actualStartAt: string | null;
  actualEndAt: string | null;
};
type Shift = { id: string; name: string };
type Handover = { id: string; status: string };
type FlightDetail = {
  id: string;
  version: number;
  readinessRevision: number;
  currentStatus: string;
  aircraftTechnicalEligibility: { status: string } | null;
  maintenanceOperationalAvailability: { status: string; available: boolean } | null;
  readinessChecks: Array<{
    checkCode: string;
    status: string;
    effectiveStatus: string;
    resultNote: string;
  }>;
};
type FacilityOperations = { occupancy: { slots: Slot[] } };

const artifactDir = path.join('artifacts', 'mro-demo-v3-m9');

async function setRole(context: BrowserContext, baseURL: string | undefined, role: string) {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.clearCookies();
  await context.addCookies([{ name: 'ama_demo_role', value: role, url: cookieUrl }]);
}

async function unwrap<T>(response: APIResponse): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok() || !payload.ok) {
    throw new Error(`API call failed ${response.status()}: ${JSON.stringify(payload, null, 2)}`);
  }
  return payload.data;
}

function output(name: string) {
  return path.join(artifactDir, name);
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: output(name), fullPage: true });
}

async function openFacility(page: Page, packageNumber = 'MWP-MROV1-RTS') {
  await page.goto('/maintenance/facility-operations', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Facility Operations' })).toBeVisible();
  await expect(page.getByText(packageNumber).first()).toBeVisible();
  await page.getByText(packageNumber).first().click();
}

async function reportAndAssessNoGo(
  page: Page,
  aircraftId: string,
  sourceReference: string,
  title: string
) {
  const before = await unwrap<AircraftAirworthiness | AircraftDetail>(
    await page.request.get(`/api/master-data/aircraft/${aircraftId}`)
  );
  const expectedVersion = 'aircraft' in before ? before.aircraft.version : before.version;
  const reported = await unwrap<AircraftAirworthiness>(
    await page.request.post(`/api/master-data/aircraft/${aircraftId}/defects`, {
      data: {
        title,
        description: `${title} reported during M9 final acceptance verification.`,
        detectedAt: '2026-08-10T05:00:00.000Z',
        reporterObservation: 'APPEARS_CRITICAL',
        initialSeverity: 'CRITICAL',
        operationalImpact:
          'Aircraft must not be dispatched until maintenance assessment clears it.',
        flightPhase: 'PRE_DEPARTURE',
        stationId: 'st-djj',
        sourceReference,
        evidenceReferences: [sourceReference],
        expectedVersion
      }
    })
  );
  const defect = reported.defects.find((item) => item.sourceReference === sourceReference);
  expect(defect?.id).toBeTruthy();
  await unwrap(
    await page.request.post(`/api/maintenance/defects/${defect!.id}/actions/assess`, {
      data: {
        assessmentDecision: 'GROUND',
        assessmentNote: `${sourceReference}: Maintenance Control confirms NO-GO for final acceptance.`
      }
    })
  );
  return defect!.id;
}

function maintenanceOperationalCheck(flight: FlightDetail) {
  return flight.readinessChecks.find(
    (check) => check.checkCode === 'MAINTENANCE_OPERATIONAL_AVAILABILITY'
  );
}

test('M9 final Demo-v3 acceptance evidence covers MRO, facility, and Flight integration', async ({
  baseURL,
  context,
  page
}) => {
  test.setTimeout(240_000);
  mkdirSync(artifactDir, { recursive: true });

  const workPackageId = 'mwp-mrov1-release-ready';
  const aircraftId = 'ac-pk-mra';
  const slotStart = '2026-08-10T08:00:00+09:00';
  const slotEnd = '2026-08-10T16:00:00+09:00';

  await setRole(context, baseURL, 'Maintenance Manager');
  await page.goto('/maintenance', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Ringkasan Maintenance' })).toBeVisible();
  await screenshot(page, '01-maintenance-command-overview.png');

  await page.goto('/maintenance/due-control', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Jatuh Tempo Perawatan' })).toBeVisible();
  await screenshot(page, '02-due-to-work-package.png');

  await page.goto(`/maintenance/work-packages/${workPackageId}`, { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { name: 'Starter-generator indication rectification' })
  ).toBeVisible();
  await screenshot(page, '03-resource-readiness.png');

  await reportAndAssessNoGo(
    page,
    'ac-pk-mrb',
    'M9-ACCEPTANCE-NOGO',
    'M9 final acceptance NO-GO blocker'
  );
  await page.goto('/maintenance/defects', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Temuan' })).toBeVisible();
  await expect(
    page.getByText('M9 final acceptance NO-GO blocker', { exact: true }).first()
  ).toBeVisible();
  await screenshot(page, '04-defect-nogo.png');

  await setRole(context, baseURL, 'OCC');
  const restrictedFlight = await unwrap<FlightDetail>(
    await page.request.post('/api/flight-operations/flights', {
      data: {
        flightDate: '2026-08-11',
        flightTypeId: 'flight-type-charter',
        serviceTypeId: 'flight-service-type-charter-cargo',
        priorityId: 'flight-priority-normal',
        routeId: 'route-djj-wmx',
        customerId: 'cust-papua-logistics',
        aircraftId: 'ac-pk-ame',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid-2',
        scheduledDepartureAt: '2026-08-11T01:00:00.000Z',
        scheduledArrivalAt: '2026-08-11T02:10:00.000Z',
        remarks: 'M9 deferred restriction visibility flight.',
        directCreationReason: 'M9 final acceptance deferred restriction visibility.'
      }
    })
  );
  const restrictedEval = await unwrap<FlightDetail>(
    await page.request.post(
      `/api/flight-operations/flights/${restrictedFlight.id}/actions/evaluate`
    )
  );
  expect(restrictedEval.aircraftTechnicalEligibility?.status).toBe('ELIGIBLE_WITH_RESTRICTIONS');
  await page.goto(`/flights/${restrictedFlight.id}`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Aircraft memiliki pembatasan maintenance aktif')).toBeVisible();
  await screenshot(page, '05-deferred-restriction.png');

  await setRole(context, baseURL, 'Certifying Staff');
  await page.goto('/maintenance/work-packages/mwp-mrov1-rework', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { name: 'Landing light intermittent operation rectification' })
  ).toBeVisible();
  await screenshot(page, '06-non-routine-rework.png');

  await setRole(context, baseURL, 'Maintenance Manager');
  const slot = await unwrap<Slot>(
    await page.request.post(`/api/maintenance/work-packages/${workPackageId}/maintenance-slots`, {
      data: {
        facilityId: 'mfac-djj-sentani',
        areaId: 'marea-djj-hangar-01',
        bayId: 'mbay-djj-hgr01-a',
        plannedStartAt: slotStart,
        plannedEndAt: slotEnd,
        idempotencyKey: 'm9-acceptance-slot'
      }
    })
  );
  await page.goto('/maintenance/facility-planning', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Timeline Hangar' })).toBeVisible();
  await screenshot(page, '07-facility-slot.png');

  const [toolAllocation] = await unwrap<ToolAllocation[]>(
    await page.request.get(`/api/maintenance/work-packages/${workPackageId}/tool-allocations`)
  );
  expect(toolAllocation?.id).toBeTruthy();
  await unwrap(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/tool-stage`, {
      data: { allocationId: toolAllocation.id, idempotencyKey: 'm9-tool-stage' }
    })
  );
  const existingGseRequirements = await unwrap<GseRequirement[]>(
    await page.request.get(`/api/maintenance/work-packages/${workPackageId}/gse-requirements`)
  );
  const requirement =
    existingGseRequirements.find((item) => item.equipmentType === 'Ground Power Unit') ??
    (await unwrap<GseRequirement>(
      await page.request.post(`/api/maintenance/work-packages/${workPackageId}/gse-requirements`, {
        data: {
          equipmentType: 'Ground Power Unit',
          quantity: 1,
          mandatory: true,
          notes: 'M9 final acceptance GPU requirement'
        }
      })
    ));
  const blockedReadiness = await unwrap<SlotReadiness>(
    await page.request.get(`/api/maintenance/maintenance-slots/${slot.id}/readiness`)
  );
  expect(blockedReadiness.status).toBe('BLOCKED');
  expect(blockedReadiness.dimensions.gse.status).toBe('BLOCKED');
  const allocation = await unwrap<GseAllocation>(
    await page.request.post(`/api/maintenance/work-packages/${workPackageId}/gse-allocations`, {
      data: {
        requirementId: requirement.id,
        assetId: 'asset-gse-gpu-02',
        idempotencyKey: 'm9-gse-allocation'
      }
    })
  );
  await unwrap(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/gse-stage`, {
      data: { allocationId: allocation.id, idempotencyKey: 'm9-gse-stage' }
    })
  );
  const readyReadiness = await unwrap<SlotReadiness>(
    await page.request.get(`/api/maintenance/maintenance-slots/${slot.id}/readiness`)
  );
  expect(readyReadiness.status).toBe('READY');
  await openFacility(page);
  await screenshot(page, '08-facility-readiness.png');

  const movingIn = await unwrap<Custody>(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/move-in-request`, {
      data: { note: 'M9 final acceptance move-in', idempotencyKey: 'm9-move-in' }
    })
  );
  expect(movingIn.status).toBe('MOVING_IN');
  const inBay = await unwrap<Custody>(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/confirm-in-bay`, {
      data: { note: 'M9 final acceptance in-bay confirmation' }
    })
  );
  expect(inBay.status).toBe('IN_BAY');
  expect(inBay.actualStartAt).toBeTruthy();
  await openFacility(page);
  await screenshot(page, '09-aircraft-in-bay.png');

  await setRole(context, baseURL, 'OCC');
  const flight = await unwrap<FlightDetail>(
    await page.request.post('/api/flight-operations/flights', {
      data: {
        flightDate: '2026-08-10',
        flightTypeId: 'flight-type-charter',
        serviceTypeId: 'flight-service-type-charter-cargo',
        priorityId: 'flight-priority-normal',
        routeId: 'route-djj-wmx',
        customerId: 'cust-papua-logistics',
        aircraftId,
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid-2',
        scheduledDepartureAt: '2026-08-10T01:30:00.000Z',
        scheduledArrivalAt: '2026-08-10T02:30:00.000Z',
        remarks: 'M9 facility custody acceptance flight',
        directCreationReason: 'M9 final acceptance facility custody and handback verification.'
      }
    })
  );

  await setRole(context, baseURL, 'Maintenance Manager');
  const shiftA = await unwrap<Shift>(
    await page.request.post('/api/maintenance/facility-operations/shifts', {
      data: {
        facilityId: 'mfac-djj-sentani',
        shiftDate: '2026-08-10',
        name: 'M9 Shift A',
        startAt: '2026-08-10T07:00:00+09:00',
        endAt: '2026-08-10T15:00:00+09:00'
      }
    })
  );
  const shiftB = await unwrap<Shift>(
    await page.request.post('/api/maintenance/facility-operations/shifts', {
      data: {
        facilityId: 'mfac-djj-sentani',
        shiftDate: '2026-08-10',
        name: 'M9 Shift B',
        startAt: '2026-08-10T15:00:00+09:00',
        endAt: '2026-08-10T23:00:00+09:00'
      }
    })
  );
  const handover = await unwrap<Handover>(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/shift-handovers`, {
      data: {
        outgoingShiftId: shiftA.id,
        incomingShiftId: shiftB.id,
        notes: 'M9 acceptance handover: panels open, GPU staged, aircraft remains in Bay A.',
        safetyNotes: ['Panels open', 'Electrical power isolated']
      }
    })
  );
  expect(handover.status).toBe('PREPARED');
  await unwrap<Handover>(
    await page.request.post(
      `/api/maintenance/facility-operations/shift-handovers/${handover.id}/acknowledge`,
      { data: { note: 'M9 incoming shift accepted handover context.' } }
    )
  );
  await openFacility(page);
  await screenshot(page, '16-shift-handover.png');

  await setRole(context, baseURL, 'Certifying Staff');
  await unwrap<WorkPackageDetail>(
    await page.request.post(`/api/maintenance/work-packages/${workPackageId}/actions/release`, {
      data: {
        expectedVersion: 4,
        releaseNumber: 'RTS-M9-ACCEPT-001',
        resultingStatus: 'SERVICEABLE',
        releaseStatement:
          'Technical release issued during M9 final acceptance while facility custody remains separate.',
        certifyingLicenseNumber: 'AME-CERT-MRO-001',
        releasedAt: '2026-08-10T03:00:00.000Z',
        evidenceReferences: ['M9-FINAL-ACCEPTANCE-TECHNICAL-RELEASE'],
        idempotencyKey: 'm9-technical-release'
      }
    })
  );
  await page.goto(`/maintenance/work-packages/${workPackageId}`, { waitUntil: 'networkidle' });
  await expect(page.getByText('RTS-M9-ACCEPT-001', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Tampilkan Rekam Teknis' }).click();
  await expect(page.getByText('Rekam Teknis Work Package')).toBeVisible();
  await screenshot(page, '10-technical-record.png');
  await screenshot(page, '11-technical-release.png');

  await setRole(context, baseURL, 'OCC');
  const inFacilityFlight = await unwrap<FlightDetail>(
    await page.request.post(`/api/flight-operations/flights/${flight.id}/actions/evaluate`)
  );
  expect(inFacilityFlight.aircraftTechnicalEligibility?.status).toBe('ELIGIBLE');
  expect(inFacilityFlight.maintenanceOperationalAvailability?.available).toBe(false);
  expect(maintenanceOperationalCheck(inFacilityFlight)?.status).toBe('FAIL');
  await page.goto(`/flights/${flight.id}`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Maintenance operational availability')).toBeVisible();
  await screenshot(page, '12-flight-blocked-by-mro.png');

  await page.goto('/flights/fop-ready-approval', { waitUntil: 'networkidle' });
  await expect(
    page.getByText(/Operational Snapshot|Approval Trail|Approver/u).first()
  ).toBeVisible();
  await screenshot(page, '14-flight-release-snapshot.png');

  await setRole(context, baseURL, 'Maintenance Manager');
  const readyForMoveOut = await unwrap<Custody>(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/ready-for-move-out`, {
      data: { note: 'M9 technical release complete; ready for move-out.' }
    })
  );
  expect(readyForMoveOut.status).toBe('READY_FOR_MOVE_OUT');
  await unwrap<Custody>(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/move-out`, {
      data: { note: 'M9 final acceptance move-out', idempotencyKey: 'm9-move-out' }
    })
  );
  const handedBack = await unwrap<Custody>(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/handback`, {
      data: { note: 'M9 final acceptance handback', idempotencyKey: 'm9-handback' }
    })
  );
  expect(handedBack.status).toBe('HANDED_BACK');
  const operations = await unwrap<FacilityOperations>(
    await page.request.get('/api/maintenance/facility-operations', {
      params: {
        dateFrom: '2026-08-09T00:00:00.000Z',
        dateTo: '2026-08-11T00:00:00.000Z'
      }
    })
  );
  const completedSlot = operations.occupancy.slots.find((item) => item.id === slot.id);
  expect(completedSlot?.status).toBe('COMPLETED');
  expect(completedSlot?.actualStartAt).toBeTruthy();
  expect(completedSlot?.actualEndAt).toBeTruthy();
  await openFacility(page);
  await screenshot(page, '17-maintenance-handback.png');

  await setRole(context, baseURL, 'OCC');
  const afterHandbackFlight = await unwrap<FlightDetail>(
    await page.request.post(`/api/flight-operations/flights/${flight.id}/actions/evaluate`)
  );
  expect(afterHandbackFlight.maintenanceOperationalAvailability?.status).toBe('AVAILABLE');
  expect(maintenanceOperationalCheck(afterHandbackFlight)?.status).toBe('PASS');
  await page.goto(`/flights/${flight.id}`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Readiness' }).click();
  await expect(page.getByText('Maintenance operational availability')).toBeVisible();
  await screenshot(page, '13-flight-recovered-after-mro.png');

  await setRole(context, baseURL, 'Maintenance Manager');
  await reportAndAssessNoGo(
    page,
    aircraftId,
    'M9-POST-HANDBACK-NOGO',
    'M9 post-handback NO-GO blocker'
  );
  await setRole(context, baseURL, 'OCC');
  const afterNoGo = await unwrap<FlightDetail>(
    await page.request.post(`/api/flight-operations/flights/${flight.id}/actions/evaluate`)
  );
  expect(afterNoGo.aircraftTechnicalEligibility?.status).toBe('BLOCKED');
  await page.goto(`/flights/${flight.id}`, { waitUntil: 'networkidle' });
  await expect(page.getByText(/NO GO DEFECT|NO-GO|technical eligibility/u).first()).toBeVisible();
  await screenshot(page, '15-departure-rejected-after-new-nogo.png');

  await setRole(context, baseURL, 'Maintenance Manager');
  await page.goto('/maintenance/aircraft', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Status Teknis Pesawat' })).toBeVisible();
  await screenshot(page, '18-final-aircraft-consistency.png');
});
