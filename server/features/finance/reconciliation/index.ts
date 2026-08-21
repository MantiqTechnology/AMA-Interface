import type Database from 'better-sqlite3';
import { getApplicationNow } from '../../../utils/time';
import { BankReconciliationService } from './service';

export function createBankReconciliationService(
  sqlite: Database.Database,
  now: () => string = getApplicationNow
) {
  return new BankReconciliationService(sqlite, now);
}
