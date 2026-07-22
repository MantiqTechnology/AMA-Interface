import { assetListQuerySchema } from '../../../../shared/features/corporate-assets';
import { getCorporateAssetService } from '../../../features/corporate-assets';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoStationScope, requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'asset.read');
  return getCorporateAssetService().listAssets(
    parseQuery(event, assetListQuerySchema),
    getDemoStationScope(event)
  );
});
