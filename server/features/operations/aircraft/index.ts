import { getDbClient } from '../../../db/client';
import { FlightCapacityProfileRepository } from '../flight-capacity-profiles/repository';
import { StationsRepository } from '../stations/repository';
import { AircraftRepository } from './repository';
import { AircraftService } from './service';
export function getAircraftService() {
  const db = getDbClient().db;
  return new AircraftService(
    new AircraftRepository(db),
    new FlightCapacityProfileRepository(db),
    new StationsRepository(db)
  );
}
