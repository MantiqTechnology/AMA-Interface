import {
  journalIdParamsSchema,
  reverseJournalBodySchema
} from '../../../../../../shared/features/finance/accounting';
import { getServices } from '../../../../../utils/services';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../../utils/auth';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.accounting.post');
  const { id } = parseParams(event, journalIdParamsSchema);
  const body = await parseBody(event, reverseJournalBodySchema);
  return getServices().accounting.reverseJournal(id, body, getDemoActorId(event));
});
