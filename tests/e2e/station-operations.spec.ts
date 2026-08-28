import { expect, test, type Page } from '@playwright/test';

const DEMO_SEED_DATE = '2026-07-17';

async function gotoStationOps(page: Page) {
  await page.goto(`/flights/station-operations?stationCode=DJJ&date=${DEMO_SEED_DATE}`, {
    waitUntil: 'networkidle'
  });
  await expect(page.getByRole('heading', { name: 'Station Operations' })).toBeVisible();
}

async function setOperationalDate(page: Page, date: string) {
  await page.goto(`/flights/station-operations?stationCode=DJJ&date=${date}`, {
    waitUntil: 'networkidle'
  });
}

async function waitForStationOperationsResponse(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/api/flight-operations/station-operations') && response.ok()
  );
}

test('station operations desk loads flights for seed date', async ({ page }) => {
  await gotoStationOps(page);

  const responsePromise = waitForStationOperationsResponse(page);
  await setOperationalDate(page, DEMO_SEED_DATE);
  const response = await responsePromise;

  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.data.length).toBeGreaterThan(0);
});

test('station workspace without a date opens the latest actionable shift', async ({
  context,
  page
}) => {
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Station Admin', url: 'http://localhost:3100' }
  ]);
  await page.goto('/flights/station-operations', { waitUntil: 'networkidle' });

  await expect(page).toHaveURL(/stationCode=WMX&date=\d{4}-\d{2}-\d{2}/u);
  await expect(page.getByRole('heading', { name: 'Prioritas kesiapan flight' })).toBeVisible();
  await expect(page.locator('main table').first().locator('tbody tr').first()).toBeVisible();
});

test('station operations shows flight board for seed date', async ({ page }) => {
  await gotoStationOps(page);
  await setOperationalDate(page, DEMO_SEED_DATE);

  await expect(page.getByRole('heading', { name: 'Prioritas kesiapan flight' })).toBeVisible();

  const firstTableRows = page.locator('main table').first().locator('tbody tr');
  await expect(firstTableRows.first()).toBeVisible();
  await expect(firstTableRows).toHaveCount(3);
});

test('station operations opens service and cost creation dialogs', async ({ page }) => {
  await gotoStationOps(page);

  await page.getByRole('tab', { name: 'Services' }).click();
  await page.getByRole('button', { name: 'Create Service' }).click();
  await expect(page.getByRole('heading', { name: 'Create Station Service' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('tab', { name: 'Costs' }).click();
  await page.getByRole('button', { name: 'Create Cost' }).click();
  await expect(page.getByRole('heading', { name: 'Create Station Cost' })).toBeVisible();
});

test('station operations exposes actual closure and technical handoff workbenches', async ({
  context,
  page
}) => {
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Station Admin', url: 'http://localhost:3100' }
  ]);
  await page.goto(
    `/flights/station-operations/actual-closure?stationCode=WMX&date=${DEMO_SEED_DATE}`,
    { waitUntil: 'networkidle' }
  );
  await expect(page.getByRole('heading', { name: 'Actual & Closure Station' })).toBeVisible();
  await expect(page.getByText('Kesiapan closure', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Handoff MRO' }).click();
  await expect(page.getByRole('heading', { name: 'Temuan Teknis & Handoff MRO' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Laporkan temuan' })).toBeVisible();
  await expect(page.getByText('Menunggu MRO', { exact: true })).toBeVisible();
});

test('switching station updates the flight board', async ({ page }) => {
  await gotoStationOps(page);
  await setOperationalDate(page, DEMO_SEED_DATE);

  const responsePromise = waitForStationOperationsResponse(page);
  const stationSelect = page.getByRole('combobox', { name: 'Station' });
  await stationSelect.press('ArrowDown');
  await page.getByRole('option', { name: /WMX/u }).click();
  await responsePromise;

  await expect(page.getByText(/WMX -/u).first()).toBeVisible();
});

test('station task actions open their required dialogs', async ({ page }) => {
  await gotoStationOps(page);
  await page.getByRole('tab', { name: 'Verification' }).click();

  await expect(page.getByRole('button', { name: 'Add evidence' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Start task' }).first().click();
  await expect(page.getByRole('button', { name: 'Add evidence' }).first()).toBeVisible();

  const addEvidence = page.getByRole('button', { name: 'Add evidence' }).first();
  await expect(addEvidence).toBeVisible();
  await addEvidence.click();
  await expect(page.getByRole('heading', { name: 'Add Task Evidence' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  const rejectTask = page.getByRole('button', { name: 'Reject task' }).first();
  if (await rejectTask.isVisible()) {
    await rejectTask.click();
    await expect(page.getByRole('heading', { name: 'Reject Station Task' })).toBeVisible();
  }
});

test('verification evidence persists after reload', async ({ page }) => {
  await gotoStationOps(page);
  await setOperationalDate(page, DEMO_SEED_DATE);

  const beforeResponse = await page.request.get(
    `/api/flight-operations/station-operations?stationCode=DJJ&operationalDate=${DEMO_SEED_DATE}`
  );
  const before = await beforeResponse.json();
  const task = before.data
    .flatMap(
      (flight: {
        tasks: Array<{ id: string; evidenceCount: number; version: number; status: string }>;
      }) => flight.tasks
    )
    .find((candidate: { status: string }) => candidate.status === 'PENDING');
  expect(task).toBeTruthy();

  const startResponse = await page.request.post(
    `/api/flight-operations/station-tasks/${task.id}/actions/start`,
    {
      data: {
        expectedVersion: task.version
      }
    }
  );
  expect(startResponse.ok()).toBe(true);
  const started = await startResponse.json();

  const evidenceResponse = await page.request.post(
    `/api/flight-operations/station-tasks/${task.id}/evidence`,
    {
      data: {
        expectedVersion: started.data.version,
        fileName: `playwright-${Date.now()}.pdf`,
        documentType: 'STATION_OPERATION_EVIDENCE',
        notes: 'Persistent E2E evidence'
      }
    }
  );
  expect(evidenceResponse.ok()).toBe(true);

  await page.reload({ waitUntil: 'networkidle' });
  const afterResponse = await page.request.get(
    `/api/flight-operations/station-operations?stationCode=DJJ&operationalDate=${DEMO_SEED_DATE}`
  );
  const after = await afterResponse.json();
  const persisted = after.data
    .flatMap((flight: { tasks: Array<{ id: string; evidenceCount: number }> }) => flight.tasks)
    .find((candidate: { id: string }) => candidate.id === task.id);
  expect(persisted.evidenceCount).toBeGreaterThan(task.evidenceCount);
});

test('station scope is enforced by the server', async ({ page }) => {
  const denied = await page.request.get(
    `/api/flight-operations/station-operations?stationCode=DJJ&operationalDate=${DEMO_SEED_DATE}`,
    { headers: { cookie: 'ama_demo_role=Station%20Admin' } }
  );
  expect(denied.status()).toBe(403);
  const body = await denied.json();
  expect(body.error.code).toBe('FLIGHT_STATION_FORBIDDEN');
});

test('Director can view the station network dashboard', async ({ context, page }) => {
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Director', url: 'http://localhost:3100' }
  ]);
  await page.goto('/flights/station-operations/network?period=THIS_MONTH&anchorDate=2026-07-17', {
    waitUntil: 'networkidle'
  });

  await expect(page.getByRole('heading', { name: 'Network Dashboard' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
  await expect(page.getByText('Flight berisiko', { exact: true })).toBeVisible();
});
