import { expect, test } from '@playwright/test';
import type { ApiResponse } from '../../shared/contracts/api';
import type { PurchaseOrderDto, PurchaseRequestDto } from '../../shared/features/inventory';

test('inventory dashboard and catalog render with accessible actions', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/inventory', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { level: 1, name: 'Inventory Control Center' })
  ).toBeVisible();
  await expect(page.getByText('Available Parts', { exact: true })).toBeVisible();
  await expect(page.getByText('FIFO Valuation', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh inventory dashboard' })).toBeVisible();

  await page.goto('/inventory/parts', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Add spare part' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Part number', { exact: true }).fill('E2E-PART-001');
  await dialog.getByLabel('Part name', { exact: true }).fill('E2E Hydraulic Seal');
  await dialog.getByLabel('Manufacturer', { exact: true }).fill('E2E Aviation Components');
  await dialog.getByRole('button', { name: 'Save part' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('row').filter({ hasText: 'E2E-PART-001' })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test('Director can cancel and then approve a submitted purchase order', async ({
  context,
  page
}) => {
  await context.addCookies([
    {
      name: 'ama_demo_role',
      value: 'Inventory Controller',
      url: 'http://localhost:3100'
    }
  ]);
  const requestResponse = await context.request.post('/api/inventory/purchase-requests', {
    data: {
      stationId: 'st-djj',
      requestReason: 'Playwright Director approval workflow.',
      lines: [
        {
          partId: 'inv-part-oil',
          quantity: 2,
          requiredAt: '2026-08-15',
          note: 'E2E approval line.'
        }
      ]
    }
  });
  const requestBody = (await requestResponse.json()) as ApiResponse<PurchaseRequestDto>;
  expect(requestBody.ok).toBe(true);
  if (!requestBody.ok) throw new Error(requestBody.error.message);
  await context.request.post(`/api/inventory/purchase-requests/${requestBody.data.id}/submit`);
  const orderResponse = await context.request.post('/api/inventory/purchase-orders', {
    data: {
      purchaseRequestId: requestBody.data.id,
      vendorId: 'vendor-maintenance',
      currencyId: 'cur-idr',
      exchangeRateToIdrMicros: 1_000_000,
      expectedAt: '2026-08-15',
      lines: [
        {
          purchaseRequestLineId: requestBody.data.lines[0]!.id,
          quantity: 2,
          sourceUnitCostMinor: 225_000
        }
      ]
    }
  });
  const orderBody = (await orderResponse.json()) as ApiResponse<PurchaseOrderDto>;
  expect(orderBody.ok).toBe(true);
  if (!orderBody.ok) throw new Error(orderBody.error.message);
  await context.request.post(`/api/inventory/purchase-orders/${orderBody.data.id}/submit`);

  await context.addCookies([
    { name: 'ama_demo_role', value: 'Director', url: 'http://localhost:3100' }
  ]);
  await page.goto('/inventory/purchase-orders', { waitUntil: 'networkidle' });
  const row = page.getByRole('row').filter({ hasText: orderBody.data.orderNumber });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Approve purchase order' }).click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation.getByText('Approve purchase order')).toBeVisible();
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(row.getByText('pending approval', { exact: true })).toBeVisible();

  await row.getByRole('button', { name: 'Approve purchase order' }).click();
  await confirmation.getByRole('button', { name: 'Approve order' }).click();
  await expect(row.getByText('approved', { exact: true })).toBeVisible();
});

test('repairable custom modal and inventory pages remain usable on mobile', async ({ page }) => {
  await page.goto('/inventory/repairables', { waitUntil: 'networkidle' });
  const brakeRow = page.getByRole('row').filter({ hasText: 'BRAKE-PC6-0001' });
  await expect(brakeRow).toBeVisible();
  await brakeRow.getByRole('button', { name: 'Install to aircraft' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Aircraft', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Position', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/inventory/stock', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Stock Availability' })).toBeVisible();
  await expect(page.locator('text=undefined')).toHaveCount(0);
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
