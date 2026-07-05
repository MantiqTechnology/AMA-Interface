import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

export function resolveDbPath(dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite') {
  if (dbPath === ':memory:') {
    return dbPath;
  }

  return resolve(process.cwd(), dbPath);
}

export function createDbClient(dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite'): DbClient {
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

export function getDbClient(dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite') {
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
