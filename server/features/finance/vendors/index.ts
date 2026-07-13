import { getDbClient } from '../../../db/client';
import { StationsRepository } from '../../operations/stations/repository';
import { PaymentTermRepository } from '../payment-terms/repository';
import { VendorRepository } from './repository';
import { VendorService } from './service';
export function getVendorService() {
  const db = getDbClient().db;
  return new VendorService(
    new VendorRepository(db),
    new StationsRepository(db),
    new PaymentTermRepository(db)
  );
}
