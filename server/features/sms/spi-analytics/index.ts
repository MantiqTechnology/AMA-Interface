import { getDbClient } from '../../../db/client';
import { SpiAnalyticsRepository } from './repository';
import { SpiAnalyticsService } from './service';

export * from './types';
export * from './repository';
export * from './service';

export function getSpiAnalyticsService() {
  const db = getDbClient().db;
  return new SpiAnalyticsService(new SpiAnalyticsRepository(db));
}
