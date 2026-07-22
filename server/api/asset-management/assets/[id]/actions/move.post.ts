import { getRouterParam } from 'h3';
import { assetMoveSchema } from '../../../../../../shared/features/corporate-assets';
import { getCorporateAssetService } from '../../../../../features/corporate-assets';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import {
  getDemoActorId,
  getDemoRole,
  getDemoStationScope,
  requireDemoPermission
} from '../../../../../utils/auth';
import { parseBody } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'asset.move');
  return getCorporateAssetService().moveAsset(
    getRouterParam(event, 'id')!,
    await parseBody(event, assetMoveSchema),
    getDemoActorId(event),
    getDemoStationScope(event),
    getDemoRole(event) === 'Demo Admin'
  );
});
