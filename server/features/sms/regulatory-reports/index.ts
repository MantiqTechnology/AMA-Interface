import { getDbClient } from '../../../db/client';
import { SafetyReportRepository } from '../safety-reports/repository';
import { RegulatoryReportRepository } from './repository';
import { RegulatoryReportService } from './service';

export function getRegulatoryReportService() {
  const db = getDbClient().db;
  return new RegulatoryReportService(
    new RegulatoryReportRepository(db),
    new SafetyReportRepository(db)
  );
}