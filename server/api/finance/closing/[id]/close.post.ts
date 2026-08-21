import { closingRunParamsSchema } from '../../../../../shared/features/finance/closing';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getDemoActorId, requireDemoPermission } from '../../../../utils/auth';
import { getServices } from '../../../../utils/services';
import { parseParams } from '../../../../utils/validation';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'finance.accounting.post');
  const { id } = parseParams(event, closingRunParamsSchema);
  return getServices().financeClosing.closePeriod(id, getDemoActorId(event));
});
