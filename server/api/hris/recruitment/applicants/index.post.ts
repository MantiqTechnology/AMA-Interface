import { applicantInputSchema } from '../../../../../shared/features/hris';
import { getHrisService } from '../../../../features/hris';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { parseBody } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  const body = await parseBody(event, applicantInputSchema);
  return getHrisService().createApplicant(body);
});
