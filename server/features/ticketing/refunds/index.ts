import { getDbClient } from '../../../db/client';
import { createAccountingService } from '../../finance/accounting';
import { TicketRefundRepository } from './repository';
import { TicketRefundService } from './service';

export function getTicketRefundService() {
  const client = getDbClient();
  return new TicketRefundService(
    new TicketRefundRepository(client.sqlite),
    createAccountingService(client.sqlite)
  );
}
