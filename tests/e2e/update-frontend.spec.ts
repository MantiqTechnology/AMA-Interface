import { expect, test } from '@playwright/test';

const screens = [
  ['/dashboard', 'PT AMA Aviation Dashboard'],
  ['/admin/access-demo', 'Access Demo']
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
    expect(runtimeErrors).toEqual([]);
  });
}

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

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
