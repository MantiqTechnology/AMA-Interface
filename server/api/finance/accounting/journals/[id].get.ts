import { journalIdParamsSchema } from '../../../../../shared/features/finance/accounting';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.accounting.read');
  const { id } = parseParams(event, journalIdParamsSchema);
  return getServices().accounting.getJournalDetail(id);
});
