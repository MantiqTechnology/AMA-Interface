import { getDbClient } from '../../db/client';
import { InventoryRepository } from './repository';
import { InventoryService } from './service';

export function getInventoryService() {
  return new InventoryService(new InventoryRepository(getDbClient().sqlite));
}
