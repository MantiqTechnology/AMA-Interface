import {
  personnelQualificationInputSchema,
  qualificationIdParamsSchema
} from '../../../../../../shared/features/operations/personnel';
import { getPersonnelService } from '../../../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { requireDemoPermission } from '../../../../../utils/auth';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'personnel.qualification.manage');
  const { id, qualificationId } = parseParams(event, qualificationIdParamsSchema);
  return getPersonnelService().updateQualification(
    id,
    qualificationId,
    await parseBody(event, personnelQualificationInputSchema)
  );
});
