import { expect, test } from '@playwright/test';

const screens = [
  ['/dashboard', 'PT AMA Aviation Dashboard'],
  ['/ops?period=TODAY&anchorDate=2026-07-17', 'Ops Overview'],
  ['/flights/dashboard?period=TODAY&anchorDate=2026-07-17', 'Flight Control Overview'],
  ['/admin/access-demo', 'Access Demo'],
  ['/maintenance/flight-handoffs', 'Flight Handoffs'],
  ['/invoices', 'Invoices'],
  ['/invoices/inv-closed-djj-wmx', 'AMA-INV-20260707-001']
] as const;

for (const [path, heading] of screens) {
  test(`${heading} renders the adapted frontend without runtime placeholders`, async ({
    context,
    page
  }) => {
    if (path === '/dashboard') {
      await context.addCookies([
        { name: 'ama_demo_role', value: 'Director', domain: 'localhost', path: '/' }
      ]);
    }
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('text=undefined')).toHaveCount(0);
    if (path === '/dashboard') {
      await expect(page.getByRole('tab', { name: 'Operations Control' })).toBeVisible();
      await expect(page.getByText("Today's Operational Health", { exact: true })).toBeVisible();
    }
    if (path === '/invoices') {
      await expect(page.getByText('Visible Margin', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('PT Papua Logistics').first()).toBeVisible();
    }
    if (path === '/invoices/inv-closed-djj-wmx') {
      await expect(page.getByText('Revenue Lines')).toBeVisible();
      await expect(page.getByText('Finance Handoff Timeline')).toBeVisible();
      await expect(page.getByText('Operational Cost', { exact: true }).first()).toBeVisible();
    }
    if (path === '/maintenance/flight-handoffs') {
      await expect(page.getByText('Closure Ready', { exact: true })).toBeVisible();
      await expect(page.getByText('Needs Attention', { exact: true })).toBeVisible();
      const pendingRow = page.getByRole('row').filter({ hasText: 'AMA-20260717-005' });
      await expect(pendingRow).toBeVisible();
      await pendingRow.click();
      await expect(page.getByText('Evidence checklist')).toBeVisible();
      await expect(page.getByText('Maintenance approval is missing')).toBeVisible();
    }
    expect(runtimeErrors).toEqual([]);
  });
}

test('operational dashboards preserve source filters in drill-down navigation', async ({
  page
}) => {
  await page.goto('/flights/dashboard?period=TODAY&anchorDate=2026-07-17', {
    waitUntil: 'networkidle'
  });
  const blockedMetric = page.locator('a').filter({ hasText: 'Blocked' }).first();
  await expect(blockedMetric).toBeVisible();
  await blockedMetric.click();
  await expect(page).toHaveURL(
    /\/flights\?.*dateFrom=2026-07-17.*dateTo=2026-07-17.*status=BLOCKED/u
  );
  await expect(page.getByRole('heading', { level: 1, name: 'Flight Orders' })).toBeVisible();

  await page.goto('/ops?period=TODAY&anchorDate=2026-07-17', { waitUntil: 'networkidle' });
  const sourceLink = page.getByRole('link', { name: /Flight Following/u }).first();
  await expect(sourceLink).toBeVisible();
  await sourceLink.click();
  await expect(page).toHaveURL(
    /\/ops\/flight-following\?.*dateFrom=2026-07-17.*dateTo=2026-07-17/u
  );
});

test('maintenance workbench filters and exposes approval only to maintenance roles', async ({
  context,
  page
}) => {
  await context.addCookies([
    {
      name: 'ama_demo_role',
      value: 'Maintenance Manager',
      url: 'http://localhost:3100'
    }
  ]);
  await page.goto('/flights/maintenance?flightId=fop-in-progress', {
    waitUntil: 'networkidle'
  });
  await expect(page).toHaveURL(/\/maintenance\/flight-handoffs\?flightId=fop-in-progress$/u);
  await expect(page.getByRole('heading', { name: 'AMA-20260717-005' })).toBeVisible();
  await page.getByRole('button', { name: 'Close maintenance details' }).click();
  const search = page.getByRole('textbox', { name: 'Search flight or aircraft' });
  await search.fill('PK-AMB');
  const pendingRow = page.getByRole('row').filter({ hasText: 'AMA-20260717-005' });
  await expect(pendingRow).toBeVisible();
  await pendingRow.click();
  await expect(page.getByText('Evidence checklist')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Review and approve closure handoff' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close maintenance details' }).click();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(search).toHaveValue('');
});

test('station technical handoff stays separate from MRO approval', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ama_demo_role',
      value: 'Station Admin',
      url: 'http://localhost:3100'
    }
  ]);
  await page.goto('/flights/maintenance', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/flights\/station-operations\/maintenance(?:\?|$)/u);
  await expect(page.getByRole('heading', { name: 'Temuan Teknis & Handoff MRO' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Laporkan temuan' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Review and approve closure handoff' })
  ).toHaveCount(0);

  const deniedMroQueue = await page.request.get('/api/flight-operations/maintenance');
  expect(deniedMroQueue.status()).toBe(403);

  await page.goto('/maintenance/flight-handoffs', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/dashboard$/u);
});

