import { expect, test } from '@playwright/test';

test('a stale flight request provides a recovery path', async ({ page }) => {
  await page.goto('/flights/requests/fr-does-not-exist', { waitUntil: 'networkidle' });

  await expect(
    page.getByText('This flight request no longer exists. The demo database may have been reset.', {
      exact: true
    })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to requests' })).toHaveAttribute(
    'href',
    '/flights/requests'
  );
});

test('request wizard loads system planning candidates and uses controlled option fields', async ({
  page
}) => {
  await page.goto('/flights/requests/new', { waitUntil: 'networkidle' });

  const planningResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/flight-operations/planning-context') && response.ok()
  );
  await page.getByRole('combobox', { name: 'Route' }).click();
  await page.getByText('DJJ-WMX (DJJ -> WMX)', { exact: true }).click();
  await planningResponse;

  await expect(page.getByRole('combobox', { name: 'Request source' })).toBeVisible();

  await page.getByRole('button', { name: /Aircraft & Crew/u }).click();
  await expect(page.getByRole('combobox', { name: 'Aircraft' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Pilot in command' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Co-pilot' })).toBeVisible();

  await page.getByRole('button', { name: /Manifest Setup/u }).click();
  await expect(page.getByRole('combobox', { name: 'Cargo category' })).toBeVisible();
});

test('record departure asks for actual time and station before changing flight status', async ({
  page
}) => {
  await page.goto('/flights/fop-checkin-open', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Record Departure' }).click();
  const dialog = page.getByRole('dialog', { name: 'Record Departure' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Actual departure')).not.toHaveValue('');
  await expect(dialog.getByLabel('Station')).toHaveValue('DJJ');
  await expect(dialog.getByLabel('Operational note')).toBeVisible();

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('CHECK IN OPEN', { exact: true }).first()).toBeVisible();
});
