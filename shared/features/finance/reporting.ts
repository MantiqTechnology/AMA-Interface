import { z } from 'zod';

export const financeReportingQuerySchema = z.object({
  period: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/u)
    .optional()
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
  key: 'REVENUE' | 'EXPENSE' | 'NET_INCOME' | 'CASH' | 'OVERDUE_AR';
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
  allocationMethod: 'REVENUE_SHARE_PER_FLIGHT';
  lines: FinanceBusinessLineDto[];
  totals: {
    revenueMinor: number;
    costMinor: number;
    grossProfitMinor: number;
    grossMarginPercent: number | null;
  };
  asOf: string;
};

export type FinanceDashboardDto = {
  period: FinanceReportingPeriodDto;
  currencyCode: 'IDR';
  metrics: FinanceMetricDto[];
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
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normalBalance: 'DEBIT' | 'CREDIT';
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
