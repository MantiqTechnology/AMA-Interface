import { getDbClient } from '../../../db/client';
import { RoutesRepository } from '../routes/repository';
import { StationsRepository } from './repository';
import { StationsService } from './service';

export function getStationsService() {
  const db = getDbClient().db;
  return new StationsService(new StationsRepository(db), new RoutesRepository(db));
}
