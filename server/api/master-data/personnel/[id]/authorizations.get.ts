import { crewIdParamsSchema } from '../../../../../shared/features/operations/personnel';
import { requireDemoPermission } from '#server/utils/auth';
import { getServices } from '#server/utils/services';

export default defineEventHandler((event) => {
  requireDemoPermission(event, 'maintenance.package.read');
  const { id } = crewIdParamsSchema.parse(getRouterParams(event));
  return getServices().maintenance.listCompanyAuthorizations(id);
});
