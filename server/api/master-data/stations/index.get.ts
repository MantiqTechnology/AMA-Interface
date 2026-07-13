import { stationListQuerySchema } from '../../../../shared/features/operations/stations';
import { getStationsService } from '../../../features/operations/stations';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) =>
  getStationsService().list(parseQuery(event, stationListQuerySchema))
);
