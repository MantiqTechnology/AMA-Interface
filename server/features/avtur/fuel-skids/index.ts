import { getDbClient } from '../../../db/client';
import { FuelSkidRepository } from './repository';
import { FuelSkidService } from './service';

export function getFuelSkidService() {
  const db = getDbClient().db;
  return new FuelSkidService(new FuelSkidRepository(db));
}