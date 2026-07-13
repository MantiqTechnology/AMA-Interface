import { crewIdParamsSchema } from '../../../../shared/features/operations/personnel';
import { getPersonnelService } from '../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseParams } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getPersonnelService().get(parseParams(event, crewIdParamsSchema).id)
);
