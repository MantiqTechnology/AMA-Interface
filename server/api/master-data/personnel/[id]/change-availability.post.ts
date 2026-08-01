import {
  crewIdParamsSchema,
  personnelAvailabilityChangeSchema
} from '../../../../../shared/features/operations/personnel';
import { getPersonnelService } from '../../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseBody, parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'personnel.assignment.manage');
  const { id } = parseParams(event, crewIdParamsSchema);
  return getPersonnelService().changeAvailability(
    id,
    await parseBody(event, personnelAvailabilityChangeSchema)
  );
});
