import { idParamSchema } from '../../../../../../shared/contracts/common';
import { closeWorkOrderBodySchema } from '../../../../../../shared/contracts/maintenance';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseParams, parseBody } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  const body = await parseBody(event, closeWorkOrderBodySchema);
  return await getServices().maintenance.closeWorkOrder(id, body);
});
