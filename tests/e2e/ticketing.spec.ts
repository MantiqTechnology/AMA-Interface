import { expect, test, type Locator, type Page } from '@playwright/test';

async function chooseFirst(page: Page, input: Locator) {
  await expect(input).not.toHaveValue(/undefined/i);
  await input.focus();
  await input.press('ArrowDown');
  const menuId = await input.getAttribute('aria-controls');
  expect(menuId).toBeTruthy();
  const firstOption = page.locator(`#${menuId}`).getByRole('option').first();
  await expect(firstOption).toBeVisible();
  expect(await firstOption.innerText()).not.toMatch(/undefined/i);
  await firstOption.click();
}

test.describe('ticketing feature', () => {
  test('books a passenger from the public portal with a live seat map', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.goto('/ticketing/booking', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1, name: 'Book a flight' })).toBeVisible();

    const passengerForm = page.locator('.v-window-item--active');
    await chooseFirst(page, passengerForm.getByRole('combobox', { name: 'Origin' }));
    await chooseFirst(page, passengerForm.getByRole('combobox', { name: 'Destination' }));
    await chooseFirst(page, passengerForm.getByRole('combobox', { name: 'Flight' }));
    await passengerForm.getByLabel('Passenger name').fill('Playwright Passenger');
    await passengerForm.getByLabel('Document number').fill(`E2E-${Date.now()}`);
    const availableSeat = passengerForm
      .getByRole('group', { name: 'Seat selection' })
      .getByRole('button', { disabled: false })
      .first();
    await availableSeat.click();
    await passengerForm.getByRole('button', { name: 'Book passenger' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Booking confirmed')).toBeVisible();
    await expect(dialog).toContainText('TKT-');
    expect(runtimeErrors).toEqual([]);
  });

  test('books cargo and shows a server-calculated tariff', async ({ page }) => {
    await page.goto('/ticketing/booking', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Cargo' }).click();
    const cargoForm = page.locator('.v-window-item--active');
    await chooseFirst(page, cargoForm.getByRole('combobox', { name: 'Origin' }));
    await chooseFirst(page, cargoForm.getByRole('combobox', { name: 'Destination' }));
    await chooseFirst(page, cargoForm.getByRole('combobox', { name: 'Flight' }));
    await cargoForm.getByLabel('Sender').fill('Playwright Sender');
    await cargoForm.getByLabel('Receiver').fill('Playwright Receiver');
    await cargoForm.getByLabel('Cargo description').fill('Medical supply package');
    await expect(cargoForm.getByText('Estimated tariff')).toBeVisible();
    await cargoForm.getByRole('button', { name: 'Register cargo' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Booking confirmed')).toBeVisible();
    await expect(dialog).toContainText('AWB-');
  });

  test('public booking remains usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ticketing/booking', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1, name: 'Book a flight' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Passenger' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Cargo' })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      content: document.documentElement.scrollWidth
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  });

  test('customer requests a refund and staff approves it from the passenger screen', async ({
    page
  }) => {
    await page.goto('/ticketing/booking', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Check booking' }).click();
    const lookup = page.locator('.v-window-item--active');
    await lookup.getByLabel('Ticket number').fill('TKT-DEMO12');
    await lookup.getByRole('button', { name: 'Find booking' }).click();
    await expect(lookup.getByText('Sarah Wenda')).toBeVisible();
    await lookup.getByRole('button', { name: 'Request refund' }).click();
    const requestDialog = page.getByRole('dialog');
    await requestDialog
      .getByLabel('Reason for refund')
      .fill('Passenger cannot travel due to a medical appointment.');
    await requestDialog.getByRole('button', { name: 'Submit request' }).click();
    await expect(lookup.getByText('REFUND REQUESTED', { exact: true })).toBeVisible();

    await page.goto('/ticketing/passenger', { waitUntil: 'networkidle' });
    const row = page.getByRole('row').filter({ hasText: 'TKT-DEMO12' });
    await row.getByRole('button', { name: 'Approve refund' }).click();
    const decisionDialog = page.getByRole('dialog');
    await decisionDialog.getByLabel('Decision note').fill('Verified by station administrator.');
    await decisionDialog.getByRole('button', { name: 'Approve refund' }).click();
    await expect(row.getByText('APPROVED')).toBeVisible();
  });

  test('customer reschedules a paid ticket to another same-route flight', async ({ page }) => {
    await page.goto('/ticketing/booking', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Check booking' }).click();
    const lookup = page.locator('.v-window-item--active');
    await lookup.getByLabel('Ticket number').fill('TKT-RESCHEDULE');
    await lookup.getByRole('button', { name: 'Find booking' }).click();
    await lookup.getByRole('button', { name: 'Reschedule' }).click();

    const dialog = page.getByRole('dialog');
    await chooseFirst(page, dialog.getByRole('combobox', { name: 'Replacement flight' }));
    await chooseFirst(page, dialog.getByRole('combobox', { name: 'New seat' }));
    await dialog.getByRole('button', { name: 'Confirm reschedule' }).click();
    await expect(lookup.getByText('AMA-20260717-008')).toBeVisible();
    await expect(lookup.locator('text=undefined')).toHaveCount(0);
  });

  for (const [path, heading, seededRecord] of [
    ['/ticketing/passenger', 'Passenger Manifest', 'TKT-DEMO12'],
    ['/ticketing/cargo', 'Cargo Tracking', 'AWB-100200'],
    ['/ticketing/management', 'Ticketing Management', 'DJJ-WMX'],
    ['/ticketing/finance', 'Station Ledger', 'TKT-DEMO12']
  ] as const) {
    test(`${heading} screen loads its feature data`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText(seededRecord, { exact: false }).first()).toBeVisible();
      await expect(page.locator('text=undefined')).toHaveCount(0);
    });
  }

  test('clearing passenger and cargo filters omits empty query parameters', async ({ page }) => {
    await page.goto('/ticketing/passenger', { waitUntil: 'networkidle' });
    const passengerPayment = page.getByRole('combobox', { name: 'Payment' });
    await chooseFirst(page, passengerPayment);
    const passengerRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname === '/api/ticketing/passenger-tickets' &&
        !url.searchParams.has('paymentStatus')
      );
    });
    await passengerPayment
      .locator('xpath=ancestor::*[contains(@class, "v-input")]')
      .locator('.v-field__clearable')
      .click();
    await passengerRequest;
    await expect(page.getByText('TKT-DEMO12', { exact: false }).first()).toBeVisible();

    await page.goto('/ticketing/cargo', { waitUntil: 'networkidle' });
    const cargoPayment = page.getByRole('combobox', { name: 'Payment' });
    await chooseFirst(page, cargoPayment);
    const cargoRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname === '/api/ticketing/cargo-bookings' && !url.searchParams.has('paymentStatus')
      );
    });
    await cargoPayment
      .locator('xpath=ancestor::*[contains(@class, "v-input")]')
      .locator('.v-field__clearable')
      .click();
    await cargoRequest;
    await expect(page.getByText('AWB-100200', { exact: false }).first()).toBeVisible();
  });

  test('keeps Close Flight disabled until closure evidence is complete', async ({ page }) => {
    const flightId = 'fop-ticketing-cargo';
    const departureAt = new Date().toISOString();
    const arrivalAt = new Date(Date.now() + 60_000).toISOString();
    for (const [action, body] of [
      ['open-check-in', {}],
      ['depart', { actualAt: departureAt }],
      ['land', { actualAt: arrivalAt }],
      ['pending-closure', {}]
    ] as const) {
      const response = await page.request.post(
        `/api/flight-operations/flights/${flightId}/actions/${action}`,
        { data: body }
      );
      expect(response.ok()).toBe(true);
    }

    await page.goto(`/flights/${flightId}`, { waitUntil: 'networkidle' });
    await expect(page.getByText('Close Flight is unavailable.').first()).toBeVisible();
    await expect(page.getByText('actual fuel uplift', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close Flight' }).first()).toBeDisabled();
  });
});
