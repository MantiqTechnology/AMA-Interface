export const scenarioCatalog = [
  [
    'request-queue',
    'Flight request queue',
    'OCC / Director',
    '/flights/requests',
    'Review and process requests'
  ],
  [
    'dg-charter',
    'Converted DG charter',
    'OCC',
    '/flights/readiness',
    'Resolve DG, fuel, and handling blockers'
  ],
  [
    'blocked-readiness',
    'Crew and maintenance blocked',
    'OCC / Maintenance Manager',
    '/flights/readiness',
    'Review hard blockers'
  ],
  ['ready-approval', 'Ready for approval', 'Director', '/flights', 'Approve the flight'],
  [
    'route-advisory',
    'DJJ-NBX route advisory',
    'OCC',
    '/master-data/routes/route-djj-nbx',
    'Confirm round-trip fuel planning'
  ],
  [
    'passenger-sales',
    'Passenger sales',
    'OCC',
    '/ticketing/booking',
    'Sell and collect passenger tickets'
  ],
  [
    'check-in-reschedule',
    'Check-in and reschedule',
    'Station Admin',
    '/ticketing/passenger',
    'Check in or move a passenger'
  ],
  [
    'cargo-acceptance',
    'Cargo acceptance',
    'Station Admin',
    '/ticketing/cargo',
    'Accept cargo and dangerous goods'
  ],
  [
    'refund-review',
    'Refund review',
    'Finance Reviewer',
    '/ticketing/management',
    'Decide pending refunds'
  ],
  [
    'flight-following',
    'Flight following',
    'OCC',
    '/ops/flight-following',
    'Record flight progress'
  ],
  ['weather-diversion', 'Weather diversion', 'OCC', '/flights', 'Review diversion impact'],
  [
    'landed-maintenance',
    'Landed maintenance',
    'Maintenance Manager',
    '/flights/maintenance',
    'Submit maintenance handoff'
  ],
  [
    'pending-closure',
    'Pending closure',
    'OCC / Finance Reviewer',
    '/flights/actual-closure',
    'Complete closure evidence'
  ],
  [
    'closed-invoiced',
    'Closed and invoiced charter',
    'Finance Reviewer',
    '/invoices',
    'Review invoice and payment'
  ],
  [
    'post-operation-exceptions',
    'Post-operation exceptions',
    'OCC / Finance Reviewer',
    '/flights',
    'Review cancellation and correction'
  ],
  [
    'accounting-posting-queue',
    'Accounting posting queue',
    'Finance Reviewer / Director',
    '/finance/accounting',
    'Compare draft, pending approval, approved, and posted journals'
  ],
  [
    'deferred-revenue',
    'Month-end ticket payment',
    'Finance Reviewer',
    '/finance/accounting',
    'Trace cash to deferred passenger revenue before service'
  ],
  [
    'passenger-revenue-recognition',
    'Next-month passenger fulfillment',
    'Finance Reviewer',
    '/finance/accounting',
    'Trace deferred revenue release after the flight closes'
  ],
  [
    'maintenance-treatment',
    'Routine versus heavy maintenance',
    'Finance Reviewer',
    '/finance/accounting',
    'Compare maintenance expense, component asset, and missing-context exception'
  ],
  [
    'asset-reversal',
    'Capitalized component reversal',
    'Director',
    '/finance/accounting',
    'Trace reversal journal, reversed asset, and cancelled depreciation preview'
  ]
] as const;

export function formatScenarioCatalog() {
  return scenarioCatalog
    .map(
      ([key, title, role, path, action], index) =>
        `${String(index + 1).padStart(2, '0')}. ${title}\n    key: ${key}\n    role: ${role}\n    page: ${path}\n    action: ${action}`
    )
    .join('\n\n');
}
