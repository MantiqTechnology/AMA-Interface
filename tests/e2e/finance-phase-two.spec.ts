import { expect, test, type Page } from '@playwright/test';

const pages = [
  ['/finance/dashboard?period=2026-08', 'Finance Dashboard'],
  ['/finance/statements?period=2026-08', 'Financial Statements'],
  ['/finance/hpp?period=2026-08', 'Aviation Profitability'],
  ['/finance/closing', 'Period Closing'],
  ['/finance/audit', 'Finance Audit & Export']
] as const;

function captureRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.url().includes('/api/finance/') && response.status() >= 500) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  return errors;
}

async function expectNoDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
}

test('Phase 2 finance workspaces render real accounting data on desktop', async ({ page }) => {
  const errors = captureRuntimeErrors(page);
  for (const [path, heading] of pages) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    await expectNoDocumentOverflow(page);
  }
  await page.goto('/finance/hpp?period=2026-08', { waitUntil: 'networkidle' });
  await expect(page.getByText('AMA-20260811-001')).toBeVisible();
  await expect(page.getByText('Rp 28.000.000').first()).toBeVisible();
  await page.screenshot({ path: '/tmp/ama-finance-phase2-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('Phase 2 finance reporting remains usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = captureRuntimeErrors(page);
  for (const [path, heading] of pages.slice(0, 3)) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    await expectNoDocumentOverflow(page);
  }
  await page.screenshot({ path: '/tmp/ama-finance-phase2-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('Finance Audit provides seeded governance evidence and playable journal trace', async ({
  page
}) => {
  const errors = captureRuntimeErrors(page);
  await page.goto('/finance/audit', { waitUntil: 'networkidle' });

  await expect(page.locator('.mdi-shield-search').first()).toBeVisible();
  await expect(page.getByText('Recent controlled exports', { exact: true })).toBeVisible();
  await expect(page.getByText('general ledger', { exact: true }).first()).toBeVisible();
  const traceButton = page.getByRole('button', { name: 'Trace' });
  await expect(traceButton).toBeEnabled();
  await traceButton.click();
  await expect(page.getByText('Accounting lineage', { exact: true })).toBeVisible();
  await expect(page.getByText('Governance action failed')).toHaveCount(0);
  await expect(page.getByText('Trace failed')).toHaveCount(0);
  expect(errors).toEqual([]);
});
