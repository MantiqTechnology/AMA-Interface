import type Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { InventoryRepository } from '../../server/features/inventory/repository';
import { InventoryService } from '../../server/features/inventory/service';
import { createSeededTestServices } from '../helpers/demo-db';

type TestContext = Awaited<ReturnType<typeof createSeededTestServices>>;
type CountRow = { count: number };
type JournalRow = { id: string; status: string; amount: number };
type LineRow = { account_code: string; debit: number; credit: number };
type AssetRow = { id: string; status: string; cost_minor: number; useful_life_months: number };

function journalForEvent(sqlite: Database.Database, eventType: string, sourceId: string) {
  return sqlite
    .prepare(
      `SELECT journal.id, journal.status, event.amount_minor AS amount
       FROM accounting_events event
       JOIN journal_entries journal ON journal.accounting_event_id = event.id
       WHERE event.event_type = ? AND event.source_id = ?
       LIMIT 1`
    )
    .get(eventType, sourceId) as JournalRow | undefined;
}

function journalLines(sqlite: Database.Database, journalId: string) {
  return sqlite
    .prepare(
      `SELECT account.account_code, line.debit_minor AS debit, line.credit_minor AS credit
       FROM journal_lines line
       JOIN chart_of_accounts account ON account.id = line.account_id
       WHERE line.journal_entry_id = ?
       ORDER BY line.line_number`
    )
    .all(journalId) as LineRow[];
}

function postJournal(context: TestContext, journalId: string) {
  context.services.accounting.submitJournal(journalId, 'USR-FINANCE-REVIEWER');
  context.services.accounting.approveJournal(journalId, 'USR-DIRECTOR');
  return context.services.accounting.postJournal(journalId, 'USR-FINANCE-REVIEWER');
}

function insertComponentOperationalEvent(
  sqlite: Database.Database,
  id: string,
  payload: Record<string, unknown>
) {
  sqlite
    .prepare(
      `INSERT INTO inventory_movements (
        id, movement_number, movement_type, source_type, source_id, station_id,
        destination_station_id, aircraft_id, flight_id, reason, status,
        reversal_of_movement_id, total_base_value_idr, is_finalized,
        created_by_user_id, created_at
      ) VALUES (?, ?, 'INSTALL', 'COMPONENT_INSTALLATION', ?, 'st-djj', NULL,
        'ac-pk-ama', NULL, 'Accounting test component installation', 'POSTED',
        NULL, 3200000, 1, 'USR-MAINTENANCE-MANAGER', '2026-07-17T12:00:00.000Z')`
    )
    .run(`inv-move-${id}`, `MOV-${id}`, `installation-${id}`);
  sqlite
    .prepare(
      `INSERT INTO inventory_accounting_events (
        id, event_type, source_type, source_id, movement_id, station_id, aircraft_id,
        flight_id, currency_id, source_amount_minor, exchange_rate_to_idr_micros,
        base_amount_idr, integration_status, payload_json, created_at
      ) VALUES (?, 'INVENTORY_COMPONENT_INSTALL', 'COMPONENT_INSTALLATION',
        'inv-serial-starter-installed', ?, 'st-djj', 'ac-pk-ama', NULL, 'cur-idr',
        3200000, 1000000, 3200000, 'PENDING_INTEGRATION', ?, '2026-07-17T12:00:00.000Z')`
    )
    .run(`inv-ae-${id}`, `inv-move-${id}`, JSON.stringify(payload));
}

