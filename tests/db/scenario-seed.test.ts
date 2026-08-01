import { readdir, readFile, rm } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, resolveDbPath } from '../../server/db/client';
import { resetDemoDatabase } from '../../server/db/reset-demo';
import { resetScenarioBaselineOnce } from '../../server/db/startup-reset';
import { createAccountingService } from '../../server/features/finance/accounting';
import { seedScenarioDatabase } from '../../server/db/seeds/scenario-database';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { listLocalUploads, saveLocalUpload } from '../../server/utils/local-upload-storage';

const anchorDate = '2026-07-17';
const dbPath = './data/test-scenario-seed.sqlite';
const documentManifest = './data/test-scenario-documents.json';
const uploadManifest = './data/test-scenario-uploads.json';
const uploadDir = './data/uploads/test-scenario';

beforeAll(async () => {
  process.env.AMA_DOCUMENT_MANIFEST = documentManifest;
  process.env.AMA_UPLOAD_MANIFEST = uploadManifest;
  process.env.AMA_UPLOAD_DIR = uploadDir;
  await resetDemoDatabase(dbPath, { anchorDate, resetDocuments: true });
});

afterAll(async () => {
  delete process.env.AMA_DOCUMENT_MANIFEST;
  delete process.env.AMA_UPLOAD_MANIFEST;
  delete process.env.AMA_UPLOAD_DIR;
  for (const path of [resolveDbPath(dbPath), documentManifest, uploadManifest, uploadDir]) {
    await rm(path, { recursive: true, force: true });
    await rm(`${path}-wal`, { force: true });
    await rm(`${path}-shm`, { force: true });
  }
});

