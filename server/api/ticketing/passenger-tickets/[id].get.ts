import { passengerTicketIdParamsSchema } from '../../../../shared/features/ticketing/passenger';
import { getPassengerTicketService } from '../../../features/ticketing/passenger';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';

export default defineApiEventHandler((event) =>
  getPassengerTicketService().get(parseParams(event, passengerTicketIdParamsSchema).id)
);
