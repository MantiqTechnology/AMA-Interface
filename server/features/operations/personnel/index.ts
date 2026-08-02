import { getDbClient } from '../../../db/client';
import { StationsRepository } from '../stations/repository';
import { PersonnelRepository } from './repository';
import { PersonnelService } from './service';
import { createServices } from '../../../services';
export function getPersonnelService() {
  const client = getDbClient();
  return new PersonnelService(
    new PersonnelRepository(client.db),
    new StationsRepository(client.db),
    (personnelId) => {
      createServices(client.sqlite).flightOperations.recalculatePersonnelReadiness(personnelId);
    }
  );
}
