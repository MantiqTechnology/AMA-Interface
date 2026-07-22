import { getDbClient } from '../../../db/client';
import { DgCategoryRepository } from '../../cargo/dg-categories/repository';
import { AgentRepository } from '../../commercial/agents/repository';
import { createAccountingService } from '../../finance/accounting';
import { TicketingSalesRepository } from '../sales/repository';
import { CargoBookingRepository } from './repository';
import { CargoBookingService } from './service';

export function getCargoBookingService() {
  const client = getDbClient();
  return new CargoBookingService(
    new CargoBookingRepository(client.sqlite),
    new TicketingSalesRepository(client.sqlite),
    new AgentRepository(client.db),
    new DgCategoryRepository(client.db),
    createAccountingService(client.sqlite)
  );
}
