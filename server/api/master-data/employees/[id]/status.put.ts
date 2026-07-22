import { getRouterParam } from 'h3';
import { employeeStatusSchema } from '../../../../../shared/features/corporate-assets';
import { getCorporateAssetService } from '../../../../features/corporate-assets';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseBody } from '../../../../utils/validation';
export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'platform.module.manage');
  const service = getCorporateAssetService();
  const current = service.getEmployee(getRouterParam(event, 'id')!);
  const status = await parseBody(event, employeeStatusSchema);
  return service.updateEmployee(current.id, {
    employeeCode: current.employeeCode,
    fullName: current.fullName,
    departmentId: current.departmentId,
    baseStationId: current.baseStationId,
    positionTitle: current.positionTitle,
    demoActorId: current.demoActorId,
    ...status
  });
});
