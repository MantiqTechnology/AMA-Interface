# MRO–Inventory Internal AOG Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one deterministic, demo-only Internal AOG journey in which Inventory clears a material blocker and MRO completes work, independent inspection, and simulated technical release.

**Architecture:** Keep the existing MaintenanceService and ResourceV21Service as the authoritative command path. Add one isolated seeded scenario plus a read-only scenario projection that interprets persisted MRO/Inventory state for a shared Demo Coach. Existing command-center, work-package, and maintenance-demand pages receive small scenario-specific presentation components; they do not gain a second workflow engine.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, Vuetify, Nitro/H3, TypeScript, better-sqlite3/Drizzle, Vitest, Nuxt Test Utils, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-18-mro-inventory-internal-aog-demo-design.md`

## Global Constraints

- This is a demo milestone, not a production or regulatory-compliance implementation.
- Do not add Component Shop, customer MRO, procurement, finance, external integrations, production authentication, or legal electronic signatures.
- Reuse canonical reservation, issue, readiness, sign-work, inspection, request-release, and release commands.
- The browser must never manufacture readiness or timeline state; all visible progress comes from persisted server data.
- Use the stable scenario key `INTERNAL_AOG_MATERIAL` and integrity-safe record prefix `mroaog-`.
- Keep all existing MRO and Inventory scenarios usable.
- Every task follows red-green-refactor and ends with its focused tests passing before commit.
- Do not stage unrelated `.vercel/` or `artifacts/` files.

---

## File Map

### New files

- `server/db/seeds/mro-internal-aog-demo.ts` — dedicated deterministic scenario seed.
- `server/features/maintenance/internal-aog-demo.service.ts` — read-only scenario state machine/projection.
- `server/api/maintenance/demo/internal-aog.get.ts` — scenario snapshot endpoint.
- `server/api/maintenance/demo/internal-aog/reset.post.ts` — demo-only reset endpoint.
- `server/db/demo-reset-coordinator.ts` — in-process reset serialization.
- `app/composables/useInternalAogDemo.ts` — shared snapshot, role switching, navigation, and reset behavior.
- `app/components/maintenance/InternalAogDemoCoach.vue` — persistent demo guidance.
- `app/components/maintenance/InternalAogReadinessCard.vue` — compact readiness/blocker presentation.
- `app/components/maintenance/InternalAogTimeline.vue` — unified persisted event timeline.
- `tests/services/internal-aog-demo.service.test.ts` — projection transitions.
- `tests/e2e/internal-aog-demo.spec.ts` — complete browser journey and tablet usability.

### Modified files

- `server/db/seeds/scenario-database.ts` — run the new seed inside the existing seed transaction.
- `server/services/index.ts` — expose the scenario projection service.
- `shared/features/maintenance.ts` — scenario snapshot, readiness, step, and timeline DTOs.
- `shared/types/roles.ts` — demo scenario read/reset permissions only.
- `tests/db/mro-ui-seed.test.ts` — deterministic initial-state contract.
- `tests/db/reset-demo.test.ts` — repeated interactive reset contract.
- `tests/api/maintenance.test.ts` — snapshot and permission/reset API coverage.
- `app/pages/maintenance/index.vue` — AOG scenario spotlight above existing queues.
- `app/pages/maintenance/work-packages/[id]/index.vue` — scenario overview, coach, and focused primary actions.
- `app/pages/inventory/maintenance-demand.vue` — scenario row focus and issue impact preview.
- `tests/e2e/mro.spec.ts` and `tests/e2e/inventory.spec.ts` only if existing selectors must be made more stable; otherwise leave them unchanged.

---

## Task 1: Seed the isolated material-blocked AOG baseline

**Files:**

- Create: `server/db/seeds/mro-internal-aog-demo.ts`
- Modify: `server/db/seeds/scenario-database.ts`
- Modify: `tests/db/mro-ui-seed.test.ts`

- [ ] **Step 1: Write the failing seed contract**

Add a test that queries the stable records after `resetDemoDatabase()`:

```ts
expect(
  sqlite
    .prepare(
      `
    SELECT wp.package_number AS packageNumber,
           wp.status,
           a.registration_number AS registrationNumber,
           mr.status AS materialStatus,
           mr.required_quantity AS requiredQuantity,
           mr.issued_quantity AS issuedQuantity
    FROM maintenance_work_packages wp
    JOIN aircraft a ON a.id = wp.aircraft_id
    JOIN maintenance_material_requirements mr ON mr.work_package_id = wp.id
    WHERE wp.id = 'mroaog-work-package'
  `
    )
    .get()
).toEqual({
  packageNumber: 'MWP-AOG-INT-001',
  status: 'IN_PROGRESS',
  registrationNumber: 'PK-AMD',
  materialStatus: 'REQUESTED',
  requiredQuantity: 1,
  issuedQuantity: 0
});

