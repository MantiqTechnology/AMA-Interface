import type Database from 'better-sqlite3';
import { getApplicationNow } from '../../../utils/time';
import type { AccountingService } from '../accounting/service';
import { FinanceClosingService } from './service';

export function createFinanceClosingService(
  sqlite: Database.Database,
  accounting: AccountingService,
  now: () => string = getApplicationNow
) {
  return new FinanceClosingService(sqlite, accounting, now);
}
