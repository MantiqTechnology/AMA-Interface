# Route Inventory and Repository Evidence

## Frontend Stack

- Nuxt 3.21.8 with `srcDir: app`, `serverDir: server`.
- Vuetify 4.1 via `vuetify-nuxt-module`.
- Tailwind CSS 4 through Vite plugin and `app/assets/css/main.css`.
- ApexCharts via `apexcharts` and `vue3-apexcharts`.
- MapLibre GL via `maplibre-gl`.
- MDI icons via `@mdi/font`.
- Data fetching mostly through `useAsyncData` + `fetchApi`; asset-management still uses `useFetch`/`$fetch` in some pages.

Evidence: `package.json`, `nuxt.config.ts`, `app/composables/useApiEnvelope.ts`, `app/components/feature/ApexChart.client.vue`.

## Global Layout

- `app/layouts/default.vue`: global `Sidebar`, `Topbar`, `VMain`.
- `app/components/layout/sidebar/Sidebar.vue`: permission-aware sidebar.
- `app/components/layout/Topbar.vue`: top page title, theme toggle, language, notifications, persona switch.
- `app/middleware/demo-route-access.global.ts`: client-side route access redirect.

## Design Tokens

- `nuxt.config.ts`: Vuetify themes `amaLight`, `amaDark`.
- `app/assets/css/theme.css`: CSS token mirror for brand, accent, semantic, background, text, border.
- `app/constants/themeColors.ts`: chart/theme hex constants used in pages.

## Reusable Components

- Generic DS: `DsStatCard`, `DsStatusBadge`, `DsTooltipIconButton`, `DsConfirmIconButton`.
- Finance: `FinancePageHeader`, `FinancePanel`, `FinanceKpiCard`, `FinanceStatusBadge`.
- Flight: `FlightOperationTable`, `FlightStatusChip`.
- Map: `OperationsFlightFollowingMap`.
- Station operations: `StationOperationsHeader`, `StationOperationsTabs`, feedback/dialog components.
- Maintenance UI helpers: `useMaintenanceUi`.
- Inventory shell: `InventoryShell`.
- Corporate assets shell/components.

## State and Permission

- Demo roles and permissions: `shared/types/roles.ts`.
- Frontend permission helper: `app/composables/useAuthorization.ts`.
- Route redirect: `app/middleware/demo-route-access.global.ts`.
- Server permission helper: `server/utils/auth.ts`.

Captured permission behavior: with cookie role `Station Admin`, opening `/finance/dashboard` redirects to `/dashboard`; screenshot `desktop-1440-permission-redirect-station-admin-finance.png`.

## Route Inventory

### Executive / Management / Reports

| Route                                 | Source file                                        | Type                          | Evidence                                                                                       |
| ------------------------------------- | -------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `/dashboard`                          | `app/pages/dashboard.vue`                          | Management dashboard          | Uses multi-source dashboard API calls and ApexCharts. Screenshot `desktop-1440-dashboard.png`. |
| `/finance/dashboard`                  | `app/pages/finance/dashboard.vue`                  | Finance analytical dashboard  | Period selector and reporting API. Screenshot `desktop-1440-finance-dashboard.png`.            |
| `/finance/hpp`                        | `app/pages/finance/hpp.vue`                        | Finance profitability report  | Uses `/api/finance/reporting/profitability`.                                                   |
| `/finance/trial-balance`              | `app/pages/finance/trial-balance.vue`              | Accounting report             | Uses `/api/finance/reporting/trial-balance`.                                                   |
| `/flights/station-operations/reports` | `app/pages/flights/station-operations/reports.vue` | Station report page           | Static code evidence only in this audit.                                                       |
| `/asset-management/overview`          | `app/pages/asset-management/overview.vue`          | Asset management dashboard    | Static code evidence only.                                                                     |
| `/inventory`                          | `app/pages/inventory/index.vue`                    | Inventory dashboard/workbench | Static code evidence only.                                                                     |
| `/hris/kpi`                           | `app/pages/hris/kpi/index.vue`                     | HR KPI report                 | Static code evidence only.                                                                     |

