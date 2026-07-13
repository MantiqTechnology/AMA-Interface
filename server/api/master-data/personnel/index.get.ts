import { crewListQuerySchema } from '../../../../shared/features/operations/personnel';
import { getPersonnelService } from '../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../utils/api-response';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) =>
  getPersonnelService().list(parseQuery(event, crewListQuerySchema))
);
