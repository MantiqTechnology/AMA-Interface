import { availableTicketingFlightsQuerySchema } from '../../../shared/features/ticketing/sales';
import { getTicketingSalesService } from '../../features/ticketing/sales';
import { defineApiEventHandler } from '../../utils/api-response';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler((event) =>
  getTicketingSalesService().availableFlights(
    parseQuery(event, availableTicketingFlightsQuerySchema)
  )
);
