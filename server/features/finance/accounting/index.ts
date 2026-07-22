import type Database from 'better-sqlite3';
import { getDbClient } from '../../../db/client';
import { AccountingService } from './service';

export function createAccountingService(sqlite: Database.Database, now?: () => string) {
  return new AccountingService(sqlite, now);
}

export function getAccountingService() {
  return createAccountingService(getDbClient().sqlite);
}
