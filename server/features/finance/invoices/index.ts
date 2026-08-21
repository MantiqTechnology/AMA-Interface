import type Database from 'better-sqlite3';
import { getDbClient } from '../../../db/client';
import { InvoiceRepository } from './repository';
import { InvoiceService } from './service';
import type { AccountingService } from '../accounting/service';
import type { FinanceTransactionsService } from '../transactions/service';
import { createAccountingService } from '../accounting';
import { createApprovalAuthorityService } from '../approvals';
import { createFinanceTransactionsService } from '../transactions';

export function createInvoiceService(
  sqlite: Database.Database,
  accounting?: AccountingService,
  financeTransactions?: FinanceTransactionsService,
  now?: () => string
) {
  const postingEngine = accounting ?? createAccountingService(sqlite);
  const transactions =
    financeTransactions ??
    createFinanceTransactionsService(sqlite, postingEngine, createApprovalAuthorityService(sqlite));
  return new InvoiceService(
    sqlite,
    new InvoiceRepository(sqlite),
    postingEngine,
    transactions,
    now
  );
}

export function getInvoiceService() {
  return createInvoiceService(getDbClient().sqlite);
}
