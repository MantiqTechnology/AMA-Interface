import { createCargoBookingSchema } from '../../../../shared/features/ticketing/cargo';
import { getCargoBookingService } from '../../../features/ticketing/cargo';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) =>
  getCargoBookingService().create(await parseBody(event, createCargoBookingSchema))
);
