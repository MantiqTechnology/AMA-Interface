import { getDbClient } from '../../db/client';
import { CorporateAssetService } from './service';

export function getCorporateAssetService() {
  return new CorporateAssetService(getDbClient().sqlite);
}

export { CorporateAssetService } from './service';
