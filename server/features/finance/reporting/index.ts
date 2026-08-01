import type Database from 'better-sqlite3';
import { getDbClient } from '../../../db/client';
import { FinanceReportingService } from './service';

export function createFinanceReportingService(sqlite: Database.Database, now?: () => string) {
  return new FinanceReportingService(sqlite, now);
}

export function getFinanceReportingService() {
  return createFinanceReportingService(getDbClient().sqlite);
}
