export interface SmsFilter {
  dateRange: string;
  station: string;
  aircraft: string;
  riskLevel: string;
}

export interface Trend {
  icon: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface Kpi {
  key: string;
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: Trend;
  target?: string;
}

export interface ChartSegment {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface ChartRow {
  label: string;
  value: number | string;
  percent: number;
  color: string;
}

export interface Finding {
  priority: 'High' | 'Medium' | 'Low';
  id: string;
  finding: string;
  station: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  owner: string;
  dueDate: string;
  status: 'Open' | 'Due Soon' | 'Overdue' | 'Closed';
}
