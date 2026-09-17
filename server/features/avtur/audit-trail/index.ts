import { getDbClient } from '../../../db/client';
import { AvturAuditTrailRepository } from './repository';
import { AvturAuditTrailService } from './service';

export function getAvturAuditTrailService() {
  const db = getDbClient().db;
  return new AvturAuditTrailService(new AvturAuditTrailRepository(db));
}