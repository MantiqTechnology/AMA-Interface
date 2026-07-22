import type Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { getDbClient } from '../db/client';
import * as schema from '../db/schema';
import { RoutesRepository } from '../features/operations/routes/repository';
import { RoutesService } from '../features/operations/routes/service';
import { StationsRepository } from '../features/operations/stations/repository';
import { DashboardService } from './dashboard.service';
import { FlightOperationsService } from './flight-operations.service';
import { OperationsMonitoringService } from './operations-monitoring.service';
import { createAccountingService } from '../features/finance/accounting';
import { createInvoiceService } from '../features/finance/invoices';

export type Services = ReturnType<typeof createServices>;

export function createServices(sqlite: Database.Database) {
  const db = drizzle(sqlite, { schema });
  const routesService = new RoutesService(new RoutesRepository(db), new StationsRepository(db));
  return {
    flightOperations: new FlightOperationsService(sqlite, routesService),
    accounting: createAccountingService(sqlite),
    invoices: createInvoiceService(sqlite),
    dashboard: new DashboardService(sqlite),
    operationsMonitoring: new OperationsMonitoringService(sqlite)
  };
}

export function createAppServices(dbPath?: string) {
  return createServices(getDbClient(dbPath).sqlite);
}
