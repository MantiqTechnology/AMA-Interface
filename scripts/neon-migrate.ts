import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPostgresPool } from '../server/db/postgres/client';
import { loadLocalEnv } from './load-env';

loadLocalEnv();

const migrationDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  '../server/db/postgres/migrations'
);
const migrationFiles = (await readdir(migrationDirectory))
  .filter((filename) => filename.endsWith('.sql'))
  .sort((left, right) => left.localeCompare(right));
const pool = createPostgresPool('migration');
// These records were applied by the one-time Neon import before migration
// files were committed. They are accepted only as part of the verified v2
// baseline; every migration created after this cutover must live in this repo.
const legacyBaselineMigrations = new Set([
  '0000_migration_ledger.sql',
  '0001_sqlite_compatibility_baseline.sql',
  '0002_integrity_triggers.sql'
]);

try {
  const client = await pool.connect();
  try {
    await client.query("SET lock_timeout = '10s'");
    await client.query('SELECT pg_advisory_lock(824260140)');
    await client.query(`CREATE TABLE IF NOT EXISTS public.ama_schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const applied = await client.query<{ filename: string }>(
      'SELECT filename FROM public.ama_schema_migrations ORDER BY filename'
    );
    const knownFiles = new Set([...migrationFiles, ...legacyBaselineMigrations]);
    const unknownApplied = applied.rows
      .map((row) => row.filename)
      .filter((filename) => !knownFiles.has(filename));
    if (unknownApplied.length) {
      throw new Error(
        `Database contains migration files absent from this release: ${unknownApplied.join(', ')}`
      );
    }

    for (const filename of migrationFiles) {
      const sql = await readFile(join(migrationDirectory, filename), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      await client.query('BEGIN');
      try {
        const existing = await client.query<{ checksum: string }>(
          'SELECT checksum FROM public.ama_schema_migrations WHERE filename = $1',
          [filename]
        );
        if (existing.rowCount) {
          if (existing.rows[0]?.checksum !== checksum) {
            throw new Error(`Migration ${filename} has changed after being applied.`);
          }
        } else {
          await client.query(sql);
          await client.query(
            'INSERT INTO public.ama_schema_migrations (filename, checksum) VALUES ($1, $2)',
            [filename, checksum]
          );
          console.log(`Applied Neon migration ${filename}`);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(824260140)').catch(() => undefined);
    client.release();
  }
} finally {
  await pool.end();
}
