import type Database from 'better-sqlite3';
import type { DemoSeedContext } from './context';

type TableRow = { name: string };
type ColumnRow = { name: string; type: string };

function assertNoSeedMarker(sqlite: Database.Database) {
  const tables = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as TableRow[];

  for (const { name: table } of tables) {
    const columns = sqlite
      .prepare(`PRAGMA table_info('${table.replaceAll("'", "''")}')`)
      .all() as ColumnRow[];
    for (const column of columns.filter(({ type }) => /TEXT|CHAR|CLOB/u.test(type.toUpperCase()))) {
      const match = sqlite
        .prepare(
          `SELECT ${column.name} AS value FROM ${table} WHERE lower(${column.name}) LIKE '%demo%' LIMIT 1`
        )
        .get() as { value: string } | undefined;
      if (match)
        throw new Error(
          `Seed value ${table}.${column.name} contains forbidden marker: ${match.value}`
        );
    }
  }
}

export function assertScenarioSeedIntegrity(sqlite: Database.Database, context: DemoSeedContext) {
  const foreignKeys = sqlite.prepare('PRAGMA foreign_key_check').all();
  if (foreignKeys.length > 0)
    throw new Error(`Scenario seed has ${foreignKeys.length} foreign key violation(s)`);

  assertNoSeedMarker(sqlite);

  const routeMismatch = sqlite
    .prepare(
      `SELECT flight.id FROM flight_operations flight
      JOIN routes route ON route.id = flight.route_id
      WHERE route.origin_station_id != flight.origin_station_id
         OR route.destination_station_id != flight.destination_station_id LIMIT 1`
    )
    .get() as { id: string } | undefined;
  if (routeMismatch)
    throw new Error(`Flight ${routeMismatch.id} does not match its route stations`);

  const missingClosureEvidence = sqlite
    .prepare(
      `SELECT flight.id FROM flight_operations flight
      JOIN flight_operation_statuses status ON status.id = flight.current_status_id
      WHERE status.code = 'CLOSED' AND (
        NOT EXISTS (SELECT 1 FROM flight_maintenance_handoffs maintenance
          JOIN maintenance_handoff_statuses maintenance_status ON maintenance_status.id = maintenance.status_id
          WHERE maintenance.flight_id = flight.id AND maintenance_status.code IN ('APPROVED', 'POSTED'))
        OR NOT EXISTS (SELECT 1 FROM flight_manifests manifest
          WHERE manifest.flight_operation_id = flight.id AND manifest.locked_at IS NOT NULL)
      ) LIMIT 1`
    )
    .get() as { id: string } | undefined;
  if (missingClosureEvidence)
    throw new Error(`Closed flight ${missingClosureEvidence.id} lacks closure evidence`);

  const anchoredFlight = sqlite
    .prepare(
      `SELECT flight_date AS flightDate FROM flight_operations WHERE id = 'fop-ticketing-passenger'`
    )
    .get() as { flightDate: string } | undefined;
  if (anchoredFlight?.flightDate !== context.date(1)) {
    throw new Error('Passenger sales flight is not anchored to D+1');
  }

  const missingAccountingScenario = sqlite
    .prepare(
      `SELECT expected.source_id AS sourceId
       FROM (
         SELECT 'inv-install-brake-active' AS source_id
         UNION ALL SELECT 'inv-install-starter-reversed'
         UNION ALL SELECT 'inv-gr-finance-components'
         UNION ALL SELECT 'finance-ticket-month-end-001'
         UNION ALL SELECT 'refund-passenger-approved'
       ) expected
       WHERE NOT EXISTS (
         SELECT 1 FROM accounting_events event
         WHERE event.source_id = expected.source_id
       )
       LIMIT 1`
    )
    .get() as { sourceId: string } | undefined;
  if (missingAccountingScenario) {
    throw new Error(`Accounting scenario ${missingAccountingScenario.sourceId} was not processed`);
  }

  const unbalancedJournal = sqlite
    .prepare(
      `SELECT journal.id
       FROM journal_entries journal
       JOIN journal_lines line ON line.journal_entry_id = journal.id
       GROUP BY journal.id
       HAVING SUM(line.debit_minor) != SUM(line.credit_minor)
       LIMIT 1`
    )
    .get() as { id: string } | undefined;
  if (unbalancedJournal) throw new Error(`Journal ${unbalancedJournal.id} is not balanced`);

  const postingPeriodMismatch = sqlite
    .prepare(
      `SELECT journal.id
       FROM journal_entries journal
       JOIN accounting_periods period ON period.id = journal.period_id
       WHERE journal.status = 'POSTED'
         AND (journal.posting_date < period.start_date OR journal.posting_date > period.end_date)
       LIMIT 1`
    )
    .get() as { id: string } | undefined;
  if (postingPeriodMismatch) {
    throw new Error(`Journal ${postingPeriodMismatch.id} posting date does not match its period`);
  }

  const prematureAsset = sqlite
    .prepare(
      `SELECT asset.id
       FROM asset_register asset
       JOIN journal_entries journal ON journal.id = asset.source_journal_entry_id
       WHERE journal.status != 'POSTED'
       LIMIT 1`
    )
    .get() as { id: string } | undefined;
  if (prematureAsset) {
    throw new Error(`Asset ${prematureAsset.id} was created from a non-posted journal`);
  }
}
