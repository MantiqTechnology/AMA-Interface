# Finance Phase 2 Implementation Plan

## F5: adjustment and closing

1. Add failing service tests for accrual posting/reversal, prepayment recognition, depreciation, closing blockers, close, period guard, and controlled reopening.
2. Extend finance schema/migrations and demo seeds for closing, adjustments, schedules, and required canonical accounting policies.
3. Implement audit support and F5 services using `AccountingService` exclusively for posting.
4. Add closing/adjustment API contracts, endpoints, and operational UI.
5. Run F5 tests plus the 59-test Phase 1 gate.

## F6: operational integration

1. Add failing integration tests for a real flight's revenue/cost chain, fuel dimensions, MRO cost, procurement GR/AP non-duplication, and retry idempotency.
2. Strengthen source adapters and handoff lineage without replacing source-owned records.
3. Replace direct HRIS journal insertion with an idempotent finance-handoff bridge; report payroll posting as not applicable until its posting split is configured.
4. Add source-link and operational component APIs/UI where existing workspaces lack drill-back.
5. Run F6 tests and the F0-F5 regression gate.

## F7: reporting and aviation analytics

1. Add failing reconciliation tests for GL-backed P&L, Balance Sheet, dashboard KPIs, and flight/route/station profitability.
2. Replace snapshot-based profitability and remaining mock dashboard paths with posted-GL queries.
3. Add financial statement and aviation profitability endpoints, shared contracts, drill-down results, and UI workspaces.
4. Verify every displayed component reconciles to posted journal lines.
5. Run F7 tests and the F0-F6 regression gate.

## F8: audit, exports, and final acceptance

1. Add failing tests for critical audit records, authorized exports, export audit, and bidirectional traceability.
2. Extend canonical audit coverage across Phase 2 critical actions and relevant Phase 1 financial actions.
3. Implement controlled CSV exports from real service queries and traceability APIs/UI.
4. Run final scenarios, integrity SQL, API smoke tests, desktop/mobile Playwright, typecheck, build, relevant lint, and `git diff --check`.
5. Produce the required Phase 2 report without committing or pushing.
