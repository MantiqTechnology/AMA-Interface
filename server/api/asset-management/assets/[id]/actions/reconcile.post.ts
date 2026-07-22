import { getRouterParam } from 'h3';
import { reconcileAssetSchema } from '../../../../../../shared/features/corporate-assets';
import { getCorporateAssetService } from '../../../../../features/corporate-assets';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import {
  getDemoActorId,
  getDemoStationScope,
  requireDemoPermission
} from '../../../../../utils/auth';
import { parseBody } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'asset.audit.manage');
  return getCorporateAssetService().reconcileAsset(
    getRouterParam(event, 'id')!,
    await parseBody(event, reconcileAssetSchema),
    getDemoActorId(event),
    getDemoStationScope(event)
  );
});
