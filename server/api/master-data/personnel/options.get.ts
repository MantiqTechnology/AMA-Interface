import { getPersonnelService } from '../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'personnel.read');
  return getPersonnelService().options();
});
