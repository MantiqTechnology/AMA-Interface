import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const secret = process.env.DEMO_SESSION_SECRET ?? '';
if (Buffer.byteLength(secret) < 32) {
  console.error('Set DEMO_SESSION_SECRET to at least 32 bytes before running demo:present.');
  process.exit(1);
}

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs');
await access(serverEntry).catch(() => {
  console.error('Production build not found. Run pnpm demo:prepare first.');
  process.exit(1);
});

const dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite';
const helper = process.env.DEMO_ACCOUNT_HELPER ?? 'true';
const child = spawn(process.execPath, [serverEntry], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: process.env.PORT ?? '3000',
    DEMO_MODE: 'true',
    DEMO_ACCOUNT_HELPER: helper,
    DEMO_SESSION_SECRET: secret,
    AMA_DB_PATH: dbPath,
    NUXT_DB_PATH: dbPath,
    NUXT_DEMO_MODE: 'true',
    NUXT_DEMO_SESSION_SECRET: secret,
    NUXT_DEMO_ACCOUNT_HELPER: helper,
    NUXT_PUBLIC_DEMO_MODE: 'true',
    NUXT_PUBLIC_DEMO_ACCOUNT_HELPER: helper
  }
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
