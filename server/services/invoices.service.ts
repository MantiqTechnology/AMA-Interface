import { nanoid } from 'nanoid';
import type { RecordPaymentBody } from '../../shared/contracts/invoices';
import type { Repositories } from '../repositories/interfaces';
import { notFound } from '../utils/errors';
import { mapInvoiceDetail, mapInvoiceSummary, mapPayment } from './mappers';

export class InvoicesService {
  constructor(private readonly repositories: Repositories) {}

  async listInvoices(query: { status?: string; limit: number; offset: number }) {
    const rows = await this.repositories.invoices.list(query);
    return await Promise.all(
      rows.map(async (invoice) => {
        const flight = await this.repositories.flights.getById(invoice.flightOrderId);
        if (!flight) throw notFound('Flight order', invoice.flightOrderId);
        return mapInvoiceSummary(invoice, flight);
      })
    );
  }

  async getInvoiceDetail(id: string) {
    const invoice = await this.repositories.invoices.getById(id);
    if (!invoice) {
      throw notFound('Invoice', id);
    }

    const [flight, payments] = await Promise.all([
      this.repositories.flights.getById(invoice.flightOrderId),
      this.repositories.invoices.listPayments(id)
    ]);
    if (!flight) {
      throw notFound('Flight order', invoice.flightOrderId);
    }

    return mapInvoiceDetail(invoice, flight, payments);
  }

  async recordPayment(id: string, input: RecordPaymentBody) {
    const invoice = await this.repositories.invoices.getById(id);
    if (!invoice) {
      throw notFound('Invoice', id);
    }

    const payment = await this.repositories.invoices.createPayment({
      id: nanoid(),
      invoiceId: id,
      amount: input.amount,
      currency: input.currency,
      paidAt: input.paidAt,
      method: input.method,
      reference: input.reference
    });

    const payments = await this.repositories.invoices.listPayments(id);
    const paid = payments.reduce((total, row) => total + row.amount, 0);
    await this.repositories.invoices.updateStatus(id, paid >= invoice.total ? 'paid' : 'partially_paid');

    await this.repositories.alerts.create({
      id: nanoid(),
      severity: 'info',
      title: 'Payment recorded',
      message: `${input.currency} ${input.amount.toLocaleString('id-ID')} applied to ${invoice.invoiceNumber}`,
      entityType: 'invoice',
      entityId: id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return mapPayment(payment);
  }
}