test('canonical operational screens remain usable on mobile', async ({ context, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Director', domain: 'localhost', path: '/' }
  ]);

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { level: 1, name: 'PT AMA Aviation Dashboard' })
  ).toBeVisible();
  await expect(page.getByText('Live Flight Operations', { exact: true })).toBeVisible();
  await expect(page.getByText('Fleet & Maintenance Control', { exact: true })).toBeVisible();

  const readinessScroll = await page.locator('.readiness-chain').evaluate((element) => {
    element.scrollLeft = 120;
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      scrollLeft: element.scrollLeft
    };
  });
  expect(readinessScroll.scrollWidth).toBeGreaterThan(readinessScroll.clientWidth);
  expect(readinessScroll.scrollLeft).toBeGreaterThan(0);

  const mobileTopCards = await page
    .locator('.top-grid > .panel-card')
    .evaluateAll((elements) =>
      elements.slice(0, 2).map((element) => element.getBoundingClientRect().top)
    );
  expect(mobileTopCards[1] ?? 0).toBeGreaterThan(mobileTopCards[0] ?? 0);
  await page.getByRole('button', { name: 'Refresh dashboard' }).click();

  const dashboardDimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dashboardDimensions.content).toBeLessThanOrEqual(dashboardDimensions.viewport);

  await page.goto('/invoices', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Invoices' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open invoice' }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Open invoice' }).first().click();
  await expect(page.getByText('Revenue Lines')).toBeVisible();
  await expect(page.locator('text=undefined')).toHaveCount(0);

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test('management dashboard keeps draft filters unapplied until Apply is selected', async ({
  context,
  page
}) => {
  let managementRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/dashboard/management')) managementRequests += 1;
  });
  await context.addCookies([
    {
      name: 'ama_demo_role',
      value: 'Director',
      domain: 'localhost',
      path: '/'
    }
  ]);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Management Performance' }).click();
  await expect(page).toHaveURL(/tab=management/u);
  await expect(page.getByText('Operational Performance', { exact: true })).toBeVisible();
  await expect(page.getByText('Financial Performance', { exact: true })).toBeVisible();

  const dateFrom = page.getByLabel('Date from');
  const requestsBeforeDraftChanges = managementRequests;
  await dateFrom.fill('2026-08-21');
  await page.getByLabel('Operation type').press('ArrowDown');
  await page.getByRole('option', { name: 'Charter', exact: true }).click();
  await page.getByLabel('Compared to').press('ArrowDown');
  await page.getByRole('option', { name: 'No comparison', exact: true }).click();
  await expect(page).not.toHaveURL(/dateFrom=2026-08-21/u);
  await expect.poll(() => managementRequests).toBe(requestsBeforeDraftChanges);

  const appliedResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/dashboard/management') &&
      response.url().includes('dateFrom=2026-08-21') &&
      response.url().includes('operationType=CHARTER') &&
      response.url().includes('comparison=NONE')
  );
  await page.getByRole('button', { name: 'Apply' }).click();
  await appliedResponse;
  await expect(page).toHaveURL(/dateFrom=2026-08-21.*operationType=CHARTER.*comparison=NONE/u);
  expect(managementRequests).toBeGreaterThan(requestsBeforeDraftChanges);
});

