import { z } from 'zod';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const customersListQuerySchema = z.object({
  active: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().trim().max(80).optional().default('')
});
export const customersIdParamsSchema = z.object({ id: z.string().min(1) });
export const customersStatusSchema = z.object({ isActive: z.boolean() });
export const customerLifecycleStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'ARCHIVED'
]);
export const customerCreditStatusSchema = z.enum([
  'NORMAL',
  'ON_HOLD',
  'CASH_ONLY',
  'REVIEW_REQUIRED'
]);
export const customerAccountTypeSchema = z.enum([
  'INDIVIDUAL',
  'CORPORATE',
  'GOVERNMENT',
  'AGENCY',
  'CARGO_PARTNER',
  'OTHER'
]);
export const customerContactTypeSchema = z.enum([
  'PRIMARY',
  'BILLING',
  'OPERATIONS',
  'CARGO',
  'FINANCE',
  'CONTRACT',
  'OTHER'
]);
export const customerNoteTypeSchema = z.enum([
  'COMMERCIAL',
  'FINANCIAL',
  'OPERATIONAL',
  'CARGO',
  'CONTRACT',
  'GENERAL'
]);
export const customerNoteVisibilitySchema = z.enum([
  'COMMERCIAL_ONLY',
  'FINANCE_ONLY',
  'OPERATIONS',
  'INTERNAL'
]);
export const customersInputSchema = z.object({
  expectedVersion: z.coerce.number().int().positive().optional(),
  accountType: customerAccountTypeSchema,
  accountCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  accountName: z.string().trim().min(1),
  contactPerson: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  phone: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  email: z.preprocess(emptyToNull, z.string().trim().email().nullable()).optional().default(null),
  billingAddress: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  paymentTermId: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  creditLimit: z
    .preprocess(emptyToNull, z.coerce.number().int().min(0).nullable())
    .optional()
    .default(null),
  defaultCurrencyCode: z
    .string()
    .trim()
    .min(3)
    .max(3)
    .transform((value) => value.toUpperCase())
    .optional()
    .default('IDR'),
  primaryContactId: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional()
    .default(null),
  commercialNote: z
    .preprocess(emptyToNull, z.string().trim().max(2000).nullable())
    .optional()
    .default(null)
});
export const customerContactInputSchema = z.object({
  contactName: z.string().trim().min(1),
  roleTitle: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  email: z.preprocess(emptyToNull, z.string().trim().email().nullable()).optional().default(null),
  phone: z.preprocess(emptyToNull, z.string().trim().nullable()).optional().default(null),
  contactType: customerContactTypeSchema.default('OTHER'),
  isPrimary: z.coerce.boolean().optional().default(false),
  isActive: z.coerce.boolean().optional().default(true),
  notes: z.preprocess(emptyToNull, z.string().trim().max(1000).nullable()).optional().default(null)
});
export const customerContactIdParamsSchema = customersIdParamsSchema.extend({
  contactId: z.string().min(1)
});
export const customerChangeStatusSchema = z.object({
  lifecycleStatus: customerLifecycleStatusSchema,
  reason: z.string().trim().min(1),
  expectedVersion: z.coerce.number().int().positive().optional()
});
export const customerCreditHoldCommandSchema = z.object({
  reason: z.string().trim().min(1),
  expectedVersion: z.coerce.number().int().positive().optional()
});

export type CustomerListQuery = z.infer<typeof customersListQuerySchema>;
export type CustomerInput = z.infer<typeof customersInputSchema>;
export type CustomerContactInput = z.infer<typeof customerContactInputSchema>;
export type CustomerLifecycleStatus = z.infer<typeof customerLifecycleStatusSchema>;
export type CustomerCreditStatus = z.infer<typeof customerCreditStatusSchema>;
export type CustomerDto = {
  id: string;
  accountType: string;
  accountCode: string;
  accountName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
  paymentTermId: string | null;
  creditLimit: number | null;
  isActive: boolean;
  lifecycleStatus: string;
  creditStatus: string;
  defaultCurrencyCode: string;
  primaryContactId: string | null;
  commercialNote: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type CustomerOption = {
  id: string;
  accountCode: string;
  accountName: string;
};
export type PaymentTermSummaryDto = {
  id: string;
  code: string;
  name: string;
  dueDays: number | null;
};
export type CustomerContactDto = {
  id: string;
  customerId: string;
  contactName: string;
  roleTitle: string | null;
  email: string | null;
  phone: string | null;
  contactType: string;
  isPrimary: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
export type CustomerFinancialSummaryDto = {
  customerId: string;
  currencyCode: string;
  creditLimitMinor: string | null;
  currentExposureMinor: string | null;
  availableCreditMinor: string | null;
  overLimitAmountMinor: string | null;
  openInvoiceAmountMinor: string | null;
  overdueAmountMinor: string | null;
  openInvoiceCount: number | null;
  overdueInvoiceCount: number | null;
  oldestOverdueDays: number | null;
  lastPaymentAt: string | null;
  lastPaymentAmountMinor: string | null;
  creditStatus: string;
  asOf: string;
};
export type CustomerOperationalSummaryDto = {
  customerId: string;
  totalShipmentCount: number | null;
  completedShipmentCount: number | null;
  lastShipmentAt: string | null;
  activeContractCount: number | null;
  activeRateAgreementCount: number | null;
  averageRating: number | null;
  ratingCount: number | null;
  asOf: string;
};
export type CustomerDetailDto = {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  lifecycleStatus: string;
  creditStatus: string;
  billingAddress: string | null;
  defaultCurrencyCode: string;
  primaryContact: Pick<
    CustomerContactDto,
    'id' | 'contactName' | 'roleTitle' | 'phone' | 'email'
  > | null;
  paymentTerm: PaymentTermSummaryDto | null;
  creditConfiguration: {
    creditLimitMinor: string | null;
    currencyCode: string;
  };
  financialSummary: CustomerFinancialSummaryDto | null;
  operationalSummary: CustomerOperationalSummaryDto | null;
  phone: string | null;
  email: string | null;
  commercialNote: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type CustomerRateDto = {
  id: string;
  rateCode: string;
  serviceType: string;
  originStation: string | null;
  destinationStation: string | null;
  currencyCode: string;
  baseRateMinor: string;
  rateUnit: string;
  pricingScope: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
};
export type CustomerContractDto = {
  id: string;
  customerId: string;
  contractNumber: string;
  contractType: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  status: string;
  signedDate: string | null;
  documentId: string | null;
  renewalStatus: string | null;
  createdAt: string;
  updatedAt: string;
};
export type CustomerActivityItemDto = {
  id: string;
  activityType: string;
  title: string;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  occurredAt: string;
};
export type CustomerHistoryItemDto = {
  id: string;
  action: string;
  actorName: string | null;
  changedFields: string[];
  occurredAt: string;
  requestId?: string | null;
};
export type CustomerNoteDto = {
  id: string;
  customerId: string;
  noteType: string;
  visibility: string;
  note: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};
