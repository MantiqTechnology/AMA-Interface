import { getRouterParam } from 'h3';
import { departmentStatusSchema } from '../../../../../shared/features/corporate-assets';
import { getCorporateAssetService } from '../../../../features/corporate-assets';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseBody } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'platform.module.manage');
  const current = getCorporateAssetService().getDepartment(getRouterParam(event, 'id')!);
  const status = await parseBody(event, departmentStatusSchema);
  return getCorporateAssetService().updateDepartment(current.id, {
    departmentCode: current.departmentCode,
    departmentName: current.departmentName,
    ...status
  });
});
