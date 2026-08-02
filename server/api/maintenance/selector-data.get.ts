import { defineApiEventHandler } from '#server/utils/api-response';
import { getDemoActorContext, requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.package.read');
  return getServices().maintenance.selectorData(getDemoActorContext(event));
});
