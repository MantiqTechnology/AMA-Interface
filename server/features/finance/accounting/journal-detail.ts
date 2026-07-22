import type Database from 'better-sqlite3';
import {
  accountingJournalDetailSchema,
  type AccountingJournalDetail,
  type ActorReference,
  type DimensionReference,
  type JournalAuditEvent,
  type JournalEvidenceItem,
  type MatchedPolicyCondition
} from '../../../../shared/features/finance/accounting';
import { demoRoleActorIds } from '../../../../shared/types/roles';
import { DomainError } from '../../../utils/errors';

type Row = Record<string, unknown>;
type PolicySnapshot = {
  policyId?: string;
  policyCode?: string;
  policyName?: string;
  policyVersion?: number;
  treatment?: string;
  capitalizationCandidate?: boolean;
  debitAccountId?: string;
  creditAccountId?: string;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  approvalStatus?: string;
};

const actorLabels = new Map(
  Object.entries(demoRoleActorIds).map(([role, id]) => [
    id,
    role === 'Demo Admin' ? 'AMA Demo Administrator' : role
  ])
);

const eventLabels: Record<string, string> = {
  INVENTORY_RECEIVED: 'Aircraft parts received into inventory',
  MAINTENANCE_PART_ISSUED: 'Maintenance parts issued',
  AIRCRAFT_COMPONENT_READY_FOR_USE: 'Aircraft component ready for use',
  TICKET_PAYMENT_RECEIVED: 'Ticket payment received',
  PASSENGER_SERVICE_FULFILLED: 'Passenger service fulfilled',
  CARGO_SERVICE_FULFILLED: 'Cargo service fulfilled',
  TICKET_REFUND_APPROVED: 'Ticket refund approved',
  JOURNAL_REVERSAL: 'Journal reversal posted'
};

const text = (value: unknown) =>
  value === null || value === undefined || value === '' ? null : String(value);
const number = (value: unknown) => Number(value ?? 0);
const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

