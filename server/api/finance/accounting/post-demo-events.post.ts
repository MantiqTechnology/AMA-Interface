import { accountingPostDemoEventsSchema } from '../../../../shared/features/finance/accounting';
import { getServices } from '../../../utils/services';
import { defineApiEventHandler } from '../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../utils/auth';
import { DomainError } from '../../../utils/errors';
import { parseBody } from '../../../utils/validation';
import { getCookie } from 'h3';

export default defineApiEventHandler(async (event) => {
  if (String(useRuntimeConfig().demoMode) !== 'true') {
    throw new DomainError(
      'ACCOUNTING_DEMO_ENDPOINT_DISABLED',
      'Demo accounting posting is only available in demo mode.',
      404
    );
  }
  if (getCookie(event, 'ama_demo_role') === undefined) {
    throw new DomainError(
      'FORBIDDEN',
      'A demo role cookie is required to run demo accounting posting.',
      403
    );
  }
  requireDemoPermission(event, 'finance.accounting.post');
  const body = await parseBody(event, accountingPostDemoEventsSchema);
  return getServices().accounting.postDemoEvents(body, getDemoActorId(event));
});
