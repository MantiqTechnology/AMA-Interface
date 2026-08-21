import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';
import type {
  FinanceHandoffDto,
  FinanceHandoffListQuery,
  FinanceHandoffStatus,
  ReceiveFinanceHandoffInput
} from '../../../../shared/features/finance/handoffs';
import type { AccountingService } from '../accounting/service';
import { DomainError } from '../../../utils/errors';
import { FinanceAuditService } from '../audit/service';

type SqlRow = Record<string, unknown>;

const str = (value: unknown) => (value === null || value === undefined ? null : String(value));
const num = (value: unknown) => Number(value ?? 0);

export class FinanceHandoffService {
  private readonly audit: FinanceAuditService;

  constructor(
    private readonly sqlite: Database.Database,
    private readonly accounting: AccountingService,
    private readonly now: () => string
  ) {
    this.audit = new FinanceAuditService(sqlite, now);
  }

  bridgePendingSources() {
    let received = 0;
    const bridge = this.sqlite.transaction(() => {
      const inventory = this.sqlite
        .prepare(
          `SELECT event.*, currency.currency_code
           FROM inventory_accounting_events event
           LEFT JOIN currencies currency ON currency.id = event.currency_id
           WHERE event.integration_status = 'PENDING_INTEGRATION'
           ORDER BY event.created_at, event.id`
        )
        .all() as SqlRow[];
      for (const row of inventory) {
        const module = row.source_type === 'GOODS_RECEIPT' ? 'PROCUREMENT' : 'INVENTORY';
        const before = this.findBySource(module, 'INVENTORY_ACCOUNTING_EVENT', String(row.id));
        this.receive({
          sourceModule: module,
          sourceType: 'INVENTORY_ACCOUNTING_EVENT',
          sourceId: String(row.source_id),
          sourceEventId: String(row.id),
          transactionDate: String(row.created_at),
          currencyCode: str(row.currency_code) ?? 'IDR',
          amountMinor: num(row.base_amount_idr),
          dimensions: {
            STATION: str(row.station_id),
            AIRCRAFT: str(row.aircraft_id),
            FLIGHT: str(row.flight_id),
            COST_CENTER: str(row.station_id)
          },
          payload: JSON.parse(String(row.payload_json ?? '{}')) as Record<string, unknown>,
          createdBy: 'SYSTEM-INVENTORY'
        });
        if (!before) received += 1;
      }

      const bridgeRows = (rows: SqlRow[], mapper: (row: SqlRow) => ReceiveFinanceHandoffInput) => {
        for (const row of rows) {
          const input = mapper(row);
          const before = this.findBySource(
            input.sourceModule,
            input.sourceType,
            input.sourceEventId
          );
          this.receive(input);
          if (!before) received += 1;
        }
      };

      bridgeRows(
        this.sqlite
          .prepare(
            `SELECT cost.*, currency.currency_code, flight.aircraft_id, flight.route_id
           FROM flight_station_costs cost
           JOIN station_cost_statuses status ON status.id = cost.status_id AND status.code = 'APPROVED'
           JOIN currencies currency ON currency.id = COALESCE(cost.approved_currency_id, cost.currency_id)
           LEFT JOIN flight_operations flight ON flight.id = cost.flight_id
           WHERE COALESCE(cost.approved_amount, cost.amount) > 0`
          )
          .all() as SqlRow[],
        (row) => ({
          sourceModule: 'FLIGHT_OPERATIONS',
          sourceType: 'STATION_COST',
          sourceId: String(row.id),
          sourceEventId: String(row.id),
          transactionDate: String(row.approved_at ?? row.updated_at),
          currencyCode: String(row.currency_code),
          amountMinor: num(row.approved_amount ?? row.amount),
          dimensions: {
            STATION: str(row.station_id),
            FLIGHT: str(row.flight_id),
            AIRCRAFT: str(row.aircraft_id),
            ROUTE: str(row.route_id),
            COST_CENTER: str(row.station_id)
          },
          payload: {
            evidenceReference: row.evidence_reference,
            vendorReference: row.vendor_reference
          },
          createdBy: 'SYSTEM-FLIGHT-OPERATIONS'
        })
      );
      bridgeRows(
        this.sqlite
          .prepare(
            `SELECT request.*, currency.currency_code, flight.origin_station_id, flight.aircraft_id, flight.route_id
           FROM flight_fuel_requests request
           JOIN fuel_workflow_statuses status ON status.id = request.status_id AND status.code = 'POSTED'
           JOIN currencies currency ON currency.id = request.currency_id
           JOIN flight_operations flight ON flight.id = request.flight_id
           WHERE request.total_cost > 0`
          )
          .all() as SqlRow[],
        (row) => ({
          sourceModule: 'FUEL',
          sourceType: 'FUEL_COST',
          sourceId: String(row.id),
          sourceEventId: String(row.id),
          transactionDate: String(row.updated_at),
          currencyCode: String(row.currency_code),
          amountMinor: num(row.total_cost),
          dimensions: {
            STATION: str(row.origin_station_id),
            FLIGHT: str(row.flight_id),
            AIRCRAFT: str(row.aircraft_id),
            ROUTE: str(row.route_id),
            COST_CENTER: str(row.origin_station_id)
          },
          payload: { supplierId: row.fuel_supplier_id, taxAmount: row.tax_amount },
          createdBy: 'SYSTEM-FUEL'
        })
      );
      bridgeRows(
        this.sqlite
          .prepare(
            `SELECT handoff.*, currency.currency_code, flight.origin_station_id, flight.route_id
           FROM flight_maintenance_handoffs handoff
           JOIN maintenance_handoff_statuses status ON status.id = handoff.status_id AND status.code IN ('APPROVED', 'POSTED')
           JOIN currencies currency ON currency.id = handoff.currency_id
           LEFT JOIN flight_operations flight ON flight.id = handoff.flight_id
           WHERE handoff.maintenance_cost > 0`
          )
          .all() as SqlRow[],
        (row) => ({
          sourceModule: 'MRO',
          sourceType: 'MAINTENANCE_COST',
          sourceId: String(row.id),
          sourceEventId: String(row.id),
          transactionDate: String(row.approved_at ?? row.updated_at),
          currencyCode: String(row.currency_code),
          amountMinor: num(row.maintenance_cost),
          dimensions: {
            STATION: str(row.origin_station_id),
            FLIGHT: str(row.flight_id),
            AIRCRAFT: str(row.aircraft_id),
            ROUTE: str(row.route_id),
            WORK_PACKAGE: str(row.work_order_reference),
            COST_CENTER: str(row.origin_station_id)
          },
          payload: {
            workOrderReference: row.work_order_reference,
            sparePartReference: row.spare_part_reference
          },
          createdBy: 'SYSTEM-MRO'
        })
      );
      bridgeRows(
        this.sqlite
          .prepare(
            `SELECT ticket.id, ticket.flight_operation_id, ticket.total_amount, ticket.currency_code,
                  ticket.paid_at, flight.origin_station_id, flight.aircraft_id, flight.route_id
           FROM passenger_tickets ticket JOIN flight_operations flight ON flight.id = ticket.flight_operation_id
           WHERE ticket.payment_status = 'PAID'`
          )
          .all() as SqlRow[],
        (row) => ({
          sourceModule: 'TICKETING',
          sourceType: 'PASSENGER_TICKET',
          sourceId: String(row.id),
          sourceEventId: String(row.id),
          transactionDate: String(row.paid_at),
          currencyCode: String(row.currency_code),
          amountMinor: num(row.total_amount),
          dimensions: {
            STATION: str(row.origin_station_id),
            FLIGHT: str(row.flight_operation_id),
            AIRCRAFT: str(row.aircraft_id),
            ROUTE: str(row.route_id),
            COST_CENTER: str(row.origin_station_id)
          },
          payload: {},
          createdBy: 'SYSTEM-TICKETING'
        })
      );
      bridgeRows(
        this.sqlite
          .prepare(
            `SELECT booking.id, booking.flight_operation_id, booking.total_amount, booking.currency_code,
                  booking.paid_at, flight.origin_station_id, flight.aircraft_id, flight.route_id
           FROM cargo_bookings booking JOIN flight_operations flight ON flight.id = booking.flight_operation_id
           WHERE booking.payment_status = 'PAID'`
          )
          .all() as SqlRow[],
        (row) => ({
          sourceModule: 'TICKETING',
          sourceType: 'CARGO_BOOKING',
          sourceId: String(row.id),
          sourceEventId: String(row.id),
          transactionDate: String(row.paid_at),
          currencyCode: String(row.currency_code),
          amountMinor: num(row.total_amount),
          dimensions: {
            STATION: str(row.origin_station_id),
            FLIGHT: str(row.flight_operation_id),
            AIRCRAFT: str(row.aircraft_id),
            ROUTE: str(row.route_id),
            COST_CENTER: str(row.origin_station_id)
          },
          payload: {},
          createdBy: 'SYSTEM-TICKETING'
        })
      );
    });
    bridge.immediate();
    return { received };
  }

