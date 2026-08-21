import type Database from 'better-sqlite3';
import { getApplicationNow } from '../../../utils/time';
import type { AccountingService } from '../accounting/service';
import { FinanceHandoffService } from './service';

export function createFinanceHandoffService(
  sqlite: Database.Database,
  accounting: AccountingService,
  now: () => string = getApplicationNow
) {
  return new FinanceHandoffService(sqlite, accounting, now);
}
