# Prioritized Backlog

## P0 - Critical

| ID    | Route/page                                           | Evidence                                                                                   | Current behavior                                                 | Problem                                                        | User impact                                   | Aviation/business risk                                            | Recommended pattern                                                    | Power BI inspiration                     | Proposed solution                                                                   | Priority | Estimated effort | Dependency            | Backend impact                                | Acceptance criteria                                                                             |
| ----- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- | -------- | ---------------- | --------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| P0-01 | Global layout, `/dashboard`, `/ops/flight-following` | `mobile-390-dashboard.png`, `mobile-390-flight-following.png`, `Sidebar.vue` lines 663-674 | Content is clipped/occluded in narrow view and rail states.      | Users cannot read titles, filters, KPI names, or map controls. | High friction, unusable mobile/narrow review. | Misreading operational status or missing stale/simulated warning. | Responsive report/workbench layout baseline.                           | Mobile-optimized report view.            | Fix layout offsets, drawer/rail behavior, horizontal overflow, and mobile stacking. | P0       | 1-3 days         | Frontend layout QA    | Frontend only                                 | 390x844 and 1440x900 screenshots show no clipped text/content for audited routes.               |
| P0-02 | `/ops/flight-following`                              | `desktop-1440-flight-following.png`; `flight-following.vue` lines 175-224                  | Map shell appears blank/pale while legend and detail panel load. | Fleet position monitor may not show aircraft markers/routes.   | Operators cannot visually identify aircraft.  | Stale/live/simulated position could be missed.                    | Operational map workbench with explicit load/error/no-position states. | Data freshness and visual state clarity. | Add map load/error/empty telemetry states and canvas-pixel visual QA.               | P0       | 1-3 days         | MapLibre/component QA | Frontend only unless API returns no positions | Map page shows markers/routes or an explicit no-position/error state with source and timestamp. |

## P1 - High

| ID    | Route/page              | Evidence                                                     | Current behavior                                                                       | Problem                                                                | User impact                                 | Aviation/business risk                                   | Recommended pattern                              | Power BI inspiration                                            | Proposed solution                                                                                   | Priority | Estimated effort | Dependency                  | Backend impact                            | Acceptance criteria                                                                              |
| ----- | ----------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- | ---------------- | --------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| P1-01 | Analytical/report pages | `/dashboard`, `/finance/dashboard`; Microsoft filter docs    | Filters exist but active state/scope/reset not standardized.                           | User cannot quickly tell which filters affect which visuals.           | Bad report trust and difficult exploration. | Wrong management decision from hidden scope.             | Common slicer bar + active filter chips + reset. | Slicers, filter pane, visual filter popover.                    | Build `ReportFilterBar` and URL-backed filter model for report pages.                               | P1       | 1 sprint         | Filter schema per page      | Frontend + API for missing filters        | Active filters, count, reset, and affected scope visible on all pilot pages.                     |
| P1-02 | KPI cards               | `DsStatCard.vue`, `FinanceKpiCard.vue`                       | KPI metadata varies; generic cards lack period/source/definition.                      | KPI values can look authoritative without context.                     | Users ask what number means.                | Safety/finance status misread as actual/posted/approved. | KPI Card v2.                                     | KPI tiles with context and accessibility.                       | Extend KPI data shape and UI slots for definition, target, period, variance, source, updated-at.    | P1       | 1 sprint         | Metric definitions          | Frontend + API for definitions/source     | Every pilot KPI shows period/unit/source and definition available.                               |
| P1-03 | `/finance/dashboard`    | `finance/dashboard.vue` lines 11-39 and screenshot           | Period is URL-backed; drill-through is panel links only.                               | Summary cannot reliably carry context into detail.                     | Report exploration breaks.                  | Finance figures lose posted/source/audit context.        | Drill-through contract.                          | Drillthrough to detail report page filtered to selected entity. | Add query context to links: period, metric/category, source route; detail page has back-to-summary. | P1       | 1 sprint         | Router contract             | Frontend + API if detail filters missing  | Opening route revenue/overdue/action preserves period and back button returns with same filters. |
| P1-04 | `/dashboard`            | `dashboard.vue` lines 57-76                                  | Multiple domains combined without standardized source/as-of indicators.                | User cannot distinguish snapshot, live, demo, posted, draft, approved. | Dashboard trust weak.                       | Estimated/simulated data may be read as actual.          | DataFreshnessBadge and source summary.           | Last refreshed, report context.                                 | Add report-level source matrix and last updated; mark demo/live/snapshot/posted.                    | P1       | 1 sprint         | Source timestamps from APIs | Frontend + API for per-source asOf/status | Dashboard header shows period, timezone, last updated, source statuses.                          |
| P1-05 | Permission redirects    | `desktop-1440-permission-redirect-station-admin-finance.png` | Unauthorized finance route redirects to dashboard.                                     | User lacks explanation of denied module/action.                        | Confusion and repeated navigation attempts. | Permission context unclear.                              | Permission denied interstitial/toast.            | Consumer security clarity.                                      | On blocked route, show requested page, active role, missing permission, safe destination.           | P1       | 1-3 days         | Route access utility        | Frontend only                             | Station Admin opening Finance sees explicit denied message before/after redirect.                |
| P1-06 | Tables/work queues      | Flight list, accounting, MRO tables                          | Tables vary in density/actions; analytical matrix not separate from operational table. | Users cannot predict behavior.                                         | Slower repeated work.                       | Wrong action from dense row controls.                    | Table taxonomy: queue/table/matrix/ledger.       | Table/matrix visualization and show data.                       | Define table variants and column/action rules.                                                      | P1       | 1 sprint         | Design system               | Frontend only                             | Flight queue, accounting ledger, finance matrix use distinct documented table variants.          |

