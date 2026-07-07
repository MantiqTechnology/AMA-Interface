import { z } from 'zod';
import { masterDataRouteParamsSchema } from '../../../../shared/contracts/master-data';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { parseBody, parseParams } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const params = parseParams(event, masterDataRouteParamsSchema);
  const body = await parseBody(event, z.record(z.unknown()));

  return getServices().masterData.create(params.entity, body);
});
