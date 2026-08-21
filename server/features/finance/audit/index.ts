import type Database from 'better-sqlite3';
import { getApplicationNow } from '../../../utils/time';
import { FinanceAuditService } from './service';

export function createFinanceAuditService(
  sqlite: Database.Database,
  now: () => string = getApplicationNow
) {
  return new FinanceAuditService(sqlite, now);
}
