import { getTicketingSalesService } from '../../../features/ticketing/sales';
import { defineApiEventHandler } from '../../../utils/api-response';

export default defineApiEventHandler(() => getTicketingSalesService().listOccFlights());
