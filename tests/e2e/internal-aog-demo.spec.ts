import { expect, test } from '@playwright/test';

test('shows the Internal AOG demo coach with one role-aware next action', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);

  await page.goto('/maintenance', { waitUntil: 'networkidle' });

  const coach = page.getByTestId('internal-aog-demo-coach');
  await expect(coach).toBeVisible();
  await expect(coach.getByText('Internal AOG · Material Blocker')).toBeVisible();
  await expect(coach.getByText('Langkah 1 dari 8')).toBeVisible();
  await expect(
    coach.getByRole('button', { name: 'Lanjut sebagai Inventory Controller' })
  ).toBeVisible();
});

test('keeps the demo coach usable at the project tablet viewport', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/maintenance', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('internal-aog-demo-coach')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
});

test('puts the AOG blocker first on the control center and Work Package overview', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);

  await page.goto('/maintenance', { waitUntil: 'networkidle' });
  const spotlight = page.getByTestId('internal-aog-spotlight');
  await expect(spotlight).toBeVisible();
  await expect(spotlight.getByText('PK-AMD')).toBeVisible();
  await expect(spotlight.getByText('Material wajib belum direservasi.')).toBeVisible();
  await expect(spotlight.getByText('Inventory Controller')).toBeVisible();

  await spotlight.getByRole('link', { name: 'Buka Work Package' }).click();
  await expect(page).toHaveURL(/\/maintenance\/work-packages\/mroaog-work-package/u);
  await expect(page.getByTestId('internal-aog-demo-coach')).toBeVisible();
  await expect(page.getByTestId('internal-aog-readiness')).toBeVisible();
  await expect(page.getByTestId('internal-aog-timeline')).toBeVisible();
  await expect(page.getByText('MWP-AOG-INT-001').first()).toBeVisible();
});

test('inventory clears the focused material blocker with an impact preview', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Inventory Controller', url: cookieUrl }
  ]);

  await page.goto('/inventory/maintenance-demand?requirement=mroaog-material-requirement', {
    waitUntil: 'networkidle'
  });
  const focused = page.getByTestId('internal-aog-inventory-demand');
  await expect(focused).toBeVisible();
  await expect(focused.getByText('SP-C208-TIR-4201')).toBeVisible();
  await expect(focused.getByText('MWP-AOG-INT-001')).toBeVisible();
  await expect(focused.getByText('PK-AMD')).toBeVisible();

  await focused.getByRole('button', { name: 'Reservasi stok' }).click();
  const reserveDialog = page.getByRole('dialog', { name: 'Reservasi stok untuk MRO' });
  await expect(reserveDialog.getByText('Dampak setelah reservasi')).toBeVisible();
  await expect(reserveDialog.getByText(/tersedia setelah aksi/u)).toBeVisible();
  await reserveDialog.getByRole('button', { name: 'Reservasi stok' }).click();
  await expect(page.getByText('Material berhasil direservasi.')).toBeVisible();

  await focused.getByRole('button', { name: 'Issue ke MRO' }).click();
  const issueDialog = page.getByRole('dialog', { name: 'Issue material ke Work Package' });
  await expect(issueDialog.getByText('MWP-AOG-INT-001 / PK-AMD')).toBeVisible();
  await expect(issueDialog.getByText('Gate material menjadi siap')).toBeVisible();
  await issueDialog.getByRole('button', { name: 'Issue material' }).click();

  await expect(page.getByText('Material berhasil dikeluarkan untuk MRO.')).toBeVisible();
  const coach = page.getByTestId('internal-aog-demo-coach');
  await expect(coach.getByText('Langkah 3 dari 8')).toBeVisible();
  await expect(
    coach.getByRole('button', { name: 'Lanjut sebagai Maintenance Technician' })
  ).toBeVisible();
});
