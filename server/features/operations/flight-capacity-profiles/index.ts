import { getDbClient } from '../../../db/client';
import { AircraftRepository } from '../aircraft/repository';
import { RoutesRepository } from '../routes/repository';
import { FlightCapacityProfileRepository } from './repository';
import { FlightCapacityProfileService } from './service';
export function getFlightCapacityProfileService() {
  const db = getDbClient().db;
  return new FlightCapacityProfileService(
    new FlightCapacityProfileRepository(db),
    new AircraftRepository(db),
    new RoutesRepository(db)
  );
}
