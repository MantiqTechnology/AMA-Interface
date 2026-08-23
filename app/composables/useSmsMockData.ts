import type { SmsFilter, Kpi, ChartSegment, ChartRow, Finding } from '../types/sms'

// ---------------------------------------------------------------------
// MODULE-SCOPE STATE (Shared across components)
// ---------------------------------------------------------------------
const filters = reactive<SmsFilter>({
  dateRange: '01 – 21 Aug 2026',
  station: 'All Station',
  aircraft: 'All Aircraft',
  riskLevel: 'All Risk Level',
})

const lastUpdated = ref<string>('21 Aug 2026 10:30 WIB')

const kpis = ref<Kpi[]>([
  {
    key: 'totalHazards',
    title: 'Total Hazards (YTD)',
    value: '42',
    icon: 'mdi-shield-alert-outline',
    color: 'info',
    trend: { icon: 'mdi-arrow-up-thin', text: '16% vs last year', tone: 'neutral' },
  },
  {
    key: 'openCapa',
    title: 'Open CAPA',
    value: '5',
    icon: 'mdi-clipboard-text-outline',
    color: 'warning',
    trend: { icon: 'mdi-arrow-up-thin', text: '1 vs last period', tone: 'bad' },
  },
  {
    key: 'overdueCapa',
    title: 'Overdue CAPA',
    value: '2',
    icon: 'mdi-clock-alert-outline',
    color: 'error',
    trend: { icon: 'mdi-arrow-down-thin', text: '1 vs last period', tone: 'good' },
  },
  {
    key: 'spiIndex',
    title: 'SPI Index',
    value: '0.98',
    icon: 'mdi-chart-line',
    color: 'success',
    target: 'Target: > 0.95',
  },
  {
    key: 'highRiskFlights',
    title: 'High Risk Flights',
    value: '3',
    icon: 'mdi-airplane-alert',
    color: 'error',
    trend: { icon: 'mdi-arrow-up-thin', text: '1 vs yesterday', tone: 'bad' },
  },
  {
    key: 'blockedFlights',
    title: 'Blocked Flights',
    value: '1',
    icon: 'mdi-cancel',
    color: 'error',
    trend: { icon: 'mdi-minus', text: 'vs yesterday', tone: 'neutral' },
  },
  {
    key: 'fratCompliance',
    title: 'FRAT Compliance',
    value: '100%',
    icon: 'mdi-check-decagram-outline',
    color: 'success',
    target: 'Target: 100%',
  },
])

const hazardTrend = ref({
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
  series: [
    { name: 'Hazard', color: '#1E88E5', data: [18, 22, 19, 26, 24, 30, 27, 42] },
    { name: 'Occurrence', color: '#43A047', data: [6, 8, 7, 9, 8, 10, 9, 18] },
    { name: 'Technical Finding', color: '#8E24AA', data: [3, 4, 4, 5, 4, 6, 5, 9] },
  ],
})

const hazardByRiskLevel = ref({
  total: 42,
  totalLabel: 'Total',
  footnote: 'Based on current open hazards',
  segments: [
    { label: 'Low', value: 22, percent: 52, color: '#43A047' },
    { label: 'Medium', value: 12, percent: 29, color: '#FB8C00' },
    { label: 'High', value: 6, percent: 14, color: '#E53935' },
    { label: 'Critical', value: 2, percent: 5, color: '#B71C1C' },
  ] as ChartSegment[],
})

const hazardBySource = ref({
  footnote: 'Based on open hazards',
  rows: [
    { label: 'Flight Operations', value: 15, percent: 100, color: '#1E88E5' },
    { label: 'Maintenance', value: 9, percent: 60, color: '#43A047' },
    { label: 'Station Operations', value: 7, percent: 47, color: '#FB8C00' },
    { label: 'Ground Handling', value: 5, percent: 33, color: '#8E24AA' },
    { label: 'Airstrip / Aerodrome', value: 4, percent: 27, color: '#00ACC1' },
    { label: 'Weather', value: 2, percent: 13, color: '#757575' },
  ] as ChartRow[],
})

