import { getDbClient } from '../../../db/client';
import { AgentRepository } from '../../commercial/agents/repository';
import { createAccountingService } from '../../finance/accounting';
import { TicketingSalesRepository } from '../sales/repository';
import { PassengerTicketRepository } from './repository';
import { PassengerTicketService } from './service';

export function getPassengerTicketService() {
  const client = getDbClient();
  return new PassengerTicketService(
    new PassengerTicketRepository(client.sqlite),
    new TicketingSalesRepository(client.sqlite),
    new AgentRepository(client.db),
    createAccountingService(client.sqlite)
  );
}
