import { getSafetyTrainingService } from '../../../features/sms/safety-training';
import type { JustCultureInput } from '../../../features/sms/safety-training/types';

export default defineEventHandler(async (event) => {
  const body = await readBody<JustCultureInput>(event);
  const service = getSafetyTrainingService();

  return await service.recordJustCultureDecision(body);
});