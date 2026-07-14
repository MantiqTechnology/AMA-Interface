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

Open the Nuxt dev URL and use the demo persona switcher in the header to move between Director, OCC, Station Admin, Maintenance Manager, and Demo Admin.

## Scripts

- `pnpm dev`: run Nuxt locally.
- `pnpm build`: build the Nuxt app.
- `pnpm preview`: preview the production build.
- `pnpm db:migrate`: create the SQLite schema.
- `pnpm db:seed`: seed fictional PT AMA data.
- `pnpm demo:reset`: drop/recreate the demo DB and reseed.
- `pnpm demo:export`: export all demo tables to JSON.
- `pnpm test`: run Vitest.
- `pnpm test:e2e`: run Playwright.
- `pnpm lint`: run ESLint.
- `pnpm format`: run Prettier.
- `pnpm typecheck`: run Nuxt type checking.

## Architecture

```text
app/                  Nuxt pages and feature-owned UI components
shared/contracts/     Cross-domain API envelopes and workflow DTOs
shared/features/      Feature-owned Zod schemas and DTOs
server/api/           Explicit H3/Nitro route handlers
server/features/      Feature-owned repositories and services
server/services/      Cross-domain operational workflows and read models
server/db/            Domain schemas, migrations, and deterministic seeds
scripts/              Local demo lifecycle commands
public/uploads/       Mock receipt files and upload target
```

The UI uses Vuetify through `vuetify-nuxt-module`. Brand colors are configured in `nuxt.config.ts` as the `amaLight` Vuetify theme and mirrored in `app/assets/css/theme.css` for CSS utility tokens.

`flight_operations` is the only persisted flight parent. Ticketing, manifests, fuel, station costs, maintenance handoffs, approvals, invoices, dashboard, command center, and flight following all read the same operation ID. Feature repositories map their own DTOs explicitly to SQLite columns; shared infrastructure is limited to database access, HTTP parsing, error handling, and the standard API envelope.

## Demo Flow

1. Run `pnpm demo:reset`, then `pnpm dev`.
2. Open `/flights/requests` to review, approve, and convert a request.
3. Open `/flights` to run readiness, approval, scheduling, check-in, departure, landing, and closure actions.
4. Open `/dashboard` and `/ops/flight-following` to monitor the same canonical flights.
5. Open `/ticketing/management` to review sales readiness, then use `/ticketing/booking` for passenger and cargo booking.
6. Review synchronized passenger and cargo manifests from the flight workspace.
7. Close a ready flight and review the idempotently created draft invoice under Finance.
8. Switch demo roles from the header to exercise server-side workflow permissions.

The ticketing architecture and OCC manifest synchronization are documented in [ticketing-flow.md](ticketing-flow.md).

## Data

The seed includes canonical flight operations, requests, readiness, approvals, manifests, ticketing sales and bookings, fuel workflows, station services and costs, maintenance handoffs, invoices, payments, and domain master data. Aircraft names intentionally use placeholders for Pilatus, Caravan, and PAC types.

## Local Storage

By default the app writes `./data/ama-demo.sqlite`. Override with:

```bash
AMA_DB_PATH=./data/another-demo.sqlite pnpm demo:reset
```

Receipt uploads go to `public/uploads/mock-receipts`. This is deliberate for demo visibility; production storage should move to object storage or an internal document service.
