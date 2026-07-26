import { rateCardsIdParamsSchema } from '../../../../../shared/features/commercial/rates';
import { listDocuments } from '../../../../utils/local-document-storage';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'rate.document.read');
  const { id } = parseParams(event, rateCardsIdParamsSchema);
  return listDocuments({ ownerType: 'rate_card', ownerId: id, search: '' });
});