function insertMaintenanceOperationalEvent(
  sqlite: Database.Database,
  id: string,
  payload: Record<string, unknown>
) {
  sqlite
    .prepare(
      `INSERT INTO inventory_movements (
        id, movement_number, movement_type, source_type, source_id, station_id,
        destination_station_id, aircraft_id, flight_id, reason, status,
        reversal_of_movement_id, total_base_value_idr, is_finalized,
        created_by_user_id, created_at
      ) VALUES (?, ?, 'ISSUE', 'MAINTENANCE_PART_ISSUE', ?, 'st-djj', NULL,
        'ac-pk-ama', NULL, 'Accounting test heavy component issue', 'POSTED',
        NULL, 3200000, 0, 'USR-INVENTORY-CONTROLLER', '2026-07-17T10:00:00.000Z')`
    )
    .run(`inv-move-${id}`, `MOV-${id}`, `issue-${id}`);
  sqlite
    .prepare(
      `INSERT INTO inventory_movement_lines (
        id, movement_id, part_id, from_bin_id, to_bin_id, lot_id, serial_id,
        condition_from, condition_to, quantity, source_unit_cost_minor, currency_id,
        exchange_rate_to_idr_micros, base_unit_cost_idr, base_value_idr
      ) VALUES (?, ?, 'inv-part-starter', 'inv-bin-djj-usable', NULL, NULL,
        'inv-serial-starter-installed', 'SERVICEABLE', NULL, 1, 3200000,
        'cur-idr', 1000000, 3200000, 3200000)`
    )
    .run(`inv-move-line-${id}`, `inv-move-${id}`);
  sqlite
    .prepare('UPDATE inventory_movements SET is_finalized = 1 WHERE id = ?')
    .run(`inv-move-${id}`);
  sqlite
    .prepare(
      `INSERT INTO maintenance_part_issues (
        id, issue_number, maintenance_handoff_id, aircraft_id, flight_id, warehouse_id,
        reason, movement_id, status, total_parts_value_idr, issued_by_user_id, issued_at
      ) VALUES (?, ?, 'maintenance-landed-filter-draft', 'ac-pk-ama', NULL,
        'inv-wh-djj-main', 'Accounting test heavy issue', ?, 'ISSUED', 3200000,
        'USR-INVENTORY-CONTROLLER', '2026-07-17T10:00:00.000Z')`
    )
    .run(`issue-${id}`, `ISS-${id}`, `inv-move-${id}`);
  sqlite
    .prepare(
      `INSERT INTO maintenance_part_issue_lines (
        id, issue_id, part_id, quantity, base_value_idr, note
      ) VALUES (?, ?, 'inv-part-starter', 1, 3200000, 'Accounting test component')`
    )
    .run(`issue-line-${id}`, `issue-${id}`);
  sqlite
    .prepare(
      `INSERT INTO inventory_accounting_events (
        id, event_type, source_type, source_id, movement_id, station_id, aircraft_id,
        flight_id, currency_id, source_amount_minor, exchange_rate_to_idr_micros,
        base_amount_idr, integration_status, payload_json, created_at
      ) VALUES (?, 'INVENTORY_MAINTENANCE_ISSUE', 'MAINTENANCE_PART_ISSUE', ?, ?,
        'st-djj', 'ac-pk-ama', NULL, 'cur-idr', 3200000, 1000000, 3200000,
        'PENDING_INTEGRATION', ?, '2026-07-17T10:00:00.000Z')`
    )
    .run(`inv-ae-${id}`, `issue-${id}`, `inv-move-${id}`, JSON.stringify(payload));
}

