import { Pool, type PoolConfig } from 'pg';

export type PostgresConnectionKind = 'runtime' | 'migration';

function getConnectionString(kind: PostgresConnectionKind) {
  const variable = kind === 'runtime' ? 'DATABASE_URL' : 'DATABASE_URL_UNPOOLED';
  const connectionString = process.env[variable];

  if (!connectionString) {
    throw new Error(`${variable} is required for the Neon PostgreSQL ${kind} connection.`);
  }

  const hostname = new URL(connectionString).hostname;
  const usesPooler = hostname.includes('-pooler.');
  if (kind === 'runtime' && !usesPooler) {
    throw new Error("DATABASE_URL must use Neon's pooled endpoint.");
  }
  if (kind === 'migration' && usesPooler) {
    throw new Error("DATABASE_URL_UNPOOLED must use Neon's direct endpoint.");
  }

  return connectionString;
}

export function createPostgresPool(kind: PostgresConnectionKind, overrides: PoolConfig = {}) {
  return new Pool({
    connectionString: getConnectionString(kind),
    max: process.env.VERCEL ? 1 : kind === 'migration' ? 1 : 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    application_name: `ama-interface-${kind}`,
    ...overrides
  });
}
