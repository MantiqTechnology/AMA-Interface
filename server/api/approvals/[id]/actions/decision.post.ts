import { decideApprovalBodySchema } from '../../../../../shared/contracts/approvals';
import { idParamSchema } from '../../../../../shared/contracts/common';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { getServices } from '../../../../utils/services';
import { parseParams, parseBody } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const { id } = parseParams(event, idParamSchema);
  const body = await parseBody(event, decideApprovalBodySchema);
  return await getServices().approvals.decideApproval(id, body);
});
