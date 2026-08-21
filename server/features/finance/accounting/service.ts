import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';
import type {
  AccountingListQuery,
  AccountingPolicyDto,
  AccountingAssetDto,
  AccountingExceptionDto,
  AccountingPostDemoEventsInput,
  AccountingPostSummaryDto,
  GeneralLedgerLineDto,
  InventoryAccountingProcessSummaryDto,
  JournalEntryDto,
  ProcessInventoryEventsInput,
  ReverseJournalInput
} from '../../../../shared/features/finance/accounting';
import { DomainError } from '../../../utils/errors';
import { getApplicationNow } from '../../../utils/time';
import { AccountingJournalDetailReader } from './journal-detail';
import { FinanceAuditService } from '../audit/service';

type SqlRow = Record<string, unknown>;

type PolicyRow = {
  id: string;
  policy_code: string;
  policy_name: string;
  source_module: string | null;
  version: number;
  debit_account_id: string;
  credit_account_id: string;
  capitalization_candidate: number;
  product_accounting_profile_id: string | null;
  priority: number;
  treatment: string;
  effective_from: string;
  effective_to: string | null;
  approval_status: string;
};

type AccountRow = {
  id: string;
  account_code: string;
  is_active: number;
  is_postable: number;
};

type JournalRow = {
  id: string;
  journal_number: string;
  accounting_event_id: string;
  status: string;
  source_type: string;
  source_id: string;
  transaction_date: string;
  document_date: string | null;
  posting_date: string | null;
  service_date: string | null;
  currency_code: string;
  exchange_rate_to_idr_micros: number;
  policy_code: string;
  policy_version: number;
  created_by_user_id: string;
  memo: string;
  idempotencyKey?: string;
};

type AccountingExceptionReason =
  | 'NO_MATCHING_POLICY'
  | 'AMBIGUOUS_POLICY'
  | 'MISSING_CONTEXT'
  | 'INVALID_ACCOUNT'
  | 'CLOSED_PERIOD'
  | 'UNBALANCED_JOURNAL'
  | 'MANUAL_REVIEW_REQUIRED';

type JournalCreateResult = {
  eventCreated: boolean;
  journalPosted: boolean;
  skipped: boolean;
  exceptionCreated?: boolean;
  duplicate?: boolean;
};

export type StationCostAccountingResult = JournalCreateResult & {
  accountingEventId: string | null;
  journalEntryId: string | null;
  journalStatus: string | null;
};

export type CanonicalAccountingResult = {
  accountingEventId: string | null;
  journalEntryId: string | null;
  journalStatus: string | null;
  exceptionCode: string | null;
  exceptionMessage: string | null;
};

export type CanonicalAccountingInput = {
  eventType: string;
  sourceType: string;
  sourceId: string;
  productAccountingProfileId: string | null;
  accountingDate: string;
  transactionDate: string;
  documentDate: string | null;
  serviceDate: string | null;
  amountMinor: number;
  currencyId: string | null;
  currencyCode: string;
  exchangeRateToIdrMicros: number;
  baseAmountIdr: number;
  stationId: string | null;
  aircraftId: string | null;
  flightId: string | null;
  workOrderReference: string | null;
  costCenterId: string | null;
  dimensions?: Record<string, string | null | undefined>;
  payload: Record<string, unknown>;
  memo: string;
  idempotencyKey?: string;
};

type SourceEvent = CanonicalAccountingInput;

const num = (value: unknown) => Number(value ?? 0);
const str = (value: unknown) => (value === null || value === undefined ? null : String(value));
const dateOnly = (value: string) => value.slice(0, 10);
const notFoundJournal = (id: string) =>
  new DomainError('NOT_FOUND', `Journal entry ${id} was not found`, 404);

export class AccountingService {
  private readonly audit: FinanceAuditService;

  constructor(
    private readonly sqlite: Database.Database,
    private readonly now: () => string = getApplicationNow
  ) {
    this.audit = new FinanceAuditService(sqlite, now);
  }

  postDemoEvents(
    input: AccountingPostDemoEventsInput,
    actorUserId: string
  ): AccountingPostSummaryDto {
    const source = input.source ?? 'all';
    const events: SourceEvent[] = [];
    if (source === 'all' || source === 'inventory') events.push(...this.inventoryEvents());
    if (source === 'all' || source === 'ticketing') events.push(...this.ticketingEvents());
    if (source === 'all' || source === 'flight') events.push(...this.flightEvents());

    const summary: AccountingPostSummaryDto = { eventsCreated: 0, journalsPosted: 0, skipped: 0 };
    const post = this.sqlite.transaction(() => {
      for (const event of events) {
        const result = this.createJournalFromSourceEvent(event, actorUserId, true);
        if (result.eventCreated) summary.eventsCreated += 1;
        if (result.journalPosted) summary.journalsPosted += 1;
        if (result.skipped) summary.skipped += 1;
      }
    });
    post.immediate();
    return summary;
  }

  processInventoryEvents(
    input: ProcessInventoryEventsInput,
    actorUserId: string
  ): InventoryAccountingProcessSummaryDto {
    const rows = this.sqlite
      .prepare(
        `SELECT id FROM inventory_accounting_events
         WHERE integration_status = 'PENDING_INTEGRATION'
         ORDER BY created_at, id
         LIMIT ?`
      )
      .all(input.batchSize) as Array<{ id: string }>;
    const summary: InventoryAccountingProcessSummaryDto = {
      processed: 0,
      skipped: 0,
      exceptions: 0,
      duplicates: 0
    };
    const process = this.sqlite.transaction(() => {
      for (const row of rows) {
        const event = this.inventoryOperationalEvent(row.id);
        if (!event) {
          summary.skipped += 1;
          this.markInventoryEvent(row.id, 'SKIPPED');
          continue;
        }
        const result = this.createJournalFromSourceEvent(event, actorUserId, false);
        if (result.duplicate) summary.duplicates += 1;
        if (result.exceptionCreated) summary.exceptions += 1;
        if (result.eventCreated && !result.exceptionCreated) summary.processed += 1;
        if (result.skipped && !result.duplicate && !result.exceptionCreated) summary.skipped += 1;
        this.markInventoryEvent(
          row.id,
          result.exceptionCreated ? 'EXCEPTION' : result.duplicate ? 'DUPLICATE' : 'INTEGRATED'
        );
      }
    });
    process.immediate();
    return summary;
  }

  processInventoryEvent(inventoryEventId: string, actorUserId: string): CanonicalAccountingResult {
    const process = () => {
      const event = this.inventoryOperationalEvent(inventoryEventId);
      if (!event) {
        throw new DomainError(
          'SOURCE_NOT_READY',
          `Inventory accounting event ${inventoryEventId} is not ready.`,
          409
        );
      }
      const result = this.createJournalFromSourceEvent(event, actorUserId, false);
      this.markInventoryEvent(
        inventoryEventId,
        result.exceptionCreated ? 'EXCEPTION' : result.duplicate ? 'DUPLICATE' : 'INTEGRATED'
      );
      const chain = this.sqlite
        .prepare(
          `SELECT event.id AS accounting_event_id, journal.id AS journal_entry_id,
                  journal.status AS journal_status, exception.reason_code, exception.message
           FROM accounting_events event
           LEFT JOIN journal_entries journal ON journal.accounting_event_id = event.id
           LEFT JOIN accounting_exceptions exception ON exception.accounting_event_id = event.id
           WHERE event.event_type = ? AND event.source_type = ? AND event.source_id = ?
           ORDER BY event.created_at DESC LIMIT 1`
        )
        .get(event.eventType, event.sourceType, event.sourceId) as SqlRow | undefined;
      return {
        accountingEventId: str(chain?.accounting_event_id),
        journalEntryId: str(chain?.journal_entry_id),
        journalStatus: str(chain?.journal_status),
        exceptionCode: str(chain?.reason_code),
        exceptionMessage: str(chain?.message)
      };
    };
    return this.sqlite.inTransaction ? process() : this.sqlite.transaction(process).immediate();
  }

  postCanonicalEvent(
    event: CanonicalAccountingInput,
    actorUserId: string
  ): CanonicalAccountingResult {
    const post = () => {
      this.createJournalFromSourceEvent(event, actorUserId, true);
      const chain = this.sqlite
        .prepare(
          `SELECT event.id AS accounting_event_id, journal.id AS journal_entry_id,
                  journal.status AS journal_status, exception.reason_code, exception.message
           FROM accounting_events event
           LEFT JOIN journal_entries journal ON journal.accounting_event_id = event.id
           LEFT JOIN accounting_exceptions exception
             ON exception.accounting_event_id = event.id AND exception.status = 'OPEN'
           WHERE event.event_type = ? AND event.source_type = ? AND event.source_id = ?
           ORDER BY event.created_at DESC LIMIT 1`
        )
        .get(event.eventType, event.sourceType, event.sourceId) as SqlRow | undefined;
      return {
        accountingEventId: str(chain?.accounting_event_id),
        journalEntryId: str(chain?.journal_entry_id),
        journalStatus: str(chain?.journal_status),
        exceptionCode: str(chain?.reason_code),
        exceptionMessage: str(chain?.message)
      };
    };
    return this.sqlite.inTransaction ? post() : this.sqlite.transaction(post).immediate();
  }

  canonicalLineage(
    eventType: string,
    sourceType: string,
    sourceId: string
  ): CanonicalAccountingResult {
    const chain = this.sqlite
      .prepare(
        `SELECT event.id AS accounting_event_id, journal.id AS journal_entry_id,
                journal.status AS journal_status, exception.reason_code, exception.message
         FROM accounting_events event
         LEFT JOIN journal_entries journal ON journal.accounting_event_id = event.id
         LEFT JOIN accounting_exceptions exception
           ON exception.accounting_event_id = event.id AND exception.status = 'OPEN'
         WHERE event.event_type = ? AND event.source_type = ? AND event.source_id = ?
         ORDER BY event.created_at DESC LIMIT 1`
      )
      .get(eventType, sourceType, sourceId) as SqlRow | undefined;
    return {
      accountingEventId: str(chain?.accounting_event_id),
      journalEntryId: str(chain?.journal_entry_id),
      journalStatus: str(chain?.journal_status),
      exceptionCode: str(chain?.reason_code),
      exceptionMessage: str(chain?.message)
    };
  }

  listPolicies(query: AccountingListQuery): AccountingPolicyDto[] {
    void query;
    const rows = this.sqlite
      .prepare(
        `SELECT policy.*, debit.account_code AS debitAccountCode,
                debit.account_name AS debitAccountName,
                credit.account_code AS creditAccountCode,
                credit.account_name AS creditAccountName
         FROM accounting_policies policy
         JOIN chart_of_accounts debit ON debit.id = policy.debit_account_id
         JOIN chart_of_accounts credit ON credit.id = policy.credit_account_id
         ORDER BY policy.event_type, policy.priority, policy.policy_code`
      )
      .all() as SqlRow[];
    return rows.map((row) => ({
      id: String(row.id),
      policyCode: String(row.policy_code),
      policyName: String(row.policy_name),
      eventType: String(row.event_type),
      productAccountingProfileId: str(row.product_accounting_profile_id),
      debitAccountCode: String(row.debitAccountCode),
      debitAccountName: String(row.debitAccountName),
      creditAccountCode: String(row.creditAccountCode),
      creditAccountName: String(row.creditAccountName),
      treatment: String(row.treatment),
      capitalizationCandidate: Boolean(row.capitalization_candidate),
      requiredDimensions: JSON.parse(String(row.required_dimensions_json ?? '[]')) as string[],
      priority: num(row.priority),
      effectiveFrom: String(row.effective_from),
      effectiveTo: str(row.effective_to),
      approvalStatus: String(row.approval_status),
      version: num(row.version),
      isActive: Boolean(row.is_active)
    }));
  }