  receive(input: ReceiveFinanceHandoffInput): FinanceHandoffDto {
    const existing = this.findBySource(input.sourceModule, input.sourceType, input.sourceEventId);
    if (existing) return this.toDto(existing);
    const id = `finance-handoff-${nanoid(12)}`;
    const createdAt = this.now();
    const dimensions = input.dimensions ?? {};
    this.sqlite
      .prepare(
        `INSERT INTO finance_handoffs (
          id, source_module, source_type, source_id, source_event_id, transaction_date,
          currency_code, amount_minor, station_id, flight_id, aircraft_id, route_id,
          cost_center_id, payload_json, status, received_at, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?, ?, ?)`
      )
      .run(
        id,
        input.sourceModule,
        input.sourceType,
        input.sourceId,
        input.sourceEventId,
        input.transactionDate,
        input.currencyCode,
        input.amountMinor,
        dimensions.STATION ?? null,
        dimensions.FLIGHT ?? null,
        dimensions.AIRCRAFT ?? null,
        dimensions.ROUTE ?? null,
        dimensions.COST_CENTER ?? null,
        JSON.stringify(input.payload),
        createdAt,
        input.createdBy,
        createdAt,
        createdAt
      );
    const insertDimension = this.sqlite.prepare(
      `INSERT OR IGNORE INTO financial_dimension_values (
        id, owner_type, owner_id, dimension_type, dimension_value, created_at
      ) VALUES (?, 'FINANCE_HANDOFF', ?, ?, ?, ?)`
    );
    for (const [type, value] of Object.entries(dimensions)) {
      if (!value) continue;
      insertDimension.run(`dimension-${nanoid(12)}`, id, type, value, createdAt);
    }
    this.history(id, null, 'RECEIVED', input.createdBy);
    this.audit.record({
      actorId: input.createdBy,
      action: 'FINANCE_HANDOFF_RECEIVED',
      entityType: 'FINANCE_HANDOFF',
      entityId: id,
      sourceReference: input.sourceEventId,
      after: { sourceModule: input.sourceModule, sourceType: input.sourceType }
    });
    return this.get(id);
  }

