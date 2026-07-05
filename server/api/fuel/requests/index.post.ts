import { createFuelRequestBodySchema } from '../../../../shared/contracts/fuel';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const body = await parseBody(event, createFuelRequestBodySchema);
  return await getServices().fuel.createRequest(body);
});
