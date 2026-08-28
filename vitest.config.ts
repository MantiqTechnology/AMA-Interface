import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'process.env.DEMO_SEED_DATE': JSON.stringify('2026-07-17'),
    'process.env.AMA_SKIP_STARTUP_RESET': JSON.stringify('true')
  },
  resolve: {
    alias: {
      '#operations': fileURLToPath(new URL('./app/utils/operations', import.meta.url)),
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '#server': fileURLToPath(new URL('./server', import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 15000,
    env: {
      DEMO_SESSION_SECRET: 'ama-test-session-secret-at-least-32-bytes',
      AMA_ALLOW_LEGACY_TEST_ROLE_COOKIE: 'true'
    }
  }
});
