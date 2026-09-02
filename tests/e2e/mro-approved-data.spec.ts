import { expect, test, type BrowserContext } from '@playwright/test';

async function setRole(context: BrowserContext, baseURL: string | undefined, role: string) {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.clearCookies();
  await context.addCookies([{ name: 'ama_demo_role', value: role, url: cookieUrl }]);
}

test('approved maintenance data library renders controlled table, filters, drawer, and preview', async ({
  baseURL,
  context,
  page
}) => {
  await setRole(context, baseURL, 'Maintenance Manager');
  await page.goto('/maintenance/approved-data', { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'Data Perawatan Terkendali' })).toBeVisible();
  await expect(page.getByText('Controlled Approved Maintenance Data Library')).toBeVisible();
  await expect(page.getByText('LOCAL DEMO · SYNTHETIC DATA').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Current Documents/u })).toBeVisible();
  await expect(page.getByRole('button', { name: /Under Review/u }).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Document' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Lifecycle' })).toBeVisible();
  const libraryTable = page.locator('.approved-data-table');
  await expect(libraryTable.getByText('AMA-MROV2-AMM-001')).toBeVisible();
  await expect(libraryTable.getByText('AMA-MROV2-IPC-001')).toBeVisible();
  await expect(libraryTable.getByText('AMA-MROV2-SRM-001')).toBeVisible();
  await expect(libraryTable.getByText('AMA-OPR-PROC-001')).toBeVisible();
  await expect(libraryTable.getByText('AMA-MOD-INS-004')).toBeVisible();

  await expect(page.getByText('Revisi Aktif')).toBeVisible();
  await expect(page.getByText('File Dokumen')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Revision Impact' })).toBeVisible();

  await page
    .getByRole('button', { name: /Under Review/u })
    .first()
    .click();
  await expect(libraryTable.getByText('AMA-MROV2-IPC-001')).toBeVisible();
  await expect(libraryTable.getByText('Technical Review')).toBeVisible();
  await expect(libraryTable.getByText('AMA-MROV2-SRM-001')).toHaveCount(0);

  await page.getByRole('button', { name: 'Reset Filter' }).click();
  await page.getByRole('textbox', { name: /Cari dokumen/u }).fill('SRM');
  await expect(libraryTable.getByText('AMA-MROV2-SRM-001')).toBeVisible();
  await expect(libraryTable.getByText('AMA-MROV2-IPC-001')).toHaveCount(0);

  await page.getByRole('button', { name: 'Reset Filter' }).click();
  await page.getByText('AMA-MROV2-AMM-001').first().click();
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByText('DEMONSTRATION DATA — NOT FOR ACTUAL MAINTENANCE')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Full Document' }).last()).toBeVisible();
});

test('revision upload workflow queues metadata and impact review without making revision current', async ({
  baseURL,
  context,
  page
}) => {
  await setRole(context, baseURL, 'Maintenance Manager');
  await page.goto('/maintenance/approved-data', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Unggah Revisi' }).click();
  await expect(page.getByText('Unggah Revisi Baru')).toBeVisible();
  await expect(page.getByText('Upload tidak otomatis menjadi Current')).toBeVisible();
  await page.getByLabel('Revision label').fill('REV 43');
  const workflowDialog = page.getByRole('dialog');

  await page.getByRole('button', { name: 'Continue Review' }).click();
  await expect(page.getByText('Metadata completeness')).toBeVisible();
  await page.getByRole('button', { name: 'Continue Review' }).click();
  await expect(page.getByText('Engineering review')).toBeVisible();
  await page.getByRole('button', { name: 'Continue Review' }).click();
  await expect(
    page.getByText('Revision Impact Pending — 4 active Job Cards affected.')
  ).toBeVisible();
  await expect(
    workflowDialog.getByRole('button', { name: 'Continue Using Frozen Revision' })
  ).toBeVisible();
  await expect(
    workflowDialog.getByRole('button', { name: 'Update Before Execution' })
  ).toBeVisible();
  await expect(workflowDialog.getByRole('button', { name: 'Stop Work and Review' })).toBeVisible();
  await expect(workflowDialog.getByRole('button', { name: 'Not Affected' })).toBeVisible();
  await expect(workflowDialog.getByRole('button', { name: 'Reissue Job Card' })).toBeVisible();

  await page.getByRole('button', { name: 'Queue Impact Review' }).click();
  await expect(
    page.getByText(
      'Revision Impact Pending — 4 active Job Cards affected. Pilih treatment sebelum execution berikutnya.'
    )
  ).toBeVisible();
  await expect(page.getByText('REV 43')).toHaveCount(0);
  await expect(page.getByText('REV 42').first()).toBeVisible();
});
