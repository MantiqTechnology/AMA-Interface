import { getSafetyTrainingService } from '../../../features/sms/safety-training';
import type { CorporateRiskInput } from '../../../features/sms/safety-training/types';

export default defineEventHandler(async (event) => {
  const body = await readBody<CorporateRiskInput>(event);
  const service = getSafetyTrainingService();

  return await service.createCorporateRisk(body);
});