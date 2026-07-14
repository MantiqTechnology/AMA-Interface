import type Database from 'better-sqlite3';
import { getDbClient } from '../../../db/client';
import { InvoiceRepository } from './repository';
import { InvoiceService } from './service';

export function createInvoiceService(sqlite: Database.Database) {
  return new InvoiceService(sqlite, new InvoiceRepository(sqlite));
}

export function getInvoiceService() {
  return createInvoiceService(getDbClient().sqlite);
}
