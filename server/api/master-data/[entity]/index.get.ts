import {
  masterDataListQuerySchema,
  masterDataRouteParamsSchema
} from '../../../../shared/contracts/master-data';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseParams, parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  const params = parseParams(event, masterDataRouteParamsSchema);
  const query = parseQuery(event, masterDataListQuerySchema);

  return getServices().masterData.list(params.entity, query);
});
