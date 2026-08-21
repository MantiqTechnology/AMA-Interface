import type Database from 'better-sqlite3';
import { getApplicationNow } from '../../../utils/time';
import type { FinanceReportingService } from '../reporting/service';
import { FinanceGovernanceService } from './service';

export function createFinanceGovernanceService(
  sqlite: Database.Database,
  reporting: FinanceReportingService,
  now: () => string = getApplicationNow
) {
  return new FinanceGovernanceService(sqlite, reporting, now);
}
