import { getDbClient } from '../../../db/client';
import { BleIotDeviceRepository } from './repository';
import { BleIotDeviceService } from './service';

export function getIotDeviceService() {
  const db = getDbClient().db;
  return new BleIotDeviceService(new BleIotDeviceRepository(db));
}