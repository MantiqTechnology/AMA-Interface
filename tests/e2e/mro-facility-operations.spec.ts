import { expect, test, type APIResponse, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

type ApiEnvelope<T> =
  { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

type WorkPackageDetail = {
  id: string;
  version: number;
  release?: { releaseNumber: string } | null;
  currentMaintenanceSlot?: Slot | null;
};

type Slot = {
  id: string;
  workPackageId: string;
  packageNumber: string;
  aircraftId: string;
  aircraftRegistrationNumber: string;
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

type GseRequirement = { id: string; equipmentType: string };
type GseCandidate = { assetId: string; assetCode: string; eligible: boolean; reasons: string[] };
type GseAllocation = { id: string; assetId: string; status: string };
type ToolAllocation = { id: string; status: string };
type Custody = {
  id: string;
  status: string;
  actualStartAt: string | null;
  handedBackAt: string | null;
};
type Shift = { id: string; name: string };
type Handover = { id: string; status: string };
type FlightDetail = {
  id: string;
  aircraftTechnicalEligibility: { status: string } | null;
  maintenanceOperationalAvailability: { status: string; available: boolean } | null;
  readinessChecks: Array<{ checkCode: string; status: string; resultNote: string }>;
};
type FacilityOperations = {
  occupancy: { slots: Slot[] };
  custodies: Custody[];
};

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
  return path.join('artifacts', 'mro-demo-v3-m85', name);
}

async function openFacility(page: Page, packageNumber = 'MWP-MROV1-RTS') {
  await page.goto('/maintenance/facility-operations', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Facility Operations' })).toBeVisible();
  const slotItem = page.getByText(new RegExp(packageNumber, 'u')).first();
  await expect(slotItem).toBeVisible();
  await slotItem.click();
  await expect(page.getByText(`PK-MRA / ${packageNumber}`)).toBeVisible();
}

async function screenshotFacility(page: Page, name: string) {
  await openFacility(page);
  await page.screenshot({ path: output(name), fullPage: true });
}

function maintenanceOperationalCheck(flight: FlightDetail) {
  return flight.readinessChecks.find(
    (check) => check.checkCode === 'MAINTENANCE_OPERATIONAL_AVAILABILITY'
  );
}

test('M8.5 facility operations browser closure captures readiness, movement, handover, release, and handback', async ({
  baseURL,
  context,
  page
}) => {
  test.setTimeout(180_000);
  mkdirSync(path.join('artifacts', 'mro-demo-v3-m85'), { recursive: true });

  const workPackageId = 'mwp-mrov1-release-ready';
  const aircraftId = 'ac-pk-mra';
  const slotStart = '2026-08-10T08:00:00+09:00';
  const slotEnd = '2026-08-10T16:00:00+09:00';

  await setRole(context, baseURL, 'Maintenance Manager');

  const slot = await unwrap<Slot>(
    await page.request.post(`/api/maintenance/work-packages/${workPackageId}/maintenance-slots`, {
      data: {
        facilityId: 'mfac-djj-sentani',
        areaId: 'marea-djj-hangar-01',
        bayId: 'mbay-djj-hgr01-a',
        plannedStartAt: slotStart,
        plannedEndAt: slotEnd,
        idempotencyKey: 'm85-e2e-release-ready-slot'
      }
    })
  );

  await openFacility(page);
  await page.screenshot({ path: output('01-facility-operations.png'), fullPage: true });

  const [toolAllocation] = await unwrap<ToolAllocation[]>(
    await page.request.get(`/api/maintenance/work-packages/${workPackageId}/tool-allocations`)
  );
  expect(toolAllocation?.id).toBeTruthy();
  await unwrap(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/tool-stage`, {
      data: {
        allocationId: toolAllocation.id,
        idempotencyKey: 'm85-e2e-tool-stage'
      }
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
          notes: 'M8.5 browser verification GPU requirement'
        }
      })
    ));

  const blockedReadiness = await unwrap<SlotReadiness>(
    await page.request.get(`/api/maintenance/maintenance-slots/${slot.id}/readiness`)
  );
  expect(blockedReadiness.dimensions.facility.status).toBe('READY');
  expect(blockedReadiness.dimensions.material.status).toBe('READY');
  expect(blockedReadiness.dimensions.personnel.status).toBe('READY');
  expect(blockedReadiness.dimensions.tools.status).toBe('READY');
  expect(blockedReadiness.dimensions.gse.status).toBe('BLOCKED');
  expect(blockedReadiness.status).toBe('BLOCKED');
  await screenshotFacility(page, '02-slot-readiness-blocked.png');

  await openFacility(page);
  await page.getByRole('button', { name: 'Candidates' }).first().click();
  await expect(page.getByText('GSE-00002')).toBeVisible();
  await expect(page.getByText('GSE-00001')).toBeVisible();
  await page.screenshot({ path: output('03-gse-candidates.png'), fullPage: true });

  const candidates = await unwrap<GseCandidate[]>(
    await page.request.get(
      `/api/maintenance/work-packages/${workPackageId}/gse-requirements/${requirement.id}/candidates`
    )
  );
  expect(candidates.find((item) => item.assetId === 'asset-gse-gpu-02')?.eligible).toBe(true);
  expect(candidates.find((item) => item.assetId === 'asset-gse-gpu-01')?.eligible).toBe(false);

  const allocation = await unwrap<GseAllocation>(
    await page.request.post(`/api/maintenance/work-packages/${workPackageId}/gse-allocations`, {
      data: {
        requirementId: requirement.id,
        assetId: 'asset-gse-gpu-02',
        idempotencyKey: 'm85-e2e-gse-allocation'
      }
    })
  );
  await unwrap(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/gse-stage`, {
      data: {
        allocationId: allocation.id,
        idempotencyKey: 'm85-e2e-gse-stage'
      }
    })
  );
  await screenshotFacility(page, '04-gse-staged.png');

  const readyReadiness = await unwrap<SlotReadiness>(
    await page.request.get(`/api/maintenance/maintenance-slots/${slot.id}/readiness`)
  );
  expect(readyReadiness.status).toBe('READY');
  expect(readyReadiness.dimensions.gse.status).toBe('READY');
  await screenshotFacility(page, '05-facility-ready.png');

  const movingIn = await unwrap<Custody>(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/move-in-request`, {
      data: { note: 'M8.5 browser move-in', idempotencyKey: 'm85-e2e-move-in' }
    })
  );
  expect(movingIn.status).toBe('MOVING_IN');
  await screenshotFacility(page, '06-aircraft-move-in.png');

  const inBay = await unwrap<Custody>(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/confirm-in-bay`, {
      data: { note: 'M8.5 browser in bay' }
    })
  );
  expect(inBay.status).toBe('IN_BAY');
  expect(inBay.actualStartAt).toBeTruthy();
  await screenshotFacility(page, '07-aircraft-in-bay.png');
  await screenshotFacility(page, '08-actual-occupancy.png');
  await screenshotFacility(page, '09-manpower-capacity.png');

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
        remarks: 'M8.5 operational availability closure flight',
        directCreationReason: 'M8.5 facility operations browser verification flight.'
      }
    })
  );

  await setRole(context, baseURL, 'Maintenance Manager');
  const shiftA = await unwrap<Shift>(
    await page.request.post('/api/maintenance/facility-operations/shifts', {
      data: {
        facilityId: 'mfac-djj-sentani',
        shiftDate: '2026-08-10',
        name: 'Shift A',
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
        name: 'Shift B',
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
        notes: 'Panels open, GPU staged, aircraft remains in Bay A.',
        safetyNotes: ['Panels open', 'Electrical power isolated']
      }
    })
  );
  expect(handover.status).toBe('PREPARED');
  await screenshotFacility(page, '10-shift-handover-prepared.png');

  const acknowledged = await unwrap<Handover>(
    await page.request.post(
      `/api/maintenance/facility-operations/shift-handovers/${handover.id}/acknowledge`,
      { data: { note: 'Incoming shift accepted M8.5 handover context.' } }
    )
  );
  expect(acknowledged.status).toBe('ACKNOWLEDGED');
  await screenshotFacility(page, '11-shift-handover-acknowledged.png');

  await setRole(context, baseURL, 'Certifying Staff');
  await unwrap<WorkPackageDetail>(
    await page.request.post(`/api/maintenance/work-packages/${workPackageId}/actions/release`, {
      data: {
        expectedVersion: 4,
        releaseNumber: 'RTS-M85-E2E-001',
        resultingStatus: 'SERVICEABLE',
        releaseStatement:
          'Technical release issued during M8.5 browser verification while aircraft remains in maintenance facility custody.',
        certifyingLicenseNumber: 'AME-CERT-MRO-001',
        releasedAt: '2026-08-10T03:00:00.000Z',
        evidenceReferences: ['M85-E2E-TECHNICAL-RELEASE'],
        idempotencyKey: 'm85-e2e-technical-release'
      }
    })
  );
  await page.goto(`/maintenance/work-packages/${workPackageId}`, { waitUntil: 'networkidle' });
  await expect(
    page.getByText(/Rilis teknis selesai|Snapshot wewenang signer|RTS-M85-E2E-001/u).first()
  ).toBeVisible();
  await page.screenshot({ path: output('12-technical-release-in-bay.png'), fullPage: true });

  await setRole(context, baseURL, 'OCC');
  const inFacilityFlight = await unwrap<FlightDetail>(
    await page.request.post(`/api/flight-operations/flights/${flight.id}/actions/evaluate`)
  );
  expect(inFacilityFlight.aircraftTechnicalEligibility?.status).toBe('ELIGIBLE');
  expect(inFacilityFlight.maintenanceOperationalAvailability?.available).toBe(false);
  expect(maintenanceOperationalCheck(inFacilityFlight)?.status).toBe('FAIL');
  await page.goto(`/flights/${flight.id}`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Maintenance operational availability')).toBeVisible();
  await page.screenshot({ path: output('13-flight-blocked-in-facility.png'), fullPage: true });

  await setRole(context, baseURL, 'Maintenance Manager');
  const readyForMoveOut = await unwrap<Custody>(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/ready-for-move-out`, {
      data: { note: 'Technical release complete; ready for move-out.' }
    })
  );
  expect(readyForMoveOut.status).toBe('READY_FOR_MOVE_OUT');
  const movingOut = await unwrap<Custody>(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/move-out`, {
      data: { note: 'M8.5 browser move-out', idempotencyKey: 'm85-e2e-move-out' }
    })
  );
  expect(movingOut.status).toBe('MOVING_OUT');
  await screenshotFacility(page, '14-aircraft-move-out.png');

  const handedBack = await unwrap<Custody>(
    await page.request.post(`/api/maintenance/maintenance-slots/${slot.id}/handback`, {
      data: { note: 'M8.5 browser handback', idempotencyKey: 'm85-e2e-handback' }
    })
  );
  expect(handedBack.status).toBe('HANDED_BACK');
  expect(handedBack.handedBackAt).toBeTruthy();
  await screenshotFacility(page, '15-maintenance-handback.png');

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
  await screenshotFacility(page, '16-slot-completed.png');
  await screenshotFacility(page, '17-planned-vs-actual-timeline.png');

  await setRole(context, baseURL, 'OCC');
  const afterHandbackFlight = await unwrap<FlightDetail>(
    await page.request.post(`/api/flight-operations/flights/${flight.id}/actions/evaluate`)
  );
  expect(afterHandbackFlight.aircraftTechnicalEligibility?.status).toBe('ELIGIBLE');
  expect(afterHandbackFlight.maintenanceOperationalAvailability?.status).toBe('AVAILABLE');
  expect(maintenanceOperationalCheck(afterHandbackFlight)?.status).toBe('PASS');
  await page.goto(`/flights/${flight.id}?tab=readiness`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Maintenance operational availability')).toBeVisible();
  await expect(
    page.getByText('Aircraft is not physically held by Maintenance facility custody.')
  ).toBeVisible();
  await page.screenshot({ path: output('18-flight-after-handback.png'), fullPage: true });
});
