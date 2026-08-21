import type Database from 'better-sqlite3';
import { DomainError } from '../../../utils/errors';

export type ApprovalThresholdInput = {
  transactionType: string;
  amountMinor: number;
  currencyCode: string;
  exchangeRateToIdrMicros: number;
  effectiveDate: string;
};

export type ApprovalThresholdResolution = {
  ruleId: string;
  transactionType: string;
  amountMinor: number;
  currencyCode: string;
  baseCurrencyCode: 'IDR';
  exchangeRateToIdrMicros: number;
  baseAmountIdr: number;
  requiredRole: string;
  requiredApprovalLevel: number;
};

type ApprovalRuleRow = {
  id: string;
  transaction_type: string;
  required_role: string;
  required_approval_level: number;
};

export class ApprovalAuthorityService {
  constructor(
    private readonly sqlite: Database.Database,
    private readonly now: () => string
  ) {}

  resolve(input: ApprovalThresholdInput): ApprovalThresholdResolution {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0) {
      throw new DomainError(
        'INVALID_FINANCIAL_AMOUNT',
        'Amount must be a non-negative integer.',
        422
      );
    }
    if (
      !Number.isSafeInteger(input.exchangeRateToIdrMicros) ||
      input.exchangeRateToIdrMicros <= 0
    ) {
      throw new DomainError(
        'INVALID_EXCHANGE_RATE',
        'Exchange rate must be a positive integer.',
        422
      );
    }
    const baseAmountIdr = Math.round(
      (input.amountMinor * input.exchangeRateToIdrMicros) / 1_000_000
    );
    if (!Number.isSafeInteger(baseAmountIdr)) {
      throw new DomainError(
        'FINANCIAL_AMOUNT_OVERFLOW',
        'Normalized amount exceeds safe integer range.',
        422
      );
    }
    const rule = this.sqlite
      .prepare(
        `SELECT id, transaction_type, required_role, required_approval_level
         FROM approval_authority_rules
         WHERE transaction_type = ?
           AND is_active = 1
           AND amount_from_base_idr <= ?
           AND (amount_to_base_idr IS NULL OR amount_to_base_idr >= ?)
           AND effective_from <= ?
           AND (effective_to IS NULL OR effective_to >= ?)
         ORDER BY required_approval_level DESC, amount_from_base_idr DESC
         LIMIT 1`
      )
      .get(
        input.transactionType,
        baseAmountIdr,
        baseAmountIdr,
        input.effectiveDate,
        input.effectiveDate
      ) as ApprovalRuleRow | undefined;
    if (!rule) {
      throw new DomainError(
        'APPROVAL_AUTHORITY_NOT_FOUND',
        `No approval authority covers ${input.transactionType} at ${baseAmountIdr} IDR.`,
        422
      );
    }
    return {
      ruleId: rule.id,
      transactionType: rule.transaction_type,
      amountMinor: input.amountMinor,
      currencyCode: input.currencyCode,
      baseCurrencyCode: 'IDR',
      exchangeRateToIdrMicros: input.exchangeRateToIdrMicros,
      baseAmountIdr,
      requiredRole: rule.required_role,
      requiredApprovalLevel: rule.required_approval_level
    };
  }
}
