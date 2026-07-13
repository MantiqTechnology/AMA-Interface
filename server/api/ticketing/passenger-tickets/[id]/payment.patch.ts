import {
  passengerTicketIdParamsSchema,
  payPassengerTicketSchema
} from '../../../../../shared/features/ticketing/passenger';
import { getPassengerTicketService } from '../../../../features/ticketing/passenger';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) =>
  getPassengerTicketService().pay(
    parseParams(event, passengerTicketIdParamsSchema).id,
    await parseBody(event, payPassengerTicketSchema)
  )
);