expect(
  sqlite
    .prepare(
      `
    SELECT status, requires_independent_inspection AS requiresIndependentInspection
    FROM maintenance_job_cards
    WHERE id = 'mroaog-job-card'
  `
    )
    .get()
).toEqual({ status: 'READY', requiresIndependentInspection: 1 });
```

Also assert one eligible stock candidate has at least one available unit and `PRAGMA foreign_key_check` is empty.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
pnpm exec vitest run tests/db/mro-ui-seed.test.ts
```

Expected: failure because `mroaog-work-package` does not exist.

- [ ] **Step 3: Implement a dedicated idempotent seed**

Create `seedInternalAogDemo(sqlite, context)` using the existing `insertIgnore` style. Seed exactly:

- aircraft `ac-pk-mrb` as the grounded aircraft;
- defect `mroaog-defect` linked to the aircraft;
- work package `mroaog-work-package` / `MWP-AOG-INT-001`;
- job card `mroaog-job-card` / `MWP-AOG-INT-001-JC-001`, initially `READY`, requiring independent inspection;
- material requirement `mroaog-material-requirement`, initially `REQUESTED` for quantity `1`;
- a dedicated serviceable inventory item/lot in an existing DJJ warehouse and bin with quantity greater than or equal to `1`;
- active approved-data, tool, personnel, AMO-scope, and authorization records or declarations by referencing existing valid seeded masters;
- audit records for defect detection, package creation, and readiness evaluation.

Use context-relative dates only:

```ts
export function seedInternalAogDemo(sqlite: Database.Database, context: DemoSeedContext) {
  const now = context.now;
  const seed = sqlite.transaction(() => {
    insertIgnore(sqlite, 'aircraft_defects', {
      id: 'mroaog-defect',
      aircraftId: 'ac-pk-amd',
      defectNumber: 'DEF-AOG-INT-001',
      title: 'AOG brake assembly replacement',
      description:
        'Aircraft grounded pending issue and installation of the required brake assembly.',
      detectedAt: now,
      detectedByUserId: 'USR-MAINTENANCE-TECHNICIAN',
      sourceReference: 'INTERNAL-AOG-SCENARIO',
      status: 'OPEN',
      createdAt: now,
      updatedAt: now
    });
    // Insert the remaining records with stable mroaog-* identifiers.
  });
  seed.immediate();
}
```

Before finalizing the seed, inspect the existing table definitions and copy every required column from the closest valid `mwp-mrov1-release-ready` records. Do not bypass foreign keys or add nullable shortcuts to the schema.

Invoke it after `seedMroV21Foundation()` and before `assertScenarioSeedIntegrity()`:

```ts
seedMroV21Foundation(client.sqlite, context);
seedInternalAogDemo(client.sqlite, context);
assertScenarioSeedIntegrity(client.sqlite, context);
```

- [ ] **Step 4: Verify deterministic reset twice**

Extend the test to call reset twice and assert the same IDs, counts, statuses, and stock quantities after each reset.

Run:

```bash
pnpm exec vitest run tests/db/mro-ui-seed.test.ts tests/db/reset-demo.test.ts
```

Expected: both files pass.

- [ ] **Step 5: Commit the seed slice**

```bash
git add server/db/seeds/mro-internal-aog-demo.ts server/db/seeds/scenario-database.ts tests/db/mro-ui-seed.test.ts tests/db/reset-demo.test.ts
git commit -m "feat: seed internal AOG material demo"
```

---

## Task 2: Build the authoritative scenario projection

**Files:**

- Create: `server/features/maintenance/internal-aog-demo.service.ts`
- Modify: `server/services/index.ts`
- Modify: `shared/features/maintenance.ts`
- Create: `tests/services/internal-aog-demo.service.test.ts`

- [ ] **Step 1: Define the shared projection contract**

Add concrete DTOs:

