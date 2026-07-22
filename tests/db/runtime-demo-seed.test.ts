import { describe, expect, it } from 'vitest';
import { createDbClient } from '../../server/db/client';
import { runMigrations } from '../../server/db/migrate';
import { seedRuntimeDemoData } from '../../server/db/seed-runtime-demo';

describe('runtime demo seed', () => {
  it('includes Corporate Assets and remains idempotent across cold starts', async () => {
    const { db, sqlite } = createDbClient(':memory:');
    runMigrations(sqlite);

    await seedRuntimeDemoData(db, sqlite);
    const firstCount = (
      sqlite.prepare('SELECT COUNT(*) count FROM managed_assets').get() as { count: number }
    ).count;

    await seedRuntimeDemoData(db, sqlite);
    const secondCount = (
      sqlite.prepare('SELECT COUNT(*) count FROM managed_assets').get() as { count: number }
    ).count;

    expect(firstCount).toBeGreaterThan(0);
    expect(secondCount).toBe(firstCount);
    expect(
      sqlite.prepare("SELECT asset_code FROM managed_assets WHERE id = 'asset-gse-gpu-01'").get()
    ).toMatchObject({ asset_code: 'GSE-00001' });
    sqlite.close();
  });
});
