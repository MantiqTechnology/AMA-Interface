import { expect, test, type BrowserContext } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

async function setRole(context: BrowserContext, baseURL: string | undefined, role: string) {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.clearCookies();
  await context.addCookies([{ name: 'ama_demo_role', value: role, url: cookieUrl }]);
}

test('plays non-routine finding corrective workflow through Work Package UI', async ({
  baseURL,
  context,
  page
}) => {
  test.setTimeout(120_000);
  const artifactDir = path.join('artifacts', 'mro-demo-v3-m4');
  mkdirSync(artifactDir, { recursive: true });
  const output = (name: string) => path.join(artifactDir, name);
  const sourceTitle = `M4 source inspection ${Date.now()}`;
  const findingTitle = 'Hydraulic hose chafing at LH main landing gear';

  await setRole(context, baseURL, 'Maintenance Manager');
  await page.goto('/maintenance/work-packages/mwp-mrov1-active', { waitUntil: 'networkidle' });
  await page.getByLabel('Judul').fill(sourceTitle);
  await page.getByLabel('Approved maintenance data reference').fill('AMM DEMO 05-20-00');
  await page.getByRole('button', { name: 'Tambah kartu kerja' }).click();
  await expect(page.getByText(sourceTitle)).toBeVisible();

  await setRole(context, baseURL, 'Maintenance Technician');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: new RegExp(sourceTitle, 'u') }).click();
  await page.getByRole('button', { name: 'Mulai pekerjaan' }).click();
  await expect(page.getByRole('button', { name: 'Catat Temuan' })).toBeVisible();
  await page.screenshot({ path: output('01-job-card-active.png'), fullPage: true });

  await page.getByRole('button', { name: 'Catat Temuan' }).click();
  await expect(page.getByRole('heading', { name: 'Catat Temuan Non-Routine' })).toBeVisible();
  await expect(page.getByText('Work Package', { exact: true })).toBeVisible();
  await expect(page.getByText('Field wajib belum lengkap')).toBeVisible();
  await page.getByLabel('Judul temuan').fill(findingTitle);
  await page
    .getByLabel('Deskripsi temuan')
    .fill('Mechanic found unexpected hydraulic hose chafing during planned inspection.');
  await page.getByLabel('Ada dampak keselamatan langsung').click();
  await expect(page.getByText('Concern keselamatan aktif')).toBeVisible();
  await expect(page.getByLabel('Dampak operasional')).toHaveValue('Grounding / AOG');
  await expect(page.getByLabel('Klasifikasi temuan')).toHaveValue('Safety critical');
  await expect(page.getByLabel('Prioritas')).toHaveValue('AOG');
  await page.getByLabel('Lokasi / Sistem').fill('LH main landing gear');
  await page.getByRole('textbox', { name: 'ATA', exact: true }).fill('29');
  await page
    .getByLabel('Tindakan segera')
    .fill('Stop aircraft movement and notify Maintenance Control for grounding assessment.');
  await page.locator('.non-routine-dialog input[type="file"]').setInputFiles({
    name: 'm4-non-routine-evidence.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l1E9YQAAAABJRU5ErkJggg==',
      'base64'
    )
  });
  await page.getByRole('button', { name: 'Upload Bukti' }).click();
  await expect(page.getByText('m4-non-routine-evidence.png')).toBeVisible();
  await page.screenshot({ path: output('02-create-non-routine.png'), fullPage: true });
  await page.getByRole('button', { name: 'Simpan & Eskalasi Temuan' }).click();
  await expect(page.getByText('Release readiness akan terblokir')).toBeVisible();
  await expect(page.getByText('Menunggu Assessment').first()).toBeVisible();
  await page.screenshot({ path: output('03-nr-waiting-assessment.png'), fullPage: true });

  await setRole(context, baseURL, 'Maintenance Manager');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByLabel('Approved-data reference').first().fill('AMM DEMO 29-10-00');
  await page.screenshot({ path: output('04-nr-assessment.png'), fullPage: true });
  await page.getByRole('button', { name: 'Simpan Assessment' }).click();
  await expect(page.getByText('Buat/Lanjutkan Pekerjaan Korektif').first()).toBeVisible();

  await page.getByLabel('Approved maintenance data reference').first().fill('AMM DEMO 29-10-00');
  await page.screenshot({ path: output('05-corrective-job-card.png'), fullPage: true });
  await page.getByRole('button', { name: 'Buat Job Card Korektif' }).click();
  await expect(page.getByText(/Corrective work - Hydraulic hose chafing/u).first()).toBeVisible();

  await setRole(context, baseURL, 'Maintenance Technician');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Corrective work - Hydraulic hose chafing/u }).click();
  await page.getByRole('button', { name: 'Mulai pekerjaan' }).click();
  await expect(page.getByText('Pernyataan penyelesaian untuk').first()).toBeVisible();
  await page
    .getByLabel('Pernyataan penyelesaian pekerjaan')
    .fill('Corrective non-routine work completed with required evidence.');
  await page.screenshot({ path: output('07-corrective-signoff.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sahkan pekerjaan' }).click();
  await expect(page.getByText('Menunggu Inspeksi').first()).toBeVisible();

  await setRole(context, baseURL, 'Certifying Staff');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Corrective work - Hydraulic hose chafing/u }).click();
  await page.getByRole('button', { name: 'Catat pemeriksaan independen' }).click();
  await page
    .getByLabel('Pernyataan pemeriksaan')
    .fill('Independent inspection passed for non-routine corrective work.');
  await page
    .getByLabel('Saya mengonfirmasi hasil pemeriksaan ini benar dan akan dicatat permanen.')
    .check();
  await page.screenshot({ path: output('08-nr-inspection.png'), fullPage: true });
  await page.getByRole('button', { name: 'Catat pemeriksaan', exact: true }).click();
  await expect(page.getByText('Resolve Temuan').first()).toBeVisible();
  await page.screenshot({ path: output('09-nr-resolved-ready.png'), fullPage: true });

  await setRole(context, baseURL, 'Maintenance Manager');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Resolve Temuan' }).click();
  await expect(page.getByText('Tutup Temuan').first()).toBeVisible();
  await page.screenshot({ path: output('10-nr-resolved.png'), fullPage: true });
  await page.getByRole('button', { name: 'Tutup Temuan' }).click();
  await expect(page.getByText('Riwayat tertutup').first()).toBeVisible();
  await page.screenshot({ path: output('11-nr-closed.png'), fullPage: true });
});