test('management dashboard remains permission-gated', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ama_demo_role',
      value: 'OCC',
      domain: 'localhost',
      path: '/'
    }
  ]);
  await page.goto('/dashboard?tab=management', { waitUntil: 'networkidle' });
  await expect(page.getByRole('tab', { name: 'Management Performance' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Operations Control' })).toBeVisible();

  const deniedManagement = await page.request.get('/api/dashboard/management');
  expect(deniedManagement.status()).toBe(403);
});

test('management dashboard remains usable on mobile', async ({ context, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Director', domain: 'localhost', path: '/' }
  ]);
  await page.goto('/dashboard?tab=management&dateFrom=2026-08-29&dateTo=2026-09-04', {
    waitUntil: 'networkidle'
  });
  await expect(page.getByText('Operational Performance', { exact: true })).toBeVisible();
  await expect(page.getByText('Financial Performance', { exact: true })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test('aviation dashboard uses a readable visual scale on desktop', async ({ context, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Director', domain: 'localhost', path: '/' }
  ]);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  const fontSize = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => Number.parseFloat(window.getComputedStyle(element).fontSize));

  await expect(page.getByText("Today's Operational Health", { exact: true })).toBeVisible();
  expect(await fontSize('.page-header h1')).toBeGreaterThanOrEqual(24);
  expect(await fontSize('.dashboard-tabs .v-tab')).toBeGreaterThanOrEqual(14);
  expect(await fontSize('.operations-dashboard .panel-heading h2')).toBeGreaterThanOrEqual(17);
  expect(await fontSize('.operations-dashboard .panel-heading p')).toBeGreaterThanOrEqual(13);
  expect(await fontSize('.operations-dashboard .metric-cell strong')).toBeGreaterThanOrEqual(24);
  expect(await fontSize('.operations-dashboard .metric-cell span')).toBeGreaterThanOrEqual(14);
  expect(await fontSize('.operations-dashboard .compact-table td')).toBeGreaterThanOrEqual(13);
  expect(
    await fontSize('.operations-dashboard .flight-list a, .operations-dashboard .flight-ticket')
  ).toBeGreaterThanOrEqual(13);
  expect(await fontSize('.operations-dashboard .mini-summary strong')).toBeGreaterThanOrEqual(20);

  const operationsRowHeight = await page
    .locator('.operations-dashboard .compact-table tr')
    .first()
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(operationsRowHeight).toBeGreaterThanOrEqual(42);

  await page.getByRole('button', { name: 'View controls' }).click();
  await expect(page.getByLabel('Show Attention, actions & freshness')).toBeVisible();
  await page.getByRole('button', { name: 'Close dashboard controls' }).click();

  await page.getByRole('tab', { name: 'Management Performance' }).click();
  await expect(page.getByText('Operational Performance', { exact: true })).toBeVisible();
  await expect(page.getByText('Operational Risk & Safety', { exact: true })).toBeVisible();
  await expect(page.getByText('Key Insights', { exact: true })).toBeVisible();
  await expect(page.getByText('Route Performance', { exact: true })).toBeVisible();
  expect(await fontSize('.management-dashboard .panel-heading h2')).toBeGreaterThanOrEqual(17);
  expect(await fontSize('.management-dashboard .management-metric strong')).toBeGreaterThanOrEqual(
    20
  );
  expect(await fontSize('.management-dashboard .management-metric span')).toBeGreaterThanOrEqual(
    13
  );
  expect(await fontSize('.management-dashboard .table-card td')).toBeGreaterThanOrEqual(13);

  const managementRowHeight = await page
    .locator('.management-dashboard .table-card tr')
    .first()
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(managementRowHeight).toBeGreaterThanOrEqual(42);

  const chartHeights = await page
    .locator('.management-dashboard .chart-card .apexcharts-canvas')
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  if (chartHeights.length) {
    for (const chartHeight of chartHeights) {
      expect(chartHeight).toBeGreaterThanOrEqual(280);
      expect(chartHeight).toBeLessThanOrEqual(320);
    }
  } else {
    await expect(
      page.locator('.management-dashboard .chart-card .panel-empty').first()
    ).toBeVisible();
  }

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test('aviation dashboard preserves explicit operational and data-state semantics', async ({
  context,
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Director', domain: 'localhost', path: '/' }
  ]);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  await expect(page.getByText('Data health', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View details' }).click();
  await expect(page.getByText('DISCONNECTED', { exact: true })).toBeVisible();
  await expect(page.locator('.lifecycle-counts')).toContainText('Exception');
  await expect(page.getByText('RTS: No estimate available', { exact: true }).first()).toBeVisible();

  const criticalCard = page.locator('.issue-list .issue-card').first();
  if (await criticalCard.count()) {
    await expect(criticalCard.getByText('Impact', { exact: true })).toBeVisible();
    await expect(criticalCard.getByText('Owner', { exact: true })).toBeVisible();
    await expect(criticalCard.getByText('Required action', { exact: true })).toBeVisible();
  }
});

test('aviation dashboard limits primary card groups to two columns on wide screens', async ({
  context,
  page
}) => {
  await page.setViewportSize({ width: 1700, height: 900 });
  await context.addCookies([
    { name: 'ama_demo_role', value: 'Director', domain: 'localhost', path: '/' }
  ]);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  const operationsCardTops = await page
    .locator('.top-grid > .panel-card')
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
  expect(operationsCardTops).toHaveLength(2);
  expect(operationsCardTops[1] ?? 0).toBeCloseTo(operationsCardTops[0] ?? 0, 0);

  await page.getByRole('tab', { name: 'Management Performance' }).click();
  await expect(page.getByText('Operational Performance', { exact: true })).toBeVisible();
  const managementCardTops = await page
    .locator('.metric-groups > .metric-group')
    .evaluateAll((elements) =>
      elements.slice(0, 3).map((element) => element.getBoundingClientRect().top)
    );
  expect(managementCardTops[1] ?? 0).toBeCloseTo(managementCardTops[0] ?? 0, 0);
  expect(managementCardTops[2] ?? 0).toBeGreaterThan(managementCardTops[0] ?? 0);
});
