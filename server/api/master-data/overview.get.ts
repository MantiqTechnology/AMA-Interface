import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';

export default defineApiEventHandler(() => {
  return getServices().masterData.overview();
});