describe('inventory accounting integration', () => {
  it('turns a goods receipt operational handoff into draft journal and posted GL', async () => {
    const context = await createSeededTestServices();
    const { services, sqlite } = context;

    const summary = services.accounting.processInventoryEvents(
      { batchSize: 25 },
      'USR-FINANCE-REVIEWER'
    );

    expect(summary.processed).toBeGreaterThanOrEqual(2);
    const journal = journalForEvent(sqlite, 'INVENTORY_RECEIVED', 'inv-gr-replenishment-001');
    expect(journal).toMatchObject({ status: 'DRAFT' });
    expect(journal?.amount).toBe(19_850_000);
    expect(journalLines(sqlite, journal!.id)).toEqual([
      { account_code: '1200', debit: 19_850_000, credit: 0 },
      { account_code: '2400', debit: 0, credit: 19_850_000 }
    ]);

    postJournal(context, journal!.id);
    const ledgerAccounts = services.accounting
      .generalLedger({ limit: 250, offset: 0 })
      .filter((line) => line.sourceId === 'inv-gr-replenishment-001')
      .map((line) => line.accountCode);
    expect(ledgerAccounts).toEqual(expect.arrayContaining(['1200', '2400']));
    expect(
      sqlite
        .prepare(
          "SELECT integration_status FROM inventory_accounting_events WHERE id = 'inv-ae-receipt-001'"
        )
        .get()
    ).toEqual({ integration_status: 'INTEGRATED' });

    const before = sqlite
      .prepare('SELECT COUNT(*) AS count FROM journal_entries')
      .get() as CountRow;
    const duplicate = services.accounting.processInventoryEvents(
      { batchSize: 25 },
      'USR-FINANCE-REVIEWER'
    );
    const after = sqlite.prepare('SELECT COUNT(*) AS count FROM journal_entries').get() as CountRow;
    expect(duplicate).toEqual({ processed: 0, skipped: 0, exceptions: 0, duplicates: 0 });
    expect(after.count).toBe(before.count);
  });

  it('expenses routine maintenance parts at the actual FIFO cost', async () => {
    const context = await createSeededTestServices();
    const { services, sqlite } = context;
    const inventory = new InventoryService(new InventoryRepository(sqlite));
    const issue = await inventory.issueMaintenanceParts(
      {
        maintenanceHandoffId: null,
        maintenanceCategory: 'ROUTINE',
        aircraftId: 'ac-pk-ama',
        flightId: null,
        warehouseId: 'inv-wh-djj-main',
        reason: 'Routine filter replacement.',
        lines: [
          {
            partId: 'inv-part-filter-pc6',
            quantity: 1,
            serialIds: [],
            note: 'Routine maintenance'
          }
        ]
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );

    services.accounting.processInventoryEvents({ batchSize: 25 }, 'USR-FINANCE-REVIEWER');
    const journal = journalForEvent(sqlite, 'MAINTENANCE_PART_ISSUED', issue.id);

    expect(journal).toMatchObject({ status: 'DRAFT', amount: 950_000 });
    expect(journalLines(sqlite, journal!.id)).toEqual([
      { account_code: '5400', debit: 950_000, credit: 0 },
      { account_code: '1200', debit: 0, credit: 950_000 }
    ]);

    postJournal(context, journal!.id);
    expect(
      services.accounting
        .generalLedger({ limit: 250, offset: 0 })
        .filter((line) => line.sourceId === issue.id)
        .map((line) => line.accountCode)
    ).toEqual(expect.arrayContaining(['5400', '1200']));
  });

  it('maps minor repair issues to the maintenance expense policy', async () => {
    const context = await createSeededTestServices();
    const { services, sqlite } = context;
    const inventory = new InventoryService(new InventoryRepository(sqlite));
    const issue = await inventory.issueMaintenanceParts(
      {
        maintenanceHandoffId: null,
        maintenanceCategory: 'MINOR_REPAIR',
        aircraftId: 'ac-pk-ama',
        flightId: null,
        warehouseId: 'inv-wh-djj-main',
        reason: 'Minor oil servicing.',
        lines: [
          {
            partId: 'inv-part-oil',
            quantity: 1,
            serialIds: [],
            note: 'Minor repair consumable'
          }
        ]
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );

    services.accounting.processInventoryEvents({ batchSize: 25 }, 'USR-FINANCE-REVIEWER');
    const journal = journalForEvent(sqlite, 'MAINTENANCE_PART_ISSUED', issue.id);
    expect(journal).toMatchObject({ status: 'DRAFT' });
    expect(journalLines(sqlite, journal!.id).map((line) => line.account_code)).toEqual([
      '5400',
      '1200'
    ]);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM asset_register').get()).toEqual({
      count: 0
    });
  });

  it('blocks a second inventory credit for the same serialized component cost', async () => {
    const context = await createSeededTestServices();
    const { services, sqlite } = context;
    insertMaintenanceOperationalEvent(sqlite, 'same-component-issue', {
      maintenanceHandoffId: 'maintenance-landed-filter-draft',
      maintenanceCategory: 'ROUTINE'
    });
    insertComponentOperationalEvent(sqlite, 'same-component-cost', {
      workOrderId: 'maintenance-landed-filter-draft',
      workOrderCategory: 'HEAVY_MAINTENANCE',
      capitalizationCandidate: true,
      capitalizationThresholdMinor: 1_000_000,
      expectedBenefitMonths: 24,
      technicalAcceptanceStatus: 'APPROVED',
      readyForUseDate: '2026-07-17'
    });

    services.accounting.processInventoryEvents({ batchSize: 25 }, 'USR-FINANCE-REVIEWER');

    const routineJournal = journalForEvent(
      sqlite,
      'MAINTENANCE_PART_ISSUED',
      'issue-same-component-issue'
    );
    expect(routineJournal).toBeDefined();
    expect(
      journalForEvent(sqlite, 'AIRCRAFT_COMPONENT_READY_FOR_USE', 'inv-install-starter-pk-ama')
    ).toBeUndefined();
    expect(services.accounting.listExceptions({ limit: 250, offset: 0 })).toContainEqual(
      expect.objectContaining({
        eventType: 'AIRCRAFT_COMPONENT_READY_FOR_USE',
        sourceId: 'inv-install-starter-pk-ama',
        reasonCode: 'MANUAL_REVIEW_REQUIRED'
      })
    );
  });

  it('capitalizes a heavy maintenance component only after posting the journal', async () => {
    const context = await createSeededTestServices();
    const { services, sqlite } = context;
    const inventory = new InventoryService(new InventoryRepository(sqlite));
    sqlite
      .prepare(
        "UPDATE inventory_parts SET certificate_required = 0 WHERE id = 'inv-part-brake-pc6'"
      )
      .run();
    const issue = await inventory.issueMaintenanceParts(
      {
        maintenanceHandoffId: null,
        maintenanceCategory: 'HEAVY_MAINTENANCE',
        aircraftId: 'ac-pk-ama',
        flightId: null,
        warehouseId: 'inv-wh-djj-main',
        reason: 'Heavy maintenance brake replacement.',
        lines: [
          {
            partId: 'inv-part-brake-pc6',
            quantity: 1,
            serialIds: ['inv-serial-brake-001'],
            note: 'Heavy component issue'
          }
        ]
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );

    services.accounting.processInventoryEvents({ batchSize: 25 }, 'USR-FINANCE-REVIEWER');
    expect(journalForEvent(sqlite, 'MAINTENANCE_PART_ISSUED', issue.id)).toBeUndefined();
    expect(
      services.accounting
        .generalLedger({ limit: 250, offset: 0 })
        .filter((line) => line.sourceId === issue.id)
    ).toEqual([]);

    await inventory.installSerializedPart(
      'inv-serial-brake-001',
      {
        aircraftId: 'ac-pk-ama',
        position: 'LEFT MAIN BRAKE',
        installedAt: '2026-07-17T12:00:00.000+09:00',
        hoursAtInstall: 1510,
        cyclesAtInstall: 2160,
        workOrderId: 'WO-HM-20260717-001',
        workOrderCategory: 'HEAVY_MAINTENANCE',
        capitalizationCandidate: true,
        capitalizationThresholdMinor: 1_000_000,
        expectedBenefitMonths: 24,
        technicalAcceptanceStatus: 'APPROVED',
        readyForUseDate: '2026-07-17'
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );
    const installation = sqlite
      .prepare(
        `SELECT id FROM inventory_component_installations
         WHERE serial_id = 'inv-serial-brake-001' ORDER BY installed_at DESC LIMIT 1`
      )
      .get() as { id: string };
    services.accounting.processInventoryEvents({ batchSize: 25 }, 'USR-FINANCE-REVIEWER');
    const journal = journalForEvent(sqlite, 'AIRCRAFT_COMPONENT_READY_FOR_USE', installation.id);

    expect(journal).toMatchObject({ status: 'DRAFT', amount: 3_200_000 });
    expect(journalLines(sqlite, journal!.id)).toEqual([
      { account_code: '1300', debit: 3_200_000, credit: 0 },
      { account_code: '1200', debit: 0, credit: 3_200_000 }
    ]);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM asset_register').get()).toEqual({
      count: 0
    });

    postJournal(context, journal!.id);
    const asset = sqlite
      .prepare(
        `SELECT id, status, cost_minor, useful_life_months
         FROM asset_register
         WHERE source_journal_entry_id = ?`
      )
      .get(journal!.id) as AssetRow;
    expect(asset).toMatchObject({
      status: 'ACTIVE',
      cost_minor: 3_200_000,
      useful_life_months: 24
    });
    const componentLedger = services.accounting
      .generalLedger({ limit: 250, offset: 0 })
      .filter((line) => line.sourceId === installation.id);
    expect(componentLedger.filter((line) => line.accountCode === '1200')).toEqual([
      expect.objectContaining({ debitMinor: 0, creditMinor: 3_200_000 })
    ]);
    expect(
      services.accounting
        .generalLedger({ limit: 250, offset: 0 })
        .filter((line) => line.sourceId === issue.id)
    ).toEqual([]);
    const depreciation = sqlite
      .prepare(
        `SELECT COUNT(*) AS count, SUM(depreciation_amount_minor) AS amount
         FROM depreciation_schedules
         WHERE asset_id = ?`
      )
      .get(asset.id) as { count: number; amount: number };
    expect(depreciation).toEqual({ count: 24, amount: 3_200_000 });
    expect(services.accounting.getJournalDetail(journal!.id)).toMatchObject({
      totals: { debitMinor: 3_200_000, creditMinor: 3_200_000, balanced: true },
      asset: {
        id: asset.id,
        status: 'ACTIVE',
        depreciationScheduleCount: 24,
        scheduledCount: 24,
        cancelledCount: 0
      },
      costBasis: { amountMinor: 3_200_000 }
    });

    const reversal = services.accounting.reverseJournal(
      journal!.id,
      { reason: 'Capitalization correction', postingDate: '2026-07-17' },
      'USR-DIRECTOR'
    );
    expect(reversal.status).toBe('POSTED');
    expect(
      journalForEvent(sqlite, 'AIRCRAFT_COMPONENT_READY_FOR_USE', installation.id)
    ).toMatchObject({
      id: journal!.id,
      status: 'POSTED'
    });
    expect(journalLines(sqlite, reversal.id)).toEqual([
      { account_code: '1300', debit: 0, credit: 3_200_000 },
      { account_code: '1200', debit: 3_200_000, credit: 0 }
    ]);
    expect(sqlite.prepare('SELECT status FROM asset_register WHERE id = ?').get(asset.id)).toEqual({
      status: 'REVERSED'
    });
    expect(
      sqlite
        .prepare(
          `SELECT status, COUNT(*) AS count
           FROM depreciation_schedules WHERE asset_id = ? GROUP BY status`
        )
        .get(asset.id)
    ).toEqual({ status: 'CANCELLED', count: 24 });
    expect(services.accounting.getJournalDetail(journal!.id)).toMatchObject({
      reversal: { reversalJournalId: reversal.id },
      asset: { status: 'REVERSED', scheduledCount: 0, cancelledCount: 24 }
    });
    expect(() =>
      services.accounting.reverseJournal(
        journal!.id,
        { reason: 'Repeated capitalization correction', postingDate: '2026-07-17' },
        'USR-DIRECTOR'
      )
    ).toThrow(/already has a reversal/u);
  });

  it('uses the capitalization policy account in the asset register', async () => {
    const context = await createSeededTestServices();
    const { services, sqlite } = context;
    sqlite
      .prepare(
        `INSERT INTO chart_of_accounts (
          id, account_code, account_name, account_type, normal_balance,
          parent_account_id, is_postable, is_active, created_at, updated_at
        ) VALUES (
          'coa-1310-test', '1310', 'Heavy Maintenance Component Asset', 'ASSET',
          'DEBIT', NULL, 1, 1, '2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.000Z'
        )`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE accounting_policies SET debit_account_id = 'coa-1310-test'
         WHERE id = 'policy-component-install-asset-v1'`
      )
      .run();
    insertComponentOperationalEvent(sqlite, 'policy-mapped-asset-account', {
      workOrderId: 'WO-HM-20260717-003',
      workOrderCategory: 'HEAVY_MAINTENANCE',
      capitalizationCandidate: true,
      capitalizationThresholdMinor: 1_000_000,
      expectedBenefitMonths: 24,
      technicalAcceptanceStatus: 'APPROVED',
      readyForUseDate: '2026-07-17'
    });

    services.accounting.processInventoryEvents({ batchSize: 25 }, 'USR-FINANCE-REVIEWER');
    const journal = journalForEvent(
      sqlite,
      'AIRCRAFT_COMPONENT_READY_FOR_USE',
      'inv-install-starter-pk-ama'
    );
    expect(journalLines(sqlite, journal!.id)).toEqual([
      { account_code: '1310', debit: 3_200_000, credit: 0 },
      { account_code: '1200', debit: 0, credit: 3_200_000 }
    ]);
    sqlite
      .prepare(
        `UPDATE accounting_policies SET debit_account_id = 'coa-1300'
         WHERE id = 'policy-component-install-asset-v1'`
      )
      .run();

    postJournal(context, journal!.id);
    expect(
      sqlite
        .prepare('SELECT asset_account_id FROM asset_register WHERE source_journal_entry_id = ?')
        .get(journal!.id)
    ).toEqual({ asset_account_id: 'coa-1310-test' });
    expect(
      sqlite
        .prepare(
          `SELECT json_extract(payload_json, '$.accountingPolicySnapshot.treatment') AS treatment
           FROM accounting_events WHERE journal_entry_id = ?`
        )
        .get(journal!.id)
    ).toEqual({ treatment: 'CAPITALIZE' });
  });

  it('rolls back journal posting when asset schedule creation fails', async () => {
    const context = await createSeededTestServices();
    const { services, sqlite } = context;
    insertComponentOperationalEvent(sqlite, 'atomic-capitalization', {
      workOrderId: 'WO-HM-20260717-004',
      workOrderCategory: 'HEAVY_MAINTENANCE',
      capitalizationCandidate: true,
      capitalizationThresholdMinor: 1_000_000,
      expectedBenefitMonths: 24,
      technicalAcceptanceStatus: 'APPROVED',
      readyForUseDate: '2026-07-17'
    });
    services.accounting.processInventoryEvents({ batchSize: 25 }, 'USR-FINANCE-REVIEWER');
    const journal = journalForEvent(
      sqlite,
      'AIRCRAFT_COMPONENT_READY_FOR_USE',
      'inv-install-starter-pk-ama'
    );
    services.accounting.submitJournal(journal!.id, 'USR-FINANCE-REVIEWER');
    services.accounting.approveJournal(journal!.id, 'USR-DIRECTOR');
    sqlite.exec('DROP TABLE depreciation_schedules');

    expect(() => services.accounting.postJournal(journal!.id, 'USR-FINANCE-REVIEWER')).toThrow(
      /depreciation_schedules/u
    );
    expect(
      sqlite.prepare('SELECT status FROM journal_entries WHERE id = ?').get(journal!.id)
    ).toEqual({
      status: 'APPROVED'
    });
    expect(
      sqlite
        .prepare(
          `SELECT event.posting_status AS postingStatus
           FROM accounting_events event
           JOIN journal_entries journal ON journal.accounting_event_id = event.id
           WHERE journal.id = ?`
        )
        .get(journal!.id)
    ).toEqual({ postingStatus: 'DRAFT' });
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM asset_register').get()).toEqual({
      count: 0
    });
  });

  it('creates an accounting exception when capitalization context is incomplete', async () => {
    const context = await createSeededTestServices();
    const { services, sqlite } = context;
    insertComponentOperationalEvent(sqlite, 'component-missing-context', {
      workOrderId: 'WO-HM-20260717-002',
      workOrderCategory: 'HEAVY_MAINTENANCE',
      capitalizationCandidate: true,
      capitalizationThresholdMinor: 1_000_000,
      expectedBenefitMonths: 24,
      readyForUseDate: '2026-07-17'
    });

    const summary = services.accounting.processInventoryEvents(
      { batchSize: 25 },
      'USR-FINANCE-REVIEWER'
    );

    expect(summary.exceptions).toBeGreaterThanOrEqual(1);
    expect(
      services.accounting
        .listExceptions({ limit: 250, offset: 0 })
        .filter(
          (exception) =>
            exception.eventType === 'AIRCRAFT_COMPONENT_READY_FOR_USE' &&
            exception.sourceId === 'inv-install-starter-pk-ama'
        )
    ).toContainEqual(
      expect.objectContaining({
        reasonCode: 'MISSING_CONTEXT'
      })
    );
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM asset_register').get()).toEqual({
      count: 0
    });
  });
});
