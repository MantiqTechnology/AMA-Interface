import { expect, test, type Locator, type Page } from '@playwright/test';

const features = [
  {
    slug: 'aircraft',
    heading: 'Aircraft',
    fields: ['Registration number', 'Aircraft type', 'Passenger capacity'],
    save: 'Save aircraft',
    required: 'Registration number'
  },
  {
    slug: 'stations',
    heading: 'Stations & Airports',
    fields: ['Station code', 'Station name', 'City or region'],
    save: 'Save station',
    required: 'Station code'
  },
  {
    slug: 'routes',
    heading: 'Routes',
    fields: ['Route code', 'Origin', 'Destination'],
    save: 'Save route',
    required: 'Route code'
  },
  {
    slug: 'flight-schedule-templates',
    heading: 'Flight Schedule Templates',
    fields: ['Template code', 'Route', 'Default aircraft'],
    save: 'Save schedule templates',
    required: 'Template code'
  },
  {
    slug: 'flight-capacity-profiles',
    heading: 'Flight Capacity Profiles',
    fields: ['Profile code', 'Aircraft', 'Route'],
    save: 'Save capacity profiles',
    required: 'Profile code'
  },
  {
    slug: 'personnel',
    heading: 'Pilot & Crew',
    fields: ['Employee code', 'Full legal name', 'Crew role'],
    save: 'Save pilot & crew',
    required: 'Employee code'
  },
  {
    slug: 'flight-reasons',
    heading: 'Flight Reasons',
    fields: ['Reason code', 'Reason name', 'Reason type'],
    save: 'Save flight reasons',
    required: 'Reason code'
  },
  {
    slug: 'customers',
    heading: 'Customers & Corporate Accounts',
    fields: ['Account code', 'Account name', 'Payment term'],
    save: 'Save customers',
    required: 'Account code'
  },
  {
    slug: 'agents',
    heading: 'Agents & Counters',
    fields: ['Agent code', 'Agent name', 'Agent type'],
    save: 'Save agents',
    required: 'Agent code'
  },
  {
    slug: 'rates',
    heading: 'Fare & Rate Cards',
    fields: ['Rate code', 'Origin', 'Currency'],
    save: 'Save fare & rate cards',
    required: 'Rate code'
  },
  {
    slug: 'vendors',
    heading: 'Vendors',
    fields: ['Vendor code', 'Vendor name', 'Payment term'],
    save: 'Save vendors',
    required: 'Vendor code'
  },
  {
    slug: 'fuel-suppliers',
    heading: 'Fuel Suppliers',
    fields: ['Supplier code', 'Station', 'Currency'],
    save: 'Save fuel suppliers',
    required: 'Supplier code'
  },
  {
    slug: 'handling-parking-suppliers',
    heading: 'Handling & Parking Suppliers',
    fields: ['Supplier code', 'Station', 'Service type'],
    save: 'Save handling & parking',
    required: 'Supplier code'
  },
  {
    slug: 'cost-categories',
    heading: 'Cost Categories',
    fields: ['Category code', 'Category name', 'Default expense COA'],
    save: 'Save cost categories',
    required: 'Category code'
  },
  {
    slug: 'chart-of-accounts',
    heading: 'Chart of Accounts',
    fields: ['Account code', 'Account name', 'Account type'],
    save: 'Save chart of accounts',
    required: 'Account code'
  },
  {
    slug: 'tax-codes',
    heading: 'Tax Codes',
    fields: ['Tax code', 'Tax name', 'Tax rate'],
    save: 'Save tax codes',
    required: 'Tax code'
  },
  {
    slug: 'payment-terms',
    heading: 'Payment Terms',
    fields: ['Term code', 'Term name', 'Due days'],
    save: 'Save payment terms',
    required: 'Term code'
  },
  {
    slug: 'currencies',
    heading: 'Currencies',
    fields: ['Currency code', 'Currency name', 'Symbol'],
    save: 'Save currencies',
    required: 'Currency code'
  },
  {
    slug: 'dg-categories',
    heading: 'DG Categories',
    fields: ['DG code', 'DG class', 'Description'],
    save: 'Save dg categories',
    required: 'DG code'
  }
] as const;

async function waitForNuxtReady(page: Page) {
  await page.waitForFunction(() =>
    Boolean(Reflect.get(document.querySelector('#__nuxt') ?? {}, '__vue_app__'))
  );
}

