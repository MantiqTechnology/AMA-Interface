import { listDocuments } from '../../../utils/local-document-storage';
import { defineApiEventHandler } from '../../../utils/api-response';
import { requireDemoPermission } from '../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'commercial.contract.read');
  return listDocuments({ ownerType: 'contract_subsidy', search: '' });
});
