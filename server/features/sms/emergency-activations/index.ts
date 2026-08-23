import { getDbClient } from '../../../db/client';
import { EmergencyActivationRepository } from './repository';
import { EmergencyActivationService } from './service';

export function getEmergencyActivationService() {
  const db = getDbClient().db;
  return new EmergencyActivationService(new EmergencyActivationRepository(db));
}