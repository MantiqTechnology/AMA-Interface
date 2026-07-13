import { createPassengerTicketSchema } from '../../../../shared/features/ticketing/passenger';
import { getPassengerTicketService } from '../../../features/ticketing/passenger';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) =>
  getPassengerTicketService().create(await parseBody(event, createPassengerTicketSchema))
);
