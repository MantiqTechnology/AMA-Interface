import { expect, test } from '@playwright/test';

test('shows the Internal AOG demo coach with one role-aware next action', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);

  await page.goto('/maintenance', { waitUntil: 'networkidle' });

  const coach = page.getByTestId('internal-aog-demo-coach');
  await expect(coach).toBeVisible();
  await expect(coach.getByText('Internal AOG · Material Blocker')).toBeVisible();
  await expect(coach.getByText('Langkah 1 dari 8')).toBeVisible();
  await expect(
    coach.getByRole('button', { name: 'Lanjut sebagai Inventory Controller' })
  ).toBeVisible();
});

test('keeps the demo coach usable at the project tablet viewport', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/maintenance', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('internal-aog-demo-coach')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
});

test('puts the AOG blocker first on the control center and Work Package overview', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);

  await page.goto('/maintenance', { waitUntil: 'networkidle' });
  const spotlight = page.getByTestId('internal-aog-spotlight');
  await expect(spotlight).toBeVisible();
  await expect(spotlight.getByText('PK-AMD')).toBeVisible();
  await expect(spotlight.getByText('Material wajib belum direservasi.')).toBeVisible();
  await expect(spotlight.getByText('Inventory Controller')).toBeVisible();

  await spotlight.getByRole('link', { name: 'Buka Work Package' }).click();
  await expect(page).toHaveURL(/\/maintenance\/work-packages\/mroaog-work-package/u);
  await expect(page.getByTestId('internal-aog-demo-coach')).toBeVisible();
  await expect(page.getByTestId('internal-aog-readiness')).toBeVisible();
  await expect(page.getByTestId('internal-aog-timeline')).toBeVisible();
  await expect(page.getByText('MWP-AOG-INT-001').first()).toBeVisible();
});
