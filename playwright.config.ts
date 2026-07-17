import { dirname } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const port = 3100;
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
    command: `env -u BASH_ENV PATH=${nodeBinDirectory}:/usr/local/bin:/usr/bin:/bin bash --noprofile --norc -c 'export NUXT_BUILD_DIR=.nuxt-playwright AMA_DB_PATH=./data/playwright.sqlite; corepack pnpm exec nuxi cleanup && corepack pnpm exec nuxi prepare && corepack pnpm demo:reset && corepack pnpm dev --port 3100'`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