```ts
export type InternalAogDemoPhase =
  | 'MATERIAL_REQUIRED'
  | 'MATERIAL_RESERVED'
  | 'READY_FOR_EXECUTION'
  | 'WORK_IN_PROGRESS'
  | 'INSPECTION_REQUIRED'
  | 'RELEASE_REVIEW_REQUIRED'
  | 'READY_FOR_RELEASE'
  | 'RELEASED';

export type InternalAogDemoTimelineEventDto = {
  id: string;
  occurredAt: string;
  domain: 'MRO' | 'INVENTORY';
  title: string;
  detail: string;
  actorRole: string | null;
};

export type InternalAogDemoDto = {
  scenarioId: 'INTERNAL_AOG_MATERIAL';
  title: string;
  phase: InternalAogDemoPhase;
  currentStep: number;
  totalSteps: 8;
  nextRole: DemoRole | null;
  nextAction: { label: string; href: string } | null;
  aircraft: { id: string; registrationNumber: string; aog: boolean };
  workPackage: { id: string; packageNumber: string; status: string; version: number };
  jobCard: { id: string; cardNumber: string; status: string; version: number };
  materialRequirement: {
    id: string;
    status: string;
    requiredQuantity: number;
    reservedQuantity: number;
    issuedQuantity: number;
  };
  readiness: MaintenanceReadinessPanelDto;
  blocker: { reason: string; owner: DemoRole; impact: string } | null;
  timeline: InternalAogDemoTimelineEventDto[];
};
```

- [ ] **Step 2: Write failing phase-transition tests**

Test `snapshot()` at the seeded baseline, after canonical reserve/issue calls, after start/sign/inspection, after release request, and after release. Assert phase, next role, action URL, readiness material gate, and chronologically sorted timeline.

Core baseline assertion:

```ts
expect(service.snapshot()).toMatchObject({
  scenarioId: 'INTERNAL_AOG_MATERIAL',
  phase: 'MATERIAL_REQUIRED',
  currentStep: 1,
  totalSteps: 8,
  nextRole: 'Inventory Controller',
  blocker: {
    owner: 'Inventory Controller',
    impact: expect.stringContaining('release')
  },
  materialRequirement: { status: 'REQUESTED', issuedQuantity: 0 }
});
```

- [ ] **Step 3: Run the test and confirm the service is missing**

Run:

```bash
pnpm exec vitest run tests/services/internal-aog-demo.service.test.ts
```

Expected: module/import failure.

- [ ] **Step 4: Implement the read-only state machine**

Implement a class that queries fixed scenario IDs, calls existing maintenance readiness behavior, and maps persisted states in strict priority order:

```ts
if (workPackage.status === 'RELEASED') return 'RELEASED';
if (workPackage.status === 'READY_FOR_RELEASE') return 'READY_FOR_RELEASE';
if (jobCard.status === 'READY_FOR_RELEASE_REVIEW') return 'RELEASE_REVIEW_REQUIRED';
if (jobCard.status === 'INSPECTION_REQUIRED') return 'INSPECTION_REQUIRED';
if (jobCard.status === 'IN_PROGRESS') return 'WORK_IN_PROGRESS';
if (materialRequirement.status === 'ISSUED') return 'READY_FOR_EXECUTION';
if (activeReservation) return 'MATERIAL_RESERVED';
return 'MATERIAL_REQUIRED';
```

Build timeline entries only from existing audit records, inventory reservations/issues/movements, sign-offs, inspection attempts, and release records. Sort by `occurredAt`, then stable `id`; do not create client-only pseudo-events.

Expose it from `createServices()`:

```ts
internalAogDemo: new InternalAogDemoService(sqlite, maintenance);
```

- [ ] **Step 5: Run projection and existing lifecycle tests**

Run:

```bash
pnpm exec vitest run tests/services/internal-aog-demo.service.test.ts tests/services/resource-v21-material-lifecycle.test.ts tests/services/maintenance.service.test.ts
```

Expected: all pass.

- [ ] **Step 6: Commit the projection**

```bash
git add shared/features/maintenance.ts server/features/maintenance/internal-aog-demo.service.ts server/services/index.ts tests/services/internal-aog-demo.service.test.ts
git commit -m "feat: project internal AOG demo progress"
```

---

## Task 3: Add demo-only snapshot and reset APIs

