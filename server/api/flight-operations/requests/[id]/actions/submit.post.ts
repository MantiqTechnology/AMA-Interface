import { flightRequestIdParamsSchema } from '../../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { requireDemoPermission } from '../../../../../utils/auth';
import { getServices } from '../../../../../utils/services';
import { parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'flight_request.create');
  const { id } = parseParams(event, flightRequestIdParamsSchema);
  return getServices().flightOperations.submitRequest(id);
});
