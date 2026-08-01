import { getHrisService } from '../../../../features/hris';
import { defineApiEventHandler } from '../../../../utils/api-response';
import { requireDemoPermission } from '../../../../utils/auth';

export default defineApiEventHandler((event) => {
  requireDemoPermission(event, 'hris.recruitment.read');
  const id = event.context.params?.id as string;
  const posting = getHrisService()
    .listJobPostings()
    .find((p) => p.id === id);
  if (!posting) throw createError({ statusCode: 404, message: 'Job posting not found' });
  return posting;
});