async function openCreateDialog(page: Page, slug: string) {
  await page.goto(`/master-data/${slug}`, { waitUntil: 'networkidle' });
  await waitForNuxtReady(page);
  await page.getByRole('button', { name: 'Add data' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function selectFirstDropdownOption(page: Page, dropdown: Locator) {
  await expect(dropdown).not.toHaveValue(/undefined/i);
  await dropdown.focus();
  await dropdown.press('ArrowDown');
  const menuId = await dropdown.getAttribute('aria-controls');
  expect(menuId).toBeTruthy();
  const menu = page.locator(`#${menuId}`);
  await expect(menu).toBeVisible();
  const firstOption = menu.getByRole('option').first();
  await expect(firstOption).toBeVisible();
  expect(await firstOption.innerText()).not.toMatch(/undefined/i);
  await dropdown.press('ArrowDown');
  await dropdown.press('Enter');
  await expect(dropdown).not.toHaveValue(/undefined/i);
}

test.describe('feature-owned master data pages', () => {
  for (const feature of features) {
    test(`${feature.heading} opens its own create form`, async ({ page }) => {
      const runtimeErrors: string[] = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      await page.goto(`/master-data/${feature.slug}`, { waitUntil: 'networkidle' });
      await waitForNuxtReady(page);

      await expect(
        page.getByRole('heading', { level: 1, name: feature.heading, exact: true })
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add data' })).toBeEnabled();

      await page.getByRole('button', { name: 'Add data' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      for (const field of feature.fields) {
        await expect(dialog.getByLabel(field, { exact: true })).toBeVisible();
      }
      const dropdowns = dialog.locator('input[role="combobox"]:visible');
      for (let index = 0; index < (await dropdowns.count()); index += 1) {
        await selectFirstDropdownOption(page, dropdowns.nth(index));
      }
      expect(runtimeErrors).toEqual([]);
      await dialog.getByRole('button', { name: feature.save, exact: true }).click();
      await expect(
        dialog.getByText(`${feature.required} is required`, { exact: true })
      ).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toBeHidden();
    });
  }

  test('route form owns station relations and field validation', async ({ page }) => {
    const dialog = await openCreateDialog(page, 'routes');

    await expect(dialog.getByLabel('Origin', { exact: true })).toBeVisible();
    await expect(dialog.getByLabel('Destination', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Save route' }).click();
    await expect(dialog.getByText('Route code is required')).toBeVisible();
    await expect(dialog.getByText('Origin is required')).toBeVisible();
    await expect(dialog.getByText('Destination is required')).toBeVisible();
  });

  test('operations relation forms use their owning feature selects', async ({ page }) => {
    const schedule = await openCreateDialog(page, 'flight-schedule-templates');
    await expect(schedule.getByLabel('Route', { exact: true })).toBeVisible();
    await expect(schedule.getByLabel('Default aircraft', { exact: true })).toBeVisible();
    await schedule.getByRole('button', { name: 'Cancel' }).click();

    const capacity = await openCreateDialog(page, 'flight-capacity-profiles');
    await expect(capacity.getByLabel('Aircraft', { exact: true })).toBeVisible();
    await expect(capacity.getByLabel('Route', { exact: true })).toBeVisible();
  });

  test('flight reasons use the expandable common table', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/master-data/flight-reasons', { waitUntil: 'networkidle' });
    await waitForNuxtReady(page);

    const table = page.locator('.flight-reasons-table');
    await expect(table).toBeVisible();
    const firstRow = table.locator('tbody tr.v-data-table__tr').first();
    await firstRow.getByRole('button', { name: 'Expand row details' }).click();

    await expect(table.getByText('Operator note required')).toBeVisible();
    await expect(table.getByText('Affects operational KPI')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
    ).toBe(false);
  });

  test('commercial and finance relation forms expose explicit dependencies', async ({ page }) => {
    const customer = await openCreateDialog(page, 'customers');
    await expect(customer.getByLabel('Payment term', { exact: true })).toBeVisible();
    await customer.getByRole('button', { name: 'Cancel' }).click();

    const rate = await openCreateDialog(page, 'rates');
    for (const label of ['Origin', 'Destination', 'Customer', 'Currency', 'Tax code']) {
      await expect(rate.getByLabel(label, { exact: true })).toBeVisible();
    }
    await rate.getByRole('button', { name: 'Cancel' }).click();

    const fuelSupplier = await openCreateDialog(page, 'fuel-suppliers');
    await expect(fuelSupplier.getByLabel('Station', { exact: true })).toBeVisible();
    await expect(fuelSupplier.getByLabel('Currency', { exact: true })).toBeVisible();
    await fuelSupplier.getByRole('button', { name: 'Cancel' }).click();

    const handlingSupplier = await openCreateDialog(page, 'handling-parking-suppliers');
    await expect(handlingSupplier.getByLabel('Station', { exact: true })).toBeVisible();
    await expect(handlingSupplier.getByLabel('Currency', { exact: true })).toBeVisible();
  });

  test('flight request imports feature-owned selects with inline create actions', async ({
    page
  }) => {
    await page.goto('/flights/requests/new', { waitUntil: 'networkidle' });

    const visibleDropdowns = page.locator('input[role="combobox"]:visible');
    for (let index = 0; index < (await visibleDropdowns.count()); index += 1) {
      await expect(visibleDropdowns.nth(index)).not.toHaveValue(/undefined/i);
    }

    await expect(page.getByLabel('Route', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add route' })).toBeVisible();
    await page.getByRole('button', { name: 'Add route' }).click();
    const routeDialog = page.getByRole('dialog');
    await expect(routeDialog.getByText('Add route', { exact: true })).toBeVisible();
    await routeDialog.getByRole('button', { name: 'Cancel' }).click();

    const code = `E2E${Date.now()}`;
    await page.getByRole('button', { name: 'Add Customers' }).click();
    const customerDialog = page.getByRole('dialog');
    await customerDialog.getByLabel('Account code', { exact: true }).fill(code);
    await customerDialog.getByLabel('Account name', { exact: true }).fill('Inline E2E Customer');
    await customerDialog.getByRole('button', { name: 'Save customers' }).click();
    await expect(customerDialog).toBeHidden();
    await expect(page.getByText(`${code} - Inline E2E Customer`, { exact: true })).toBeVisible();
  });
});
