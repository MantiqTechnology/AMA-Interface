import { expect, test, type BrowserContext } from '@playwright/test';

async function setRole(context: BrowserContext, baseURL: string | undefined, role: string) {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.clearCookies();
  await context.addCookies([{ name: 'ama_demo_role', value: role, url: cookieUrl }]);
}

test('manifest control renders dispatch workspace and prepares passenger and cargo load', async ({
  baseURL,
  context,
  page
}) => {
  await setRole(context, baseURL, 'Station Admin Origin');
  await page.goto('/flights/fop-route-profile-djj-nbx/manifest', { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'Manifest Control' })).toBeVisible();
  await expect(page.getByLabel('Flight manifest metadata')).toContainText('AMA-');
  await expect(page.getByText('Departure not ready')).toBeVisible();
  await expect(page.getByRole('button', { name: /Review Required Actions/u })).toBeVisible();
  await expect(page.locator('.domain-card').filter({ hasText: 'Passenger' })).toBeVisible();
  await expect(page.locator('.domain-card').filter({ hasText: 'Cargo' }).first()).toBeVisible();
  await expect(page.locator('.domain-card').filter({ hasText: 'Dangerous Goods' })).toBeVisible();
  await expect(
    page.locator('.domain-card').filter({ hasText: 'Departure Assurance' })
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Passenger / Patient Manifest' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cargo Manifest' })).toBeVisible();
  await expect(page.getByText('No passenger manifest prepared')).toBeVisible();
  await expect(page.getByText('No cargo manifest prepared')).toBeVisible();
  await expect(page.getByText('Next Required Actions')).toBeVisible();

  await page.getByRole('button', { name: 'Add Passenger' }).first().click();
  const passengerDialog = page.getByRole('dialog');
  await expect(
    passengerDialog.locator('.v-card-title').filter({ hasText: 'Add Passenger' })
  ).toBeVisible();
  await passengerDialog.getByLabel('Full name').fill('Manifest Test Passenger');
  await passengerDialog.getByLabel('Identity number').fill('KTP-MANIFEST-E2E');
  await passengerDialog.getByLabel('Seat').fill('2A');
  await passengerDialog.getByRole('button', { name: 'Add Passenger' }).click();
  await expect(page.getByText('Manifest Test Passenger')).toBeVisible();

  await page.getByRole('button', { name: 'Add Cargo' }).first().click();
  const cargoDialog = page.getByRole('dialog');
  await expect(cargoDialog.locator('.v-card-title').filter({ hasText: 'Add Cargo' })).toBeVisible();
  await cargoDialog.getByLabel('Description').fill('Manifest test cargo');
  await cargoDialog.getByLabel('Actual weight kg').fill('42');
  await cargoDialog.getByLabel('Sender').fill('DJJ Ops');
  await cargoDialog.getByLabel('Receiver').fill('NBX Ops');
  await cargoDialog.getByRole('button', { name: 'Add Cargo' }).click();
  await expect(page.getByText('Manifest test cargo')).toBeVisible();
});

test('manifest control keeps cards, chips, and action buttons contained on smaller viewports', async ({
  baseURL,
  context,
  page
}) => {
  await setRole(context, baseURL, 'Station Admin Origin');

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 820, height: 1100 },
    { width: 390, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/flights/fop-route-profile-djj-nbx/manifest', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Manifest Control' })).toBeVisible();
    await expect(page.getByText('Departure Assurance').first()).toBeVisible();
    await expect(page.getByText('Next Required Actions')).toBeVisible();

    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    );
    expect(hasPageOverflow).toBe(false);
  }
});
