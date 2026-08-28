import { getDbClient } from '../../../db/client';
import { SafetyCommunicationRepository } from './repository';
import { SafetyCommunicationService } from './service';

export function getSafetyCommunicationService() {
  const db = getDbClient().db;
  return new SafetyCommunicationService(new SafetyCommunicationRepository(db));
}
