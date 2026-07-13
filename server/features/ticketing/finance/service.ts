import { TicketingFinanceRepository } from './repository';

export class TicketingFinanceService {
  constructor(private readonly repository: TicketingFinanceRepository) {}

  ledger() {
    return this.repository.ledger();
  }
}
