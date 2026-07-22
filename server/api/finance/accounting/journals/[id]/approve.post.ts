import { journalIdParamsSchema } from '../../../../../../shared/features/finance/accounting';
import { getServices } from '../../../../../utils/services';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../../utils/auth';
import { parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.accounting.post');
  const { id } = parseParams(event, journalIdParamsSchema);
  return getServices().accounting.approveJournal(id, getDemoActorId(event));
});
