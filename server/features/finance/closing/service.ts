import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';
import type {
  FinanceAdjustmentDto,
  PeriodClosingRunDto,
  PeriodReopenRequestDto
} from '../../../../shared/features/finance/closing';
import { DomainError } from '../../../utils/errors';
import type { AccountingService, CanonicalAccountingInput } from '../accounting/service';
import { FinanceAuditService } from '../audit/service';

type SqlRow = Record<string, unknown>;
const num = (value: unknown) => Number(value ?? 0);
const str = (value: unknown) => (value === null || value === undefined ? null : String(value));

const checklist = [
  ['AR_REVIEWED', 'Accounts receivable reviewed'],
  ['AP_REVIEWED', 'Accounts payable reviewed'],
  ['BANK_RECONCILIATION', 'Bank reconciliation completed'],
  ['ACCOUNTING_EXCEPTIONS', 'Accounting exceptions reviewed'],
  ['UNPOSTED_JOURNALS', 'Unposted journals reviewed'],
  ['HANDOFF_EXCEPTIONS', 'Finance handoff exceptions reviewed'],
  ['ACCRUAL_REVIEWED', 'Accruals reviewed'],
  ['PREPAYMENT_REVIEWED', 'Prepayments reviewed'],
  ['DEPRECIATION_POSTED', 'Depreciation posted'],
  ['TRIAL_BALANCE_BALANCED', 'Trial Balance balanced']
] as const;

export class FinanceClosingService {
  private readonly audit: FinanceAuditService;

  constructor(
    private readonly sqlite: Database.Database,
    private readonly accounting: AccountingService,
    private readonly now: () => string
  ) {
    this.audit = new FinanceAuditService(sqlite, now);
  }

  createAccrual(input: {
    accountingDate: string;
    amountMinor: number;
    currencyCode: string;
    description: string;
    evidenceReference: string | null;
    stationId: string | null;
    flightId: string | null;
    aircraftId?: string | null;
    costCenterId: string | null;
    createdBy: string;
  }) {
    return this.createAdjustment('ACCRUAL', {
      accountingDate: input.accountingDate,
      amountMinor: input.amountMinor,
      currencyCode: input.currencyCode,
      description: input.description,
      evidenceReference: input.evidenceReference,
      cashBankAccountId: null,
      stationId: input.stationId,
      flightId: input.flightId,
      aircraftId: input.aircraftId ?? null,
      costCenterId: input.costCenterId,
      createdBy: input.createdBy
    });
  }

  createPrepayment(input: {
    paymentDate: string;
    amountMinor: number;
    currencyCode: string;
    description: string;
    cashBankAccountId: string;
    recognitionStartDate: string;
    recognitionPeriods: number;
    evidenceReference: string | null;
    costCenterId: string | null;
    createdBy: string;
  }) {
    if (
      !Number.isInteger(input.recognitionPeriods) ||
      input.recognitionPeriods < 1 ||
      input.recognitionPeriods > 120
    ) {
      throw new DomainError(
        'PREPAYMENT_SCHEDULE_INVALID',
        'Recognition periods must be between 1 and 120.',
        422
      );
    }
    const create = () => {
      const adjustment = this.createAdjustment('PREPAYMENT', {
        accountingDate: input.paymentDate,
        amountMinor: input.amountMinor,
        currencyCode: input.currencyCode,
        description: input.description,
        evidenceReference: input.evidenceReference,
        cashBankAccountId: input.cashBankAccountId,
        stationId: null,
        flightId: null,
        aircraftId: null,
        costCenterId: input.costCenterId,
        createdBy: input.createdBy
      });
      let allocated = 0;
      const base = Math.floor(input.amountMinor / input.recognitionPeriods);
      const start = new Date(`${input.recognitionStartDate}T00:00:00.000Z`);
      for (let index = 0; index < input.recognitionPeriods; index += 1) {
        const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
        const recognitionDate =
          index === 0 ? input.recognitionStartDate : date.toISOString().slice(0, 10);
        const period = this.periodForDate(recognitionDate);
        const lineAmount =
          index === input.recognitionPeriods - 1 ? input.amountMinor - allocated : base;
        allocated += lineAmount;
        this.sqlite
          .prepare(
            `INSERT INTO prepayment_schedules (
          id, adjustment_id, period_id, recognition_date, amount_minor, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?)`
          )
          .run(
            `prepayment-schedule-${nanoid(12)}`,
            adjustment.id,
            period.id,
            recognitionDate,
            lineAmount,
            this.now()
          );
      }
      return this.getPrepayment(adjustment.id);
    };
    return this.sqlite.inTransaction ? create() : this.sqlite.transaction(create).immediate();
  }

  postAccrual(id: string, actorId: string) {
    return this.postAdjustment(id, 'ACCRUAL_POSTED', actorId);
  }

