import { expect, test, type BrowserContext } from '@playwright/test';

async function setRole(context: BrowserContext, baseURL: string | undefined, role: string) {
  const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
  await context.clearCookies();
  await context.addCookies([{ name: 'ama_demo_role', value: role, url: cookieUrl }]);
}

test('maintenance due control renders planning workspace, computed summary, table, and drawer', async ({
  baseURL,
  context,
  page
}) => {
  await setRole(context, baseURL, 'Maintenance Manager');
  await page.goto('/maintenance/due-control', { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'Jatuh Tempo Perawatan' })).toBeVisible();
  await expect(page.getByText('Maintenance Due Control & Planning Workspace')).toBeVisible();
  await expect(page.getByText('LOCAL DEMO · SYNTHETIC DATA').first()).toBeVisible();
  await expect(
    page.getByText(
      'Intervals and forecasts in this environment are synthetic and must not be used as an approved maintenance program.'
    )
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: /Overdue Mandatory\s+3\s+Requirements/u })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Due Within 30 Days\s+1\s+Requirements/u })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Unplanned\s+4\s+Requirements/u })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Resource Blocked\s+1\s+Requirements/u })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Aircraft Affected\s+2\s+Aircraft/u })
  ).toBeVisible();

  const decisionStatus = page.locator('.decision-status');
  await expect(decisionStatus.getByText('ACTION')).toBeVisible();
  await expect(decisionStatus.getByText('REQUIRED')).toBeVisible();
  await expect(page.getByText('PK-MRA · MROV2-C208-CTRL-001').first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Due Basis' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Current / Due' })).toBeVisible();
  await expect(page.getByText('Whichever occurs first', { exact: true })).toBeVisible();
  await expect(page.getByText('Work Package Draft')).toBeVisible();
  await expect(page.getByText('Refresh Utilization')).toBeVisible();

  const drawer = page.locator('.requirement-drawer');
  await expect(drawer.getByRole('heading', { name: 'PK-MRA · MROV2-C208-CTRL-001' })).toBeVisible();
  await expect(drawer.getByText('AAMP C208B')).toBeVisible();
  await expect(drawer.getByText('MPD Task 05-10-01')).toBeVisible();
  await expect(drawer.getByText('No active Work Package')).toBeVisible();
  await expect(drawer.getByText('Overdue: 10 FH · 1 day exceeded')).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Create Work Package' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Assign Planner' })).toBeVisible();
});

test('due control filters by summary card, planning horizon, search, and selected row', async ({
  baseURL,
  context,
  page
}) => {
  await setRole(context, baseURL, 'Maintenance Manager');
  await page.goto('/maintenance/due-control', { waitUntil: 'networkidle' });

  const table = page.locator('.requirement-table');
  await expect(table.getByText('MROV2-C208-CTRL-001')).toBeVisible();

  await page.getByRole('button', { name: /Due Within 30 Days\s+1\s+Requirements/u }).click();
  await expect(table.getByText('MROV2-C208-FORECAST-003')).toBeVisible();
  await expect(table.getByText('MROV2-C208-CTRL-001')).toHaveCount(0);
  await expect(table.getByText('DUE SOON')).toBeVisible();
  await expect(table.getByText('Open Work Package')).toBeVisible();

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('textbox', { name: /Search requirement, aircraft/u }).fill('PK-AMC');
  await expect(table.getByText('MROV2-PAC-DUE-002')).toBeVisible();
  await expect(table.getByText('MROV2-C208-CTRL-001')).toHaveCount(0);
  await expect(table.getByText('Stale')).toBeVisible();
  await expect(table.getByText('Refresh Utilization')).toBeVisible();

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('button', { name: 'Review Critical Requirements' }).click();
  await expect(
    page
      .locator('.requirement-drawer')
      .getByRole('heading', { name: 'PK-MRA · MROV2-C208-CTRL-001' })
  ).toBeVisible();
  await expect(page).toHaveURL(/summary=OVERDUE_MANDATORY/u);
});
