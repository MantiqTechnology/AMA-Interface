import { flightRequestIdParamsSchema } from '../../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler((event) => {
  const { id } = parseParams(event, flightRequestIdParamsSchema);
  return getServices().flightOperations.submitRequest(id);
});
