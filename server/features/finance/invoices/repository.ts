import type Database from 'better-sqlite3';
import type {
  InvoiceFinanceSnapshotDto,
  InvoiceHandoffDto,
  InvoiceLineItemDto,
  InvoiceListQuery,
  InvoiceStatus,
  PaymentDto
} from '../../../../shared/features/finance/invoices';

export type InvoiceRow = {
  id: string;
  flightOperationId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  createdByUserId: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  paidAmount: number;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  paymentTermDays: number | null;
  flightNumber: string;
  orderNumber: string;
  currentStatus: string;
  originCode: string;
  destinationCode: string;
  scheduledDepartureAt: string | null;
  scheduledArrivalAt: string | null;
};

export type FlightBillingContext = {
  id: string;
  flightNumber: string;
  orderNumber: string;
  flightDate: string;
  flightType: string;
  currentStatus: string;
  customerId: string | null;
  estimatedRevenue: number | null;
  currencyCode: string;
  routeId: string;
  originStationId: string;
  destinationStationId: string;
  originCode: string;
  destinationCode: string;
  aircraftType: string | null;
};

export type RevenueSource = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  rateCardId: string | null;
  taxCodeId: string | null;
  taxCode: string | null;
  taxRateBasisPoints: number;
  taxAmount: number;
  total: number;
  currencyCode: string | null;
};

export type CostSource = {
  amount: number;
  currencyCode: string;
};

export type CharterTaxSnapshot = {
  rateCardId: string | null;
  taxCodeId: string | null;
  taxCode: string | null;
  taxRateBasisPoints: number;
  currencyCode: string | null;
};

const invoiceSelect = `
  SELECT invoice.id, invoice.flight_operation_id AS flightOperationId,
    invoice.invoice_number AS invoiceNumber, invoice.status, invoice.subtotal, invoice.tax,
    invoice.total, invoice.currency, invoice.created_by_user_id AS createdByUserId,
    invoice.approved_by_user_id AS approvedByUserId, invoice.approved_at AS approvedAt,
    invoice.issued_at AS issuedAt, invoice.due_at AS dueAt,
    invoice.created_at AS createdAt, invoice.updated_at AS updatedAt,
    COALESCE((SELECT SUM(payment.amount) FROM payments payment WHERE payment.invoice_id = invoice.id), 0) AS paidAmount,
    customer.id AS customerId, customer.account_name AS customerName,
    customer.email AS customerEmail, term.due_days AS paymentTermDays,
    flight.flight_number AS flightNumber, flight.order_number AS orderNumber,
    operation_status.code AS currentStatus, origin.station_code AS originCode,
    destination.station_code AS destinationCode,
    flight.scheduled_departure_at AS scheduledDepartureAt,
    flight.scheduled_arrival_at AS scheduledArrivalAt
  FROM invoices invoice
  JOIN customers customer ON customer.id = invoice.customer_id
  LEFT JOIN payment_terms term ON term.id = customer.payment_term_id
  JOIN flight_operations flight ON flight.id = invoice.flight_operation_id
  JOIN flight_operation_statuses operation_status ON operation_status.id = flight.current_status_id
  JOIN stations origin ON origin.id = flight.origin_station_id
  JOIN stations destination ON destination.id = flight.destination_station_id
`;

export class InvoiceRepository {
  constructor(private readonly sqlite: Database.Database) {}