  validate(id: string, actorId: string): FinanceHandoffDto {
    const current = this.get(id);
    if (
      ['VALIDATED', 'ACCEPTED', 'ACCOUNTING_EVENT_CREATED', 'JOURNAL_CREATED', 'POSTED'].includes(
        current.status
      )
    ) {
      return current;
    }
    this.transition(id, 'VALIDATING', actorId);
    if (!Number.isSafeInteger(current.amountMinor) || current.amountMinor <= 0) {
      this.transition(
        id,
        'EXCEPTION',
        actorId,
        'INVALID_AMOUNT',
        'Finance handoff amount must be a positive integer.'
      );
      return this.get(id);
    }
    if (!current.currencyCode) {
      this.transition(id, 'EXCEPTION', actorId, 'INVALID_CURRENCY', 'Currency is required.');
      return this.get(id);
    }
    this.transition(id, 'VALIDATED', actorId);
    return this.get(id);
  }

  accept(id: string, actorId: string): FinanceHandoffDto {
    const current = this.validate(id, actorId);
    if (current.status === 'EXCEPTION') return current;
    if (['JOURNAL_CREATED', 'POSTED'].includes(current.status)) return current;
    this.transition(id, 'ACCEPTED', actorId);
    try {
      let result;
      if (
        ['INVENTORY', 'PROCUREMENT'].includes(current.sourceModule) &&
        current.sourceType === 'INVENTORY_ACCOUNTING_EVENT'
      ) {
        result = this.accounting.processInventoryEvent(current.sourceEventId, actorId);
      } else if (
        current.sourceModule === 'FLIGHT_OPERATIONS' &&
        current.sourceType === 'STATION_COST'
      ) {
        const station = this.accounting.processApprovedStationCost(current.sourceId);
        result = {
          accountingEventId: station.accountingEventId,
          journalEntryId: station.journalEntryId,
          journalStatus: station.journalStatus,
          exceptionCode: null,
          exceptionMessage: null
        };
      } else if (
        current.sourceModule === 'TICKETING' &&
        current.sourceType === 'PASSENGER_TICKET'
      ) {
        this.accounting.recordPassengerTicketPayment(current.sourceId, actorId);
        result = this.accounting.canonicalLineage(
          'TICKET_PAYMENT_RECEIVED',
          'PASSENGER_TICKET',
          current.sourceId
        );
      } else if (current.sourceModule === 'TICKETING' && current.sourceType === 'CARGO_BOOKING') {
        this.accounting.recordCargoBookingPayment(current.sourceId, actorId);
        result = this.accounting.canonicalLineage(
          'TICKET_PAYMENT_RECEIVED',
          'CARGO_BOOKING',
          current.sourceId
        );
      } else if (current.sourceModule === 'FUEL' || current.sourceModule === 'MRO') {
        const isFuel = current.sourceModule === 'FUEL';
        result = this.accounting.postCanonicalEvent(
          {
            eventType: isFuel ? 'FUEL_COST_POSTED' : 'MRO_COST_APPROVED',
            sourceType: current.sourceType,
            sourceId: current.sourceId,
            productAccountingProfileId: null,
            accountingDate: current.transactionDate.slice(0, 10),
            transactionDate: current.transactionDate,
            documentDate: current.transactionDate.slice(0, 10),
            serviceDate: current.transactionDate.slice(0, 10),
            amountMinor: current.amountMinor,
            currencyId: current.currencyCode === 'IDR' ? 'cur-idr' : null,
            currencyCode: current.currencyCode,
            exchangeRateToIdrMicros: 1_000_000,
            baseAmountIdr: current.amountMinor,
            stationId: current.dimensions.STATION ?? null,
            aircraftId: current.dimensions.AIRCRAFT ?? null,
            flightId: current.dimensions.FLIGHT ?? null,
            workOrderReference: current.dimensions.WORK_PACKAGE ?? null,
            costCenterId: current.dimensions.COST_CENTER ?? null,
            dimensions: current.dimensions,
            payload: { financeHandoffId: current.id },
            memo: `${current.sourceModule} cost accepted by Finance`,
            idempotencyKey: `finance-handoff:${current.sourceModule}:${current.sourceEventId}:v1`
          },
          actorId
        );
      } else {
        throw new DomainError(
          'ACCOUNTING_ADAPTER_NOT_AVAILABLE',
          `No accounting adapter is available for ${current.sourceModule}/${current.sourceType}.`,
          422
        );
      }
      if (result.exceptionCode) {
        this.transition(
          id,
          'EXCEPTION',
          actorId,
          result.exceptionCode,
          result.exceptionMessage ?? 'Accounting processing failed.'
        );
        return this.get(id);
      }
      this.sqlite
        .prepare(
          `UPDATE finance_handoffs
           SET accounting_event_id = ?, journal_id = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(result.accountingEventId, result.journalEntryId, this.now(), id);
      this.transition(id, 'ACCOUNTING_EVENT_CREATED', actorId);
      this.transition(
        id,
        result.journalStatus === 'POSTED' ? 'POSTED' : 'JOURNAL_CREATED',
        actorId
      );
      return this.get(id);
    } catch (error) {
      const code = error instanceof DomainError ? error.code : 'ACCOUNTING_PROCESSING_FAILED';
      const message = error instanceof Error ? error.message : String(error);
      this.transition(id, 'EXCEPTION', actorId, code, message);
      return this.get(id);
    }
  }

  retry(id: string, actorId: string) {
    const current = this.get(id);
    if (current.status === 'POSTED') return current;
    if (current.status === 'JOURNAL_CREATED' && current.journalId) {
      const journal = this.sqlite
        .prepare('SELECT status FROM journal_entries WHERE id = ?')
        .get(current.journalId) as { status: string } | undefined;
      if (journal?.status === 'POSTED') {
        this.transition(id, 'POSTED', actorId);
        return this.get(id);
      }
      return current;
    }
    return this.accept(id, actorId);
  }

  list(query: FinanceHandoffListQuery): FinanceHandoffDto[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (query.sourceModule) {
      where.push('source_module = ?');
      params.push(query.sourceModule);
    }
    if (query.status) {
      where.push('status = ?');
      params.push(query.status);
    }
    if (query.dateFrom) {
      where.push('transaction_date >= ?');
      params.push(query.dateFrom);
    }
    if (query.dateTo) {
      where.push('transaction_date <= ?');
      params.push(query.dateTo);
    }
    if (query.search) {
      where.push('(source_id LIKE ? OR source_event_id LIKE ? OR payload_json LIKE ?)');
      const search = `%${query.search}%`;
      params.push(search, search, search);
    }
    const rows = this.sqlite
      .prepare(
        `SELECT * FROM finance_handoffs
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY transaction_date DESC, id
         LIMIT ? OFFSET ?`
      )
      .all(...params, query.limit, query.offset) as SqlRow[];
    return rows.map((row) => this.toDto(row));
  }

  get(id: string): FinanceHandoffDto {
    const row = this.sqlite.prepare('SELECT * FROM finance_handoffs WHERE id = ?').get(id) as
      SqlRow | undefined;
    if (!row) throw new DomainError('NOT_FOUND', `Finance handoff ${id} was not found.`, 404);
    return this.toDto(row);
  }

  private findBySource(sourceModule: string, sourceType: string, sourceEventId: string) {
    return this.sqlite
      .prepare(
        `SELECT * FROM finance_handoffs
         WHERE source_module = ? AND source_type = ? AND source_event_id = ?`
      )
      .get(sourceModule, sourceType, sourceEventId) as SqlRow | undefined;
  }

  private transition(
    id: string,
    status: FinanceHandoffStatus,
    actorId: string,
    errorCode: string | null = null,
    errorMessage: string | null = null
  ) {
    const current = this.get(id);
    const timestamp = this.now();
    this.sqlite
      .prepare(
        `UPDATE finance_handoffs
         SET status = ?, validated_at = CASE WHEN ? = 'VALIDATED' THEN ? ELSE validated_at END,
             accepted_at = CASE WHEN ? = 'ACCEPTED' THEN ? ELSE accepted_at END,
             error_code = ?, error_message = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(status, status, timestamp, status, timestamp, errorCode, errorMessage, timestamp, id);
    this.history(id, current.status, status, actorId, errorCode, errorMessage);
    this.audit.record({
      actorId,
      action: `FINANCE_HANDOFF_${status}`,
      entityType: 'FINANCE_HANDOFF',
      entityId: id,
      reason: errorMessage,
      sourceReference: current.sourceEventId,
      before: { status: current.status },
      after: { status, errorCode }
    });
  }

  private history(
    handoffId: string,
    fromStatus: FinanceHandoffStatus | null,
    toStatus: FinanceHandoffStatus,
    actorId: string,
    errorCode: string | null = null,
    errorMessage: string | null = null
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO finance_handoff_status_history (
          id, handoff_id, from_status, to_status, actor_id, error_code, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `finance-handoff-history-${nanoid(12)}`,
        handoffId,
        fromStatus,
        toStatus,
        actorId,
        errorCode,
        errorMessage,
        this.now()
      );
  }

  private toDto(row: SqlRow): FinanceHandoffDto {
    const dimensions = this.sqlite
      .prepare(
        `SELECT dimension_type, dimension_value FROM financial_dimension_values
         WHERE owner_type = 'FINANCE_HANDOFF' AND owner_id = ? ORDER BY dimension_type`
      )
      .all(String(row.id)) as Array<{ dimension_type: string; dimension_value: string }>;
    return {
      id: String(row.id),
      sourceModule: String(row.source_module),
      sourceType: String(row.source_type),
      sourceId: String(row.source_id),
      sourceEventId: String(row.source_event_id),
      transactionDate: String(row.transaction_date),
      currencyCode: String(row.currency_code),
      amountMinor: num(row.amount_minor),
      dimensions: Object.fromEntries(
        dimensions.map((item) => [item.dimension_type, item.dimension_value])
      ),
      status: String(row.status) as FinanceHandoffStatus,
      accountingEventId: str(row.accounting_event_id),
      journalId: str(row.journal_id),
      errorCode: str(row.error_code),
      errorMessage: str(row.error_message),
      receivedAt: String(row.received_at),
      validatedAt: str(row.validated_at),
      acceptedAt: str(row.accepted_at),
      createdBy: String(row.created_by),
      updatedAt: String(row.updated_at)
    };
  }
}