**Files:**

- Create: `server/api/maintenance/demo/internal-aog.get.ts`
- Create: `server/api/maintenance/demo/internal-aog/reset.post.ts`
- Create: `server/db/demo-reset-coordinator.ts`
- Modify: `shared/types/roles.ts`
- Modify: `tests/api/maintenance.test.ts`
- Modify: `tests/db/reset-demo.test.ts`

- [ ] **Step 1: Write failing endpoint permission tests**

Cover:

- all four scenario roles can read the snapshot;
- Inventory Controller cannot reset;
- Maintenance Manager and Demo Admin can reset;
- reset is rejected when `DEMO_MODE` is false;
- two concurrent reset requests serialize and return the baseline;
- reset after a partial reserve/issue returns to `MATERIAL_REQUIRED`.

```ts
const response = await $fetch<ApiResponse<InternalAogDemoDto>>(
  '/api/maintenance/demo/internal-aog',
  { headers: { cookie: 'ama_demo_role=Inventory%20Controller' } }
);
expect(response.ok && response.data.phase).toBe('MATERIAL_REQUIRED');
```

- [ ] **Step 2: Run and confirm 404/permission failures**

Run:

```bash
pnpm exec vitest run tests/api/maintenance.test.ts tests/db/reset-demo.test.ts
```

Expected: new endpoint assertions fail.

- [ ] **Step 3: Add narrowly scoped demo permissions**

Grant `maintenance.demo.internal_aog.read` to Maintenance Manager, Maintenance Technician, Certifying Staff, and Inventory Controller. Grant `maintenance.demo.internal_aog.reset` only to Maintenance Manager; Demo Admin already has `*`.

- [ ] **Step 4: Serialize resets and implement handlers**

Coordinator:

```ts
let activeReset: Promise<void> | null = null;

export function resetDemoDatabaseExclusive(dbPath: string, anchorDate?: string) {
  if (activeReset) return activeReset;
  activeReset = resetDemoDatabase(dbPath, { anchorDate }).finally(() => {
    activeReset = null;
  });
  return activeReset;
}
```

GET handler:

```ts
export default defineEventHandler((event) => {
  requireExplicitDemoRuntime('Internal AOG demo');
  requireDemoPermission(event, 'maintenance.demo.internal_aog.read');
  return getServices().internalAogDemo.snapshot();
});
```

POST reset handler must resolve `runtimeConfig.dbPath`, call `resetDemoDatabaseExclusive`, then construct a fresh service snapshot. It returns `{ resetAt, scenario }`. Do not use the one-time startup reset guard.

- [ ] **Step 5: Run API/reset tests**

Run:

```bash
pnpm exec vitest run tests/api/maintenance.test.ts tests/db/reset-demo.test.ts
```

Expected: pass, including partial-run and concurrent reset cases.

- [ ] **Step 6: Commit API boundary**

```bash
git add server/api/maintenance/demo server/db/demo-reset-coordinator.ts shared/types/roles.ts tests/api/maintenance.test.ts tests/db/reset-demo.test.ts
git commit -m "feat: expose resettable internal AOG demo"
```

---

## Task 4: Create the shared Demo Coach and scenario visual language

**Files:**

- Create: `app/composables/useInternalAogDemo.ts`
- Create: `app/components/maintenance/InternalAogDemoCoach.vue`
- Create: `app/components/maintenance/InternalAogReadinessCard.vue`
- Create: `app/components/maintenance/InternalAogTimeline.vue`
- Create: `tests/e2e/internal-aog-demo.spec.ts`

- [ ] **Step 1: Add failing component-level browser assertions**

Start the E2E file with a narrow smoke case on `/maintenance`:

```ts
await page.goto('/maintenance');
await expect(page.getByTestId('internal-aog-demo-coach')).toBeVisible();
await expect(page.getByText('Internal AOG · Material Blocker')).toBeVisible();
await expect(page.getByText('Langkah 1 dari 8')).toBeVisible();
await expect(
  page.getByRole('button', { name: 'Lanjut sebagai Inventory Controller' })
).toBeVisible();
```

- [ ] **Step 2: Run the smoke case and confirm it fails**

Run:

```bash
pnpm exec playwright test tests/e2e/internal-aog-demo.spec.ts --grep "shows demo coach"
```

Expected: missing coach locator.

- [ ] **Step 3: Implement the composable**

