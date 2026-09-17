import { getSafetyTrainingService } from '../../../features/sms/safety-training';

export default defineEventHandler(async () => {
  const service = getSafetyTrainingService();
  return await service.listCorporateRisks();
});