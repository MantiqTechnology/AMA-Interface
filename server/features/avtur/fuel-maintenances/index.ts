import { getDbClient } from '../../../db/client';
import { FuelMaintenanceRepository } from './repository';
import { FuelMaintenanceService } from './service';

export function getFuelMaintenanceService() {
  const db = getDbClient().db;
  return new FuelMaintenanceService(new FuelMaintenanceRepository(db));
}