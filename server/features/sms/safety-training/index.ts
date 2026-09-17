import { getDbClient } from '../../../db/client';
import { SafetyReportRepository } from '../safety-reports/repository';
import { SafetyTrainingRepository } from './repository';
import { SafetyTrainingService } from './service';

export function getSafetyTrainingService() {
  const db = getDbClient().db;
  return new SafetyTrainingService(
    new SafetyTrainingRepository(db),
    new SafetyReportRepository(db)
  );
}

export * from './types';
export * from './repository';
export * from './service';