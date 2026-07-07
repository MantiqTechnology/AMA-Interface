import { flightOperationIdParamsSchema } from '../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseParams } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  const params = parseParams(event, flightOperationIdParamsSchema);
  return getServices().flightOperations.detail(params.id);
});
