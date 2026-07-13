import { getDbClient } from '../../../db/client';
import { TicketingFinanceRepository } from './repository';
import { TicketingFinanceService } from './service';

export function getTicketingFinanceService() {
  return new TicketingFinanceService(new TicketingFinanceRepository(getDbClient().sqlite));
}