  upsertClosureHandoff(
    id: string,
    flightId: string,
    status: 'READY' | 'POSTED',
    timestamp: string
  ) {
    const existing = this.sqlite
      .prepare(
        `SELECT handoff.id
         FROM flight_finance_handoffs handoff
         JOIN finance_event_types event ON event.id = handoff.event_type_id
         WHERE handoff.flight_id = ? AND handoff.source_type = 'flight'
           AND handoff.source_id = ? AND event.code = 'FLIGHT_CLOSED_ELIGIBLE_FOR_INVOICE'`
      )
      .get(flightId, flightId) as { id: string } | undefined;
    const statusId = this.sqlite
      .prepare('SELECT id FROM finance_handoff_statuses WHERE code = ?')
      .pluck()
      .get(status) as string;
    if (existing) {
      this.sqlite
        .prepare(
          `UPDATE flight_finance_handoffs
           SET status_id = ?, summary = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          statusId,
          'Closed flight is eligible for finance invoice workflow.',
          timestamp,
          existing.id
        );
      return;
    }
    const eventTypeId = this.sqlite
      .prepare(
        "SELECT id FROM finance_event_types WHERE code = 'FLIGHT_CLOSED_ELIGIBLE_FOR_INVOICE'"
      )
      .pluck()
      .get() as string;
    this.sqlite
      .prepare(
        `INSERT INTO flight_finance_handoffs (
           id, flight_id, source_type, source_id, event_type_id, status_id, summary,
           amount, currency_id, created_at, updated_at
         ) VALUES (?, ?, 'flight', ?, ?, ?, ?, NULL, NULL, ?, ?)`
      )
      .run(
        id,
        flightId,
        flightId,
        eventTypeId,
        statusId,
        'Closed flight is eligible for finance invoice workflow.',
        timestamp,
        timestamp
      );
  }

  list(query: InvoiceListQuery): InvoiceRow[] {
    const conditions: string[] = [];
    const parameters: Record<string, unknown> = { limit: query.limit, offset: query.offset };
    if (query.status) {
      conditions.push('invoice.status = @status');
      parameters.status = query.status;
    }
    if (query.customerId) {
      conditions.push('invoice.customer_id = @customerId');
      parameters.customerId = query.customerId;
    }
    if (query.flightId) {
      conditions.push('invoice.flight_operation_id = @flightId');
      parameters.flightId = query.flightId;
    }
    if (query.due === 'upcoming') {
      conditions.push(
        "invoice.due_at IS NOT NULL AND julianday(invoice.due_at) >= julianday('now')"
      );
    }
    if (query.due === 'overdue') {
      conditions.push(
        "invoice.due_at IS NOT NULL AND julianday(invoice.due_at) < julianday('now') AND invoice.status NOT IN ('paid', 'void')"
      );
    }
    if (query.search) {
      conditions.push(
        '(invoice.invoice_number LIKE @search OR flight.flight_number LIKE @search OR flight.order_number LIKE @search OR customer.account_name LIKE @search)'
      );
      parameters.search = `%${query.search}%`;
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return this.sqlite
      .prepare(
        `${invoiceSelect} ${where}
         ORDER BY invoice.created_at DESC, invoice.invoice_number DESC
         LIMIT @limit OFFSET @offset`
      )
      .all(parameters) as InvoiceRow[];
  }

  get(id: string): InvoiceRow | null {
    return (
      (this.sqlite.prepare(`${invoiceSelect} WHERE invoice.id = ?`).get(id) as
        InvoiceRow | undefined) ?? null
    );
  }

  getByFlight(flightId: string): InvoiceRow | null {
    return (
      (this.sqlite
        .prepare(`${invoiceSelect} WHERE invoice.flight_operation_id = ?`)
        .get(flightId) as InvoiceRow | undefined) ?? null
    );
  }

  flightContext(flightId: string): FlightBillingContext | null {
    return (
      (this.sqlite
        .prepare(
          `SELECT flight.id, flight.flight_number AS flightNumber,
                  flight.order_number AS orderNumber, flight.flight_date AS flightDate,
                  flight_type.code AS flightType, status.code AS currentStatus,
                  flight.customer_id AS customerId, flight.estimated_revenue AS estimatedRevenue,
                  flight.currency_code AS currencyCode, flight.route_id AS routeId,
                  flight.origin_station_id AS originStationId,
                  flight.destination_station_id AS destinationStationId,
                  origin.station_code AS originCode, destination.station_code AS destinationCode,
                  aircraft.aircraft_type AS aircraftType
           FROM flight_operations flight
           JOIN flight_types flight_type ON flight_type.id = flight.flight_type_id
           JOIN flight_operation_statuses status ON status.id = flight.current_status_id
           JOIN stations origin ON origin.id = flight.origin_station_id
           JOIN stations destination ON destination.id = flight.destination_station_id
           LEFT JOIN aircraft aircraft ON aircraft.id = flight.aircraft_id
           WHERE flight.id = ?`
        )
        .get(flightId) as FlightBillingContext | undefined) ?? null
    );
  }

  passengerRevenue(flightId: string): RevenueSource[] {
    return this.sqlite
      .prepare(
        `SELECT ticket.id,
                'Passenger ' || ticket.passenger_name || ' (' || ticket.id || ')' AS description,
                1 AS quantity, ticket.ticket_price AS unitPrice,
                ticket.ticket_price AS subtotal, ticket.rate_card_id AS rateCardId,
                ticket.tax_code_id AS taxCodeId, ticket.tax_code AS taxCode,
                ticket.tax_rate_basis_points AS taxRateBasisPoints,
                ticket.tax_amount AS taxAmount, ticket.total_amount AS total,
                ticket.currency_code AS currencyCode
         FROM passenger_tickets ticket
         WHERE ticket.flight_operation_id = ?
           AND ticket.ticket_status = 'ACTIVE'
           AND ticket.payment_status = 'PAID'
           AND NOT EXISTS (
             SELECT 1 FROM ticketing_refund_requests refund
             WHERE refund.passenger_ticket_id = ticket.id AND refund.status = 'APPROVED'
           )
         ORDER BY ticket.id`
      )
      .all(flightId) as RevenueSource[];
  }

  cargoRevenue(flightId: string): RevenueSource[] {
    return this.sqlite
      .prepare(
        `SELECT booking.id,
                'Cargo ' || booking.description || ' (' || booking.id || ')' AS description,
                booking.chargeable_weight_kg AS quantity, booking.tariff_rate AS unitPrice,
                booking.total_tariff AS subtotal, booking.rate_card_id AS rateCardId,
                booking.tax_code_id AS taxCodeId, booking.tax_code AS taxCode,
                booking.tax_rate_basis_points AS taxRateBasisPoints,
                booking.tax_amount AS taxAmount, booking.total_amount AS total,
                booking.currency_code AS currencyCode
         FROM cargo_bookings booking
         WHERE booking.flight_operation_id = ?
           AND booking.payment_status = 'PAID'
           AND booking.status IN ('BOOKED', 'DELIVERED')
           AND NOT EXISTS (
             SELECT 1 FROM ticketing_refund_requests refund
             WHERE refund.cargo_booking_id = booking.id AND refund.status = 'APPROVED'
           )
         ORDER BY booking.id`
      )
      .all(flightId) as RevenueSource[];
  }

  charterTax(flight: FlightBillingContext): CharterTaxSnapshot {
    return (
      (this.sqlite
        .prepare(
          `SELECT rate.id AS rateCardId, rate.tax_code_id AS taxCodeId,
                  tax.tax_code AS taxCode,
                  COALESCE(tax.tax_rate_basis_points, 0) AS taxRateBasisPoints,
                  currency.currency_code AS currencyCode
           FROM rate_cards rate
           JOIN currencies currency ON currency.id = rate.currency_id
           LEFT JOIN tax_codes tax ON tax.id = rate.tax_code_id
           WHERE rate.is_active = 1
             AND rate.service_type = 'CHARTER'
             AND rate.origin_station_id = @originStationId
             AND rate.destination_station_id = @destinationStationId
             AND rate.effective_from <= @flightDate
             AND (rate.effective_to IS NULL OR rate.effective_to >= @flightDate)
             AND (rate.customer_id IS NULL OR rate.customer_id = @customerId)
             AND (rate.aircraft_type IS NULL OR rate.aircraft_type = @aircraftType)
           ORDER BY CASE WHEN rate.customer_id IS NOT NULL THEN 0 ELSE 1 END,
                    CASE WHEN rate.aircraft_type IS NOT NULL THEN 0 ELSE 1 END,
                    rate.rate_priority ASC, rate.effective_from DESC
           LIMIT 1`
        )
        .get({
          originStationId: flight.originStationId,
          destinationStationId: flight.destinationStationId,
          customerId: flight.customerId,
          aircraftType: flight.aircraftType,
          flightDate: flight.flightDate
        }) as CharterTaxSnapshot | undefined) ?? {
        rateCardId: null,
        taxCodeId: null,
        taxCode: null,
        taxRateBasisPoints: 0,
        currencyCode: null
      }
    );
  }

  fuelCosts(flightId: string): CostSource[] {
    return this.sqlite
      .prepare(
        `SELECT request.total_cost AS amount, currency.currency_code AS currencyCode
         FROM flight_fuel_requests request
         JOIN fuel_workflow_statuses status ON status.id = request.status_id
         JOIN currencies currency ON currency.id = request.currency_id
         WHERE request.flight_id = ? AND status.code = 'POSTED' AND request.total_cost IS NOT NULL`
      )
      .all(flightId) as CostSource[];
  }

  stationCosts(flightId: string): CostSource[] {
    return this.sqlite
      .prepare(
        `SELECT cost.amount, currency.currency_code AS currencyCode
         FROM flight_station_costs cost
         JOIN station_cost_statuses status ON status.id = cost.status_id
         JOIN currencies currency ON currency.id = cost.currency_id
         WHERE cost.flight_id = ? AND status.code = 'APPROVED'`
      )
      .all(flightId) as CostSource[];
  }

  maintenanceCosts(flightId: string): CostSource[] {
    return this.sqlite
      .prepare(
        `SELECT handoff.maintenance_cost AS amount, currency.currency_code AS currencyCode
         FROM flight_maintenance_handoffs handoff
         JOIN flight_operations flight ON flight.id = handoff.flight_id
         JOIN maintenance_handoff_statuses status ON status.id = handoff.status_id
         JOIN currencies currency ON currency.id = handoff.currency_id
         WHERE handoff.flight_id = ? AND handoff.aircraft_id = flight.aircraft_id
           AND status.code IN ('APPROVED', 'POSTED')`
      )
      .all(flightId) as CostSource[];
  }

  createInvoice(input: {
    id: string;
    customerId: string;
    flightId: string;
    invoiceNumber: string;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    actorId: string;
    timestamp: string;
  }) {
    this.sqlite
      .prepare(
        `INSERT INTO invoices (
           id, customer_id, flight_operation_id, invoice_number, status, subtotal, tax, total,
           currency, created_by_user_id, created_at, updated_at
         ) VALUES (@id, @customerId, @flightId, @invoiceNumber, 'draft', @subtotal, @tax, @total,
           @currency, @actorId, @timestamp, @timestamp)`
      )
      .run(input);
  }

  createLine(invoiceId: string, line: InvoiceLineItemDto) {
    this.sqlite
      .prepare(
        `INSERT INTO invoice_line_items (
           id, invoice_id, source_type, source_id, description, quantity, unit_price, subtotal,
           rate_card_id, tax_code_id, tax_code, tax_rate_basis_points, tax_amount, total
         ) VALUES (@id, @invoiceId, @sourceType, @sourceId, @description, @quantity, @unitPrice,
           @subtotal, @rateCardId, @taxCodeId, @taxCode, @taxRateBasisPoints, @taxAmount, @total)`
      )
      .run({ invoiceId, ...line });
  }

  createSnapshot(
    id: string,
    invoiceId: string,
    flightId: string,
    snapshot: InvoiceFinanceSnapshotDto
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO invoice_finance_snapshots (
           id, invoice_id, flight_operation_id, ticket_revenue, cargo_revenue, charter_revenue,
           total_revenue, fuel_cost, station_cost, maintenance_cost, total_operational_cost,
           tax_amount, invoice_total, gross_margin, currency_code, captured_at
         ) VALUES (@id, @invoiceId, @flightId, @ticketRevenue, @cargoRevenue, @charterRevenue,
           @totalRevenue, @fuelCost, @stationCost, @maintenanceCost, @totalOperationalCost,
           @taxAmount, @invoiceTotal, @grossMargin, @currencyCode, @capturedAt)`
      )
      .run({ id, invoiceId, flightId, ...snapshot });
  }

  markReadyHandoffsPosted(flightId: string, timestamp: string) {
    this.sqlite
      .prepare(
        `UPDATE flight_finance_handoffs
         SET status_id = 'finance-handoff-status-posted', updated_at = ?
         WHERE flight_id = ? AND status_id = 'finance-handoff-status-ready'`
      )
      .run(timestamp, flightId);
  }

  readyClosedFlights(): string[] {
    return (
      this.sqlite
        .prepare(
          `SELECT DISTINCT handoff.flight_id AS flightId
           FROM flight_finance_handoffs handoff
           JOIN finance_event_types event ON event.id = handoff.event_type_id
           JOIN finance_handoff_statuses status ON status.id = handoff.status_id
           JOIN flight_operations flight ON flight.id = handoff.flight_id
           JOIN flight_operation_statuses flight_status ON flight_status.id = flight.current_status_id
           WHERE event.code = 'FLIGHT_CLOSED_ELIGIBLE_FOR_INVOICE'
             AND status.code = 'READY' AND flight_status.code = 'CLOSED'`
        )
        .all() as Array<{ flightId: string }>
    ).map((row) => row.flightId);
  }

  lineItems(invoiceId: string): InvoiceLineItemDto[] {
    return this.sqlite
      .prepare(
        `SELECT id, source_type AS sourceType, source_id AS sourceId, description, quantity,
                unit_price AS unitPrice, subtotal, rate_card_id AS rateCardId,
                tax_code_id AS taxCodeId, tax_code AS taxCode,
                tax_rate_basis_points AS taxRateBasisPoints, tax_amount AS taxAmount, total
         FROM invoice_line_items WHERE invoice_id = ? ORDER BY source_type, id`
      )
      .all(invoiceId) as InvoiceLineItemDto[];
  }

  snapshot(invoiceId: string): InvoiceFinanceSnapshotDto | null {
    return (
      (this.sqlite
        .prepare(
          `SELECT ticket_revenue AS ticketRevenue, cargo_revenue AS cargoRevenue,
                  charter_revenue AS charterRevenue, total_revenue AS totalRevenue,
                  fuel_cost AS fuelCost, station_cost AS stationCost,
                  maintenance_cost AS maintenanceCost,
                  total_operational_cost AS totalOperationalCost, tax_amount AS taxAmount,
                  invoice_total AS invoiceTotal, gross_margin AS grossMargin,
                  currency_code AS currencyCode, captured_at AS capturedAt
           FROM invoice_finance_snapshots WHERE invoice_id = ?`
        )
        .get(invoiceId) as InvoiceFinanceSnapshotDto | undefined) ?? null
    );
  }

  payments(invoiceId: string): PaymentDto[] {
    return this.sqlite
      .prepare(
        `SELECT id, invoice_id AS invoiceId, amount, currency, paid_at AS paidAt, method, reference
         FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC`
      )
      .all(invoiceId) as PaymentDto[];
  }

  handoffs(flightId: string): InvoiceHandoffDto[] {
    return this.sqlite
      .prepare(
        `SELECT handoff.id, handoff.source_type AS sourceType, handoff.source_id AS sourceId,
                event.code AS eventType, status.code AS status, handoff.summary, handoff.amount,
                currency.currency_code AS currencyCode, handoff.created_at AS createdAt,
                handoff.updated_at AS updatedAt
         FROM flight_finance_handoffs handoff
         JOIN finance_event_types event ON event.id = handoff.event_type_id
         JOIN finance_handoff_statuses status ON status.id = handoff.status_id
         LEFT JOIN currencies currency ON currency.id = handoff.currency_id
         WHERE handoff.flight_id = ? ORDER BY handoff.created_at, handoff.id`
      )
      .all(flightId) as InvoiceHandoffDto[];
  }

  approve(id: string, actorId: string, issuedAt: string, dueAt: string) {
    return this.sqlite
      .prepare(
        `UPDATE invoices SET status = 'issued', approved_by_user_id = ?, approved_at = ?,
             issued_at = ?, due_at = ?, updated_at = ?
         WHERE id = ? AND status = 'draft'`
      )
      .run(actorId, issuedAt, issuedAt, dueAt, issuedAt, id);
  }

  insertPayment(payment: PaymentDto) {
    this.sqlite
      .prepare(
        `INSERT INTO payments (id, invoice_id, amount, currency, paid_at, method, reference)
         VALUES (@id, @invoiceId, @amount, @currency, @paidAt, @method, @reference)`
      )
      .run(payment);
  }

  updatePaymentStatus(id: string, status: InvoiceStatus, timestamp: string) {
    this.sqlite
      .prepare('UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, timestamp, id);
  }
}
