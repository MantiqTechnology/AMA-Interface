import { mkdirSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export type DbClient = {
  sqlite: Database.Database;
  db: AppDatabase;
};

const clients = new Map<string, DbClient>();

export function getDefaultDbPath() {
  if (process.env.AMA_DB_PATH) {
    return process.env.AMA_DB_PATH;
  }

  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return '/tmp/ama-demo.sqlite';
  }

  return './data/ama-demo.sqlite';
}

export function resolveDbPath(dbPath = getDefaultDbPath()) {
  if (dbPath === ':memory:') {
    return dbPath;
  }

  if (process.env.VERCEL) {
    const filename = basename(dbPath);

    if (!isAbsolute(dbPath)) {
      return join('/tmp', filename);
    }

    if (dbPath.startsWith('/var/task/')) {
      return join('/tmp', filename);
    }
  }

  return resolve(process.cwd(), dbPath);
}

export function createDbClient(dbPath = getDefaultDbPath()): DbClient {
  const resolvedPath = resolveDbPath(dbPath);

  if (resolvedPath !== ':memory:') {
    mkdirSync(dirname(resolvedPath), { recursive: true });
  }

  const sqlite = new Database(resolvedPath);
  sqlite.pragma('foreign_keys = ON');

  if (resolvedPath !== ':memory:') {
    sqlite.pragma('journal_mode = WAL');
  }

  return {
    sqlite,
    db: drizzle(sqlite, { schema })
  };
}

export function getDbClient(dbPath = getDefaultDbPath()) {
  const resolvedPath = resolveDbPath(dbPath);
  const cached = clients.get(resolvedPath);

  if (cached) {
    return cached;
  }

  const client = createDbClient(resolvedPath);
  clients.set(resolvedPath, client);
  return client;
}

export function closeDbClients() {
  for (const client of clients.values()) {
    client.sqlite.close();
  }

  clients.clear();
}
