import { getDbClient } from '../../../db/client';
import { TicketRefundRepository } from './repository';
import { TicketRefundService } from './service';

export function getTicketRefundService() {
  return new TicketRefundService(new TicketRefundRepository(getDbClient().sqlite));
}
