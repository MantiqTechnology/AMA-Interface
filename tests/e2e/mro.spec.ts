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

test('MRO golden path issues technical release from authoritative work-package detail', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([{ name: 'ama_demo_role', value: 'Certifying Staff', url: cookieUrl }]);

  await page.goto('/maintenance', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Pusat Kendali MRO' })).toBeVisible();
  await expect(page.getByText('Starter-generator indication rectification')).toBeVisible();

  await page.goto('/maintenance/work-packages/mwp-mrov1-release-ready', {
    waitUntil: 'networkidle'
  });
  await expect(
    page.getByRole('heading', { name: 'Starter-generator indication rectification' })
  ).toBeVisible();
  await expect(page.getByText('MWP-MROV1-RTS', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Starter-generator indication rectification', { exact: true }).first()
  ).toBeVisible();
  await page.getByRole('button', { name: /Rectify starter-generator indication wiring/u }).click();
  await expect(page.getByText('Pemeriksaan independen lulus').first()).toBeVisible();
  await expect(page.getByText('Seluruh pekerjaan wajib selesai')).toBeVisible();

  await page.getByRole('button', { name: 'Terbitkan rilis teknis' }).click();
  await expect(
    page.getByRole('heading', { name: 'Konfirmasi rilis teknis pesawat' })
  ).toBeVisible();
  await expect(page.getByText('AME-CERT-MRO-001').first()).toBeVisible();
  await expect(page.getByText('Lisensi dan wewenang PT AMA terverifikasi').first()).toBeVisible();

  await page.getByRole('button', { name: 'Terbitkan rilis teknis' }).last().click();
  await expect(page.getByText('Rilis teknis selesai')).toBeVisible();
  await page.getByRole('button', { name: 'Tutup' }).click();

  await expect(page.getByText('Snapshot wewenang signer')).toBeVisible();
  await expect(page.getByText('Serviceable', { exact: true }).first()).toBeVisible();
});

test('MRO technical record renders release decision modal and gates drawer', async ({
  baseURL,
  context,
  page
}) => {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Maintenance Manager', url: cookieUrl }
  ]);

  await page.goto('/maintenance/work-packages/mwp-mrov21-conflict', { waitUntil: 'networkidle' });
  await expect(page.getByText('MWP-MROV21-CONFLICT').first()).toBeVisible();
  await page.getByRole('button', { name: 'Tampilkan Rekam Teknis' }).click();

  await expect(page.getByText('Rekam Teknis Work Package')).toBeVisible({ timeout: 15000 });
  const dialog = page.locator('.technical-record-card');
  await expect(dialog.getByText('UNSERVICEABLE • RELEASE BLOCKED')).toBeVisible();
  await expect(dialog.getByText('DEMO - NOT FOR OPERATIONAL USE')).toBeVisible();
  await expect(dialog.getByText('Mandatory Job Cards')).toBeVisible();
  await expect(dialog.getByText('Belum ditautkan').first()).toBeVisible();

  await dialog.getByRole('tab', { name: 'Job Cards' }).click();
  await expect(dialog.getByText('No job card linked')).toBeVisible();
  await dialog.getByRole('button', { name: 'Lihat Gates Rilis' }).click();

  await expect(page.getByRole('heading', { name: 'Gates Rilis Teknis' })).toBeVisible();
  await expect(page.getByText('Missing / Belum selesai').first()).toBeVisible();
  await expect(page.getByText('Next required actions')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terbitkan Rilis Teknis' }).last()).toBeDisabled();
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
  await expect(dialog.getByLabel('Approved maintenance data reference')).toBeVisible();
  await dialog.getByRole('tab', { name: 'Catatan' }).click();
  await expect(dialog.getByLabel('Bukti atau alasan perencanaan')).toBeVisible();
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