  listAssets(query: AccountingListQuery): AccountingAssetDto[] {
    void query;
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM asset_register
         ORDER BY created_at DESC, asset_number DESC
         LIMIT 250`
      )
      .all() as SqlRow[];
    const schedule = this.sqlite.prepare(
      `SELECT period.period_code AS periodCode,
              schedule.depreciation_amount_minor AS depreciationAmountMinor,
              schedule.status
       FROM depreciation_schedules schedule
       JOIN accounting_periods period ON period.id = schedule.period_id
       WHERE schedule.asset_id = ?
       ORDER BY period.start_date
       LIMIT 120`
    );
    return rows.map((row) => ({
      id: String(row.id),
      assetNumber: String(row.asset_number),
      sourceJournalEntryId: String(row.source_journal_entry_id),
      sourceType: String(row.source_type),
      sourceId: String(row.source_id),
      assetName: String(row.asset_name),
      aircraftId: str(row.aircraft_id),
      componentSerialId: str(row.component_serial_id),
      acquisitionDate: String(row.acquisition_date),
      costMinor: num(row.cost_minor),
      currencyCode: String(row.currency_code),
      usefulLifeMonths: num(row.useful_life_months),
      status: String(row.status),
      depreciationPreview: schedule.all(row.id) as AccountingAssetDto['depreciationPreview']
    }));
  }

  recordPassengerTicketPayment(ticketId: string, actorUserId: string): AccountingPostSummaryDto {
    const event = this.passengerTicketPaymentSourceEvent(ticketId);
    if (!event) return { eventsCreated: 0, journalsPosted: 0, skipped: 1 };
    const result = this.createJournalFromSourceEvent(event, actorUserId, true);
    return {
      eventsCreated: result.eventCreated ? 1 : 0,
      journalsPosted: result.journalPosted ? 1 : 0,
      skipped: result.skipped ? 1 : 0
    };
  }

  recordCargoBookingPayment(bookingId: string, actorUserId: string): AccountingPostSummaryDto {
    const event = this.cargoBookingPaymentSourceEvent(bookingId);
    if (!event) return { eventsCreated: 0, journalsPosted: 0, skipped: 1 };
    const result = this.createJournalFromSourceEvent(event, actorUserId, true);
    return {
      eventsCreated: result.eventCreated ? 1 : 0,
      journalsPosted: result.journalPosted ? 1 : 0,
      skipped: result.skipped ? 1 : 0
    };
  }

  recordTicketRefundApproved(refundId: string, actorUserId: string): AccountingPostSummaryDto {
    const event = this.ticketRefundSourceEvent(refundId);
    if (!event) return { eventsCreated: 0, journalsPosted: 0, skipped: 1 };
    if (this.revenueRecognizedForRefund(refundId)) {
      this.recordException(
        null,
        event,
        'MANUAL_REVIEW_REQUIRED',
        'Refund was approved after revenue recognition and requires manual accounting review.'
      );
      return { eventsCreated: 0, journalsPosted: 0, skipped: 1 };
    }
    const result = this.createJournalFromSourceEvent(event, actorUserId, true);
    return {
      eventsCreated: result.eventCreated ? 1 : 0,
      journalsPosted: result.journalPosted ? 1 : 0,
      skipped: result.skipped ? 1 : 0
    };
  }

  fulfillPassengerServicesForFlight(
    flightOperationId: string,
    actorUserId: string
  ): AccountingPostSummaryDto {
    const events = this.passengerServiceFulfillmentEvents(flightOperationId);
    const summary: AccountingPostSummaryDto = { eventsCreated: 0, journalsPosted: 0, skipped: 0 };
    const post = this.sqlite.transaction(() => {
      for (const event of events) {
        const result = this.createJournalFromSourceEvent(event, actorUserId, true);
        if (result.eventCreated) summary.eventsCreated += 1;
        if (result.journalPosted) summary.journalsPosted += 1;
        if (result.skipped) summary.skipped += 1;
      }
    });
    post.immediate();
    return summary;
  }

  processApprovedStationCost(stationCostId: string): StationCostAccountingResult {
    const row = this.sqlite
      .prepare(
        `SELECT cost.id, cost.flight_id, cost.station_id, cost.source_service_id,
                cost.approved_amount, cost.approved_at, cost.approval_snapshot_json,
                approved_currency.currency_code,
                service_type.code AS service_type,
                service.completed_at, flight.flight_date, flight.aircraft_id, flight.route_id,
                handoff.id AS handoff_id, handoff.snapshot_json AS handoff_snapshot_json
         FROM flight_station_costs cost
         JOIN station_cost_statuses cost_status ON cost_status.id = cost.status_id
         JOIN currencies approved_currency ON approved_currency.id = cost.approved_currency_id
         JOIN flight_station_service_requests service ON service.id = cost.source_service_id
         JOIN station_service_types service_type ON service_type.id = service.service_type_id
         JOIN flight_operations flight ON flight.id = cost.flight_id
         JOIN flight_finance_handoffs handoff
           ON handoff.source_type = 'station_cost' AND handoff.source_id = cost.id
         WHERE cost.id = ? AND cost_status.code = 'APPROVED'`
      )
      .get(stationCostId) as SqlRow | undefined;
    if (!row) {
      throw new DomainError(
        'STATION_COST_HANDOFF_REQUIRED',
        'Approved station cost and its Finance Handoff are required before accounting.',
        409,
        { stationCostId }
      );
    }
    const serviceType = String(row.service_type);
    if (!['HANDLING', 'PARKING'].includes(serviceType)) {
      throw new DomainError(
        'STATION_COST_ACCOUNTING_MAPPING_REQUIRED',
        `Station service type ${serviceType} is not configured for accounting.`,
        422,
        { stationCostId, serviceType }
      );
    }
    const approvedAt = String(row.approved_at);
    const currencyCode = String(row.currency_code);
    const event: SourceEvent = {
      eventType:
        serviceType === 'PARKING'
          ? 'STATION_PARKING_COST_APPROVED'
          : 'STATION_HANDLING_COST_APPROVED',
      sourceType: 'STATION_COST',
      sourceId: stationCostId,
      productAccountingProfileId: null,
      accountingDate: dateOnly(approvedAt),
      transactionDate: approvedAt,
      documentDate: dateOnly(approvedAt),
      serviceDate: dateOnly(String(row.completed_at ?? row.flight_date)),
      amountMinor: num(row.approved_amount),
      currencyId: currencyCode === 'IDR' ? 'cur-idr' : null,
      currencyCode,
      exchangeRateToIdrMicros: 1_000_000,
      baseAmountIdr: num(row.approved_amount),
      stationId: String(row.station_id),
      aircraftId: str(row.aircraft_id),
      flightId: String(row.flight_id),
      workOrderReference: null,
      costCenterId: String(row.station_id),
      dimensions: { ROUTE: str(row.route_id) },
      payload: {
        stationCostId,
        sourceServiceId: String(row.source_service_id),
        financeHandoffId: String(row.handoff_id),
        serviceType,
        approvedSnapshot: JSON.parse(String(row.approval_snapshot_json ?? '{}')),
        financeHandoffSnapshot: JSON.parse(String(row.handoff_snapshot_json ?? '{}')),
        accountingCurrencySupported: currencyCode === 'IDR'
      },
      memo: `${serviceType === 'PARKING' ? 'Parking' : 'Handling'} cost approved by Finance`,
      idempotencyKey: `${
        serviceType === 'PARKING'
          ? 'STATION_PARKING_COST_APPROVED'
          : 'STATION_HANDLING_COST_APPROVED'
      }:STATION_COST:${stationCostId}`
    };
    const process = () =>
      this.createJournalFromSourceEvent(event, 'SYSTEM-STATION-COST-ACCOUNTING', false);
    const result = this.sqlite.inTransaction
      ? process()
      : this.sqlite.transaction(process).immediate();
    const chain = this.sqlite
      .prepare(
        `SELECT event.id AS accounting_event_id, journal.id AS journal_entry_id,
                journal.status AS journal_status
         FROM accounting_events event
         LEFT JOIN journal_entries journal ON journal.accounting_event_id = event.id
         WHERE event.event_type = ? AND event.source_type = ? AND event.source_id = ?`
      )
      .get(event.eventType, event.sourceType, event.sourceId) as SqlRow | undefined;
    return {
      ...result,
      accountingEventId: str(chain?.accounting_event_id),
      journalEntryId: str(chain?.journal_entry_id),
      journalStatus: str(chain?.journal_status)
    };
  }

  listExceptions(query: AccountingListQuery): AccountingExceptionDto[] {
    const params: unknown[] = [];
    let where = '';
    if (query.status) {
      where = 'WHERE status = ?';
      params.push(query.status);
    }
    return this.sqlite
      .prepare(
        `SELECT id, accounting_event_id AS accountingEventId, event_type AS eventType,
                source_type AS sourceType, source_id AS sourceId, reason_code AS reasonCode,
                message, status, created_at AS createdAt, updated_at AS updatedAt
         FROM accounting_exceptions ${where}
         ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
      )
      .all(...params, query.limit, query.offset) as AccountingExceptionDto[];
  }

  listJournalEntries(query: AccountingListQuery): JournalEntryDto[] {
    const params: unknown[] = [];
    let where = '';
    if (query.status) {
      where = 'WHERE status = ?';
      params.push(query.status);
    }
    return this.sqlite
      .prepare(
        `SELECT id, journal_number AS journalNumber, accounting_event_id AS accountingEventId,
                status, source_type AS sourceType, source_id AS sourceId,
                transaction_date AS transactionDate, posting_date AS postingDate,
                service_date AS serviceDate, currency_code AS currencyCode,
                policy_code AS policyCode, policy_version AS policyVersion,
                reversal_of_journal_entry_id AS reversalOfJournalEntryId, memo
         FROM journal_entries ${where}
         ORDER BY created_at DESC, journal_number DESC LIMIT ? OFFSET ?`
      )
      .all(...params, query.limit, query.offset) as JournalEntryDto[];
  }

  getJournalDetail(id: string) {
    return new AccountingJournalDetailReader(this.sqlite).get(id);
  }

  generalLedger(query: AccountingListQuery): GeneralLedgerLineDto[] {
    return this.sqlite
      .prepare(
        `SELECT journal_line_id AS journalLineId, journal_entry_id AS journalEntryId,
                journal_number AS journalNumber, posting_date AS postingDate,
                transaction_date AS transactionDate, service_date AS serviceDate,
                source_type AS sourceType, source_id AS sourceId, policy_code AS policyCode,
                period_code AS periodCode, account_code AS accountCode,
                account_name AS accountName, account_type AS accountType,
                debit_minor AS debitMinor, credit_minor AS creditMinor,
                station_id AS stationId, aircraft_id AS aircraftId, flight_id AS flightId,
                work_order_reference AS workOrderReference, cost_center_id AS costCenterId,
                description
         FROM general_ledger
         ORDER BY posting_date DESC, journal_number DESC, journal_line_id
         LIMIT ? OFFSET ?`
      )
      .all(query.limit, query.offset) as GeneralLedgerLineDto[];
  }

  submitJournal(id: string, actorUserId: string): JournalEntryDto {
    const current = this.getJournalRow(id);
    if (current.status !== 'DRAFT') {
      throw new DomainError(
        'ACCOUNTING_JOURNAL_STATE_INVALID',
        'Only draft journals can be submitted.',
        409
      );
    }
    const now = this.now();
    this.sqlite
      .prepare(
        "UPDATE journal_entries SET status = 'PENDING_APPROVAL', updated_at = ? WHERE id = ?"
      )
      .run(now, id);
    this.audit.record({
      actorId: actorUserId,
      action: 'JOURNAL_SUBMITTED',
      entityType: 'JOURNAL_ENTRY',
      entityId: id
    });
    return this.getJournalDto(id);
  }

  approveJournal(id: string, actorUserId: string): JournalEntryDto {
    const current = this.getJournalRow(id);
    if (current.status !== 'PENDING_APPROVAL') {
      throw new DomainError(
        'ACCOUNTING_JOURNAL_STATE_INVALID',
        'Only pending approval journals can be approved.',
        409
      );
    }
    if (current.created_by_user_id === actorUserId) {
      throw new DomainError(
        'ACCOUNTING_MAKER_CHECKER_VIOLATION',
        'Journal maker cannot approve the same journal.',
        403
      );
    }
    const now = this.now();
    this.sqlite
      .prepare(
        "UPDATE journal_entries SET status = 'APPROVED', approved_by_user_id = ?, updated_at = ? WHERE id = ?"
      )
      .run(actorUserId, now, id);
    this.audit.record({
      actorId: actorUserId,
      action: 'JOURNAL_APPROVED',
      entityType: 'JOURNAL_ENTRY',
      entityId: id
    });
    return this.getJournalDto(id);
  }

  postJournal(id: string, actorUserId: string): JournalEntryDto {
    const current = this.getJournalRow(id);
    if (current.status !== 'APPROVED') {
      throw new DomainError(
        'ACCOUNTING_JOURNAL_STATE_INVALID',
        'Only approved journals can be posted.',
        409
      );
    }
    const invalidAccount = this.sqlite
      .prepare(
        `SELECT account.account_code AS accountCode, account.account_name AS accountName,
                account.is_active AS isActive, account.is_postable AS isPostable
         FROM journal_lines line
         JOIN chart_of_accounts account ON account.id = line.account_id
         WHERE line.journal_entry_id = ?
           AND (account.is_active = 0 OR account.is_postable = 0)
         ORDER BY line.line_number
         LIMIT 1`
      )
      .get(id) as SqlRow | undefined;
    if (invalidAccount) {
      const inactive = Number(invalidAccount.isActive) === 0;
      throw new DomainError(
        inactive ? 'ACCOUNT_INACTIVE' : 'ACCOUNT_NOT_POSTABLE',
        `Account ${String(invalidAccount.accountCode)} (${String(invalidAccount.accountName)}) ${
          inactive ? 'is inactive' : 'does not allow posting'
        }.`,
        409
      );
    }
    const postingDate = dateOnly(this.now());
    const periodId = this.openPeriodId(postingDate);
    const now = this.now();
    const sourceEvent = this.sourceEventFromAccountingEvent(current.accounting_event_id);
    const post = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `UPDATE journal_entries
           SET period_id = ?, status = 'POSTED', posting_date = ?, posted_at = ?,
               posted_by_user_id = ?, updated_at = ?
           WHERE id = ? AND status = 'APPROVED'`
        )
        .run(periodId, postingDate, now, actorUserId, now, id);
      this.sqlite
        .prepare(
          "UPDATE accounting_events SET posting_status = 'POSTED', journal_entry_id = ?, updated_at = ? WHERE id = ?"
        )
        .run(id, now, current.accounting_event_id);
      const capitalizationAccountId = this.capitalizationAccountId(id);
      if (capitalizationAccountId) {
        this.createAssetRegister(id, sourceEvent, capitalizationAccountId);
      }
      if (sourceEvent.sourceType === 'STATION_COST' && sourceEvent.flightId) {
        this.sqlite
          .prepare(
            `INSERT INTO flight_operational_audit (
               id, actor_user_id, actor_role, flight_id, station_id, module, action,
               before_status, after_status, reason, request_id, metadata, timestamp, created_at
             ) VALUES (?, ?, 'Accounting Reviewer', ?, ?, 'ACCOUNTING', 'JOURNAL_POSTED',
               'APPROVED', 'POSTED', ?, ?, ?, ?, ?)`
          )
          .run(
            `audit-${nanoid(12)}`,
            actorUserId,
            sourceEvent.flightId,
            sourceEvent.stationId,
            'Accounting journal posted through maker-checker workflow.',
            sourceEvent.sourceId,
            JSON.stringify({
              stationCostId: sourceEvent.sourceId,
              accountingEventId: current.accounting_event_id,
              journalEntryId: id,
              amountMinor: sourceEvent.amountMinor,
              currencyCode: sourceEvent.currencyCode
            }),
            now,
            now
          );
      }
    });
    try {
      post.immediate();
    } catch (error) {
      this.recordException(
        current.accounting_event_id,
        this.sourceEventFromJournal(current),
        'UNBALANCED_JOURNAL',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
    this.audit.record({
      actorId: actorUserId,
      action: 'JOURNAL_POSTED',
      entityType: 'JOURNAL_ENTRY',
      entityId: id,
      sourceReference: current.accounting_event_id
    });
    return this.getJournalDto(id);
  }

  reverseJournal(id: string, input: ReverseJournalInput, actorUserId: string): JournalEntryDto {
    const original = this.getJournalRow(id);
    if (original.status !== 'POSTED') {
      throw new DomainError(
        'ACCOUNTING_JOURNAL_STATE_INVALID',
        'Only posted journals can be reversed.',
        409
      );
    }
    const existing = this.sqlite
      .prepare('SELECT id FROM journal_entries WHERE reversal_of_journal_entry_id = ? LIMIT 1')
      .get(id) as { id: string } | undefined;
    if (existing) {
      throw new DomainError(
        'ACCOUNTING_JOURNAL_ALREADY_REVERSED',
        'This journal already has a reversal journal.',
        409
      );
    }
    const now = this.now();
    const postingDate = input.postingDate ?? dateOnly(now);
    const originalPostingDate = dateOnly(original.posting_date ?? original.transaction_date);
    if (postingDate < originalPostingDate || postingDate > dateOnly(now)) {
      throw new DomainError(
        'REVERSAL_DATE_INVALID',
        `Reversal date must be between ${originalPostingDate} and ${dateOnly(now)}.`,
        422
      );
    }
    this.assertSourceReversalAllowed(original);
    const periodId = this.openPeriodId(postingDate);
    const reversalEventId = `acct-event-${nanoid(12)}`;
    const reversalJournalId = `journal-${nanoid(12)}`;
    const total = this.journalAmount(id);
    const baseTotal = this.journalBaseAmount(id);
    const reverse = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO accounting_events (
            id, event_number, event_type, source_type, source_id, idempotency_key,
            product_accounting_profile_id, policy_id, policy_code, policy_version,
            accounting_date, transaction_date, document_date, service_date, amount_minor,
            currency_code, exchange_rate_to_idr_micros, base_amount_idr, posting_status,
            payload_json, created_at, updated_at
          ) VALUES (?, ?, 'JOURNAL_REVERSAL', 'JOURNAL_ENTRY', ?, ?, NULL, NULL, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, 'POSTED', ?, ?, ?)`
        )
        .run(
          reversalEventId,
          this.nextNumber('AE', 'accounting_events'),
          id,
          `JOURNAL_REVERSAL:JOURNAL_ENTRY:${id}`,
          original.policy_code,
          original.policy_version,
          postingDate,
          now,
          postingDate,
          original.service_date,
          total,
          original.currency_code,
          original.exchange_rate_to_idr_micros,
          baseTotal,
          JSON.stringify({ reversedJournalEntryId: id, reason: input.reason }),
          now,
          now
        );
      this.sqlite
        .prepare(
          `INSERT INTO journal_entries (
            id, journal_number, accounting_event_id, period_id, status, source_type,
            source_id, transaction_date, document_date, posting_date, service_date,
            currency_code, exchange_rate_to_idr_micros, policy_code, policy_version,
            reversal_of_journal_entry_id, created_by_user_id, approved_by_user_id,
            posted_by_user_id, posted_at, memo, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'DRAFT', 'JOURNAL_ENTRY', ?, ?, ?, NULL, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, NULL, ?, ?, ?)`
        )
        .run(
          reversalJournalId,
          this.nextNumber('GJ', 'journal_entries'),
          reversalEventId,
          periodId,
          id,
          now,
          postingDate,
          original.service_date,
          original.currency_code,
          original.exchange_rate_to_idr_micros,
          original.policy_code,
          original.policy_version,
          id,
          actorUserId,
          actorUserId,
          actorUserId,
          `Reversal of ${original.journal_number}: ${input.reason}`,
          now,
          now
        );
      const lines = this.sqlite
        .prepare(
          `SELECT line_number, account_id, debit_minor, credit_minor, base_debit_idr,
                  base_credit_idr, station_id, aircraft_id, flight_id, work_order_reference,
                  cost_center_id, description
           FROM journal_lines WHERE journal_entry_id = ? ORDER BY line_number`
        )
        .all(id) as SqlRow[];
      for (const line of lines) {
        this.sqlite
          .prepare(
            `INSERT INTO journal_lines (
              id, journal_entry_id, line_number, account_id, debit_minor, credit_minor,
              base_debit_idr, base_credit_idr, station_id, aircraft_id, flight_id,
              work_order_reference, cost_center_id, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            `journal-line-${nanoid(12)}`,
            reversalJournalId,
            line.line_number,
            line.account_id,
            num(line.credit_minor),
            num(line.debit_minor),
            num(line.base_credit_idr),
            num(line.base_debit_idr),
            str(line.station_id),
            str(line.aircraft_id),
            str(line.flight_id),
            str(line.work_order_reference),
            str(line.cost_center_id),
            `Reversal: ${String(line.description)}`
          );
      }
      const postedAt = this.now();
      this.sqlite
        .prepare(
          `UPDATE journal_entries
           SET status = 'POSTED', posting_date = ?, posted_at = ?, posted_by_user_id = ?,
               approved_by_user_id = ?, updated_at = ?
           WHERE id = ? AND status = 'DRAFT'`
        )
        .run(postingDate, postedAt, actorUserId, actorUserId, postedAt, reversalJournalId);
      this.sqlite
        .prepare('UPDATE accounting_events SET journal_entry_id = ?, updated_at = ? WHERE id = ?')
        .run(reversalJournalId, postedAt, reversalEventId);
      this.sqlite
        .prepare(
          `UPDATE asset_register
           SET status = 'REVERSED', reversal_journal_entry_id = ?, updated_at = ?
           WHERE source_journal_entry_id = ?`
        )
        .run(reversalJournalId, postedAt, id);
      this.sqlite
        .prepare(
          `UPDATE depreciation_schedules
           SET status = 'CANCELLED'
           WHERE status = 'SCHEDULED'
             AND asset_id IN (
               SELECT asset.id FROM asset_register asset
               WHERE asset.source_journal_entry_id = ?
             )`
        )
        .run(id);
      this.reverseSettlementProjection(original, reversalJournalId, postingDate, postedAt);
    });
    reverse.immediate();
    this.audit.record({
      actorId: actorUserId,
      action: 'JOURNAL_REVERSED',
      entityType: 'JOURNAL_ENTRY',
      entityId: id,
      reason: input.reason,
      sourceReference: reversalJournalId,
      after: { reversalJournalId }
    });
    return this.getJournalDto(reversalJournalId);
  }

  private assertSourceReversalAllowed(original: JournalRow) {
    if (original.source_type === 'INVOICE') {
      const allocationCount = num(
        (
          this.sqlite
            .prepare(
              "SELECT COUNT(*) AS count FROM ar_allocations WHERE invoice_id = ? AND status = 'POSTED'"
            )
            .get(original.source_id) as SqlRow
        ).count
      );
      if (allocationCount > 0) {
        throw new DomainError(
          'INVOICE_REVERSAL_BLOCKED',
          'Reverse all posted receipt allocations before reversing invoice recognition.',
          409
        );
      }
      const activeRecognitionCount = num(
        (
          this.sqlite
            .prepare(
              `SELECT COUNT(*) AS count
        FROM journal_entries journal
        WHERE journal.source_type = 'INVOICE' AND journal.source_id = ? AND journal.status = 'POSTED'
          AND NOT EXISTS (SELECT 1 FROM journal_entries reversal
            WHERE reversal.reversal_of_journal_entry_id = journal.id AND reversal.status = 'POSTED')`
            )
            .get(original.source_id) as SqlRow
        ).count
      );
      if (activeRecognitionCount > 1) {
        throw new DomainError(
          'INVOICE_REVERSAL_REQUIRES_COMPLETE_SET',
          'This invoice has multiple recognition journals; use a controlled credit note or grouped correction.',
          409
        );
      }
    }
    if (original.source_type === 'SUPPLIER_INVOICE') {
      const paymentCount = num(
        (
          this.sqlite
            .prepare(
              `SELECT COUNT(*) AS count
        FROM supplier_payment_requests
        WHERE supplier_invoice_id = ? AND status = 'EXECUTED' AND reversal_journal_id IS NULL`
            )
            .get(original.source_id) as SqlRow
        ).count
      );
      if (paymentCount > 0) {
        throw new DomainError(
          'SUPPLIER_INVOICE_REVERSAL_BLOCKED',
          'Reverse all executed supplier payments before reversing invoice recognition.',
          409
        );
      }
    }
  }

  private reverseSettlementProjection(
    original: SqlRow,
    reversalJournalId: string,
    reversalDate: string,
    updatedAt: string
  ) {
    if (original.source_type === 'AR_ALLOCATION') {
      const allocation = this.sqlite
        .prepare(
          'SELECT receipt_id FROM ar_allocations WHERE id = ? AND journal_id = ? AND status = ?'
        )
        .get(original.source_id, original.id, 'POSTED') as { receipt_id: string } | undefined;
      if (!allocation) return;
      this.sqlite
        .prepare("UPDATE ar_allocations SET status = 'REVERSED', updated_at = ? WHERE id = ?")
        .run(updatedAt, original.source_id);
      const receipt = this.sqlite
        .prepare(
          `SELECT receipt.amount_minor,
        COALESCE(SUM(CASE WHEN allocation.status='POSTED' THEN allocation.amount_minor ELSE 0 END),0) allocated
        FROM customer_receipts receipt LEFT JOIN ar_allocations allocation ON allocation.receipt_id=receipt.id
        WHERE receipt.id=? GROUP BY receipt.id`
        )
        .get(allocation.receipt_id) as SqlRow;
      const allocated = num(receipt.allocated);
      const status =
        allocated <= 0
          ? 'UNALLOCATED'
          : allocated >= num(receipt.amount_minor)
            ? 'ALLOCATED'
            : 'PARTIALLY_ALLOCATED';
      this.sqlite
        .prepare(
          'UPDATE customer_receipts SET status = ?, error_code = NULL, error_message = NULL, updated_at = ? WHERE id = ?'
        )
        .run(status, updatedAt, allocation.receipt_id);
      return;
    }
    if (original.source_type === 'PAYMENT_REQUEST') {
      this.sqlite
        .prepare(
          `UPDATE supplier_payment_requests
        SET reversal_journal_id = ?, reversed_at = ?, updated_at = ?
        WHERE id = ? AND journal_id = ? AND status = 'EXECUTED' AND reversal_journal_id IS NULL`
        )
        .run(reversalJournalId, reversalDate, updatedAt, original.source_id, original.id);
      return;
    }
    if (original.source_type === 'INVOICE') {
      this.sqlite
        .prepare(
          "UPDATE invoices SET status = 'void', updated_at = ? WHERE id = ? AND recognition_mode = 'AR_ON_ISSUE'"
        )
        .run(updatedAt, original.source_id);
      return;
    }
    if (original.source_type === 'SUPPLIER_INVOICE') {
      this.sqlite
        .prepare(
          "UPDATE supplier_invoices SET lifecycle_status = 'VOID', updated_at = ? WHERE id = ? AND lifecycle_status = 'AP_OPEN'"
        )
        .run(updatedAt, original.source_id);
    }
  }

  private createJournalFromSourceEvent(
    event: SourceEvent,
    actorUserId: string,
    autoPost: boolean
  ): JournalCreateResult {
    const idempotencyKey =
      event.idempotencyKey ?? `${event.eventType}:${event.sourceType}:${event.sourceId}`;
    const existing = this.sqlite
      .prepare(
        `SELECT id, event_type, source_type, source_id,
      posting_status, journal_entry_id FROM accounting_events
      WHERE idempotency_key = ? OR (event_type = ? AND source_type = ? AND source_id = ?)
      ORDER BY CASE WHEN event_type = ? AND source_type = ? AND source_id = ? THEN 0 ELSE 1 END
      LIMIT 1`
      )
      .get(
        idempotencyKey,
        event.eventType,
        event.sourceType,
        event.sourceId,
        event.eventType,
        event.sourceType,
        event.sourceId
      ) as SqlRow | undefined;
    const retryEventId =
      existing &&
      existing.event_type === event.eventType &&
      existing.source_type === event.sourceType &&
      existing.source_id === event.sourceId &&
      existing.posting_status === 'EXCEPTION' &&
      !existing.journal_entry_id
        ? String(existing.id)
        : null;
    if (existing && !retryEventId) {
      return { eventCreated: false, journalPosted: false, skipped: true, duplicate: true };
    }
    const persistEvent = (policy: PolicyRow | null, status: 'DRAFT' | 'EXCEPTION') =>
      retryEventId
        ? this.updateAccountingEventForRetry(retryEventId, event, policy, status)
        : this.insertAccountingEvent(event, idempotencyKey, policy, status);
    const conditionProblem = this.validatePolicyConditions(event);
    if (conditionProblem) {
      const accountingEventId = persistEvent(null, 'EXCEPTION');
      this.recordException(
        accountingEventId,
        event,
        conditionProblem.reason,
        conditionProblem.message
      );
      return { eventCreated: true, journalPosted: false, skipped: true, exceptionCreated: true };
    }
    const policyResult = this.resolvePolicy(
      event.eventType,
      event.accountingDate,
      event.productAccountingProfileId,
      this.sourceModuleFor(event)
    );
    if (policyResult.reason) {
      const accountingEventId = persistEvent(null, 'EXCEPTION');
      this.recordException(accountingEventId, event, policyResult.reason, policyResult.message);
      return { eventCreated: true, journalPosted: false, skipped: true, exceptionCreated: true };
    }
    const policy = policyResult.policy!;
    const inventoryCreditConflict = this.inventoryCreditConflict(event);
    if (inventoryCreditConflict) {
      const accountingEventId = persistEvent(policy, 'EXCEPTION');
      this.recordException(
        accountingEventId,
        event,
        'MANUAL_REVIEW_REQUIRED',
        `Inventory cost ${inventoryCreditConflict.costKey} is already claimed by accounting event ${inventoryCreditConflict.accountingEventId}.`
      );
      return { eventCreated: true, journalPosted: false, skipped: true, exceptionCreated: true };
    }
    const missingDimension = this.missingRequiredDimension(policy, event);
    if (missingDimension) {
      const accountingEventId = persistEvent(policy, 'EXCEPTION');
      this.recordException(
        accountingEventId,
        event,
        'MISSING_CONTEXT',
        `Required accounting dimension ${missingDimension} is missing.`
      );
      return { eventCreated: true, journalPosted: false, skipped: true, exceptionCreated: true };
    }
    if (!this.accountsArePostable(policy.debit_account_id, policy.credit_account_id)) {
      const accountingEventId = persistEvent(policy, 'EXCEPTION');
      this.recordException(
        accountingEventId,
        event,
        'INVALID_ACCOUNT',
        'Policy references an inactive or non-postable account.'
      );
      return { eventCreated: true, journalPosted: false, skipped: true, exceptionCreated: true };
    }
    let periodId: string;
    try {
      periodId = this.openPeriodId(event.accountingDate);
    } catch (error) {
      const accountingEventId = persistEvent(policy, 'EXCEPTION');
      this.recordException(
        accountingEventId,
        event,
        'CLOSED_PERIOD',
        error instanceof Error ? error.message : String(error)
      );
      return { eventCreated: true, journalPosted: false, skipped: true, exceptionCreated: true };
    }
    const accountingEventId = persistEvent(policy, 'DRAFT');
    if (retryEventId) {
      this.sqlite
        .prepare(
          "UPDATE accounting_exceptions SET status = 'RESOLVED', updated_at = ? WHERE accounting_event_id = ? AND status = 'OPEN'"
        )
        .run(this.now(), accountingEventId);
    }
    const journalEntryId = this.insertDraftJournal(
      event,
      accountingEventId,
      periodId,
      policy,
      actorUserId
    );
    this.insertLine(journalEntryId, 1, policy.debit_account_id, event.amountMinor, 0, event);
    this.insertLine(journalEntryId, 2, policy.credit_account_id, 0, event.amountMinor, event);
    if (!autoPost) return { eventCreated: !retryEventId, journalPosted: false, skipped: false };
    const postedAt = this.now();
    try {
      this.sqlite
        .prepare(
          `UPDATE journal_entries
           SET status = 'POSTED', posting_date = ?, posted_at = ?, posted_by_user_id = ?,
               approved_by_user_id = ?, updated_at = ?
           WHERE id = ? AND status = 'DRAFT'`
        )
        .run(event.accountingDate, postedAt, actorUserId, actorUserId, postedAt, journalEntryId);
    } catch (error) {
      this.recordException(
        accountingEventId,
        event,
        'UNBALANCED_JOURNAL',
        error instanceof Error ? error.message : String(error)
      );
      return { eventCreated: true, journalPosted: false, skipped: true, exceptionCreated: true };
    }
    this.sqlite
      .prepare(
        `UPDATE accounting_events
         SET posting_status = 'POSTED', journal_entry_id = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(journalEntryId, postedAt, accountingEventId);
    if (policy.capitalization_candidate) {
      this.createAssetRegister(journalEntryId, event, policy.debit_account_id);
    }
    this.audit.record({
      actorId: actorUserId,
      action: 'JOURNAL_POSTED',
      entityType: 'JOURNAL_ENTRY',
      entityId: journalEntryId,
      sourceReference: accountingEventId,
      after: { eventType: event.eventType, sourceType: event.sourceType, sourceId: event.sourceId }
    });
    return { eventCreated: !retryEventId, journalPosted: true, skipped: false };
  }

  private updateAccountingEventForRetry(
    accountingEventId: string,
    event: SourceEvent,
    policy: PolicyRow | null,
    status: 'DRAFT' | 'EXCEPTION'
  ) {
    const updatedAt = this.now();
    this.sqlite
      .prepare(
        `UPDATE accounting_events SET
      product_accounting_profile_id = ?, policy_id = ?, policy_code = ?, policy_version = ?,
      accounting_date = ?, transaction_date = ?, document_date = ?, service_date = ?,
      amount_minor = ?, currency_id = ?, currency_code = ?, exchange_rate_to_idr_micros = ?,
      base_amount_idr = ?, posting_status = ?, journal_entry_id = NULL, station_id = ?,
      aircraft_id = ?, flight_id = ?, work_order_reference = ?, cost_center_id = ?,
      payload_json = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        event.productAccountingProfileId,
        policy?.id ?? null,
        policy?.policy_code ?? null,
        policy?.version ?? null,
        event.accountingDate,
        event.transactionDate,
        event.documentDate,
        event.serviceDate,
        event.amountMinor,
        event.currencyId,
        event.currencyCode,
        event.exchangeRateToIdrMicros,
        event.baseAmountIdr,
        status,
        event.stationId,
        event.aircraftId,
        event.flightId,
        event.workOrderReference,
        event.costCenterId,
        JSON.stringify({
          ...event.payload,
          accountingPolicySnapshot: policy
            ? {
                policyId: policy.id,
                policyCode: policy.policy_code,
                policyName: policy.policy_name,
                policyVersion: policy.version,
                treatment: policy.treatment,
                capitalizationCandidate: Boolean(policy.capitalization_candidate),
                debitAccountId: policy.debit_account_id,
                creditAccountId: policy.credit_account_id,
                priority: policy.priority,
                effectiveFrom: policy.effective_from,
                effectiveTo: policy.effective_to,
                approvalStatus: policy.approval_status
              }
            : null
        }),
        updatedAt,
        accountingEventId
      );
    this.sqlite
      .prepare(
        "DELETE FROM financial_dimension_values WHERE owner_type = 'ACCOUNTING_EVENT' AND owner_id = ?"
      )
      .run(accountingEventId);
    this.persistDimensions('ACCOUNTING_EVENT', accountingEventId, event);
    return accountingEventId;
  }

  private insertAccountingEvent(
    event: SourceEvent,
    idempotencyKey: string,
    policy: PolicyRow | null,
    status: 'DRAFT' | 'EXCEPTION'
  ) {
    const accountingEventId = `acct-event-${nanoid(12)}`;
    const createdAt = this.now();
    this.sqlite
      .prepare(
        `INSERT INTO accounting_events (
          id, event_number, event_type, source_type, source_id, idempotency_key,
          product_accounting_profile_id, policy_id, policy_code, policy_version,
          accounting_date, transaction_date, document_date, service_date, amount_minor,
          currency_id, currency_code, exchange_rate_to_idr_micros, base_amount_idr,
          posting_status, journal_entry_id, station_id, aircraft_id, flight_id,
          work_order_reference, cost_center_id, payload_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        accountingEventId,
        this.nextNumber('AE', 'accounting_events'),
        event.eventType,
        event.sourceType,
        event.sourceId,
        idempotencyKey,
        event.productAccountingProfileId,
        policy?.id ?? null,
        policy?.policy_code ?? null,
        policy?.version ?? null,
        event.accountingDate,
        event.transactionDate,
        event.documentDate,
        event.serviceDate,
        event.amountMinor,
        event.currencyId,
        event.currencyCode,
        event.exchangeRateToIdrMicros,
        event.baseAmountIdr,
        status,
        event.stationId,
        event.aircraftId,
        event.flightId,
        event.workOrderReference,
        event.costCenterId,
        JSON.stringify({
          ...event.payload,
          accountingPolicySnapshot: policy
            ? {
                policyId: policy.id,
                policyCode: policy.policy_code,
                policyName: policy.policy_name,
                policyVersion: policy.version,
                treatment: policy.treatment,
                capitalizationCandidate: Boolean(policy.capitalization_candidate),
                debitAccountId: policy.debit_account_id,
                creditAccountId: policy.credit_account_id,
                priority: policy.priority,
                effectiveFrom: policy.effective_from,
                effectiveTo: policy.effective_to,
                approvalStatus: policy.approval_status
              }
            : null
        }),
        createdAt,
        createdAt
      );
    this.persistDimensions('ACCOUNTING_EVENT', accountingEventId, event);
    return accountingEventId;
  }

  private insertDraftJournal(
    event: SourceEvent,
    accountingEventId: string,
    periodId: string,
    policy: PolicyRow,
    actorUserId: string
  ) {
    const journalEntryId = `journal-${nanoid(12)}`;
    const createdAt = this.now();
    this.sqlite
      .prepare(
        `INSERT INTO journal_entries (
          id, journal_number, accounting_event_id, period_id, status, source_type,
          source_id, transaction_date, document_date, posting_date, service_date,
          currency_code, exchange_rate_to_idr_micros, policy_code, policy_version,
          reversal_of_journal_entry_id, created_by_user_id, approved_by_user_id,
          posted_by_user_id, posted_at, memo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, NULL,
          ?, NULL, NULL, NULL, ?, ?, ?)`
      )
      .run(
        journalEntryId,
        this.nextNumber('GJ', 'journal_entries'),
        accountingEventId,
        periodId,
        event.sourceType,
        event.sourceId,
        event.transactionDate,
        event.documentDate,
        event.serviceDate,
        event.currencyCode,
        event.exchangeRateToIdrMicros,
        policy.policy_code,
        policy.version,
        actorUserId,
        event.memo,
        createdAt,
        createdAt
      );
    return journalEntryId;
  }

  private inventoryEvents(): SourceEvent[] {
    const rows = this.sqlite
      .prepare(
        `SELECT event.id
         FROM inventory_accounting_events event
         WHERE event.integration_status = 'PENDING_INTEGRATION'
         ORDER BY event.created_at, event.id`
      )
      .all() as SqlRow[];
    return rows
      .map((row) => this.inventoryOperationalEvent(String(row.id)))
      .filter((event): event is SourceEvent => Boolean(event));
  }

  private inventoryOperationalEvent(inventoryEventId: string): SourceEvent | null {
    const row = this.sqlite
      .prepare(
        `SELECT event.*, currency.currency_code
         FROM inventory_accounting_events event
         LEFT JOIN currencies currency ON currency.id = event.currency_id
         WHERE event.id = ?`
      )
      .get(inventoryEventId) as SqlRow | undefined;
    if (!row) return null;
    const payload = JSON.parse(String(row.payload_json)) as Record<string, unknown>;
    if (row.event_type === 'INVENTORY_RECEIPT') return this.goodsReceiptEvent(row, payload);
    if (row.event_type === 'INVENTORY_MAINTENANCE_ISSUE') {
      return this.maintenancePartIssuedEvent(row, payload);
    }
    if (row.event_type === 'INVENTORY_COMPONENT_INSTALL') {
      return this.componentReadyForUseEvent(row, payload);
    }
    return {
      eventType: String(row.event_type),
      sourceType: String(row.source_type),
      sourceId: String(row.source_id),
      productAccountingProfileId: 'pap-inventory-part',
      accountingDate: dateOnly(String(row.created_at)),
      transactionDate: String(row.created_at),
      documentDate: dateOnly(String(row.created_at)),
      serviceDate: dateOnly(String(row.created_at)),
      amountMinor: num(row.base_amount_idr),
      currencyId: str(row.currency_id) ?? 'cur-idr',
      currencyCode: str(row.currency_code) ?? 'IDR',
      exchangeRateToIdrMicros: num(row.exchange_rate_to_idr_micros) || 1_000_000,
      baseAmountIdr: num(row.base_amount_idr),
      stationId: str(row.station_id),
      aircraftId: str(row.aircraft_id),
      flightId: str(row.flight_id),
      workOrderReference: str(payload.maintenanceHandoffId),
      costCenterId: str(row.station_id),
      payload: { ...payload, inventoryEventId },
      memo: `${String(row.event_type)} from inventory movement ${String(row.movement_id)}`,
      idempotencyKey: `inventory:${inventoryEventId}:${String(row.event_type)}:unmapped`
    };
  }

  private goodsReceiptEvent(row: SqlRow, payload: Record<string, unknown>): SourceEvent | null {
    const receipt = this.sqlite
      .prepare(
        `SELECT receipt.*, warehouse.station_id, po.currency_id, currency.currency_code,
                po.exchange_rate_to_idr_micros,
                GROUP_CONCAT(DISTINCT pol.part_id) AS part_ids,
                SUM(line.quantity) AS quantity
         FROM inventory_goods_receipts receipt
         JOIN inventory_warehouses warehouse ON warehouse.id = receipt.warehouse_id
         JOIN inventory_purchase_orders po ON po.id = receipt.purchase_order_id
         JOIN currencies currency ON currency.id = po.currency_id
         JOIN inventory_goods_receipt_lines line ON line.goods_receipt_id = receipt.id
         JOIN inventory_purchase_order_lines pol ON pol.id = line.purchase_order_line_id
         WHERE receipt.id = ?
         GROUP BY receipt.id`
      )
      .get(row.source_id) as SqlRow | undefined;
    if (!receipt) return null;
    const amount = num(receipt.total_base_value_idr);
    return {
      eventType: 'INVENTORY_RECEIVED',
      sourceType: 'GOODS_RECEIPT',
      sourceId: String(receipt.id),
      productAccountingProfileId: 'pap-inventory-part',
      accountingDate: dateOnly(String(receipt.received_at)),
      transactionDate: String(receipt.received_at),
      documentDate: dateOnly(String(receipt.created_at)),
      serviceDate: null,
      amountMinor: amount,
      currencyId: str(receipt.currency_id) ?? str(row.currency_id),
      currencyCode: str(receipt.currency_code) ?? str(row.currency_code) ?? 'IDR',
      exchangeRateToIdrMicros: num(receipt.exchange_rate_to_idr_micros) || 1_000_000,
      baseAmountIdr: amount,
      stationId: str(receipt.station_id),
      aircraftId: null,
      flightId: null,
      workOrderReference: null,
      costCenterId: str(receipt.station_id),
      payload: {
        ...payload,
        inventoryEventId: row.id,
        goodsReceiptId: receipt.id,
        purchaseOrderId: receipt.purchase_order_id,
        inventoryPartIds: String(receipt.part_ids ?? '')
          .split(',')
          .filter(Boolean),
        accountingClass: 'INVENTORY',
        quantity: num(receipt.quantity),
        totalCostMinor: amount,
        warehouseId: receipt.warehouse_id,
        receivedAt: receipt.received_at
      },
      memo: `Goods receipt ${String(receipt.receipt_number)} received into aircraft spare inventory`,
      idempotencyKey: `inventory:${String(row.id)}:INVENTORY_RECEIVED:v1`
    };
  }

  private maintenancePartIssuedEvent(
    row: SqlRow,
    payload: Record<string, unknown>
  ): SourceEvent | null {
    const issue = this.sqlite
      .prepare(
        `SELECT issue.*, warehouse.station_id, handoff.work_order_reference,
                (SELECT GROUP_CONCAT(DISTINCT line.part_id)
                 FROM maintenance_part_issue_lines line
                 WHERE line.issue_id = issue.id) AS part_ids,
                (SELECT SUM(line.quantity)
                 FROM maintenance_part_issue_lines line
                 WHERE line.issue_id = issue.id) AS quantity,
                (SELECT SUM(line.base_value_idr)
                 FROM maintenance_part_issue_lines line
                 WHERE line.issue_id = issue.id) AS actual_cost,
                (SELECT GROUP_CONCAT(DISTINCT movement_line.id)
                 FROM inventory_movement_lines movement_line
                 WHERE movement_line.movement_id = issue.movement_id) AS movement_line_ids,
                (SELECT GROUP_CONCAT(DISTINCT movement_line.serial_id)
                 FROM inventory_movement_lines movement_line
                 WHERE movement_line.movement_id = issue.movement_id
                   AND movement_line.serial_id IS NOT NULL) AS serial_ids
         FROM maintenance_part_issues issue
         JOIN inventory_warehouses warehouse ON warehouse.id = issue.warehouse_id
         LEFT JOIN flight_maintenance_handoffs handoff ON handoff.id = issue.maintenance_handoff_id
         WHERE issue.id = ?
         LIMIT 1`
      )
      .get(row.source_id) as SqlRow | undefined;
    if (!issue) return null;
    const amount = num(issue.actual_cost) || num(issue.total_parts_value_idr);
    const maintenanceCategory =
      typeof payload.maintenanceCategory === 'string' ? payload.maintenanceCategory : null;
    return {
      eventType: 'MAINTENANCE_PART_ISSUED',
      sourceType: 'MAINTENANCE_PART_ISSUE',
      sourceId: String(issue.id),
      productAccountingProfileId: 'pap-inventory-part',
      accountingDate: dateOnly(String(issue.issued_at)),
      transactionDate: String(issue.issued_at),
      documentDate: dateOnly(String(issue.issued_at)),
      serviceDate: dateOnly(String(issue.issued_at)),
      amountMinor: amount,
      currencyId: str(row.currency_id) ?? 'cur-idr',
      currencyCode: str(row.currency_code) ?? 'IDR',
      exchangeRateToIdrMicros: num(row.exchange_rate_to_idr_micros) || 1_000_000,
      baseAmountIdr: amount,
      stationId: str(issue.station_id),
      aircraftId: str(issue.aircraft_id),
      flightId: str(issue.flight_id),
      workOrderReference: str(issue.work_order_reference) ?? str(issue.maintenance_handoff_id),
      costCenterId: str(issue.station_id),
      payload: {
        ...payload,
        inventoryEventId: row.id,
        maintenanceIssueId: issue.id,
        workOrderId: issue.maintenance_handoff_id,
        ...(maintenanceCategory ? { maintenanceCategory } : {}),
        inventoryPartIds: String(issue.part_ids ?? '')
          .split(',')
          .filter(Boolean),
        accountingClass: 'MAINTENANCE_EXPENSE',
        inventoryCostKeys: this.inventoryCostKeys(issue.serial_ids, issue.movement_line_ids),
        quantity: num(issue.quantity),
        actualCostMinor: amount,
        issuedAt: issue.issued_at
      },
      memo: `Maintenance issue ${String(issue.issue_number)} consumed FIFO aircraft spare parts`,
      idempotencyKey: `inventory:${String(row.id)}:MAINTENANCE_PART_ISSUED:v1`
    };
  }

  private componentReadyForUseEvent(
    row: SqlRow,
    payload: Record<string, unknown>
  ): SourceEvent | null {
    const install = this.sqlite
      .prepare(
        `SELECT install.*, serial.part_id, serial.serial_number, aircraft.current_station_id,
                part.part_name
         FROM inventory_component_installations install
         JOIN inventory_serialized_parts serial ON serial.id = install.serial_id
         JOIN inventory_parts part ON part.id = serial.part_id
         JOIN aircraft aircraft ON aircraft.id = install.aircraft_id
         WHERE install.serial_id = ?
         ORDER BY install.installed_at DESC
         LIMIT 1`
      )
      .get(row.source_id) as SqlRow | undefined;
    if (!install) return null;
    const amount = num(row.base_amount_idr);
    return {
      eventType: 'AIRCRAFT_COMPONENT_READY_FOR_USE',
      sourceType: 'COMPONENT_INSTALLATION',
      sourceId: String(install.id),
      productAccountingProfileId: 'pap-inventory-part',
      accountingDate: dateOnly(str(payload.readyForUseDate) ?? String(install.installed_at)),
      transactionDate: String(install.installed_at),
      documentDate: dateOnly(String(install.installed_at)),
      serviceDate: dateOnly(str(payload.readyForUseDate) ?? String(install.installed_at)),
      amountMinor: amount,
      currencyId: str(row.currency_id) ?? 'cur-idr',
      currencyCode: str(row.currency_code) ?? 'IDR',
      exchangeRateToIdrMicros: num(row.exchange_rate_to_idr_micros) || 1_000_000,
      baseAmountIdr: amount,
      stationId: str(row.station_id) ?? str(install.current_station_id),
      aircraftId: str(install.aircraft_id),
      flightId: str(row.flight_id),
      workOrderReference: str(payload.workOrderId),
      costCenterId: str(row.station_id) ?? str(install.current_station_id),
      payload: {
        ...payload,
        inventoryEventId: row.id,
        componentInstallationId: install.id,
        inventoryPartId: install.part_id,
        serializedComponentId: install.serial_id,
        serialId: install.serial_id,
        serialNumber: install.serial_number,
        inventoryCostKeys: [`SERIAL:${String(install.serial_id)}`],
        actualCostMinor: amount,
        readyForUseDate: str(payload.readyForUseDate) ?? dateOnly(String(install.installed_at)),
        description: install.part_name
      },
      memo: `Aircraft component ${String(install.serial_number)} ready for use`,
      idempotencyKey: `inventory:${String(row.id)}:AIRCRAFT_COMPONENT_READY_FOR_USE:v1`
    };
  }

  private ticketingEvents(): SourceEvent[] {
    const passengerRows = this.sqlite
      .prepare(
        `SELECT ticket.*, flight.origin_station_id, flight.aircraft_id, flight.route_id
         FROM passenger_tickets ticket
         JOIN flight_operations flight ON flight.id = ticket.flight_operation_id
         WHERE ticket.payment_status = 'PAID'
         ORDER BY ticket.paid_at, ticket.id`
      )
      .all() as SqlRow[];
    const cargoRows = this.sqlite
      .prepare(
        `SELECT booking.*, flight.origin_station_id, flight.aircraft_id, flight.route_id
         FROM cargo_bookings booking
         JOIN flight_operations flight ON flight.id = booking.flight_operation_id
         WHERE booking.payment_status = 'PAID'
         ORDER BY booking.paid_at, booking.id`
      )
      .all() as SqlRow[];
    const refundRows = this.sqlite
      .prepare(
        `SELECT refund.*, flight.origin_station_id, flight.aircraft_id, flight.route_id
         FROM ticketing_refund_requests refund
         JOIN flight_operations flight ON flight.id = refund.flight_operation_id
         WHERE refund.status = 'APPROVED'
         ORDER BY refund.decided_at, refund.id`
      )
      .all() as SqlRow[];
    return [
      ...passengerRows.map((row) =>
        this.ticketPaymentEvent(row, 'PASSENGER_TICKET', 'pap-passenger-ticket')
      ),
      ...cargoRows.map((row) => this.ticketPaymentEvent(row, 'CARGO_BOOKING', 'pap-cargo-booking')),
      ...refundRows.map((row) => ({
        eventType: 'TICKET_REFUND_APPROVED',
        sourceType: 'TICKETING_REFUND',
        sourceId: String(row.id),
        productAccountingProfileId:
          row.subject_type === 'CARGO' ? 'pap-cargo-booking' : 'pap-passenger-ticket',
        accountingDate: dateOnly(String(row.decided_at ?? row.updated_at)),
        transactionDate: String(row.decided_at ?? row.updated_at),
        documentDate: dateOnly(String(row.requested_at)),
        serviceDate: null,
        amountMinor: num(row.amount),
        currencyId: row.currency_code === 'IDR' ? 'cur-idr' : null,
        currencyCode: String(row.currency_code),
        exchangeRateToIdrMicros: 1_000_000,
        baseAmountIdr: num(row.amount),
        stationId: str(row.origin_station_id),
        aircraftId: str(row.aircraft_id),
        flightId: String(row.flight_operation_id),
        workOrderReference: null,
        costCenterId: str(row.origin_station_id),
        dimensions: { ROUTE: str(row.route_id) },
        payload: { subjectType: row.subject_type },
        memo: `Approved ${String(row.subject_type).toLowerCase()} ticket refund`
      }))
    ];
  }

  private flightEvents(): SourceEvent[] {
    const closedPassengerFlights = this.sqlite
      .prepare(
        `SELECT DISTINCT flight.id
         FROM flight_operations flight
         JOIN flight_operation_statuses status ON status.id = flight.current_status_id
         JOIN passenger_tickets ticket ON ticket.flight_operation_id = flight.id
         WHERE status.code = 'CLOSED'
         ORDER BY flight.actual_arrival_at, flight.id`
      )
      .all() as Array<{ id: string }>;
    const passengerRevenue = closedPassengerFlights.flatMap((flight) =>
      this.passengerServiceFulfillmentEvents(flight.id)
    );
    const cargoRevenue = this.flightRevenueRows('cargo_bookings', 'total_tariff', [
      "ticket.payment_status = 'PAID'",
      `NOT EXISTS (
        SELECT 1 FROM ticketing_refund_requests refund
        WHERE refund.cargo_booking_id = ticket.id AND refund.status = 'APPROVED'
      )`
    ]);
    const charterInvoices = this.sqlite
      .prepare(
        `SELECT invoice.*, flight.origin_station_id, flight.aircraft_id
         FROM invoices invoice
         JOIN flight_operations flight ON flight.id = invoice.flight_operation_id
         WHERE invoice.status IN ('issued', 'partially_paid', 'paid', 'overdue')
           AND invoice.subtotal > 0
         ORDER BY invoice.issued_at, invoice.id`
      )
      .all() as SqlRow[];
    return [
      ...passengerRevenue,
      ...cargoRevenue.map((row) => this.flightRevenueEvent(row, 'pap-cargo-booking')),
      ...charterInvoices.map((row) => ({
        eventType: 'CHARTER_INVOICE_ISSUED',
        sourceType: 'INVOICE',
        sourceId: String(row.id),
        productAccountingProfileId: 'pap-charter-invoice',
        accountingDate: dateOnly(String(row.issued_at ?? row.created_at)),
        transactionDate: String(row.issued_at ?? row.created_at),
        documentDate: dateOnly(String(row.issued_at ?? row.created_at)),
        serviceDate: dateOnly(String(row.issued_at ?? row.created_at)),
        amountMinor: num(row.subtotal),
        currencyId: row.currency === 'IDR' ? 'cur-idr' : null,
        currencyCode: String(row.currency),
        exchangeRateToIdrMicros: 1_000_000,
        baseAmountIdr: num(row.subtotal),
        stationId: str(row.origin_station_id),
        aircraftId: str(row.aircraft_id),
        flightId: String(row.flight_operation_id),
        workOrderReference: null,
        costCenterId: str(row.origin_station_id),
        payload: { invoiceNumber: row.invoice_number },
        memo: `Charter invoice ${String(row.invoice_number)} issued`
      }))
    ];
  }

  private ticketPaymentEvent(
    row: SqlRow,
    sourceType: 'PASSENGER_TICKET' | 'CARGO_BOOKING',
    profileId: string
  ): SourceEvent {
    return {
      eventType: 'TICKET_PAYMENT_RECEIVED',
      sourceType,
      sourceId: String(row.id),
      productAccountingProfileId: profileId,
      accountingDate: dateOnly(String(row.paid_at ?? row.created_at)),
      transactionDate: String(row.paid_at ?? row.created_at),
      documentDate: dateOnly(String(row.created_at)),
      serviceDate: null,
      amountMinor: num(row.total_amount),
      currencyId: row.currency_code === 'IDR' ? 'cur-idr' : null,
      currencyCode: String(row.currency_code),
      exchangeRateToIdrMicros: 1_000_000,
      baseAmountIdr: num(row.total_amount),
      stationId: str(row.origin_station_id),
      aircraftId: str(row.aircraft_id),
      flightId: String(row.flight_operation_id),
      workOrderReference: null,
      costCenterId: str(row.origin_station_id),
      dimensions: { ROUTE: str(row.route_id) },
      payload: { paymentMethod: row.payment_method },
      memo: `${sourceType.replace('_', ' ').toLowerCase()} payment received`
    };
  }

  private flightRevenueRows(table: string, amountColumn: string, predicates: string[]) {
    return this.sqlite
      .prepare(
        `SELECT flight.id AS flight_id, flight.actual_arrival_at, flight.flight_date,
                flight.origin_station_id, flight.aircraft_id, flight.currency_code,
                flight.route_id,
                SUM(ticket.${amountColumn}) AS amount
         FROM ${table} ticket
         JOIN flight_operations flight ON flight.id = ticket.flight_operation_id
         JOIN flight_operation_statuses status ON status.id = flight.current_status_id
         WHERE status.code = 'CLOSED' AND ${predicates.join(' AND ')}
         GROUP BY flight.id
         HAVING amount > 0
         ORDER BY flight.actual_arrival_at, flight.id`
      )
      .all() as SqlRow[];
  }

  private flightRevenueEvent(row: SqlRow, profileId: string): SourceEvent {
    const serviceDate = dateOnly(String(row.actual_arrival_at ?? row.flight_date));
    return {
      eventType: 'FLIGHT_COMPLETED_REVENUE',
      sourceType: profileId === 'pap-cargo-booking' ? 'FLIGHT_CARGO_REVENUE' : 'FLIGHT_PAX_REVENUE',
      sourceId: `${String(row.flight_id)}:${profileId}`,
      productAccountingProfileId: profileId,
      accountingDate: serviceDate,
      transactionDate: String(row.actual_arrival_at ?? `${String(row.flight_date)}T00:00:00.000Z`),
      documentDate: serviceDate,
      serviceDate,
      amountMinor: num(row.amount),
      currencyId: row.currency_code === 'IDR' ? 'cur-idr' : null,
      currencyCode: String(row.currency_code),
      exchangeRateToIdrMicros: 1_000_000,
      baseAmountIdr: num(row.amount),
      stationId: str(row.origin_station_id),
      aircraftId: str(row.aircraft_id),
      flightId: String(row.flight_id),
      workOrderReference: null,
      costCenterId: str(row.origin_station_id),
      dimensions: { ROUTE: str(row.route_id) },
      payload: { profileId },
      memo: `Recognize ${profileId === 'pap-cargo-booking' ? 'cargo' : 'passenger'} revenue at flight completion`
    };
  }

  private validatePolicyConditions(
    event: SourceEvent
  ): { reason: AccountingExceptionReason; message: string } | null {
    if (event.sourceType === 'STATION_COST' && event.payload.accountingCurrencySupported !== true) {
      return {
        reason: 'MANUAL_REVIEW_REQUIRED',
        message: `Station cost currency ${event.currencyCode} is not supported by the IDR demo accounting policy.`
      };
    }
    if (event.eventType === 'MAINTENANCE_PART_ISSUED') {
      const maintenanceCategory = str(event.payload.maintenanceCategory);
      if (!maintenanceCategory) {
        return {
          reason: 'MISSING_CONTEXT',
          message: 'Maintenance category is required before part issue accounting can be resolved.'
        };
      }
      if (!['ROUTINE', 'LINE_MAINTENANCE', 'MINOR_REPAIR'].includes(maintenanceCategory)) {
        return {
          reason: 'NO_MATCHING_POLICY',
          message: `No expense policy matches maintenance category ${maintenanceCategory}.`
        };
      }
    }

    if (event.eventType === 'AIRCRAFT_COMPONENT_READY_FOR_USE') {
      const required = [
        ['workOrderCategory', str(event.payload.workOrderCategory)],
        ['readyForUseDate', str(event.payload.readyForUseDate)],
        ['aircraftId', event.aircraftId],
        ['serialNumber', str(event.payload.serialNumber)]
      ] as const;
      const missing = required.find(([, value]) => !value)?.[0];
      if (missing) {
        return {
          reason: 'MISSING_CONTEXT',
          message: `Capitalization requires ${missing}.`
        };
      }
      if (
        !['HEAVY_MAINTENANCE', 'MAJOR_REPLACEMENT'].includes(
          String(event.payload.workOrderCategory)
        )
      ) {
        return {
          reason: 'NO_MATCHING_POLICY',
          message: 'Component installation does not meet heavy-maintenance capitalization category.'
        };
      }
      if (event.payload.capitalizationCandidate !== true) {
        return {
          reason: 'MISSING_CONTEXT',
          message: 'Component is not marked as a capitalization candidate.'
        };
      }
      if (num(event.payload.expectedBenefitMonths) <= 12) {
        return {
          reason: 'MISSING_CONTEXT',
          message: 'Expected benefit must be greater than 12 months.'
        };
      }
      if (String(event.payload.technicalAcceptanceStatus) !== 'APPROVED') {
        return { reason: 'MISSING_CONTEXT', message: 'Technical acceptance must be approved.' };
      }
      if (event.amountMinor < num(event.payload.capitalizationThresholdMinor)) {
        return {
          reason: 'NO_MATCHING_POLICY',
          message: 'Actual component cost is below the capitalization threshold.'
        };
      }
      if (
        event.payload.replacedComponentSerialId &&
        event.payload.replacedComponentCarryingAmountMinor === undefined
      ) {
        return {
          reason: 'MANUAL_REVIEW_REQUIRED',
          message:
            'Existing component carrying amount is missing; derecognition requires manual review.'
        };
      }
    }

    return null;
  }

  private resolvePolicy(
    eventType: string,
    accountingDate: string,
    profileId: string | null,
    sourceModule: string
  ) {
    const rows = this.sqlite
      .prepare(
        `SELECT * FROM accounting_policies
         WHERE event_type = ?
           AND (source_module IS NULL OR source_module = ?)
           AND approval_status = 'APPROVED'
           AND is_active = 1
           AND effective_from <= ?
           AND (effective_to IS NULL OR effective_to >= ?)
           AND (product_accounting_profile_id IS NULL OR product_accounting_profile_id IS ?)
         ORDER BY CASE WHEN source_module = ? THEN 0 ELSE 1 END,
                  priority ASC,
                  CASE WHEN product_accounting_profile_id IS ? THEN 0 ELSE 1 END,
                  version DESC, effective_from DESC`
      )
      .all(
        eventType,
        sourceModule,
        accountingDate,
        accountingDate,
        profileId,
        profileId,
        sourceModule
      ) as PolicyRow[];
    if (!rows.length) {
      return {
        policy: null,
        reason: 'NO_MATCHING_POLICY' as const,
        message: `No approved accounting policy matches ${eventType}.`
      };
    }
    const [first, second] = rows;
    if (
      second &&
      second.priority === first.priority &&
      second.product_accounting_profile_id === first.product_accounting_profile_id
    ) {
      return {
        policy: null,
        reason: 'AMBIGUOUS_POLICY' as const,
        message: `Multiple accounting policies match ${eventType} with priority ${first.priority}.`
      };
    }
    return { policy: first, reason: null, message: null };
  }

  private sourceModuleFor(event: SourceEvent) {
    if (
      [
        'INVENTORY_RECEIVED',
        'MAINTENANCE_PART_ISSUED',
        'AIRCRAFT_COMPONENT_READY_FOR_USE'
      ].includes(event.eventType)
    ) {
      return 'INVENTORY';
    }
    if (event.eventType.startsWith('STATION_') || event.eventType === 'FLIGHT_COMPLETED_REVENUE') {
      return 'FLIGHT_OPERATIONS';
    }
    if (
      ['TICKET_PAYMENT_RECEIVED', 'TICKET_REFUND_APPROVED', 'PASSENGER_SERVICE_FULFILLED'].includes(
        event.eventType
      )
    ) {
      return 'TICKETING';
    }
    return 'FINANCE';
  }

  private missingRequiredDimension(policy: PolicyRow, event: SourceEvent) {
    const row = this.sqlite
      .prepare('SELECT required_dimensions_json FROM accounting_policies WHERE id = ?')
      .get(policy.id) as { required_dimensions_json: string } | undefined;
    const dimensions = JSON.parse(row?.required_dimensions_json ?? '[]') as string[];
    const values: Record<string, string | null> = {
      stationId: event.stationId,
      aircraftId: event.aircraftId,
      flightId: event.flightId,
      workOrderReference: event.workOrderReference,
      costCenterId: event.costCenterId
    };
    return dimensions.find((dimension) => !values[dimension]);
  }

  private accountsArePostable(...accountIds: string[]) {
    const rows = this.sqlite
      .prepare(
        `SELECT id, account_code, is_active, is_postable
         FROM chart_of_accounts WHERE id IN (${accountIds.map(() => '?').join(', ')})`
      )
      .all(...accountIds) as AccountRow[];
    return accountIds.every((id) => {
      const account = rows.find((row) => row.id === id);
      return account?.is_active === 1 && account.is_postable === 1;
    });
  }

  private inventoryCostKeys(serialIds: unknown, movementLineIds: unknown) {
    const keys = [
      ...String(serialIds ?? '')
        .split(',')
        .filter(Boolean)
        .map((id) => `SERIAL:${id}`),
      ...String(movementLineIds ?? '')
        .split(',')
        .filter(Boolean)
        .map((id) => `MOVEMENT_LINE:${id}`)
    ];
    return [...new Set(keys)];
  }

  private inventoryCreditConflict(event: SourceEvent) {
    const costKeys = Array.isArray(event.payload.inventoryCostKeys)
      ? event.payload.inventoryCostKeys.filter((key): key is string => typeof key === 'string')
      : [];
    if (!costKeys.length) return null;
    return this.sqlite
      .prepare(
        `SELECT existing.id AS accountingEventId, cost.value AS costKey
         FROM accounting_events existing
         JOIN journal_entries journal ON journal.accounting_event_id = existing.id
         JOIN json_each(existing.payload_json, '$.inventoryCostKeys') cost
         WHERE cost.value IN (${costKeys.map(() => '?').join(', ')})
           AND journal.status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED')
           AND NOT EXISTS (
             SELECT 1 FROM journal_entries reversal
             WHERE reversal.reversal_of_journal_entry_id = journal.id
               AND reversal.status = 'POSTED'
           )
         ORDER BY existing.created_at, existing.id
         LIMIT 1`
      )
      .get(...costKeys) as { accountingEventId: string; costKey: string } | undefined;
  }

  private recordException(
    accountingEventId: string | null,
    event: SourceEvent,
    reasonCode: AccountingExceptionReason,
    message: string
  ) {
    const now = this.now();
    this.sqlite
      .prepare(
        `INSERT INTO accounting_exceptions (
          id, accounting_event_id, event_type, source_type, source_id, reason_code,
          message, context_snapshot_json, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
        ON CONFLICT(event_type, source_type, source_id, reason_code) DO UPDATE SET
          accounting_event_id = excluded.accounting_event_id,
          message = excluded.message,
          context_snapshot_json = excluded.context_snapshot_json,
          status = 'OPEN',
          updated_at = excluded.updated_at`
      )
      .run(
        `acct-exception-${nanoid(12)}`,
        accountingEventId,
        event.eventType,
        event.sourceType,
        event.sourceId,
        reasonCode,
        message,
        JSON.stringify(event),
        now,
        now
      );
  }

  private openPeriodId(accountingDate: string) {
    const period = this.sqlite
      .prepare(
        `SELECT id FROM accounting_periods
         WHERE start_date <= ? AND end_date >= ? AND status = 'OPEN'
         ORDER BY start_date DESC LIMIT 1`
      )
      .get(accountingDate, accountingDate) as { id: string } | undefined;
    if (!period) {
      throw new DomainError(
        'ACCOUNTING_PERIOD_NOT_OPEN',
        `No open accounting period covers ${accountingDate}.`,
        422
      );
    }
    return period.id;
  }

  private insertLine(
    journalEntryId: string,
    lineNumber: number,
    accountId: string,
    debitMinor: number,
    creditMinor: number,
    event: SourceEvent
  ) {
    const journalLineId = `journal-line-${nanoid(12)}`;
    this.sqlite
      .prepare(
        `INSERT INTO journal_lines (
          id, journal_entry_id, line_number, account_id, debit_minor, credit_minor,
          base_debit_idr, base_credit_idr, station_id, aircraft_id, flight_id,
          work_order_reference, cost_center_id, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        journalLineId,
        journalEntryId,
        lineNumber,
        accountId,
        debitMinor,
        creditMinor,
        debitMinor ? event.baseAmountIdr : 0,
        creditMinor ? event.baseAmountIdr : 0,
        event.stationId,
        event.aircraftId,
        event.flightId,
        event.workOrderReference,
        event.costCenterId,
        event.memo
      );
    this.persistDimensions('JOURNAL_LINE', journalLineId, event);
  }

  private persistDimensions(
    ownerType: 'ACCOUNTING_EVENT' | 'JOURNAL_LINE' | 'FINANCE_HANDOFF',
    ownerId: string,
    event: SourceEvent
  ) {
    const dimensions = {
      FLIGHT: event.flightId,
      AIRCRAFT: event.aircraftId,
      STATION: event.stationId,
      COST_CENTER: event.costCenterId,
      WORK_PACKAGE: event.workOrderReference,
      ...event.dimensions
    };
    const insert = this.sqlite.prepare(
      `INSERT OR REPLACE INTO financial_dimension_values (
        id, owner_type, owner_id, dimension_type, dimension_value, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const [dimensionType, dimensionValue] of Object.entries(dimensions)) {
      if (!dimensionValue) continue;
      insert.run(
        `dimension-${nanoid(12)}`,
        ownerType,
        ownerId,
        dimensionType,
        dimensionValue,
        this.now()
      );
    }
  }

  private createAssetRegister(journalEntryId: string, event: SourceEvent, assetAccountId: string) {
    if (
      this.sqlite
        .prepare('SELECT id FROM asset_register WHERE source_journal_entry_id = ? LIMIT 1')
        .get(journalEntryId)
    ) {
      return;
    }
    const assetId = `asset-${nanoid(12)}`;
    const createdAt = this.now();
    const usefulLifeMonths = Math.max(1, num(event.payload.expectedBenefitMonths) || 60);
    this.sqlite
      .prepare(
        `INSERT INTO asset_register (
          id, asset_number, source_journal_entry_id, source_type, source_id, asset_account_id,
          asset_name, aircraft_id, inventory_part_id, component_serial_id, serial_number,
          acquisition_date, ready_for_use_date, cost_minor, currency_code, useful_life_months,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`
      )
      .run(
        assetId,
        this.nextNumber('AST', 'asset_register'),
        journalEntryId,
        event.sourceType,
        event.sourceId,
        assetAccountId,
        str(event.payload.description) ?? event.memo,
        event.aircraftId,
        str(event.payload.inventoryPartId),
        str(event.payload.serializedComponentId) ?? str(event.payload.serialId),
        str(event.payload.serialNumber),
        event.accountingDate,
        str(event.payload.readyForUseDate) ?? event.accountingDate,
        event.amountMinor,
        event.currencyCode,
        usefulLifeMonths,
        createdAt,
        createdAt
      );
    this.createDepreciationPreview(
      assetId,
      event.amountMinor,
      usefulLifeMonths,
      event.accountingDate,
      createdAt
    );
  }

  private createDepreciationPreview(
    assetId: string,
    depreciableAmount: number,
    usefulLifeMonths: number,
    readyForUseDate: string,
    createdAt: string
  ) {
    let periods = this.sqlite
      .prepare(
        `SELECT id
         FROM accounting_periods
         WHERE end_date >= ?
         ORDER BY start_date
         LIMIT ?`
      )
      .all(readyForUseDate, usefulLifeMonths) as Array<{ id: string }>;
    if (periods.length < usefulLifeMonths) {
      const seedDate = new Date(`${dateOnly(readyForUseDate)}T00:00:00.000Z`);
      const insertPeriod = this.sqlite.prepare(
        `INSERT OR IGNORE INTO accounting_periods (
          id, period_code, period_name, start_date, end_date, status, locked_at,
          locked_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'OPEN', NULL, NULL, ?, ?)`
      );
      for (let index = periods.length; index < usefulLifeMonths; index += 1) {
        const start = new Date(
          Date.UTC(seedDate.getUTCFullYear(), seedDate.getUTCMonth() + index, 1)
        );
        const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
        const code = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
        insertPeriod.run(
          `period-${code}`,
          code,
          code,
          start.toISOString().slice(0, 10),
          end.toISOString().slice(0, 10),
          createdAt,
          createdAt
        );
      }
      periods = this.sqlite
        .prepare(
          `SELECT id
           FROM accounting_periods
           WHERE end_date >= ?
           ORDER BY start_date
           LIMIT ?`
        )
        .all(readyForUseDate, usefulLifeMonths) as Array<{ id: string }>;
    }
    const baseAmount = Math.floor(depreciableAmount / usefulLifeMonths);
    let allocated = 0;
    const insert = this.sqlite.prepare(
      `INSERT OR IGNORE INTO depreciation_schedules (
        id, asset_id, period_id, depreciation_amount_minor, status, journal_entry_id, created_at
      ) VALUES (?, ?, ?, ?, 'SCHEDULED', NULL, ?)`
    );
    periods.forEach((period, index) => {
      const isLast = index === periods.length - 1;
      const amount = isLast ? depreciableAmount - allocated : baseAmount;
      allocated += amount;
      insert.run(`depr-${nanoid(12)}`, assetId, period.id, amount, createdAt);
    });
  }

  private passengerTicketPaymentSourceEvent(ticketId: string): SourceEvent | null {
    const row = this.sqlite
      .prepare(
        `SELECT ticket.*, flight.origin_station_id, flight.aircraft_id
         FROM passenger_tickets ticket
         JOIN flight_operations flight ON flight.id = ticket.flight_operation_id
         WHERE ticket.id = ? AND ticket.payment_status = 'PAID'`
      )
      .get(ticketId) as SqlRow | undefined;
    return row ? this.ticketPaymentEvent(row, 'PASSENGER_TICKET', 'pap-passenger-ticket') : null;
  }

  private cargoBookingPaymentSourceEvent(bookingId: string): SourceEvent | null {
    const row = this.sqlite
      .prepare(
        `SELECT booking.*, flight.origin_station_id, flight.aircraft_id
         FROM cargo_bookings booking
         JOIN flight_operations flight ON flight.id = booking.flight_operation_id
         WHERE booking.id = ? AND booking.payment_status = 'PAID'`
      )
      .get(bookingId) as SqlRow | undefined;
    return row ? this.ticketPaymentEvent(row, 'CARGO_BOOKING', 'pap-cargo-booking') : null;
  }

  private ticketRefundSourceEvent(refundId: string): SourceEvent | null {
    const row = this.sqlite
      .prepare(
        `SELECT refund.*, flight.origin_station_id, flight.aircraft_id
         FROM ticketing_refund_requests refund
         JOIN flight_operations flight ON flight.id = refund.flight_operation_id
         WHERE refund.id = ? AND refund.status = 'APPROVED'`
      )
      .get(refundId) as SqlRow | undefined;
    if (!row) return null;
    return {
      eventType: 'TICKET_REFUND_APPROVED',
      sourceType: 'TICKETING_REFUND',
      sourceId: String(row.id),
      productAccountingProfileId:
        row.subject_type === 'CARGO' ? 'pap-cargo-booking' : 'pap-passenger-ticket',
      accountingDate: dateOnly(String(row.decided_at ?? row.updated_at)),
      transactionDate: String(row.decided_at ?? row.updated_at),
      documentDate: dateOnly(String(row.requested_at)),
      serviceDate: null,
      amountMinor: num(row.amount),
      currencyId: row.currency_code === 'IDR' ? 'cur-idr' : null,
      currencyCode: String(row.currency_code),
      exchangeRateToIdrMicros: 1_000_000,
      baseAmountIdr: num(row.amount),
      stationId: str(row.origin_station_id),
      aircraftId: str(row.aircraft_id),
      flightId: String(row.flight_operation_id),
      workOrderReference: null,
      costCenterId: str(row.origin_station_id),
      payload: {
        subjectType: row.subject_type,
        passengerTicketId: row.passenger_ticket_id,
        cargoBookingId: row.cargo_booking_id
      },
      memo: `Approved ${String(row.subject_type).toLowerCase()} ticket refund`
    };
  }

  private passengerServiceFulfillmentEvents(flightOperationId: string): SourceEvent[] {
    const rows = this.sqlite
      .prepare(
        `SELECT ticket.*, flight.origin_station_id, flight.aircraft_id,
                flight.actual_arrival_at, flight.flight_date
         FROM passenger_tickets ticket
         JOIN flight_operations flight ON flight.id = ticket.flight_operation_id
         JOIN flight_operation_statuses status ON status.id = flight.current_status_id
         WHERE flight.id = ?
           AND status.code = 'CLOSED'
           AND ticket.payment_status = 'PAID'
           AND ticket.ticket_status = 'ACTIVE'
           AND ticket.check_in_status = 'CHECKED_IN'
           AND NOT EXISTS (
             SELECT 1 FROM ticketing_refund_requests refund
             WHERE refund.passenger_ticket_id = ticket.id AND refund.status = 'APPROVED'
           )
         ORDER BY ticket.id`
      )
      .all(flightOperationId) as SqlRow[];
    return rows.map((row) => {
      const serviceDate = dateOnly(String(row.actual_arrival_at ?? row.flight_date));
      return {
        eventType: 'PASSENGER_SERVICE_FULFILLED',
        sourceType: 'PASSENGER_TICKET',
        sourceId: String(row.id),
        productAccountingProfileId: 'pap-passenger-ticket',
        accountingDate: serviceDate,
        transactionDate: String(
          row.actual_arrival_at ?? `${String(row.flight_date)}T00:00:00.000Z`
        ),
        documentDate: dateOnly(String(row.created_at)),
        serviceDate,
        amountMinor: num(row.total_amount),
        currencyId: row.currency_code === 'IDR' ? 'cur-idr' : null,
        currencyCode: String(row.currency_code),
        exchangeRateToIdrMicros: 1_000_000,
        baseAmountIdr: num(row.total_amount),
        stationId: str(row.origin_station_id),
        aircraftId: str(row.aircraft_id),
        flightId: String(row.flight_operation_id),
        workOrderReference: null,
        costCenterId: str(row.origin_station_id),
        payload: { checkInStatus: row.check_in_status },
        memo: `Passenger service fulfilled for ticket ${String(row.id)}`
      };
    });
  }

  private revenueRecognizedForRefund(refundId: string) {
    const row = this.sqlite
      .prepare(
        `SELECT 1
         FROM ticketing_refund_requests refund
         JOIN accounting_events event
           ON event.source_id = COALESCE(refund.passenger_ticket_id, refund.cargo_booking_id)
          AND event.posting_status = 'POSTED'
          AND event.event_type IN ('PASSENGER_SERVICE_FULFILLED', 'FLIGHT_COMPLETED_REVENUE')
         WHERE refund.id = ?
         LIMIT 1`
      )
      .get(refundId);
    return Boolean(row);
  }

  private getJournalRow(id: string): JournalRow {
    const row = this.sqlite.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as
      JournalRow | undefined;
    if (!row) throw notFoundJournal(id);
    return row;
  }

  private getJournalDto(id: string): JournalEntryDto {
    const row = this.sqlite
      .prepare(
        `SELECT id, journal_number AS journalNumber, accounting_event_id AS accountingEventId,
                status, source_type AS sourceType, source_id AS sourceId,
                transaction_date AS transactionDate, posting_date AS postingDate,
                service_date AS serviceDate, currency_code AS currencyCode,
                policy_code AS policyCode, policy_version AS policyVersion,
                reversal_of_journal_entry_id AS reversalOfJournalEntryId, memo
         FROM journal_entries WHERE id = ?`
      )
      .get(id) as JournalEntryDto | undefined;
    if (!row) throw notFoundJournal(id);
    return row;
  }

  private sourceEventFromJournal(journal: JournalRow): SourceEvent {
    return {
      eventType: 'JOURNAL_POSTING',
      sourceType: journal.source_type,
      sourceId: journal.source_id,
      productAccountingProfileId: null,
      accountingDate: dateOnly(journal.transaction_date),
      transactionDate: journal.transaction_date,
      documentDate: journal.document_date,
      serviceDate: journal.service_date,
      amountMinor: this.journalAmount(journal.id),
      currencyId: null,
      currencyCode: journal.currency_code,
      exchangeRateToIdrMicros: journal.exchange_rate_to_idr_micros,
      baseAmountIdr: this.journalBaseAmount(journal.id),
      stationId: null,
      aircraftId: null,
      flightId: null,
      workOrderReference: null,
      costCenterId: null,
      payload: { journalEntryId: journal.id },
      memo: journal.memo
    };
  }

  private sourceEventFromAccountingEvent(accountingEventId: string): SourceEvent {
    const row = this.sqlite
      .prepare('SELECT * FROM accounting_events WHERE id = ?')
      .get(accountingEventId) as SqlRow | undefined;
    if (!row)
      throw new DomainError('ACCOUNTING_EVENT_NOT_FOUND', 'Accounting event was not found.', 404);
    return {
      eventType: String(row.event_type),
      sourceType: String(row.source_type),
      sourceId: String(row.source_id),
      productAccountingProfileId: str(row.product_accounting_profile_id),
      accountingDate: String(row.accounting_date),
      transactionDate: String(row.transaction_date),
      documentDate: str(row.document_date),
      serviceDate: str(row.service_date),
      amountMinor: num(row.amount_minor),
      currencyId: str(row.currency_id),
      currencyCode: String(row.currency_code),
      exchangeRateToIdrMicros: num(row.exchange_rate_to_idr_micros),
      baseAmountIdr: num(row.base_amount_idr),
      stationId: str(row.station_id),
      aircraftId: str(row.aircraft_id),
      flightId: str(row.flight_id),
      workOrderReference: str(row.work_order_reference),
      costCenterId: str(row.cost_center_id),
      payload: JSON.parse(String(row.payload_json ?? '{}')) as Record<string, unknown>,
      memo: `${String(row.event_type)} ${String(row.source_id)}`
    };
  }

  private capitalizationAccountId(journalEntryId: string) {
    const row = this.sqlite
      .prepare(
        `SELECT event.payload_json AS payloadJson,
                line.account_id AS debitAccountId
         FROM journal_entries journal
         JOIN accounting_events event ON event.id = journal.accounting_event_id
         JOIN journal_lines line ON line.journal_entry_id = journal.id AND line.debit_minor > 0
         WHERE journal.id = ?`
      )
      .get(journalEntryId) as { payloadJson: string; debitAccountId: string } | undefined;
    if (!row) return null;
    const payload = JSON.parse(row.payloadJson) as {
      accountingPolicySnapshot?: { capitalizationCandidate?: boolean } | null;
    };
    return payload.accountingPolicySnapshot?.capitalizationCandidate ? row.debitAccountId : null;
  }

  private markInventoryEvent(id: string, status: string) {
    this.sqlite
      .prepare('UPDATE inventory_accounting_events SET integration_status = ? WHERE id = ?')
      .run(status, id);
  }

  private journalAmount(id: string) {
    const row = this.sqlite
      .prepare(
        'SELECT COALESCE(SUM(debit_minor), 0) AS amount FROM journal_lines WHERE journal_entry_id = ?'
      )
      .get(id) as { amount: number };
    return num(row.amount);
  }

  private journalBaseAmount(id: string) {
    const row = this.sqlite
      .prepare(
        'SELECT COALESCE(SUM(base_debit_idr), 0) AS amount FROM journal_lines WHERE journal_entry_id = ?'
      )
      .get(id) as { amount: number };
    return num(row.amount);
  }

  private existsByIdempotency(key: string) {
    return Boolean(
      this.sqlite.prepare('SELECT id FROM accounting_events WHERE idempotency_key = ?').get(key)
    );
  }

  private existsBySource(eventType: string, sourceType: string, sourceId: string) {
    return Boolean(
      this.sqlite
        .prepare(
          `SELECT id FROM accounting_events
           WHERE event_type = ? AND source_type = ? AND source_id = ?`
        )
        .get(eventType, sourceType, sourceId)
    );
  }

  private nextNumber(prefix: string, table: string) {
    const value = num(
      (this.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as SqlRow).count
    );
    return `${prefix}-${String(value + 1).padStart(6, '0')}`;
  }
}
