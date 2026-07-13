import { getDbClient } from '../../../db/client';
import { StationsRepository } from '../../operations/stations/repository';
import { AgentRepository } from './repository';
import { AgentService } from './service';
export function getAgentService() {
  const db = getDbClient().db;
  return new AgentService(new AgentRepository(db), new StationsRepository(db));
}
