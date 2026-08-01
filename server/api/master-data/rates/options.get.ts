import { getRateCardService } from '../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';
export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'rate.read');
  return getRateCardService().options();
});
