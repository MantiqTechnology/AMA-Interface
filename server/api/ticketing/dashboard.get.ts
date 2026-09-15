import { getTicketingDashboardService } from '../../features/ticketing/dashboard';
import { defineApiEventHandler } from '../../utils/api-response';
import { parseQuery } from '../../utils/validation';
import { ticketingDashboardQuerySchema } from '../../../shared/features/ticketing/dashboard';

export default defineApiEventHandler((event) =>
  getTicketingDashboardService().getDashboardSummary(
    parseQuery(event, ticketingDashboardQuerySchema)
  )
);
