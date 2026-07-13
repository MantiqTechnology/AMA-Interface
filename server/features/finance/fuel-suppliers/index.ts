import { getDbClient } from '../../../db/client';
import { StationsRepository } from '../../operations/stations/repository';
import { CurrencyRepository } from '../currencies/repository';
import { FuelSupplierRepository } from './repository';
import { FuelSupplierService } from './service';
export function getFuelSupplierService() {
  const db = getDbClient().db;
  return new FuelSupplierService(
    new FuelSupplierRepository(db),
    new StationsRepository(db),
    new CurrencyRepository(db)
  );
}
