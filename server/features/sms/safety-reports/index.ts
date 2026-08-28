import { getDbClient } from '../../../db/client';
import { AircraftRepository } from '../../operations/aircraft/repository';
import { StationsRepository } from '../../operations/stations/repository';
import { SafetyReportRepository } from './repository';
import { SafetyReportService } from './service';

export function getSafetyReportService() {
  const db = getDbClient().db;
  return new SafetyReportService(
    new SafetyReportRepository(db),
    new AircraftRepository(db),
    new StationsRepository(db)
  );
}
