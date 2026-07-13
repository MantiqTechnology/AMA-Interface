import { passengerTicketListQuerySchema } from '../../../../shared/features/ticketing/passenger';
import { getPassengerTicketService } from '../../../features/ticketing/passenger';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) =>
  getPassengerTicketService().list(parseQuery(event, passengerTicketListQuerySchema))
);
