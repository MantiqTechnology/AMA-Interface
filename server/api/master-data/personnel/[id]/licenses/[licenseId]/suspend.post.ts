import { licenseIdParamsSchema } from '../../../../../../../shared/features/operations/personnel';
import { getPersonnelService } from '../../../../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../../../../utils/api-response';
import { requireDemoPermission } from '../../../../../../utils/auth';
import { parseParams } from '../../../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'personnel.license.manage');
  const { id, licenseId } = parseParams(event, licenseIdParamsSchema);
  return getPersonnelService().setLicenseStatus(id, licenseId, 'SUSPENDED');
});
