import {
  cargoBookingIdParamsSchema,
  deliverCargoBookingSchema
} from '../../../../../shared/features/ticketing/cargo';
import { getCargoBookingService } from '../../../../features/ticketing/cargo';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'ticketing.operation.update');
  return getCargoBookingService().deliver(
    parseParams(event, cargoBookingIdParamsSchema).id,
    await parseBody(event, deliverCargoBookingSchema)
  );
});
