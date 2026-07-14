import {
  passengerTicketIdParamsSchema,
  reschedulePassengerTicketSchema
} from '../../../../../shared/features/ticketing/passenger';
import { getPassengerTicketService } from '../../../../features/ticketing/passenger';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'ticketing.operation.update');
  return getPassengerTicketService().reschedule(
    parseParams(event, passengerTicketIdParamsSchema).id,
    await parseBody(event, reschedulePassengerTicketSchema),
    getDemoActorId(event)
  );
});
