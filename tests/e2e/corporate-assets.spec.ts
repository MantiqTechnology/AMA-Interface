import { expect, test } from '@playwright/test';

test('Demo Admin uses the persistent Corporate Assets register and detail', async ({
  context,
  page
}) => {
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Demo Admin', url: 'http://localhost:3100' }
  ]);
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.goto('/asset-management/register', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Asset Register' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'GSE-00001' })).toBeVisible();
  await page.goto('/asset-management/assets/asset-gse-gpu-01', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ground Power Unit GPU-01' })
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Financial View' }).click();
  await expect(page.getByText('FA-GSE-00001')).toBeVisible();
  await page.getByRole('button', { name: 'QR label' }).click();
  await expect(page.getByRole('dialog').getByAltText('QR for GSE-00001')).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test('Station Admin is scoped to WMX and OCC cannot access Corporate Assets', async ({
  context,
  page
}) => {
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Station Admin', url: 'http://localhost:3100' }
  ]);
  await page.goto('/asset-management/register', { waitUntil: 'networkidle' });
  await expect(page.getByText('VEH-00001')).toBeVisible();
  await expect(page.getByText('GSE-00001')).toHaveCount(0);

  await context.addCookies([{ name: 'ama_demo_role', value: 'OCC', url: 'http://localhost:3100' }]);
  const response = await page.goto('/asset-management/register', { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);
  await expect(page.getByText('Asset register could not be loaded')).toBeVisible();
});

test('Maintenance Manager requests a part through Inventory and sees persisted state', async ({
  context,
  page
}) => {
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: 'http://localhost:3100' }
  ]);
  await page.goto('/asset-management/assets/asset-gse-gpu-01', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Maintenance' }).click();
  await page.getByRole('button', { name: 'Request parts' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Inventory warehouse').focus();
  await dialog.getByLabel('Inventory warehouse').press('ArrowDown');
  await page.getByRole('option', { name: /Jayapura Main Stores/u }).click();
  await dialog.getByLabel('Part').focus();
  await dialog.getByLabel('Part').press('ArrowDown');
  await page.getByRole('option', { name: /Aviation Engine Oil/u }).click();
  await dialog.getByLabel('Reason').fill('E2E corporate maintenance part issue.');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Maintenance' }).click();
  await expect(page.getByText('WAITING PARTS')).toBeVisible();
});
