import { rm, stat } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, resolveDbPath } from '../../server/db/client';
import { resetDemoDatabase } from '../../server/db/reset-demo';

const dbPath = './data/test-reset-demo.sqlite';
const resolvedPath = resolveDbPath(dbPath);

beforeAll(async () => {
  await rm(resolvedPath, { force: true });
  await rm(`${resolvedPath}-wal`, { force: true });
  await rm(`${resolvedPath}-shm`, { force: true });
  await resetDemoDatabase(dbPath);
});

afterAll(async () => {
  await rm(resolvedPath, { force: true });
  await rm(`${resolvedPath}-wal`, { force: true });
  await rm(`${resolvedPath}-shm`, { force: true });
});

describe('demo database reset', () => {
  it('rebuilds in place so active server connections keep the canonical database', async () => {
    const observer = createDbClient(dbPath).sqlite;
    const inodeBefore = (await stat(resolvedPath)).ino;

    observer.prepare(`UPDATE flight_requests SET remarks = 'stale before reset'`).run();
    await resetDemoDatabase(dbPath);

    const inodeAfter = (await stat(resolvedPath)).ino;
    const seededRequest = observer
      .prepare(`SELECT id, remarks FROM flight_requests WHERE id = 'fr-2026-00124'`)
      .get() as { id: string; remarks: string | null } | undefined;

    expect(inodeAfter).toBe(inodeBefore);
    expect(seededRequest?.id).toBe('fr-2026-00124');
    expect(seededRequest?.remarks).not.toBe('stale before reset');
    observer.close();
  });
});