  postPrepayment(id: string, actorId: string) {
    return this.postAdjustment(id, 'PREPAYMENT_POSTED', actorId);
  }

  reverseAccrual(id: string, input: { reason: string; actorId: string; postingDate?: string }) {
    const row = this.adjustmentRow(id);
    if (row.adjustment_type !== 'ACCRUAL')
      throw new DomainError(
        'ADJUSTMENT_TYPE_INVALID',
        'Only accruals can use accrual reversal.',
        409
      );
    if (row.status === 'REVERSED' || row.reversal_journal_id)
      throw new DomainError('ACCRUAL_ALREADY_REVERSED', 'Accrual is already reversed.', 409);
    if (row.status !== 'POSTED' || !row.journal_id)
      throw new DomainError('ACCRUAL_NOT_POSTED', 'Only posted accruals can be reversed.', 409);
    const journal = this.accounting.reverseJournal(
      String(row.journal_id),
      {
        reason: input.reason,
        postingDate: input.postingDate
      },
      input.actorId
    );
    this.sqlite
      .prepare(
        "UPDATE finance_adjustments SET status = 'REVERSED', reversal_journal_id = ?, updated_at = ? WHERE id = ?"
      )
      .run(journal.id, this.now(), id);
    this.audit.record({
      actorId: input.actorId,
      action: 'ACCRUAL_REVERSED',
      entityType: 'FINANCE_ADJUSTMENT',
      entityId: id,
      reason: input.reason,
      sourceReference: journal.id
    });
    return { ...this.getAdjustment(id), reversalJournalId: journal.id };
  }

  recognizePrepayment(scheduleId: string, actorId: string) {
    const process = () => {
      const row = this.sqlite
        .prepare(
          `SELECT schedule.*, adjustment.description, adjustment.currency_code,
        adjustment.cost_center_id, adjustment.id AS adjustment_id
        FROM prepayment_schedules schedule JOIN finance_adjustments adjustment ON adjustment.id = schedule.adjustment_id
        WHERE schedule.id = ?`
        )
        .get(scheduleId) as SqlRow | undefined;
      if (!row)
        throw new DomainError(
          'PREPAYMENT_SCHEDULE_NOT_FOUND',
          'Prepayment schedule was not found.',
          404
        );
      if (row.status === 'POSTED') return this.scheduleDto(row);
      if (!['SCHEDULED', 'EXCEPTION'].includes(String(row.status)))
        throw new DomainError(
          'PREPAYMENT_SCHEDULE_STATE_INVALID',
          'Prepayment schedule is not available for recognition.',
          409
        );
      this.sqlite
        .prepare(
          "UPDATE prepayment_schedules SET status = 'PROCESSING', error_code = NULL, error_message = NULL WHERE id = ?"
        )
        .run(scheduleId);
      const result = this.accounting.postCanonicalEvent(
        this.event({
          eventType: 'PREPAYMENT_RECOGNIZED',
          sourceType: 'PREPAYMENT_SCHEDULE',
          sourceId: scheduleId,
          date: String(row.recognition_date),
          amountMinor: num(row.amount_minor),
          currencyCode: String(row.currency_code),
          stationId: null,
          flightId: null,
          aircraftId: null,
          costCenterId: str(row.cost_center_id),
          payload: { adjustmentId: row.adjustment_id },
          memo: `Prepayment recognition: ${String(row.description)}`
        }),
        actorId
      );
      if (result.journalStatus !== 'POSTED' || !result.journalEntryId) {
        this.sqlite
          .prepare(
            "UPDATE prepayment_schedules SET status = 'EXCEPTION', accounting_event_id = ?, error_code = ?, error_message = ? WHERE id = ?"
          )
          .run(result.accountingEventId, result.exceptionCode, result.exceptionMessage, scheduleId);
        return this.scheduleDto(this.scheduleRow(scheduleId));
      }
      const timestamp = this.now();
      this.sqlite
        .prepare(
          `UPDATE prepayment_schedules SET status = 'POSTED', accounting_event_id = ?,
        journal_id = ?, recognized_by = ?, recognized_at = ?, error_code = NULL, error_message = NULL WHERE id = ?`
        )
        .run(result.accountingEventId, result.journalEntryId, actorId, timestamp, scheduleId);
      const remaining = num(
        (
          this.sqlite
            .prepare(
              "SELECT COUNT(*) AS count FROM prepayment_schedules WHERE adjustment_id = ? AND status <> 'POSTED'"
            )
            .get(row.adjustment_id) as SqlRow
        ).count
      );
      this.sqlite
        .prepare('UPDATE finance_adjustments SET status = ?, updated_at = ? WHERE id = ?')
        .run(remaining === 0 ? 'RECOGNIZED' : 'PARTIALLY_RECOGNIZED', timestamp, row.adjustment_id);
      this.audit.record({
        actorId,
        action: 'PREPAYMENT_RECOGNIZED',
        entityType: 'PREPAYMENT_SCHEDULE',
        entityId: scheduleId,
        sourceReference: result.journalEntryId
      });
      return this.scheduleDto(this.scheduleRow(scheduleId));
    };
    return this.sqlite.inTransaction ? process() : this.sqlite.transaction(process).immediate();
  }