### Operational Workspaces

| Route                             | Source file                                          | Type                            | Evidence                                                       |
| --------------------------------- | ---------------------------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| `/flights`                        | `app/pages/flights/index.vue`                        | Flight order queue/list         | Screenshot `laptop-1280-flights-list.png`.                     |
| `/flights/[id]`                   | `app/pages/flights/[id]/index.vue`                   | Flight detail/workflow          | Screenshot `desktop-1440-flight-detail.png`.                   |
| `/flights/requests`               | `app/pages/flights/requests/index.vue`               | Flight request queue            | Static code evidence only.                                     |
| `/flights/requests/new`           | `app/pages/flights/requests/new.vue`                 | Flight request form             | Static code evidence only.                                     |
| `/flights/readiness`              | `app/pages/flights/readiness/index.vue`              | Readiness workbench             | Static code evidence only.                                     |
| `/flights/manifest`               | `app/pages/flights/manifest/index.vue`               | Manifest control                | Static code evidence only.                                     |
| `/flights/fuel`                   | `app/pages/flights/fuel/index.vue`                   | Fuel control                    | Static code evidence only.                                     |
| `/flights/station-operations/*`   | multiple files                                       | Station operations workflow     | Screenshot `desktop-1440-station-verification.png`.            |
| `/ops/flight-following`           | `app/pages/ops/flight-following.vue`                 | Radar/map operational monitor   | Screenshots desktop/mobile.                                    |
| `/finance/accounting`             | `app/pages/finance/accounting.vue`                   | Accounting workbench            | Screenshot `desktop-1440-accounting-workbench.png`.            |
| `/maintenance`                    | `app/pages/maintenance/index.vue`                    | MRO command center              | Screenshot `desktop-1440-maintenance-command-center.png`.      |
| `/maintenance/work-packages/[id]` | `app/pages/maintenance/work-packages/[id]/index.vue` | MRO workflow detail             | Screenshot `desktop-1440-maintenance-work-package-detail.png`. |
| `/inventory/*`                    | multiple files                                       | Inventory/procurement workflows | Static code evidence only.                                     |
| `/asset-management/*`             | multiple files                                       | Corporate asset workflows       | Static code evidence only.                                     |

### Master Data / Administration

Master data routes exist for aircraft, stations, routes, personnel, flight reasons, capacity profiles, flight schedule templates, finance vendors/suppliers/taxes/currencies/payment terms/chart of accounts, commercial customers/agents/rates, cargo DG categories.

Administration route: `/admin/access-demo`.

## API/Data Contracts Verified

- Flight operations: `shared/contracts/flight-operations.ts`, APIs under `server/api/flight-operations`.
- Operations monitoring: `shared/contracts/operations-monitoring.ts`, `/api/dashboard`, `/api/flight-operations/flight-following`.
- Finance reporting: `shared/features/finance/reporting.ts`, `/api/finance/reporting/dashboard`, `/periods`, `/profitability`, `/trial-balance`.
- Finance accounting: `shared/features/finance/accounting.ts`, `/api/finance/accounting/*`.
- Maintenance: `shared/features/maintenance.ts`, `/api/maintenance/*`.
- Inventory: `shared/features/inventory.ts`, `/api/inventory/*`.

## Visual States Observed

- Loading: Finance dashboard skeleton (`app/pages/finance/dashboard.vue` lines 129-137).
- Empty: Finance route revenue empty state in screenshot.
- Error: Finance error alert (`app/pages/finance/dashboard.vue` lines 121-127), MRO error alert (`app/pages/maintenance/index.vue` lines 401-403).
- Stale: MRO stale warning (`app/pages/maintenance/index.vue` lines 159-162, 398-400).
- Permission: redirect behavior via middleware, no explicit denied page captured.
- Blocked action: disabled `Process inventory events` in accounting workbench; MRO release blockers visible.
