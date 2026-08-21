import { z } from 'zod';

export const financeTransactionIdParamsSchema = z.object({ id: z.string().trim().min(1) });
export const customerReceiptBodySchema = z.object({
  customerId: z.string().trim().min(1),
  receiptDate: z.string().trim().min(10),
  currencyCode: z.string().trim().length(3),
  amountMinor: z.number().int().positive(),
  paymentMethod: z.string().trim().min(1),
  cashBankAccountId: z.string().trim().min(1),
  reference: z.string().trim().min(2),
  evidenceDocumentId: z.string().trim().min(1).nullable().optional()
});
export const receiptAllocationBodySchema = z.object({
  invoiceId: z.string().trim().min(1),
  amountMinor: z.number().int().positive()
});
export const supplierInvoiceBodySchema = z.object({
  supplierId: z.string().trim().min(1),
  invoiceNumber: z.string().trim().min(1),
  invoiceDate: z.string().trim().min(10),
  dueDate: z.string().trim().min(10),
  currencyCode: z.string().trim().length(3),
  subtotalMinor: z.number().int().nonnegative(),
  taxMinor: z.number().int().nonnegative(),
  totalMinor: z.number().int().positive(),
  sourceType: z.enum(['PURCHASE_ORDER', 'NON_PO']),
  purchaseOrderId: z.string().nullable(),
  goodsReceiptId: z.string().nullable(),
  expenseAccountId: z.string().nullable(),
  evidenceDocumentId: z.string().nullable().optional()
});
export const paymentRequestBodySchema = z.object({
  supplierInvoiceId: z.string().trim().min(1),
  amountMinor: z.number().int().positive(),
  currencyCode: z.string().trim().length(3),
  cashBankAccountId: z.string().trim().min(1)
});
export const paymentApprovalBodySchema = z.object({
  exchangeRateToIdrMicros: z.number().int().positive().default(1_000_000)
});

export type SettlementStatus = 'NOT_APPLICABLE' | 'OPEN' | 'PARTIALLY_SETTLED' | 'SETTLED';

export type CustomerReceiptDto = {
  id: string;
  receiptNumber: string;
  customerId: string;
  receiptDate: string;
  currencyCode: string;
  amountMinor: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  paymentMethod: string;
  cashBankAccountId: string;
  reference: string;
  status: string;
};

export type SupplierInvoiceDto = {
  id: string;
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
  matchStatus: string;
  lifecycleStatus: string;
  paidAmount: number;
  outstandingAmount: number;
  settlementStatus: SettlementStatus;
  accountingEventId: string | null;
  journalId: string | null;
};

export type PaymentRequestDto = {
  id: string;
  requestNumber: string;
  supplierInvoiceId: string;
  amountMinor: number;
  currencyCode: string;
  cashBankAccountId: string;
  status: string;
  createdBy: string;
  approvedBy: string | null;
  journalId: string | null;
};
