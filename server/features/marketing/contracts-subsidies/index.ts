import { getDbClient } from '../../../db/client';
import { ContractsSubsidiesRepository } from './repository';
import { ContractsSubsidiesService } from './service';

export function getContractsSubsidiesService() {
  const client = getDbClient();
  return new ContractsSubsidiesService(new ContractsSubsidiesRepository(client.sqlite));
}
