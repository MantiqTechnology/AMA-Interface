import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';
import type {
  InvoiceDetailDto,
  InvoiceFinanceSnapshotDto,
  InvoiceLineItemDto,
  InvoiceListQuery,
  InvoiceSummaryDto,
  PaymentDto,
  RecordPaymentBody
} from '../../../../shared/features/finance/invoices';
import { DomainError, notFound } from '../../../utils/errors';
import {
  InvoiceRepository,
  type FlightBillingContext,
  type InvoiceRow,
  type RevenueSource
} from './repository';

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export class InvoiceService {
  constructor(
    private readonly sqlite: Database.Database,
    private readonly repository: InvoiceRepository
  ) {}

  list(query: InvoiceListQuery): InvoiceSummaryDto[] {
    return this.repository.list(query).map((row) => this.toSummary(row));
  }

  get(id: string): InvoiceDetailDto {
    const row = this.repository.get(id);
    if (!row) throw notFound('Invoice', id);
    return {
      ...this.toSummary(row),
      lineItems: this.repository.lineItems(id),
      payments: this.repository.payments(id),
      handoffs: this.repository.handoffs(row.flightOperationId)
    };
  }

  finalizeClosedFlight(flightId: string, actorId: string): InvoiceDetailDto {
    const finalize = () => {
      const existing = this.repository.getByFlight(flightId);
      const handoffTimestamp = new Date().toISOString();
      if (existing) {
        this.repository.upsertClosureHandoff(
          `invoice-handoff-${nanoid(10)}`,
          flightId,
          'POSTED',
          handoffTimestamp
        );
        return this.get(existing.id);
      }

      const flight = this.repository.flightContext(flightId);
      if (!flight) throw notFound('Flight operation', flightId);
      if (flight.currentStatus !== 'CLOSED') {
        throw new DomainError(
          'FINANCE_FLIGHT_NOT_CLOSED',
          'Only a closed flight can be finalized for invoicing.',
          409
        );
      }
      if (!flight.customerId) {
        throw new DomainError(
          'FINANCE_BILLING_CUSTOMER_REQUIRED',
          'A billing customer is required before invoice finalization.',
          422
        );
      }
      this.repository.upsertClosureHandoff(
        `invoice-handoff-${nanoid(10)}`,
        flightId,
        'READY',
        handoffTimestamp
      );

      const passengerSources = this.repository.passengerRevenue(flightId);
      const cargoSources = this.repository.cargoRevenue(flightId);
      const lines = this.revenueLines(flight, passengerSources, cargoSources);
      const fuelSources = this.repository.fuelCosts(flightId);
      const stationSources = this.repository.stationCosts(flightId);
      const maintenanceSources = this.repository.maintenanceCosts(flightId);
      this.assertCurrency(flight.currencyCode, [
        ...passengerSources.filter(
          (source): source is RevenueSource & { currencyCode: string } =>
            source.currencyCode !== null
        ),
        ...cargoSources.filter(
          (source): source is RevenueSource & { currencyCode: string } =>
            source.currencyCode !== null
        ),
        ...fuelSources,
        ...stationSources,
        ...maintenanceSources
      ]);

      const ticketRevenue = sum(
        lines.filter((line) => line.sourceType === 'PASSENGER_TICKET').map((line) => line.subtotal)
      );
      const cargoRevenue = sum(
        lines.filter((line) => line.sourceType === 'CARGO_BOOKING').map((line) => line.subtotal)
      );
      const charterRevenue = sum(
        lines.filter((line) => line.sourceType === 'CHARTER').map((line) => line.subtotal)
      );
      const fuelCost = sum(fuelSources.map((source) => source.amount));
      const stationCost = sum(stationSources.map((source) => source.amount));
      const maintenanceCost = sum(maintenanceSources.map((source) => source.amount));
      const totalRevenue = ticketRevenue + cargoRevenue + charterRevenue;
      const totalOperationalCost = fuelCost + stationCost + maintenanceCost;
      const taxAmount = sum(lines.map((line) => line.taxAmount));
      const invoiceTotal = totalRevenue + taxAmount;
      const timestamp = handoffTimestamp;
      const invoiceId = `invoice-${nanoid(12)}`;
      const snapshot: InvoiceFinanceSnapshotDto = {
        ticketRevenue,
        cargoRevenue,
        charterRevenue,
        totalRevenue,
        fuelCost,
        stationCost,
        maintenanceCost,
        totalOperationalCost,
        taxAmount,
        invoiceTotal,
        grossMargin: totalRevenue - totalOperationalCost,
        currencyCode: flight.currencyCode,
        capturedAt: timestamp
      };

      this.repository.createInvoice({
        id: invoiceId,
        customerId: flight.customerId,
        flightId,
        invoiceNumber: this.invoiceNumber(flight),
        subtotal: totalRevenue,
        tax: taxAmount,
        total: invoiceTotal,
        currency: flight.currencyCode,
        actorId,
        timestamp
      });
      for (const line of lines) this.repository.createLine(invoiceId, line);
      this.repository.createSnapshot(
        `invoice-snapshot-${nanoid(10)}`,
        invoiceId,
        flightId,
        snapshot
      );
      this.repository.markReadyHandoffsPosted(flightId, timestamp);
      return this.get(invoiceId);
    };

    if (this.sqlite.inTransaction) return finalize();
    return this.sqlite.transaction(finalize).immediate();
  }

  processReadyHandoffs(flightId?: string, actorId = 'SYSTEM-FINANCE-HANDOFF') {
    if (flightId) return [this.finalizeClosedFlight(flightId, actorId)];
    return this.repository
      .readyClosedFlights()
      .map((readyFlightId) => this.finalizeClosedFlight(readyFlightId, actorId));
  }

  approve(id: string, actorId: string): InvoiceDetailDto {
    const approve = () => {
      const invoice = this.repository.get(id);
      if (!invoice) throw notFound('Invoice', id);
      if (invoice.status !== 'draft') {
        throw new DomainError('INVOICE_NOT_DRAFT', 'Only a draft invoice can be approved.', 409);
      }
      if (invoice.createdByUserId === actorId) {
        throw new DomainError(
          'INVOICE_SELF_APPROVAL_FORBIDDEN',
          'The invoice creator cannot approve the same invoice.',
          403
        );
      }
      const issuedAt = new Date();
      const dueAt = new Date(
        issuedAt.getTime() + (invoice.paymentTermDays ?? 14) * 24 * 60 * 60 * 1000
      );
      const result = this.repository.approve(
        id,
        actorId,
        issuedAt.toISOString(),
        dueAt.toISOString()
      );
      if (result.changes !== 1) {
        throw new DomainError('INVOICE_APPROVAL_CONFLICT', 'Invoice approval conflicted.', 409);
      }
      return this.get(id);
    };
    if (this.sqlite.inTransaction) return approve();
    return this.sqlite.transaction(approve).immediate();
  }

  recordPayment(id: string, input: RecordPaymentBody): PaymentDto {
    const save = this.sqlite.transaction(() => {
      const invoice = this.repository.get(id);
      if (!invoice) throw notFound('Invoice', id);
      if (!['issued', 'partially_paid', 'overdue'].includes(invoice.status)) {
        throw new DomainError(
          'INVOICE_NOT_PAYABLE',
          'Only an issued invoice with an outstanding balance can receive payment.',
          409
        );
      }
      const currency = input.currency.toUpperCase();
      if (currency !== invoice.currency) {
        throw new DomainError(
          'FINANCE_CURRENCY_MISMATCH',
          `Payment currency ${currency} does not match invoice currency ${invoice.currency}.`,
          422
        );
      }
      const balance = Math.max(invoice.total - invoice.paidAmount, 0);
      if (input.amount > balance) {
        throw new DomainError(
          'INVOICE_PAYMENT_EXCEEDS_BALANCE',
          'Payment cannot exceed the current invoice balance.',
          422,
          { balance, amount: input.amount }
        );
      }
      const payment: PaymentDto = {
        id: `payment-${nanoid(12)}`,
        invoiceId: id,
        amount: input.amount,
        currency,
        paidAt: input.paidAt,
        method: input.method,
        reference: input.reference
      };
      this.repository.insertPayment(payment);
      const paidAmount = invoice.paidAmount + input.amount;
      this.repository.updatePaymentStatus(
        id,
        paidAmount >= invoice.total ? 'paid' : 'partially_paid',
        input.paidAt
      );
      return payment;
    });
    return save.immediate();
  }

  private revenueLines(
    flight: FlightBillingContext,
    passengerSources: RevenueSource[],
    cargoSources: RevenueSource[]
  ): InvoiceLineItemDto[] {
    const sources = [
      ...passengerSources.map((source) => this.sourceLine('PASSENGER_TICKET', source)),
      ...cargoSources.map((source) => this.sourceLine('CARGO_BOOKING', source))
    ];
    if (sources.length) return sources;
    if (flight.estimatedRevenue === null) {
      throw new DomainError(
        'FINANCE_REVENUE_REQUIRED',
        'No eligible paid revenue or contract estimate is available for invoicing.',
        422
      );
    }
    const tax = this.repository.charterTax(flight);
    if (tax.currencyCode && tax.currencyCode !== flight.currencyCode) {
      throw new DomainError(
        'FINANCE_CURRENCY_MISMATCH',
        `Rate card currency ${tax.currencyCode} does not match flight currency ${flight.currencyCode}.`,
        422
      );
    }
    const taxAmount = Math.round((flight.estimatedRevenue * tax.taxRateBasisPoints) / 10_000);
    return [
      {
        id: `invoice-line-${nanoid(10)}`,
        sourceType: 'CHARTER',
        sourceId: flight.id,
        description: `${flight.flightType === 'CHARTER' ? 'Charter' : 'Contract'} ${flight.flightNumber} ${flight.originCode} -> ${flight.destinationCode}`,
        quantity: 1,
        unitPrice: flight.estimatedRevenue,
        subtotal: flight.estimatedRevenue,
        rateCardId: tax.rateCardId,
        taxCodeId: tax.taxCodeId,
        taxCode: tax.taxCode,
        taxRateBasisPoints: tax.taxRateBasisPoints,
        taxAmount,
        total: flight.estimatedRevenue + taxAmount
      }
    ];
  }

  private sourceLine(
    sourceType: 'PASSENGER_TICKET' | 'CARGO_BOOKING',
    source: RevenueSource
  ): InvoiceLineItemDto {
    const calculatedTax = Math.round((source.subtotal * source.taxRateBasisPoints) / 10_000);
    if (source.taxAmount !== calculatedTax || source.total !== source.subtotal + source.taxAmount) {
      throw new DomainError(
        'FINANCE_PRICING_SNAPSHOT_INVALID',
        `Pricing snapshot for ${source.id} is inconsistent.`,
        422
      );
    }
    return {
      id: `invoice-line-${nanoid(10)}`,
      sourceType,
      sourceId: source.id,
      description: source.description,
      quantity: source.quantity,
      unitPrice: source.unitPrice,
      subtotal: source.subtotal,
      rateCardId: source.rateCardId,
      taxCodeId: source.taxCodeId,
      taxCode: source.taxCode,
      taxRateBasisPoints: source.taxRateBasisPoints,
      taxAmount: source.taxAmount,
      total: source.total
    };
  }

  private assertCurrency(currency: string, sources: Array<{ currencyCode: string }>) {
    const mismatch = sources.find((source) => source.currencyCode !== currency);
    if (mismatch) {
      throw new DomainError(
        'FINANCE_CURRENCY_MISMATCH',
        `Operational cost currency ${mismatch.currencyCode} does not match flight currency ${currency}.`,
        422,
        { flightCurrency: currency, sourceCurrency: mismatch.currencyCode }
      );
    }
  }

  private invoiceNumber(flight: FlightBillingContext) {
    const date = flight.flightDate.replaceAll('-', '');
    const number = flight.flightNumber.replaceAll(/[^A-Z0-9]/giu, '').toUpperCase();
    return `AMA-INV-${date}-${number}`;
  }

  private toSummary(row: InvoiceRow): InvoiceSummaryDto {
    const finance = this.repository.snapshot(row.id);
    if (!finance) {
      throw new DomainError(
        'INVOICE_SNAPSHOT_MISSING',
        `Invoice ${row.id} has no finance snapshot.`,
        500
      );
    }
    return {
      id: row.id,
      flightOperationId: row.flightOperationId,
      invoiceNumber: row.invoiceNumber,
      status: row.status,
      subtotal: row.subtotal,
      tax: row.tax,
      total: row.total,
      currency: row.currency,
      createdByUserId: row.createdByUserId,
      approvedByUserId: row.approvedByUserId,
      approvedAt: row.approvedAt,
      issuedAt: row.issuedAt,
      dueAt: row.dueAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      paidAmount: row.paidAmount,
      balanceDue: Math.max(row.total - row.paidAmount, 0),
      customer: {
        id: row.customerId,
        name: row.customerName,
        contactEmail: row.customerEmail
      },
      flight: {
        id: row.flightOperationId,
        flightNumber: row.flightNumber,
        orderNumber: row.orderNumber,
        currentStatus: row.currentStatus,
        originCode: row.originCode,
        destinationCode: row.destinationCode,
        scheduledDepartureAt: row.scheduledDepartureAt,
        scheduledArrivalAt: row.scheduledArrivalAt
      },
      finance
    };
  }
}
