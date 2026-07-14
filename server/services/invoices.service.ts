import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type {
  InvoiceDetailDto,
  InvoiceSummaryDto,
  PaymentDto,
  RecordPaymentBody
} from '../../shared/contracts/invoices';
import { notFound } from '../utils/errors';

type InvoiceRow = {
  id: string;
  flightOperationId: string;
  invoiceNumber: string;
  status: InvoiceSummaryDto['status'];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  issuedAt: string;
  dueAt: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  flightNumber: string;
  orderNumber: string;
  currentStatus: string;
  originCode: string;
  destinationCode: string;
  scheduledDepartureAt: string | null;
  scheduledArrivalAt: string | null;
};

const invoiceSelect = `
  SELECT invoice.id, invoice.flight_operation_id AS flightOperationId,
    invoice.invoice_number AS invoiceNumber, invoice.status, invoice.subtotal, invoice.tax,
    invoice.total, invoice.currency, invoice.issued_at AS issuedAt, invoice.due_at AS dueAt,
    customer.id AS customerId, customer.account_name AS customerName,
    customer.email AS customerEmail, flight.flight_number AS flightNumber,
    flight.order_number AS orderNumber, operation_status.code AS currentStatus,
    origin.station_code AS originCode, destination.station_code AS destinationCode,
    flight.scheduled_departure_at AS scheduledDepartureAt,
    flight.scheduled_arrival_at AS scheduledArrivalAt
  FROM invoices invoice
  JOIN customers customer ON customer.id = invoice.customer_id
  JOIN flight_operations flight ON flight.id = invoice.flight_operation_id
  JOIN flight_operation_statuses operation_status ON operation_status.id = flight.current_status_id
  JOIN stations origin ON origin.id = flight.origin_station_id
  JOIN stations destination ON destination.id = flight.destination_station_id
`;

export class InvoicesService {
  constructor(private readonly sqlite: Database.Database) {}

  listInvoices(query: { status?: string; limit: number; offset: number }) {
    const where = query.status ? 'WHERE invoice.status = @status' : '';
    const rows = this.sqlite
      .prepare(
        `${invoiceSelect} ${where} ORDER BY invoice.issued_at DESC LIMIT @limit OFFSET @offset`
      )
      .all(query) as InvoiceRow[];
    return rows.map((row) => this.toSummary(row));
  }

  getInvoiceDetail(id: string): InvoiceDetailDto {
    const row = this.sqlite.prepare(`${invoiceSelect} WHERE invoice.id = ?`).get(id) as
      InvoiceRow | undefined;
    if (!row) throw notFound('Invoice', id);
    const payments = this.listPayments(id);
    return {
      ...this.toSummary(row),
      payments,
      balanceDue: Math.max(
        row.total - payments.reduce((sum, payment) => sum + payment.amount, 0),
        0
      )
    };
  }

