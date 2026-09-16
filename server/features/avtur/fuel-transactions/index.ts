import { getDbClient } from '../../../db/client';
import { FuelTransactionRepository } from './repository';
import { FuelTransactionService } from './service';

export function getFuelTransactionService() {
  const db = getDbClient().db;
  return new FuelTransactionService(new FuelTransactionRepository(db));
}