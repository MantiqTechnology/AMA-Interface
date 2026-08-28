import { getDbClient } from '../../../db/client';
import { SafetyReportRepository } from '../safety-reports/repository';
import { CapaTicketRepository } from './repository';
import { CapaTicketService } from './service';

export function getCapaTicketService() {
  const db = getDbClient().db;
  return new CapaTicketService(
    new CapaTicketRepository(db),
    new SafetyReportRepository(db) // Inject repository Safety Report
  );
}
