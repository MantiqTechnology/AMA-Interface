import { applicantStageUpdateSchema } from '../../../../../../shared/features/hris';
import { getHrisService } from '../../../../../features/hris';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { requireDemoPermission } from '../../../../../utils/auth';
import { parseBody } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'hris.recruitment.manage');
  const id = event.context.params?.id as string;
  const body = await parseBody(event, applicantStageUpdateSchema);
  return getHrisService().updateApplicantStage(id, body);
});
