import { operationsMonitoringQuerySchema } from '../../../shared/contracts/operations-monitoring';
import { defineApiEventHandler } from '../../utils/api-response';
import { getServices } from '../../utils/services';
import { parseQuery } from '../../utils/validation';

export default defineApiEventHandler((event) =>
  getServices().operationsMonitoring.flightFollowing(
    parseQuery(event, operationsMonitoringQuerySchema)
  )
);
