import { stationIdParamsSchema } from '../../../../shared/features/operations/stations';
import { getStationsService } from '../../../features/operations/stations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';

export default defineApiEventHandler((event) =>
  getStationsService().get(parseParams(event, stationIdParamsSchema).id)
);
