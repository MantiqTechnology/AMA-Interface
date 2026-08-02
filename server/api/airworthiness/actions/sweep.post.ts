import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorId, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'aircraft.defect.manage');
  return getServices().aircraftAirworthiness.sweep(getDemoActorId(event));
});
