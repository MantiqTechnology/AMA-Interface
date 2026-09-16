import type { TicketingDashboardQuery } from '../../../../shared/features/ticketing/dashboard';
import type { TicketingDashboardRepository } from './repository';

export class TicketingDashboardService {
  constructor(private readonly repository: TicketingDashboardRepository) {}

  getDashboardSummary(query: TicketingDashboardQuery = {}) {
    return this.repository.getDashboardSummary(query);
  }
}
