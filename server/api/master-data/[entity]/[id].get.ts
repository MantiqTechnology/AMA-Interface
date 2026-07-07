import { masterDataIdRouteParamsSchema } from '../../../../shared/contracts/master-data';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseParams } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  const params = parseParams(event, masterDataIdRouteParamsSchema);
  return getServices().masterData.get(params.entity, params.id);
});
