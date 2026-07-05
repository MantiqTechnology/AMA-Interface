import { defineApiEventHandler } from '../utils/api-response';
import { getServices } from '../utils/services';

export default defineApiEventHandler(async () => {
  const services = getServices();
  return await services.dashboard.getDashboard();
});
