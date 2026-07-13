import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
    testTimeout: 15000
  }
});
