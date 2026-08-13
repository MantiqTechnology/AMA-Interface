import { expect, test, type APIResponse, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

type ApiEnvelope<T> =
  { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

async function setRole(context: BrowserContext, baseURL: string | undefined, role: string) {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.clearCookies();
  await context.addCookies([{ name: 'ama_demo_role', value: role, url: cookieUrl }]);
}

async function unwrap<T>(response: APIResponse): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok() || !payload.ok) {
    throw new Error(`API setup failed ${response.status()}: ${JSON.stringify(payload, null, 2)}`);
  }
  return payload.data;
}

async function clickResourceTab(page: Page, name: 'Tool' | 'Personnel' | 'MRO Eligibility') {
  await page.getByRole('tab', { name }).click();
}

async function createScheduledResourceWorkPackage(
  page: Page,
  options: {
    title: string;
    aircraftId: string;
    bayId: string;
    startAt: string;
    endAt: string;
    suffix: string;
  }
) {
  const workPackage = await unwrap<{ id: string }>(
    await page.request.post('/api/maintenance/work-packages', {
      data: {
        aircraftId: options.aircraftId,
        title: options.title,
        priority: 'NORMAL',
        executionMode: 'INTERNAL',
        planningNote: 'M6 browser verification package.'
      }
    })
  );

  await unwrap(
    await page.request.post(`/api/maintenance/work-packages/${workPackage.id}/maintenance-slots`, {
      data: {
        facilityId: 'mfac-djj-sentani',
        areaId: 'marea-djj-hangar-01',
        bayId: options.bayId,
        plannedStartAt: options.startAt,
        plannedEndAt: options.endAt,
        idempotencyKey: `m6-slot-${options.suffix}`
      }
    })
  );

  for (const resourceType of ['MATERIAL', 'PERSONNEL', 'TOOL'] as const) {
    await unwrap(
      await page.request.post(
        `/api/maintenance/work-packages/${workPackage.id}/resource-declarations`,
        {
          data: {
            resourceType,
            declaration: resourceType === 'MATERIAL' ? 'NOT_REQUIRED' : 'REQUIRED',
            reason:
              resourceType === 'MATERIAL'
                ? 'M6 browser verification focuses on personnel and tools.'
                : undefined
          }
        }
      )
    );
  }

  const personnelRequirement = await unwrap<{ id: string }>(
    await page.request.post(
      `/api/maintenance/work-packages/${workPackage.id}/personnel-requirements`,
      {
        data: {
          workPackageId: workPackage.id,
          roleType: 'MECHANIC',
          requiredCount: 1,
          requiredLicenceType: 'AMEL',
          requiredAuthorization: 'MECHANIC_SIGN_OFF',
          dutyStationId: 'st-djj',
          requiredFrom: options.startAt,
          requiredUntil: options.endAt
        }
      }
    )
  );

  const toolRequirement = await unwrap<{ id: string }>(
    await page.request.post(`/api/maintenance/work-packages/${workPackage.id}/tool-requirements`, {
      data: {
        workPackageId: workPackage.id,
        toolType: 'MROV2_TEST_EQUIPMENT',
        quantity: 1,
        requiredStationId: 'st-djj',
        requiredFrom: options.startAt,
        requiredUntil: options.endAt
      }
    })
  );

  return {
    workPackageId: workPackage.id,
    personnelRequirementId: personnelRequirement.id,
    toolRequirementId: toolRequirement.id
  };
}

