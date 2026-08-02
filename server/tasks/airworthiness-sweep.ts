import { createAppServices } from '../services';

export default defineTask({
  meta: {
    name: 'airworthiness:sweep',
    description: 'Expire technical deferments and recalculate affected flight readiness.'
  },
  run() {
    const config = useRuntimeConfig();
    return {
      result: createAppServices(config.dbPath).aircraftAirworthiness.sweep()
    };
  }
});
