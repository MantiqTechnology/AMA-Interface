import { getDbClient } from '../../../db/client';
import { FuelDrumRepository } from './repository';
import { FuelDrumService } from './service';

export function getFuelDrumService() {
  const db = getDbClient().db;
  return new FuelDrumService(new FuelDrumRepository(db));
}