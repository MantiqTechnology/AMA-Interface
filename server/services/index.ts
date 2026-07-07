import { getDbClient } from '../db/client';
import type Database from 'better-sqlite3';
import { SqliteMasterDataRepository } from '../repositories/master-data.repository';
import { createSqliteRepositories } from '../repositories/sqlite-repositories';
import type { Repositories } from '../repositories/interfaces';
import { ApprovalsService } from './approvals.service';
import { DashboardService } from './dashboard.service';
import { FlightOperationsService } from './flight-operations.service';
import { FlightsService } from './flights.service';
import { FuelService } from './fuel.service';
import { InvoicesService } from './invoices.service';
import { MaintenanceService } from './maintenance.service';
import { MasterDataService } from './master-data';
import { StationExpensesService } from './station-expenses.service';

export type Services = ReturnType<typeof createServices>;

export function createServices(
  repositories: Repositories,
  masterDataRepository: SqliteMasterDataRepository,
  sqlite: Database.Database
) {
  const flights = new FlightsService(repositories);
  const fuel = new FuelService(repositories);
  const stationExpenses = new StationExpensesService(repositories);
  const invoices = new InvoicesService(repositories);
  const approvals = new ApprovalsService(repositories);
  const maintenance = new MaintenanceService(repositories);

  return {
    flights,
    fuel,
    stationExpenses,
    invoices,
    approvals,
    maintenance,
    flightOperations: new FlightOperationsService(sqlite),
    masterData: new MasterDataService(masterDataRepository),
    dashboard: new DashboardService(repositories, flights, fuel, stationExpenses, invoices)
  };
}

export function createAppServices(dbPath?: string) {
  const { db, sqlite } = getDbClient(dbPath);

  // Production swap path: keep route handlers and services intact, then replace this repository
  // factory with one backed by Postgres/API clients while preserving the repository interfaces.
  return createServices(
    createSqliteRepositories(db),
    new SqliteMasterDataRepository(sqlite),
    sqlite
  );
}
