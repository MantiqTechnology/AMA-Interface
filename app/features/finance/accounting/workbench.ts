import type { GeneralLedgerLineDto } from '#shared/features/finance/accounting';

export const accountingTabs = [
  'posting-queue',
  'general-journal',
  'general-ledger',
  'exceptions',
  'policies',
  'asset-components'
] as const;

export type AccountingTab = (typeof accountingTabs)[number];

export function resolveAccountingTab(value: unknown): AccountingTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return accountingTabs.includes(candidate as AccountingTab)
    ? (candidate as AccountingTab)
    : 'posting-queue';
}

export function humanizeAccountingValue(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function sourceLabel(sourceType: string, sourceId: string) {
  return `${humanizeAccountingValue(sourceType)} · ${sourceId}`;
}

export function lineDimensions(line: GeneralLedgerLineDto) {
  return [
    line.stationId,
    line.aircraftId,
    line.flightId,
    line.workOrderReference,
    line.costCenterId
  ].filter((value): value is string => Boolean(value));
}

export type LedgerGroup = {
  journalEntryId: string;
  journalNumber: string;
  postingDate: string;
  sourceType: string;
  sourceId: string;
  lines: GeneralLedgerLineDto[];
  totalDebitMinor: number;
  totalCreditMinor: number;
};

export function groupLedgerLines(lines: GeneralLedgerLineDto[]): LedgerGroup[] {
  const groups = new Map<string, LedgerGroup>();
  for (const line of lines) {
    const group = groups.get(line.journalEntryId) ?? {
      journalEntryId: line.journalEntryId,
      journalNumber: line.journalNumber,
      postingDate: line.postingDate,
      sourceType: line.sourceType,
      sourceId: line.sourceId,
      lines: [],
      totalDebitMinor: 0,
      totalCreditMinor: 0
    };
    group.lines.push(line);
    group.totalDebitMinor += line.debitMinor;
    group.totalCreditMinor += line.creditMinor;
    groups.set(line.journalEntryId, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    lines: [...group.lines].sort(
      (left, right) => Number(Boolean(right.debitMinor)) - Number(Boolean(left.debitMinor))
    )
  }));
}
