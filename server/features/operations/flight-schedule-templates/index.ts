import { getDbClient } from '../../../db/client';
import { AircraftRepository } from '../aircraft/repository';
import { RoutesRepository } from '../routes/repository';
import { FlightScheduleTemplateRepository } from './repository';
import { FlightScheduleTemplateService } from './service';
export function getFlightScheduleTemplateService() {
  const db = getDbClient().db;
  return new FlightScheduleTemplateService(
    new FlightScheduleTemplateRepository(db),
    new RoutesRepository(db),
    new AircraftRepository(db)
  );
}