describe('realistic scenario seed', () => {
  it('runs the startup reset only once per process', async () => {
    let resetCount = 0;
    const reset = async () => {
      resetCount += 1;
    };

    await Promise.all([resetScenarioBaselineOnce(reset), resetScenarioBaselineOnce(reset)]);
    await resetScenarioBaselineOnce(reset);

    expect(resetCount).toBe(1);
  });

  it('handles relative WIT dates across month and year boundaries', () => {
    const context = createDemoSeedContext('2026-12-31');
    expect(context.date(1)).toBe('2027-01-01');
    expect(context.at(1, '08:30')).toBe('2027-01-01T08:30:00.000+09:00');
    expect(context.compactDate(-1)).toBe('20261230');
  });

  it('supports a historical fixed anchor without using the system date', async () => {
    const historicalPath = './data/test-scenario-historical.sqlite';
    try {
      await resetDemoDatabase(historicalPath, {
        anchorDate: '2025-01-15',
        resetDocuments: false
      });
      const sqlite = createDbClient(historicalPath).sqlite;
      expect(
        sqlite
          .prepare(
            `SELECT COUNT(*) AS count FROM journal_entries
             WHERE status = 'POSTED' AND posting_date > '2025-01-15'`
          )
          .get()
      ).toEqual({ count: 0 });
      expect(
        sqlite
          .prepare(
            `SELECT COUNT(*) AS count
             FROM journal_entries journal
             JOIN accounting_periods period ON period.id = journal.period_id
             WHERE journal.status = 'POSTED'
               AND (journal.posting_date < period.start_date
                    OR journal.posting_date > period.end_date)`
          )
          .get()
      ).toEqual({ count: 0 });
      sqlite.close();
    } finally {
      const resolved = resolveDbPath(historicalPath);
      await rm(resolved, { force: true });
      await rm(`${resolved}-wal`, { force: true });
      await rm(`${resolved}-shm`, { force: true });
    }
  });

  it('seeds all scenario families and their cross-domain records', async () => {
    const sqlite = createDbClient(dbPath).sqlite;
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM flight_operations').get()).toEqual({
      count: 16
    });
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM flight_requests').get()).toEqual({
      count: 5
    });
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM ticketing_refund_requests').get()).toEqual(
      { count: 3 }
    );
    expect(
      sqlite
        .prepare(
          `SELECT flight_id AS flightId, aircraft_id AS aircraftId
           FROM maintenance_part_issues WHERE id = 'inv-issue-maintenance-filter-001'`
        )
        .get()
    ).toEqual({ flightId: 'fop-landed-maintenance', aircraftId: 'ac-pk-ama' });
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    sqlite.close();

    const documents = JSON.parse(await readFile(documentManifest, 'utf8')) as {
      documents: Array<{ title: string; documentNumber?: string }>;
    };
    expect(documents.documents.length).toBeGreaterThanOrEqual(20);
    expect(JSON.stringify(documents).toLowerCase()).not.toContain('demo');
  });

  it('grandfathers closed flights and creates verification tasks only for active flights', () => {
    const sqlite = createDbClient(dbPath).sqlite;

    expect(
      sqlite
        .prepare(`SELECT COUNT(*) AS count FROM flight_station_tasks WHERE flight_id = ?`)
        .get('fop-closed-djj-wmx')
    ).toEqual({ count: 0 });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM flight_operational_audit
           WHERE flight_id = ? AND action = 'LEGACY_CLOSED_MARKER'`
        )
        .get('fop-closed-djj-wmx')
    ).toEqual({ count: 1 });
    expect(
      sqlite
        .prepare(`SELECT COUNT(*) AS count FROM flight_station_tasks WHERE flight_id = ?`)
        .get('fop-ticketing-passenger')
    ).toEqual({ count: 10 });

    sqlite.close();
  });

  it('seeds finance scenarios through the canonical accounting flow', async () => {
    const client = createDbClient(dbPath);
    const { sqlite } = client;

    const journalStatus = (sourceType: string, sourceId: string) =>
      sqlite
        .prepare(
          `SELECT status FROM journal_entries
           WHERE source_type = ? AND source_id = ?
           ORDER BY journal_number DESC LIMIT 1`
        )
        .get(sourceType, sourceId);

    expect(journalStatus('GOODS_RECEIPT', 'inv-gr-replenishment-001')).toEqual({
      status: 'POSTED'
    });
    expect(journalStatus('MAINTENANCE_PART_ISSUE', 'inv-issue-maintenance-filter-001')).toEqual({
      status: 'POSTED'
    });
    expect(journalStatus('MAINTENANCE_PART_ISSUE', 'inv-issue-maintenance-oil-pending')).toEqual({
      status: 'PENDING_APPROVAL'
    });
    expect(journalStatus('COMPONENT_INSTALLATION', 'inv-install-starter-draft')).toEqual({
      status: 'DRAFT'
    });
    expect(journalStatus('COMPONENT_INSTALLATION', 'inv-install-starter-approved')).toEqual({
      status: 'APPROVED'
    });
    expect(journalStatus('COMPONENT_INSTALLATION', 'inv-install-brake-active')).toEqual({
      status: 'POSTED'
    });

    expect(
      sqlite
        .prepare(
          `SELECT status, reversal_journal_entry_id AS reversalJournalEntryId
           FROM asset_register WHERE source_id = 'inv-install-starter-reversed'`
        )
        .get()
    ).toMatchObject({ status: 'REVERSED', reversalJournalEntryId: expect.any(String) });
    expect(
      sqlite
        .prepare(`SELECT status FROM asset_register WHERE source_id = 'inv-install-brake-active'`)
        .get()
    ).toEqual({ status: 'ACTIVE' });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM asset_register
           WHERE source_id = 'inv-install-starter-draft'`
        )
        .get()
    ).toEqual({ count: 0 });
    expect(
      sqlite
        .prepare(
          `SELECT reason_code AS reasonCode, status FROM accounting_exceptions
           WHERE source_id = 'inv-install-starter-exception'`
        )
        .get()
    ).toEqual({ reasonCode: 'MISSING_CONTEXT', status: 'OPEN' });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM inventory_cost_layers layer
           JOIN inventory_movement_lines line ON line.id = layer.source_movement_line_id
           WHERE layer.serial_id IN (
             'inv-serial-starter-draft',
             'inv-serial-starter-approved',
             'inv-serial-starter-reversed',
             'inv-serial-starter-exception'
           )
             AND line.movement_id = 'inv-move-finance-component-receipt'
             AND layer.source_unit_cost_minor = 25000000`
        )
        .get()
    ).toEqual({ count: 4 });
    expect(journalStatus('GOODS_RECEIPT', 'inv-gr-finance-components')).toEqual({
      status: 'POSTED'
    });

    const financeEvents = sqlite
      .prepare(
        `SELECT event_type AS eventType, source_id AS sourceId, posting_status AS postingStatus
         FROM accounting_events
         WHERE source_id IN (
           'finance-ticket-month-end-001',
           'refund-passenger-approved'
         )
         ORDER BY event_type`
      )
      .all();
    expect(financeEvents).toEqual(
      expect.arrayContaining([
        {
          eventType: 'PASSENGER_SERVICE_FULFILLED',
          sourceId: 'finance-ticket-month-end-001',
          postingStatus: 'POSTED'
        },
        {
          eventType: 'TICKET_PAYMENT_RECEIVED',
          sourceId: 'finance-ticket-month-end-001',
          postingStatus: 'POSTED'
        },
        {
          eventType: 'TICKET_REFUND_APPROVED',
          sourceId: 'refund-passenger-approved',
          postingStatus: 'POSTED'
        }
      ])
    );

    const passengerLines = sqlite
      .prepare(
        `SELECT event.event_type AS eventType, event.accounting_date AS accountingDate,
                account.account_code AS accountCode, line.debit_minor AS debitMinor,
                line.credit_minor AS creditMinor
         FROM accounting_events event
         JOIN journal_entries journal ON journal.accounting_event_id = event.id
         JOIN journal_lines line ON line.journal_entry_id = journal.id
         JOIN chart_of_accounts account ON account.id = line.account_id
         WHERE event.source_id = 'finance-ticket-month-end-001'
         ORDER BY event.event_type, line.line_number`
      )
      .all();
    expect(passengerLines).toEqual([
      {
        eventType: 'PASSENGER_SERVICE_FULFILLED',
        accountingDate: '2026-07-07',
        accountCode: '2200',
        debitMinor: 2_100_000,
        creditMinor: 0
      },
      {
        eventType: 'PASSENGER_SERVICE_FULFILLED',
        accountingDate: '2026-07-07',
        accountCode: '4200',
        debitMinor: 0,
        creditMinor: 2_100_000
      },
      {
        eventType: 'TICKET_PAYMENT_RECEIVED',
        accountingDate: '2026-06-30',
        accountCode: '1000',
        debitMinor: 2_100_000,
        creditMinor: 0
      },
      {
        eventType: 'TICKET_PAYMENT_RECEIVED',
        accountingDate: '2026-06-30',
        accountCode: '2200',
        debitMinor: 0,
        creditMinor: 2_100_000
      }
    ]);
    expect(
      sqlite
        .prepare(
          `SELECT account.account_code AS accountCode, line.debit_minor AS debitMinor,
                  line.credit_minor AS creditMinor
           FROM accounting_events event
           JOIN journal_entries journal ON journal.accounting_event_id = event.id
           JOIN journal_lines line ON line.journal_entry_id = journal.id
           JOIN chart_of_accounts account ON account.id = line.account_id
           WHERE event.source_id = 'refund-passenger-approved'
           ORDER BY line.line_number`
        )
        .all()
    ).toEqual([
      { accountCode: '2200', debitMinor: 1_800_000, creditMinor: 0 },
      { accountCode: '2300', debitMinor: 0, creditMinor: 1_800_000 }
    ]);

    expect(
      sqlite
        .prepare(
          `SELECT asset.status, schedule.status AS scheduleStatus, COUNT(*) AS count
           FROM asset_register asset
           JOIN depreciation_schedules schedule ON schedule.asset_id = asset.id
           WHERE asset.source_id IN ('inv-install-brake-active', 'inv-install-starter-reversed')
           GROUP BY asset.status, schedule.status
           ORDER BY asset.status`
        )
        .all()
    ).toEqual([
      { status: 'ACTIVE', scheduleStatus: 'SCHEDULED', count: 60 },
      { status: 'REVERSED', scheduleStatus: 'CANCELLED', count: 60 }
    ]);

    const inventoryLedger = sqlite
      .prepare(
        `SELECT COALESCE(SUM(debit_minor - credit_minor), 0) AS balance
         FROM general_ledger WHERE account_code = '1200'`
      )
      .get() as { balance: number };
    const pendingInventoryCredit = sqlite
      .prepare(
        `SELECT COALESCE(SUM(line.credit_minor), 0) AS amount
         FROM journal_entries journal
         JOIN journal_lines line ON line.journal_entry_id = journal.id
         JOIN chart_of_accounts account ON account.id = line.account_id
         WHERE journal.status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED')
           AND account.account_code = '1200'`
      )
      .get() as { amount: number };
    const exceptionInventoryCost = sqlite
      .prepare(
        `SELECT COALESCE(SUM(base_amount_idr), 0) AS amount
         FROM accounting_events
         WHERE posting_status = 'EXCEPTION'
           AND event_type = 'AIRCRAFT_COMPONENT_READY_FOR_USE'`
      )
      .get() as { amount: number };
    const physicalInventory = sqlite
      .prepare(
        `SELECT COALESCE(SUM(remaining_quantity * base_unit_cost_idr), 0) AS value
         FROM inventory_cost_layers`
      )
      .get() as { value: number };
    expect(inventoryLedger.balance).toBe(115_700_000);
    expect(pendingInventoryCredit.amount).toBe(50_350_000);
    expect(exceptionInventoryCost.amount).toBe(25_000_000);
    expect(physicalInventory.value).toBe(40_350_000);
    expect(
      inventoryLedger.balance - pendingInventoryCredit.amount - exceptionInventoryCost.amount
    ).toBe(physicalInventory.value);

    const beforeReseed = sqlite
      .prepare('SELECT COUNT(*) AS count FROM accounting_events')
      .get() as { count: number };
    await seedScenarioDatabase(client, {
      context: createDemoSeedContext(anchorDate),
      resetDocuments: false
    });
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM accounting_events').get()).toEqual(
      beforeReseed
    );

    const passengerRevenueBefore = sqlite
      .prepare(
        `SELECT COALESCE(SUM(credit_minor), 0) AS amount
         FROM general_ledger
         WHERE account_code = '4200' AND flight_id = 'finance-flight-month-crossing'`
      )
      .get() as { amount: number };
    createAccountingService(sqlite, () => createDemoSeedContext(anchorDate).now).postDemoEvents(
      { source: 'flight' },
      'USR-FINANCE-REVIEWER'
    );
    const passengerRevenueAfter = sqlite
      .prepare(
        `SELECT COALESCE(SUM(credit_minor), 0) AS amount
         FROM general_ledger
         WHERE account_code = '4200' AND flight_id = 'finance-flight-month-crossing'`
      )
      .get() as { amount: number };
    expect(passengerRevenueBefore.amount).toBe(2_100_000);
    expect(passengerRevenueAfter).toEqual(passengerRevenueBefore);

    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM general_ledger ledger
           JOIN journal_entries journal ON journal.id = ledger.journal_entry_id
           WHERE journal.status != 'POSTED'`
        )
        .get()
    ).toEqual({ count: 0 });
    expect(
      sqlite
        .prepare(
          `SELECT COALESCE(SUM(debit_minor), 0) AS debit,
                  COALESCE(SUM(credit_minor), 0) AS credit
           FROM general_ledger`
        )
        .get()
    ).toMatchObject({ debit: expect.any(Number), credit: expect.any(Number) });
    const balance = sqlite
      .prepare(
        `SELECT COALESCE(SUM(debit_minor), 0) AS debit,
                COALESCE(SUM(credit_minor), 0) AS credit
         FROM general_ledger`
      )
      .get() as { debit: number; credit: number };
    expect(balance.debit).toBe(balance.credit);

    sqlite.close();
  });

  it('restores database mutations and session uploads on reset', async () => {
    const before = await listLocalUploads();
    const sqlite = createDbClient(dbPath).sqlite;
    sqlite.prepare(`UPDATE flight_requests SET remarks = 'changed during presentation'`).run();
    sqlite.close();
    await saveLocalUpload({
      originalName: 'session-note.txt',
      contentType: 'text/plain',
      data: Buffer.from('temporary session upload')
    });

    await resetDemoDatabase(dbPath, { anchorDate, resetDocuments: true });

    const restored = createDbClient(dbPath).sqlite;
    const changed = restored
      .prepare(
        `SELECT COUNT(*) AS count FROM flight_requests WHERE remarks = 'changed during presentation'`
      )
      .get();
    expect(changed).toEqual({ count: 0 });
    restored.close();
    expect((await listLocalUploads()).length).toBe(before.length);
  });

  it('produces identical document evidence for the same anchor', async () => {
    const snapshot = async () => ({
      documents: await readFile(documentManifest, 'utf8'),
      uploads: await readFile(uploadManifest, 'utf8'),
      files: await Promise.all(
        (await readdir(uploadDir))
          .sort()
          .map(async (file) => [file, (await readFile(`${uploadDir}/${file}`)).toString('base64')])
      )
    });

    await resetDemoDatabase(dbPath, { anchorDate, resetDocuments: true });
    const first = await snapshot();
    await resetDemoDatabase(dbPath, { anchorDate, resetDocuments: true });

    expect(await snapshot()).toEqual(first);
  });
});
