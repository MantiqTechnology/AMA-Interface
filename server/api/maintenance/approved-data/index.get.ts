import { defineApiEventHandler } from '#server/utils/api-response';
import { requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.approved_data.read');
  return getServices().maintenance.listApprovedData();
});
