export const stationOperationsTabs = [
  { label: 'Overview', icon: 'mdi-view-dashboard-outline', to: '/flights/station-operations' },
  { label: 'Flights', icon: 'mdi-airplane', to: '/flights/station-operations/flights' },
  { label: 'Services', icon: 'mdi-toolbox-outline', to: '/flights/station-operations/services' },
  {
    label: 'Verification',
    icon: 'mdi-clipboard-check-outline',
    to: '/flights/station-operations/verification'
  },
  {
    label: 'Actual & Closure',
    icon: 'mdi-airplane-check',
    to: '/flights/station-operations/actual-closure'
  },
  {
    label: 'Handoff MRO',
    icon: 'mdi-airplane-wrench',
    to: '/flights/station-operations/maintenance'
  },
  { label: 'Costs', icon: 'mdi-cash-multiple', to: '/flights/station-operations/costs' },
  { label: 'Reports', icon: 'mdi-chart-box-outline', to: '/flights/station-operations/reports' },
  { label: 'Audit Trail', icon: 'mdi-history', to: '/flights/station-operations/audit' }
] as const;
