# PT AMA Ops Interface

Nuxt 3 + TypeScript demo app for an internal aviation operations prototype. It is shaped like a production application, but tuned for local laptop demos with a SQLite database, deterministic seed data, and a simple role switcher.

## Setup

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
pnpm install
cp .env.example .env
pnpm demo:reset
pnpm dev
```

If pnpm blocks native build scripts for `better-sqlite3`, run `pnpm approve-builds`, select `better-sqlite3`, then rerun `pnpm demo:reset`.

Open the Nuxt dev URL and use the demo persona switcher in the header to move between Flight Coordinator, OCC Staff, Chief of Pilot, Station Operations, Finance, Maintenance, Platform Administrator, and Pilot Self Service personas.

## Scripts

- `pnpm dev`: run Nuxt locally.
- `pnpm build`: build the Nuxt app.
- `pnpm preview`: preview the production build.
- `pnpm db:migrate`: create the SQLite schema.
- `pnpm db:seed`: seed fictional PT AMA data.
- `pnpm demo:reset`: drop/recreate the demo DB and reseed.
- `pnpm demo:export`: export all demo tables to JSON.
- `pnpm test`: run Vitest.
- `pnpm lint`: run ESLint.
- `pnpm format`: run Prettier.
- `pnpm typecheck`: run Nuxt type checking.

## Architecture

```text
app/                  Nuxt UI, layouts, composables, placeholder feature pages
app/utils/operations/ Pure readiness, authorization, and formatter helpers
shared/contracts/     Zod schemas and typed DTOs used by client and server
shared/types/         Cross-cutting types such as demo roles
server/api/           H3/Nitro route handlers with validation and response envelopes
server/services/      Business workflows and domain actions
server/repositories/  Interfaces plus SQLite/Drizzle implementations
server/db/            Drizzle schema, local connection, migration and seed helpers
scripts/              Local demo lifecycle commands
public/uploads/       Mock receipt files and upload target
```

The UI uses Vuetify through `vuetify-nuxt-module`. Brand colors are configured in `nuxt.config.ts` as the `amaLight` Vuetify theme and mirrored in `app/assets/css/theme.css` for CSS utility tokens.

The route handlers only validate input and call services. Services depend on repository interfaces. For a production backend, keep the UI, contracts, API envelope, and service calls stable, then replace `createSqliteRepositories` in `server/services/index.ts` with repositories backed by Postgres, an internal API, or a queue/workflow system.

The Operations Command Center demo reads `data/ops-demo-db.json` into a local Nuxt state store. Readiness and authorization are pure functions under `app/utils/operations`; the same rules should move to a server/API boundary for production. UI permissions are demo-friendly explanations only, while store mutations still call the same authorization guard before changing local state.

## Demo Flow

1. Run `pnpm demo:reset` for the SQLite backend seed, then `pnpm dev`.
2. Open `/ops/command-center` and review critical medevac/charter alerts.
3. Open `FR-20260706-001`, switch to Chief of Pilot, approve it, and confirm the created flight in Flight Following.
4. Open `FR-20260706-002` to show medevac urgency does not bypass fuel and duty-time blockers.
5. Open `FR-20260706-003` to show expired crew qualification and pending handling blockers.
6. Open `/ops/flight-following`, review active `AMA702`, and manually move valid statuses.
7. Open `FLT-AMA-0705-009` from flight detail/closure to show closed finance and maintenance handoff preview.
8. Use `/admin/access-demo` as Platform Administrator to toggle non-mandatory module entitlements locally.

## Data

The seed includes fictional aircraft, stations, routes, customers, flight orders, manifests, fuel requests/uplifts, station expenses, maintenance work orders, serialized parts, invoices, payments, approvals, and alerts. Aircraft names intentionally use placeholders for Pilatus, Caravan, and PAC types.

## Local Storage

By default the app writes `./data/ama-demo.sqlite`. Override with:

```bash
AMA_DB_PATH=./data/another-demo.sqlite pnpm demo:reset
```

Receipt uploads go to `public/uploads/mock-receipts`. This is deliberate for demo visibility; production storage should move to object storage or an internal document service.
