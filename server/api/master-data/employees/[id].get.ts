import { getRouterParam } from 'h3';
import { getCorporateAssetService } from '../../../features/corporate-assets';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'master_data.read');
  return getCorporateAssetService().getEmployee(getRouterParam(event, 'id')!);
});
