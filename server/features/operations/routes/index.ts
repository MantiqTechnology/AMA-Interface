import { getDbClient } from '../../../db/client';
import { StationsRepository } from '../stations/repository';
import { RoutesRepository } from './repository';
import { RoutesService } from './service';

export function getRoutesService() {
  const db = getDbClient().db;
  return new RoutesService(new RoutesRepository(db), new StationsRepository(db));
}
