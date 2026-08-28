// server/features/sms/safety-assurance/index.ts

import { getDbClient } from '../../../db/client';
import { SafetyAssuranceRepository } from './repository';
import { SafetyAssuranceService } from './service';

export function getSafetyAssuranceService() {
  const db = getDbClient().db;
  return new SafetyAssuranceService(new SafetyAssuranceRepository(db));
}
