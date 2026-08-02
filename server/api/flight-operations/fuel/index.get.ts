import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'flight.read');
  return getServices().flightOperations.listFuel();
});
