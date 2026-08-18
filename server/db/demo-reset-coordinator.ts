import { resetDemoDatabase } from './reset-demo';

let activeReset: Promise<void> | null = null;

export function resetDemoDatabaseExclusive(dbPath: string, anchorDate?: string) {
  if (activeReset) return activeReset;
  activeReset = resetDemoDatabase(dbPath, { anchorDate }).finally(() => {
    activeReset = null;
  });
  return activeReset;
}
