import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';
import type {
  FinanceTraceabilityDto,
  FinancialExportSummaryDto,
  FinancialReportType
} from '../../../../shared/features/finance/governance';
import type { FinanceReportingQuery } from '../../../../shared/features/finance/reporting';
import { DomainError } from '../../../utils/errors';
import { FinanceAuditService } from '../audit/service';
import type { FinanceReportingService } from '../reporting/service';

type SqlRow = Record<string, unknown>;
const num = (value: unknown) => Number(value ?? 0);

function csvCell(value: unknown) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/u.test(text)) text = `'${text}`;
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function checksum(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export class FinanceGovernanceService {
  private readonly audit: FinanceAuditService;

  constructor(
    private readonly sqlite: Database.Database,
    private readonly reporting: FinanceReportingService,
    private readonly now: () => string
  ) {
    this.audit = new FinanceAuditService(sqlite, now);
  }

  exportReport(
    reportType: FinancialReportType,
    query: FinanceReportingQuery,
    actor: { actorId: string; actorRole: string }
  ) {
    if (!['Demo Admin', 'Director', 'Finance Reviewer'].includes(actor.actorRole)) {
      throw new DomainError(
        'FINANCIAL_EXPORT_UNAUTHORIZED',
        'Actor is not authorized to export financial records.',
        403
      );
    }
    const data = this.exportData(reportType, query);
    const content = csv(data.headers, data.rows);
    const id = `financial-export-${nanoid(12)}`;
    const stamp = this.now().replaceAll(':', '').replaceAll('-', '').slice(0, 15);
    const period = query.period ?? 'current';
    const filename = `${reportType.toLowerCase().replaceAll('_', '-')}-${period}-${stamp}.csv`;
    const createdAt = this.now();
    this.sqlite
      .prepare(
        `INSERT INTO financial_exports (
      id, report_type, format, period_code, requested_by, requested_role,
      row_count, filename, content_hash, created_at
    ) VALUES (?, ?, 'CSV', ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        reportType,
        query.period ?? null,
        actor.actorId,
        actor.actorRole,
        data.rows.length,
        filename,
        checksum(content),
        createdAt
      );
    this.audit.record({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: 'FINANCIAL_EXPORT_CREATED',
      entityType: 'FINANCIAL_EXPORT',
      entityId: id,
      sourceReference: reportType,
      after: { period: query.period ?? null, rowCount: data.rows.length, filename }
    });
    return {
      id,
      reportType,
      format: 'CSV' as const,
      filename,
      mimeType: 'text/csv;charset=utf-8',
      content,
      rowCount: data.rows.length,
      createdAt
    };
  }

  listAudit(limit = 250) {
    return this.sqlite
      .prepare(
        `SELECT id, actor_id AS actorId, actor_role AS actorRole,
      action, entity_type AS entityType, entity_id AS entityId, reason,
      source_reference AS sourceReference, occurred_at AS occurredAt
      FROM financial_audit_logs ORDER BY occurred_at DESC, rowid DESC LIMIT ?`
      )
      .all(limit);
  }

  listExports(limit = 50): FinancialExportSummaryDto[] {
    return this.sqlite
      .prepare(
        `SELECT id, report_type AS reportType, format,
      period_code AS periodCode, requested_by AS requestedBy, requested_role AS requestedRole,
      row_count AS rowCount, filename, content_hash AS contentHash, created_at AS createdAt
      FROM financial_exports ORDER BY created_at DESC, rowid DESC LIMIT ?`
      )
      .all(limit) as FinancialExportSummaryDto[];
  }

  traceSource(sourceType: string, sourceId: string): FinanceTraceabilityDto {
    const handoff = this.sqlite
      .prepare(
        `SELECT * FROM finance_handoffs
      WHERE source_type = ? AND source_id = ? ORDER BY created_at DESC LIMIT 1`
      )
      .get(sourceType, sourceId) as SqlRow | undefined;
    const event = handoff?.accounting_event_id
      ? (this.sqlite
          .prepare('SELECT * FROM accounting_events WHERE id = ?')
          .get(handoff.accounting_event_id) as SqlRow | undefined)
      : (this.sqlite
          .prepare(
            'SELECT * FROM accounting_events WHERE source_type = ? AND source_id = ? ORDER BY created_at DESC LIMIT 1'
          )
          .get(sourceType, sourceId) as SqlRow | undefined);
    return this.trace(sourceType, sourceId, handoff, event);
  }

  traceJournal(journalReference: string): FinanceTraceabilityDto {
    const journal = this.sqlite
      .prepare(
        `SELECT * FROM journal_entries
      WHERE id = ? OR journal_number = ? ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END LIMIT 1`
      )
      .get(journalReference, journalReference, journalReference) as SqlRow | undefined;
    if (!journal) throw new DomainError('JOURNAL_NOT_FOUND', 'Journal was not found.', 404);
    const event = this.sqlite
      .prepare('SELECT * FROM accounting_events WHERE id = ?')
      .get(journal.accounting_event_id) as SqlRow | undefined;
    if (!event) {
      throw new DomainError(
        'ACCOUNTING_EVENT_NOT_FOUND',
        'The journal accounting event reference is unavailable.',
        409
      );
    }
    const handoff = this.sqlite
      .prepare(
        `SELECT * FROM finance_handoffs
      WHERE journal_id = ? OR accounting_event_id = ? OR (source_type = ? AND source_id = ?)
      ORDER BY created_at DESC LIMIT 1`
      )
      .get(journal.id, event.id, event.source_type, event.source_id) as SqlRow | undefined;
    return this.trace(String(event.source_type), String(event.source_id), handoff, event, journal);
  }

  private trace(
    sourceType: string,
    sourceId: string,
    handoff?: SqlRow,
    event?: SqlRow,
    suppliedJournal?: SqlRow
  ): FinanceTraceabilityDto {
    const journal =
      suppliedJournal ??
      (event?.journal_entry_id
        ? (this.sqlite
            .prepare('SELECT * FROM journal_entries WHERE id = ?')
            .get(event.journal_entry_id) as SqlRow | undefined)
        : handoff?.journal_id
          ? (this.sqlite
              .prepare('SELECT * FROM journal_entries WHERE id = ?')
              .get(handoff.journal_id) as SqlRow | undefined)
          : undefined);
    const lines = journal
      ? (this.sqlite
          .prepare(
            `SELECT line.id, account.account_code,
      line.debit_minor, line.credit_minor FROM journal_lines line
      JOIN chart_of_accounts account ON account.id=line.account_id
      WHERE line.journal_entry_id=? ORDER BY line.line_number`
          )
          .all(journal.id) as SqlRow[])
      : [];
    const period = journal
      ? (this.sqlite
          .prepare(
            `SELECT period.period_code FROM accounting_periods period
      JOIN journal_entries journal ON journal.period_id=period.id WHERE journal.id=?`
          )
          .get(journal.id) as { period_code: string })
      : null;
    const flightId = event?.flight_id
      ? String(event.flight_id)
      : handoff?.flight_id
        ? String(handoff.flight_id)
        : null;
    const reportLinks = period
      ? [
          `/finance/statements?period=${period.period_code}`,
          `/finance/trial-balance?period=${period.period_code}`,
          ...(flightId ? [`/finance/hpp?period=${period.period_code}&flightId=${flightId}`] : [])
        ]
      : [];
    return {
      source: {
        type: sourceType,
        id: sourceId,
        route: this.sourceRoute(sourceType, sourceId, flightId)
      },
      handoff: handoff ? { id: String(handoff.id), status: String(handoff.status) } : null,
      accountingEvent: event
        ? {
            id: String(event.id),
            eventType: String(event.event_type),
            postingStatus: String(event.posting_status)
          }
        : null,
      journal: journal
        ? {
            id: String(journal.id),
            journalNumber: String(journal.journal_number),
            status: String(journal.status)
          }
        : null,
      journalLines: lines.map((line) => ({
        id: String(line.id),
        accountCode: String(line.account_code),
        debitMinor: num(line.debit_minor),
        creditMinor: num(line.credit_minor)
      })),
      reportLinks
    };
  }

  private sourceRoute(sourceType: string, sourceId: string, flightId: string | null) {
    if (sourceType === 'INVOICE') return `/invoices/${sourceId}`;
    if (sourceType === 'SUPPLIER_INVOICE') return '/finance/payables';
    if (sourceType === 'AR_ALLOCATION') return '/finance/receivables';
    if (flightId) return `/flights/${flightId}`;
    return null;
  }

  private exportData(reportType: FinancialReportType, query: FinanceReportingQuery) {
    if (reportType === 'TRIAL_BALANCE') {
      const report = this.reporting.trialBalance(query);
      return {
        headers: ['Account Code', 'Account Name', 'Debit IDR', 'Credit IDR', 'Balance IDR'],
        rows: report.accounts.map((line) => [
          line.code,
          line.name,
          line.debitMinor,
          line.creditMinor,
          line.balanceMinor
        ])
      };
    }
    if (reportType === 'PROFIT_LOSS') {
      const report = this.reporting.profitAndLoss(query);
      return {
        headers: ['Account Code', 'Account Name', 'Account Type', 'Amount IDR'],
        rows: report.lines.map((line) => [
          line.accountCode,
          line.accountName,
          line.accountType,
          line.amountMinor
        ])
      };
    }
    if (reportType === 'BALANCE_SHEET') {
      const report = this.reporting.balanceSheet(query);
      return {
        headers: ['Section', 'Account Code', 'Account Name', 'Amount IDR'],
        rows: report.sections.flatMap((section) =>
          section.accounts.map((line) => [
            section.label,
            line.accountCode,
            line.accountName,
            line.amountMinor
          ])
        )
      };
    }
    const period = query.period
      ? (this.sqlite
          .prepare('SELECT id, start_date, end_date FROM accounting_periods WHERE period_code = ?')
          .get(query.period) as SqlRow | undefined)
      : undefined;
    if (query.period && !period)
      throw new DomainError(
        'FINANCE_PERIOD_NOT_FOUND',
        `Accounting period ${query.period} was not found.`,
        404
      );
    const sql: Record<
      Exclude<FinancialReportType, 'TRIAL_BALANCE' | 'PROFIT_LOSS' | 'BALANCE_SHEET'>,
      { headers: string[]; statement: string; parameters: unknown[] }
    > = {
      JOURNAL: {
        headers: ['Journal Number', 'Status', 'Posting Date', 'Source Type', 'Source ID'],
        statement: `SELECT journal_number, status, posting_date, source_type, source_id FROM journal_entries
          WHERE (? IS NULL OR period_id = ?) ORDER BY journal_number`,
        parameters: [period?.id ?? null, period?.id ?? null]
      },
      GENERAL_LEDGER: {
        headers: [
          'Journal Number',
          'Posting Date',
          'Account Code',
          'Debit IDR',
          'Credit IDR',
          'Source Type',
          'Source ID'
        ],
        statement: `SELECT journal_number, posting_date, account_code, base_debit_idr, base_credit_idr, source_type, source_id
          FROM general_ledger WHERE (? IS NULL OR posting_date BETWEEN ? AND ?) ORDER BY posting_date, journal_number, journal_line_id`,
        parameters: [
          period?.id ?? null,
          period?.start_date ?? '',
          period ? `${String(period.end_date)}T23:59:59.999Z` : ''
        ]
      },
      AR: {
        headers: ['Invoice Number', 'Customer', 'Total', 'Allocated', 'Outstanding'],
        statement: `SELECT invoice.invoice_number, customer.account_name, invoice.total,
          COALESCE(allocation.allocated,0), invoice.total-COALESCE(allocation.allocated,0)
          FROM invoices invoice LEFT JOIN (
            SELECT item.invoice_id, SUM(item.amount_minor) AS allocated
            FROM ar_allocations item JOIN journal_entries journal ON journal.id=item.journal_id
            WHERE item.status IN ('POSTED','REVERSED') AND journal.status='POSTED'
              AND (? IS NULL OR journal.posting_date <= ?)
              AND NOT EXISTS (SELECT 1 FROM journal_entries reversal
                WHERE reversal.reversal_of_journal_entry_id=journal.id AND reversal.status='POSTED'
                  AND (? IS NULL OR reversal.posting_date <= ?))
            GROUP BY item.invoice_id
          ) allocation ON allocation.invoice_id=invoice.id
          JOIN customers customer ON customer.id=invoice.customer_id
          WHERE invoice.recognition_mode='AR_ON_ISSUE' AND invoice.status <> 'draft'
            AND EXISTS (SELECT 1 FROM accounting_events recognition_event
              JOIN journal_entries recognition_journal ON recognition_journal.id=recognition_event.journal_entry_id
              WHERE recognition_event.source_type='INVOICE' AND recognition_event.source_id=invoice.id
                AND recognition_event.event_type='CHARTER_INVOICE_ISSUED'
                AND recognition_event.posting_status='POSTED' AND recognition_journal.status='POSTED'
                AND (? IS NULL OR recognition_journal.posting_date <= ?)
                AND NOT EXISTS (SELECT 1 FROM journal_entries recognition_reversal
                  WHERE recognition_reversal.reversal_of_journal_entry_id=recognition_journal.id
                    AND recognition_reversal.status='POSTED'
                    AND (? IS NULL OR recognition_reversal.posting_date <= ?)))
            AND invoice.issued_at IS NOT NULL AND (? IS NULL OR invoice.issued_at <= ?)
          ORDER BY invoice.invoice_number`,
        parameters: [
          period?.id ?? null,
          period ? `${String(period.end_date)}T23:59:59.999Z` : '',
          period?.id ?? null,
          period ? `${String(period.end_date)}T23:59:59.999Z` : '',
          period?.id ?? null,
          period ? `${String(period.end_date)}T23:59:59.999Z` : '',
          period?.id ?? null,
          period ? `${String(period.end_date)}T23:59:59.999Z` : '',
          period?.id ?? null,
          period ? `${String(period.end_date)}T23:59:59.999Z` : ''
        ]
      },
      AP: {
        headers: ['Invoice Number', 'Supplier ID', 'Total', 'Paid', 'Outstanding'],
        statement: `SELECT invoice.invoice_number, invoice.supplier_id, invoice.total_minor,
          COALESCE(payment.paid,0), invoice.total_minor-COALESCE(payment.paid,0)
          FROM supplier_invoices invoice LEFT JOIN (
            SELECT item.supplier_invoice_id, SUM(item.amount_minor) AS paid
            FROM supplier_payment_requests item JOIN journal_entries journal ON journal.id=item.journal_id
            WHERE item.status='EXECUTED' AND journal.status='POSTED'
              AND (? IS NULL OR journal.posting_date <= ?)
              AND NOT EXISTS (SELECT 1 FROM journal_entries reversal
                WHERE reversal.reversal_of_journal_entry_id=journal.id AND reversal.status='POSTED'
                  AND (? IS NULL OR reversal.posting_date <= ?))
            GROUP BY item.supplier_invoice_id
          ) payment ON payment.supplier_invoice_id=invoice.id
          JOIN journal_entries recognition_journal ON recognition_journal.id=invoice.journal_id
          WHERE recognition_journal.status='POSTED'
            AND (? IS NULL OR recognition_journal.posting_date <= ?)
            AND NOT EXISTS (SELECT 1 FROM journal_entries recognition_reversal
              WHERE recognition_reversal.reversal_of_journal_entry_id=recognition_journal.id
                AND recognition_reversal.status='POSTED'
                AND (? IS NULL OR recognition_reversal.posting_date <= ?))
            AND (? IS NULL OR invoice.invoice_date <= ?) ORDER BY invoice.invoice_number`,
        parameters: [
          period?.id ?? null,
          period ? `${String(period.end_date)}T23:59:59.999Z` : '',
          period?.id ?? null,
          period ? `${String(period.end_date)}T23:59:59.999Z` : '',
          period?.id ?? null,
          period ? `${String(period.end_date)}T23:59:59.999Z` : '',
          period?.id ?? null,
          period ? `${String(period.end_date)}T23:59:59.999Z` : '',
          period?.id ?? null,
          period ? `${String(period.end_date)}T23:59:59.999Z` : ''
        ]
      },
      BANK_RECONCILIATION: {
        headers: ['Statement', 'Period Start', 'Period End', 'Status', 'Closing Balance'],
        statement: `SELECT statement_number, period_start, period_end, status, closing_balance_minor FROM bank_statements
          WHERE (? IS NULL OR (period_start <= ? AND period_end >= ?)) ORDER BY period_end, statement_number`,
        parameters: [period?.id ?? null, period?.end_date ?? '', period?.start_date ?? '']
      }
    };
    const definition = sql[reportType];
    const objects = this.sqlite
      .prepare(definition.statement)
      .raw(true)
      .all(...definition.parameters) as unknown[][];
    return { headers: definition.headers, rows: objects };
  }
}
