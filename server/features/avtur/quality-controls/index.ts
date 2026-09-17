import { getDbClient } from '../../../db/client';
import { QualityControlRepository } from './repository';
import { QualityControlService } from './service';

export function getQualityControlService() {
  const db = getDbClient().db;
  return new QualityControlService(new QualityControlRepository(db));
}