  runDepreciation(periodCode: string, actorId: string) {
    const process = () => {
      const period = this.periodByCode(periodCode);
      if (period.status !== 'OPEN')
        throw new DomainError(
          'ACCOUNTING_PERIOD_NOT_OPEN',
          'Depreciation can only run in an open period.',
          409
        );
      const runId = `depreciation-run-${nanoid(12)}`;
      const startedAt = this.now();
      this.sqlite
        .prepare(
          `INSERT INTO depreciation_runs (id, period_id, status, run_by, started_at)
        VALUES (?, ?, 'PROCESSING', ?, ?)`
        )
        .run(runId, period.id, actorId, startedAt);
      const rows = this.sqlite
        .prepare(
          `SELECT schedule.*, asset.asset_number, asset.asset_name,
        asset.aircraft_id, asset.source_id AS asset_source_id
        FROM depreciation_schedules schedule JOIN asset_register asset ON asset.id = schedule.asset_id
        WHERE schedule.period_id = ? AND schedule.status IN ('SCHEDULED', 'POSTED')
        ORDER BY asset.asset_number`
        )
        .all(period.id) as SqlRow[];
      let posted = 0;
      let skipped = 0;
      let exceptions = 0;
      for (const row of rows) {
        if (row.status === 'POSTED') {
          skipped += 1;
          continue;
        }
        const result = this.accounting.postCanonicalEvent(
          this.event({
            eventType: 'DEPRECIATION_POSTED',
            sourceType: 'DEPRECIATION_SCHEDULE',
            sourceId: String(row.id),
            date: String(period.end_date),
            amountMinor: num(row.depreciation_amount_minor),
            currencyCode: 'IDR',
            stationId: null,
            flightId: null,
            aircraftId: str(row.aircraft_id),
            costCenterId: null,
            payload: {
              assetId: row.asset_id,
              assetNumber: row.asset_number,
              assetSourceId: row.asset_source_id
            },
            memo: `Depreciation ${String(row.asset_number)} - ${periodCode}`
          }),
          actorId
        );
        if (result.journalStatus === 'POSTED' && result.journalEntryId) {
          this.sqlite
            .prepare(
              "UPDATE depreciation_schedules SET status = 'POSTED', journal_entry_id = ? WHERE id = ?"
            )
            .run(result.journalEntryId, row.id);
          posted += 1;
        } else {
          exceptions += 1;
        }
      }
      const completedAt = this.now();
      this.sqlite
        .prepare(
          `UPDATE depreciation_runs SET status = ?, posted_count = ?, skipped_count = ?,
        exception_count = ?, completed_at = ? WHERE id = ?`
        )
        .run(
          exceptions ? 'COMPLETED_WITH_EXCEPTIONS' : 'COMPLETED',
          posted,
          skipped,
          exceptions,
          completedAt,
          runId
        );
      this.audit.record({
        actorId,
        action: 'DEPRECIATION_RUN_COMPLETED',
        entityType: 'DEPRECIATION_RUN',
        entityId: runId,
        sourceReference: periodCode,
        after: { posted, skipped, exceptions }
      });
      return { id: runId, periodCode, posted, skipped, exceptions };
    };
    return this.sqlite.inTransaction ? process() : this.sqlite.transaction(process).immediate();
  }

