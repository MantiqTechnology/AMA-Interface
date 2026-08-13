import { expect, test, type BrowserContext } from '@playwright/test';
import path from 'node:path';

async function setRole(context: BrowserContext, baseURL: string | undefined, role: string) {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.clearCookies();
  await context.addCookies([{ name: 'ama_demo_role', value: role, url: cookieUrl }]);
}

test('captures failed inspection and rework loop screens', async ({ baseURL, context, page }) => {
  const output = (...segments: string[]) => path.join('artifacts', 'mro-rework', ...segments);

  await setRole(context, baseURL, 'Certifying Staff');
  await page.goto('/maintenance/work-packages/mwp-mrov1-active', { waitUntil: 'networkidle' });
  await page
    .getByRole('button', { name: /Troubleshoot engine indication wiring and sensor reference/u })
    .click();
  await page.getByRole('button', { name: 'Record independent inspection' }).click();
  await page.getByRole('button', { name: 'Failed' }).click();
  await page
    .getByLabel('Finding / inspection statement')
    .fill('Inspection found the engine indication wiring reference still unstable.');
  await page
    .getByLabel(
      'I confirm this inspection result is intentional and will be recorded as an immutable maintenance record.'
    )
    .check();
  await page.screenshot({ path: output('01-failed-inspection-confirmation.png'), fullPage: true });

  await page.getByRole('button', { name: 'Record inspection' }).click();
  await expect(page.getByText('Inspection failed — rework required').first()).toBeVisible();
  await page.screenshot({ path: output('02-package-rework-required.png'), fullPage: true });

  await setRole(context, baseURL, 'Maintenance Technician');
  await page.reload({ waitUntil: 'networkidle' });
  await page
    .getByRole('button', { name: /Troubleshoot engine indication wiring and sensor reference/u })
    .click();
  await page
    .getByLabel('Corrective action description')
    .fill('Corrected wiring reference termination and repeated engine indication stability check.');
  await page.getByLabel('Approved-data reference').fill('PTAMA-PAC750XL-IND-77-30-MROV1 REV A');
  await page
    .getByLabel('Mechanic sign-off statement')
    .fill('Corrective work completed and prepared for independent re-inspection.');
  await page.screenshot({ path: output('03-corrective-work-signoff.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sign corrective work' }).click();
  await expect(page.getByText('Awaiting Reinspection').first()).toBeVisible();

  await setRole(context, baseURL, 'Certifying Staff');
  await page.reload({ waitUntil: 'networkidle' });
  await page
    .getByRole('button', { name: /Troubleshoot engine indication wiring and sensor reference/u })
    .click();
  await page.getByRole('button', { name: 'Record re-inspection' }).click();
  await page
    .getByLabel('Inspection statement')
    .fill('Re-inspection passed after corrective work; engine indication is stable.');
  await page
    .getByLabel(
      'I confirm this inspection result is intentional and will be recorded as an immutable maintenance record.'
    )
    .check();
  await page.screenshot({ path: output('04-reinspection-confirmation.png'), fullPage: true });
  await page.getByRole('button', { name: 'Record inspection' }).click();
  await expect(page.getByText('Re-inspection passed.')).toBeVisible();
  await page.screenshot({ path: output('05-passed-reinspection-readiness.png'), fullPage: true });

  await page.goto('/maintenance/records?package=MWP-MROV1-ACTIVE', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Records & Audit' })).toBeVisible();
  await expect(page.getByText('Corrective Work Signed').first()).toBeVisible();
  await page.screenshot({ path: output('06-audit-chain.png'), fullPage: true });
});
