import { createDemoSeedContext } from '../db/seeds/context';

export function getApplicationNow() {
  const runtimeConfig = (
    globalThis as { useRuntimeConfig?: () => { demoMode?: unknown } }
  ).useRuntimeConfig?.();
  const demoMode = runtimeConfig?.demoMode ?? process.env.DEMO_MODE ?? 'true';
  return String(demoMode) === 'true' ? createDemoSeedContext().now : new Date().toISOString();
}
