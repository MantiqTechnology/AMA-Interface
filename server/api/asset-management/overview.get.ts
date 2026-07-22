import { getCorporateAssetService } from '../../features/corporate-assets';
import { defineApiEventHandler } from '../../utils/api-response';
import { getDemoStationScope, hasDemoPermission, requireDemoPermission } from '../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'asset.read');
  return getCorporateAssetService().overview(
    getDemoStationScope(event),
    hasDemoPermission(event, 'asset.finance.read')
  );
});
