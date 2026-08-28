import { expect, test } from '@playwright/test';

test('uses explicit credentials and shows an honest capability preview', async ({
  page,
  context
}) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?redirect=/u);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.getByRole('button', { name: 'Open demo accounts' }).click();
  const account = page.getByText('station.wmx · AMA-WMX-2026!');
  await expect(account).toBeVisible();
  await account.click();

  await expect(page.getByLabel('Username')).toHaveValue('station.wmx');
  await expect(page.getByRole('textbox', { name: 'Password' })).toHaveValue('AMA-WMX-2026!');
  await expect(page).toHaveURL(/\/login/u);

  await page.getByRole('button', { name: 'Sign in to AMA Ops' }).click();
  await expect(page).toHaveURL(/\/dashboard/u);
  await expect(page.getByText('Local Demo · Synthetic Data')).toBeVisible();

  const sessionCookie = (await context.cookies()).find(
    (cookie) => cookie.name === 'ama_demo_session'
  );
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.sameSite).toBe('Strict');

  await page.goto('/capability-preview');
  await expect(
    page.getByText('Concept Preview — Read-only — Non-operational — Synthetic data')
  ).toBeVisible();
  await expect(page.getByText('Safety Management System', { exact: true })).toBeVisible();
  await expect(page.getByText('Aviation Security', { exact: true })).toBeVisible();
  await expect(page.getByText('No operational mutation endpoint exists')).toBeVisible();
});
