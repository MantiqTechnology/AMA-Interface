import {
  actionNoteBodySchema,
  flightOperationIdParamsSchema
} from '../../../../../../shared/contracts/flight-operations';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getServices } from '../../../../../utils/services';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const params = parseParams(event, flightOperationIdParamsSchema);
  const body = await parseBody(event, actionNoteBodySchema);
  return getServices().flightOperations.approve(params.id, body);
});
