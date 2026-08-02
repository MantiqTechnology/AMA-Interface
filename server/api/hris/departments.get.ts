import { getHrisService } from '../../features/hris';
import { defineApiEventHandler } from '../../utils/api-response';

export default defineApiEventHandler(() => {
  return getHrisService().listDepartments();
});