function parsePayload(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(String(value ?? '{}')) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function actor(id: unknown): ActorReference | null {
  const actorId = text(id);
  if (!actorId) return null;
  return { id: actorId, label: actorLabels.get(actorId) ?? actorId };
}

function dimension(
  id: unknown,
  label: unknown,
  technicalValue: unknown = id,
  route: string | null = null
): DimensionReference | null {
  const referenceId = text(id);
  if (!referenceId) return null;
  return {
    id: referenceId,
    label: text(label) ?? referenceId,
    technicalValue: text(technicalValue),
    route
  };
}

function condition(
  id: string,
  label: string,
  field: string,
  operator: string,
  expected: string,
  actualValue: unknown,
  matches: (value: unknown) => boolean,
  format: (value: unknown) => string = (value) => String(value)
): MatchedPolicyCondition {
  const actual = text(actualValue);
  return {
    id,
    label,
    field,
    operator,
    expected,
    actual: actual === null ? 'Not recorded' : format(actualValue),
    result: actual === null ? 'MISSING' : matches(actualValue) ? 'MATCHED' : 'NOT_MATCHED'
  };
}

function rupiah(value: unknown) {
  return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(number(value))}`;
}

export class AccountingJournalDetailReader {
  constructor(private readonly sqlite: Database.Database) {}

  get(id: string): AccountingJournalDetail {
    const row = this.sqlite
      .prepare(
        `SELECT journal.*, period.status AS period_status,
                event.event_number, event.event_type, event.accounting_date,
                event.station_id, event.aircraft_id, event.flight_id,
                event.work_order_reference, event.cost_center_id, event.payload_json,
                event.created_at AS event_created_at,
                policy.policy_name AS current_policy_name,
                policy.priority AS current_policy_priority,
                policy.effective_from AS current_policy_effective_from,
                policy.effective_to AS current_policy_effective_to,
                policy.approval_status AS current_policy_approval_status
         FROM journal_entries journal
         JOIN accounting_events event ON event.id = journal.accounting_event_id
         LEFT JOIN accounting_periods period ON period.id = journal.period_id
         LEFT JOIN accounting_policies policy ON policy.id = event.policy_id
         WHERE journal.id = ?`
      )
      .get(id) as Row | undefined;
    if (!row) throw new DomainError('NOT_FOUND', `Journal entry ${id} was not found`, 404);

    const payload = parsePayload(row.payload_json);
    const snapshot = (payload.accountingPolicySnapshot ?? null) as PolicySnapshot | null;
    const source = this.sourceReference(String(row.source_type), String(row.source_id), payload);
    const dimensions = this.dimensions(row, payload);
    const lines = this.lines(id, dimensions);
    const debitMinor = lines.reduce((total, line) => total + line.debitMinor, 0);
    const creditMinor = lines.reduce((total, line) => total + line.creditMinor, 0);
    const reversal = this.reversal(row);
    const asset = this.asset(id);
    const evidence = this.evidence(row, payload, source.route);
    const auditTrail = this.auditTrail(row, snapshot, reversal, asset);
    const debitAccountCode = this.accountCode(snapshot?.debitAccountId);
    const creditAccountCode = this.accountCode(snapshot?.creditAccountId);
    const policyCode = snapshot?.policyCode ?? text(row.policy_code);
    const treatment = snapshot?.treatment ?? null;

    return accountingJournalDetailSchema.parse({
      id: String(row.id),
      journalNumber: String(row.journal_number),
      status: String(row.status),
      journalType: row.reversal_of_journal_entry_id ? 'REVERSAL' : 'SYSTEM',
      documentDate: text(row.document_date),
      transactionDate: String(row.transaction_date),
      postingDate: text(row.posting_date),
      description: String(row.memo),
      currency: String(row.currency_code),
      event: {
        id: String(row.accounting_event_id),
        eventType: String(row.event_type),
        eventLabel: eventLabels[String(row.event_type)] ?? titleCase(String(row.event_type)),
        sourceType: String(row.source_type),
        sourceId: String(row.source_id),
        sourceLabel: source.label,
        sourceRoute: source.route,
        occurredAt: String(row.event_created_at),
        accountingDate: String(row.accounting_date)
      },
      policy: policyCode
        ? {
            code: policyCode,
            name:
              snapshot?.policyName ??
              text(row.current_policy_name) ??
              `${titleCase(treatment ?? 'Accounting')} policy`,
            version: snapshot?.policyVersion ?? number(row.policy_version),
            treatment: treatment ?? 'NOT_RECORDED',
            effectiveFrom: snapshot?.effectiveFrom ?? text(row.current_policy_effective_from),
            effectiveTo: snapshot?.effectiveTo ?? text(row.current_policy_effective_to),
            priority:
              snapshot?.priority ??
              (row.current_policy_priority === null ? null : number(row.current_policy_priority)),
            approvalStatus: snapshot?.approvalStatus ?? text(row.current_policy_approval_status),
            approvalRequired: Boolean(row.approved_by_user_id),
            debitAccountCode,
            creditAccountCode,
            snapshot,
            isHistoricalSnapshot: Boolean(snapshot)
          }
        : null,
      dimensions,
      lines,
      totals: { debitMinor, creditMinor, balanced: debitMinor === creditMinor },
      evidence,
      matchedConditions: this.matchedConditions(row, payload, treatment),
      auditTrail,
      approval: {
        createdBy: actor(row.created_by_user_id),
        approvedBy: actor(row.approved_by_user_id),
        postedBy: actor(row.posted_by_user_id)
      },
      reversal,
      asset,
      costBasis: this.costBasis(row, payload, treatment),
      actions: {
        canReverse:
          row.status === 'POSTED' &&
          !row.reversal_of_journal_entry_id &&
          !reversal?.reversalJournalId &&
          row.period_status === 'OPEN',
        canViewGeneralLedger: row.status === 'POSTED'
      }
    });
  }

  private sourceReference(sourceType: string, sourceId: string, payload: Record<string, unknown>) {
    const definitions: Record<string, { table?: string; label?: string; route: string | null }> = {
      GOODS_RECEIPT: {
        table: 'inventory_goods_receipts',
        label: 'receipt_number',
        route: '/inventory/receipts'
      },
      MAINTENANCE_PART_ISSUE: {
        table: 'maintenance_part_issues',
        label: 'issue_number',
        route: '/flights/maintenance'
      },
      COMPONENT_INSTALLATION: { route: '/inventory/repairables' },
      PASSENGER_TICKET: {
        table: 'passenger_tickets',
        label: 'document_number',
        route: '/ticketing/passenger'
      },
      CARGO_BOOKING: { table: 'cargo_bookings', label: 'id', route: '/ticketing/cargo' },
      TICKETING_REFUND: {
        table: 'ticketing_refund_requests',
        label: 'id',
        route: '/ticketing/passenger'
      },
      FLIGHT: { table: 'flight_operations', label: 'flight_number', route: `/flights/${sourceId}` },
      JOURNAL_ENTRY: { table: 'journal_entries', label: 'journal_number', route: null }
    };
    const definition = definitions[sourceType];
    let label = text(payload.description) ?? text(payload.receiptNumber);
    if (!label && definition?.table && definition.label) {
      const found = this.sqlite
        .prepare(
          `SELECT ${definition.label} AS label FROM ${definition.table} WHERE id = ? LIMIT 1`
        )
        .get(sourceId) as Row | undefined;
      label = text(found?.label);
    }
    return { label: label ?? sourceId, route: definition?.route ?? null };
  }

  private dimensions(row: Row, payload: Record<string, unknown>) {
    const stationRow = row.station_id
      ? (this.sqlite
          .prepare('SELECT station_code, station_name FROM stations WHERE id = ?')
          .get(row.station_id) as Row | undefined)
      : undefined;
    const aircraftRow = row.aircraft_id
      ? (this.sqlite
          .prepare('SELECT registration_number, model FROM aircraft WHERE id = ?')
          .get(row.aircraft_id) as Row | undefined)
      : undefined;
    const flightRow = row.flight_id
      ? (this.sqlite
          .prepare('SELECT flight_number FROM flight_operations WHERE id = ?')
          .get(row.flight_id) as Row | undefined)
      : undefined;
    const stationLabel = stationRow
      ? `${stationRow.station_code} · ${stationRow.station_name}`
      : row.station_id;
    const aircraftLabel = aircraftRow
      ? `${aircraftRow.registration_number} · ${aircraftRow.model}`
      : row.aircraft_id;
    const serialId = payload.serializedComponentId ?? payload.serialId;
    const serialNumber = payload.serialNumber;
    return {
      station: dimension(row.station_id, stationLabel),
      aircraft: dimension(
        row.aircraft_id,
        aircraftLabel,
        row.aircraft_id,
        row.aircraft_id ? `/flights/aircraft` : null
      ),
      flight: dimension(
        row.flight_id,
        flightRow?.flight_number ?? row.flight_id,
        row.flight_id,
        row.flight_id ? `/flights/${row.flight_id}` : null
      ),
      ticket: ['PASSENGER_TICKET', 'CARGO_BOOKING'].includes(String(row.source_type))
        ? dimension(
            row.source_id,
            row.source_id,
            row.source_id,
            String(row.source_type) === 'PASSENGER_TICKET'
              ? '/ticketing/passenger'
              : '/ticketing/cargo'
          )
        : null,
      workOrder: dimension(
        payload.workOrderId ?? row.work_order_reference,
        payload.workOrderId ?? row.work_order_reference
      ),
      component: dimension(serialId, serialNumber ?? serialId),
      costCenter: dimension(row.cost_center_id, row.cost_center_id)
    };
  }

  private lines(id: string, dimensions: AccountingJournalDetail['dimensions']) {
    const lineDimensions = Object.values(dimensions).filter((item): item is DimensionReference =>
      Boolean(item)
    );
    return (
      this.sqlite
        .prepare(
          `SELECT line.id, line.line_number, line.account_id, account.account_code,
                  account.account_name, line.debit_minor, line.credit_minor, line.description
           FROM journal_lines line
           JOIN chart_of_accounts account ON account.id = line.account_id
           WHERE line.journal_entry_id = ?
           ORDER BY CASE WHEN line.debit_minor > 0 THEN 0 ELSE 1 END, line.line_number`
        )
        .all(id) as Row[]
    ).map((line) => ({
      id: String(line.id),
      lineNumber: number(line.line_number),
      accountId: String(line.account_id),
      accountCode: String(line.account_code),
      accountName: String(line.account_name),
      debitMinor: number(line.debit_minor),
      creditMinor: number(line.credit_minor),
      description: text(line.description),
      dimensions: lineDimensions
    }));
  }

  private matchedConditions(row: Row, payload: Record<string, unknown>, treatment: string | null) {
    if (treatment === 'CAPITALIZE') {
      return [
        condition(
          'work-order-category',
          'Work order category',
          'workOrderCategory',
          'equals',
          'Heavy maintenance',
          payload.workOrderCategory,
          (value) => value === 'HEAVY_MAINTENANCE',
          (value) => titleCase(String(value))
        ),
        condition(
          'capitalization-candidate',
          'Capitalization candidate',
          'capitalizationCandidate',
          'equals',
          'Yes',
          payload.capitalizationCandidate,
          (value) => value === true || value === 'true',
          (value) => (value === true || value === 'true' ? 'Yes' : 'No')
        ),
        condition(
          'cost-threshold',
          'Component cost',
          'actualCostMinor',
          '≥',
          payload.capitalizationThresholdMinor === undefined
            ? 'Not recorded'
            : rupiah(payload.capitalizationThresholdMinor),
          payload.actualCostMinor,
          (value) => number(value) >= number(payload.capitalizationThresholdMinor),
          rupiah
        ),
        condition(
          'expected-benefit',
          'Expected benefit',
          'expectedBenefitMonths',
          '>',
          '12 months',
          payload.expectedBenefitMonths,
          (value) => number(value) > 12,
          (value) => `${number(value)} months`
        ),
        condition(
          'technical-acceptance',
          'Technical acceptance',
          'technicalAcceptanceStatus',
          'equals',
          'Approved',
          payload.technicalAcceptanceStatus,
          (value) => value === 'APPROVED',
          (value) => titleCase(String(value))
        ),
        condition(
          'ready-for-use',
          'Ready-for-use date',
          'readyForUseDate',
          'exists',
          'Required',
          payload.readyForUseDate,
          Boolean
        )
      ];
    }
    if (treatment === 'EXPENSE') {
      return [
        condition(
          'maintenance-category',
          'Maintenance category',
          'maintenanceCategory',
          'equals',
          'Routine',
          payload.maintenanceCategory,
          (value) => value === 'ROUTINE'
        ),
        condition(
          'issue-cost',
          'Issued cost',
          'actualCostMinor',
          '>',
          '0',
          payload.actualCostMinor,
          (value) => number(value) > 0,
          rupiah
        )
      ];
    }
    if (treatment === 'DEFERRED_REVENUE') {
      return [
        condition(
          'payment',
          'Payment received',
          'paymentMethod',
          'exists',
          'Required',
          payload.paymentMethod,
          Boolean
        ),
        {
          id: 'service-date',
          label: 'Service fulfilled',
          field: 'serviceDate',
          operator: 'is empty',
          expected: 'Not yet fulfilled',
          actual: row.service_date ? String(row.service_date) : 'Not fulfilled',
          result: row.service_date ? ('NOT_MATCHED' as const) : ('MATCHED' as const)
        }
      ];
    }
    if (treatment === 'REVENUE_RECOGNITION') {
      return [
        condition(
          'fulfillment',
          'Passenger service',
          'checkInStatus',
          'equals',
          'Checked in',
          payload.checkInStatus,
          (value) => value === 'CHECKED_IN'
        ),
        condition(
          'service-date',
          'Service date',
          'serviceDate',
          'exists',
          'Required',
          row.service_date,
          Boolean
        )
      ];
    }
    if (treatment === 'INVENTORY') {
      return [
        condition(
          'receipt',
          'Goods receipt',
          'receiptNumber',
          'exists',
          'Posted receipt',
          payload.receiptNumber,
          Boolean
        ),
        condition(
          'receipt-cost',
          'Receipt cost',
          'totalCostMinor',
          '>',
          '0',
          payload.totalCostMinor,
          (value) => number(value) > 0,
          rupiah
        )
      ];
    }
    if (treatment === 'REFUND_REVERSAL') {
      return [
        condition(
          'refund-subject',
          'Refund subject',
          'subjectType',
          'exists',
          'Passenger or cargo',
          payload.subjectType,
          Boolean
        )
      ];
    }
    return [];
  }

  private evidence(row: Row, payload: Record<string, unknown>, sourceRoute: string | null) {
    const items: JournalEvidenceItem[] = [
      {
        type: 'SOURCE_TRANSACTION',
        label: 'Source transaction',
        reference: String(row.source_id),
        status: 'AVAILABLE',
        recordedAt: text(row.event_created_at),
        recordedBy: null,
        sourceRoute
      }
    ];
    const add = (item: JournalEvidenceItem) => items.push(item);
    if (row.event_type === 'AIRCRAFT_COMPONENT_READY_FOR_USE') {
      add({
        type: 'WORK_ORDER',
        label: 'Work order',
        reference: text(payload.workOrderId),
        status: payload.workOrderId ? 'AVAILABLE' : 'MISSING',
        recordedAt: null,
        recordedBy: null,
        sourceRoute: '/flights/maintenance'
      });
      add({
        type: 'TECHNICAL_ACCEPTANCE',
        label: 'Technical acceptance',
        reference: text(payload.technicalAcceptanceStatus),
        status: payload.technicalAcceptanceStatus === 'APPROVED' ? 'VERIFIED' : 'MISSING',
        recordedAt: text(payload.readyForUseDate),
        recordedBy: null,
        sourceRoute: null
      });
      add({
        type: 'COMPONENT_INSTALLATION',
        label: 'Component installation',
        reference: text(payload.componentInstallationId),
        status: payload.componentInstallationId ? 'AVAILABLE' : 'MISSING',
        recordedAt: text(payload.readyForUseDate),
        recordedBy: null,
        sourceRoute: '/inventory/repairables'
      });
      add({
        type: 'INVENTORY_COST_CLAIM',
        label: 'Inventory FIFO cost claim',
        reference: Array.isArray(payload.inventoryCostKeys)
          ? payload.inventoryCostKeys.join(', ')
          : null,
        status: Array.isArray(payload.inventoryCostKeys) ? 'VERIFIED' : 'MISSING',
        recordedAt: text(row.event_created_at),
        recordedBy: null,
        sourceRoute: '/inventory/movements'
      });
      add({
        type: 'SERIAL_ASSIGNMENT',
        label: 'Aircraft and serial assignment',
        reference: text(payload.serialNumber),
        status: payload.serialNumber ? 'VERIFIED' : 'MISSING',
        recordedAt: text(payload.readyForUseDate),
        recordedBy: null,
        sourceRoute: '/inventory/repairables'
      });
    } else if (row.event_type === 'INVENTORY_RECEIVED') {
      add({
        type: 'GOODS_RECEIPT',
        label: 'Goods receipt',
        reference: text(payload.receiptNumber),
        status: payload.receiptNumber ? 'VERIFIED' : 'MISSING',
        recordedAt: text(payload.receivedAt),
        recordedBy: null,
        sourceRoute: '/inventory/receipts'
      });
      add({
        type: 'PURCHASE_ORDER',
        label: 'Purchase order',
        reference: text(payload.orderNumber),
        status: payload.orderNumber ? 'AVAILABLE' : 'MISSING',
        recordedAt: null,
        recordedBy: null,
        sourceRoute: '/inventory/purchase-orders'
      });
    } else if (row.event_type === 'TICKET_PAYMENT_RECEIVED') {
      add({
        type: 'PAYMENT',
        label: 'Ticket payment',
        reference: text(payload.paymentMethod),
        status: payload.paymentMethod ? 'VERIFIED' : 'MISSING',
        recordedAt: text(row.transaction_date),
        recordedBy: null,
        sourceRoute
      });
    } else if (row.event_type === 'PASSENGER_SERVICE_FULFILLED') {
      add({
        type: 'FULFILLMENT',
        label: 'Passenger fulfillment',
        reference: text(payload.checkInStatus),
        status: payload.checkInStatus === 'CHECKED_IN' ? 'VERIFIED' : 'MISSING',
        recordedAt: text(row.service_date),
        recordedBy: null,
        sourceRoute
      });
    } else if (row.event_type === 'TICKET_REFUND_APPROVED') {
      add({
        type: 'REFUND_APPROVAL',
        label: 'Refund approval',
        reference: text(row.source_id),
        status: 'AVAILABLE',
        recordedAt: text(row.transaction_date),
        recordedBy: null,
        sourceRoute
      });
    }
    return items;
  }

  private reversal(row: Row): AccountingJournalDetail['reversal'] {
    const originalId = text(row.reversal_of_journal_entry_id);
    if (originalId) {
      const original = this.sqlite
        .prepare('SELECT journal_number FROM journal_entries WHERE id = ?')
        .get(originalId) as Row | undefined;
      return {
        originalJournalId: originalId,
        originalJournalNumber: text(original?.journal_number) ?? originalId,
        reversedAt: text(row.posted_at),
        reversedBy: actor(row.posted_by_user_id)
      };
    }
    const reversal = this.sqlite
      .prepare(
        `SELECT id, journal_number, posted_at, posted_by_user_id
         FROM journal_entries WHERE reversal_of_journal_entry_id = ? LIMIT 1`
      )
      .get(row.id) as Row | undefined;
    if (!reversal) return null;
    return {
      reversalJournalId: String(reversal.id),
      reversalJournalNumber: String(reversal.journal_number),
      reversedAt: text(reversal.posted_at),
      reversedBy: actor(reversal.posted_by_user_id)
    };
  }

  private asset(journalId: string): AccountingJournalDetail['asset'] {
    const row = this.sqlite
      .prepare(
        `SELECT asset.id, asset.asset_number, asset.status,
                COUNT(schedule.id) AS schedule_count,
                SUM(CASE WHEN schedule.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled_count,
                SUM(CASE WHEN schedule.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count
         FROM asset_register asset
         LEFT JOIN depreciation_schedules schedule ON schedule.asset_id = asset.id
         WHERE asset.source_journal_entry_id = ?
         GROUP BY asset.id`
      )
      .get(journalId) as Row | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      assetNumber: String(row.asset_number),
      status: String(row.status),
      sourceRoute: null,
      depreciationScheduleCount: number(row.schedule_count),
      scheduledCount: number(row.scheduled_count),
      cancelledCount: number(row.cancelled_count)
    };
  }

  private auditTrail(
    row: Row,
    snapshot: PolicySnapshot | null,
    reversal: AccountingJournalDetail['reversal'],
    asset: AccountingJournalDetail['asset']
  ) {
    const events: JournalAuditEvent[] = [
      {
        id: `${row.id}:event`,
        type: 'ACCOUNTING_EVENT_RECEIVED',
        label: 'Accounting event received',
        description: `${eventLabels[String(row.event_type)] ?? titleCase(String(row.event_type))} was captured from ${row.source_type}.`,
        timestamp: text(row.event_created_at),
        actor: null,
        source: 'SYSTEM',
        status: 'SUCCESS'
      },
      {
        id: `${row.id}:draft`,
        type: 'JOURNAL_CREATED',
        label: 'Journal draft created',
        description: `${row.journal_number} was created from the accounting event.`,
        timestamp: text(row.created_at),
        actor: actor(row.created_by_user_id),
        source: 'SYSTEM',
        status: 'SUCCESS'
      }
    ];
    if (snapshot)
      events.splice(1, 0, {
        id: `${row.id}:policy`,
        type: 'POLICY_RESOLVED',
        label: 'Policy resolved',
        description: `${snapshot.policyCode ?? row.policy_code} version ${snapshot.policyVersion ?? row.policy_version} was captured in the event snapshot.`,
        timestamp: text(row.event_created_at),
        actor: null,
        source: 'POLICY_ENGINE',
        status: 'SUCCESS'
      });
    if (row.approved_by_user_id)
      events.push({
        id: `${row.id}:approved`,
        type: 'JOURNAL_APPROVED',
        label: 'Journal approved',
        description: 'Approval actor is recorded; the approval timestamp is not stored separately.',
        timestamp: null,
        actor: actor(row.approved_by_user_id),
        source: 'USER',
        status: 'INFO'
      });
    if (row.posted_at)
      events.push({
        id: `${row.id}:posted`,
        type: 'JOURNAL_POSTED',
        label: 'Journal posted',
        description: `${row.journal_number} was posted to the General Ledger.`,
        timestamp: text(row.posted_at),
        actor: actor(row.posted_by_user_id),
        source: 'USER',
        status: 'SUCCESS'
      });
    if (asset) {
      const assetRow = this.sqlite
        .prepare('SELECT created_at, updated_at FROM asset_register WHERE id = ?')
        .get(asset.id) as Row;
      events.push({
        id: `${row.id}:asset`,
        type: 'ASSET_CREATED',
        label: 'Asset created',
        description: `${asset.assetNumber} was created from the posted capitalization journal.`,
        timestamp: text(assetRow.created_at),
        actor: null,
        source: 'SYSTEM',
        status: 'SUCCESS',
        relatedResource: { type: 'ASSET', id: asset.id, label: asset.assetNumber, route: null }
      });
      events.push({
        id: `${row.id}:depreciation`,
        type: 'DEPRECIATION_SCHEDULE_GENERATED',
        label: 'Depreciation schedule generated',
        description: `${asset.depreciationScheduleCount} depreciation periods were generated.`,
        timestamp: text(assetRow.created_at),
        actor: null,
        source: 'SYSTEM',
        status: 'SUCCESS'
      });
      if (asset.status === 'REVERSED')
        events.push({
          id: `${row.id}:asset-reversed`,
          type: 'ASSET_REVERSED',
          label: 'Asset marked reversed',
          description: `${asset.cancelledCount} depreciation periods were cancelled.`,
          timestamp: text(assetRow.updated_at),
          actor: reversal?.reversedBy ?? null,
          source: 'SYSTEM',
          status: 'WARNING'
        });
    }
    if (reversal?.reversalJournalId)
      events.push({
        id: `${row.id}:reversal`,
        type: 'REVERSAL_POSTED',
        label: 'Reversal posted',
        description: `${reversal.reversalJournalNumber} reverses this immutable journal.`,
        timestamp: reversal.reversedAt,
        actor: reversal.reversedBy,
        source: 'USER',
        status: 'WARNING',
        relatedResource: {
          type: 'JOURNAL',
          id: reversal.reversalJournalId,
          label: reversal.reversalJournalNumber ?? reversal.reversalJournalId,
          route: null
        }
      });
    return events.sort((left, right) => {
      if (!left.timestamp && !right.timestamp) return 0;
      if (!left.timestamp) return 1;
      if (!right.timestamp) return -1;
      return left.timestamp.localeCompare(right.timestamp);
    });
  }

  private costBasis(row: Row, payload: Record<string, unknown>, treatment: string | null) {
    if (treatment === 'CAPITALIZE') {
      return {
        heading: 'Capitalization cost basis',
        amountLabel: 'FIFO issue cost',
        amountMinor: number(payload.actualCostMinor),
        currency: String(row.currency_code),
        items: [
          { label: 'Labor/vendor cost included', value: 'No' },
          {
            label: 'Inventory claim',
            value: Array.isArray(payload.inventoryCostKeys) ? 'Claimed once' : 'Not recorded'
          },
          { label: 'Source issue', value: text(payload.inventoryEventId) ?? 'Not recorded' }
        ]
      };
    }
    if (['DEFERRED_REVENUE', 'REVENUE_RECOGNITION', 'REFUND_REVERSAL'].includes(treatment ?? '')) {
      return {
        heading: 'Transaction price basis',
        amountLabel:
          treatment === 'DEFERRED_REVENUE' ? 'Deferred amount' : 'Recognized or reversed amount',
        amountMinor: number(row.amount_minor) || this.journalDebit(String(row.id)),
        currency: String(row.currency_code),
        items: [
          { label: 'Fulfillment date', value: text(row.service_date) ?? 'Not recorded' },
          { label: 'Tax/charge allocation', value: 'Not recorded' }
        ]
      };
    }
    return null;
  }

  private accountCode(accountId: string | undefined) {
    if (!accountId) return null;
    const row = this.sqlite
      .prepare('SELECT account_code FROM chart_of_accounts WHERE id = ?')
      .get(accountId) as Row | undefined;
    return text(row?.account_code);
  }

  private journalDebit(id: string) {
    const row = this.sqlite
      .prepare(
        'SELECT COALESCE(SUM(debit_minor), 0) AS amount FROM journal_lines WHERE journal_entry_id = ?'
      )
      .get(id) as Row;
    return number(row.amount);
  }
}
