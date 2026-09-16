import { getSafetyTrainingService } from '../../../features/sms/safety-training';
import type { CompetencyType, CompetencyStatus } from '../../../features/sms/safety-training/types';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const service = getSafetyTrainingService();

  return await service.listCompetencies({
    personnelId: query.personnelId as string | undefined,
    competencyType: query.competencyType as CompetencyType | undefined,
    status: query.status as CompetencyStatus | undefined,
    search: query.search as string | undefined
  });
});