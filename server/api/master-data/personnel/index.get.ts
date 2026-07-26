import { crewListQuerySchema } from '../../../../shared/features/operations/personnel';
import { getPersonnelService } from '../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
import { parseQuery } from '../../../utils/validation';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'personnel.read');
  return getPersonnelService().list(parseQuery(event, crewListQuerySchema));
});
