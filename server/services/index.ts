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
import { AircraftAirworthinessService } from './aircraft-airworthiness.service';
import { AircraftTrackingService } from './aircraft-tracking.service';
import { createAccountingService } from '../features/finance/accounting';
import { createInvoiceService } from '../features/finance/invoices';
import { HrisService } from '../features/hris/service';
import { createFinanceReportingService } from '../features/finance/reporting';
import { createMaintenanceService } from '../features/maintenance';
import { ResourceV21Service } from './resource-v21.service';

export type Services = ReturnType<typeof createServices>;

export function createServices(sqlite: Database.Database) {
  const db = drizzle(sqlite, { schema });
  const routesService = new RoutesService(new RoutesRepository(db), new StationsRepository(db));
  const flightOperations = new FlightOperationsVerificationService(sqlite, routesService);
  const aircraftAirworthiness = new AircraftAirworthinessService(sqlite, flightOperations);
  return {
    flightOperations,
    aircraftTracking: new AircraftTrackingService(sqlite),
    aircraftAirworthiness,
    maintenance: createMaintenanceService(sqlite, aircraftAirworthiness),
    resourceV21: new ResourceV21Service(sqlite),
    accounting: createAccountingService(sqlite),
    financeReporting: createFinanceReportingService(sqlite),
    invoices: createInvoiceService(sqlite),
    dashboard: new DashboardService(sqlite),
    operationsMonitoring: new OperationsMonitoringService(sqlite),
    hris: new HrisService(sqlite)
  };
}

export function createAppServices(dbPath?: string) {
  return createServices(getDbClient(dbPath).sqlite);
}
