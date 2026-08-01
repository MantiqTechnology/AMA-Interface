import { defineApiEventHandler } from '../../../utils/api-response';
import { getServices } from '../../../utils/services';
import { getDemoActorContext, requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'station.task.view');
  const service = getServices().flightOperations;
  return service.filterStationScoped(service.listStationServices(), getDemoActorContext(event));
});