Use one stable `useAsyncData` key and expose no business-state mutation:

```ts
export function useInternalAogDemo() {
  const session = useDemoSession();
  const state = useAsyncData('internal-aog-demo', () =>
    fetchApi<InternalAogDemoDto>('/api/maintenance/demo/internal-aog')
  );

  async function continueScenario() {
    const scenario = state.data.value;
    if (!scenario?.nextAction || !scenario.nextRole) return;
    if (session.role.value !== scenario.nextRole) await session.switchRole(scenario.nextRole);
    await navigateTo(scenario.nextAction.href);
  }

  async function resetScenario() {
    await fetchApi('/api/maintenance/demo/internal-aog/reset', { method: 'POST' });
    await refreshNuxtData();
    await navigateTo('/maintenance');
  }

  return { ...state, continueScenario, resetScenario };
}
```

Adapt the exact `useDemoSession()` switching signature to the existing composable rather than duplicating cookie logic.

- [ ] **Step 4: Implement accessible presentation components**

Coach requirements:

- persistent but compact demo-labelled surface;
- scenario title, step counter, current role, next role/action;
- one primary action and a subordinate reset button;
- reset confirmation dialog;
- `data-testid="internal-aog-demo-coach"`.

Readiness card requirements:

- material, tools, personnel, approved data, inspection, and release gates;
- text/icon plus color;
- reason, owner, and contextual link for unresolved gates;
- no locally calculated gate state.

Timeline requirements:

- semantic ordered list;
- domain badge (`MRO` or `Inventory`), timestamp, actor, and detail;
- empty state only when the server returns no persisted events.

- [ ] **Step 5: Verify desktop and tablet component behavior**

Run:

```bash
pnpm exec playwright test tests/e2e/internal-aog-demo.spec.ts --grep "shows demo coach"
```

Expected: pass at desktop. Add a tablet viewport assertion that the coach and primary action do not introduce horizontal scrolling.

- [ ] **Step 6: Commit shared UI**

```bash
git add app/composables/useInternalAogDemo.ts app/components/maintenance/InternalAogDemoCoach.vue app/components/maintenance/InternalAogReadinessCard.vue app/components/maintenance/InternalAogTimeline.vue tests/e2e/internal-aog-demo.spec.ts
git commit -m "feat: add guided internal AOG demo UI"
```

---

## Task 5: Integrate the scenario into MRO Control Center and Work Package

**Files:**

- Modify: `app/pages/maintenance/index.vue`
- Modify: `app/pages/maintenance/work-packages/[id]/index.vue`
- Modify: `tests/e2e/internal-aog-demo.spec.ts`

- [ ] **Step 1: Write failing first-viewport assertions**

Assert that `/maintenance` shows registration, AOG status, blocker, owner, impact, and next action without scrolling. Assert that the scenario Work Package shows the coach, sticky context, readiness matrix, focused action, and timeline. Assert a non-scenario Work Package does not show the scenario coach.

- [ ] **Step 2: Run the focused tests and confirm failure**

```bash
pnpm exec playwright test tests/e2e/internal-aog-demo.spec.ts --grep "control center|work package overview"
```

- [ ] **Step 3: Add a scenario spotlight above existing command-center queues**

Compose from the shared projection; do not alter `MaintenanceCommandCenterDto`:

```vue
<InternalAogDemoCoach />
<VCard data-testid="internal-aog-spotlight">
  <!-- PK-MRB, AOG, material blocker, owner, impact, direct WP link -->
</VCard>
```

Keep current summary metrics, attention queue, and work-package creation below the spotlight.

- [ ] **Step 4: Add scenario-only overview to Work Package detail**

Render only when `route.params.id === scenario.workPackage.id`. Place it before the existing detail tabs and wire primary actions to existing page methods:

- `READY_FOR_EXECUTION`: call existing `start(jobCard)`;
- `WORK_IN_PROGRESS`: call existing `signWork(jobCard)` after the current evidence/sign-off form is valid;
- `INSPECTION_REQUIRED`: call existing `openInspectionDialog(jobCard)`;
- `RELEASE_REVIEW_REQUIRED`: call existing `requestRelease()`;
- `READY_FOR_RELEASE`: call existing `openReleaseDialog()`.

Do not duplicate API calls inside the component. After existing `runAction()` refreshes the Work Package, also refresh `internal-aog-demo` so coach, readiness, and timeline advance together.