  startClosing(periodCode: string, actorId: string): PeriodClosingRunDto {
    const start = () => {
      const period = this.periodByCode(periodCode);
      if (period.status === 'CLOSED' || period.status === 'LOCKED')
        throw new DomainError('ACCOUNTING_PERIOD_CLOSED', 'The period is already closed.', 409);
      const existing = this.sqlite
        .prepare(
          "SELECT id FROM period_closing_runs WHERE period_id = ? AND status = 'IN_PROGRESS' LIMIT 1"
        )
        .get(period.id) as { id: string } | undefined;
      if (existing) return this.getClosingRun(existing.id);
      const id = `closing-run-${nanoid(12)}`;
      const timestamp = this.now();
      this.sqlite
        .prepare(
          `INSERT INTO period_closing_runs (
        id, period_id, status, started_by, started_at, created_at, updated_at
      ) VALUES (?, ?, 'IN_PROGRESS', ?, ?, ?, ?)`
        )
        .run(id, period.id, actorId, timestamp, timestamp, timestamp);
      this.sqlite
        .prepare("UPDATE accounting_periods SET status = 'CLOSING', updated_at = ? WHERE id = ?")
        .run(timestamp, period.id);
      const insert = this.sqlite.prepare(`INSERT INTO period_closing_checklist_items (
        id, closing_run_id, item_code, item_label, status, blocker, source_reference,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const [code, label] of checklist) {
        const blocker = this.computedBlocker(code, period);
        insert.run(
          `closing-item-${nanoid(12)}`,
          id,
          code,
          label,
          blocker ? 'BLOCKED' : 'PENDING',
          blocker,
          periodCode,
          timestamp,
          timestamp
        );
      }
      this.audit.record({
        actorId,
        action: 'PERIOD_CLOSING_STARTED',
        entityType: 'ACCOUNTING_PERIOD',
        entityId: String(period.id),
        sourceReference: id
      });
      return this.getClosingRun(id);
    };
    return this.sqlite.inTransaction ? start() : this.sqlite.transaction(start).immediate();
  }

  reviewChecklistItem(
    runId: string,
    code: string,
    input: { status: 'CLEARED' | 'BLOCKED'; note: string; actorId: string }
  ) {
    const run = this.runRow(runId);
    if (run.status !== 'IN_PROGRESS')
      throw new DomainError('CLOSING_RUN_NOT_ACTIVE', 'Closing run is no longer active.', 409);
    const item = this.sqlite
      .prepare(
        'SELECT id FROM period_closing_checklist_items WHERE closing_run_id = ? AND item_code = ?'
      )
      .get(runId, code) as { id: string } | undefined;
    if (!item)
      throw new DomainError('CLOSING_ITEM_NOT_FOUND', 'Closing checklist item was not found.', 404);
    if (input.status === 'CLEARED') {
      const period = this.sqlite
        .prepare('SELECT * FROM accounting_periods WHERE id = ?')
        .get(run.period_id) as SqlRow;
      const blocker = this.computedBlocker(code, period);
      if (blocker) {
        this.sqlite
          .prepare(
            `UPDATE period_closing_checklist_items SET status = 'BLOCKED', blocker = ?,
          note = ?, checked_by = ?, checked_at = ?, updated_at = ? WHERE id = ?`
          )
          .run(blocker, input.note, input.actorId, this.now(), this.now(), item.id);
        throw new DomainError(
          'CLOSING_ITEM_STILL_BLOCKED',
          `Checklist item is still blocked: ${blocker}`,
          409
        );
      }
    }
    const timestamp = this.now();
    this.sqlite
      .prepare(
        `UPDATE period_closing_checklist_items SET status = ?, blocker = ?, note = ?,
      checked_by = ?, checked_at = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        input.status,
        input.status === 'BLOCKED' ? input.note : null,
        input.note,
        input.actorId,
        timestamp,
        timestamp,
        item.id
      );
    this.audit.record({
      actorId: input.actorId,
      action: 'CLOSING_CHECKLIST_REVIEWED',
      entityType: 'PERIOD_CLOSING_ITEM',
      entityId: item.id,
      reason: input.note,
      after: { status: input.status }
    });
    return this.getClosingRun(runId);
  }

  closePeriod(runId: string, actorId: string): PeriodClosingRunDto {
    const close = () => {
      const run = this.runRow(runId);
      if (run.status === 'CLOSED') return this.getClosingRun(runId);
      const period = this.sqlite
        .prepare('SELECT * FROM accounting_periods WHERE id = ?')
        .get(run.period_id) as SqlRow;
      const items = this.sqlite
        .prepare(
          'SELECT id, item_code FROM period_closing_checklist_items WHERE closing_run_id = ?'
        )
        .all(runId) as SqlRow[];
      for (const item of items) {
        const blocker = this.computedBlocker(String(item.item_code), period);
        if (blocker) {
          this.sqlite
            .prepare(
              "UPDATE period_closing_checklist_items SET status = 'BLOCKED', blocker = ?, updated_at = ? WHERE id = ?"
            )
            .run(blocker, this.now(), item.id);
        }
      }
      const outstanding = num(
        (
          this.sqlite
            .prepare(
              "SELECT COUNT(*) AS count FROM period_closing_checklist_items WHERE closing_run_id = ? AND status <> 'CLEARED'"
            )
            .get(runId) as SqlRow
        ).count
      );
      if (outstanding)
        throw new DomainError(
          'PERIOD_CLOSING_BLOCKED',
          'Closing checklist still has pending items or blockers.',
          409
        );
      const timestamp = this.now();
      this.sqlite
        .prepare(
          "UPDATE accounting_periods SET status = 'CLOSED', locked_at = ?, locked_by_user_id = ?, updated_at = ? WHERE id = ?"
        )
        .run(timestamp, actorId, timestamp, run.period_id);
      this.sqlite
        .prepare(
          "UPDATE period_closing_runs SET status = 'CLOSED', closed_by = ?, closed_at = ?, updated_at = ? WHERE id = ?"
        )
        .run(actorId, timestamp, timestamp, runId);
      this.audit.record({
        actorId,
        action: 'PERIOD_CLOSED',
        entityType: 'ACCOUNTING_PERIOD',
        entityId: String(run.period_id),
        sourceReference: runId
      });
      return this.getClosingRun(runId);
    };
    return this.sqlite.inTransaction ? close() : this.sqlite.transaction(close).immediate();
  }

  requestReopen(periodCode: string, input: { reason: string; requesterId: string }) {
    const period = this.periodByCode(periodCode);
    if (!['CLOSED', 'LOCKED'].includes(String(period.status)))
      throw new DomainError('PERIOD_NOT_CLOSED', 'Only a closed period can be reopened.', 409);
    const existing = this.sqlite
      .prepare(
        "SELECT id FROM period_reopen_requests WHERE period_id = ? AND status = 'REQUESTED' ORDER BY requested_at DESC LIMIT 1"
      )
      .get(period.id) as { id: string } | undefined;
    if (existing) return { id: existing.id, periodCode, status: 'REQUESTED' };
    const id = `period-reopen-${nanoid(12)}`;
    const timestamp = this.now();
    this.sqlite
      .prepare(
        `INSERT INTO period_reopen_requests (
      id, period_id, reason, status, requester_id, requested_at
    ) VALUES (?, ?, ?, 'REQUESTED', ?, ?)`
      )
      .run(id, period.id, input.reason, input.requesterId, timestamp);
    this.audit.record({
      actorId: input.requesterId,
      action: 'PERIOD_REOPEN_REQUESTED',
      entityType: 'ACCOUNTING_PERIOD',
      entityId: String(period.id),
      reason: input.reason,
      sourceReference: id
    });
    return { id, periodCode, status: 'REQUESTED' };
  }

  listReopenRequests(periodCode?: string): PeriodReopenRequestDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT request.*, period.period_code, period.status AS period_status
      FROM period_reopen_requests request
      JOIN accounting_periods period ON period.id = request.period_id
      WHERE (? IS NULL OR period.period_code = ?)
      ORDER BY request.requested_at DESC, request.id DESC`
      )
      .all(periodCode ?? null, periodCode ?? null) as SqlRow[];
    return rows.map((row) => ({
      id: String(row.id),
      periodCode: String(row.period_code),
      periodStatus: String(row.period_status),
      reason: String(row.reason),
      status: String(row.status) as PeriodReopenRequestDto['status'],
      requesterId: String(row.requester_id),
      requestedAt: String(row.requested_at),
      approverId: str(row.approver_id),
      approvedAt: str(row.approved_at),
      reopenedAt: str(row.reopened_at)
    }));
  }

  approveReopen(id: string, input: { approverId: string; approverRole: string }) {
    const row = this.sqlite
      .prepare(
        `SELECT request.*, period.period_code, period.status AS period_status FROM period_reopen_requests request
      JOIN accounting_periods period ON period.id = request.period_id WHERE request.id = ?`
      )
      .get(id) as SqlRow | undefined;
    if (!row)
      throw new DomainError(
        'REOPEN_REQUEST_NOT_FOUND',
        'Period reopen request was not found.',
        404
      );
    if (row.status === 'APPROVED')
      return { id, periodCode: row.period_code, status: 'APPROVED', periodStatus: 'OPEN' };
    if (row.status !== 'REQUESTED')
      throw new DomainError(
        'REOPEN_REQUEST_STATE_INVALID',
        'Reopen request is no longer pending approval.',
        409
      );
    if (!['CLOSED', 'LOCKED'].includes(String(row.period_status)))
      throw new DomainError(
        'PERIOD_NOT_CLOSED',
        'The period is no longer closed and cannot be reopened by this request.',
        409
      );
    if (row.requester_id === input.approverId)
      throw new DomainError(
        'REOPEN_SELF_APPROVAL_FORBIDDEN',
        'Maker cannot approve their own request.',
        403
      );
    if (!['Demo Admin', 'Director', 'Finance Director'].includes(input.approverRole))
      throw new DomainError(
        'REOPEN_APPROVER_UNAUTHORIZED',
        'Approver is not authorized to reopen an accounting period.',
        403
      );
    const timestamp = this.now();
    const approve = () => {
      this.sqlite
        .prepare(
          "UPDATE period_reopen_requests SET status = 'APPROVED', approver_id = ?, approved_at = ?, reopened_at = ? WHERE id = ?"
        )
        .run(input.approverId, timestamp, timestamp, id);
      this.sqlite
        .prepare(
          "UPDATE accounting_periods SET status = 'OPEN', locked_at = NULL, locked_by_user_id = NULL, updated_at = ? WHERE id = ?"
        )
        .run(timestamp, row.period_id);
      this.audit.record({
        actorId: input.approverId,
        actorRole: input.approverRole,
        action: 'PERIOD_REOPENED',
        entityType: 'ACCOUNTING_PERIOD',
        entityId: String(row.period_id),
        reason: String(row.reason),
        sourceReference: id
      });
    };
    if (this.sqlite.inTransaction) approve();
    else this.sqlite.transaction(approve).immediate();
    return { id, periodCode: String(row.period_code), status: 'APPROVED', periodStatus: 'OPEN' };
  }

  getClosingRun(id: string): PeriodClosingRunDto {
    const row = this.sqlite
      .prepare(
        `SELECT run.*, period.period_code, period.status AS period_status
      FROM period_closing_runs run JOIN accounting_periods period ON period.id = run.period_id WHERE run.id = ?`
      )
      .get(id) as SqlRow | undefined;
    if (!row) throw new DomainError('CLOSING_RUN_NOT_FOUND', 'Closing run was not found.', 404);
    const items = this.sqlite
      .prepare(
        'SELECT * FROM period_closing_checklist_items WHERE closing_run_id = ? ORDER BY rowid'
      )
      .all(id) as SqlRow[];
    return {
      id: String(row.id),
      periodCode: String(row.period_code),
      periodStatus: String(row.period_status),
      status: String(row.status),
      startedBy: String(row.started_by),
      startedAt: String(row.started_at),
      closedBy: str(row.closed_by),
      closedAt: str(row.closed_at),
      items: items.map((item) => ({
        code: String(item.item_code),
        label: String(item.item_label),
        status: String(item.status) as 'PENDING' | 'CLEARED' | 'BLOCKED',
        blocker: str(item.blocker),
        sourceReference: str(item.source_reference),
        note: str(item.note),
        checkedBy: str(item.checked_by),
        checkedAt: str(item.checked_at)
      }))
    };
  }

  listClosingRuns(): PeriodClosingRunDto[] {
    return (
      this.sqlite
        .prepare('SELECT id FROM period_closing_runs ORDER BY started_at DESC LIMIT 100')
        .all() as Array<{ id: string }>
    ).map((row) => this.getClosingRun(row.id));
  }

  listAdjustments(): FinanceAdjustmentDto[] {
    return (
      this.sqlite
        .prepare(
          'SELECT id FROM finance_adjustments ORDER BY accounting_date DESC, created_at DESC LIMIT 200'
        )
        .all() as Array<{ id: string }>
    ).map((row) => this.getAdjustment(row.id));
  }

  getPrepayment(id: string) {
    return this.getAdjustment(id);
  }

  getAdjustment(id: string): FinanceAdjustmentDto {
    const row = this.adjustmentRow(id);
    const schedule = this.sqlite
      .prepare(
        'SELECT * FROM prepayment_schedules WHERE adjustment_id = ? ORDER BY recognition_date'
      )
      .all(id) as SqlRow[];
    return {
      id: String(row.id),
      number: String(row.adjustment_number),
      type: String(row.adjustment_type) as 'ACCRUAL' | 'PREPAYMENT',
      accountingDate: String(row.accounting_date),
      amountMinor: num(row.amount_minor),
      currencyCode: String(row.currency_code),
      description: String(row.description),
      status: String(row.status),
      journalId: str(row.journal_id),
      reversalJournalId: str(row.reversal_journal_id),
      recognizedMinor: schedule
        .filter((line) => line.status === 'POSTED')
        .reduce((sum, line) => sum + num(line.amount_minor), 0),
      schedule: schedule.map((line) => this.scheduleDto(line))
    };
  }

  private createAdjustment(
    type: 'ACCRUAL' | 'PREPAYMENT',
    input: {
      accountingDate: string;
      amountMinor: number;
      currencyCode: string;
      description: string;
      evidenceReference: string | null;
      cashBankAccountId: string | null;
      stationId: string | null;
      flightId: string | null;
      aircraftId: string | null;
      costCenterId: string | null;
      createdBy: string;
    }
  ) {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0)
      throw new DomainError(
        'INVALID_FINANCIAL_AMOUNT',
        'Adjustment amount must be a positive integer.',
        422
      );
    if (type === 'PREPAYMENT') {
      const account = this.sqlite
        .prepare('SELECT id, currency_code FROM cash_bank_accounts WHERE id = ? AND is_active = 1')
        .get(input.cashBankAccountId) as SqlRow | undefined;
      if (!account || account.currency_code !== input.currencyCode)
        throw new DomainError(
          'CASH_BANK_ACCOUNT_INVALID',
          'Prepayment cash/bank account is unavailable or uses another currency.',
          422
        );
    }
    const id = `finance-adjustment-${nanoid(12)}`;
    const timestamp = this.now();
    this.sqlite
      .prepare(
        `INSERT INTO finance_adjustments (
      id, adjustment_number, adjustment_type, accounting_date, amount_minor, currency_code,
      description, evidence_reference, cash_bank_account_id, station_id, flight_id, aircraft_id,
      cost_center_id, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`
      )
      .run(
        id,
        this.nextNumber(type === 'ACCRUAL' ? 'ACR' : 'PPM'),
        type,
        input.accountingDate,
        input.amountMinor,
        input.currencyCode,
        input.description,
        input.evidenceReference,
        input.cashBankAccountId,
        input.stationId,
        input.flightId,
        input.aircraftId,
        input.costCenterId,
        input.createdBy,
        timestamp,
        timestamp
      );
    this.audit.record({
      actorId: input.createdBy,
      action: `${type}_CREATED`,
      entityType: 'FINANCE_ADJUSTMENT',
      entityId: id,
      sourceReference: input.evidenceReference
    });
    return this.getAdjustment(id);
  }

  private postAdjustment(id: string, eventType: string, actorId: string) {
    const post = () => {
      const row = this.adjustmentRow(id);
      if (
        row.status === 'POSTED' ||
        row.status === 'PARTIALLY_RECOGNIZED' ||
        row.status === 'RECOGNIZED'
      )
        return this.getAdjustment(id);
      if (row.status !== 'DRAFT' && row.status !== 'EXCEPTION')
        throw new DomainError(
          'ADJUSTMENT_STATE_INVALID',
          'Adjustment is not available for posting.',
          409
        );
      this.sqlite
        .prepare(
          "UPDATE finance_adjustments SET status = 'PROCESSING', updated_at = ? WHERE id = ?"
        )
        .run(this.now(), id);
      const result = this.accounting.postCanonicalEvent(
        this.event({
          eventType,
          sourceType: 'FINANCE_ADJUSTMENT',
          sourceId: id,
          date: String(row.accounting_date),
          amountMinor: num(row.amount_minor),
          currencyCode: String(row.currency_code),
          stationId: str(row.station_id),
          flightId: str(row.flight_id),
          aircraftId: str(row.aircraft_id),
          costCenterId: str(row.cost_center_id),
          payload: {
            evidenceReference: row.evidence_reference,
            cashBankAccountId: row.cash_bank_account_id
          },
          memo: String(row.description)
        }),
        actorId
      );
      if (result.journalStatus !== 'POSTED' || !result.journalEntryId) {
        this.sqlite
          .prepare(
            "UPDATE finance_adjustments SET status = 'EXCEPTION', accounting_event_id = ?, error_code = ?, error_message = ?, updated_at = ? WHERE id = ?"
          )
          .run(
            result.accountingEventId,
            result.exceptionCode,
            result.exceptionMessage,
            this.now(),
            id
          );
        return this.getAdjustment(id);
      }
      this.sqlite
        .prepare(
          "UPDATE finance_adjustments SET status = 'POSTED', accounting_event_id = ?, journal_id = ?, error_code = NULL, error_message = NULL, updated_at = ? WHERE id = ?"
        )
        .run(result.accountingEventId, result.journalEntryId, this.now(), id);
      this.audit.record({
        actorId,
        action: `${String(row.adjustment_type)}_POSTED`,
        entityType: 'FINANCE_ADJUSTMENT',
        entityId: id,
        sourceReference: result.journalEntryId
      });
      return this.getAdjustment(id);
    };
    return this.sqlite.inTransaction ? post() : this.sqlite.transaction(post).immediate();
  }

  private event(input: {
    eventType: string;
    sourceType: string;
    sourceId: string;
    date: string;
    amountMinor: number;
    currencyCode: string;
    stationId: string | null;
    flightId: string | null;
    aircraftId: string | null;
    costCenterId: string | null;
    payload: Record<string, unknown>;
    memo: string;
  }): CanonicalAccountingInput {
    const rate = 1_000_000;
    return {
      eventType: input.eventType,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      productAccountingProfileId: null,
      accountingDate: input.date,
      transactionDate: input.date,
      documentDate: null,
      serviceDate: null,
      amountMinor: input.amountMinor,
      currencyId: input.currencyCode === 'IDR' ? 'cur-idr' : null,
      currencyCode: input.currencyCode,
      exchangeRateToIdrMicros: rate,
      baseAmountIdr: input.amountMinor,
      stationId: input.stationId,
      aircraftId: input.aircraftId,
      flightId: input.flightId,
      workOrderReference: null,
      costCenterId: input.costCenterId,
      payload: input.payload,
      memo: input.memo,
      idempotencyKey: `${input.eventType}:${input.sourceType}:${input.sourceId}`
    };
  }

  private computedBlocker(code: string, period: SqlRow) {
    if (code === 'BANK_RECONCILIATION') {
      const count = num(
        (
          this.sqlite
            .prepare(
              `SELECT COUNT(*) AS count FROM cash_bank_accounts account
        WHERE account.is_active = 1 AND account.account_type = 'BANK' AND NOT EXISTS (
          SELECT 1 FROM bank_statements statement
          WHERE statement.cash_bank_account_id = account.id AND statement.status = 'RECONCILED'
            AND statement.period_start <= ? AND statement.period_end >= ?
        )`
            )
            .get(period.start_date, period.end_date) as SqlRow
        ).count
      );
      return count
        ? `${count} active bank account(s) lack full-period reconciled statement coverage.`
        : null;
    }
    if (code === 'ACCOUNTING_EXCEPTIONS') {
      const count = num(
        (
          this.sqlite
            .prepare(
              `SELECT COUNT(*) AS count
        FROM accounting_exceptions exception
        JOIN accounting_events event ON event.id = exception.accounting_event_id
        WHERE exception.status = 'OPEN' AND event.accounting_date BETWEEN ? AND ?`
            )
            .get(period.start_date, period.end_date) as SqlRow
        ).count
      );
      return count ? `${count} accounting exception(s) remain open.` : null;
    }
    if (code === 'UNPOSTED_JOURNALS') {
      const count = num(
        (
          this.sqlite
            .prepare(
              "SELECT COUNT(*) AS count FROM journal_entries WHERE period_id = ? AND status <> 'POSTED' AND status <> 'REVERSED'"
            )
            .get(period.id) as SqlRow
        ).count
      );
      return count ? `${count} unposted journal(s) remain.` : null;
    }
    if (code === 'HANDOFF_EXCEPTIONS') {
      const count = num(
        (
          this.sqlite
            .prepare(
              "SELECT COUNT(*) AS count FROM finance_handoffs WHERE status = 'EXCEPTION' AND transaction_date BETWEEN ? AND ?"
            )
            .get(period.start_date, `${String(period.end_date)}T23:59:59.999Z`) as SqlRow
        ).count
      );
      return count ? `${count} finance handoff exception(s) remain.` : null;
    }
    if (code === 'TRIAL_BALANCE_BALANCED') {
      const row = this.sqlite
        .prepare(
          `SELECT COALESCE(SUM(line.debit_minor), 0) AS debit, COALESCE(SUM(line.credit_minor), 0) AS credit
        FROM journal_lines line JOIN journal_entries journal ON journal.id = line.journal_entry_id
        WHERE journal.status = 'POSTED' AND journal.period_id = ?`
        )
        .get(period.id) as SqlRow;
      return num(row.debit) === num(row.credit) ? null : 'Trial Balance is not balanced.';
    }
    return null;
  }

  private adjustmentRow(id: string) {
    const row = this.sqlite.prepare('SELECT * FROM finance_adjustments WHERE id = ?').get(id) as
      SqlRow | undefined;
    if (!row)
      throw new DomainError(
        'FINANCE_ADJUSTMENT_NOT_FOUND',
        'Finance adjustment was not found.',
        404
      );
    return row;
  }
  private scheduleRow(id: string) {
    return this.sqlite.prepare('SELECT * FROM prepayment_schedules WHERE id = ?').get(id) as SqlRow;
  }
  private scheduleDto(row: SqlRow) {
    return {
      id: String(row.id),
      recognitionDate: String(row.recognition_date),
      amountMinor: num(row.amount_minor),
      status: String(row.status),
      journalId: str(row.journal_id)
    };
  }
  private runRow(id: string) {
    const row = this.sqlite.prepare('SELECT * FROM period_closing_runs WHERE id = ?').get(id) as
      SqlRow | undefined;
    if (!row) throw new DomainError('CLOSING_RUN_NOT_FOUND', 'Closing run was not found.', 404);
    return row;
  }
  private periodByCode(code: string) {
    const row = this.sqlite
      .prepare('SELECT * FROM accounting_periods WHERE period_code = ?')
      .get(code) as SqlRow | undefined;
    if (!row)
      throw new DomainError('ACCOUNTING_PERIOD_NOT_FOUND', 'Accounting period was not found.', 404);
    return row;
  }
  private periodForDate(date: string) {
    const row = this.sqlite
      .prepare(
        'SELECT * FROM accounting_periods WHERE start_date <= ? AND end_date >= ? ORDER BY start_date DESC LIMIT 1'
      )
      .get(date, date) as SqlRow | undefined;
    if (!row)
      throw new DomainError(
        'ACCOUNTING_PERIOD_NOT_FOUND',
        `No accounting period covers ${date}.`,
        422
      );
    return row;
  }
  private nextNumber(prefix: string) {
    const count =
      num(
        (this.sqlite.prepare('SELECT COUNT(*) AS count FROM finance_adjustments').get() as SqlRow)
          .count
      ) + 1;
    return `${prefix}-${String(count).padStart(6, '0')}`;
  }
}
