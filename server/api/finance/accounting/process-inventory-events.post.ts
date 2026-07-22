import { processInventoryEventsBodySchema } from '../../../../shared/features/finance/accounting';
import { getServices } from '../../../utils/services';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { parseBody } from '../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'finance.accounting.post');
  const body = await parseBody(event, processInventoryEventsBodySchema);
  return getServices().accounting.processInventoryEvents(body, getDemoActorId(event));
});
