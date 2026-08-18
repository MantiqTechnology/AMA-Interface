import { resetDemoDatabaseExclusive } from '#server/db/demo-reset-coordinator';
import { defineApiEventHandler } from '#server/utils/api-response';
import { requireDemoPermission, requireExplicitDemoRuntime } from '#server/utils/auth';
import { getServices } from '#server/utils/services';

export default defineApiEventHandler(async (event) => {
  requireExplicitDemoRuntime('Internal AOG scenario reset');
  requireDemoPermission(event, 'maintenance.demo.internal_aog.reset');
  const config = useRuntimeConfig();
  await resetDemoDatabaseExclusive(config.dbPath, process.env.DEMO_SEED_DATE);
  return {
    resetAt: new Date().toISOString(),
    scenario: getServices().internalAogDemo.snapshot()
  };
});
