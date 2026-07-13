import {
  stationIdParamsSchema,
  stationStatusSchema
} from '../../../../../shared/features/operations/stations';
import { getStationsService } from '../../../../features/operations/stations';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, stationIdParamsSchema);
  const { isActive } = await parseBody(event, stationStatusSchema);
  return getStationsService().setActive(id, isActive);
});
