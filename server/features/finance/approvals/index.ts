import type Database from 'better-sqlite3';
import { getApplicationNow } from '../../../utils/time';
import { ApprovalAuthorityService } from './service';

export function createApprovalAuthorityService(
  sqlite: Database.Database,
  now: () => string = getApplicationNow
) {
  return new ApprovalAuthorityService(sqlite, now);
}
