import type Database from 'better-sqlite3';
import { getApplicationNow } from '../../../utils/time';
import type { AccountingService } from '../accounting/service';
import type { ApprovalAuthorityService } from '../approvals/service';
import { FinanceTransactionsService } from './service';

export function createFinanceTransactionsService(
  sqlite: Database.Database,
  accounting: AccountingService,
  approvals: ApprovalAuthorityService,
  now: () => string = getApplicationNow
) {
  return new FinanceTransactionsService(sqlite, accounting, approvals, now);
}
