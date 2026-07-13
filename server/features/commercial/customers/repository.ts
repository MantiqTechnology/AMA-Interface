import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { customers } from '../../../db/schema';
import type {
  CustomerDto,
  CustomerInput,
  CustomerListQuery,
  CustomerOption
} from '../../../../shared/features/commercial/customers';

function toDto(row: typeof customers.$inferSelect): CustomerDto {
  return {
    id: row.id,
    accountType: row.accountType,
    accountCode: row.accountCode,
    accountName: row.accountName,
    contactPerson: row.contactPerson,
    phone: row.phone,
    email: row.email,
    billingAddress: row.billingAddress,
    paymentTermId: row.paymentTermId,
    creditLimit: row.creditLimit,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class CustomerRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: CustomerListQuery): Promise<CustomerDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(customers.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(customers.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(customers.accountCode, term),
          like(customers.accountName, term),
          like(customers.contactPerson, term),
          like(customers.email, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(customers)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(customers.accountCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<CustomerDto | null> {
    const row = await this.db.select().from(customers).where(eq(customers.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: CustomerInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(customers)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: CustomerInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(customers)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(customers.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(customers)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(customers.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<CustomerOption[]> {
    return await this.db
      .select({
        id: customers.id,
        accountCode: customers.accountCode,
        accountName: customers.accountName
      })
      .from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(asc(customers.accountCode));
  }
}
