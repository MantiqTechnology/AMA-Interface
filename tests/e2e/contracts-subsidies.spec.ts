import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
  const response = await page.request.post('/api/auth/login', {
    data: { username: 'occ.demo', password: 'AMA-OCC-2026!' }
  });
  expect(response.ok()).toBe(true);
}

async function waitForHydration(page: Page) {
  await page.locator('[data-ready="true"]').waitFor();
}

test('contracts and subsidies dashboard keeps snapshot and filters in the URL', async ({
  page
}) => {
  await signIn(page);
  await page.goto('/marketing/contracts-subsidies?from=2026-07-16&to=2026-07-17', {
    waitUntil: 'domcontentloaded'
  });

  await expect(page.getByRole('heading', { name: 'Contracts & Subsidies' })).toBeVisible();
  await waitForHydration(page);
  await expect(page.getByText('Contract Source Mix')).toBeVisible();
  await expect(page.getByText('Upcoming Renewals')).toBeVisible();

  await page.getByRole('tab', { name: 'Contracts' }).click();
  await expect(page).toHaveURL(/tab=contracts/u);
  await expect(page).toHaveURL(/from=2026-07-16/u);

  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('combobox', { name: 'Status' }).press('ArrowDown');
  await page.getByRole('option', { name: 'Active', exact: true }).click();
  await expect(page).toHaveURL(/status=ACTIVE/u);

  await page.evaluate(() => {
    window.history.pushState(
      {},
      '',
      '/marketing/contracts-subsidies?tab=subsidies&from=2026-07-16&to=2026-07-17'
    );
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('tab', { name: 'Subsidies' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await page.goBack();
  await expect(page.getByRole('tab', { name: 'Contracts' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
});

test('contracts and subsidies dashboard contains horizontal tables on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto('/marketing/contracts-subsidies?from=2026-07-16&to=2026-07-17', {
    waitUntil: 'domcontentloaded'
  });

  await expect(page.getByRole('heading', { name: 'Contracts & Subsidies' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
});
