import { stationInputSchema } from '../../../../shared/features/operations/stations';
import { getStationsService } from '../../../features/operations/stations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) =>
  getStationsService().create(await parseBody(event, stationInputSchema))
);
