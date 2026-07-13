import { getDbClient } from '../../../db/client';
import { StationsRepository } from '../stations/repository';
import { PersonnelRepository } from './repository';
import { PersonnelService } from './service';
export function getPersonnelService() {
  const db = getDbClient().db;
  return new PersonnelService(new PersonnelRepository(db), new StationsRepository(db));
}
