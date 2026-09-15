import { getDbClient } from '../../../db/client';
import { TicketingDashboardRepository } from './repository';
import { TicketingDashboardService } from './service';

export function getTicketingDashboardService() {
  return new TicketingDashboardService(new TicketingDashboardRepository(getDbClient().sqlite));
}

export { TicketingDashboardService } from './service';
