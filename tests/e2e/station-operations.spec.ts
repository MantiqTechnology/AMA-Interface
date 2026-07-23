import { expect, test, type Page } from '@playwright/test';

const DEMO_SEED_DATE = '2026-07-17';

async function gotoStationOps(page: Page) {
  await page.goto('/flights/station-operations', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Station Operations Desk' })).toBeVisible();
}

async function setOperationalDate(page: Page, date: string) {
  const datePicker = page.locator('main input[type="date"]').first();
  await datePicker.fill(date);
  await page.keyboard.press('Escape');
  await expect(page.locator('main input[type="date"]').first()).toHaveValue(date);
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

test('station operations shows flight board for seed date', async ({ page }) => {
  await gotoStationOps(page);
  await setOperationalDate(page, DEMO_SEED_DATE);

  await expect(page.getByRole('heading', { name: 'Flight Board' })).toBeVisible();

  const firstTableRows = page.locator('main table').first().locator('tbody tr');
  await expect(firstTableRows.first()).toBeVisible();
  await expect(firstTableRows).toHaveCount(3);
});

test('station operations shows services and costs sections', async ({ page }) => {
  await gotoStationOps(page);
  await setOperationalDate(page, DEMO_SEED_DATE);

  await expect(page.getByRole('heading', { name: 'Services' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Costs' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Service' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Cost' })).toBeVisible();
});

test('switching station updates the flight board', async ({ page }) => {
  await gotoStationOps(page);
  await setOperationalDate(page, DEMO_SEED_DATE);

  const responsePromise = waitForStationOperationsResponse(page);
  const stationSelect = page.locator('main').getByRole('combobox').first();
  await stationSelect.click();
  await page.getByRole('option', { name: 'Wamena' }).click();
  await responsePromise;

  await expect(page.getByRole('heading', { name: 'Flight Board' })).toBeVisible();
  await expect(page.getByText('All flights for WMX on 17 Jul 2026')).toBeVisible();
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
      (flight: { tasks: Array<{ id: string; evidenceCount: number; version: number }> }) =>
        flight.tasks
    )
    .find((candidate: { id: string }) => candidate.id);
  expect(task).toBeTruthy();

  const evidenceResponse = await page.request.post(
    `/api/flight-operations/station-tasks/${task.id}/evidence`,
    {
      data: {
        expectedVersion: task.version,
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
