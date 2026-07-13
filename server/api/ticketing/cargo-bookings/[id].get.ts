import { cargoBookingIdParamsSchema } from '../../../../shared/features/ticketing/cargo';
import { getCargoBookingService } from '../../../features/ticketing/cargo';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';

export default defineApiEventHandler((event) =>
  getCargoBookingService().get(parseParams(event, cargoBookingIdParamsSchema).id)
);