  recordPayment(id: string, input: RecordPaymentBody): PaymentDto {
    const invoice = this.sqlite.prepare('SELECT total FROM invoices WHERE id = ?').get(id) as
      { total: number } | undefined;
    if (!invoice) throw notFound('Invoice', id);
    const payment: PaymentDto = {
      id: `payment-${nanoid(12)}`,
      invoiceId: id,
      amount: input.amount,
      currency: input.currency,
      paidAt: input.paidAt,
      method: input.method,
      reference: input.reference
    };
    const save = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO payments (id, invoice_id, amount, currency, paid_at, method, reference)
           VALUES (@id, @invoiceId, @amount, @currency, @paidAt, @method, @reference)`
        )
        .run(payment);
      const paid = this.sqlite
        .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE invoice_id = ?')
        .get(id) as { total: number };
      this.sqlite
        .prepare('UPDATE invoices SET status = ? WHERE id = ?')
        .run(Number(paid.total) >= invoice.total ? 'paid' : 'partially_paid', id);
    });
    save.immediate();
    return payment;
  }

  processReadyHandoffs(flightOperationId?: string) {
    const consume = this.sqlite.transaction(() => {
      const flightFilter = flightOperationId ? 'AND flight.id = @flightOperationId' : '';
      const statement = this.sqlite.prepare(
        `SELECT handoff.id, flight.id AS flightId, flight.customer_id AS customerId,
                  flight.estimated_revenue AS estimatedRevenue, flight.currency_code AS currencyCode
           FROM flight_finance_handoffs handoff
           JOIN finance_event_types event_type ON event_type.id = handoff.event_type_id
           JOIN finance_handoff_statuses handoff_status ON handoff_status.id = handoff.status_id
           JOIN flight_operations flight ON flight.id = handoff.flight_id
           JOIN flight_operation_statuses flight_status ON flight_status.id = flight.current_status_id
           WHERE event_type.code = 'FLIGHT_CLOSED_ELIGIBLE_FOR_INVOICE'
             AND handoff_status.code = 'READY'
             AND flight_status.code = 'CLOSED'
             ${flightFilter}`
      );
      const handoffs = (
        flightOperationId ? statement.all({ flightOperationId }) : statement.all()
      ) as Array<{
        id: string;
        flightId: string;
        customerId: string | null;
        estimatedRevenue: number | null;
        currencyCode: string;
      }>;
      if (handoffs.length === 0) return;
      const now = new Date();
      const issuedAt = now.toISOString();
      const due = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
      for (const handoff of handoffs) {
        const existingInvoice = this.sqlite
          .prepare('SELECT id FROM invoices WHERE flight_operation_id = ?')
          .get(handoff.flightId) as { id: string } | undefined;
        if (!existingInvoice) {
          if (!handoff.customerId || handoff.estimatedRevenue === null) {
            throw new Error(
              `FINANCE_HANDOFF_INCOMPLETE: ${handoff.flightId} requires customer and estimated revenue`
            );
          }
          const invoiceId = `invoice-${nanoid(12)}`;
          const tax = Math.round(handoff.estimatedRevenue * 0.11);
          this.sqlite
            .prepare(
              `INSERT INTO invoices (
                 id, customer_id, flight_operation_id, invoice_number, status, subtotal, tax,
                 total, currency, issued_at, due_at
               ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`
            )
            .run(
              invoiceId,
              handoff.customerId,
              handoff.flightId,
              `AMA-INV-${issuedAt.slice(0, 10).replaceAll('-', '')}-${handoff.flightId.slice(-6).toUpperCase()}`,
              handoff.estimatedRevenue,
              tax,
              handoff.estimatedRevenue + tax,
              handoff.currencyCode,
              issuedAt,
              due
            );
        }
        this.sqlite
          .prepare(
            `UPDATE flight_finance_handoffs
             SET status_id = 'finance-handoff-status-posted', updated_at = ?
             WHERE id = ?`
          )
          .run(issuedAt, handoff.id);
      }
    });
    if (this.sqlite.inTransaction) {
      consume();
      return;
    }
    consume.immediate();
  }

  private listPayments(invoiceId: string): PaymentDto[] {
    return this.sqlite
      .prepare(
        `SELECT id, invoice_id AS invoiceId, amount, currency, paid_at AS paidAt, method, reference
         FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC`
      )
      .all(invoiceId) as PaymentDto[];
  }

  private toSummary(row: InvoiceRow): InvoiceSummaryDto {
    return {
      id: row.id,
      flightOperationId: row.flightOperationId,
      invoiceNumber: row.invoiceNumber,
      status: row.status,
      subtotal: row.subtotal,
      tax: row.tax,
      total: row.total,
      currency: row.currency,
      issuedAt: row.issuedAt,
      dueAt: row.dueAt,
      customer: { id: row.customerId, name: row.customerName, contactEmail: row.customerEmail },
      flight: {
        id: row.flightOperationId,
        flightNumber: row.flightNumber,
        orderNumber: row.orderNumber,
        currentStatus: row.currentStatus,
        originCode: row.originCode,
        destinationCode: row.destinationCode,
        scheduledDepartureAt: row.scheduledDepartureAt,
        scheduledArrivalAt: row.scheduledArrivalAt
      }
    };
  }
}
