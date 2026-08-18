import { defineApiEventHandler } from '#server/utils/api-response';
import { requireDemoPermission, requireExplicitDemoRuntime } from '#server/utils/auth';
import { getServices } from '#server/utils/services';

export default defineApiEventHandler(async (event) => {
  requireExplicitDemoRuntime('Internal AOG scenario');
  requireDemoPermission(event, 'maintenance.demo.internal_aog.read');
  return getServices().internalAogDemo.snapshot();
});
