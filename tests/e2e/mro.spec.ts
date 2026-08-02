import { expect, test } from '@playwright/test';

test('MRO work package list loads without conflicting error and empty states', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);

  await page.goto('/maintenance/work-packages', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Work Packages' })).toBeVisible();
  await expect(page.getByText('Unable to load work packages')).toHaveCount(0);
  await expect(page.getByText('No work packages match the current filters.')).toHaveCount(0);
  await expect(page.getByText('Starter-generator indication rectification')).toBeVisible();
  await expect(page.getByText('MWP-MROV1-RTS')).toBeVisible();
});

test('MRO work package list renders API failure without empty state', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);
  await page.goto('/maintenance/work-packages', { waitUntil: 'networkidle' });
  await expect(page.getByText('MWP-MROV1-RTS')).toBeVisible();

  await page.route('**/api/maintenance/work-packages**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unexpected server error',
          details: { requestId: 'test-work-package-failure' }
        },
        meta: { requestId: 'test-work-package-failure', demoMode: true }
      })
    });
  });
  await page.getByRole('button', { name: 'Refresh work packages' }).click();

  await expect(page.getByText('Unable to load work packages.')).toBeVisible();
  await expect(page.getByText('Operational impact: package progress')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByText('No work packages match the current filters.')).toHaveCount(0);
});

test('MRO golden path issues technical release from authoritative work-package detail', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([{ name: 'ama_demo_role', value: 'Certifying Staff', url: cookieUrl }]);

  await page.goto('/maintenance', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Maintenance Command Center' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Starter-generator indication rectification/u })
  ).toBeVisible();

  await page.goto('/maintenance/work-packages/mwp-mrov1-release-ready', {
    waitUntil: 'networkidle'
  });
  await expect(
    page.getByRole('heading', { name: 'Starter-generator indication rectification' })
  ).toBeVisible();
  await expect(page.getByText('MWP-MROV1-RTS', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Starter-generator indication rectification', { exact: true }).first()
  ).toBeVisible();
  await page.getByRole('button', { name: /Rectify starter-generator indication wiring/u }).click();
  await expect(page.getByText('Independent inspection passed').first()).toBeVisible();
  await expect(page.getByText('Mandatory work complete')).toBeVisible();

  await page.getByRole('button', { name: 'Issue technical release' }).click();
  await expect(page.getByRole('heading', { name: 'Technical release confirmation' })).toBeVisible();
  await expect(page.getByText('AME-CERT-MRO-001').first()).toBeVisible();
  await expect(page.getByText('Licence and PT AMA authorization verified').first()).toBeVisible();

  await page.getByRole('button', { name: 'Issue technical release' }).last().click();
  await expect(page.getByText('Technical release completed')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByText('Signer authorization snapshot')).toBeVisible();
  await expect(page.getByText('Serviceable', { exact: true }).first()).toBeVisible();
});
