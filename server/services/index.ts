import type Database from 'better-sqlite3';
import { getDbClient } from '../db/client';
import { DashboardService } from './dashboard.service';
import { FlightOperationsService } from './flight-operations.service';
import { InvoicesService } from './invoices.service';
import { OperationsMonitoringService } from './operations-monitoring.service';

export type Services = ReturnType<typeof createServices>;

export function createServices(sqlite: Database.Database) {
  return {
    flightOperations: new FlightOperationsService(sqlite),
    invoices: new InvoicesService(sqlite),
    dashboard: new DashboardService(sqlite),
    operationsMonitoring: new OperationsMonitoringService(sqlite)
  };
}

export function createAppServices(dbPath?: string) {
  return createServices(getDbClient(dbPath).sqlite);
}
