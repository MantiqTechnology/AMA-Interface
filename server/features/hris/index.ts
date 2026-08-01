import { getDbClient } from '../../db/client';
import { HrisService } from './service';

export function getHrisService() {
  return new HrisService(getDbClient().sqlite);
}

export { HrisService } from './service';
