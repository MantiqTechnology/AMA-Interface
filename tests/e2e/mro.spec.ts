import { expect, test } from '@playwright/test';

test('MRO work package list loads without conflicting error and empty states', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);

  await page.goto('/maintenance/work-packages', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Paket Pekerjaan' })).toBeVisible();
  await expect(page.getByText('Paket pekerjaan belum dapat dimuat')).toHaveCount(0);
  await expect(page.getByText('Tidak ada paket pekerjaan sesuai filter.')).toHaveCount(0);
  await expect(page.getByText('Starter-generator indication rectification')).toBeVisible();
  await expect(page.getByText('MWP-MROV1-RTS')).toBeVisible();
});

test('MRO work package list renders API failure without empty state', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);
  await page.goto('/maintenance/work-packages', { waitUntil: 'networkidle' });
  await expect(page.getByText('MWP-MROV1-RTS')).toBeVisible();

  await page.route('**/api/maintenance/work-packages**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unexpected server error',
          details: { requestId: 'test-work-package-failure' }
        },
        meta: { requestId: 'test-work-package-failure', demoMode: true }
      })
    });
  });
  await page.getByRole('button', { name: 'Muat ulang paket pekerjaan' }).click();

  await expect(page.getByText('Paket pekerjaan belum dapat dimuat.')).toBeVisible();
  await expect(page.getByText('Dampak: progres pekerjaan')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
  await expect(page.getByText('Tidak ada paket pekerjaan sesuai filter.')).toHaveCount(0);
});

test('MRO workspace deep links split overview, execution, records, and release', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([{ name: 'ama_demo_role', value: 'Certifying Staff', url: cookieUrl }]);

  await page.goto('/maintenance', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Pusat Kendali MRO' })).toBeVisible();
  await expect(page.getByText('Work Package by Priority')).toBeVisible();

  await page.goto('/maintenance/work-packages/mwp-mrov1-release-ready', {
    waitUntil: 'networkidle'
  });
  await expect(page).toHaveURL(/\/maintenance\/work-packages\/mwp-mrov1-release-ready\/overview/u);
  await expect(
    page.getByRole('heading', { name: 'Starter-generator indication rectification' })
  ).toBeVisible();
  await expect(page.getByText('MWP-MROV1-RTS', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Release Readiness Summary')).toBeVisible();
  await expect(page.getByText('Next Required Actions')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Authenticate and Issue Technical Release' })
  ).toHaveCount(0);

  await page.goto(
    '/maintenance/work-packages/mwp-mrov1-release-ready/execution/job-cards/mjc-mrov1-release-001',
    {
      waitUntil: 'networkidle'
    }
  );
  const jobCardPanel = page.locator('.v-expansion-panel').filter({
    hasText: 'Rectify starter-generator indication wiring'
  });
  await expect(jobCardPanel.getByText('Work instruction demo')).toBeVisible();
  await expect(jobCardPanel.getByText('Area pesawat')).toBeVisible();
  await expect(jobCardPanel.getByText('ATA 24-30-00').first()).toBeVisible();
  await expect(
    jobCardPanel.getByText('Electrical power / Starter-generator indication wiring')
  ).toBeVisible();
  await expect(jobCardPanel.getByText('Dokumen kerja')).toBeVisible();
  await expect(jobCardPanel.getByRole('link', { name: 'AMM reference extract' })).toHaveAttribute(
    'href',
    '/mro/reference/amm-c208b-rev-a.txt'
  );
  await expect(jobCardPanel.getByText('Langkah kerja')).toBeVisible();
  await expect(
    jobCardPanel.getByText('Inspect starter-generator indication wiring and terminals.')
  ).toBeVisible();
  await expect(jobCardPanel.getByText('Acceptance criteria')).toBeVisible();
  await expect(
    jobCardPanel.getByText('Starter-generator indication remains stable during operational check.')
  ).toBeVisible();
  await expect(jobCardPanel.getByText('Bukti wajib')).toBeVisible();
  await expect(jobCardPanel.getByText('Independent inspection record.')).toBeVisible();
  await expect(jobCardPanel.getByText('Resource terkait Job Card')).toBeVisible();

  await page.goto('/maintenance/work-packages/mwp-mrov1-release-ready/records', {
    waitUntil: 'networkidle'
  });
  await expect(page.getByText('Technical Records')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Mandatory Job Card', exact: true })).toBeVisible();

  await page.goto('/maintenance/work-packages/mwp-mrov1-release-ready/release', {
    waitUntil: 'networkidle'
  });
  await expect(page.getByText('Technical Release', { exact: true })).toBeVisible();
  await expect(page.getByText('AME-CERT-MRO-001').first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Authenticate and Issue Technical Release' })
  ).toBeEnabled();

  await page.getByRole('button', { name: 'Authenticate and Issue Technical Release' }).click();
  await expect(page.getByText('Rilis teknis selesai')).toBeVisible();
  await expect(page.getByText('Serviceable', { exact: true }).first()).toBeVisible();
});

test('MRO technical record workspace renders release gates without release action', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);

  await page.goto('/maintenance/work-packages/mwp-mrov21-conflict/records', {
    waitUntil: 'networkidle'
  });
  await expect(page.getByText('MWP-MROV21-CONFLICT').first()).toBeVisible();
  await expect(page.getByText('Technical Records')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('cell', { name: 'Mandatory Job Card', exact: true })).toBeVisible();
  await expect(page.getByText('Missing').first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Authenticate and Issue Technical Release' })
  ).toHaveCount(0);

  await page.goto('/maintenance/work-packages/mwp-mrov21-conflict/release', {
    waitUntil: 'networkidle'
  });
  await expect(page.getByText('Technical Release', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Authenticate and Issue Technical Release' })
  ).toBeDisabled();
});

test('MRO command center renders priority dashboard, filters rows, and opens assign modal tabs', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);

  await page.goto('/maintenance', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Pusat Kendali MRO' })).toBeVisible();
  const kpiLabels = page.locator('.mro-kpi-card__label');
  await expect(kpiLabels.filter({ hasText: /^Total Fleet$/u })).toBeVisible();
  await expect(kpiLabels.filter({ hasText: /^Work Package$/u })).toBeVisible();
  await expect(kpiLabels.filter({ hasText: /^Material Blocker$/u })).toBeVisible();
  await expect(kpiLabels.filter({ hasText: /^Inspection Overdue$/u })).toBeVisible();
  await expect(kpiLabels.filter({ hasText: /^Siap Rilis$/u })).toBeVisible();
  await expect(kpiLabels.filter({ hasText: /^On-time Performance$/u })).toBeVisible();
  await expect(page.getByTestId('internal-aog-spotlight')).toBeVisible();
  await expect(page.getByText('Release Readiness')).toBeVisible();

  await page.locator('.mro-chip-row').getByText('AOG').click();
  await expect(page).toHaveURL(/priority=AOG/u);

  await page.getByRole('button', { name: 'Buat Work Package' }).click();
  const dialog = page.getByRole('dialog', { name: 'Assign Work Package' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Aircraft')).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'Station' })).toBeVisible();
  await page.route('**/api/uploads', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          id: 'upload-mro-assign-evidence',
          originalName: 'mro-assign-evidence.pdf',
          filename: 'mro-assign-evidence.pdf',
          path: 's3/mro-assign-evidence.pdf',
          viewUrl: '/api/uploads/upload-mro-assign-evidence/file',
          downloadUrl: '/api/uploads/upload-mro-assign-evidence/file?download=1',
          size: 18,
          contentType: 'application/pdf',
          isImage: false,
          uploadedAt: '2026-08-27T10:00:00.000Z',
          uploadedBy: 'USR-MAINTENANCE-MANAGER',
          status: 'DRAFT',
          stationScopes: ['DJJ'],
          purpose: 'DOCUMENT'
        }
      })
    });
  });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'mro-assign-evidence.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% mro assign evidence\n')
  });
  await dialog.getByRole('button', { name: 'Upload lampiran' }).click();
  await expect(dialog.getByText('mro-assign-evidence.pdf')).toBeVisible();
  await dialog.getByRole('tab', { name: 'Personnel' }).click();
  await expect(dialog.getByLabel('Mode pelaksanaan')).toBeVisible();
  await dialog.getByRole('tab', { name: 'Material' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Approved maintenance data' })).toBeVisible();
  await expect(
    dialog.getByRole('textbox', { name: 'Approved maintenance data reference' })
  ).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Revision snapshot' })).toBeVisible();
  await dialog.getByRole('tab', { name: 'Catatan' }).click();
  await expect(dialog.getByLabel('Bukti atau alasan perencanaan')).toBeVisible();
});

