import { getDbClient } from '../../../db/client';
import { TicketingSalesRepository } from './repository';
import { TicketingSalesService } from './service';

export function getTicketingSalesRepository() {
  return new TicketingSalesRepository(getDbClient().sqlite);
}

export function getTicketingSalesService() {
  return new TicketingSalesService(getTicketingSalesRepository());
}