Use progressive disclosure for the existing large form sections; do not remove existing capabilities.

- [ ] **Step 5: Verify role-specific primary actions**

Run:

```bash
pnpm exec playwright test tests/e2e/internal-aog-demo.spec.ts --grep "control center|work package overview|technician|inspection|release review"
```

Expected: pass; each role sees one emphasized scenario action and unauthorized actions remain hidden/rejected by existing permissions.

- [ ] **Step 6: Commit MRO integration**

```bash
git add app/pages/maintenance/index.vue 'app/pages/maintenance/work-packages/[id]/index.vue' tests/e2e/internal-aog-demo.spec.ts
git commit -m "feat: spotlight internal AOG flow in MRO"
```

---

## Task 6: Focus Inventory on the linked demand and impact preview

**Files:**

- Modify: `app/pages/inventory/maintenance-demand.vue`
- Modify: `tests/e2e/internal-aog-demo.spec.ts`
- Modify: `tests/e2e/inventory.spec.ts` only if selector stabilization is required.

- [ ] **Step 1: Write failing Inventory workspace assertions**

Navigate via the coach as Inventory Controller and assert:

- the `mroaog-material-requirement` row is focused;
- the part, quantity, source warehouse/bin, aircraft, and Work Package are visible;
- reservation preview shows post-reservation ATP;
- issue confirmation shows source, destination, quantity, and resulting stock;
- after reserve the primary action becomes issue;
- after issue the scenario phase becomes `READY_FOR_EXECUTION` and next owner becomes Maintenance Technician.

- [ ] **Step 2: Run the focused test and confirm failure**

```bash
pnpm exec playwright test tests/e2e/internal-aog-demo.spec.ts --grep "inventory clears material blocker"
```

- [ ] **Step 3: Implement query-driven focus without changing domain commands**

Support the scenario URL:

```ts
const focusedRequirementId = computed(() => String(route.query.requirement ?? ''));
const focusedDemand = computed(() =>
  (data.value ?? []).find((row) => row.requirement.id === focusedRequirementId.value)
);
```

Highlight and scroll the focused row/card, put it ahead of routine demand presentation, and retain existing search/status behavior.

- [ ] **Step 4: Add impact preview to existing dialogs**

Before reserve and issue display values already supplied by `InventoryMaintenanceDemandDto`:

```text
Part / lot: <part number> / <lot>
From: <station> / <warehouse> / <bin>
To: MWP-AOG-INT-001 / PK-AMD
Quantity: 1 EA
Available after action: <server/candidate quantity minus submitted quantity>
Impact: clears the material readiness gate after successful issue
```

The preview may calculate the displayed arithmetic, but readiness advances only after the server command succeeds and both demand and scenario snapshot refresh.

- [ ] **Step 5: Verify canonical failures remain intact**

Run:

```bash
pnpm exec vitest run tests/services/resource-v21-material-lifecycle.test.ts tests/api/inventory.test.ts
pnpm exec playwright test tests/e2e/inventory.spec.ts tests/e2e/internal-aog-demo.spec.ts --grep "inventory|material blocker"
```

Expected: insufficient ATP, duplicate idempotency, existing Inventory UI, and scenario happy path all pass.

- [ ] **Step 6: Commit Inventory integration**

```bash
git add app/pages/inventory/maintenance-demand.vue tests/e2e/internal-aog-demo.spec.ts tests/e2e/inventory.spec.ts
git commit -m "feat: guide inventory through AOG material issue"
```

---

## Task 7: Complete the role-switching golden path and reset loop

**Files:**

- Modify: `tests/e2e/internal-aog-demo.spec.ts`
- Modify implementation files only for defects exposed by the test.

- [ ] **Step 1: Write the complete failing journey**

The single test must perform, through visible UI:

1. reset as Maintenance Manager;
2. open Control Center and AOG Work Package;
3. continue as Inventory Controller;
4. reserve and issue material;
5. continue as Maintenance Technician;
6. start job card, enter evidence/statement, and sign work;
7. continue as Certifying Staff and pass independent inspection;
8. switch to Maintenance Manager and request release review;
9. switch back to Certifying Staff and issue simulated technical release;
10. verify the ordered unified timeline and `RELEASED` state;
11. reset and verify the original `MATERIAL_REQUIRED` state and original stock.

