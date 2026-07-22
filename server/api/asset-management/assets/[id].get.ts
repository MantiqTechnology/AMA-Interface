import { getRouterParam } from 'h3';
import { getCorporateAssetService } from '../../../features/corporate-assets';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoStationScope, hasDemoPermission, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'asset.read');
  return getCorporateAssetService().getAsset(
    getRouterParam(event, 'id')!,
    getDemoStationScope(event),
    hasDemoPermission(event, 'asset.finance.read')
  );
});
