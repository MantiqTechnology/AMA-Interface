import type Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { getDbClient } from '../db/client';
import * as schema from '../db/schema';
import { RoutesRepository } from '../features/operations/routes/repository';
import { RoutesService } from '../features/operations/routes/service';
import { StationsRepository } from '../features/operations/stations/repository';
import { DashboardService } from './dashboard.service';
import { FlightOperationsVerificationService } from './flight-operations-verification.service';
import { OperationsMonitoringService } from './operations-monitoring.service';
import { OperationalDashboardsService } from './operational-dashboards.service';
import { AircraftAirworthinessService } from './aircraft-airworthiness.service';
import { AircraftTrackingService } from './aircraft-tracking.service';
import { createAccountingService } from '../features/finance/accounting';
import { createFinanceHandoffService } from '../features/finance/handoffs';
import { createApprovalAuthorityService } from '../features/finance/approvals';
import { createFinanceTransactionsService } from '../features/finance/transactions';
import { createBankReconciliationService } from '../features/finance/reconciliation';
import { createInvoiceService } from '../features/finance/invoices';
import { HrisService } from '../features/hris/service';
import { createFinanceReportingService } from '../features/finance/reporting';
import { createFinanceAuditService } from '../features/finance/audit';
import { createFinanceClosingService } from '../features/finance/closing';
import { createFinanceGovernanceService } from '../features/finance/governance';
import { createMaintenanceService } from '../features/maintenance';
import { InternalAogDemoService } from '../features/maintenance/internal-aog-demo.service';
import { ResourceV21Service } from './resource-v21.service';

export type Services = ReturnType<typeof createServices>;

export function createServices(sqlite: Database.Database) {
  const db = drizzle(sqlite, { schema });
  const routesService = new RoutesService(new RoutesRepository(db), new StationsRepository(db));
  const flightOperations = new FlightOperationsVerificationService(sqlite, routesService);
  const aircraftAirworthiness = new AircraftAirworthinessService(sqlite, flightOperations);
  const maintenance = createMaintenanceService(sqlite, aircraftAirworthiness);
  const accounting = createAccountingService(sqlite);
  const approvalAuthority = createApprovalAuthorityService(sqlite);
  const financeTransactions = createFinanceTransactionsService(
    sqlite,
    accounting,
    approvalAuthority
  );
  const financeHandoffs = createFinanceHandoffService(sqlite, accounting);
  const financeReporting = createFinanceReportingService(sqlite);
  return {
    flightOperations,
    aircraftTracking: new AircraftTrackingService(sqlite),
    aircraftAirworthiness,
    maintenance,
    internalAogDemo: new InternalAogDemoService(sqlite, maintenance),
    resourceV21: new ResourceV21Service(sqlite),
    accounting,
    approvalAuthority,
    financeTransactions,
    bankReconciliation: createBankReconciliationService(sqlite),
    financeHandoffs,
    financeReporting,
    financeAudit: createFinanceAuditService(sqlite),
    financeClosing: createFinanceClosingService(sqlite, accounting),
    financeGovernance: createFinanceGovernanceService(sqlite, financeReporting),
    invoices: createInvoiceService(sqlite, accounting, financeTransactions),
    dashboard: new DashboardService(sqlite),
    operationsMonitoring: new OperationsMonitoringService(sqlite),
    operationalDashboards: new OperationalDashboardsService(sqlite),
    hris: new HrisService(sqlite, financeHandoffs)
  };
}

export function createAppServices(dbPath?: string) {
  return createServices(getDbClient(dbPath).sqlite);
}
