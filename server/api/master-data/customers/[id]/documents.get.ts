import { customersIdParamsSchema } from '../../../../../shared/features/commercial/customers';
import { listDocuments } from '../../../../utils/local-document-storage';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'customer.document.read');
  const { id } = parseParams(event, customersIdParamsSchema);
  return await listDocuments({ ownerType: 'customer', ownerId: id, search: '' });
});
