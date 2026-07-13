import {
  stationIdParamsSchema,
  stationInputSchema
} from '../../../../shared/features/operations/stations';
import { getStationsService } from '../../../features/operations/stations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody, parseParams } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, stationIdParamsSchema);
  return getStationsService().update(id, await parseBody(event, stationInputSchema));
});
