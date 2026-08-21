import { describe, expect, it } from 'vitest';
import { createApprovalAuthorityService } from '../../server/features/finance/approvals';
import { createSeededTestServices } from '../helpers/demo-db';

type DimensionRow = {
  owner_type: string;
  owner_id: string;
  dimension_type: string;
  dimension_value: string;
};

describe('Finance foundation', () => {
  it('persists reusable financial dimensions from source event through journal lines', async () => {
    const { services, sqlite } = await createSeededTestServices();

    services.accounting.postDemoEvents({ source: 'ticketing' }, 'USR-FINANCE-REVIEWER');

    const event = sqlite
      .prepare(
        `SELECT event.id, event.journal_entry_id
         FROM accounting_events event
         WHERE event.event_type = 'TICKET_PAYMENT_RECEIVED'
           AND event.source_type = 'PASSENGER_TICKET'
         ORDER BY event.created_at, event.id
         LIMIT 1`
      )
      .get() as { id: string; journal_entry_id: string };
    const lineIds = sqlite
      .prepare('SELECT id FROM journal_lines WHERE journal_entry_id = ? ORDER BY line_number')
      .all(event.journal_entry_id) as Array<{ id: string }>;
    const dimensions = sqlite
      .prepare(
        `SELECT owner_type, owner_id, dimension_type, dimension_value
         FROM financial_dimension_values
         WHERE (owner_type = 'ACCOUNTING_EVENT' AND owner_id = ?)
            OR (owner_type = 'JOURNAL_LINE' AND owner_id IN (?, ?))
         ORDER BY owner_type, owner_id, dimension_type`
      )
      .all(event.id, lineIds[0]?.id, lineIds[1]?.id) as DimensionRow[];

    const eventDimensions = Object.fromEntries(
      dimensions
        .filter((row) => row.owner_type === 'ACCOUNTING_EVENT')
        .map((row) => [row.dimension_type, row.dimension_value])
    );
    expect(eventDimensions).toMatchObject({
      FLIGHT: expect.any(String),
      AIRCRAFT: expect.any(String),
      ROUTE: expect.any(String),
      STATION: expect.any(String),
      COST_CENTER: expect.any(String)
    });
    for (const line of lineIds) {
      expect(
        dimensions
          .filter((row) => row.owner_type === 'JOURNAL_LINE' && row.owner_id === line.id)
          .map((row) => row.dimension_type)
      ).toEqual(expect.arrayContaining(['FLIGHT', 'AIRCRAFT', 'ROUTE', 'STATION', 'COST_CENTER']));
    }

    sqlite.close();
  });

  it('resolves approval thresholds using a deterministic base-currency normalization', async () => {
    const { sqlite } = await createSeededTestServices();
    const approvals = createApprovalAuthorityService(sqlite, () => '2026-07-10T00:00:00.000Z');

    const result = approvals.resolve({
      transactionType: 'SUPPLIER_PAYMENT',
      amountMinor: 1_000,
      currencyCode: 'USD',
      exchangeRateToIdrMicros: 16_000_000_000,
      effectiveDate: '2026-07-10'
    });

    expect(result).toMatchObject({
      baseCurrencyCode: 'IDR',
      baseAmountIdr: 16_000_000,
      exchangeRateToIdrMicros: 16_000_000_000,
      requiredRole: 'Finance Reviewer',
      requiredApprovalLevel: 2
    });

    sqlite.close();
  });

  it('resolves posting policy by source module as well as event type and effective date', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite
      .prepare(
        `INSERT INTO accounting_policies (
          id, policy_code, policy_name, source_module, event_type,
          product_accounting_profile_id, debit_account_id, credit_account_id,
          treatment, capitalization_candidate, required_dimensions_json, priority,
          effective_from, approval_status, version, is_active, created_at, updated_at
        ) VALUES (
          'policy-inventory-ticket-collision', 'INVENTORY_TICKET_COLLISION_V1',
          'Inventory policy with colliding event name', 'INVENTORY',
          'TICKET_PAYMENT_RECEIVED', 'pap-passenger-ticket', 'coa-1200', 'coa-2400',
          'INVENTORY', 0, '[]', 10, '2026-01-01', 'APPROVED', 1, 1,
          '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
        )`
      )
      .run();

    services.accounting.postDemoEvents({ source: 'ticketing' }, 'USR-FINANCE-REVIEWER');

    const event = sqlite
      .prepare(
        `SELECT policy_code
         FROM accounting_events
         WHERE event_type = 'TICKET_PAYMENT_RECEIVED'
           AND source_type = 'PASSENGER_TICKET'
         ORDER BY created_at, id LIMIT 1`
      )
      .get() as { policy_code: string };
    expect(event.policy_code).toBe('TICKET_PAYMENT_DEFERRED_REVENUE_V1');
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM accounting_exceptions
           WHERE event_type = 'TICKET_PAYMENT_RECEIVED'
             AND reason_code = 'AMBIGUOUS_POLICY'`
        )
        .get()
    ).toEqual({ count: 0 });

    sqlite.close();
  });
});
