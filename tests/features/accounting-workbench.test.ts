import { describe, expect, it } from 'vitest';
import type { GeneralLedgerLineDto } from '../../shared/features/finance/accounting';
import {
  groupLedgerLines,
  lineDimensions,
  resolveAccountingTab
} from '../../app/features/finance/accounting/workbench';

function ledgerLine(
  overrides: Partial<GeneralLedgerLineDto> & Pick<GeneralLedgerLineDto, 'journalLineId'>
): GeneralLedgerLineDto {
  const { journalLineId, ...rest } = overrides;
  return {
    journalLineId,
    journalEntryId: 'journal-1',
    journalNumber: 'GJ-000017',
    postingDate: '2026-07-18',
    transactionDate: '2026-07-18',
    serviceDate: null,
    sourceType: 'TICKET_PAYMENT',
    sourceId: 'TKT-000143',
    policyCode: 'PASSENGER-DEFERRED',
    periodCode: '2026-07',
    accountCode: '1000',
    accountName: 'Cash',
    accountType: 'ASSET',
    debitMinor: 0,
    creditMinor: 0,
    stationId: null,
    aircraftId: null,
    flightId: null,
    workOrderReference: null,
    costCenterId: null,
    description: 'Ticket payment',
    ...rest
  };
}

describe('accounting workbench navigation', () => {
  it('defaults invalid and missing tab query values to posting queue', () => {
    expect(resolveAccountingTab(undefined)).toBe('posting-queue');
    expect(resolveAccountingTab('unknown')).toBe('posting-queue');
  });

  it('preserves supported tab query values', () => {
    expect(resolveAccountingTab('general-ledger')).toBe('general-ledger');
    expect(resolveAccountingTab(['exceptions'])).toBe('exceptions');
  });
});

describe('General Ledger grouping', () => {
  it('groups journal lines and displays debit before credit', () => {
    const groups = groupLedgerLines([
      ledgerLine({
        journalLineId: 'credit',
        accountCode: '2200',
        accountName: 'Unearned Passenger Revenue',
        creditMinor: 1_598_400
      }),
      ledgerLine({ journalLineId: 'debit', debitMinor: 1_598_400 })
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.lines.map((line) => line.journalLineId)).toEqual(['debit', 'credit']);
    expect(groups[0]?.totalDebitMinor).toBe(1_598_400);
    expect(groups[0]?.totalCreditMinor).toBe(1_598_400);
  });

  it('returns compact, non-empty dimensions in display order', () => {
    const line = ledgerLine({
      journalLineId: 'dimensioned',
      stationId: 'ST-DJJ',
      aircraftId: 'AC-PK-AMA',
      workOrderReference: 'WO-001'
    });
    expect(lineDimensions(line)).toEqual(['ST-DJJ', 'AC-PK-AMA', 'WO-001']);
  });
});