Use role cookies/UI switching already supported by `useDemoSession`; do not call lifecycle APIs directly from the E2E test.

- [ ] **Step 2: Run and preserve the first meaningful failure**

```bash
pnpm exec playwright test tests/e2e/internal-aog-demo.spec.ts --grep "completes and resets the Internal AOG journey"
```

Expected: failure at the first incomplete UI handoff.

- [ ] **Step 3: Fix one handoff at a time**

After each change rerun the same test. Ensure every mutation waits for success feedback and refreshes authoritative state before continuing. Add stable accessible names or `data-testid` only where role/text selectors are genuinely ambiguous.

- [ ] **Step 4: Add tablet execution validation**

Add a separate test using the project tablet viewport for the technician and inventory stages:

```ts
await page.setViewportSize({ width: 1024, height: 768 });
expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
```

Verify the current task, evidence input, and primary action are reachable without horizontal scrolling.

- [ ] **Step 5: Run the complete scenario file**

```bash
pnpm exec playwright test tests/e2e/internal-aog-demo.spec.ts
```

Expected: all scenario tests pass.

- [ ] **Step 6: Commit acceptance flow**

```bash
git add app server shared tests/e2e/internal-aog-demo.spec.ts
git commit -m "test: cover complete internal AOG demo journey"
```

Before committing, inspect `git diff --cached --stat` and remove any unrelated staged path.

---

## Task 8: Regression verification, build, and demo-branch delivery

**Files:**

- Modify only files required to fix verified regressions.

- [ ] **Step 1: Run focused database, service, and API suites**

```bash
pnpm exec vitest run tests/db/mro-ui-seed.test.ts tests/db/reset-demo.test.ts tests/services/internal-aog-demo.service.test.ts tests/services/resource-v21-material-lifecycle.test.ts tests/services/maintenance.service.test.ts tests/api/maintenance.test.ts tests/api/inventory.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run existing and new MRO/Inventory browser suites**

```bash
pnpm exec playwright test tests/e2e/mro.spec.ts tests/e2e/inventory.spec.ts tests/e2e/internal-aog-demo.spec.ts
```

Expected: all pass.

- [ ] **Step 3: Run static verification**

```bash
pnpm typecheck
```

Expected: exit code `0`.

- [ ] **Step 4: Run the production build with Vercel-like memory constraints**

```bash
NODE_OPTIONS=--max-old-space-size=6144 pnpm build
```

Expected: Nuxt client and Nitro server builds complete with exit code `0`. Chunk-size warnings are non-blocking; a timeout or OOM is not acceptable.

- [ ] **Step 5: Review the implementation against the approved spec**

Check every in-scope item and confirm none of the explicit out-of-scope features were introduced. Search for placeholders:

```bash
rg -n "TODO|FIXME|placeholder|mock later|coming soon" app server shared tests docs/superpowers/plans/2026-08-18-mro-inventory-internal-aog-demo.md
```

Expected: no newly introduced implementation placeholders.

- [ ] **Step 6: Request code review and address only evidence-backed findings**

Use `superpowers:requesting-code-review`, rerun any affected focused tests, then use `superpowers:verification-before-completion` before claiming success.

- [ ] **Step 7: Confirm commit and branch scope**

```bash
git status --short
git log --oneline --decorate -10
git diff origin/demo...HEAD --stat
```

Expected: only Internal AOG demo and previously approved documentation commits differ; `.vercel/` and `artifacts/` remain untracked/uncommitted.

- [ ] **Step 8: Push verified commits to `demo`**

```bash
git push origin demo
```

Expected: remote `demo` advances to the verified commit so Vercel builds the exact tested tree.

---

## Definition of Done

- The seeded scenario begins with one material-only AOG blocker and every other happy-path gate ready.
- Inventory reserve/issue changes MRO readiness through persisted canonical commands.
- Maintenance Technician, Certifying Staff, and Maintenance Manager complete the existing controlled lifecycle in the correct role sequence.
- The Demo Coach, readiness card, and unified timeline agree with server state at every step.
- Reset is demo-only, permission-checked, serialized, repeatable, and restores the exact baseline.
- Desktop and tablet acceptance checks pass.
- Focused regression suites, typecheck, and production build pass.
- No Component Shop or production scope is introduced.
- Only verified commits are pushed to `origin/demo`.
