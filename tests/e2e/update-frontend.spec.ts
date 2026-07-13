import { expect, test } from '@playwright/test';

const screens = [
  ['/dashboard', 'PT AMA Operations Command Center'],
  ['/admin/access-demo', 'Access Demo'],
  ['/ops/command-center', 'Operations Command Center']
] as const;

for (const [path, heading] of screens) {
  test(`${heading} renders the adapted frontend without runtime placeholders`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('text=undefined')).toHaveCount(0);
    expect(runtimeErrors).toEqual([]);
  });
}

test('adapted operational screens keep controls usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open dashboard controls' }).click();
  await expect(page.getByText('Dashboard Controls', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hide dashboard controls' }).click();

  await page.goto('/admin/access-demo', { waitUntil: 'networkidle' });
  await expect(page.getByText('Module Entitlements', { exact: true })).toBeVisible();
  await expect(page.getByText('Mandatory', { exact: true }).first()).toBeVisible();

  await page.goto('/ops/command-center', { waitUntil: 'networkidle' });
  await expect(page.getByRole('link', { name: 'Back to dashboard' })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
