import { ticketRefundListQuerySchema } from '../../../../shared/features/ticketing/refunds';
import { getTicketRefundService } from '../../../features/ticketing/refunds';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) =>
  getTicketRefundService().list(parseQuery(event, ticketRefundListQuerySchema))
);
