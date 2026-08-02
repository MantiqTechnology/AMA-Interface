import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { uiScreens, type UiCaptureRole } from './screens';

function projectRole(testInfo: TestInfo): UiCaptureRole {
  const metadata = testInfo.project.metadata as { role?: UiCaptureRole };
  return metadata.role ?? 'Demo Admin';
}

async function stabilizePage(page: Page) {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation: none !important;
        caret-color: transparent !important;
        transition: none !important;
      }

      [data-audit-ignore],
      [data-sensitive] {
        visibility: hidden !important;
      }
    `
  });

  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

for (const screen of uiScreens) {
  test(screen.id, async ({ baseURL, context, page }, testInfo) => {
    const role = projectRole(testInfo);
    test.skip(
      Boolean(screen.roles?.length) && !(screen.roles ?? []).includes(role),
      `${role} not in scope`
    );

    const cookieUrl = new URL('/', baseURL ?? 'http://localhost:3100').toString();
    await context.addCookies([{ name: 'ama_demo_role', value: role, url: cookieUrl }]);

    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    await page.goto(screen.path, { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: screen.ready.heading, level: screen.ready.level })
    ).toBeVisible();

    if (screen.prepare) {
      await screen.prepare(page);
    }

    await stabilizePage(page);
    await expect(page.locator('text=undefined')).toHaveCount(0);

    const outputDirectory = path.join('artifacts', 'ui-capture', testInfo.project.name);
    await mkdir(outputDirectory, { recursive: true });

    const sensitiveElements = page.locator('[data-sensitive]');
    const baseName = path.join(outputDirectory, screen.id);

    await page.screenshot({
      path: `${baseName}--ppt.png`,
      fullPage: false,
      animations: 'disabled',
      mask: [sensitiveElements]
    });

    await page.screenshot({
      path: `${baseName}--full.png`,
      fullPage: true,
      animations: 'disabled',
      mask: [sensitiveElements]
    });

    const ariaSnapshot = await page.locator('body').ariaSnapshot();
    await writeFile(`${baseName}--aria.yml`, ariaSnapshot, 'utf-8');

    await writeFile(
      `${baseName}--metadata.json`,
      JSON.stringify(
        {
          id: screen.id,
          path: screen.path,
          project: testInfo.project.name,
          role,
          viewport: page.viewportSize(),
          capturedAt: new Date().toISOString()
        },
        null,
        2
      ),
      'utf-8'
    );

    expect(runtimeErrors).toEqual([]);
  });
}
