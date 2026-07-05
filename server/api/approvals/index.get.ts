import { listApprovalsQuerySchema } from '../../../shared/contracts/approvals';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const query = parseQuery(event, listApprovalsQuerySchema);
  return await getServices().approvals.listApprovals(query);
});
