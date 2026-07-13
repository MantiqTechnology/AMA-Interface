import {
  passengerTicketIdParamsSchema,
  reschedulePassengerTicketSchema
} from '../../../../../shared/features/ticketing/passenger';
import { getPassengerTicketService } from '../../../../features/ticketing/passenger';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) =>
  getPassengerTicketService().reschedule(
    parseParams(event, passengerTicketIdParamsSchema).id,
    await parseBody(event, reschedulePassengerTicketSchema),
    getDemoActorId(event)
  )
);
