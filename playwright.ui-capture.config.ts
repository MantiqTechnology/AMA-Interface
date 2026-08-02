import { dirname } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const nodeBinDirectory = dirname(process.execPath);

export default defineConfig({
  testDir: './tests/ui-capture',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'admin-desktop',
      metadata: { role: 'Demo Admin' },
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'admin-standard',
      metadata: { role: 'Demo Admin' },
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'station-tablet',
      metadata: { role: 'Station Admin' },
      use: {
        ...devices['Desktop Chrome'],
        hasTouch: true,
        viewport: { width: 1024, height: 1366 }
      }
    },
    {
      name: 'finance-reviewer-desktop',
      metadata: { role: 'Finance Reviewer' },
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'maintenance-mobile',
      metadata: { role: 'Maintenance Manager' },
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 }
      }
    },
    {
      name: 'maintenance-manager-desktop',
      metadata: { role: 'Maintenance Manager' },
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'certifying-staff-desktop',
      metadata: { role: 'Certifying Staff' },
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      }
    }
  ],
  webServer: {
    command: `env -u BASH_ENV PATH=${nodeBinDirectory}:/usr/local/bin:/usr/bin:/bin bash --noprofile --norc -c 'export DEMO_SEED_DATE=2026-07-17 NUXT_BUILD_DIR=.nuxt-playwright AMA_DB_PATH=./data/playwright.sqlite AMA_DOCUMENT_MANIFEST=./data/playwright-documents.json AMA_UPLOAD_MANIFEST=./data/playwright-uploads.json AMA_UPLOAD_DIR=./data/uploads/playwright; pnpm demo:reset && pnpm exec nuxi cleanup && pnpm exec nuxi prepare && pnpm dev --port ${port}'`,
    url: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 120_000
  }
});
