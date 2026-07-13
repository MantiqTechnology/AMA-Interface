import { getDbClient } from '../../../db/client';
import { FlightReasonRepository } from './repository';
import { FlightReasonService } from './service';
export function getFlightReasonService() {
  return new FlightReasonService(new FlightReasonRepository(getDbClient().db));
}
