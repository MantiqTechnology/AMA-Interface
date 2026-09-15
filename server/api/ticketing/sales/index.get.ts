import { getTicketingSalesService } from '../../../features/ticketing/sales';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'ticketing.management.read');
  return getTicketingSalesService().listOccFlights();
});
