# Finance Phase 2 Design

## Scope and constraints

Phase 2 extends the accepted Phase 1 accounting foundation. `AccountingService` remains the only posting engine, posted journal lines remain the general-ledger source of truth, and canonical finance handoffs remain an orchestration layer over source-owned transactions.

The implementation is an enterprise functional demonstration. It does not introduce direct banking, regulatory tax filing, consolidation, complex foreign-exchange revaluation, or certified record retention.

## F5: adjustments and period closing

### Period lifecycle

`accounting_periods.status` supports `OPEN`, `CLOSING`, and `CLOSED`. Reopening is represented by an approval record rather than an unaudited status toggle:

`CLOSED -> reopen request -> approval by another authorized actor -> OPEN`.

Closing runs own checklist items. Computed critical controls include balanced trial balance, no unposted journal in the period, no open critical accounting/handoff exception, and completed bank reconciliation review. Operational review items (AR, AP, accrual, prepayment, depreciation) are explicitly attested with actor and timestamp. Closing cannot complete while a required item is blocked or incomplete.

### Adjustments

Accruals and prepayments are finance-owned source records. Their posting methods create canonical accounting events through `AccountingService.postCanonicalEvent`; they never write journal entries or lines directly. Settlement state changes occur only after a posted journal is returned.

Accrual reversal uses the existing controlled journal reversal mechanism. Prepayment recognition is a schedule line whose recognized state is updated atomically with successful canonical posting.

### Depreciation

The existing `asset_register` and `depreciation_schedules` remain finance book-value truth and retain links to the physical managed asset. A depreciation run selects scheduled lines for one period, sends each line to `AccountingService`, and marks a line posted only after the journal is posted. Retrying is idempotent by schedule ID.

## F6: operational integration

Existing source records remain authoritative. Flight, ticketing, fuel, MRO, procurement, inventory, and asset transactions are bridged to finance handoffs/accounting events with deterministic source keys. Existing inventory and station-cost accounting events are referenced by the handoff and are not reposted.

Flight, aircraft, route, station, cost center, and work package attribution is stored through reusable financial dimensions. Route can be resolved from the source flight when a journal has a flight dimension.

The legacy HRIS payroll method must not insert journals. An approved payroll run may create an HRIS finance handoff using its run ID as idempotency key. Payroll accounting remains a limitation until a reviewed payroll posting policy and liability split are configured.

## F7: financial statements and aviation analytics

Trial Balance, P&L, Balance Sheet, dashboard KPIs, and aviation profitability all aggregate posted journal lines joined to canonical chart-of-account classifications.

P&L uses period activity for revenue and expense accounts. Balance Sheet uses cumulative activity through period end. Current earnings are shown in equity so that the displayed statement reconciles while no closing-to-retained-earnings run exists yet.

Aviation profitability includes only journal lines with explicit dimensions. No revenue-share allocation or invoice snapshot is used. Each component exposes journal, accounting-event, and source identifiers for drill-down. Route and station totals aggregate only attributed flight/journal data.

Cash flow is limited to a basic GL-backed demonstration when a reliable source classification exists; it is not synthesized from static values.

## F8: audit, export, and traceability

A canonical finance audit log records critical Phase 2 actions and is reused by closing, adjustments, depreciation, reconciliation, exports, and traceability-relevant transitions. Records include actor, action, entity, timestamp, reason, source reference, and optional before/after JSON.

Controlled exports are generated from the same service queries used by the UI. Export authorization is enforced in the API, and every successful export records an audit entry. No export creates a second accounting dataset.

Traceability resolves both directions using canonical identifiers:

`source -> handoff -> accounting event -> journal -> journal lines/report component`

and the reverse chain from a report or journal line to source records.

## Acceptance boundaries

Phase 2 passes only when Phase 1 regression remains green, all F5-F8 targeted tests pass, the six final scenarios pass, and database integrity queries report no unbalanced posting, duplicate posting, subledger/GL difference, invalid closed-period posting, or untraceable critical event.
