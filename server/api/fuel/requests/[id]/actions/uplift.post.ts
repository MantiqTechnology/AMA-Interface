import { idParamSchema } from '../../../../../../shared/contracts/common';
import { recordFuelUpliftBodySchema } from '../../../../../../shared/contracts/fuel';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseParams, parseBody } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  const body = await parseBody(event, recordFuelUpliftBodySchema);
  return await getServices().fuel.recordUplift(id, body);
});
