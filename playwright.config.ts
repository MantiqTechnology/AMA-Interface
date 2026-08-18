import { dirname } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const nodeBinDirectory = dirname(process.execPath);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: `env -u BASH_ENV PATH=${nodeBinDirectory}:/usr/local/bin:/usr/bin:/bin bash --noprofile --norc -c 'export DEMO_SEED_DATE=2026-07-17 NUXT_BUILD_DIR=.nuxt-playwright AMA_DB_PATH=./data/playwright.sqlite AMA_DOCUMENT_MANIFEST=./data/playwright-documents.json AMA_UPLOAD_MANIFEST=./data/playwright-uploads.json AMA_UPLOAD_DIR=./data/uploads/playwright; corepack pnpm demo:reset && corepack pnpm exec nuxi cleanup && corepack pnpm exec nuxi prepare && corepack pnpm dev --port ${port}'`,
    url: `http://localhost:${port}`,
    reuseExistingServer: Boolean(process.env.PLAYWRIGHT_REUSE_SERVER),
    timeout: 120_000
  }
});
