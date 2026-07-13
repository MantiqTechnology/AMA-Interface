import { getDbClient } from '../../../db/client';
import { StationsRepository } from '../../operations/stations/repository';
import { CurrencyRepository } from '../currencies/repository';
import { HandlingParkingSupplierRepository } from './repository';
import { HandlingParkingSupplierService } from './service';
export function getHandlingParkingSupplierService() {
  const db = getDbClient().db;
  return new HandlingParkingSupplierService(
    new HandlingParkingSupplierRepository(db),
    new StationsRepository(db),
    new CurrencyRepository(db)
  );
}