const hazardByStation = ref({
  footnote: 'Based on open hazards',
  rows: [
    { label: 'Wamena (WMX)', value: 11, percent: 100, color: '#1E88E5' },
    { label: 'Sentani (DJJ)', value: 8, percent: 73, color: '#43A047' },
    { label: 'Timika (TIM)', value: 6, percent: 55, color: '#FB8C00' },
    { label: 'Dekai (DKI)', value: 4, percent: 36, color: '#8E24AA' },
    { label: 'Mulia (MII)', value: 3, percent: 27, color: '#00ACC1' },
    { label: 'Other', value: 10, percent: 91, color: '#757575' },
  ] as ChartRow[],
})

const fratSummary = ref({
  total: 24,
  totalLabel: 'Total Flights',
  footnote: "Today's flights",
  segments: [
    { label: 'Low Risk', value: 18, percent: 75, color: '#43A047' },
    { label: 'Medium Risk', value: 4, percent: 17, color: '#FB8C00' },
    { label: 'High Risk', value: 2, percent: 8, color: '#E53935' },
  ] as ChartSegment[],
})

const capaStatus = ref({
  total: 27,
  totalLabel: 'Total CAPA',
  footnote: 'Based on CAPA due date',
  segments: [
    { label: 'Open', value: 5, percent: 19, color: '#1E88E5' },
    { label: 'Due Soon', value: 2, percent: 7, color: '#FB8C00' },
    { label: 'Overdue', value: 2, percent: 7, color: '#E53935' },
    { label: 'Closed (This Month)', value: 18, percent: 67, color: '#43A047' },
  ] as ChartSegment[],
})

const capaAging = ref({
  footnote: 'Based on open CAPA',
  rows: [
    { label: '0 – 7 days', value: 7, percent: 100, color: '#43A047' },
    { label: '8 – 30 days', value: 4, percent: 57, color: '#FB8C00' },
    { label: '31 – 60 days', value: 2, percent: 29, color: '#FB8C00' },
    { label: '> 60 days', value: 2, percent: 29, color: '#E53935' },
  ] as ChartRow[],
})

const spiIndicators = ref({
  footnote: 'Based on current period',
  rows: [
    { label: 'FRAT Compliance', value: '100%', percent: 100, color: '#43A047' },
    { label: 'Hazard Closure Rate', value: '94%', percent: 94, color: '#43A047' },
    { label: 'CAPA On-Time', value: '86%', percent: 86, color: '#FB8C00' },
    { label: 'Reporter Feedback', value: '100%', percent: 100, color: '#43A047' },
    { label: 'Training Compliance', value: '92%', percent: 92, color: '#43A047' },
  ] as ChartRow[],
})

const findings = ref<Finding[]>([
  {
    priority: 'High',
    id: 'HZD-2026-041',
    finding: 'Airstrip drainage inadequate — causes water pooling',
    station: 'Wamena (WMX)',
    riskLevel: 'High',
    owner: 'Station Manager WMX',
    dueDate: '18 Aug 2026',
    status: 'Overdue',
  },
  {
    priority: 'High',
    id: 'HZD-2026-036',
    finding: 'Fuel handling procedure gap during refuelling',
    station: 'Dekai (DKI)',
    riskLevel: 'High',
    owner: 'Station Manager DKI',
    dueDate: '24 Aug 2026',
    status: 'Open',
  },
])

export function useSmsMockData() {
  function refresh() {
    lastUpdated.value =
      new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
  }

  return {
    filters,
    lastUpdated,
    kpis,
    hazardTrend,
    hazardByRiskLevel,
    hazardBySource,
    hazardByStation,
    fratSummary,
    capaStatus,
    capaAging,
    spiIndicators,
    findings,
    refresh,
  }
}