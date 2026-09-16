import { z } from 'zod';

export const financeReportingQuerySchema = z.object({
  period: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/u)
    .optional(),
  flightId: z.string().trim().min(1).optional(),
  routeId: z.string().trim().min(1).optional(),
  stationId: z.string().trim().min(1).optional(),
  aircraftId: z.string().trim().min(1).optional()
});

export type FinanceReportingQuery = z.infer<typeof financeReportingQuerySchema>;

export type FinanceReportingPeriodDto = {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
};

export type FinanceMetricDto = {
  key: 'REVENUE' | 'EXPENSE' | 'NET_INCOME' | 'CASH' | 'OVERDUE_AR' | 'AR' | 'AP';
  label: string;
  valueMinor: number;
  changePercent: number | null;
  direction: 'UP' | 'DOWN' | 'FLAT' | 'NOT_AVAILABLE';
  tone: 'SUCCESS' | 'WARNING' | 'DANGER' | 'NEUTRAL';
  caption: string;
};

export type FinanceControlDto = {
  label: string;
  value: string;
  status: 'SUCCESS' | 'WARNING' | 'DANGER' | 'NEUTRAL';
  route: string | null;
};

export type FinanceRouteRevenueDto = {
  rank: number;
  route: string;
  revenueMinor: number;
};

export type FinanceActionDto = {
  id: string;
  title: string;
  detail: string;
  value: string;
  tone: 'WARNING' | 'DANGER';
  route: string;
};

export type FinanceBusinessLineDto = {
  id: 'CHARTER' | 'PASSENGER' | 'CARGO';
  label: string;
  revenueMinor: number;
  costMinor: number;
  grossProfitMinor: number;
  grossMarginPercent: number | null;
  costs: {
    fuelMinor: number;
    stationMinor: number;
    maintenanceMinor: number;
  };
};

export type FinanceProfitabilityDto = {
  period: FinanceReportingPeriodDto;
  currencyCode: 'IDR';
  allocationMethod: 'POSTED_GL_DIMENSIONS';
  lines: FinanceBusinessLineDto[];
  totals: {
    revenueMinor: number;
    costMinor: number;
    grossProfitMinor: number;
    grossMarginPercent: number | null;
  };
  asOf: string;
};

export type FinancialStatementAccountDto = {
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  amountMinor: number;
  source: 'POSTED_GL';
};

export type ProfitAndLossDto = {
  period: FinanceReportingPeriodDto;
  currencyCode: 'IDR';
  lines: FinancialStatementAccountDto[];
  sections: Array<{ code: string; label: string; amountMinor: number }>;
  totals: { revenueMinor: number; expenseMinor: number; profitLossMinor: number };
  asOf: string;
};

export type BalanceSheetSubsectionDto = {
  code:
    | 'CURRENT_ASSETS'
    | 'NON_CURRENT_ASSETS'
    | 'CURRENT_LIABILITIES'
    | 'NON_CURRENT_LIABILITIES'
    | 'EQUITY';
  label: string;
  amountMinor: number;
  accounts: FinancialStatementAccountDto[];
};

export type BalanceSheetRatiosDto = {
  currentRatio: number | null;
  quickRatio: number | null;
  debtToEquityRatio: number | null;
  debtToAssetRatio: number | null;
};

export type BalanceSheetDto = {
  period: FinanceReportingPeriodDto;
  currencyCode: 'IDR';
  sections: Array<{
    code: 'ASSETS' | 'LIABILITIES' | 'EQUITY';
    label: string;
    amountMinor: number;
    accounts: FinancialStatementAccountDto[];
  }>;
  classifiedSections: {
    currentAssets: BalanceSheetSubsectionDto;
    nonCurrentAssets: BalanceSheetSubsectionDto;
    currentLiabilities: BalanceSheetSubsectionDto;
    nonCurrentLiabilities: BalanceSheetSubsectionDto;
    equity: BalanceSheetSubsectionDto;
  };
  ratios: BalanceSheetRatiosDto;
  currentEarningsMinor: number;
  totals: {
    assetsMinor: number;
    currentAssetsMinor: number;
    nonCurrentAssetsMinor: number;
    liabilitiesMinor: number;
    currentLiabilitiesMinor: number;
    nonCurrentLiabilitiesMinor: number;
    equityMinor: number;
    differenceMinor: number;
    balanced: boolean;
  };
  asOf: string;
};

export type AviationProfitabilityEvidenceDto = {
  journalLineId: string;
  journalId: string;
  journalNumber: string;
  accountingEventId: string;
  eventType: string;
  sourceType: string;
  sourceId: string;
  accountCode: string;
  accountName: string;
  amountMinor: number;
  sourceRoute: string | null;
};

export type AviationProfitabilityUnitDto = {
  id: string;
  label: string;
  revenueMinor: number;
  costMinor: number;
  marginMinor: number;
  marginPercent: number | null;
  costs: {
    fuelMinor: number;
    handlingMinor: number;
    airportStationMinor: number;
    maintenanceMinor: number;
    otherDirectMinor: number;
  };
  flightIds: string[];
  evidence: AviationProfitabilityEvidenceDto[];
};

export type AviationProfitabilityDto = {
  period: FinanceReportingPeriodDto;
  currencyCode: 'IDR';
  attributionMethod: 'POSTED_GL_DIMENSIONS';
  flights: AviationProfitabilityUnitDto[];
  routes: AviationProfitabilityUnitDto[];
  stations: AviationProfitabilityUnitDto[];
  totals: {
    revenueMinor: number;
    costMinor: number;
    marginMinor: number;
    marginPercent: number | null;
  };
  asOf: string;
};

export type ExecutiveRatioDto = {
  currentRatio: number | null;
  debtToEquityRatio: number | null;
  grossMarginPercent: number | null;
  netMarginPercent: number | null;
  costPerFlightHourMinor: number | null;
  revenuePerFlightHourMinor: number | null;
  fuelCostRatioPercent: number | null;
  maintenanceCostRatioPercent: number | null;
  totalFlightHours: number;
  totalFlights: number;
};

export type FinanceDashboardDto = {
  period: FinanceReportingPeriodDto;
  currencyCode: 'IDR';
  metrics: FinanceMetricDto[];
  executiveRatios: ExecutiveRatioDto;
  controls: FinanceControlDto[];
  profitability: FinanceBusinessLineDto[];
  busiestRoutes: FinanceRouteRevenueDto[];
  quietestRoutes: FinanceRouteRevenueDto[];
  actions: FinanceActionDto[];
  asOf: string;
};

export type TrialBalanceAccountDto = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normalBalance: 'DEBIT' | 'CREDIT';
  openingDebitMinor: number;
  openingCreditMinor: number;
  openingBalanceMinor: number;
  periodDebitMinor: number;
  periodCreditMinor: number;
  debitMinor: number;
  creditMinor: number;
  balanceMinor: number;
  abnormal: boolean;
  negativeCash: boolean;
};

export type FinanceTrialBalanceDto = {
  period: FinanceReportingPeriodDto;
  currencyCode: 'IDR';
  accounts: TrialBalanceAccountDto[];
  totals: {
    debitMinor: number;
    creditMinor: number;
    differenceMinor: number;
    balanced: boolean;
    abnormalAccountCount: number;
    negativeCashCount: number;
  };
  asOf: string;
};