test('MRO command center creates initial job card with selected approved data', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);

  await page.goto('/maintenance?defect=DEF-MROV1-MRB-001', { waitUntil: 'networkidle' });
  const dialog = page.getByRole('dialog', { name: 'Assign Work Package' });
  await expect(dialog).toBeVisible({ timeout: 15000 });

  await dialog.getByRole('tab', { name: 'Material' }).click();
  await dialog.getByRole('combobox', { name: 'Approved maintenance data' }).click();
  await page.getByRole('option', { name: 'AMM AMA-MROV2-AMM-001 / REV-MROV2-ACTIVE' }).click();
  await expect(
    dialog.getByRole('textbox', { name: 'Approved maintenance data reference' })
  ).toHaveValue('AMA-MROV2-AMM-001');
  await expect(dialog.getByRole('textbox', { name: 'Revision snapshot' })).toHaveValue(
    'REV-MROV2-ACTIVE'
  );

  await dialog.getByRole('tab', { name: 'Catatan' }).click();
  await dialog
    .getByLabel('Bukti atau alasan perencanaan')
    .fill('Demo package created with controlled approved data selected from library.');
  await dialog.getByRole('button', { name: 'Simpan' }).click();

  await expect(page).toHaveURL(/\/maintenance\/work-packages\/mwp-[^/]+\/overview/u, {
    timeout: 15000
  });
  await page.goto(`${page.url().replace(/\/overview$/u, '')}/execution`, {
    waitUntil: 'networkidle'
  });
  await page.getByRole('button', { name: /Brake wear indication/u }).click();
  const jobCardPanel = page.locator('.v-expansion-panel').filter({
    hasText: 'Brake wear indication'
  });
  await expect(jobCardPanel.getByText('Dokumen kerja')).toBeVisible();
  await expect(jobCardPanel.getByText('AMA-MROV2-AMM-001 / REV-MROV2-ACTIVE')).toBeVisible();
  await expect(jobCardPanel.getByRole('link', { name: 'AMM reference extract' })).toHaveAttribute(
    'href',
    '/mro/reference/amm-c208b-rev-a.txt'
  );
  await expect(jobCardPanel.getByText('Approved data belum tertaut')).toHaveCount(0);
});

test('MRO command center remains usable across desktop, tablet, and mobile widths', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/maintenance', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Pusat Kendali MRO' })).toBeVisible();
    await expect(page.getByText('Release Readiness')).toBeVisible();
    await expect(page.getByText('Work Package by Priority')).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 24);
  }
});