test('plays M6 personnel and tool control through Work Package resources UI', async ({
  baseURL,
  context,
  page
}) => {
  test.setTimeout(120_000);
  const artifactDir = path.join('artifacts', 'mro-demo-v3-m6');
  mkdirSync(artifactDir, { recursive: true });
  const output = (name: string) => path.join(artifactDir, name);
  const suffix = Date.now().toString();
  const startAt = '2026-08-10T00:00:00.000Z';
  const endAt = '2026-08-10T08:00:00.000Z';

  await setRole(context, baseURL, 'Maintenance Manager');
  const primary = await createScheduledResourceWorkPackage(page, {
    title: `M6 personnel tools verification ${suffix}`,
    aircraftId: 'ac-pk-mra',
    bayId: 'mbay-djj-hgr01-a',
    startAt,
    endAt,
    suffix: `${suffix}-a`
  });
  const conflict = await createScheduledResourceWorkPackage(page, {
    title: `M6 conflict verification ${suffix}`,
    aircraftId: 'ac-pk-mrb',
    bayId: 'mbay-djj-hgr01-b',
    startAt,
    endAt,
    suffix: `${suffix}-b`
  });

  await page.goto(`/maintenance/work-packages/${primary.workPackageId}`, {
    waitUntil: 'networkidle'
  });
  await page.screenshot({ path: output('01-resource-readiness.png'), fullPage: true });

  await clickResourceTab(page, 'Personnel');
  await expect(page.getByText('Personnel Requirements')).toBeVisible();
  await page.screenshot({ path: output('02-personnel-requirement.png'), fullPage: true });
  await page.getByRole('button', { name: 'Kandidat' }).first().click();
  await expect(page.getByText('ELIGIBLE').first()).toBeVisible();
  await page.screenshot({ path: output('03-personnel-candidates.png'), fullPage: true });
  await page.locator('button:not([disabled])', { hasText: 'Assign' }).first().click();
  await expect(page.getByText('Personnel Assignments')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm' }).first().click();
  await expect(page.getByText('CONFIRMED').first()).toBeVisible();
  await page.screenshot({ path: output('05-personnel-ready.png'), fullPage: true });

  await clickResourceTab(page, 'Tool');
  await expect(page.getByText('Tool Requirements')).toBeVisible();
  await page.screenshot({ path: output('06-tool-requirement.png'), fullPage: true });
  await page.getByRole('button', { name: 'Kandidat' }).first().click();
  await expect(page.getByText('TOOL_CALIBRATION_EXPIRED')).toBeVisible();
  await page.screenshot({ path: output('07-tool-calibration-rejected.png'), fullPage: true });
  await page.locator('button:not([disabled])', { hasText: 'Allocate' }).first().click();
  await expect(page.getByText('Tool Allocations')).toBeVisible();
  await page.screenshot({ path: output('08-tool-allocated.png'), fullPage: true });

  await clickResourceTab(page, 'MRO Eligibility');
  await expect(
    page.getByText(/Resource readiness terpenuhi|Resource readiness belum terpenuhi/u)
  ).toBeVisible();
  await page.screenshot({ path: output('09-resource-ready.png'), fullPage: true });

  await clickResourceTab(page, 'Tool');
  await page.getByRole('button', { name: 'Check Out' }).first().click();
  await expect(page.getByText('IN_USE').first()).toBeVisible();
  await page.screenshot({ path: output('11-tool-custody.png'), fullPage: true });
  await page.getByRole('button', { name: 'Return' }).first().click();
  await expect(page.getByText('RETURNED').first()).toBeVisible();
  await page.screenshot({ path: output('12-tool-returned.png'), fullPage: true });

  await page.goto(`/maintenance/work-packages/${conflict.workPackageId}`, {
    waitUntil: 'networkidle'
  });
  await clickResourceTab(page, 'Personnel');
  await page.getByRole('button', { name: 'Kandidat' }).first().click();
  await expect(page.getByText('PERSONNEL_SCHEDULE_CONFLICT')).toBeVisible();
  await page.screenshot({ path: output('10-resource-conflict.png'), fullPage: true });

  await page.goto(`/maintenance/work-packages/mwp-mrov21-expired-auth`, {
    waitUntil: 'networkidle'
  });
  await clickResourceTab(page, 'Personnel');
  await page.getByRole('button', { name: 'Kandidat' }).first().click();
  await expect(page.getByText(/AUTHORIZATION_EXPIRED|AUTHORIZATION_/u).first()).toBeVisible();
  await page.screenshot({ path: output('04-personnel-not-eligible.png'), fullPage: true });
});
