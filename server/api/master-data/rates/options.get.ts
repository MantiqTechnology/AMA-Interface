import { getRateCardService } from '../../../features/commercial/rates';
import { defineApiEventHandler } from '../../../utils/api-response';
export default defineApiEventHandler(() => getRateCardService().options());
