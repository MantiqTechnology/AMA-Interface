import { kpiAssessmentInputSchema } from '../../../../../shared/features/hris';
import { getHrisService } from '../../../../features/hris';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';
import { parseBody } from '../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'hris.kpi.assess');
  const body = await parseBody(event, kpiAssessmentInputSchema);
  return getHrisService().createKpiAssessment(body);
});
