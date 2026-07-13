import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChartOfAccountInput } from '../../shared/features/finance/chart-of-accounts';
import type { createDbClient } from '../../server/db/client';
import { ChartOfAccountRepository } from '../../server/features/finance/chart-of-accounts/repository';
import { ChartOfAccountService } from '../../server/features/finance/chart-of-accounts/service';
import { createSeededMasterDataDb } from '../helpers/master-data-db';

const newAccount: ChartOfAccountInput = {
  accountCode: '5999',
  accountName: 'Service Test Expense',
  accountType: 'EXPENSE',
  normalBalance: 'DEBIT',
  parentAccountId: 'coa-5100',
  isPostable: true
};

describe('finance master data services', () => {
  let client: ReturnType<typeof createDbClient>;
  let accounts: ChartOfAccountService;

  beforeEach(async () => {
    client = await createSeededMasterDataDb();
    accounts = new ChartOfAccountService(new ChartOfAccountRepository(client.db));
  });

  afterEach(() => client.sqlite.close());

  it('owns COA hierarchy, search, status, duplicate codes, and cycle prevention', async () => {
    const created = await accounts.create(newAccount);
    expect(await accounts.list({ active: 'active', search: '5999' })).toHaveLength(1);

    await expect(
      accounts.update(created.id, { ...newAccount, parentAccountId: created.id })
    ).rejects.toMatchObject({ code: 'COA_PARENT_SELF' });
    await expect(accounts.create(newAccount)).rejects.toMatchObject({
      code: 'CHART_OF_ACCOUNTS_DUPLICATE'
    });

    await accounts.setActive(created.id, false);
    expect(await accounts.list({ active: 'inactive', search: '5999' })).toHaveLength(1);
  });
});
