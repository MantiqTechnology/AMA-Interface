import {
  masterDataIdRouteParamsSchema,
  masterDataStatusBodySchema
} from '../../../../../shared/contracts/master-data';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getServices } from '../../../../utils/services';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const params = parseParams(event, masterDataIdRouteParamsSchema);
  const body = await parseBody(event, masterDataStatusBodySchema);

  return getServices().masterData.setActive(params.entity, params.id, body.is_active);
});
