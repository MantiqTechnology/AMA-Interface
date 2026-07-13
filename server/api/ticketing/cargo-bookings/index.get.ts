import { cargoBookingListQuerySchema } from '../../../../shared/features/ticketing/cargo';
import { getCargoBookingService } from '../../../features/ticketing/cargo';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) =>
  getCargoBookingService().list(parseQuery(event, cargoBookingListQuerySchema))
);
