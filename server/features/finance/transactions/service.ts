import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';
import type { DemoRole } from '../../../../shared/types/roles';
import type {
  CustomerReceiptDto,
  PaymentRequestDto,
  SettlementStatus,
  SupplierInvoiceDto
} from '../../../../shared/features/finance/transactions';
import type { AccountingService, CanonicalAccountingInput } from '../accounting/service';
import type { ApprovalAuthorityService } from '../approvals/service';
import { DomainError } from '../../../utils/errors';
import { FinanceAuditService } from '../audit/service';

type SqlRow = Record<string, unknown>;
const num = (value: unknown) => Number(value ?? 0);
const str = (value: unknown) => (value === null || value === undefined ? null : String(value));
const dateOnly = (value: string) => value.slice(0, 10);

export class FinanceTransactionsService {
  private readonly audit: FinanceAuditService;

  constructor(
    private readonly sqlite: Database.Database,
    private readonly accounting: AccountingService,
    private readonly approvals: ApprovalAuthorityService,
    private readonly now: () => string
  ) {
    this.audit = new FinanceAuditService(sqlite, now);
  }

  createReceipt(input: {
    customerId: string;
    receiptDate: string;
    currencyCode: string;
    amountMinor: number;
    paymentMethod: string;
    cashBankAccountId: string;
    reference: string;
    evidenceDocumentId?: string | null;
    createdBy: string;
  }): CustomerReceiptDto {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new DomainError(
        'INVALID_FINANCIAL_AMOUNT',
        'Receipt amount must be a positive integer.',
        422
      );
    }
    const account = this.sqlite
      .prepare('SELECT currency_code FROM cash_bank_accounts WHERE id = ? AND is_active = 1')
      .get(input.cashBankAccountId) as { currency_code: string } | undefined;
    if (!account)
      throw new DomainError(
        'CASH_BANK_ACCOUNT_NOT_FOUND',
        'Cash/bank account is unavailable.',
        422
      );
    if (account.currency_code !== input.currencyCode) {
      throw new DomainError(
        'FINANCE_CURRENCY_MISMATCH',
        'Receipt and cash/bank currencies differ.',
        422
      );
    }
    const id = `receipt-${nanoid(12)}`;
    const timestamp = this.now();
    this.sqlite
      .prepare(
        `INSERT INTO customer_receipts (
          id, receipt_number, customer_id, receipt_date, currency_code, amount_minor,
          payment_method, cash_bank_account_id, reference, evidence_document_id,
          status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNALLOCATED', ?, ?, ?)`
      )
      .run(
        id,
        this.nextNumber('RCT', 'customer_receipts'),
        input.customerId,
        input.receiptDate,
        input.currencyCode,
        input.amountMinor,
        input.paymentMethod,
        input.cashBankAccountId,
        input.reference,
        input.evidenceDocumentId ?? null,
        input.createdBy,
        timestamp,
        timestamp
      );
    this.audit.record({
      actorId: input.createdBy,
      action: 'CUSTOMER_RECEIPT_CREATED',
      entityType: 'CUSTOMER_RECEIPT',
      entityId: id,
      sourceReference: input.reference
    });
    return this.getReceipt(id);
  }

  listReceipts(limit = 100): CustomerReceiptDto[] {
    return (
      this.sqlite
        .prepare(
          'SELECT id FROM customer_receipts ORDER BY receipt_date DESC, receipt_number DESC LIMIT ?'
        )
        .all(limit) as Array<{ id: string }>
    ).map((row) => this.getReceipt(row.id));
  }

  listSupplierInvoices(limit = 100): SupplierInvoiceDto[] {
    return (
      this.sqlite
        .prepare(
          'SELECT id FROM supplier_invoices ORDER BY invoice_date DESC, invoice_number DESC LIMIT ?'
        )
        .all(limit) as Array<{ id: string }>
    ).map((row) => this.getSupplierInvoice(row.id));
  }

  listPaymentRequests(limit = 100): PaymentRequestDto[] {
    return (
      this.sqlite
        .prepare(
          'SELECT id FROM supplier_payment_requests ORDER BY created_at DESC, request_number DESC LIMIT ?'
        )
        .all(limit) as Array<{ id: string }>
    ).map((row) => this.getPaymentRequest(row.id));
  }

  allocateReceipt(receiptId: string, invoiceId: string, amountMinor: number, actorId: string) {
    const allocate = () => {
      const receipt = this.receiptRow(receiptId);
      const invoice = this.invoiceRow(invoiceId);
      if (receipt.customer_id !== invoice.customer_id) {
        throw new DomainError('AR_CUSTOMER_MISMATCH', 'Receipt and invoice customers differ.', 422);
      }
      if (receipt.currency_code !== invoice.currency) {
        throw new DomainError(
          'FINANCE_CURRENCY_MISMATCH',
          'Receipt and invoice currencies differ.',
          422
        );
      }
      if (invoice.recognition_mode !== 'AR_ON_ISSUE') {
        throw new DomainError(
          'INVOICE_NOT_RECEIVABLE',
          'Billing-only invoices do not form AR.',
          409
        );
      }
      const receiptRemaining = num(receipt.amount_minor) - this.receiptAllocated(receiptId);
      const invoiceRemaining = num(invoice.total) - this.invoiceAllocated(invoiceId);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        throw new DomainError(
          'INVALID_FINANCIAL_AMOUNT',
          'Allocation must be a positive integer.',
          422
        );
      }
      if (amountMinor > receiptRemaining) {
        throw new DomainError(
          'RECEIPT_AMOUNT_EXCEEDED',
          'Allocation exceeds unallocated receipt amount.',
          422
        );
      }
      if (amountMinor > invoiceRemaining) {
        throw new DomainError(
          'INVOICE_AMOUNT_EXCEEDED',
          'Allocation exceeds invoice outstanding amount.',
          422
        );
      }
      const id = `ar-allocation-${nanoid(12)}`;
      const timestamp = this.now();
      this.sqlite
        .prepare(
          `INSERT INTO ar_allocations (
            id, receipt_id, invoice_id, amount_minor, status, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'PROCESSING', ?, ?, ?)`
        )
        .run(id, receiptId, invoiceId, amountMinor, actorId, timestamp, timestamp);
      const result = this.accounting.postCanonicalEvent(
        this.event({
          eventType: 'CUSTOMER_RECEIPT_ALLOCATED',
          sourceType: 'AR_ALLOCATION',
          sourceId: id,
          date: String(receipt.receipt_date),
          amountMinor,
          currencyCode: String(receipt.currency_code),
          flightId: str(invoice.flight_operation_id),
          payload: {
            receiptId,
            invoiceId,
            cashBankAccountId: receipt.cash_bank_account_id,
            reference: receipt.reference
          },
          memo: `Allocate receipt ${String(receipt.receipt_number)} to invoice ${String(invoice.invoice_number)}`
        }),
        actorId
      );
      if (result.journalStatus !== 'POSTED' || !result.journalEntryId) {
        this.sqlite
          .prepare(
            "UPDATE ar_allocations SET status = 'EXCEPTION', accounting_event_id = ?, updated_at = ? WHERE id = ?"
          )
          .run(result.accountingEventId, this.now(), id);
        this.sqlite
          .prepare(
            "UPDATE customer_receipts SET status = 'EXCEPTION', error_code = ?, error_message = ?, updated_at = ? WHERE id = ?"
          )
          .run(result.exceptionCode, result.exceptionMessage, this.now(), receiptId);
        return { id, status: 'EXCEPTION', ...result };
      }
      this.sqlite
        .prepare(
          `UPDATE ar_allocations SET status = 'POSTED', accounting_event_id = ?, journal_id = ?, updated_at = ? WHERE id = ?`
        )
        .run(result.accountingEventId, result.journalEntryId, this.now(), id);
      const allocated = this.receiptAllocated(receiptId);
      this.sqlite
        .prepare(
          'UPDATE customer_receipts SET status = ?, error_code = NULL, error_message = NULL, updated_at = ? WHERE id = ?'
        )
        .run(
          allocated === num(receipt.amount_minor) ? 'ALLOCATED' : 'PARTIALLY_ALLOCATED',
          this.now(),
          receiptId
        );
      this.audit.record({
        actorId,
        action: 'RECEIPT_ALLOCATION_POSTED',
        entityType: 'AR_ALLOCATION',
        entityId: id,
        sourceReference: result.journalEntryId,
        after: { receiptId, invoiceId, amountMinor }
      });
      return { id, status: 'POSTED', ...result };
    };
    return this.sqlite.transaction(allocate).immediate();
  }

  createSupplierInvoice(input: {
    supplierId: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    currencyCode: string;
    subtotalMinor: number;
    taxMinor: number;
    totalMinor: number;
    sourceType: 'PURCHASE_ORDER' | 'NON_PO';
    purchaseOrderId: string | null;
    goodsReceiptId: string | null;
    expenseAccountId: string | null;
    evidenceDocumentId?: string | null;
    createdBy: string;
  }): SupplierInvoiceDto {
    if (input.totalMinor !== input.subtotalMinor + input.taxMinor || input.totalMinor <= 0) {
      throw new DomainError(
        'SUPPLIER_INVOICE_TOTAL_INVALID',
        'Supplier invoice total is inconsistent.',
        422
      );
    }
    const match = this.matchSupplierInvoice(input);
    const id = `supplier-invoice-${nanoid(12)}`;
    const timestamp = this.now();
    this.sqlite
      .prepare(
        `INSERT INTO supplier_invoices (
          id, supplier_id, invoice_number, invoice_date, due_date, currency_code,
          subtotal_minor, tax_minor, total_minor, source_type, purchase_order_id,
          goods_receipt_id, expense_account_id, match_status, match_details_json,
          lifecycle_status, evidence_document_id, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?)`
      )
      .run(
        id,
        input.supplierId,
        input.invoiceNumber,
        input.invoiceDate,
        input.dueDate,
        input.currencyCode,
        input.subtotalMinor,
        input.taxMinor,
        input.totalMinor,
        input.sourceType,
        input.purchaseOrderId,
        input.goodsReceiptId,
        input.expenseAccountId,
        match.status,
        JSON.stringify(match.details),
        input.evidenceDocumentId ?? null,
        input.createdBy,
        timestamp,
        timestamp
      );
    this.audit.record({
      actorId: input.createdBy,
      action: 'SUPPLIER_INVOICE_CREATED',
      entityType: 'SUPPLIER_INVOICE',
      entityId: id,
      sourceReference: input.purchaseOrderId ?? input.goodsReceiptId
    });
    return this.getSupplierInvoice(id);
  }

  postSupplierInvoice(id: string, actorId: string): SupplierInvoiceDto {
    const post = () => {
      const invoice = this.supplierInvoiceRow(id);
      if (invoice.lifecycle_status === 'AP_OPEN') return this.getSupplierInvoice(id);
      if (invoice.source_type === 'PURCHASE_ORDER' && invoice.match_status !== 'MATCHED') {
        throw new DomainError(
          'SUPPLIER_INVOICE_NOT_MATCHED',
          `Invoice is blocked by ${String(invoice.match_status)}.`,
          409
        );
      }
      const result = this.accounting.postCanonicalEvent(
        this.event({
          eventType:
            invoice.source_type === 'PURCHASE_ORDER'
              ? 'PO_SUPPLIER_INVOICE_POSTED'
              : 'NON_PO_SUPPLIER_INVOICE_POSTED',
          sourceType: 'SUPPLIER_INVOICE',
          sourceId: id,
          date: String(invoice.invoice_date),
          amountMinor: num(invoice.total_minor),
          currencyCode: String(invoice.currency_code),
          flightId: null,
          payload: {
            supplierId: invoice.supplier_id,
            purchaseOrderId: invoice.purchase_order_id,
            goodsReceiptId: invoice.goods_receipt_id,
            expenseAccountId: invoice.expense_account_id,
            matchStatus: invoice.match_status
          },
          memo: `Post supplier invoice ${String(invoice.invoice_number)}`
        }),
        actorId
      );
      const lifecycle = result.journalStatus === 'POSTED' ? 'AP_OPEN' : 'EXCEPTION';
      this.sqlite
        .prepare(
          'UPDATE supplier_invoices SET lifecycle_status = ?, accounting_event_id = ?, journal_id = ?, updated_at = ? WHERE id = ?'
        )
        .run(lifecycle, result.accountingEventId, result.journalEntryId, this.now(), id);
      if (lifecycle === 'AP_OPEN')
        this.audit.record({
          actorId,
          action: 'SUPPLIER_INVOICE_POSTED',
          entityType: 'SUPPLIER_INVOICE',
          entityId: id,
          sourceReference: result.journalEntryId
        });
      return this.getSupplierInvoice(id);
    };
    return this.sqlite.transaction(post).immediate();
  }

  createPaymentRequest(input: {
    supplierInvoiceId: string;
    amountMinor: number;
    currencyCode: string;
    cashBankAccountId: string;
    createdBy: string;
  }): PaymentRequestDto {
    const invoice = this.getSupplierInvoice(input.supplierInvoiceId);
    if (invoice.lifecycleStatus !== 'AP_OPEN') {
      throw new DomainError(
        'SUPPLIER_INVOICE_NOT_PAYABLE',
        'Supplier invoice is not open for payment.',
        409
      );
    }
    const reservedAmount = num(
      (
        this.sqlite
          .prepare(
            `SELECT COALESCE(SUM(amount_minor), 0) AS amount
      FROM supplier_payment_requests
      WHERE supplier_invoice_id = ? AND status IN ('DRAFT', 'SUBMITTED', 'APPROVED')`
          )
          .get(input.supplierInvoiceId) as SqlRow
      ).amount
    );
    const availableAmount = invoice.outstandingAmount - reservedAmount;
    if (
      !Number.isSafeInteger(input.amountMinor) ||
      input.amountMinor <= 0 ||
      input.currencyCode !== invoice.currencyCode ||
      input.amountMinor > availableAmount
    ) {
      throw new DomainError(
        'PAYMENT_REQUEST_INVALID',
        'Payment currency or amount is invalid.',
        422
      );
    }
    const id = `payment-request-${nanoid(12)}`;
    const timestamp = this.now();
    this.sqlite
      .prepare(
        `INSERT INTO supplier_payment_requests (
          id, request_number, supplier_invoice_id, amount_minor, currency_code,
          cash_bank_account_id, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`
      )
      .run(
        id,
        this.nextNumber('PAY', 'supplier_payment_requests'),
        input.supplierInvoiceId,
        input.amountMinor,
        input.currencyCode,
        input.cashBankAccountId,
        input.createdBy,
        timestamp,
        timestamp
      );
    this.audit.record({
      actorId: input.createdBy,
      action: 'PAYMENT_REQUEST_CREATED',
      entityType: 'PAYMENT_REQUEST',
      entityId: id,
      sourceReference: input.supplierInvoiceId
    });
    return this.getPaymentRequest(id);
  }

  submitPaymentRequest(id: string, actorId: string): PaymentRequestDto {
    const current = this.paymentRequestRow(id);
    if (current.status !== 'DRAFT')
      throw new DomainError(
        'PAYMENT_REQUEST_STATE_INVALID',
        'Only draft requests can be submitted.',
        409
      );
    this.sqlite
      .prepare(
        "UPDATE supplier_payment_requests SET status = 'SUBMITTED', submitted_by = ?, updated_at = ? WHERE id = ?"
      )
      .run(actorId, this.now(), id);
    this.audit.record({
      actorId,
      action: 'PAYMENT_REQUEST_SUBMITTED',
      entityType: 'PAYMENT_REQUEST',
      entityId: id
    });
    return this.getPaymentRequest(id);
  }

  approvePaymentRequest(
    id: string,
    actorId: string,
    actorRole: DemoRole,
    exchangeRateToIdrMicros: number
  ): PaymentRequestDto {
    const approve = () => {
      const request = this.paymentRequestRow(id);
      if (request.status !== 'SUBMITTED')
        throw new DomainError(
          'PAYMENT_REQUEST_STATE_INVALID',
          'Only submitted requests can be approved.',
          409
        );
      if (request.created_by === actorId || request.submitted_by === actorId) {
        throw new DomainError(
          'SELF_APPROVAL_FORBIDDEN',
          'Payment maker cannot approve the same request.',
          403
        );
      }
      const resolution = this.approvals.resolve({
        transactionType: 'SUPPLIER_PAYMENT',
        amountMinor: num(request.amount_minor),
        currencyCode: String(request.currency_code),
        exchangeRateToIdrMicros,
        effectiveDate: dateOnly(this.now())
      });
      if (resolution.requiredRole !== actorRole) {
        throw new DomainError(
          'APPROVAL_AUTHORITY_INSUFFICIENT',
          `${actorRole} cannot approve level ${resolution.requiredApprovalLevel}.`,
          403
        );
      }
      const timestamp = this.now();
      this.sqlite
        .prepare(
          `INSERT INTO approval_decisions (
            id, transaction_type, transaction_id, rule_id, amount_minor, currency_code,
            exchange_rate_to_idr_micros, base_amount_idr, decision, actor_user_id,
            actor_role, decided_at, reason
          ) VALUES (?, 'SUPPLIER_PAYMENT', ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, NULL)`
        )
        .run(
          `approval-decision-${nanoid(12)}`,
          id,
          resolution.ruleId,
          request.amount_minor,
          request.currency_code,
          resolution.exchangeRateToIdrMicros,
          resolution.baseAmountIdr,
          actorId,
          actorRole,
          timestamp
        );
      this.sqlite
        .prepare(
          "UPDATE supplier_payment_requests SET status = 'APPROVED', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?"
        )
        .run(actorId, timestamp, timestamp, id);
      this.audit.record({
        actorId,
        actorRole,
        action: 'PAYMENT_REQUEST_APPROVED',
        entityType: 'PAYMENT_REQUEST',
        entityId: id
      });
      return this.getPaymentRequest(id);
    };
    return this.sqlite.transaction(approve).immediate();
  }

  executePaymentRequest(id: string, actorId: string): SupplierInvoiceDto {
    const execute = () => {
      const request = this.paymentRequestRow(id);
      if (request.status === 'EXECUTED')
        return this.getSupplierInvoice(String(request.supplier_invoice_id));
      if (request.status !== 'APPROVED')
        throw new DomainError(
          'PAYMENT_REQUEST_STATE_INVALID',
          'Only approved requests can be executed.',
          409
        );
      const invoice = this.getSupplierInvoice(String(request.supplier_invoice_id));
      if (
        String(request.currency_code) !== invoice.currencyCode ||
        num(request.amount_minor) > invoice.outstandingAmount
      ) {
        throw new DomainError(
          'PAYMENT_REQUEST_INVALID',
          'Payment would exceed the current supplier invoice outstanding balance.',
          409
        );
      }
      const result = this.accounting.postCanonicalEvent(
        this.event({
          eventType: 'SUPPLIER_PAYMENT_EXECUTED',
          sourceType: 'PAYMENT_REQUEST',
          sourceId: id,
          date: this.now(),
          amountMinor: num(request.amount_minor),
          currencyCode: String(request.currency_code),
          flightId: null,
          payload: {
            supplierInvoiceId: request.supplier_invoice_id,
            cashBankAccountId: request.cash_bank_account_id
          },
          memo: `Execute supplier payment ${String(request.request_number)}`
        }),
        actorId
      );
      if (result.journalStatus !== 'POSTED') {
        this.sqlite
          .prepare(
            "UPDATE supplier_payment_requests SET status = 'EXCEPTION', accounting_event_id = ?, error_code = ?, error_message = ?, updated_at = ? WHERE id = ?"
          )
          .run(
            result.accountingEventId,
            result.exceptionCode,
            result.exceptionMessage,
            this.now(),
            id
          );
        return this.getSupplierInvoice(String(request.supplier_invoice_id));
      }
      const timestamp = this.now();
      this.sqlite
        .prepare(
          "UPDATE supplier_payment_requests SET status = 'EXECUTED', executed_by = ?, executed_at = ?, accounting_event_id = ?, journal_id = ?, updated_at = ? WHERE id = ?"
        )
        .run(actorId, timestamp, result.accountingEventId, result.journalEntryId, timestamp, id);
      this.audit.record({
        actorId,
        action: 'PAYMENT_EXECUTED',
        entityType: 'PAYMENT_REQUEST',
        entityId: id,
        sourceReference: result.journalEntryId
      });
      return this.getSupplierInvoice(String(request.supplier_invoice_id));
    };
    return this.sqlite.transaction(execute).immediate();
  }

  getReceipt(id: string): CustomerReceiptDto {
    const row = this.receiptRow(id);
    const allocatedAmount = this.receiptAllocated(id);
    return {
      id: String(row.id),
      receiptNumber: String(row.receipt_number),
      customerId: String(row.customer_id),
      receiptDate: String(row.receipt_date),
      currencyCode: String(row.currency_code),
      amountMinor: num(row.amount_minor),
      allocatedAmount,
      unallocatedAmount: num(row.amount_minor) - allocatedAmount,
      paymentMethod: String(row.payment_method),
      cashBankAccountId: String(row.cash_bank_account_id),
      reference: String(row.reference),
      status: String(row.status)
    };
  }

  getSupplierInvoice(id: string): SupplierInvoiceDto {
    const row = this.supplierInvoiceRow(id);
    const isVoid = row.lifecycle_status === 'VOID';
    const paidAmount = isVoid ? 0 : this.supplierPaid(id);
    const outstandingAmount = isVoid ? 0 : num(row.total_minor) - paidAmount;
    return {
      id: String(row.id),
      supplierId: String(row.supplier_id),
      invoiceNumber: String(row.invoice_number),
      invoiceDate: String(row.invoice_date),
      dueDate: String(row.due_date),
      currencyCode: String(row.currency_code),
      subtotalMinor: num(row.subtotal_minor),
      taxMinor: num(row.tax_minor),
      totalMinor: num(row.total_minor),
      sourceType: String(row.source_type) as 'PURCHASE_ORDER' | 'NON_PO',
      purchaseOrderId: str(row.purchase_order_id),
      goodsReceiptId: str(row.goods_receipt_id),
      matchStatus: String(row.match_status),
      lifecycleStatus: String(row.lifecycle_status),
      paidAmount,
      outstandingAmount,
      settlementStatus: isVoid
        ? 'NOT_APPLICABLE'
        : this.settlement(num(row.total_minor), paidAmount),
      accountingEventId: str(row.accounting_event_id),
      journalId: str(row.journal_id)
    };
  }

  getPaymentRequest(id: string): PaymentRequestDto {
    const row = this.paymentRequestRow(id);
    return {
      id: String(row.id),
      requestNumber: String(row.request_number),
      supplierInvoiceId: String(row.supplier_invoice_id),
      amountMinor: num(row.amount_minor),
      currencyCode: String(row.currency_code),
      cashBankAccountId: String(row.cash_bank_account_id),
      status: row.reversal_journal_id ? 'REVERSED' : String(row.status),
      createdBy: String(row.created_by),
      approvedBy: str(row.approved_by),
      journalId: str(row.journal_id)
    };
  }

  private matchSupplierInvoice(input: {
    sourceType: string;
    purchaseOrderId: string | null;
    goodsReceiptId: string | null;
    supplierId: string;
    totalMinor: number;
  }) {
    if (input.sourceType === 'NON_PO') return { status: 'NOT_APPLICABLE', details: {} };
    if (!input.purchaseOrderId) return { status: 'MISSING_PO', details: {} };
    const po = this.sqlite
      .prepare('SELECT vendor_id FROM inventory_purchase_orders WHERE id = ?')
      .get(input.purchaseOrderId) as SqlRow | undefined;
    if (!po) return { status: 'MISSING_PO', details: {} };
    if (!input.goodsReceiptId) return { status: 'MISSING_RECEIPT', details: {} };
    const receipt = this.sqlite
      .prepare(
        'SELECT purchase_order_id, total_base_value_idr FROM inventory_goods_receipts WHERE id = ?'
      )
      .get(input.goodsReceiptId) as SqlRow | undefined;
    if (!receipt || receipt.purchase_order_id !== input.purchaseOrderId)
      return { status: 'MISSING_RECEIPT', details: {} };
    if (po.vendor_id !== input.supplierId)
      return { status: 'MISSING_PO', details: { reason: 'SUPPLIER_MISMATCH' } };
    if (num(receipt.total_base_value_idr) !== input.totalMinor)
      return {
        status: 'PRICE_VARIANCE',
        details: {
          goodsReceiptAmount: receipt.total_base_value_idr,
          invoiceAmount: input.totalMinor
        }
      };
    const quantities = this.sqlite
      .prepare(
        `SELECT (SELECT SUM(quantity) FROM inventory_purchase_order_lines WHERE purchase_order_id = ?) AS ordered,
              (SELECT SUM(line.quantity) FROM inventory_goods_receipt_lines line WHERE line.goods_receipt_id = ?) AS received`
      )
      .get(input.purchaseOrderId, input.goodsReceiptId) as SqlRow;
    if (num(quantities.ordered) !== num(quantities.received))
      return { status: 'QUANTITY_VARIANCE', details: quantities };
    return {
      status: 'MATCHED',
      details: { goodsReceiptAmount: receipt.total_base_value_idr, ...quantities }
    };
  }

  private event(input: {
    eventType: string;
    sourceType: string;
    sourceId: string;
    date: string;
    amountMinor: number;
    currencyCode: string;
    flightId: string | null;
    payload: Record<string, unknown>;
    memo: string;
  }): CanonicalAccountingInput {
    return {
      eventType: input.eventType,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      productAccountingProfileId: null,
      accountingDate: dateOnly(input.date),
      transactionDate: input.date,
      documentDate: dateOnly(input.date),
      serviceDate: null,
      amountMinor: input.amountMinor,
      currencyId: input.currencyCode === 'IDR' ? 'cur-idr' : null,
      currencyCode: input.currencyCode,
      exchangeRateToIdrMicros: 1_000_000,
      baseAmountIdr: input.amountMinor,
      stationId: null,
      aircraftId: null,
      flightId: input.flightId,
      workOrderReference: null,
      costCenterId: null,
      payload: input.payload,
      memo: input.memo,
      idempotencyKey: `finance:${input.eventType}:${input.sourceType}:${input.sourceId}:v1`
    };
  }

  private receiptRow(id: string) {
    const row = this.sqlite.prepare('SELECT * FROM customer_receipts WHERE id = ?').get(id) as
      SqlRow | undefined;
    if (!row) throw new DomainError('NOT_FOUND', `Receipt ${id} was not found.`, 404);
    return row;
  }
  private invoiceRow(id: string) {
    const row = this.sqlite.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as
      SqlRow | undefined;
    if (!row) throw new DomainError('NOT_FOUND', `Invoice ${id} was not found.`, 404);
    return row;
  }
  private supplierInvoiceRow(id: string) {
    const row = this.sqlite.prepare('SELECT * FROM supplier_invoices WHERE id = ?').get(id) as
      SqlRow | undefined;
    if (!row) throw new DomainError('NOT_FOUND', `Supplier invoice ${id} was not found.`, 404);
    return row;
  }
  private paymentRequestRow(id: string) {
    const row = this.sqlite
      .prepare('SELECT * FROM supplier_payment_requests WHERE id = ?')
      .get(id) as SqlRow | undefined;
    if (!row) throw new DomainError('NOT_FOUND', `Payment request ${id} was not found.`, 404);
    return row;
  }
  private receiptAllocated(id: string) {
    return num(
      (
        this.sqlite
          .prepare(
            "SELECT SUM(amount_minor) AS total FROM ar_allocations WHERE receipt_id = ? AND status = 'POSTED'"
          )
          .get(id) as SqlRow
      ).total
    );
  }
  private invoiceAllocated(id: string) {
    return num(
      (
        this.sqlite
          .prepare(
            "SELECT SUM(amount_minor) AS total FROM ar_allocations WHERE invoice_id = ? AND status = 'POSTED'"
          )
          .get(id) as SqlRow
      ).total
    );
  }
  private supplierPaid(id: string) {
    return num(
      (
        this.sqlite
          .prepare(
            "SELECT SUM(amount_minor) AS total FROM supplier_payment_requests WHERE supplier_invoice_id = ? AND status = 'EXECUTED' AND reversal_journal_id IS NULL"
          )
          .get(id) as SqlRow
      ).total
    );
  }
  private settlement(total: number, allocated: number): SettlementStatus {
    return allocated <= 0 ? 'OPEN' : allocated >= total ? 'SETTLED' : 'PARTIALLY_SETTLED';
  }
  private nextNumber(prefix: string, table: string) {
    const count =
      num((this.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as SqlRow).count) +
      1;
    return `${prefix}-${dateOnly(this.now()).replaceAll('-', '')}-${String(count).padStart(5, '0')}`;
  }
}
