import {
  licenseIdParamsSchema,
  personnelLicenseInputSchema
} from '../../../../../../shared/features/operations/personnel';
import { getPersonnelService } from '../../../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { requireDemoPermission } from '../../../../../utils/auth';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'personnel.license.manage');
  const { id, licenseId } = parseParams(event, licenseIdParamsSchema);
  return getPersonnelService().updateLicense(
    id,
    licenseId,
    await parseBody(event, personnelLicenseInputSchema)
  );
});
