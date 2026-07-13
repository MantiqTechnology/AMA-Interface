import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DgCategoryInput } from '../../shared/features/cargo/dg-categories';
import type { createDbClient } from '../../server/db/client';
import { DgCategoryRepository } from '../../server/features/cargo/dg-categories/repository';
import { DgCategoryService } from '../../server/features/cargo/dg-categories/service';
import { createSeededMasterDataDb } from '../helpers/master-data-db';

const testCategory: DgCategoryInput = {
  dgCode: 'DG-SERVICE-TEST',
  dgClass: '9',
  description: 'Service test dangerous goods',
  handlingInstruction: 'Handle according to test procedure.',
  requiresSpecialApproval: true
};

describe('cargo master data services', () => {
  let client: ReturnType<typeof createDbClient>;
  let categories: DgCategoryService;

  beforeEach(async () => {
    client = await createSeededMasterDataDb();
    categories = new DgCategoryService(new DgCategoryRepository(client.db));
  });

  afterEach(() => client.sqlite.close());

  it('owns DG category create, search, status, options, and duplicate codes', async () => {
    const created = await categories.create(testCategory);
    expect(await categories.list({ active: 'active', search: 'SERVICE-TEST' })).toHaveLength(1);
    expect(await categories.options()).toContainEqual(
      expect.objectContaining({ id: created.id, dgCode: testCategory.dgCode })
    );

    await categories.setActive(created.id, false);
    expect(await categories.list({ active: 'inactive', search: 'SERVICE-TEST' })).toHaveLength(1);
    await expect(categories.create(testCategory)).rejects.toMatchObject({
      code: 'DG_CATEGORIES_DUPLICATE'
    });
  });
});
