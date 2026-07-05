# AMA Interface

Nuxt 3 + TypeScript demo app for an internal PT AMA aviation operations interface. The app is shaped like a production workflow, but tuned for local demos with SQLite, deterministic seed data, API contracts, and a demo persona switcher.

## Tech Stack

- Nuxt 3, Vue, TypeScript
- Vuetify via `vuetify-nuxt-module`
- SQLite with Drizzle ORM
- Zod contracts shared by client and server
- Vitest, ESLint, Prettier, Husky, lint-staged

## Getting Started

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
pnpm install
cp .env.example .env
pnpm demo:reset
pnpm dev
```

Open the Nuxt dev URL shown in the terminal. Use the demo persona switcher in the header to move between operations, finance, maintenance, admin, and pilot views.

If pnpm blocks native build scripts for `better-sqlite3`, run:

```bash
pnpm approve-builds
pnpm demo:reset
```

## Environment

Copy `.env.example` to `.env` for local development.

```env
DEMO_MODE=true
AMA_DB_PATH=./data/ama-demo.sqlite
```

Local SQLite databases and generated demo exports under `data/` are ignored by git.

## Scripts

- `pnpm dev`: run Nuxt locally.
- `pnpm build`: build the Nuxt app.
- `pnpm preview`: preview the production build.
- `pnpm db:migrate`: create the SQLite schema.
- `pnpm db:seed`: seed fictional PT AMA data.
- `pnpm demo:reset`: drop/recreate the demo DB and reseed.
- `pnpm demo:export`: export demo tables to JSON.
- `pnpm test`: run Vitest.
- `pnpm lint`: run ESLint.
- `pnpm format`: run Prettier.
- `pnpm typecheck`: run Nuxt type checking.

## Project Layout

```text
app/                  Nuxt UI, layouts, pages, components, composables
app/utils/operations/ Pure readiness, authorization, and formatter helpers
shared/contracts/     Zod schemas and typed DTOs used by client and server
shared/types/         Cross-cutting types such as demo roles
server/api/           H3/Nitro route handlers
server/services/      Business workflows and domain actions
server/repositories/  Repository interfaces and SQLite implementations
server/db/            Drizzle schema, local connection, migration and seed helpers
scripts/              Local demo lifecycle commands
docs/                 API and architecture documentation
public/uploads/       Mock receipt files and upload target
```

## GitHub Setup

This repository is ready to push to GitHub. Before opening a pull request, run:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

The GitHub Actions workflow in `.github/workflows/ci.yml` runs the same checks on push and pull request.

## Documentation

- See `docs/README.md` for the fuller local demo flow and architecture notes.
- See `docs/api-contracts.md` for API envelopes, DTO contracts, and endpoint summaries.
