import { passengerTicketIdParamsSchema } from '../../../../../shared/features/ticketing/passenger';
import { getPassengerTicketService } from '../../../../features/ticketing/passenger';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'ticketing.operation.update');
  return getPassengerTicketService().checkIn(parseParams(event, passengerTicketIdParamsSchema).id);
});
