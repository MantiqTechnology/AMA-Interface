import type Database from 'better-sqlite3';
import { and, asc, desc, eq, like, ne, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import {
  customerAuditLogs,
  customerContacts,
  customerContracts,
  customerCreditActions,
  customerNotes,
  customers,
  rateCards
} from '../../../db/schema';
import type {
  CustomerActivityItemDto,
  CustomerContactDto,
  CustomerContactInput,
  CustomerContractDto,
  CustomerDetailDto,
  CustomerDto,
  CustomerFinancialSummaryDto,
  CustomerHistoryItemDto,
  CustomerInput,
  CustomerListQuery,
  CustomerNoteDto,
  CustomerOperationalSummaryDto,
  CustomerOption,
  CustomerRateDto,
  PaymentTermSummaryDto
} from '../../../../shared/features/commercial/customers';
import { getApplicationNow } from '../../../utils/time';

type CustomerRecord = typeof customers.$inferSelect;
type CustomerContactRecord = typeof customerContacts.$inferSelect;
type CustomerContractRecord = typeof customerContracts.$inferSelect;
type CustomerNoteRecord = typeof customerNotes.$inferSelect;

function toDto(row: CustomerRecord): CustomerDto {
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
    lifecycleStatus: row.lifecycleStatus,
    creditStatus: row.creditStatus,
    defaultCurrencyCode: row.defaultCurrencyCode,
    primaryContactId: row.primaryContactId,
    commercialNote: row.commercialNote,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toContactDto(row: CustomerContactRecord): CustomerContactDto {
  return {
    id: row.id,
    customerId: row.customerId,
    contactName: row.contactName,
    roleTitle: row.roleTitle,
    email: row.email,
    phone: row.phone,
    contactType: row.contactType,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toContractDto(row: CustomerContractRecord): CustomerContractDto {
  return {
    id: row.id,
    customerId: row.customerId,
    contractNumber: row.contractNumber,
    contractType: row.contractType,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    status: row.status,
    signedDate: row.signedDate,
    documentId: row.documentId,
    renewalStatus: row.renewalStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toNoteDto(row: CustomerNoteRecord): CustomerNoteDto {
  return {
    id: row.id,
    customerId: row.customerId,
    noteType: row.noteType,
    visibility: row.visibility,
    note: row.note,
    authorId: row.authorId,
    authorName: row.authorName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function money(value: unknown) {
  if (value === null || value === undefined) return null;
  return String(Math.max(0, Math.round(Number(value) || 0)));
}

function signedMoney(value: unknown) {
  if (value === null || value === undefined) return null;
  return String(Math.round(Number(value) || 0));
}

export class CustomerRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly sqlite: Database.Database
  ) {}

  async list(query: CustomerListQuery): Promise<CustomerDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(ne(customers.lifecycleStatus, 'ARCHIVED'));
    if (query.active === 'inactive') conditions.push(eq(customers.lifecycleStatus, 'INACTIVE'));
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

  async getRecordById(id: string) {
    return await this.db.select().from(customers).where(eq(customers.id, id)).get();
  }

  async getDetailById(id: string, includeFinancial: boolean): Promise<CustomerDetailDto | null> {
    const row = await this.getRecordById(id);
    if (!row) return null;
    const primaryContact = row.primaryContactId
      ? await this.getContactById(id, row.primaryContactId)
      : await this.getPrimaryContact(id);
    const paymentTerm = row.paymentTermId ? this.getPaymentTermSummary(row.paymentTermId) : null;
    const operationalSummary = this.getOperationalSummary(id);
    return {
      id: row.id,
      accountCode: row.accountCode,
      accountName: row.accountName,
      accountType: row.accountType,
      lifecycleStatus: row.lifecycleStatus,
      creditStatus: row.creditStatus,
      billingAddress: row.billingAddress,
      defaultCurrencyCode: row.defaultCurrencyCode,
      primaryContact: primaryContact
        ? {
            id: primaryContact.id,
            contactName: primaryContact.contactName,
            roleTitle: primaryContact.roleTitle,
            phone: primaryContact.phone,
            email: primaryContact.email
          }
        : null,
      paymentTerm,
      creditConfiguration: {
        creditLimitMinor: row.creditLimit === null ? null : String(row.creditLimit),
        currencyCode: row.defaultCurrencyCode
      },
      financialSummary: includeFinancial ? this.getFinancialSummary(row) : null,
      operationalSummary,
      phone: primaryContact?.phone ?? row.phone,
      email: primaryContact?.email ?? row.email,
      commercialNote: row.commercialNote,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async create(id: string, input: CustomerInput, timestamp: string) {
    const row = await this.db
      .insert(customers)
      .values({
        id,
        accountType: input.accountType,
        accountCode: input.accountCode,
        accountName: input.accountName,
        contactPerson: input.contactPerson,
        phone: input.phone,
        email: input.email,
        billingAddress: input.billingAddress,
        paymentTermId: input.paymentTermId,
        creditLimit: input.creditLimit,
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        creditStatus: 'NORMAL',
        defaultCurrencyCode: input.defaultCurrencyCode,
        primaryContactId: input.primaryContactId,
        commercialNote: input.commercialNote,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: CustomerInput, timestamp: string) {
    const values = {
      accountType: input.accountType,
      accountCode: input.accountCode,
      accountName: input.accountName,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email,
      billingAddress: input.billingAddress,
      paymentTermId: input.paymentTermId,
      creditLimit: input.creditLimit,
      defaultCurrencyCode: input.defaultCurrencyCode,
      primaryContactId: input.primaryContactId,
      commercialNote: input.commercialNote,
      updatedAt: timestamp
    };
    const updateValues = input.expectedVersion
      ? { ...values, version: input.expectedVersion + 1 }
      : values;
    const row = await this.db
      .update(customers)
      .set(updateValues)
      .where(
        input.expectedVersion
          ? and(eq(customers.id, id), eq(customers.version, input.expectedVersion))
          : eq(customers.id, id)
      )
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(customers)
      .set({
        isActive,
        lifecycleStatus: isActive ? 'ACTIVE' : 'INACTIVE',
        updatedAt: timestamp
      })
      .where(eq(customers.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async changeLifecycleStatus(
    id: string,
    lifecycleStatus: string,
    expectedVersion: number | undefined,
    timestamp: string
  ) {
    const values = expectedVersion
      ? {
          lifecycleStatus,
          isActive: lifecycleStatus === 'ACTIVE',
          version: expectedVersion + 1,
          updatedAt: timestamp
        }
      : {
          lifecycleStatus,
          isActive: lifecycleStatus === 'ACTIVE',
          updatedAt: timestamp
        };
    const row = await this.db
      .update(customers)
      .set(values)
      .where(
        expectedVersion
          ? and(eq(customers.id, id), eq(customers.version, expectedVersion))
          : eq(customers.id, id)
      )
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setCreditStatus(
    id: string,
    creditStatus: string,
    expectedVersion: number | undefined,
    timestamp: string
  ) {
    const values = expectedVersion
      ? { creditStatus, version: expectedVersion + 1, updatedAt: timestamp }
      : { creditStatus, updatedAt: timestamp };
    const row = await this.db
      .update(customers)
      .set(values)
      .where(
        expectedVersion
          ? and(eq(customers.id, id), eq(customers.version, expectedVersion))
          : eq(customers.id, id)
      )
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
      .where(eq(customers.lifecycleStatus, 'ACTIVE'))
      .orderBy(asc(customers.accountCode));
  }

  getPaymentTermSummary(id: string): PaymentTermSummaryDto | null {
    const row = this.sqlite
      .prepare(
        `SELECT id, term_code AS code, term_name AS name, due_days AS dueDays
         FROM payment_terms
         WHERE id = ?`
      )
      .get(id) as PaymentTermSummaryDto | undefined;
    return row ?? null;
  }

  getCurrencyCode(value: string) {
    const row = this.sqlite
      .prepare(
        `SELECT currency_code AS currencyCode
         FROM currencies
         WHERE currency_code = ? AND is_active = 1`
      )
      .get(value) as { currencyCode: string } | undefined;
    return row?.currencyCode ?? null;
  }

  getFinancialSummary(customer: CustomerRecord): CustomerFinancialSummaryDto {
    const asOf = getApplicationNow();
    const invoiceRows = this.sqlite
      .prepare(
        `SELECT
           invoice.id,
           invoice.status,
           invoice.total,
           invoice.currency,
           invoice.due_at AS dueAt,
           COALESCE(SUM(payment.amount), 0) AS paidAmount,
           MAX(payment.paid_at) AS lastPaymentAt
         FROM invoices invoice
         LEFT JOIN payments payment ON payment.invoice_id = invoice.id
         WHERE invoice.customer_id = ?
           AND invoice.status IN ('issued', 'approved', 'partially_paid', 'overdue')
         GROUP BY invoice.id`
      )
      .all(customer.id) as Array<{
      id: string;
      status: string;
      total: number;
      currency: string;
      dueAt: string | null;
      paidAmount: number;
      lastPaymentAt: string | null;
    }>;
    const sameCurrencyInvoices = invoiceRows.filter(
      (invoice) => invoice.currency === customer.defaultCurrencyCode
    );
    const today = new Date(asOf);
    let exposure = 0;
    let overdue = 0;
    let overdueInvoiceCount = 0;
    let oldestOverdueDays: number | null = null;
    for (const invoice of sameCurrencyInvoices) {
      const openAmount = Math.max(Math.round(invoice.total) - Math.round(invoice.paidAmount), 0);
      exposure += openAmount;
      const dueDate = invoice.dueAt ? new Date(invoice.dueAt) : null;
      const isOverdue =
        invoice.status === 'overdue' || (dueDate !== null && dueDate.getTime() < today.getTime());
      if (openAmount > 0 && isOverdue) {
        overdue += openAmount;
        overdueInvoiceCount += 1;
        if (dueDate) {
          const age = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000));
          oldestOverdueDays = Math.max(oldestOverdueDays ?? 0, age);
        }
      }
    }
    const lastPayment = this.sqlite
      .prepare(
        `SELECT payment.paid_at AS lastPaymentAt, payment.amount AS lastPaymentAmount
         FROM payments payment
         JOIN invoices invoice ON invoice.id = payment.invoice_id
         WHERE invoice.customer_id = ?
           AND payment.currency = ?
         ORDER BY payment.paid_at DESC
         LIMIT 1`
      )
      .get(customer.id, customer.defaultCurrencyCode) as
      { lastPaymentAt: string; lastPaymentAmount: number } | undefined;
    const limit = customer.creditLimit;
    const available = limit === null ? null : Math.max(limit - exposure, 0);
    const overLimit = limit === null ? null : Math.max(exposure - limit, 0);
    return {
      customerId: customer.id,
      currencyCode: customer.defaultCurrencyCode,
      creditLimitMinor: limit === null ? null : String(limit),
      currentExposureMinor: money(exposure),
      availableCreditMinor: available === null ? null : String(available),
      overLimitAmountMinor: overLimit === null ? null : String(overLimit),
      openInvoiceAmountMinor: money(exposure),
      overdueAmountMinor: money(overdue),
      openInvoiceCount: sameCurrencyInvoices.length,
      overdueInvoiceCount,
      oldestOverdueDays,
      lastPaymentAt: lastPayment?.lastPaymentAt ?? null,
      lastPaymentAmountMinor: signedMoney(lastPayment?.lastPaymentAmount),
      creditStatus: customer.creditStatus,
      asOf
    };
  }

  getOperationalSummary(customerId: string): CustomerOperationalSummaryDto {
    const asOf = getApplicationNow();
    const flightSummary = this.sqlite
      .prepare(
        `SELECT
           COUNT(cargo.id) AS totalShipmentCount,
           SUM(CASE WHEN cargo.status = 'DELIVERED' AND flight_status.code <> 'CANCELLED' THEN 1 ELSE 0 END) AS completedShipmentCount,
           MAX(CASE WHEN flight_status.code <> 'CANCELLED' THEN COALESCE(cargo.delivered_at, cargo.created_at) ELSE NULL END) AS lastShipmentAt
         FROM cargo_bookings cargo
         JOIN flight_operations flight ON flight.id = cargo.flight_operation_id
         LEFT JOIN flight_operation_statuses flight_status ON flight_status.id = flight.current_status_id
         WHERE flight.customer_id = ?`
      )
      .get(customerId) as
      | {
          totalShipmentCount: number | null;
          completedShipmentCount: number | null;
          lastShipmentAt: string | null;
        }
      | undefined;
    const activeRateAgreementCount = this.sqlite
      .prepare(
        `SELECT COUNT(*) AS count
         FROM rate_cards
         WHERE customer_id = ?
           AND is_active = 1
           AND (effective_to IS NULL OR effective_to >= date('now'))`
      )
      .get(customerId) as { count: number } | undefined;
    const activeContractCount = this.sqlite
      .prepare(
        `SELECT COUNT(*) AS count
         FROM customer_contracts
         WHERE customer_id = ?
           AND status = 'ACTIVE'
           AND (effective_until IS NULL OR effective_until >= date('now'))`
      )
      .get(customerId) as { count: number } | undefined;
    return {
      customerId,
      totalShipmentCount: flightSummary?.totalShipmentCount ?? 0,
      completedShipmentCount: flightSummary?.completedShipmentCount ?? 0,
      lastShipmentAt: flightSummary?.lastShipmentAt ?? null,
      activeContractCount: activeContractCount?.count ?? 0,
      activeRateAgreementCount: activeRateAgreementCount?.count ?? 0,
      averageRating: null,
      ratingCount: null,
      asOf
    };
  }

  async listContacts(customerId: string) {
    const rows = await this.db
      .select()
      .from(customerContacts)
      .where(eq(customerContacts.customerId, customerId))
      .orderBy(desc(customerContacts.isPrimary), asc(customerContacts.contactName));
    return rows.map(toContactDto);
  }

  async getPrimaryContact(customerId: string) {
    const row = await this.db
      .select()
      .from(customerContacts)
      .where(and(eq(customerContacts.customerId, customerId), eq(customerContacts.isPrimary, true)))
      .get();
    return row ? toContactDto(row) : null;
  }

  async getContactById(customerId: string, contactId: string) {
    const row = await this.db
      .select()
      .from(customerContacts)
      .where(and(eq(customerContacts.customerId, customerId), eq(customerContacts.id, contactId)))
      .get();
    return row ? toContactDto(row) : null;
  }

  async createContact(
    id: string,
    customerId: string,
    input: CustomerContactInput,
    timestamp: string
  ) {
    if (input.isPrimary) {
      await this.db
        .update(customerContacts)
        .set({ isPrimary: false, updatedAt: timestamp })
        .where(eq(customerContacts.customerId, customerId));
    }
    const row = await this.db
      .insert(customerContacts)
      .values({ id, customerId, ...input, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    if (input.isPrimary) await this.setPrimaryContactReference(customerId, row.id, timestamp);
    return toContactDto(row);
  }

  async updateContact(
    customerId: string,
    contactId: string,
    input: CustomerContactInput,
    timestamp: string
  ) {
    if (input.isPrimary) {
      await this.db
        .update(customerContacts)
        .set({ isPrimary: false, updatedAt: timestamp })
        .where(eq(customerContacts.customerId, customerId));
    }
    const row = await this.db
      .update(customerContacts)
      .set({ ...input, updatedAt: timestamp })
      .where(and(eq(customerContacts.customerId, customerId), eq(customerContacts.id, contactId)))
      .returning()
      .get();
    if (row && input.isPrimary)
      await this.setPrimaryContactReference(customerId, row.id, timestamp);
    return row ? toContactDto(row) : null;
  }

  async setPrimaryContactReference(
    customerId: string,
    contactId: string | null,
    timestamp: string
  ) {
    await this.db
      .update(customers)
      .set({ primaryContactId: contactId, updatedAt: timestamp })
      .where(eq(customers.id, customerId));
  }

  async setPrimaryContact(customerId: string, contactId: string, timestamp: string) {
    await this.db
      .update(customerContacts)
      .set({ isPrimary: false, updatedAt: timestamp })
      .where(eq(customerContacts.customerId, customerId));
    const row = await this.db
      .update(customerContacts)
      .set({ isPrimary: true, isActive: true, updatedAt: timestamp })
      .where(and(eq(customerContacts.customerId, customerId), eq(customerContacts.id, contactId)))
      .returning()
      .get();
    if (row) await this.setPrimaryContactReference(customerId, row.id, timestamp);
    return row ? toContactDto(row) : null;
  }

  async deactivateContact(customerId: string, contactId: string, timestamp: string) {
    const row = await this.db
      .update(customerContacts)
      .set({ isActive: false, isPrimary: false, updatedAt: timestamp })
      .where(and(eq(customerContacts.customerId, customerId), eq(customerContacts.id, contactId)))
      .returning()
      .get();
    if (row?.isPrimary) await this.setPrimaryContactReference(customerId, null, timestamp);
    return row ? toContactDto(row) : null;
  }

  async listRates(customerId: string): Promise<CustomerRateDto[]> {
    const rows = await this.db
      .select()
      .from(rateCards)
      .where(eq(rateCards.customerId, customerId))
      .orderBy(desc(rateCards.isActive), asc(rateCards.rateCode));
    return rows.map((row) => {
      const details = this.sqlite
        .prepare(
          `SELECT
             origin.station_code || ' · ' || origin.station_name AS originStation,
             destination.station_code || ' · ' || destination.station_name AS destinationStation,
             currency.currency_code AS currencyCode
           FROM rate_cards rate
           JOIN stations origin ON origin.id = rate.origin_station_id
           JOIN stations destination ON destination.id = rate.destination_station_id
           JOIN currencies currency ON currency.id = rate.currency_id
           WHERE rate.id = ?`
        )
        .get(row.id) as
        | { originStation: string | null; destinationStation: string | null; currencyCode: string }
        | undefined;
      return {
        id: row.id,
        rateCode: row.rateCode,
        serviceType: row.serviceType,
        originStation: details?.originStation ?? null,
        destinationStation: details?.destinationStation ?? null,
        currencyCode: details?.currencyCode ?? row.currencyId,
        baseRateMinor: String(row.baseRate),
        rateUnit: row.rateUnit,
        pricingScope: row.pricingScope,
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo,
        isActive: row.isActive
      };
    });
  }

  async listContracts(customerId: string) {
    const rows = await this.db
      .select()
      .from(customerContracts)
      .where(eq(customerContracts.customerId, customerId))
      .orderBy(desc(customerContracts.effectiveFrom));
    return rows.map(toContractDto);
  }

  async listNotes(customerId: string, includeFinancial: boolean) {
    const rows = await this.db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.customerId, customerId))
      .orderBy(desc(customerNotes.createdAt));
    return rows
      .filter((row) => includeFinancial || row.visibility !== 'FINANCE_ONLY')
      .map(toNoteDto);
  }

  async listHistory(customerId: string): Promise<CustomerHistoryItemDto[]> {
    const rows = await this.db
      .select()
      .from(customerAuditLogs)
      .where(eq(customerAuditLogs.customerId, customerId))
      .orderBy(desc(customerAuditLogs.occurredAt));
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorName: row.actorName,
      changedFields: JSON.parse(row.changedFields || '[]') as string[],
      occurredAt: row.occurredAt,
      requestId: row.requestId
    }));
  }

  listActivity(customerId: string): CustomerActivityItemDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT id, 'CUSTOMER_CREATED' AS activityType, 'Customer created' AS title,
           account_name AS description, 'CUSTOMER' AS sourceType, id AS sourceId, created_at AS occurredAt
         FROM customers WHERE id = ?
         UNION ALL
         SELECT id, 'INVOICE_ISSUED', 'Invoice issued', invoice_number, 'INVOICE', id, COALESCE(issued_at, created_at)
         FROM invoices WHERE customer_id = ? AND status IN ('approved', 'issued', 'partially_paid', 'overdue', 'paid')
         UNION ALL
         SELECT id, action, CASE WHEN action = 'PLACE_HOLD' THEN 'Credit hold placed' ELSE 'Credit hold released' END,
           reason, 'CUSTOMER_CREDIT_ACTION', id, occurred_at
         FROM customer_credit_actions WHERE customer_id = ?`
      )
      .all(customerId, customerId, customerId) as CustomerActivityItemDto[];
    return rows.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async recordCreditAction(
    id: string,
    customerId: string,
    action: string,
    reason: string,
    actorId: string | null,
    actorName: string | null,
    timestamp: string
  ) {
    await this.db.insert(customerCreditActions).values({
      id,
      customerId,
      action,
      reason,
      actorId,
      actorName,
      occurredAt: timestamp
    });
  }

  async recordAudit(
    id: string,
    customerId: string,
    action: string,
    changedFields: string[],
    actorId: string | null,
    actorName: string | null,
    timestamp: string,
    metadata?: unknown
  ) {
    await this.db.insert(customerAuditLogs).values({
      id,
      customerId,
      action,
      actorId,
      actorName,
      changedFields: JSON.stringify(changedFields),
      metadata: metadata ? JSON.stringify(metadata) : null,
      requestId: null,
      occurredAt: timestamp
    });
  }
}
