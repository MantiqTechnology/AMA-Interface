import { getCorporateAssetService } from '../../../features/corporate-assets';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'asset.read');
  return getCorporateAssetService().listEmployees(true);
});
