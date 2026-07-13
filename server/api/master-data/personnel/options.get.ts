import { getPersonnelService } from '../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getPersonnelService().options());
