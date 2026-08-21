# Finance Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a transactionally consistent Phase 1 Finance system covering foundation controls, canonical handoffs, AR/AP settlement, cash/bank projection, and reconciliation.

**Architecture:** Keep `AccountingService` as the only journal posting engine. Add source-preserving orchestration and transactional subledger services whose posted allocations reference accounting events/journals; derive cash book data from posted GL lines.

**Tech Stack:** Nuxt 3, TypeScript, H3, Zod, better-sqlite3, Drizzle schema declarations, Vuetify, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-21-finance-phase-1-design.md`

## Global Constraints

- Do not reset, clean, commit, or push the repository.
- Preserve existing untracked and unrelated user files.
- `AccountingService` remains the single posting engine.
- Existing accounting invariants and baseline tests must remain green at every milestone.
- Journal/GL/Trial Balance are the accounting source of truth.
- Money is stored as integer minor/base units; threshold normalization stores the rate used.
- No hardcoded critical Finance dashboard state.
- Stop at F4; Phase 2 reporting, closing, accrual, depreciation, and profitability are excluded.

---

### Task 1: F0 Regression Lock and Ownership Contract

**Files:**

- Create: `docs/superpowers/specs/2026-08-21-finance-phase-1-design.md`
- Modify: `tests/features/accounting-core.test.ts`
- Modify: `tests/features/inventory-accounting.test.ts`
- Modify: `tests/services/station-service-cost-hybrid.test.ts`

**Interfaces:**

- Consumes: existing accounting services and seeded policy data.
- Produces: executable regression coverage for balanced posting, immutability, reversal, duplicate source, locked period, GL/TB lineage, inventory receipt/issue, and station cost.

- [ ] Run the existing F0 suite per file with one worker and record the passing counts.
- [ ] Add only missing behavior-level regression assertions, starting with a failing test if a gap exists.
- [ ] Run the complete F0 suite before proceeding to schema changes.

### Task 2: F1 Canonical Foundation

**Files:**

- Modify: `server/db/migrate.ts`
- Modify: `server/db/schema/finance.ts`
- Modify: `server/db/seeds/master-data/finance.ts`
- Modify: `shared/features/finance/accounting.ts`
- Modify: `server/features/finance/accounting/service.ts`
- Create: `server/features/finance/approvals/service.ts`
- Create: `server/features/finance/approvals/index.ts`
- Test: `tests/features/finance-foundation.test.ts`

**Interfaces:**

- Produces: generic financial dimensions, source-aware effective posting policies, `ApprovalAuthorityService.resolve(transactionType, amountMinor, currencyCode, exchangeRateToIdrMicros)`, and canonical period/CoA validation.

- [ ] Write failing tests for generic route/work-package dimensions and currency-normalized approval thresholds.
- [ ] Add migration/schema tables for dimension values and approval authority rules/decisions.
- [ ] Extend `AccountingService` source events to persist generic dimensions while retaining legacy fields.
- [ ] Seed deterministic Phase 1 approval rules and required GL accounts/policies.
- [ ] Run foundation tests and the full F0 suite.

### Task 3: F2 Canonical Finance Handoff Domain

**Files:**

- Modify: `server/db/migrate.ts`
- Modify: `server/db/schema/finance.ts`
- Create: `shared/features/finance/handoffs.ts`
- Create: `server/features/finance/handoffs/service.ts`
- Create: `server/features/finance/handoffs/index.ts`
- Modify: `server/services/index.ts`
- Create: `server/api/finance/handoffs/index.get.ts`
- Create: `server/api/finance/handoffs/[id].get.ts`
- Create: `server/api/finance/handoffs/[id]/accept.post.ts`
- Create: `server/api/finance/handoffs/[id]/retry.post.ts`
- Test: `tests/features/finance-handoffs.test.ts`

**Interfaces:**

- Produces: `FinanceHandoffService.receive`, `bridgePendingSources`, `validate`, `accept`, and `retry`; unique identity `(source_module, source_type, source_event_id)`.

- [ ] Write failing tests for received, validated, accepted, exception, retry, and duplicate retry behavior.
- [ ] Add handoff, status-history, and exception persistence with source identity uniqueness.
- [ ] Implement source adapters for flight/station cost, inventory, ticketing, procurement, fuel, and MRO records.
- [ ] Route accounting creation exclusively through `AccountingService` and persist event/journal lineage.
- [ ] Run F2 tests plus F0/F1 regression gates.

### Task 4: F2 Finance Handoff Inbox

**Files:**

- Create: `app/pages/finance/handoffs.vue`
- Create: `app/features/finance/handoffs/HandoffTable.vue`
- Modify: `app/components/layout/sidebar/Sidebar.vue`
- Modify: `shared/types/roles.ts`
- Modify: `app/utils/demoRouteAccess.ts`
- Test: `tests/features/finance-handoff-workbench.test.ts`

**Interfaces:**

- Consumes: handoff list/detail/accept/retry APIs.
- Produces: searchable, filterable, paginated workbench with status, exception, source, dimensions, and accounting links.

- [ ] Write failing tests for filter/query normalization and action permission behavior.
- [ ] Build inbox states and critical-action confirmation using existing Vuetify patterns.
- [ ] Add navigation and backend-enforced permissions.
- [ ] Run UI unit tests and F2 service tests.

### Task 5: F3A AR Invoice Recognition and Subledger

**Files:**

- Modify: `server/db/migrate.ts`
- Modify: `server/db/schema/billing.ts`
- Modify: `shared/features/finance/invoices.ts`
- Modify: `server/features/finance/invoices/service.ts`
- Modify: `server/features/finance/invoices/repository.ts`
- Test: `tests/features/accounts-receivable.test.ts`
- Modify: `tests/services/invoices.service.test.ts`

**Interfaces:**

- Produces: explicit invoice recognition ownership, separate lifecycle/settlement states, and outstanding derived from posted allocations.

- [ ] Write failing tests proving prepaid passenger/cargo billing creates no duplicate AR/revenue event.
- [ ] Write failing test proving a charter credit invoice creates one AR journal.
- [ ] Add invoice recognition profile and settlement metadata without using status as balance truth.
- [ ] Route invoice recognition through `AccountingService` and make retry idempotent.
- [ ] Run AR invoice tests and F0-F2 gates.

### Task 6: F3A Receipts and Atomic Allocation

**Files:**

- Modify: `server/db/migrate.ts`
- Modify: `server/db/schema/billing.ts`
- Create: `shared/features/finance/receipts.ts`
- Create: `server/features/finance/receipts/service.ts`
- Create: `server/features/finance/receipts/index.ts`
- Create: `server/api/finance/receipts/index.get.ts`
- Create: `server/api/finance/receipts/index.post.ts`
- Create: `server/api/finance/receipts/[id]/allocate.post.ts`
- Create: `server/api/finance/receipts/[id]/post.post.ts`
- Test: `tests/features/accounts-receivable.test.ts`

**Interfaces:**

- Produces: unallocated receipt, allocation, atomic posting, partial/full settlement, duplicate allocation guard, and `Dr Cash/Bank / Cr AR` journal lineage.

- [ ] Write failing tests for unallocated, partial, multiple receipt, full settlement, duplicate allocation, and accounting failure rollback.
- [ ] Implement receipt/allocation tables and one SQLite transaction for posting plus settlement.
- [ ] Redirect legacy invoice payment recording through receipt workflow.
- [ ] Run AR golden scenario and F0-F2 gates.

### Task 7: F3B Supplier Invoice, Matching, and AP

**Files:**

- Modify: `server/db/migrate.ts`
- Modify: `server/db/schema/finance.ts`
- Create: `shared/features/finance/payables.ts`
- Create: `server/features/finance/payables/service.ts`
- Create: `server/features/finance/payables/index.ts`
- Create: `server/api/finance/payables/invoices/index.get.ts`
- Create: `server/api/finance/payables/invoices/index.post.ts`
- Create: `server/api/finance/payables/invoices/[id]/submit.post.ts`
- Create: `server/api/finance/payables/invoices/[id]/approve.post.ts`
- Test: `tests/features/accounts-payable.test.ts`

**Interfaces:**

- Produces: PO/non-PO supplier invoices, three-way match statuses, GRNI settlement, non-PO recognition, AP outstanding, and source lineage.

- [ ] Write failing tests for matched, quantity variance, price variance, missing PO/GR, PO GRNI clearing, and non-PO expense recognition.
- [ ] Implement supplier invoice and matching persistence.
- [ ] Resolve PO invoice debit to GRNI/variance and non-PO debit through canonical policy.
- [ ] Enforce maker-checker and approval threshold backend rules.
- [ ] Run AP invoice tests and F0-F3A gates.

### Task 8: F3B Payment Requests, Payments, and AP Settlement

**Files:**

- Modify: `server/db/migrate.ts`
- Modify: `server/db/schema/finance.ts`
- Modify: `shared/features/finance/payables.ts`
- Modify: `server/features/finance/payables/service.ts`
- Create: `server/api/finance/payables/payment-requests/index.post.ts`
- Create: `server/api/finance/payables/payment-requests/[id]/submit.post.ts`
- Create: `server/api/finance/payables/payment-requests/[id]/approve.post.ts`
- Create: `server/api/finance/payables/payment-requests/[id]/execute.post.ts`
- Test: `tests/features/accounts-payable.test.ts`

**Interfaces:**

- Produces: DRAFT/SUBMITTED/APPROVED/EXECUTED lifecycle, self-approval rejection, atomic payment allocation, and `Dr AP / Cr Cash/Bank` posting.

- [ ] Write failing tests for lifecycle, self-approval, threshold role, partial/full settlement, duplicate execution, and posting rollback.
- [ ] Implement requests, payments, allocations, and accounting orchestration in one transaction.
- [ ] Run AP golden scenario and all previous gates.

### Task 9: F4 Cash/Bank Projection and Reconciliation

**Files:**

- Modify: `server/db/migrate.ts`
- Modify: `server/db/schema/finance.ts`
- Create: `shared/features/finance/treasury.ts`
- Create: `server/features/finance/treasury/service.ts`
- Create: `server/features/finance/treasury/index.ts`
- Create: `server/api/finance/treasury/accounts.get.ts`
- Create: `server/api/finance/treasury/book-transactions.get.ts`
- Create: `server/api/finance/treasury/statements/index.post.ts`
- Create: `server/api/finance/treasury/statements/[id].get.ts`
- Create: `server/api/finance/treasury/reconciliations/match.post.ts`
- Test: `tests/features/cash-bank-reconciliation.test.ts`

**Interfaces:**

- Produces: GL-mapped accounts, journal-line-backed book projections, external statements, auto/manual match, unmatched/partial/exception/reconciled states.

- [ ] Write failing tests proving receipt/payment projections require posted cash/bank journal lines.
- [ ] Write failing tests for matched/unmatched/manual match and journal immutability during reconciliation.
- [ ] Implement projection refresh/reference, CSV/manual statement ingestion, and matching.
- [ ] Run bank reconciliation golden scenario and all previous gates.

### Task 10: Phase 1 Operational UI and Real Dashboard

**Files:**

- Modify: `app/pages/finance/dashboard.vue`
- Create: `app/pages/finance/receivables.vue`
- Create: `app/pages/finance/receipts.vue`
- Create: `app/pages/finance/payables.vue`
- Create: `app/pages/finance/payments.vue`
- Create: `app/pages/finance/cash-bank.vue`
- Create: `app/pages/finance/reconciliation.vue`
- Modify: `app/components/layout/sidebar/Sidebar.vue`
- Modify: `server/features/finance/reporting/service.ts`
- Modify: `shared/features/finance/reporting.ts`
- Test: `tests/features/finance-dashboard.test.ts`
- Test: `tests/e2e/finance-phase-1.spec.ts`

**Interfaces:**

- Consumes: real handoff, AR, AP, cash/bank, reconciliation, journal, and reporting APIs.
- Produces: operational Phase 1 workspaces with loading/error/empty/filter/status/permission/blocker/source/audit states.

- [ ] Write failing dashboard test for cash, AR, AP, unposted journal, and handoff exception metrics from persisted transactions.
- [ ] Replace all mock dashboard data and unsupported routes with backend DTO data.
- [ ] Build functional list/action pages using shared tables and confirmation dialogs.
- [ ] Add navigation only for working pages.
- [ ] Run UI tests and Playwright golden scenarios.

### Task 11: Final Integrity and Acceptance Gate

**Files:**

- Create: `scripts/verify-finance-phase-1.ts`
- Modify: `package.json`

**Interfaces:**

- Produces: repeatable integrity output for unbalanced journals, duplicate postings, AR/AP-to-GL differences, unreconciled bank lines, and handoff exceptions.

- [ ] Add a read-only verification script that exits non-zero for Phase 1 invariant breaches.
- [ ] Reset an isolated demo database and run P1-A through P1-E.
- [ ] Run targeted tests, full existing Finance regression, typecheck, build, and Playwright.
- [ ] Inspect `git diff` and `git status`; do not commit or push.
- [ ] Report PASS only when F0-F4 and every accounting invariant pass.
