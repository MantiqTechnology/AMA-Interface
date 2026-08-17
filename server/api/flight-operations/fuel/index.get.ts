import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { getDemoStationScope, requireDemoPermission } from '../../../utils/auth';
import { listFuelQuerySchema } from '../../../../shared/contracts/flight-operations';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'flight.read');
  return getServices().flightOperations.listFuel(
    parseQuery(event, listFuelQuerySchema),
    getDemoStationScope(event)
  );
});
