import { defineApiEventHandler } from '#server/utils/api-response';
import { requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.package.read');
  const query = getQuery(event);
  const personnelId = typeof query.personnelId === 'string' ? query.personnelId.trim() : '';
  return getServices().maintenance.listCompanyAuthorizations(personnelId || undefined);
});
