import { getStationsService } from '../../../features/operations/stations';
import { defineApiEventHandler } from '../../../utils/api-response';

export default defineApiEventHandler(() => getStationsService().options());
