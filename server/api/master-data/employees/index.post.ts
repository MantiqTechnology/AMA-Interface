import { employeeInputSchema } from '../../../../shared/features/corporate-assets';
import { getCorporateAssetService } from '../../../features/corporate-assets';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'platform.module.manage');
  return getCorporateAssetService().createEmployee(await parseBody(event, employeeInputSchema));
});
