import { expect, test } from '@playwright/test';

const screens = [
  ['/dashboard', 'PT AMA Aviation Dashboard'],
  ['/ops?period=TODAY&anchorDate=2026-07-17', 'Ops Overview'],
  ['/flights/dashboard?period=TODAY&anchorDate=2026-07-17', 'Flight Control Overview'],
  ['/admin/access-demo', 'Access Demo'],
  ['/maintenance/flight-handoffs', 'Flight Handoffs'],
  ['/invoices', 'Invoices'],
  ['/invoices/inv-closed-djj-wmx', 'AMA-INV-20260707-001']
] as const;

for (const [path, heading] of screens) {
  test(`${heading} renders the adapted frontend without runtime placeholders`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('text=undefined')).toHaveCount(0);
    if (path === '/dashboard') {
      await expect(page.locator('a[href="/flights/requests"]')).toHaveCount(1);
    }
    if (path === '/invoices') {
      await expect(page.getByText('Visible Margin', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('PT Papua Logistics').first()).toBeVisible();
    }
    if (path === '/invoices/inv-closed-djj-wmx') {
      await expect(page.getByText('Revenue Lines')).toBeVisible();
      await expect(page.getByText('Finance Handoff Timeline')).toBeVisible();
      await expect(page.getByText('Operational Cost', { exact: true }).first()).toBeVisible();
    }
    if (path === '/maintenance/flight-handoffs') {
      await expect(page.getByText('Closure Ready', { exact: true })).toBeVisible();
      await expect(page.getByText('Needs Attention', { exact: true })).toBeVisible();
      const pendingRow = page.getByRole('row').filter({ hasText: 'AMA-20260717-005' });
      await expect(pendingRow).toBeVisible();
      await pendingRow.click();
      await expect(page.getByText('Evidence checklist')).toBeVisible();
      await expect(page.getByText('Maintenance approval is missing')).toBeVisible();
    }
    expect(runtimeErrors).toEqual([]);
  });
}

test('operational dashboards preserve source filters in drill-down navigation', async ({
  page
}) => {
  await page.goto('/flights/dashboard?period=TODAY&anchorDate=2026-07-17', {
    waitUntil: 'networkidle'
  });
  const blockedMetric = page.locator('a').filter({ hasText: 'Blocked' }).first();
  await expect(blockedMetric).toBeVisible();
  await blockedMetric.click();
  await expect(page).toHaveURL(
    /\/flights\?.*dateFrom=2026-07-17.*dateTo=2026-07-17.*status=BLOCKED/u
  );
  await expect(page.getByRole('heading', { level: 1, name: 'Flight Orders' })).toBeVisible();

  await page.goto('/ops?period=TODAY&anchorDate=2026-07-17', { waitUntil: 'networkidle' });
  const sourceLink = page.getByRole('link', { name: /Flight Following/u }).first();
  await expect(sourceLink).toBeVisible();
  await sourceLink.click();
  await expect(page).toHaveURL(
    /\/ops\/flight-following\?.*dateFrom=2026-07-17.*dateTo=2026-07-17/u
  );
});

test('maintenance workbench filters and exposes approval only to maintenance roles', async ({
  context,
  page
}) => {
  await context.addCookies([
    {
      name: 'ama_demo_role',
      value: 'Maintenance Manager',
      url: 'http://localhost:3100'
    }
  ]);
  await page.goto('/flights/maintenance?flightId=fop-in-progress', {
    waitUntil: 'networkidle'
  });
  await expect(page).toHaveURL(/\/maintenance\/flight-handoffs\?flightId=fop-in-progress$/u);
  await expect(page.getByRole('heading', { name: 'AMA-20260717-005' })).toBeVisible();
  await page.getByRole('button', { name: 'Close maintenance details' }).click();
  const search = page.getByRole('textbox', { name: 'Search flight or aircraft' });
  await search.fill('PK-AMB');
  const pendingRow = page.getByRole('row').filter({ hasText: 'AMA-20260717-005' });
  await expect(pendingRow).toBeVisible();
  await pendingRow.click();
  await expect(page.getByText('Evidence checklist')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Review and approve closure handoff' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close maintenance details' }).click();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(search).toHaveValue('');
});

test('station technical handoff stays separate from MRO approval', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ama_demo_role',
      value: 'Station Admin',
      url: 'http://localhost:3100'
    }
  ]);
  await page.goto('/flights/maintenance', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/flights\/station-operations\/maintenance(?:\?|$)/u);
  await expect(page.getByRole('heading', { name: 'Temuan Teknis & Handoff MRO' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Laporkan temuan' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Review and approve closure handoff' })
  ).toHaveCount(0);

  const deniedMroQueue = await page.request.get('/api/flight-operations/maintenance');
  expect(deniedMroQueue.status()).toBe(403);

  await page.goto('/maintenance/flight-handoffs', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/dashboard$/u);
});

test('canonical operational screens remain usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { level: 1, name: 'PT AMA Aviation Dashboard' })
  ).toBeVisible();
  await expect(page.locator('.v-card-title').getByText('Flight Status Board')).toBeVisible();
  await expect(page.locator('.v-card-title').getByText('Fleet Availability')).toBeVisible();
  await page.getByRole('button', { name: 'Refresh dashboard' }).click();

  await page.goto('/admin/access-demo', { waitUntil: 'networkidle' });
  await expect(page.getByText('Demo personas', { exact: true })).toBeVisible();
  await expect(page.getByText('Visible modules', { exact: true })).toBeVisible();

  await page.goto('/invoices', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Invoices' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open invoice' }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Open invoice' }).first().click();
  await expect(page.getByText('Revenue Lines')).toBeVisible();
  await expect(page.locator('text=undefined')).toHaveCount(0);

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
