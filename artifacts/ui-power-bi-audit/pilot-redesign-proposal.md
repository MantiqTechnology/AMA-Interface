# Pilot Redesign Proposal

## Pilot 1 - `/finance/dashboard`

Reason: best analytical/reporting candidate. It already has a reporting API, period selector, KPI metrics, refresh, loading/error state, Finance-specific components, and source concepts such as posted ledger and invoice snapshots.

### Proposed Structure

- Page title and context: "Finance Dashboard"; subtitle explicitly states "Posted ledger period 2026-08 (OPEN), IDR, Asia/Jakarta, source: posted journals + invoice snapshots".
- KPI row: Recognized Revenue, Operating Expense, Net Result, Cash Position, Overdue Receivables. Each KPI includes period, comparison, definition, source, last updated.
- Common slicer: Accounting Period, Currency, Business Line if API supports it, Posted Status scope.
- Primary visual: Gross Margin by Business Line with visual header.
- Secondary visual: Route Revenue ranked table/chart with "show data".
- Exception list: Overdue receivables, accounting exceptions, contract/subsidy absorption.
- Detail table: Ledger control summary with drill-through to Accounting Workbench or Journal Detail.
- Drill-through destination: `/finance/accounting?tab=general-ledger&period=2026-08&source=finance-dashboard` and invoice detail routes where available.
- Filter drawer: advanced filters only; collapsed by default.
- Last updated/source indicator: page-level plus visual-level if source timestamps differ.
- Empty/loading/error states: retain current skeleton pattern, add filter-aware empty states.
- Responsive behavior: mobile single-column KPI cards, sticky period/filter bar, charts convert to compact tables where needed.

### Low-Fidelity Layout

```text
[Finance Dashboard] [Period: 2026-08 OPEN] [Refresh] [Source/As of]
[Active filters: Period 2026-08 | Posted ledger only] [Reset]

[Revenue KPI] [Expense KPI] [Net Result KPI] [Cash KPI] [Overdue AR KPI]

[Gross Margin by Business Line .......... visual menu]
[Route Revenue / Show Data .............. visual menu]

[Requires Attention]
  Overdue receivables | Accounting exceptions | Contract absorption

[Ledger Control]
  Trial balance | Open exceptions | Period status | Posted journals
```

## Pilot 2 - `/maintenance`

Reason: high aviation safety value and strong operational workflow. It must remain a workbench, not a BI dashboard. The pilot should use Power BI-inspired clarity for filters, source freshness, and drill-through while preserving MRO controls.

### Proposed Structure

- Page title and context: "Maintenance Command Center"; role/station scope; generatedAt; stale threshold; controlled data warning.
- KPI row: Unserviceable aircraft, Release blockers, Awaiting inspection, Approved data blockers, Material blockers. Each KPI links to filtered exception queue.
- Common slicer: Aircraft, technical state, current stage, blocker category, owner.
- Primary visual: MRO flow strip Defect -> Work Package -> Job Card -> Sign-off -> Inspection -> Release -> Audit as workflow status, not decorative chart.
- Secondary visual: Blocker taxonomy count; only if source supports categories.
- Exception list: "Perlu perhatian" is primary; make it first actionable section below KPI.
- Detail table: operational attention queue with sticky header and action column.
- Drill-through destination: work package detail, defect detail if route exists, aircraft maintenance record.
- Filter drawer: advanced filters such as dateFrom/dateTo, actorRole, audit action from `maintenanceAuditListQuerySchema`.
- Last updated/source indicator: generatedAt, stale warning, source: `/api/maintenance/command-center`.
- Empty/loading/error states: no-action state must say whether data is fresh and filters are active.
- Responsive behavior: mobile uses queue-first layout; cards stack; no horizontal clipping.

### Low-Fidelity Layout

```text
[Maintenance Command Center] [Role/Scope] [Generated 2026-08-03 12:35] [Refresh]
[Controlled MRO data verified] [Stale warning if >10 min]

[Unserviceable] [Release blockers] [Awaiting inspection] [Approved data] [Material]
[Filters: Aircraft | Stage | Blocker | Owner] [Active chips] [Reset]

[MRO Flow: Defect > Package > Job Card > Sign-off > Inspection > Release > Audit]

[Exception Queue: Perlu Perhatian]
Aircraft | Technical item | Package/stage | Blocker/next action | Owner | Open

[Secondary panels]
Ready for release | Independent inspections | Recent audit
```

## Pilot Boundaries

- Do not change backend safety guard, permission, or business workflow.
- Do not invent metrics if API does not provide source/status/definition.
- Do not make operational actions look like chart interactions.
- Redesign should improve familiarity through layout, filters, drill-through, and source traceability, not Power BI trade dress.
