import { defineConfig, devices } from '@playwright/test';

const port = 3100;

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
    command:
      "NUXT_BUILD_DIR=.nuxt-playwright AMA_DB_PATH=./data/playwright.sqlite bash -lc 'pnpm exec nuxi cleanup && pnpm exec nuxi prepare && pnpm demo:reset && pnpm dev --port 3100'",
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
