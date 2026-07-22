import { expect, test } from '@playwright/test';

const screens = [
  ['/dashboard', 'PT AMA Aviation Dashboard'],
  ['/admin/access-demo', 'Access Demo'],
  ['/flights/maintenance', 'Maintenance Handoff'],
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
    if (path === '/flights/maintenance') {
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

test('maintenance workbench filters and hides approval for non-maintenance roles', async ({
  context,
  page
}) => {
  await context.addCookies([
    {
      name: 'ama_demo_role',
      value: 'OCC',
      url: 'http://localhost:3100'
    }
  ]);
  await page.goto('/flights/maintenance', { waitUntil: 'networkidle' });
  const search = page.getByRole('textbox', { name: 'Search flight or aircraft' });
  await search.fill('PK-AMB');
  const pendingRow = page.getByRole('row').filter({ hasText: 'AMA-20260717-005' });
  await expect(pendingRow).toBeVisible();
  await pendingRow.click();
  await expect(page.getByText('Evidence checklist')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review & approve' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close maintenance details' }).click();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(search).toHaveValue('');
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
