import type Database from 'better-sqlite3';
import type { AircraftAirworthinessService } from '../../services/aircraft-airworthiness.service';
import { MaintenanceService } from './service';

export function createMaintenanceService(
  sqlite: Database.Database,
  airworthiness: AircraftAirworthinessService
) {
  return new MaintenanceService(sqlite, airworthiness);
}

export { MaintenanceService };