## P2 - Medium

- Frontend only: visual header menu for charts/cards (`focus`, `show data`, `export`, `definition`, `copy link`).
- Frontend only: chart palette separation for brand, chart categorical, and operational semantic colors.
- Frontend + API: visual-level data tables for charts where source rows are not already available.
- Frontend only: standardized empty/loading/error/stale states for report panels and workbench tables.
- Frontend only: breadcrumb/back-to-summary preserving filter context on detail pages.
- Frontend + API: export endpoint convention that includes filters, role, source, and generated timestamp.

## P3 - Enhancement

- Personal saved views after URL-backed filters are stable.
- Shared organizational presets by role.
- Report favorites/recent reports.
- Optional AI narrative after metrics, freshness, and traceability are solved.
- Focus mode animations and presentation mode.

## Grouping by Delivery Horizon

### Quick wins: 1-3 days

- Fix layout clipping and horizontal overflow on mobile/rail states.
- Add active filter chips/reset to `/flights` and `/dashboard`.
- Add explicit permission denied explanation for blocked redirects.
- Add standardized "last updated/source/timezone" line on dashboard headers where API already exposes `asOf`/`generatedAt`.

### Short-term: about 1 sprint

- Build `ReportPageShell`, `ReportFilterBar`, `KpiCardV2`, `DataFreshnessBadge`.
- Pilot `/finance/dashboard` with report shell, source context, and drill-through context.
- Pilot `/maintenance` with operational workbench shell and exception-first queue.
- Define table taxonomy and apply to pilots.

### Medium-term: 2-4 sprints

- Drill-through framework across finance, flight operations, MRO, inventory.
- Matrix component for trial balance/HPP/route-cost/account reports.
- Show-data drawer for chart visuals.
- Export framework with audit and permission-safe metadata.

### Long-term/platform capability

- Personal/shared saved views.
- Report catalog with favorites/recent reports.
- Aggregation/reporting layer for stable analytical queries.
- Accessibility audit automation with keyboard and screen-reader checks.

## Change Type Split

- Frontend only: layout fixes, shell, visual headers, filter chips, table variants, accessibility labels, palette tokens.
- Frontend + API: KPI definitions/source timestamps, show-data, export metadata, drill-through filters where endpoints need query support.
- Data model: saved views/bookmarks, report catalog, semantic metric definitions if persisted centrally.
- Permission: saved/shared view ownership and report sharing must enforce current role/RBAC.
- Reporting/aggregation layer: management KPIs, route profitability, MRO trends, finance drill-down requiring consistent snapshot/posted semantics.
